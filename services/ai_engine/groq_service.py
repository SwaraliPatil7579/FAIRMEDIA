"""
Groq AI Service for bias detection.
Uses LLaMA 3 via Groq's free API — extremely fast inference.
Get a free key at: https://console.groq.com
"""

import json
import re
import logging
from typing import Optional
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan

logger = logging.getLogger(__name__)

GROQ_MODEL = "llama-3.3-70b-versatile"

BIAS_PROMPT = """You are an expert bias detection AI. Analyze the following text for gender bias, stereotypes, and language dominance bias. Also support Hindi and mixed Hindi-English text.

Text to analyze:
\"\"\"
{text}
\"\"\"

Respond ONLY with a valid JSON object (no markdown, no extra text). Keep all explanation strings under 100 characters:
{{
  "gender_bias_score": <float 0.0-1.0>,
  "stereotype_score": <float 0.0-1.0>,
  "language_dominance_score": <float 0.0-1.0>,
  "overall_score": <float 0.0-1.0>,
  "language_detected": "<en|hi|mixed>",
  "confidence": <float 0.0-1.0>,
  "gender_bias_explanation": "<max 100 chars>",
  "stereotype_explanation": "<max 100 chars>",
  "language_dominance_explanation": "<max 100 chars>",
  "biased_terms": [
    {{
      "text": "<exact biased word or phrase>",
      "bias_type": "<gender_bias|stereotype|language_dominance>",
      "severity": "<low|medium|high>",
      "suggestion": "<neutral alternative>"
    }}
  ]
}}

Scoring: 0.0-0.2 minimal, 0.2-0.5 moderate, 0.5-0.8 significant, 0.8-1.0 severe bias."""


class GroqAIService:
    """
    Bias detection using LLaMA 3 via Groq API.
    Free tier: ~14,400 requests/day at very high speed.
    """

    def __init__(self, api_key: str):
        try:
            from groq import Groq
            self.client = Groq(api_key=api_key)
            self.available = True
            logger.info(f"✅ Groq AI Service initialized: {GROQ_MODEL}")
        except ImportError:
            logger.error("❌ groq package not installed. Run: pip install groq")
            self.available = False
        except Exception as e:
            logger.error(f"❌ Groq init failed: {e}")
            self.available = False

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None
    ) -> AIAnalysisResult:
        if not self.available:
            raise RuntimeError("Groq service not available")

        logger.info(f"🤖 Groq analyzing: {analysis_id}")

        prompt = BIAS_PROMPT.format(text=content[:3000])

        try:
            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2048,
            )
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate_limit" in err_str.lower():
                raise RuntimeError(f"RATE_LIMIT: {err_str}")
            raise

        raw = response.choices[0].message.content.strip()
        data = self._parse_response(raw)

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
            model_version=f"groq/{GROQ_MODEL}",
        )

        logger.info(
            f"✅ Groq done [{analysis_id}]: overall={result.bias_scores.overall}, "
            f"terms={len(highlighted_spans)}"
        )
        return result

    def _parse_response(self, raw: str) -> dict:
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

        # Try full parse first
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON object (handles truncated responses)
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Partial parse — extract individual fields with regex as last resort
        logger.warning(f"⚠️ Groq response truncated, extracting fields manually")
        result = {}
        for field in ["gender_bias_score", "stereotype_score", "language_dominance_score", "overall_score", "confidence"]:
            m = re.search(rf'"{field}":\s*([\d.]+)', cleaned)
            if m:
                result[field] = float(m.group(1))
        for field in ["language_detected"]:
            m = re.search(rf'"{field}":\s*"([^"]+)"', cleaned)
            if m:
                result[field] = m.group(1)
        for field in ["gender_bias_explanation", "stereotype_explanation", "language_dominance_explanation"]:
            m = re.search(rf'"{field}":\s*"([^"]*)"', cleaned)
            if m:
                result[field] = m.group(1)
        # biased_terms: try to extract array
        terms_match = re.search(r'"biased_terms"\s*:\s*(\[.*?\])', cleaned, re.DOTALL)
        if terms_match:
            try:
                result["biased_terms"] = json.loads(terms_match.group(1))
            except Exception:
                result["biased_terms"] = []
        return result
