import pytest

from schemas.request_schema import AnalyzeRequest
from services.ai_engine.enhanced_bias_detector import EnhancedBiasDetector
from services.ai_engine.mock_ai_service import MockAIService
from services.ai_engine.rewrite_utils import generate_alternative_text
from services.fairness_engine.fairness_engine import FairnessEngine
from schemas.ai_schema import HighlightedSpan


def test_request_content_is_trimmed_and_coerced():
    request = AnalyzeRequest(content=123, language="EN")

    assert request.content == "123"
    assert request.language == "en"


def test_enhanced_detector_finds_workplace_and_gender_bias():
    detector = EnhancedBiasDetector()

    result = detector.analyze(
        "The chairman wants young, hungry coders without family distractions."
    )

    phrases = {item["phrase"].lower() for item in result["all_biased_terms"]}
    assert "chairman" in phrases
    assert "young, hungry coders" in phrases
    assert result["combined_bias_score"] > 0


def test_enhanced_detector_handles_devanagari_and_code_switching():
    detector = EnhancedBiasDetector()

    result = detector.analyze(
        "लड़के रोते नहीं हैं. Auratein tough decisions nahi le sakti."
    )

    phrases = {item["phrase"].lower() for item in result["all_biased_terms"]}
    assert "लड़के रोते नहीं हैं" in phrases
    assert "auratein tough decisions nahi le sakti" in phrases
    assert result["total_issues"] >= 2
    assert result["combined_bias_score"] > 0


def test_rewrite_uses_replacement_phrases_not_instructions():
    content = (
        "All Muslims are dangerous and typical Christians force their beliefs on others."
    )
    spans = [
        HighlightedSpan(
            span=[0, 25],
            text="All Muslims are dangerous",
            bias_type="religious_bias",
            severity="high",
            suggestion=(
                "Avoid blanket statements; describe specific behaviors without "
                "attributing them to an entire religious group."
            ),
        ),
        HighlightedSpan(
            span=[30, 78],
            text="typical Christians force their beliefs on others",
            bias_type="religious_bias",
            severity="high",
            suggestion=(
                "Use neutral language that does not ascribe a single action to "
                "all members of a religion."
            ),
        ),
    ]

    rewritten = generate_alternative_text(content, spans)

    assert "Avoid blanket" not in rewritten
    assert "Use neutral language" not in rewritten
    assert rewritten == (
        "Some individuals may cause harm and some individuals may force their "
        "beliefs on others."
    )


@pytest.mark.asyncio
async def test_mock_ai_covers_all_bias_categories():
    service = MockAIService()

    content = (
        "The wheelchair-bound employee suffers from anxiety. "
        "Poor people are lazy. All Muslims are dangerous. "
        "He is too old for this role. The chairman should man up."
    )
    result = await service.analyze_bias(
        content,
        "unit-test",
        "en",
    )

    scores = result.bias_scores
    assert scores.gender_bias > 0
    assert scores.age_bias > 0
    assert scores.disability_bias > 0
    assert scores.religious_bias > 0
    assert scores.socioeconomic_bias > 0
    assert scores.overall > 0.5
    assert len(result.highlighted_text) >= 5
    assert result.alternative_text != content


@pytest.mark.asyncio
async def test_mock_ai_detects_expanded_bias_categories():
    service = MockAIService()

    content = (
        "Asians are good at math. Tribal communities are backward. "
        "Fat people are lazy. Immigrants take jobs. Native English speakers only."
    )
    result = await service.analyze_bias(content, "expanded-categories", "en")

    scores = result.bias_scores
    assert scores.racial_ethnic_bias > 0
    assert scores.caste_bias > 0
    assert scores.body_bias > 0
    assert scores.nationality_bias > 0
    assert scores.language_dominance > 0
    assert len(result.highlighted_text) >= 5


@pytest.mark.asyncio
async def test_fairness_engine_returns_actionable_high_risk_result():
    service = MockAIService()
    ai_result = await service.analyze_bias(
        "The company needs a rockstar developer and young, hungry coders. "
        "Lady programmers should work long hours without family distractions.",
        "fairness-test",
        "en",
    )

    fairness = await FairnessEngine().calculate_fairness(
        ai_result.bias_scores,
        "sample",
        "fairness-test",
    )

    assert fairness.risk_level in {"high", "critical"}
    assert fairness.fairness_score < 0.5
    assert fairness.recommendations
