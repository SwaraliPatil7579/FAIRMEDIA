"""
Adapter for the Fairness Engine.
Calls FairnessEngine directly (no separate microservice needed).
"""

from typing import Optional, Dict
from schemas.ai_schema import BiasScores
from schemas.fairness_schema import FairnessResult
import logging

logger = logging.getLogger(__name__)


class FairnessAdapter:
    """
    Adapter that calls the Fairness Engine directly.
    """

    def __init__(self):
        logger.info("⚖️  Fairness Adapter initialized")

    async def calculate_fairness(
        self,
        bias_scores: BiasScores,
        content: str,
        analysis_id: str,
        metadata: Optional[Dict] = None,
    ) -> FairnessResult:
        """
        Calculate fairness metrics and recommendations.

        Args:
            bias_scores: Bias scores from AI service
            content: Original text content
            analysis_id: Unique identifier
            metadata: Optional additional metadata

        Returns:
            FairnessResult with risk level and recommendations
        """
        logger.info(f"⚖️  Fairness Adapter: Calculating fairness for {analysis_id}")

        from services.fairness_engine.fairness_engine import FairnessEngine

        engine = FairnessEngine()
        result = await engine.calculate_fairness(
            bias_scores, content, analysis_id, metadata
        )

        logger.info(
            f"✅ Fairness completed for {analysis_id}: "
            f"risk={result.risk_level}, score={result.fairness_score:.2f}"
        )
        return result
