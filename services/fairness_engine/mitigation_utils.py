"""
Mitigation utilities — recommendations, weight calculations, text rewriting.
Supports all 7 bias categories.
"""

import re
from typing import Dict, List, Tuple, Any
import logging

logger = logging.getLogger(__name__)

# ── Master bias replacement dictionary ────────────────────────────────────
# Sorted longest-first at runtime to prevent short words corrupting longer phrases.

_BIAS_REPLACEMENTS: Dict[str, str] = {
    # ── Workplace / hiring bias ───────────────────────────────────────────
    "all-male board of directors": "diverse board of directors",
    "all-male board": "diverse board",
    "without family distractions": "with good work-life balance",
    "family distractions": "personal commitments",
    "young, hungry coders": "skilled developers",
    "young and hungry": "motivated and driven",
    "rockstar developer": "skilled developer",
    "rockstar engineer": "skilled engineer",
    "ninja developer": "skilled developer",
    "ninja engineer": "skilled engineer",
    "10x developer": "highly productive developer",
    "10x engineer": "highly productive engineer",
    "culture fit": "values alignment",
    "young, hungry": "motivated",
    "lady programmers": "female developers",
    "lady programmer": "female developer",
    "girl coders": "developers",
    "girl coder": "developer",
    "work long hours": "work effectively",
    "hustle culture": "dedicated work culture",
    "always available": "responsive and reliable",
    # ── Gender / role phrases (longest first) ─────────────────────────────
    "women belong in supportive positions": "people can work in any role",
    "women belong in the kitchen": "people can work in any field",
    "men are the natural leaders": "people of all genders can lead",
    "men are natural leaders": "people of all genders can lead",
    "prioritize family over deadlines": "balance personal and professional priorities",
    "hispanic workers are hardworking but may have language barriers": "dedicated workers with diverse backgrounds",
    "african americans excel in creative roles": "individuals with creative skills",
    "asian developers are naturally good at math": "developers with strong technical skills",
    "asians are naturally good at math": "individuals with strong math skills",
    "women are too emotional": "all people experience emotions",
    "boys will be boys": "children should be held to equal standards",
    "boys don't cry": "it's okay to express emotions",
    "man of the house": "head of household",
    "man's job": "anyone's job",
    "woman's place": "anyone's place",
    "like a girl": "with effort",
    "throw like a girl": "throw with less force",
    "don't be such a girl": "don't be so sensitive",
    "acting like a woman": "being expressive",
    "that's not ladylike": "that's unconventional",
    "weaker sex": "all people",
    "lady doctor": "doctor",
    "lady engineer": "engineer",
    "lady scientist": "scientist",
    "lady lawyer": "lawyer",
    "male nurse": "nurse",
    "working mother": "working parent",
    "career woman": "professional",
    "old maid": "unmarried person",
    "men are better at": "individuals vary in their abilities with",
    "men are naturally": "individuals can be naturally",
    "women are naturally": "individuals can be naturally",
    "girls should": "all people should",
    "real men": "people",
    "man up": "be courageous",
    "be a man": "be strong",
    "built for high-pressure": "suited for demanding",
    "supportive positions": "various roles",
    "crumble under stress": "struggle under pressure",
    "breadwinners": "providers",
    "breadwinner": "provider",
    "natural leaders": "capable leaders",
    "natural leader": "capable leader",
    "somehow managed": "managed",
    "surprisingly sharp": "highly capable",
    "allowing her to": "supporting her to",
    "juggling family responsibilities": "balancing family responsibilities",
    "the mother of": "a parent of",
    # ── Single-word gender ─────────────────────────────────────────────────
    "chairman": "chairperson",
    "fireman": "firefighter",
    "policeman": "police officer",
    "businessman": "businessperson",
    "spokesman": "spokesperson",
    "mailman": "mail carrier",
    "cameraman": "camera operator",
    "salesman": "salesperson",
    "foreman": "supervisor",
    "mankind": "humankind",
    "manpower": "workforce",
    "housewife": "homemaker",
    "tomboy": "active child",
    "emotional": "expressive",
    "hysterical": "upset",
    "nurturing": "caring",
    "ditzy": "thoughtful",
    "nagging": "persistent",
    "catfight": "disagreement",
    "aggressive": "assertive",
    "dominant": "leading",
    "stubborn": "persistent",
    # ── Age bias ──────────────────────────────────────────────────────────
    "millennials are lazy": "younger workers have different work styles",
    "millennials don't work hard": "work styles vary across generations",
    "boomers don't understand technology": "technology adoption varies",
    "too old for this": "experienced in this",
    "over the hill": "experienced",
    "past their prime": "highly experienced",
    "ok boomer": "I respectfully disagree",
    "young and inexperienced": "early-career",
    "too young to understand": "still learning",
    "senior moment": "momentary lapse",
    "retire already": "consider transitioning roles",
    "digital native": "tech-savvy person",
    "digital immigrant": "person learning new technology",
    # ── Disability bias ───────────────────────────────────────────────────
    "wheelchair-bound": "wheelchair user",
    "confined to a wheelchair": "wheelchair user",
    "suffers from": "has",
    "afflicted with": "has",
    "victim of": "person with",
    "mentally ill": "person with a mental health condition",
    "high-functioning": "autistic person who",
    "special needs": "disability",
    "handicapped": "disabled",
    "normal people": "people without disabilities",
    "crazy": "unusual",
    "insane": "extreme",
    "lame": "ineffective",
    # ── Religious bias ────────────────────────────────────────────────────
    "all muslims are": "some individuals who are Muslim",
    "typical christian": "some Christians",
    "religious fanatic": "person with strong religious beliefs",
    "bible thumper": "devout Christian",
    # ── Socioeconomic bias ────────────────────────────────────────────────
    "poor people are lazy": "people in poverty face systemic barriers",
    "welfare queen": "person receiving social assistance",
    "born with a silver spoon": "from a wealthy background",
    "trailer trash": "person living in a mobile home",
    "white trash": "low-income white person",
    "uneducated masses": "people without formal education",
    "bootstraps": "self-reliance",
    # ── Racial / ethnic stereotypes ───────────────────────────────────────
    "model minority": "high-achieving individual",
    "exotic": "unique",
    "surprisingly articulate": "well-spoken",
    "articulate": "well-spoken",
    "one of the good ones": "a valued colleague",
    "culturally fit": "aligned with team values",
    "native english speakers": "proficient English speakers",
    # ── Hindi bias terms ──────────────────────────────────────────────────
    "औरतों का काम": "घर का काम",
    "मर्दानगी": "साहस",
    "मर्दों जैसा": "मजबूत",
    "औरतों जैसा": "कोमल",
    "पराया धन": "बेटी",
    "घर संभालो": "सहयोग करो",
    "पति परमेश्वर": "जीवन साथी",
    "कमजोर लिंग": "व्यक्ति",
    "लड़के रोते नहीं": "भावनाएं स्वाभाविक हैं",
    "अबला नारी": "महिला",
    "मर्द को दर्द नहीं होता": "सभी को दर्द होता है",
}

_PRONOUN_NEUTRAL: Dict[str, str] = {
    "he": "they", "him": "them", "his": "their", "himself": "themselves",
    "she": "they", "her": "them", "hers": "theirs", "herself": "themselves",
}


def calculate_weight_adjustment(
    bias_score: float,
    risk_level: str,
    min_weight: float = 0.1,
    max_weight: float = 1.0,
) -> Tuple[float, float, str]:
    risk_multipliers = {"low": 0.1, "medium": 0.3, "high": 0.5, "critical": 0.7}
    multiplier = risk_multipliers.get(risk_level, 0.3)
    adjustment_factor = min(1.0, bias_score * multiplier)
    adjusted_weight = max(min_weight, max_weight - adjustment_factor)
    rationale = (
        f"Weight adjusted from {max_weight} to {adjusted_weight:.2f} "
        f"due to {risk_level} risk level (bias score: {bias_score:.2f})"
    )
    logger.info(f"Weight adjustment: {max_weight} → {adjusted_weight:.2f} ({risk_level})")
    return adjusted_weight, adjustment_factor, rationale


def generate_recommendations(
    bias_scores: Dict[str, float], risk_level: str
) -> List[str]:
    recommendations: List[str] = []

    if bias_scores.get("gender_bias", 0) > 0.3:
        recommendations.extend([
            "Use gender-neutral language (e.g., 'they' instead of 'he/she')",
            "Replace gendered job titles (e.g., 'chairperson' instead of 'chairman')",
            "Ensure balanced representation of all genders in examples",
        ])

    if bias_scores.get("stereotype", 0) > 0.3:
        recommendations.extend([
            "Avoid stereotypical associations between groups and characteristics",
            "Include diverse perspectives and counter-stereotypical examples",
        ])

    if bias_scores.get("age_bias", 0) > 0.3:
        recommendations.extend([
            "Avoid age-based generalizations about generations or age groups",
            "Focus on skills and experience rather than age",
        ])

    if bias_scores.get("disability_bias", 0) > 0.3:
        recommendations.extend([
            "Use person-first language (e.g., 'person with a disability')",
            "Avoid ableist terms like 'wheelchair-bound', 'suffers from', 'crazy'",
        ])

    if bias_scores.get("religious_bias", 0) > 0.3:
        recommendations.extend([
            "Avoid generalizations about religious groups",
            "Distinguish between individual actions and religious identity",
        ])

    if bias_scores.get("socioeconomic_bias", 0) > 0.3:
        recommendations.extend([
            "Avoid class-based stereotypes and assumptions",
            "Acknowledge systemic factors rather than attributing outcomes to individual character",
        ])

    if bias_scores.get("language_dominance", 0) > 0.3:
        recommendations.extend([
            "Use culturally inclusive language and examples",
            "Consider multilingual and multicultural perspectives",
        ])

    if risk_level in ["high", "critical"]:
        recommendations.insert(
            0, "⚠️ HIGH PRIORITY: This content requires immediate review and revision"
        )
        recommendations.append(
            "Consider having content reviewed by a diverse group of stakeholders"
        )

    return recommendations[:8]


def calculate_fairness_score(bias_scores: Dict[str, float]) -> float:
    overall_bias = bias_scores.get("overall", 0.5)
    return round(1.0 - overall_bias, 2)


def determine_risk_level(bias_score: float) -> str:
    if bias_score < 0.25:
        return "low"
    elif bias_score < 0.5:
        return "medium"
    elif bias_score < 0.75:
        return "high"
    else:
        return "critical"


def calculate_detailed_metrics(bias_scores: Dict[str, float]) -> Dict[str, float]:
    return {
        "gender_fairness": round(1.0 - bias_scores.get("gender_bias", 0), 2),
        "stereotype_fairness": round(1.0 - bias_scores.get("stereotype", 0), 2),
        "age_fairness": round(1.0 - bias_scores.get("age_bias", 0), 2),
        "disability_fairness": round(1.0 - bias_scores.get("disability_bias", 0), 2),
        "religious_fairness": round(1.0 - bias_scores.get("religious_bias", 0), 2),
        "socioeconomic_fairness": round(1.0 - bias_scores.get("socioeconomic_bias", 0), 2),
        "language_fairness": round(1.0 - bias_scores.get("language_dominance", 0), 2),
        "overall_fairness": round(1.0 - bias_scores.get("overall", 0), 2),
    }


def rewrite_biased_text(
    original_text: str,
    highlighted_spans: List[Any],
    overall_bias: float,
) -> str:
    """Create a bias-free alternative version of the text."""
    if not original_text or not original_text.strip():
        return original_text
    if overall_bias < 0.15:
        return original_text

    result = original_text
    sorted_phrases = sorted(_BIAS_REPLACEMENTS.keys(), key=len, reverse=True)

    for phrase in sorted_phrases:
        replacement = _BIAS_REPLACEMENTS[phrase]
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)

        def replace_match(m, rep=replacement):
            word = m.group()
            if word.isupper():
                return rep.upper()
            if word[0].isupper():
                return rep[0].upper() + rep[1:]
            return rep

        result = pattern.sub(replace_match, result)

    # Apply span suggestions for terms not in dictionary
    for span in highlighted_spans:
        phrase = getattr(span, "text", None) or (span.get("text") if isinstance(span, dict) else None)
        suggestion = getattr(span, "suggestion", None) or (span.get("suggestion") if isinstance(span, dict) else None)
        if phrase and suggestion and phrase not in _BIAS_REPLACEMENTS:
            result = re.sub(re.escape(phrase), suggestion, result, flags=re.IGNORECASE)

    # Rebalance pronouns if heavily skewed
    male_count = len(re.findall(r"\b(he|him|his|himself)\b", result, re.IGNORECASE))
    female_count = len(re.findall(r"\b(she|her|hers|herself)\b", result, re.IGNORECASE))

    if male_count > female_count * 3 and male_count > 2:
        _counter = [0]

        def _neutral_m(m):
            _counter[0] += 1
            if _counter[0] % 2 == 0:
                return _PRONOUN_NEUTRAL.get(m.group().lower(), m.group())
            return m.group()

        result = re.sub(r"\b(he|him|his|himself)\b", _neutral_m, result, flags=re.IGNORECASE)

    elif female_count > male_count * 3 and female_count > 2:
        _counter = [0]

        def _neutral_f(m):
            _counter[0] += 1
            if _counter[0] % 2 == 0:
                return _PRONOUN_NEUTRAL.get(m.group().lower(), m.group())
            return m.group()

        result = re.sub(r"\b(she|her|hers|herself)\b", _neutral_f, result, flags=re.IGNORECASE)

    # Fix article grammar: "an [consonant-word]" → "a [consonant-word]"
    result = re.sub(
        r'\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])',
        lambda m: 'a ' + m.group(1),
        result
    )

    return result
