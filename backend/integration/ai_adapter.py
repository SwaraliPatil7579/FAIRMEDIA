"""
Adapter for AI Service.
Routes all bias detection through Google Gemini (AI Studio) with
automatic fallback to rule-based MockAIService if key is unavailable.
"""

import os
from typing import Optional
from schemas.ai_schema import AIAnalysisResult
import logging

logger = logging.getLogger(__name__)


class AIAdapter:
    """
    Central adapter for AI bias detection.
    Uses Google Gemini when GEMINI_API_KEY is set, otherwise falls back to mock.
    """

    def __init__(self):
        from services.ai_engine.ai_service_wrapper import AIService
        self.ai_service = AIService()
        logger.info(f"🤖 AI Adapter initialized — model: {self.ai_service.current_model}")

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None
    ) -> AIAnalysisResult:
        """
        Analyze content for bias using the configured AI model.

        Args:
            content: Text to analyze
            analysis_id: Unique identifier for this analysis
            language: Optional language hint (ISO 639-1 code)

        Returns:
            AIAnalysisResult with bias scores, explanations, and highlighted spans
        """
        logger.info(
            f"🤖 AI Adapter: Analyzing [{analysis_id}] "
            f"via {self.ai_service.current_model} "
            f"({len(content)} chars)"
        )

        result = await self.ai_service.analyze_bias(content, analysis_id, language)

        logger.info(
            f"✅ AI Adapter done [{analysis_id}]: "
            f"overall={result.bias_scores.overall:.2f}, "
            f"model={result.model_version}, "
            f"spans={len(result.highlighted_text)}"
        )
        return result

    async def health_check(self) -> bool:
        """Check if the AI service is healthy."""
        try:
            return await self.ai_service.health_check()
        except Exception as e:
            logger.warning(f"⚠️ AI health check failed: {e}")
            return False

    @property
    def active_model(self) -> str:
        return self.ai_service.current_model
