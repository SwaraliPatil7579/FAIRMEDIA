"""
Prompt templates for AI bias detection using LLMs.
"""

BIAS_DETECTION_PROMPT = """You are an expert AI bias detection system. Analyze the following text for various types of bias.

Text to analyze:
{content}

Analyze for the following bias types:
1. Gender Bias: Gendered language, stereotypical gender roles, unequal representation
2. Stereotype Bias: Cultural, racial, age, or occupational stereotypes
3. Language Dominance: English-centric or culturally dominant language patterns

For each bias type, provide:
- A score from 0.0 (no bias) to 1.0 (maximum bias)
- Specific examples from the text
- Explanation of why it's biased

Also identify specific text spans that contribute to bias with their character positions.

Return your analysis in JSON format matching this structure:
{{
  "gender_bias": 0.0-1.0,
  "stereotype": 0.0-1.0,
  "language_dominance": 0.0-1.0,
  "overall": 0.0-1.0,
  "explanations": {{
    "gender_bias": "explanation",
    "stereotype": "explanation",
    "language_dominance": "explanation"
  }},
  "highlighted_spans": [
    {{
      "start": 0,
      "end": 10,
      "text": "example",
      "bias_type": "gender_bias",
      "severity": "low|medium|high"
    }}
  ]
}}
"""

LANGUAGE_DETECTION_PROMPT = """Detect the language of the following text and return the ISO 639-1 language code.

Text:
{content}

Return only the 2-letter language code (e.g., 'en', 'es', 'fr', 'de', 'zh', 'ja').
"""
