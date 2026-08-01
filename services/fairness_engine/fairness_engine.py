"""
Fairness Engine — calculates risk, fairness score, and mitigation recommendations.
Supports all 7 bias categories.
"""

from typing import Dict, Optional
from schemas.ai_schema import BiasScores
from schemas.fairness_schema import FairnessResult, MitigationWeights
from services.fairness_engine.mitigation_utils import (
    calculate_weight_adjustment,
    generate_recommendations,
    calculate_fairness_score,
    determine_risk_level,
    calculate_detailed_metrics,
)
from services.fairness_engine.risk_engine import calculate_risk
import logging

logger = logging.getLogger(__name__)


class FairnessEngine:
    """
    Main fairness engine that calculates risk and generates mitigation strategies.
    """

    def __init__(self):
        logger.info("⚖️  Fairness Engine initialized")

    async def calculate_fairness(
        self,
        bias_scores: BiasScores,
        content: str,
        analysis_id: str,
        metadata: Optional[Dict] = None,
    ) -> FairnessResult:
        """
        Calculate fairness metrics and generate recommendations.

        Args:
            bias_scores: Bias scores from AI service
            content: Original text content
            analysis_id: Unique identifier
            metadata: Optional additional metadata

        Returns:
            FairnessResult with risk level and recommendations
        """
        logger.info(f"⚖️  Calculating fairness for {analysis_id}")

        # Build full bias dict including all 7 categories
        bias_dict = {
            "gender_bias": bias_scores.gender_bias,
            "stereotype": bias_scores.stereotype,
            "age_bias": bias_scores.age_bias or 0.0,
            "disability_bias": bias_scores.disability_bias or 0.0,
            "religious_bias": bias_scores.religious_bias or 0.0,
            "socioeconomic_bias": bias_scores.socioeconomic_bias or 0.0,
            "racial_ethnic_bias": bias_scores.racial_ethnic_bias or 0.0,
            "caste_bias": bias_scores.caste_bias or 0.0,
            "body_bias": bias_scores.body_bias or 0.0,
            "nationality_bias": bias_scores.nationality_bias or 0.0,
            "language_dominance": bias_scores.language_dominance,
            "overall": bias_scores.overall,
        }

        risk_level = determine_risk_level(bias_scores.overall)
        risk_details = calculate_risk(bias_scores.overall)
        fairness_score = calculate_fairness_score(bias_dict)
        recommendations = generate_recommendations(bias_dict, risk_level)

        adjusted_weight, adjustment_factor, rationale = calculate_weight_adjustment(
            bias_scores.overall, risk_level
        )

        detailed_metrics = calculate_detailed_metrics(bias_dict)

        result = FairnessResult(
            risk_level=risk_level,
            fairness_score=fairness_score,
            recommendations=recommendations,
            mitigation_weights=MitigationWeights(
                original_weight=1.0,
                adjusted_weight=adjusted_weight,
                adjustment_factor=adjustment_factor,
                rationale=rationale,
            ),
            detailed_metrics=detailed_metrics,
            engine_version="fairness-v3.0.0",
        )

        logger.info(
            f"✅ Fairness calculated: risk={risk_level}, "
            f"score={fairness_score:.2f}, "
            f"recommendations={len(recommendations)}"
        )
        return result
