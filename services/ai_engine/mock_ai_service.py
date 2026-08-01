"""
Mock AI service — rule-based fallback when no LLM keys are configured.
Uses EnhancedBiasDetector for multilingual detection (English + Hindi + Hinglish).
Now covers all 7 bias categories including age, disability, religion, socioeconomic.
"""

import re
from typing import List
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan
from services.ai_engine.enhanced_bias_detector import EnhancedBiasDetector
from services.ai_engine.bias_lexicon import ADDITIONAL_BIAS_PATTERNS
from services.ai_engine.rewrite_utils import generate_alternative_text
import logging

logger = logging.getLogger(__name__)

# ── Extended rule-based patterns for new bias categories ──────────────────

AGE_BIAS_PATTERNS = {
    "too old for this": "experienced in this",
    "over the hill": "experienced",
    "past their prime": "highly experienced",
    "millennials are lazy": "younger workers have different work styles",
    "millennials don't work hard": "work styles vary across generations",
    "boomers don't understand technology": "technology adoption varies",
    "ok boomer": "I respectfully disagree",
    "young and inexperienced": "early-career",
    "too young to understand": "still learning",
    "senior moment": "momentary lapse",
    "old-fashioned thinking": "traditional approach",
    "digital native": "tech-savvy person",
    "digital immigrant": "person learning new technology",
    "retire already": "consider transitioning roles",
    "age is just a number": "experience matters",
}

DISABILITY_BIAS_PATTERNS = {
    "wheelchair-bound": "wheelchair user",
    "confined to a wheelchair": "wheelchair user",
    "suffers from": "has",
    "afflicted with": "has",
    "victim of": "person with",
    "mentally ill": "person with a mental health condition",
    "crazy": "unusual",
    "insane": "extreme",
    "lame": "ineffective",
    "blind to": "unaware of",
    "deaf to": "ignoring",
    "dumb": "unable to speak",
    "retarded": "has an intellectual disability",
    "special needs": "disability",
    "differently abled": "disabled",
    "handicapped": "disabled",
    "normal people": "people without disabilities",
    "able-bodied": "non-disabled",
    "high-functioning": "autistic person who",
    "low-functioning": "autistic person who needs more support",
}

RELIGIOUS_BIAS_PATTERNS = {
    "all muslims are": "some individuals who are Muslim",
    "typical christian": "some Christians",
    "jewish people control": "some individuals",
    "hindus are": "some Hindus",
    "atheists have no morals": "atheists have their own moral frameworks",
    "religious fanatic": "person with strong religious beliefs",
    "bible thumper": "devout Christian",
    "jihad": "personal struggle or holy war",
    "terrorist muslim": "person who commits terrorism",
    "cult": "religious group",
}

SOCIOECONOMIC_BIAS_PATTERNS = {
    "poor people are lazy": "people in poverty face systemic barriers",
    "welfare queen": "person receiving social assistance",
    "born with a silver spoon": "from a wealthy background",
    "trailer trash": "person living in a mobile home",
    "white trash": "low-income white person",
    "ghetto": "low-income neighborhood",
    "redneck": "rural working-class person",
    "elitist": "person with privileged views",
    "bootstraps": "self-reliance",
    "pull yourself up": "work hard to improve your situation",
    "can't afford to": "faces financial barriers to",
    "uneducated masses": "people without formal education",
    "working class": "working-class people",
    "lower class": "people with lower incomes",
    "underclass": "people experiencing poverty",
}

WORKPLACE_BIAS_PATTERNS = {
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
}


class MockAIService:
    """
    Mock implementation of AI bias detection.
    Uses rule-based pattern matching to simulate AI analysis.
    Covers all 7 bias categories.
    """

    def __init__(self):
        self.enhanced_detector = EnhancedBiasDetector()
        self.age_patterns = AGE_BIAS_PATTERNS
        self.disability_patterns = DISABILITY_BIAS_PATTERNS
        self.religious_patterns = RELIGIOUS_BIAS_PATTERNS
        self.socioeconomic_patterns = SOCIOECONOMIC_BIAS_PATTERNS
        self.workplace_patterns = WORKPLACE_BIAS_PATTERNS
        self.additional_patterns = ADDITIONAL_BIAS_PATTERNS
        logger.info("🤖 Mock AI Service initialized (all 7 bias categories + workplace)")

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: str = None,
    ) -> AIAnalysisResult:
        logger.info(f"🤖 Mock AI analyzing: {analysis_id}")

        # Core multilingual detection (gender + Hindi)
        enhanced_result = self.enhanced_detector.analyze(content)

        if not language:
            language = enhanced_result["language_info"]["detected"]

        # Extract scores from enhanced detector
        gender_bias = enhanced_result["gender_bias"]["gender_bias_score"]
        hindi_bias = enhanced_result["hindi_bias"]["hindi_bias_score"]
        romanised_bias = enhanced_result.get("romanised_hindi_bias", {}).get(
            "romanised_hindi_bias_score", 0.0
        )
        stereotype_issues = len(enhanced_result["gender_bias"]["stereotypes_found"])
        stereotype = min(stereotype_issues * 0.15, 1.0)
        language_dominance = enhanced_result.get("language_dominance", 0.0)

        # Detect new bias categories
        age_spans, age_score = self._detect_pattern_bias(content, self.age_patterns, "age_bias")
        disability_spans, disability_score = self._detect_pattern_bias(
            content, self.disability_patterns, "disability_bias"
        )
        religious_spans, religious_score = self._detect_pattern_bias(
            content, self.religious_patterns, "religious_bias"
        )
        socioeconomic_spans, socioeconomic_score = self._detect_pattern_bias(
            content, self.socioeconomic_patterns, "socioeconomic_bias"
        )
        workplace_spans, workplace_score = self._detect_pattern_bias(
            content, self.workplace_patterns, "stereotype"
        )
        additional_spans_by_type = {}
        additional_scores = {}
        for bias_type in {entry["category"] for entry in self.additional_patterns.values()}:
            typed_patterns = {
                phrase: entry["suggestion"]
                for phrase, entry in self.additional_patterns.items()
                if entry["category"] == bias_type
            }
            spans, score = self._detect_pattern_bias(content, typed_patterns, bias_type)
            additional_spans_by_type[bias_type] = spans
            additional_scores[bias_type] = score
        language_dominance = max(
            language_dominance,
            additional_scores.get("language_dominance", 0.0),
        )

        # Blend Hindi bias into gender_bias dimension
        lang_info = enhanced_result["language_info"]
        if lang_info.get("hindi_pct", 0) >= 50 or romanised_bias > 0:
            gender_bias = max(gender_bias, hindi_bias, romanised_bias)

        # Blend workplace bias into stereotype score
        stereotype = max(stereotype, workplace_score)

        # Calculate overall score
        combined = enhanced_result.get("combined_bias_score", 0.0)
        all_scores = [
            gender_bias, stereotype, age_score, disability_score,
            religious_score, socioeconomic_score, language_dominance,
            *additional_scores.values(),
        ]
        non_zero = [s for s in all_scores if s > 0]
        if non_zero:
            overall = round(
                min(1.0, max(non_zero) * 0.6 + sum(non_zero) / len(non_zero) * 0.4), 2
            )
        else:
            overall = round(min(1.0, combined * 0.7 + language_dominance * 0.3), 2)

        # Build all highlighted spans — deduplicate by position
        raw_spans: List[HighlightedSpan] = []
        severity = "high" if overall > 0.7 else "medium" if overall > 0.4 else "low"

        # Map EnhancedBiasDetector type names → standard bias category names
        _TYPE_MAP = {
            "male_stereotypes":   "stereotype",
            "female_stereotypes": "gender_bias",
            "hindi_bias":         "language_dominance",
            "romanised_hindi_bias": "language_dominance",
            "gender_role":        "gender_bias",
            "toxic_masculinity":  "stereotype",
            "patriarchy":         "gender_bias",
            "derogatory":         "gender_bias",
        }

        for item in enhanced_result["all_biased_terms"]:
            suggestion = (
                item.get("suggestion")
                or item.get("neutral_alternative")
                or item.get("neutral", "")
            )
            raw_type = item.get("type", "gender_bias")
            if raw_type in {"hindi_bias", "romanised_hindi_bias"}:
                raw_type = item.get("category", raw_type)
            mapped_type = _TYPE_MAP.get(raw_type, raw_type)
            raw_spans.append(
                HighlightedSpan(
                    span=[item["start"], item["end"]],
                    text=item["phrase"],
                    bias_type=mapped_type,
                    severity=severity,
                    contribution_score=0.15,
                    suggestion=suggestion,
                )
            )

        raw_spans.extend(age_spans)
        raw_spans.extend(disability_spans)
        raw_spans.extend(religious_spans)
        raw_spans.extend(socioeconomic_spans)
        raw_spans.extend(workplace_spans)
        for spans in additional_spans_by_type.values():
            raw_spans.extend(spans)

        # Sort by start position, then deduplicate overlapping spans
        raw_spans.sort(key=lambda s: s.span[0])
        highlighted_spans: List[HighlightedSpan] = []
        claimed = set()
        for span in raw_spans:
            s, e = span.span[0], span.span[1]
            if s < 0 or e > len(content) or s >= e:
                continue
            positions = set(range(s, e))
            if positions & claimed:
                continue
            claimed |= positions
            highlighted_spans.append(span)

        # Build explanations
        lang_pct = (
            f"Hindi: {lang_info['hindi_pct']}%, English: {lang_info['english_pct']}%"
        )
        hindi_issues = enhanced_result["hindi_bias"]["total_issues"]

        explanations = {
            "gender_bias": self._explain_score("gender bias", gender_bias),
            "stereotype": self._explain_score("stereotypical patterns", stereotype),
            "age_bias": self._explain_score("age bias", age_score)
            if age_score > 0
            else "No age bias detected.",
            "disability_bias": self._explain_score("disability bias", disability_score)
            if disability_score > 0
            else "No disability bias detected.",
            "religious_bias": self._explain_score("religious bias", religious_score)
            if religious_score > 0
            else "No religious bias detected.",
            "socioeconomic_bias": self._explain_score(
                "socioeconomic bias", socioeconomic_score
            )
            if socioeconomic_score > 0
            else "No socioeconomic bias detected.",
            "racial_ethnic_bias": self._explain_score(
                "racial or ethnic bias",
                additional_scores.get("racial_ethnic_bias", 0.0),
            )
            if additional_scores.get("racial_ethnic_bias", 0.0) > 0
            else "No racial or ethnic bias detected.",
            "caste_bias": self._explain_score(
                "caste or community bias",
                additional_scores.get("caste_bias", 0.0),
            )
            if additional_scores.get("caste_bias", 0.0) > 0
            else "No caste or community bias detected.",
            "body_bias": self._explain_score(
                "body or appearance bias",
                additional_scores.get("body_bias", 0.0),
            )
            if additional_scores.get("body_bias", 0.0) > 0
            else "No body or appearance bias detected.",
            "nationality_bias": self._explain_score(
                "nationality or origin bias",
                additional_scores.get("nationality_bias", 0.0),
            )
            if additional_scores.get("nationality_bias", 0.0) > 0
            else "No nationality or origin bias detected.",
            "language_dominance": (
                f"Language: {language.upper()} ({lang_pct}). "
                + (
                    f"{hindi_issues} Hindi bias term(s) detected."
                    if hindi_issues > 0
                    else ""
                )
            ),
        }

        result = AIAnalysisResult(
            bias_scores=BiasScores(
                gender_bias=round(gender_bias, 2),
                stereotype=round(stereotype, 2),
                age_bias=round(age_score, 2),
                disability_bias=round(disability_score, 2),
                religious_bias=round(religious_score, 2),
                socioeconomic_bias=round(socioeconomic_score, 2),
                racial_ethnic_bias=round(additional_scores.get("racial_ethnic_bias", 0.0), 2),
                caste_bias=round(additional_scores.get("caste_bias", 0.0), 2),
                body_bias=round(additional_scores.get("body_bias", 0.0), 2),
                nationality_bias=round(additional_scores.get("nationality_bias", 0.0), 2),
                language_dominance=round(language_dominance, 2),
                overall=overall,
            ),
            explanations=explanations,
            highlighted_text=highlighted_spans,
            language_detected=language,
            confidence=0.80,
            model_version="mock/rule-based-v2",
            alternative_text=self._generate_alternative_text(content, highlighted_spans),
        )

        logger.info(
            f"✅ Mock AI completed: overall={overall:.2f}, spans={len(highlighted_spans)}"
        )
        return result

    def _detect_pattern_bias(
        self, text: str, patterns: dict, bias_type: str
    ):
        """Detect bias patterns and return (spans, score)."""
        spans = []
        text_lower = text.lower()
        sorted_patterns = sorted(patterns.keys(), key=len, reverse=True)
        claimed = set()

        for phrase in sorted_patterns:
            suggestion = patterns[phrase]
            pattern = re.compile(r"\b" + re.escape(phrase) + r"\b", re.IGNORECASE)
            for match in pattern.finditer(text_lower):
                positions = set(range(match.start(), match.end()))
                if positions & claimed:
                    continue
                claimed |= positions
                matched_text = text[match.start(): match.end()]
                spans.append(
                    HighlightedSpan(
                        span=[match.start(), match.end()],
                        text=matched_text,
                        bias_type=bias_type,
                        severity="medium",
                        contribution_score=0.15,
                        suggestion=suggestion,
                    )
                )

        score = round(min(1.0, len(spans) * 0.25), 2)
        return spans, score

    def _explain_score(self, label: str, score: float) -> str:
        if score < 0.2:
            return f"Minimal {label} detected."
        elif score < 0.5:
            return f"Moderate {label} detected. Some problematic patterns present."
        elif score < 0.75:
            return f"Significant {label} detected. Multiple problematic patterns found."
        else:
            return f"High {label} detected. Pervasive problematic language throughout."

    def _generate_alternative_text(
        self, content: str, spans: List[HighlightedSpan]
    ) -> str:
        return generate_alternative_text(content, spans)
        """
        if not spans:
            return content
        sorted_spans = sorted(spans, key=lambda s: s.span[0], reverse=True)
        result = content
        for span in sorted_spans:
            if not span.suggestion:
                continue
            start, end = span.span[0], span.span[1]
            if start < 0 or end > len(result) or start >= end:
                continue
            original = result[start:end]
            replacement = span.suggestion
            if original and original[0].isupper():
                replacement = replacement[0].upper() + replacement[1:]
            result = result[:start] + replacement + result[end:]

        # Fix article grammar: "an [consonant]" → "a [consonant]"
        import re as _re
        result = _re.sub(
            r'\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])',
            lambda m: 'a ' + m.group(1),
            result
        )
        return result
        """
