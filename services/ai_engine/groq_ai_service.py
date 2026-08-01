"""
Real AI Service using Groq API (OpenAI-compatible endpoint).
Model: openai/gpt-oss-120b via https://api.groq.com/openai/v1
Provides fast, high-quality bias detection as fallback to Gemini.
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

# Groq uses OpenAI-compatible endpoint
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqAIService:
    """
    Real AI implementation using Groq API (OpenAI-compatible).
    Uses model: openai/gpt-oss-120b
    """

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY.strip()
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not set in settings")

        self.model = settings.GROQ_MODEL  # openai/gpt-oss-120b
        self.timeout = 60.0
        logger.info(f"🤖 Groq AI Service initialized (model={self.model})")

    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: str = None,
    ) -> AIAnalysisResult:
        """Analyze text for bias using Groq AI."""
        logger.info(f"🤖 Groq AI analyzing: {analysis_id}")

        prompt = self._build_analysis_prompt(content, language)
        response = await self._call_groq_api(prompt)
        result = self._parse_groq_response(response, content, language or "en")

        logger.info(
            f"✅ Groq AI completed: overall_bias={result.bias_scores.overall:.2f}, "
            f"spans={len(result.highlighted_text)}"
        )
        return result

    def _build_analysis_prompt(self, content: str, language: Optional[str]) -> str:
        return f"""You are an expert bias detection system. Your job is to find EVERY biased phrase, word, or expression in the text — not just the most obvious ones.

The text may contain mixed languages (English, Hindi, Hinglish). Analyze ALL languages present.

Analyze for these 11 bias categories:
1. gender_bias: Gendered language, pronouns, stereotypical gender roles, sexism (e.g. "lady programmers", "man up", "chairman", "he/his dominance")
2. stereotype: Stereotypical assumptions about any group — racial, ethnic, cultural, professional (e.g. "rockstar developer", "young hungry coders", "culturally fit", "all-male board")
3. age_bias: Ageist language (e.g. "too old", "millennials are lazy", "digital native", "young and hungry")
4. disability_bias: Ableist language (e.g. "wheelchair-bound", "suffers from", "crazy", "lame", "blind to")
5. religious_bias: Religious stereotypes or discrimination
6. socioeconomic_bias: Class-based assumptions (e.g. "poor people are lazy", "bootstraps", "family distractions", "without family distractions")
7. language_dominance: Cultural/linguistic bias, English-centric assumptions
8. racial_ethnic_bias: Race, ethnicity, accent, or origin stereotypes
9. caste_bias: Caste, tribe, or historically marginalized community bias
10. body_bias: Body size, appearance, beauty, or weight bias
11. nationality_bias: Nationality, immigrant, migrant, or foreign-worker bias

Text to analyze:
```
{content}
```

Language hint: {language or "auto-detect"}

IMPORTANT RULES for highlighted_spans:
- Include EVERY biased phrase you find, even subtle ones
- "without family distractions" = socioeconomic_bias (assumes family = distraction)
- "young, hungry coders" = age_bias + stereotype (assumes youth = better)
- "lady programmers" = gender_bias (gendered job title)
- "all-male board" = gender_bias (exclusionary)
- "rockstar developer" = stereotype (toxic work culture)
- "work long hours" = socioeconomic_bias (glorifies overwork)
- Gendered pronouns used exclusively (he/his throughout) = gender_bias
- Each span must have a concise neutral replacement phrase in "suggestion"
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
    "gender_bias": "specific explanation of what was found",
    "stereotype": "specific explanation",
    "age_bias": "specific explanation",
    "disability_bias": "specific explanation",
    "religious_bias": "specific explanation",
    "socioeconomic_bias": "specific explanation",
    "racial_ethnic_bias": "specific explanation",
    "caste_bias": "specific explanation",
    "body_bias": "specific explanation",
    "nationality_bias": "specific explanation",
    "language_dominance": "specific explanation"
  }},
  "highlighted_spans": [
    {{
      "text": "exact phrase from the text",
      "bias_type": "gender_bias",
      "severity": "high",
      "suggestion": "neutral alternative"
    }}
  ],
  "language_detected": "en",
  "confidence": 0.95
}}"""

    async def _call_groq_api(self, prompt: str) -> Dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a bias detection expert. Always return valid JSON only, no markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 4096,
            "top_p": 0.95,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()

    def _parse_groq_response(
        self, response: Dict, original_content: str, language: str
    ) -> AIAnalysisResult:
        try:
            text = response["choices"][0]["message"]["content"]
            # Strip markdown fences
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
            text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
            text = text.strip()

            data = json.loads(text)

            # Build highlighted spans — find ALL occurrences in the text
            highlighted_spans = []
            seen_positions = set()

            for span_data in data.get("highlighted_spans", []):
                span_text = span_data.get("text", "").strip()
                if not span_text or len(span_text) < 2:
                    continue

                search_start = 0
                lower_content = original_content.lower()
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

                    actual_text = original_content[idx:end_idx]
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
                model_version=f"groq/{self.model}",
                alternative_text=alternative_text,
            )

        except Exception as e:
            logger.error(f"Failed to parse Groq response: {e}")
            logger.debug(f"Raw response: {response}")
            raise ValueError(f"Failed to parse Groq response: {e}")

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
