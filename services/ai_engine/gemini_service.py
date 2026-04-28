"""
Google Gemini AI Service for bias detection.
Uses the new google-genai SDK (google.genai) with Gemini 2.0 Flash.

Setup (2 minutes):
  1. Go to https://aistudio.google.com
  2. Sign in with any Google/Gmail account
  3. Click "Get API Key" -> Create API Key
  4. Add to .env: GEMINI_API_KEY=your_key_here

Free tier: 15 requests/min, 1500 requests/day.
"""

import json
import re
import logging
from typing import Optional
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.0-flash-lite"

BIAS_PROMPT = """You are an expert AI bias detection system. Analyze the following text for:
1. Gender bias (gendered pronouns, stereotypical roles, gendered job titles)
2. Stereotypes (assumptions based on gender, culture, or background)
3. Language dominance bias (English-centric or culturally exclusive language)

Also support Hindi and mixed Hindi-English (Hinglish) text.

Text to analyze:
\"\"\"
{text}
\"\"\"

Respond ONLY with a valid JSON object — no markdown, no explanation outside JSON:
{{
  "gender_bias_score": <float 0.0-1.0>,
  "stereotype_score": <float 0.0-1.0>,
  "language_dominance_score": <float 0.0-1.0>,
  "overall_score": <float 0.0-1.0>,
  "language_detected": "<en|hi|mixed>",
  "confidence": <float 0.0-1.0>,
  "gender_bias_explanation": "<clear explanation>",
  "stereotype_explanation": "<clear explanation>",
  "language_dominance_explanation": "<clear explanation>",
  "biased_terms": [
    {{
      "text": "<exact biased word or phrase from the input>",
      "bias_type": "<gender_bias|stereotype|language_dominance>",
      "severity": "<low|medium|high>",
      "suggestion": "<neutral alternative>"
    }}
  ]
}}

Scoring guide: 0.0-0.2 minimal, 0.2-0.5 moderate, 0.5-0.8 significant, 0.8-1.0 severe bias."""


class GeminiAIService:
    """
    Bias detection powered by Google Gemini 2.0 Flash (AI Studio).
    No Google Cloud account required — just a free API key from aistudio.google.com.
    """

    def __init__(self, api_key: str):
        try:
            from google import genai
            self.client = genai.Client(api_key=api_key)
            self.available = True
            logger.info(f"✅ Google Gemini Service initialized: {GEMINI_MODEL}")
        except ImportError:
            logger.error("❌ google-genai not installed. Run: pip install google-genai")
            self.available = False
        except Exception as e:
            logger.error(f"❌ Gemini init failed: {e}")
            self.available = False

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None
    ) -> AIAnalysisResult:
        if not self.available:
            raise RuntimeError("Gemini service not available")

        logger.info(f"🤖 Gemini analyzing: {analysis_id}")

        from google import genai
        from google.genai import types

        prompt = BIAS_PROMPT.format(text=content[:4000])

        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=1024,
                )
            )
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                logger.warning("⚠️ Gemini rate limit hit — falling back to mock for this request")
                raise RuntimeError(f"RATE_LIMIT: {err_str}")
            raise

        raw = response.text.strip()
        data = self._parse_response(raw)

        # Build highlighted spans by finding biased terms in original text
        highlighted_spans = []
        for term in data.get("biased_terms", []):
            phrase = term.get("text", "")
            if not phrase:
                continue
            match = re.search(re.escape(phrase), content, re.IGNORECASE)
            if match:
                highlighted_spans.append(HighlightedSpan(
                    span=[match.start(), match.end()],
                    text=content[match.start():match.end()],
                    bias_type=term.get("bias_type", "gender_bias"),
                    severity=term.get("severity", "medium"),
                    contribution_score=0.15,
                    suggestion=term.get("suggestion", "")
                ))

        result = AIAnalysisResult(
            bias_scores=BiasScores(
                gender_bias=round(min(1.0, float(data.get("gender_bias_score", 0.0))), 2),
                stereotype=round(min(1.0, float(data.get("stereotype_score", 0.0))), 2),
                language_dominance=round(min(1.0, float(data.get("language_dominance_score", 0.0))), 2),
                overall=round(min(1.0, float(data.get("overall_score", 0.0))), 2),
            ),
            explanations={
                "gender_bias": data.get("gender_bias_explanation", "Analysis completed."),
                "stereotype": data.get("stereotype_explanation", "Analysis completed."),
                "language_dominance": data.get("language_dominance_explanation", "Analysis completed."),
            },
            highlighted_text=highlighted_spans,
            language_detected=data.get("language_detected", language or "en"),
            confidence=round(min(1.0, float(data.get("confidence", 0.9))), 2),
            model_version=f"google/{GEMINI_MODEL}",
        )

        logger.info(
            f"✅ Gemini done [{analysis_id}]: overall={result.bias_scores.overall}, "
            f"terms={len(highlighted_spans)}, lang={result.language_detected}"
        )
        return result

    def _parse_response(self, raw: str) -> dict:
        """Parse JSON from Gemini response, stripping markdown fences if present."""
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            logger.warning(f"⚠️ Could not parse Gemini response. Raw: {raw[:300]}")
            return {}
