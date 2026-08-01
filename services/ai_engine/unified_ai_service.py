"""
Unified AI Service with automatic fallback chain.
Tries Gemini first, falls back to Groq, then to Mock service.
"""

import logging
from typing import Optional
from schemas.ai_schema import AIAnalysisResult
from backend.config import settings

logger = logging.getLogger(__name__)


def _safe_error_summary(error: Exception) -> str:
    response = getattr(error, "response", None)
    if response is not None:
        return f"{type(error).__name__} status={response.status_code}"
    return f"{type(error).__name__}: {error}"


class UnifiedAIService:
    """
    Unified AI service with intelligent fallback chain:
    1. Gemini (primary) — most accurate
    2. Groq  (fallback) — fast and reliable
    3. Mock  (last resort) — always available
    """

    def __init__(self):
        self.gemini_service = None
        self.groq_service = None
        self.mock_service = None
        self._initialize_services()
        logger.info(f"🤖 Unified AI Service ready: {self._get_available_services()}")

    def _initialize_services(self):
        # Gemini
        try:
            from services.ai_engine.gemini_ai_service import GeminiAIService
            if settings.GEMINI_API_KEY.strip():
                self.gemini_service = GeminiAIService()
                logger.info("✅ Gemini AI service available")
        except Exception as e:
            logger.warning(f"⚠️  Gemini unavailable: {e}")

        # Groq
        try:
            from services.ai_engine.groq_ai_service import GroqAIService
            if settings.GROQ_API_KEY.strip():
                self.groq_service = GroqAIService()
                logger.info("✅ Groq AI service available")
        except Exception as e:
            logger.warning(f"⚠️  Groq unavailable: {e}")

        # Mock (always available)
        try:
            from services.ai_engine.mock_ai_service import MockAIService
            self.mock_service = MockAIService()
            logger.info("✅ Mock AI service available (fallback)")
        except Exception as e:
            logger.error(f"❌ Mock AI service failed: {e}")

    def _get_available_services(self) -> str:
        services = []
        if self.gemini_service:
            services.append("Gemini")
        if self.groq_service:
            services.append("Groq")
        if self.mock_service:
            services.append("Mock")
        return " → ".join(services) if services else "None"

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None,
    ) -> AIAnalysisResult:
        """
        Analyze text for bias using the best available AI service.
        Fallback chain: Gemini → Groq → Mock
        """
        # Try Gemini first
        if self.gemini_service:
            try:
                logger.info(f"🎯 Using Gemini for {analysis_id}")
                return await self.gemini_service.analyze_bias(content, analysis_id, language)
            except Exception as e:
                logger.warning(f"⚠️  Gemini failed, trying Groq: {_safe_error_summary(e)}")

        # Try Groq as fallback
        if self.groq_service:
            try:
                logger.info(f"🎯 Using Groq for {analysis_id}")
                return await self.groq_service.analyze_bias(content, analysis_id, language)
            except Exception as e:
                logger.warning(f"⚠️  Groq failed, using Mock: {_safe_error_summary(e)}")

        # Mock as last resort
        if self.mock_service:
            logger.info(f"🎯 Using Mock AI for {analysis_id}")
            return await self.mock_service.analyze_bias(content, analysis_id, language)

        raise RuntimeError("No AI service available")

    def get_active_model(self) -> str:
        if self.gemini_service:
            return f"gemini/{settings.GEMINI_MODEL}"
        elif self.groq_service:
            return f"groq/{settings.GROQ_MODEL}"
        elif self.mock_service:
            return "mock/rule-based"
        return "none"
