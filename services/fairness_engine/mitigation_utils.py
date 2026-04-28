"""
Mitigation utilities for bias adjustment and weight calculations.
"""

from typing import Dict, List, Tuple, Any
import logging
import re
import sys
import os

logger = logging.getLogger(__name__)

# ── Master bias replacement dictionary ────────────────────────────────────
# Copied directly from ai_service.py so no import is needed.
# Sorted longest-first at runtime to prevent short words corrupting
# longer phrases (e.g. "man" inside "man of the house").

_BIAS_REPLACEMENTS: Dict[str, str] = {
    # Male stereotypes
    "man up": "be courageous",
    "boys don't cry": "it's okay to express emotions",
    "boys will be boys": "children should be held to equal standards",
    "be a man": "be strong",
    "man of the house": "head of household",
    "man's job": "anyone's job",
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
    "real men": "people",
    "aggressive": "assertive",
    "bossy": "decisive",
    "dominant": "leading",
    "authoritative": "knowledgeable",
    "stubborn": "persistent",
    # Female stereotypes
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
    "housewife": "homemaker",
    "old maid": "unmarried person",
    "tomboy": "active child",
    "emotional": "expressive",
    "hysterical": "upset",
    "nurturing": "caring",
    "ditzy": "thoughtful",
    "nagging": "persistent",
    "catfight": "disagreement",
    # Role phrases
    "women belong in the kitchen": "people can work in any field",
    "women belong in supportive positions": "people can work in any role",
    "natural leaders": "capable leaders",
    "natural leader": "capable leader",
    "breadwinners": "providers",
    "breadwinner": "provider",
    "built for high-pressure": "suited for demanding",
    "supportive positions": "various roles",
    "crumble under stress": "struggle under pressure",
    "prioritize family over deadlines": "balance personal and professional priorities",
    "men are better at": "individuals vary in their abilities with",
    "women are too emotional": "all people experience emotions",
    "men are naturally": "individuals can be naturally",
    "women are naturally": "individuals can be naturally",
    "girls should": "all people should",
    "woman's place": "anyone's place",
    # Hindi bias terms
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

# Pronoun neutralisation map
_PRONOUN_NEUTRAL: Dict[str, str] = {
    "he": "they", "him": "them", "his": "their", "himself": "themselves",
    "she": "they", "her": "them", "hers": "theirs", "herself": "themselves",
}

def calculate_weight_adjustment(
    bias_score: float,
    risk_level: str,
    min_weight: float = 0.1,
    max_weight: float = 1.0
) -> Tuple[float, float, str]:
    """
    Calculate weight adjustment based on bias score and risk level.

    Args:
        bias_score: Overall bias score (0-1)
        risk_level: Risk level (low, medium, high, critical)
        min_weight: Minimum allowed weight
        max_weight: Maximum allowed weight

    Returns:
        Tuple of (adjusted_weight, adjustment_factor, rationale)
    """
    # Risk level multipliers
    risk_multipliers = {
        "low": 0.1,
        "medium": 0.3,
        "high": 0.5,
        "critical": 0.7,
    }

    multiplier = risk_multipliers.get(risk_level, 0.3)

    # Calculate adjustment factor
    adjustment_factor = min(1.0, bias_score * multiplier)

    # Calculate adjusted weight
    adjusted_weight = max(min_weight, max_weight - adjustment_factor)

    # Generate rationale
    rationale = (
        f"Weight adjusted from {max_weight} to {adjusted_weight:.2f} "
        f"due to {risk_level} risk level (bias score: {bias_score:.2f})"
    )

    logger.info(
        f"Weight adjustment: {max_weight} → {adjusted_weight:.2f} ({risk_level})"
    )

    return adjusted_weight, adjustment_factor, rationale


def generate_recommendations(
    bias_scores: Dict[str, float],
    risk_level: str
) -> List[str]:
    """
    Generate actionable recommendations based on bias analysis.

    Args:
        bias_scores: Dictionary of bias type to score
        risk_level: Overall risk level

    Returns:
        List of recommendation strings
    """
    recommendations: List[str] = []

    # Gender bias recommendations
    if bias_scores.get("gender_bias", 0) > 0.3:
        recommendations.extend(
            [
                "Use gender-neutral language (e.g., 'they' instead of 'he/she')",
                "Replace gendered job titles with neutral alternatives (e.g., 'chairperson' instead of 'chairman')",
                "Ensure balanced representation of all genders in examples",
            ]
        )

    # Stereotype recommendations
    if bias_scores.get("stereotype", 0) > 0.3:
        recommendations.extend(
            [
                "Avoid stereotypical associations between groups and characteristics",
                "Include diverse perspectives and counter-stereotypical examples",
                "Review language for implicit assumptions about groups",
            ]
        )

    # Language dominance recommendations
    if bias_scores.get("language_dominance", 0) > 0.3:
        recommendations.extend(
            [
                "Use culturally inclusive language and examples",
                "Avoid English-centric or Western-centric assumptions",
                "Consider multilingual and multicultural perspectives",
            ]
        )

    # Risk-specific recommendations
    if risk_level in ["high", "critical"]:
        recommendations.insert(
            0,
            "⚠️ HIGH PRIORITY: This content requires immediate review and revision",
        )
        recommendations.append(
            "Consider having content reviewed by a diverse group of stakeholders"
        )

    # Limit to top recommendations
    return recommendations[:6]


def calculate_fairness_score(bias_scores: Dict[str, float]) -> float:
    """
    Calculate overall fairness score from bias scores.
    Fairness is the inverse of bias.

    Args:
        bias_scores: Dictionary of bias type to score

    Returns:
        Fairness score (0-1, higher is better)
    """
    overall_bias = bias_scores.get("overall", 0.5)
    fairness = 1.0 - overall_bias
    return round(fairness, 2)


def determine_risk_level(bias_score: float) -> str:
    """
    Determine risk level from bias score.

    Args:
        bias_score: Overall bias score (0-1)

    Returns:
        Risk level string
    """
    if bias_score < 0.25:
        return "low"
    elif bias_score < 0.5:
        return "medium"
    elif bias_score < 0.75:
        return "high"
    else:
        return "critical"


def calculate_detailed_metrics(bias_scores: Dict[str, float]) -> Dict[str, float]:
    """
    Calculate detailed fairness metrics for each bias type.

    Args:
        bias_scores: Dictionary of bias type to score

    Returns:
        Dictionary of detailed fairness metrics
    """
    return {
        "gender_fairness": round(1.0 - bias_scores.get("gender_bias", 0), 2),
        "stereotype_fairness": round(1.0 - bias_scores.get("stereotype", 0), 2),
        "language_fairness": round(
            1.0 - bias_scores.get("language_dominance", 0), 2
        ),
        "overall_fairness": round(1.0 - bias_scores.get("overall", 0), 2),
    }


# ----------------------------------------------------------------------
# Generic span-based text rewriting for debiasing
# ----------------------------------------------------------------------


def _split_into_sentences(text: str) -> List[str]:
    """
    Simple sentence splitter that keeps punctuation.
    """
    if not text:
        return []

    parts = re.split(r"([.!?])", text)
    sentences: List[str] = []

    for i in range(0, len(parts) - 1, 2):
        sent = (parts[i] + parts[i + 1]).strip()
        if sent:
            sentences.append(sent)

    # Handle trailing text without punctuation
    if len(parts) % 2 == 1 and parts[-1].strip():
        sentences.append(parts[-1].strip())

    return sentences


def rewrite_biased_text(
    original_text: str,
    highlighted_spans: List[Any],
    overall_bias: float,
) -> str:
    """
    Creates a bias-free alternative version of the text.
    Uses _BIAS_REPLACEMENTS dictionary directly — no imports needed.
    """

    if not original_text or not original_text.strip():
        return original_text

    if overall_bias < 0.15:
        return original_text

    result = original_text

    # Phase 1: Apply all known replacements, longest phrase first
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

    # Phase 2: Also apply whatever spans were passed in
    for span in highlighted_spans:
        phrase = getattr(span, "text", None)
        if phrase is None and isinstance(span, dict):
            phrase = span.get("text")
        suggestion = getattr(span, "suggestion", None)
        if suggestion is None and isinstance(span, dict):
            suggestion = span.get("suggestion")
        if phrase and suggestion:
            result = re.sub(re.escape(phrase), suggestion, result, flags=re.IGNORECASE)

    # Phase 3: Rebalance pronouns if one gender dominates
    male_count   = len(re.findall(r'\b(he|him|his|himself)\b',   result, re.IGNORECASE))
    female_count = len(re.findall(r'\b(she|her|hers|herself)\b', result, re.IGNORECASE))

    if male_count > female_count * 3 and male_count > 2:
        _counter = [0]
        def _neutral_m(m):
            _counter[0] += 1
            if _counter[0] % 2 == 0:
                return _PRONOUN_NEUTRAL.get(m.group().lower(), m.group())
            return m.group()
        result = re.sub(r'\b(he|him|his|himself)\b', _neutral_m, result, flags=re.IGNORECASE)

    elif female_count > male_count * 3 and female_count > 2:
        _counter = [0]
        def _neutral_f(m):
            _counter[0] += 1
            if _counter[0] % 2 == 0:
                return _PRONOUN_NEUTRAL.get(m.group().lower(), m.group())
            return m.group()
        result = re.sub(r'\b(she|her|hers|herself)\b', _neutral_f, result, flags=re.IGNORECASE)

    return result
