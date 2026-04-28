"""
AI Service Wrapper
Bulletproof fallback chain: Google Gemini → Groq (LLaMA 3) → MockAIService

- Tries each provider in order, per request
- If Gemini fails (quota, error) → auto-switches to Groq
- If Groq fails → falls back to MockAIService (rule-based, always works)
- User never sees an error

Keys in .env:
  GEMINI_API_KEY  — https://aistudio.google.com  (Google AI, free)
  GROQ_API_KEY    — https://console.groq.com      (LLaMA 3, free, fast)
"""

import logging
from typing import Optional
from schemas.ai_schema import AIAnalysisResult
from services.ai_engine.mock_ai_service import MockAIService

logger = logging.getLogger(__name__)


def _get_keys():
    """Read API keys from pydantic settings (which loads .env reliably)."""
    try:
        from backend.config import settings
        return settings.GEMINI_API_KEY.strip(), settings.GROQ_API_KEY.strip()
    except Exception:
        import os
        return os.getenv("GEMINI_API_KEY", "").strip(), os.getenv("GROQ_API_KEY", "").strip()


def _try_gemini(api_key: str):
    try:
        from services.ai_engine.gemini_service import GeminiAIService
        svc = GeminiAIService(api_key=api_key)
        return svc if svc.available else None
    except Exception as e:
        logger.warning(f"⚠️ Gemini init failed: {e}")
        return None


def _try_groq(api_key: str):
    try:
        from services.ai_engine.groq_service import GroqAIService
        svc = GroqAIService(api_key=api_key)
        return svc if svc.available else None
    except Exception as e:
        logger.warning(f"⚠️ Groq init failed: {e}")
        return None


class AIService:
    """
    Unified AI Service with automatic fallback chain.
    Gemini → Groq → Mock — per request, seamlessly.
    """

    def __init__(self, use_mock: bool = False):
        self._gemini = None
        self._groq = None
        self._mock = MockAIService()

        if not use_mock:
            gemini_key, groq_key = _get_keys()

            if gemini_key:
                self._gemini = _try_gemini(gemini_key)
            if groq_key:
                self._groq = _try_groq(groq_key)

        available = []
        if self._gemini:
            available.append("Gemini ✅")
        if self._groq:
            available.append("Groq ✅")
        available.append("Mock ✅")
        logger.info(f"🤖 AIService chain: {' → '.join(available)}")

    @property
    def current_model(self) -> str:
        if self._gemini:
            return "gemini"
        if self._groq:
            return "groq"
        return "mock"

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None
    ) -> AIAnalysisResult:
        """
        Analyze bias with automatic per-request fallback.
        Tries Gemini → Groq → Mock in order until one succeeds.
        """
        # 1. Try Gemini
        if self._gemini:
            try:
                result = await self._gemini.analyze_bias(content, analysis_id, language)
                logger.info(f"✅ [{analysis_id}] served by Gemini")
                return result
            except Exception as e:
                err = str(e)
                if "RATE_LIMIT" in err or "429" in err or "quota" in err.lower():
                    logger.warning(f"⚠️ [{analysis_id}] Gemini quota → trying Groq")
                else:
                    logger.warning(f"⚠️ [{analysis_id}] Gemini error → trying Groq: {err[:120]}")

        # 2. Try Groq
        if self._groq:
            try:
                result = await self._groq.analyze_bias(content, analysis_id, language)
                logger.info(f"✅ [{analysis_id}] served by Groq")
                return result
            except Exception as e:
                err = str(e)
                if "RATE_LIMIT" in err or "429" in err:
                    logger.warning(f"⚠️ [{analysis_id}] Groq rate limited → using Mock")
                else:
                    logger.warning(f"⚠️ [{analysis_id}] Groq error → using Mock: {err[:120]}")

        # 3. Mock — always works
        logger.info(f"🤖 [{analysis_id}] served by MockAIService")
        return await self._mock.analyze_bias(content, analysis_id, language)

    async def health_check(self) -> bool:
        return True
