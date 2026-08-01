"""
Real AI Service using Google Gemini API.
Provides advanced bias detection using LLM-powered analysis.
Supports all 7 bias categories including age, disability, religion, socioeconomic.
"""

import json
import re
from typing import List, Dict, Optional
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan
from services.ai_engine.rewrite_utils import generate_alternative_text
import logging
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)


class GeminiAIService:
    """
    Real AI implementation using Google Gemini API.
    Provides advanced bias detection with LLM understanding.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip()
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set in settings")

        self.api_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_MODEL}:generateContent"
        )
        self.timeout = 45.0
        logger.info(f"🤖 Gemini AI Service initialized (model={settings.GEMINI_MODEL})")

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: str = None,
    ) -> AIAnalysisResult:
        """Analyze text for bias using Gemini AI (with retry on 429)."""
        import asyncio as _asyncio
        logger.info(f"🤖 Gemini AI analyzing: {analysis_id}")

        prompt = self._build_analysis_prompt(content, language)

        # Retry up to 3 times on rate-limit (429)
        last_err = None
        for attempt in range(3):
            try:
                response = await self._call_gemini_api(prompt)
                break
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    wait = 2 ** attempt  # 1s, 2s, 4s
                    logger.warning(f"⚠️  Gemini 429 rate-limit, retrying in {wait}s (attempt {attempt+1}/3)")
                    await _asyncio.sleep(wait)
                    last_err = e
                else:
                    raise
        else:
            raise last_err

        result = self._parse_gemini_response(response, content, language or "en")

        logger.info(
            f"✅ Gemini AI completed: overall_bias={result.bias_scores.overall:.2f}, "
            f"spans={len(result.highlighted_text)}"
        )
        return result

    def _build_analysis_prompt(self, content: str, language: Optional[str]) -> str:
        # Strip common bullet/list prefixes before analysis
        clean_content = re.sub(r'^[\s]*[\*\-•\d]+[\.\)]\s*', '', content, flags=re.MULTILINE)
        clean_content = re.sub(r'^[\s]*[\*\-•]\s*', '', clean_content, flags=re.MULTILINE).strip()

        return f"""You are an expert bias detection system. Analyze the following text for bias — even if it is a single short sentence.

IMPORTANT: Even a single sentence can contain bias. Always return a complete JSON response.

The text may contain mixed languages (English, Hindi, Hinglish, Marathi). Analyze ALL languages present.

Analyze for these 11 bias categories:
1. gender_bias: Gendered language, stereotypical gender roles, sexism (e.g. "girls are too emotional", "men should never cry", "lady programmers", "chairman")
2. stereotype: Stereotypical assumptions about any group — racial, ethnic, cultural, professional, body-based (e.g. "fat people are lazy", "asians are good at math", "introverts cannot manage")
3. age_bias: Ageist language (e.g. "elderly are slow", "young people are lazy", "too old for tech", "millennials are lazy")
4. disability_bias: Ableist language (e.g. "disabled cannot handle", "mental illness is weakness", "wheelchair-bound", "crazy", "lame")
5. religious_bias: Religious stereotypes or discrimination (e.g. "Christians force beliefs", "religious fanatic")
6. socioeconomic_bias: Class-based assumptions (e.g. "poor families should stop", "rich kids are spoiled", "people from villages are less educated")
7. language_dominance: Cultural/linguistic bias (e.g. "Hindi speakers are more patriotic", "tribal communities are backward")
8. racial_ethnic_bias: Race, ethnicity, accent, or origin stereotypes
9. caste_bias: Caste, tribe, or historically marginalized community bias
10. body_bias: Body size, appearance, beauty, or weight bias
11. nationality_bias: Nationality, immigrant, migrant, or foreign-worker bias

Text to analyze:
```
{clean_content}
```

Language hint: {language or "auto-detect"}

SCORING RULES:
- A single clearly biased sentence should score 0.7–0.95 overall
- A neutral sentence should score 0.0–0.15 overall
- Be consistent: similar bias patterns should get similar scores regardless of sentence length
- Short sentences are NOT less biased than long ones

SPAN RULES:
- Identify the EXACT biased phrase(s) in the text
- Every biased sentence must have at least one highlighted span
- Provide a concise neutral replacement phrase in "suggestion" for every span
- Do not put instructions like "avoid blanket statements" in "suggestion"

Return ONLY this exact JSON (no markdown, no extra text):
{{
  "bias_scores": {{
    "gender_bias": 0.0,
    "stereotype": 0.0,
    "age_bias": 0.0,
    "disability_bias": 0.0,
    "religious_bias": 0.0,
    "socioeconomic_bias": 0.0,
    "racial_ethnic_bias": 0.0,
    "caste_bias": 0.0,
    "body_bias": 0.0,
    "nationality_bias": 0.0,
    "language_dominance": 0.0,
    "overall": 0.0
  }},
  "explanations": {{
    "gender_bias": "specific explanation or 'Not detected'",
    "stereotype": "specific explanation or 'Not detected'",
    "age_bias": "specific explanation or 'Not detected'",
    "disability_bias": "specific explanation or 'Not detected'",
    "religious_bias": "specific explanation or 'Not detected'",
    "socioeconomic_bias": "specific explanation or 'Not detected'",
    "racial_ethnic_bias": "specific explanation or 'Not detected'",
    "caste_bias": "specific explanation or 'Not detected'",
    "body_bias": "specific explanation or 'Not detected'",
    "nationality_bias": "specific explanation or 'Not detected'",
    "language_dominance": "specific explanation or 'Not detected'"
  }},
  "highlighted_spans": [
    {{
      "text": "exact phrase from the text",
      "bias_type": "one of the 11 categories",
      "severity": "low|medium|high",
      "suggestion": "neutral alternative"
    }}
  ],
  "language_detected": "en",
  "confidence": 0.95
}}"""

    async def _call_gemini_api(self, prompt: str) -> Dict:
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 1,
                "topP": 0.95,
                "maxOutputTokens": 4096,
            },
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()

    def _parse_gemini_response(
        self, response: Dict, original_content: str, language: str
    ) -> AIAnalysisResult:
        try:
            text = response["candidates"][0]["content"]["parts"][0]["text"]
            # Strip markdown fences
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
            text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
            text = text.strip()

            data = json.loads(text)

            # Use the same cleaned content for span matching that the prompt used
            clean_content = re.sub(r'^[\s]*[\*\-•\d]+[\.\)]\s*', '', original_content, flags=re.MULTILINE)
            clean_content = re.sub(r'^[\s]*[\*\-•]\s*', '', clean_content, flags=re.MULTILINE).strip()

            # Build highlighted spans — find ALL occurrences in the text
            highlighted_spans = []
            seen_positions = set()

            for span_data in data.get("highlighted_spans", []):
                span_text = span_data.get("text", "").strip()
                if not span_text or len(span_text) < 2:
                    continue

                # Try matching against clean content first, then original
                for search_content in [clean_content, original_content]:
                    search_start = 0
                    lower_content = search_content.lower()
                    lower_span = span_text.lower()

                    while True:
                        idx = lower_content.find(lower_span, search_start)
                        if idx == -1:
                            break
                        end_idx = idx + len(span_text)

                        pos_key = (idx, end_idx)
                        if pos_key in seen_positions:
                            search_start = end_idx
                            continue
                        seen_positions.add(pos_key)

                        actual_text = search_content[idx:end_idx]
                        highlighted_spans.append(
                            HighlightedSpan(
                                span=[idx, end_idx],
                                text=actual_text,
                                bias_type=span_data.get("bias_type", "gender_bias"),
                                severity=span_data.get("severity", "medium"),
                                contribution_score=0.15,
                                suggestion=span_data.get("suggestion"),
                            )
                        )
                        search_start = end_idx
                    if highlighted_spans:
                        break  # found in first search_content, don't double-search

            scores_data = data.get("bias_scores", {})
            bias_scores = BiasScores(
                gender_bias=float(scores_data.get("gender_bias", 0.0)),
                stereotype=float(scores_data.get("stereotype", 0.0)),
                age_bias=float(scores_data.get("age_bias", 0.0)),
                disability_bias=float(scores_data.get("disability_bias", 0.0)),
                religious_bias=float(scores_data.get("religious_bias", 0.0)),
                socioeconomic_bias=float(scores_data.get("socioeconomic_bias", 0.0)),
                racial_ethnic_bias=float(scores_data.get("racial_ethnic_bias", 0.0)),
                caste_bias=float(scores_data.get("caste_bias", 0.0)),
                body_bias=float(scores_data.get("body_bias", 0.0)),
                nationality_bias=float(scores_data.get("nationality_bias", 0.0)),
                language_dominance=float(scores_data.get("language_dominance", 0.0)),
                overall=float(scores_data.get("overall", 0.0)),
            )

            alternative_text = self._generate_alternative_text(
                original_content, highlighted_spans
            )

            return AIAnalysisResult(
                bias_scores=bias_scores,
                explanations=data.get("explanations", {}),
                highlighted_text=highlighted_spans,
                language_detected=data.get("language_detected", language),
                confidence=float(data.get("confidence", 0.9)),
                model_version=f"gemini/{settings.GEMINI_MODEL}",
                alternative_text=alternative_text,
            )

        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.debug(f"Raw response: {response}")
            raise ValueError(f"Failed to parse Gemini response: {e}")

    def _generate_alternative_text(
        self, content: str, spans: List[HighlightedSpan]
    ) -> str:
        return generate_alternative_text(content, spans)
        """
        if not spans:
            return content

        sorted_spans = sorted(spans, key=lambda s: s.span[0], reverse=True)
        result = content
        for span in sorted_spans:
            if not span.suggestion:
                continue
            start, end = span.span[0], span.span[1]
            if start < 0 or end > len(result) or start >= end:
                continue
            original = result[start:end]
            replacement = span.suggestion
            if original and original[0].isupper():
                replacement = replacement[0].upper() + replacement[1:]
            result = result[:start] + replacement + result[end:]

        # Fix article grammar: "an [consonant-word]" → "a [consonant-word]"
        result = re.sub(
            r'\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])',
            lambda m: 'a ' + m.group(1),
            result
        )
        return result
        """
