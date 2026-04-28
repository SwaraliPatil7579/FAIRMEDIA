"""
FAIRMEDIA — Bias Detection Microservice
Standalone FastAPI service for detecting gender bias and language bias
in text (supports English and Hindi). Runs on port 8001.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re

# ═══════════════════════════════════════════════════════════════════════════
# App Setup
# ═══════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="FAIRMEDIA Bias Detection API",
    version="1.0.0",
    description="Detects gender bias and language bias (English & Hindi) in text.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
# Request / Response Models
# ═══════════════════════════════════════════════════════════════════════════
class DetectRequest(BaseModel):
    text: str
    language: Optional[str] = "auto"  # "auto", "en", "hi", "mixed"


# ═══════════════════════════════════════════════════════════════════════════
# Gender Bias Dictionaries
# ═══════════════════════════════════════════════════════════════════════════
MALE_PRONOUNS = {"he", "him", "his", "himself"}
FEMALE_PRONOUNS = {"she", "her", "hers", "herself"}

# Stereotypical gender-biased words/phrases (English)
GENDER_STEREOTYPE_WORDS = {
    "male_stereotypes": {
        "aggressive": "assertive",
        "bossy": "decisive",
        "ambitious": "driven",
        "dominant": "leading",
        "authoritative": "knowledgeable",
        "stubborn": "persistent",
        "man up": "be brave",
        "boys don't cry": "it's okay to show emotion",
        "be a man": "be strong",
        "mankind": "humankind",
        "manpower": "workforce",
        "chairman": "chairperson",
        "fireman": "firefighter",
        "policeman": "police officer",
        "businessman": "businessperson",
        "spokesman": "spokesperson",
        "mailman": "mail carrier",
        "cameraman": "camera operator",
        "salesman": "salesperson",
        "foreman": "supervisor",
    },
    "female_stereotypes": {
        "emotional": "expressive",
        "hysterical": "upset",
        "bossy": "assertive",
        "nurturing": "caring",
        "ditzy": "thoughtful",
        "nagging": "persistent",
        "catfight": "disagreement",
        "like a girl": "with effort",
        "weaker sex": "people",
        "lady doctor": "doctor",
        "lady engineer": "engineer",
        "lady scientist": "scientist",
        "lady lawyer": "lawyer",
        "male nurse": "nurse",
        "working mother": "working parent",
        "career woman": "professional",
        "housewife": "homemaker",
        "old maid": "unmarried person",
        "tomboy": "active child",
    },
}

# Gender-biased role assumptions (phrases)
GENDERED_ROLE_PHRASES_EN = [
    (r"\bwomen\s+belong\s+in\s+the\s+kitchen\b", "women belong in the kitchen"),
    (r"\bmen\s+don'?t\s+cook\b", "men don't cook"),
    (r"\bmen\s+are\s+better\s+at\b", "men are better at"),
    (r"\bwomen\s+are\s+too\s+emotional\b", "women are too emotional"),
    (r"\bwomen\s+can'?t\s+drive\b", "women can't drive"),
    (r"\bman'?s\s+job\b", "man's job"),
    (r"\bwoman'?s\s+place\b", "woman's place"),
    (r"\bgirls\s+should\b", "girls should"),
    (r"\bboys\s+will\s+be\s+boys\b", "boys will be boys"),
    (r"\bmen\s+are\s+naturally\b", "men are naturally"),
    (r"\bwomen\s+are\s+naturally\b", "women are naturally"),
    (r"\bthat'?s\s+not\s+lady-?like\b", "that's not ladylike"),
    (r"\breal\s+men\b", "real men"),
]


# ═══════════════════════════════════════════════════════════════════════════
# Language Bias Dictionaries (Hindi & English)
# ═══════════════════════════════════════════════════════════════════════════

# Hindi biased terms/phrases with translations and neutral alternatives
HINDI_BIAS_TERMS = {
    "औरतों का काम": {
        "translation": "women's work",
        "neutral": "घर का काम (household work)",
        "category": "gender_role",
    },
    "मर्दानगी": {
        "translation": "manliness/machismo",
        "neutral": "साहस (courage)",
        "category": "toxic_masculinity",
    },
    "मर्दों जैसा": {
        "translation": "like a man",
        "neutral": "मजबूत (strong)",
        "category": "gender_stereotype",
    },
    "औरतों जैसा": {
        "translation": "like a woman",
        "neutral": "कोमल (gentle)",
        "category": "gender_stereotype",
    },
    "पराया धन": {
        "translation": "someone else's wealth (referring to daughters)",
        "neutral": "बेटी (daughter)",
        "category": "gender_role",
    },
    "लड़कियों को शर्म करनी चाहिए": {
        "translation": "girls should be ashamed",
        "neutral": "सभी को सम्मान से पेश आना चाहिए",
        "category": "gender_shame",
    },
    "घर संभालो": {
        "translation": "take care of the house (directed at women)",
        "neutral": "सहयोग करो (cooperate)",
        "category": "gender_role",
    },
    "पति परमेश्वर": {
        "translation": "husband is god",
        "neutral": "जीवन साथी (life partner)",
        "category": "gender_hierarchy",
    },
    "कमजोर लिंग": {
        "translation": "weaker sex",
        "neutral": "व्यक्ति (person)",
        "category": "gender_stereotype",
    },
    "लड़के रोते नहीं": {
        "translation": "boys don't cry",
        "neutral": "भावनाएं स्वाभाविक हैं (emotions are natural)",
        "category": "toxic_masculinity",
    },
    "लड़कियां ऐसे नहीं करतीं": {
        "translation": "girls don't do this",
        "neutral": "हर किसी को आज़ादी है (everyone has freedom)",
        "category": "gender_restriction",
    },
    "चूल्हा चौका": {
        "translation": "kitchen work (derogatory for women's role)",
        "neutral": "खाना बनाना (cooking)",
        "category": "gender_role",
    },
    "अबला नारी": {
        "translation": "helpless woman",
        "neutral": "महिला (woman)",
        "category": "gender_stereotype",
    },
    "मर्द को दर्द नहीं होता": {
        "translation": "men don't feel pain",
        "neutral": "सभी को दर्द होता है (everyone feels pain)",
        "category": "toxic_masculinity",
    },
}

# English language-specific biased phrases (beyond gendered words)
ENGLISH_BIAS_PHRASES = {
    "man up": {
        "neutral": "be courageous",
        "category": "toxic_masculinity",
    },
    "boys don't cry": {
        "neutral": "it's okay to express emotions",
        "category": "toxic_masculinity",
    },
    "like a girl": {
        "neutral": "with effort",
        "category": "gender_stereotype",
    },
    "weaker sex": {
        "neutral": "people",
        "category": "gender_stereotype",
    },
    "man of the house": {
        "neutral": "head of household",
        "category": "gender_role",
    },
    "boys will be boys": {
        "neutral": "children will be children",
        "category": "excuse_bias",
    },
    "throw like a girl": {
        "neutral": "throw poorly",
        "category": "gender_stereotype",
    },
    "don't be such a girl": {
        "neutral": "don't be so sensitive",
        "category": "gender_stereotype",
    },
    "grow a pair": {
        "neutral": "be brave",
        "category": "toxic_masculinity",
    },
    "women belong in the kitchen": {
        "neutral": "everyone can cook",
        "category": "gender_role",
    },
    "acting like a woman": {
        "neutral": "being emotional",
        "category": "gender_stereotype",
    },
    "that's not ladylike": {
        "neutral": "that's unconventional",
        "category": "gender_restriction",
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# Detection Functions
# ═══════════════════════════════════════════════════════════════════════════

def detect_language(text: str) -> dict:
    """Detect whether text contains English, Hindi, or mixed content."""
    # Check for Devanagari (Hindi) characters
    hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
    # Check for Latin (English) characters
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    total = hindi_chars + english_chars

    if total == 0:
        return {"detected": "unknown", "hindi_pct": 0, "english_pct": 0}

    hindi_pct = round(hindi_chars / total * 100, 1)
    english_pct = round(english_chars / total * 100, 1)

    if hindi_pct > 70:
        detected = "hi"
    elif english_pct > 70:
        detected = "en"
    else:
        detected = "mixed"

    return {"detected": detected, "hindi_pct": hindi_pct, "english_pct": english_pct}


def detect_gender_bias(text: str) -> dict:
    """
    Detect gender bias: pronoun imbalance, stereotypical words,
    gendered role assumptions. Returns detailed breakdown.
    """
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    # 1. Pronoun counting
    male_count = sum(1 for w in words if w in MALE_PRONOUNS)
    female_count = sum(1 for w in words if w in FEMALE_PRONOUNS)
    total_pronouns = male_count + female_count
    imbalance_score = (
        abs(male_count - female_count) / total_pronouns
        if total_pronouns > 0 else 0.0
    )

    # 2. Stereotype word detection
    found_stereotypes = []

    for word, alternative in GENDER_STEREOTYPE_WORDS["male_stereotypes"].items():
        pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
        for match in pattern.finditer(text):
            found_stereotypes.append({
                "phrase": match.group(),
                "type": "male_stereotype",
                "suggestion": alternative,
                "start": match.start(),
                "end": match.end(),
            })

    for word, alternative in GENDER_STEREOTYPE_WORDS["female_stereotypes"].items():
        pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
        for match in pattern.finditer(text):
            found_stereotypes.append({
                "phrase": match.group(),
                "type": "female_stereotype",
                "suggestion": alternative,
                "start": match.start(),
                "end": match.end(),
            })

    # 3. Gendered role phrase detection
    found_role_phrases = []
    for pattern_str, label in GENDERED_ROLE_PHRASES_EN:
        for match in re.finditer(pattern_str, text, re.IGNORECASE):
            found_role_phrases.append({
                "phrase": match.group(),
                "type": "gendered_role_assumption",
                "start": match.start(),
                "end": match.end(),
            })

    # 4. Overall gender bias score (0=no bias, 10=extreme bias)
    bias_points = 0
    bias_points += imbalance_score * 4  # Max 4 from imbalance
    bias_points += min(len(found_stereotypes) * 1.0, 3)  # Max 3 from stereotypes
    bias_points += min(len(found_role_phrases) * 1.5, 3)  # Max 3 from role phrases
    gender_bias_score = round(min(bias_points, 10), 2)

    return {
        "male_pronoun_count": male_count,
        "female_pronoun_count": female_count,
        "imbalance_score": round(imbalance_score, 4),
        "stereotypes_found": found_stereotypes,
        "role_phrases_found": found_role_phrases,
        "gender_bias_score": gender_bias_score,
        "total_gender_issues": len(found_stereotypes) + len(found_role_phrases),
    }


def detect_language_bias(text: str, lang_info: dict) -> dict:
    """
    Detect language-specific biased terms in Hindi and English.
    Returns list of biased terms found with context.
    """
    found_terms = []

    # Check Hindi biased terms
    for term, info in HINDI_BIAS_TERMS.items():
        if term in text:
            start = text.index(term)
            found_terms.append({
                "phrase": term,
                "language": "hi",
                "translation": info["translation"],
                "neutral_alternative": info["neutral"],
                "category": info["category"],
                "start": start,
                "end": start + len(term),
            })

    # Check English biased phrases
    for phrase, info in ENGLISH_BIAS_PHRASES.items():
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        for match in pattern.finditer(text):
            found_terms.append({
                "phrase": match.group(),
                "language": "en",
                "translation": None,
                "neutral_alternative": info["neutral"],
                "category": info["category"],
                "start": match.start(),
                "end": match.end(),
            })

    # Language bias score
    bias_points = min(len(found_terms) * 2.0, 10)
    language_bias_score = round(bias_points, 2)

    return {
        "detected_language": lang_info["detected"],
        "hindi_percentage": lang_info["hindi_pct"],
        "english_percentage": lang_info["english_pct"],
        "biased_terms_found": found_terms,
        "language_bias_score": language_bias_score,
        "total_language_issues": len(found_terms),
    }


def build_highlighted_text(
    text: str, gender_result: dict, language_result: dict
) -> str:
    """
    Build an HTML version of the text with biased portions highlighted:
    - Male pronouns: blue
    - Female pronouns: pink
    - Gender stereotypes: red underline
    - Language bias: orange background
    """
    # Collect all spans to highlight (position, end, css_class, title)
    spans = []

    # Male & female pronouns
    for match in re.finditer(
        r'\b(' + '|'.join(MALE_PRONOUNS) + r')\b', text, re.IGNORECASE
    ):
        spans.append((match.start(), match.end(), "male-hl", "Male pronoun"))

    for match in re.finditer(
        r'\b(' + '|'.join(FEMALE_PRONOUNS) + r')\b', text, re.IGNORECASE
    ):
        spans.append((match.start(), match.end(), "female-hl", "Female pronoun"))

    # Stereotypes
    for s in gender_result.get("stereotypes_found", []):
        spans.append((
            s["start"], s["end"], "stereo-hl",
            f"Stereotype → use \"{s['suggestion']}\"",
        ))

    # Role phrases
    for r in gender_result.get("role_phrases_found", []):
        spans.append((r["start"], r["end"], "role-hl", "Gendered role assumption"))

    # Language bias terms
    for lt in language_result.get("biased_terms_found", []):
        title = f"Language bias ({lt['language']})"
        if lt.get("translation"):
            title += f" — \"{lt['translation']}\""
        title += f" → use \"{lt['neutral_alternative']}\""
        spans.append((lt["start"], lt["end"], "lang-bias-hl", title))

    if not spans:
        return text

    # Sort by start position (descending) to insert HTML from end to start
    spans.sort(key=lambda x: x[0], reverse=True)

    # Remove overlapping spans (keep the first in original order)
    filtered = []
    occupied = set()
    for start, end, cls, title in sorted(spans, key=lambda x: x[0]):
        positions = set(range(start, end))
        if not positions & occupied:
            filtered.append((start, end, cls, title))
            occupied |= positions

    # Build highlighted text (from end to start to preserve indices)
    highlighted = text
    for start, end, cls, title in sorted(filtered, key=lambda x: x[0], reverse=True):
        original = highlighted[start:end]
        highlighted = (
            highlighted[:start]
            + f"<span class='{cls}' title='{title}'>{original}</span>"
            + highlighted[end:]
        )

    return highlighted


# ═══════════════════════════════════════════════════════════════════════════
# Core Analysis Function — analyze_text(content)
# ═══════════════════════════════════════════════════════════════════════════

def analyze_text(content: str) -> dict:
    """
    Unified bias analysis entry point.
    Accepts raw text content and returns a clean result with:
      - bias_score        (float 0-10, 0=no bias, 10=extreme bias)
      - biased_terms      (list of biased words/phrases found)
      - suggested_replacements (dict mapping each biased term → neutral alternative)
      - explanation        (human-readable summary of findings)
    """
    if not content or not content.strip():
        return {
            "bias_score": 0.0,
            "biased_terms": [],
            "suggested_replacements": {},
            "explanation": "No text provided for analysis.",
        }

    text = content.strip()

    # 1. Detect language
    lang_info = detect_language(text)

    # 2. Gender bias analysis
    gender_result = detect_gender_bias(text)

    # 3. Language bias analysis
    language_result = detect_language_bias(text, lang_info)

    # ── Collect biased_terms and suggested_replacements ──────────────────
    biased_terms = []
    suggested_replacements = {}

    # From gender stereotypes
    for item in gender_result.get("stereotypes_found", []):
        phrase = item["phrase"]
        if phrase not in biased_terms:
            biased_terms.append(phrase)
        suggested_replacements[phrase] = item["suggestion"]

    # From gendered role phrases
    for item in gender_result.get("role_phrases_found", []):
        phrase = item["phrase"]
        if phrase not in biased_terms:
            biased_terms.append(phrase)
        # Role phrases don't have a direct suggestion, mark for rewriting
        suggested_replacements.setdefault(phrase, "Consider using gender-neutral language")

    # From language bias terms (Hindi + English)
    for item in language_result.get("biased_terms_found", []):
        phrase = item["phrase"]
        if phrase not in biased_terms:
            biased_terms.append(phrase)
        suggested_replacements[phrase] = item["neutral_alternative"]

    # ── Combined bias score ──────────────────────────────────────────────
    bias_score = round(
        (gender_result["gender_bias_score"] + language_result["language_bias_score"]) / 2,
        2,
    )

    # ── Build explanation ────────────────────────────────────────────────
    total_issues = len(biased_terms)
    lang_label = lang_info["detected"].upper()

    if bias_score <= 1.5:
        level = "Low"
    elif bias_score <= 4:
        level = "Moderate"
    else:
        level = "High"

    explanation_parts = [
        f"{level} bias detected (score: {bias_score}/10).",
        f"Language: {lang_label} (Hindi {lang_info['hindi_pct']}%, English {lang_info['english_pct']}%).",
    ]

    if total_issues == 0:
        explanation_parts.append("No biased terms found. The text appears balanced and inclusive.")
    else:
        explanation_parts.append(f"{total_issues} biased term(s) found.")

        # Pronoun imbalance note
        m = gender_result["male_pronoun_count"]
        f_ = gender_result["female_pronoun_count"]
        if m + f_ > 0:
            explanation_parts.append(
                f"Pronoun usage: {m} male vs {f_} female "
                f"(imbalance: {gender_result['imbalance_score']:.0%})."
            )

        # List the terms
        if biased_terms:
            terms_preview = ", ".join(f'"{t}"' for t in biased_terms[:8])
            if len(biased_terms) > 8:
                terms_preview += f" … and {len(biased_terms) - 8} more"
            explanation_parts.append(f"Biased terms include: {terms_preview}.")

    explanation = " ".join(explanation_parts)

    return {
        "bias_score": bias_score,
        "biased_terms": biased_terms,
        "suggested_replacements": suggested_replacements,
        "explanation": explanation,
    }


# ── /analyze endpoint ───────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    content: str

@app.post("/analyze")
def analyze_endpoint(req: AnalyzeRequest):
    """
    Run analyze_text(content) and return bias_score,
    biased_terms, suggested_replacements, and explanation.
    """
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content is required.")
    return analyze_text(req.content)


# ═══════════════════════════════════════════════════════════════════════════
# Example Texts
# ═══════════════════════════════════════════════════════════════════════════

EXAMPLE_TEXTS = [
    {
        "id": 1,
        "title": "🔴 Gender-Biased English Article",
        "description": "An article with heavy male pronoun dominance and stereotypical language",
        "text": (
            "The chairman of the company announced his new policy today. "
            "He emphasized that manpower is the key to success and that every "
            "businessman should man up and take charge. His aggressive leadership "
            "style has been praised by his peers. Meanwhile, the lady doctor in "
            "the company was described as too emotional to handle the role. "
            "She was told that her nurturing nature makes her better suited "
            "for support roles. Boys will be boys, he remarked, dismissing "
            "concerns about workplace equality. He believes real men don't "
            "show weakness and that the weaker sex should focus on their "
            "natural strengths."
        ),
    },
    {
        "id": 2,
        "title": "🟠 Hindi Language Bias (Mixed)",
        "description": "Hindi/English mixed text with cultural gender bias terms",
        "text": (
            "आज की मीटिंग में बताया गया कि औरतों का काम सिर्फ घर संभालना है। "
            "CEO ने कहा कि मर्दानगी दिखाओ और targets पूरे करो। "
            "He said that women are too emotional for leadership roles. "
            "उन्होंने कहा कि लड़के रोते नहीं और मर्द को दर्द नहीं होता। "
            "Office में एक कर्मचारी ने कहा कि she is acting like a girl "
            "and should man up. बेटी को पराया धन माना जाता है "
            "और पति परमेश्वर होता है। This is a man's job and boys will be boys."
        ),
    },
    {
        "id": 3,
        "title": "🟡 Subtle English Bias",
        "description": "Professional article with subtle gendered language",
        "text": (
            "The spokesman for the organization addressed the media today. "
            "He confirmed that the fireman rescued three families from the blaze. "
            "The working mother on the team struggled to balance her career "
            "while the businessman received a promotion. Her emotional response "
            "during the meeting was noted. Critics say it's not ladylike to "
            "raise your voice in professional settings. The salesman of the "
            "year award went to him for his ambitious targets."
        ),
    },
    {
        "id": 4,
        "title": "🟢 Gender-Neutral Article",
        "description": "A well-written article with balanced, inclusive language",
        "text": (
            "The chairperson of the organization addressed the media today. "
            "They confirmed that the firefighter rescued three families from "
            "the blaze. The working parent on the team balanced their career "
            "effectively. The spokesperson announced new policies aimed at "
            "workplace equality. The salesperson of the year award was given "
            "to the top performer for their outstanding achievements. "
            "Everyone in the workforce contributed to the company's success "
            "regardless of their background."
        ),
    },
    {
        "id": 5,
        "title": "🔴 Pure Hindi Bias",
        "description": "Hindi article with deeply biased cultural phrases",
        "text": (
            "समाज में आज भी अबला नारी की अवधारणा बनी हुई है। "
            "लोग कहते हैं कि लड़कियां ऐसे नहीं करतीं और चूल्हा चौका ही "
            "उनका असली काम है। लड़कियों को शर्म करनी चाहिए अगर वे "
            "घर से बाहर काम करती हैं। बड़े बुजुर्ग कहते हैं कि "
            "पति परमेश्वर होता है और बेटी पराया धन है। "
            "लड़के रोते नहीं, मर्द को दर्द नहीं होता — ये सब "
            "हमारे समाज की पुरानी सोच है जो बदलनी चाहिए।"
        ),
    },
]


# ═══════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/detect")
def detect_bias(req: DetectRequest):
    """
    Run complete bias detection on the submitted text.
    Returns gender bias analysis, language bias analysis,
    highlighted text, and overall summary.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required.")

    text = req.text.strip()

    # 1. Detect language
    lang_info = detect_language(text)

    # 2. Gender bias
    gender_result = detect_gender_bias(text)

    # 3. Language bias
    language_result = detect_language_bias(text, lang_info)

    # 4. Build highlighted text
    highlighted = build_highlighted_text(text, gender_result, language_result)

    # 5. Overall summary
    total_issues = (
        gender_result["total_gender_issues"]
        + language_result["total_language_issues"]
    )
    combined_score = round(
        (gender_result["gender_bias_score"] + language_result["language_bias_score"]) / 2,
        2,
    )

    if combined_score <= 1.5:
        overall_level = "Low Bias"
    elif combined_score <= 4:
        overall_level = "Moderate Bias"
    else:
        overall_level = "High Bias"

    return {
        "gender_bias": gender_result,
        "language_bias": language_result,
        "highlighted_text": highlighted,
        "bias_summary": {
            "overall_bias_level": overall_level,
            "combined_bias_score": combined_score,
            "total_issues_found": total_issues,
            "gender_issues": gender_result["total_gender_issues"],
            "language_issues": language_result["total_language_issues"],
        },
    }


@app.get("/examples")
def get_examples():
    """Return curated example texts for testing bias detection."""
    return {"examples": EXAMPLE_TEXTS}


@app.get("/examples/{example_id}")
def get_example(example_id: int):
    """Return a single example and run bias detection on it."""
    for ex in EXAMPLE_TEXTS:
        if ex["id"] == example_id:
            # Run detection on the example
            text = ex["text"]
            lang_info = detect_language(text)
            gender_result = detect_gender_bias(text)
            language_result = detect_language_bias(text, lang_info)
            highlighted = build_highlighted_text(text, gender_result, language_result)

            total_issues = (
                gender_result["total_gender_issues"]
                + language_result["total_language_issues"]
            )
            combined_score = round(
                (gender_result["gender_bias_score"]
                 + language_result["language_bias_score"]) / 2,
                2,
            )
            if combined_score <= 1.5:
                overall_level = "Low Bias"
            elif combined_score <= 4:
                overall_level = "Moderate Bias"
            else:
                overall_level = "High Bias"

            return {
                "example": ex,
                "gender_bias": gender_result,
                "language_bias": language_result,
                "highlighted_text": highlighted,
                "bias_summary": {
                    "overall_bias_level": overall_level,
                    "combined_bias_score": combined_score,
                    "total_issues_found": total_issues,
                    "gender_issues": gender_result["total_gender_issues"],
                    "language_issues": language_result["total_language_issues"],
                },
            }

    raise HTTPException(status_code=404, detail="Example not found.")




# ═══════════════════════════════════════════════════════════════════════════
# Regional Language AI — News Search with Dominance Detection
# ═══════════════════════════════════════════════════════════════════════════

import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from html import unescape

# Common English-to-Hindi keyword translations for news search
QUERY_TRANSLATIONS = {
    "flood": "\u092c\u093e\u0922\u093c",
    "floods": "\u092c\u093e\u0922\u093c",
    "earthquake": "\u092d\u0942\u0915\u0902\u092a",
    "election": "\u091a\u0941\u0928\u093e\u0935",
    "elections": "\u091a\u0941\u0928\u093e\u0935",
    "cricket": "\u0915\u094d\u0930\u093f\u0915\u0947\u091f",
    "politics": "\u0930\u093e\u091c\u0928\u0940\u0924\u093f",
    "economy": "\u0905\u0930\u094d\u0925\u0935\u094d\u092f\u0935\u0938\u094d\u0925\u093e",
    "education": "\u0936\u093f\u0915\u094d\u0937\u093e",
    "health": "\u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f",
    "covid": "\u0915\u094b\u0935\u093f\u0921",
    "pandemic": "\u092e\u0939\u093e\u092e\u093e\u0930\u0940",
    "farmer": "\u0915\u093f\u0938\u093e\u0928",
    "farmers": "\u0915\u093f\u0938\u093e\u0928",
    "protest": "\u0935\u093f\u0930\u094b\u0927 \u092a\u094d\u0930\u0926\u0930\u094d\u0936\u0928",
    "budget": "\u092c\u091c\u091f",
    "weather": "\u092e\u094c\u0938\u092e",
    "rain": "\u092c\u093e\u0930\u093f\u0936",
    "cyclone": "\u091a\u0915\u094d\u0930\u0935\u093e\u0924",
    "heatwave": "\u0932\u0942",
    "drought": "\u0938\u0942\u0916\u093e",
    "pollution": "\u092a\u094d\u0930\u0926\u0942\u0937\u0923",
    "crime": "\u0905\u092a\u0930\u093e\u0927",
    "accident": "\u0926\u0941\u0930\u094d\u0918\u091f\u0928\u093e",
    "fire": "\u0906\u0917",
    "bomb": "\u092c\u092e",
    "attack": "\u0939\u092e\u0932\u093e",
    "war": "\u092f\u0941\u0926\u094d\u0927",
    "sports": "\u0916\u0947\u0932",
    "technology": "\u092a\u094d\u0930\u094c\u0926\u094d\u092f\u094b\u0917\u093f\u0915\u0940",
    "science": "\u0935\u093f\u091c\u094d\u091e\u093e\u0928",
    "india": "\u092d\u093e\u0930\u0924",
    "delhi": "\u0926\u093f\u0932\u094d\u0932\u0940",
    "mumbai": "\u092e\u0941\u0902\u092c\u0908",
    "bihar": "\u092c\u093f\u0939\u093e\u0930",
    "assam": "\u0905\u0938\u092e",
    "kerala": "\u0915\u0947\u0930\u0932",
    "tamil nadu": "\u0924\u092e\u093f\u0932 \u0928\u093e\u0921\u0942",
    "rajasthan": "\u0930\u093e\u091c\u0938\u094d\u0925\u093e\u0928",
    "uttar pradesh": "\u0909\u0924\u094d\u0924\u0930 \u092a\u094d\u0930\u0926\u0947\u0936",
    "madhya pradesh": "\u092e\u0927\u094d\u092f \u092a\u094d\u0930\u0926\u0947\u0936",
    "west bengal": "\u092a\u0936\u094d\u091a\u093f\u092e \u092c\u0902\u0917\u093e\u0932",
    "gujarat": "\u0917\u0941\u091c\u0930\u093e\u0924",
    "maharashtra": "\u092e\u0939\u093e\u0930\u093e\u0937\u094d\u091f\u094d\u0930",
    "karnataka": "\u0915\u0930\u094d\u0928\u093e\u091f\u0915",
    "modi": "\u092e\u094b\u0926\u0940",
    "government": "\u0938\u0930\u0915\u093e\u0930",
    "supreme court": "\u0938\u0941\u092a\u094d\u0930\u0940\u092e \u0915\u094b\u0930\u094d\u091f",
    "parliament": "\u0938\u0902\u0938\u0926",
    "hospital": "\u0905\u0938\u094d\u092a\u0924\u093e\u0932",
    "school": "\u0938\u094d\u0915\u0942\u0932",
    "university": "\u0935\u093f\u0936\u094d\u0935\u0935\u093f\u0926\u094d\u092f\u093e\u0932\u092f",
    "woman": "\u092e\u0939\u093f\u0932\u093e",
    "women": "\u092e\u0939\u093f\u0932\u093e\u090f\u0902",
    "child": "\u092c\u091a\u094d\u091a\u093e",
    "children": "\u092c\u091a\u094d\u091a\u0947",
    "murder": "\u0939\u0924\u094d\u092f\u093e",
    "robbery": "\u0921\u0915\u0948\u0924\u0940",
    "scam": "\u0918\u094b\u091f\u093e\u0932\u093e",
    "corruption": "\u092d\u094d\u0930\u0937\u094d\u091f\u093e\u091a\u093e\u0930",
    "development": "\u0935\u093f\u0915\u093e\u0938",
    "infrastructure": "\u092c\u0941\u0928\u093f\u092f\u093e\u0926\u0940 \u0922\u093e\u0902\u091a\u093e",
    "railway": "\u0930\u0947\u0932\u0935\u0947",
    "train": "\u091f\u094d\u0930\u0947\u0928",
    "flight": "\u0909\u0921\u093c\u093e\u0928",
    "airport": "\u0939\u0935\u093e\u0908 \u0905\u0921\u094d\u0921\u093e",
}


def translate_query_to_hindi(query: str) -> str:
    """
    Translate an English search query to Hindi using keyword mapping.
    Words not in the dictionary are kept as-is.
    """
    words = query.lower().split()
    translated = []

    i = 0
    while i < len(words):
        # Try two-word phrases first
        if i + 1 < len(words):
            two_word = f"{words[i]} {words[i+1]}"
            if two_word in QUERY_TRANSLATIONS:
                translated.append(QUERY_TRANSLATIONS[two_word])
                i += 2
                continue

        # Single word
        word = words[i]
        if word in QUERY_TRANSLATIONS:
            translated.append(QUERY_TRANSLATIONS[word])
        else:
            translated.append(word)
        i += 1

    return " ".join(translated)


def fetch_google_news_rss(query: str, language: str = "en", max_results: int = 5) -> list:
    """
    Fetch news articles from Google News RSS feed.
    language: 'en' for English, 'hi' for Hindi
    """
    encoded_query = urllib.parse.quote(query)

    if language == "hi":
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=hi&gl=IN&ceid=IN:hi"
    else:
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

    articles = []
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)

        for item in root.findall(".//item")[:max_results]:
            title = item.find("title").text if item.find("title") is not None else "No Title"
            link = item.find("link").text if item.find("link") is not None else "#"
            pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
            source_el = item.find("source")
            source = source_el.text if source_el is not None else "News"

            title = unescape(title)

            articles.append({
                "title": title,
                "link": link,
                "published": pub_date,
                "source": source,
                "language": language,
            })
    except Exception as e:
        print(f"Google News RSS fetch failed ({language}): {e}")

    return articles


class NewsSearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 8


@app.post("/search-news")
def search_news(req: NewsSearchRequest):
    """
    Search Google News for a topic.
    1. Fetch English results first
    2. Detect language dominance
    3. Auto-fetch Hindi results
    4. Return both with dominance analysis
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query is required.")

    query = req.query.strip()
    max_results = min(req.max_results or 8, 15)

    # Step 1: Fetch English news
    english_articles = fetch_google_news_rss(query, language="en", max_results=max_results)

    # Step 2: Translate query and fetch Hindi news
    hindi_query = translate_query_to_hindi(query)
    hindi_articles = fetch_google_news_rss(hindi_query, language="hi", max_results=max_results)

    # Step 3: Dominance analysis
    total_en = len(english_articles)
    total_hi = len(hindi_articles)
    total_all = total_en + total_hi

    en_pct = round(total_en / total_all * 100, 1) if total_all > 0 else 0
    hi_pct = round(total_hi / total_all * 100, 1) if total_all > 0 else 0

    if total_hi == 0 and total_en > 0:
        dominance_status = "english_only"
        dominance_message = (
            f"Language Dominance Detected: All {total_en} results are in English. "
            "No Hindi news found for this topic. Regional language representation is missing."
        )
    elif total_en > 0 and total_hi > 0:
        dominance_status = "balanced"
        dominance_message = (
            f"Regional representation added! "
            f"Showing {total_en} English + {total_hi} Hindi articles. "
            f"English: {en_pct}% - Hindi: {hi_pct}%"
        )
    elif total_hi > 0 and total_en == 0:
        dominance_status = "hindi_only"
        dominance_message = (
            f"All {total_hi} results are in Hindi. No English news found."
        )
    else:
        dominance_status = "no_results"
        dominance_message = "No news articles found for this query."

    return {
        "query": query,
        "hindi_query": hindi_query,
        "english_articles": english_articles,
        "hindi_articles": hindi_articles,
        "dominance_analysis": {
            "status": dominance_status,
            "message": dominance_message,
            "english_count": total_en,
            "hindi_count": total_hi,
            "english_percentage": en_pct,
            "hindi_percentage": hi_pct,
            "is_english_dominant": total_en > 0 and total_hi == 0,
        },
    }