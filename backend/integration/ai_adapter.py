"""
Adapter for AI Service.
Routes all bias detection through Unified AI Service with automatic fallback:
Gemini → Groq → Mock
"""

import os
from typing import Optional
from schemas.ai_schema import AIAnalysisResult
import logging

logger = logging.getLogger(__name__)


class AIAdapter:
    """
    Central adapter for AI bias detection.
    Uses Unified AI Service with intelligent fallback chain.
    """

    def __init__(self):
        from services.ai_engine.unified_ai_service import UnifiedAIService
        self.ai_service = UnifiedAIService()
        logger.info(f"🤖 AI Adapter initialized — model: {self.ai_service.get_active_model()}")

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None
    ) -> AIAnalysisResult:
        """
        Analyze content for bias using the best available AI model.

        Args:
            content: Text to analyze
            analysis_id: Unique identifier for this analysis
            language: Optional language hint (ISO 639-1 code)

        Returns:
            AIAnalysisResult with bias scores, explanations, and highlighted spans
        """
        logger.info(
            f"🤖 AI Adapter: Analyzing [{analysis_id}] "
            f"via {self.ai_service.get_active_model()} "
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

    @property
    def active_model(self) -> str:
        return self.ai_service.get_active_model()
