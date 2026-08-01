"""Utilities for producing readable bias-free rewrites.

LLMs sometimes return coaching text as a span suggestion, for example
"Avoid blanket statements...". That is useful as guidance, but it is not a
replacement phrase. These helpers keep replacement-based rewrites grammatical.
"""

from __future__ import annotations

import re
from typing import Iterable

from schemas.ai_schema import HighlightedSpan


INSTRUCTION_STARTS = (
    "avoid ",
    "use ",
    "describe ",
    "replace ",
    "rephrase ",
    "rewrite ",
    "do not ",
    "don't ",
    "focus on ",
    "say ",
    "state ",
    "it is inaccurate ",
    "it is inaccurate to ",
    "it is misleading ",
    "it is misleading to ",
    "this is ",
)


def sanitize_replacement(original: str, suggestion: str | None, bias_type: str) -> str:
    """Return a phrase that can safely replace ``original`` in-place."""
    suggestion = (suggestion or "").strip()
    original = original.strip()
    if not suggestion:
        return neutral_phrase(original, bias_type)

    lower = suggestion.lower()
    is_instruction = lower.startswith(INSTRUCTION_STARTS)
    is_too_long = len(suggestion) > max(48, len(original) * 2)
    has_multiple_sentences = len(re.findall(r"[.!?]", suggestion)) > 1
    repeats_religious_group = bias_type == "religious_bias" and any(
        group in lower
        for group in ("muslim", "christian", "jewish", "hindu", "buddhist", "sikh")
    )

    if is_instruction or is_too_long or has_multiple_sentences or repeats_religious_group:
        return neutral_phrase(original, bias_type)

    return suggestion.rstrip()


def neutral_phrase(original: str, bias_type: str) -> str:
    """Create a conservative neutral phrase from a biased phrase."""
    text = original.strip()
    lower = text.lower()

    match = re.match(r"all\s+[\w\s-]+\s+are\s+(.+)", lower, flags=re.IGNORECASE)
    if match:
        predicate = match.group(1).strip(" .")
        if predicate in {"dangerous", "violent", "bad", "lazy"}:
            return "some individuals may cause harm"
        return f"some individuals may be {predicate}"

    match = re.match(r"typical\s+\S+\s+(.+)", lower, flags=re.IGNORECASE)
    if match:
        behavior = match.group(1).strip(" .")
        if behavior.startswith(("force ", "push ", "impose ")):
            return f"some individuals may {behavior}"
        return f"some individuals {behavior}"

    phrase_map = {
        "native english speakers only": "people with the required language proficiency",
        "native english speakers": "people with the required language proficiency",
        "where are you really from": "what is your background",
        "you speak english so well": "you communicate effectively",
        "one of the good ones": "a valued colleague",
        "foreign workers": "international workers",
        "immigrants take jobs": "labor market changes have many causes",
        "tribal communities are backward": "tribal communities have diverse cultures and strengths",
        "fat people are lazy": "people have different body types and circumstances",
        "poor people are lazy": "people in poverty face systemic barriers",
    }
    if lower in phrase_map:
        return phrase_map[lower]

    defaults = {
        "gender_bias": "people",
        "religious_bias": "some individuals",
        "racial_ethnic_bias": "individuals",
        "caste_bias": "communities",
        "body_bias": "people",
        "nationality_bias": "people",
        "language_dominance": "people with the required language proficiency",
        "socioeconomic_bias": "people",
        "age_bias": "people",
        "disability_bias": "people",
        "stereotype": "individuals",
    }
    return defaults.get(bias_type, "people")


def generate_alternative_text(content: str, spans: Iterable[HighlightedSpan]) -> str:
    """Generate a readable full rewrite by replacing sanitized span suggestions."""
    spans = list(spans)
    if not spans:
        return content

    result = content
    for span in sorted(spans, key=lambda s: s.span[0], reverse=True):
        start, end = span.span[0], span.span[1]
        if start < 0 or end > len(result) or start >= end:
            continue

        original = result[start:end]
        replacement = sanitize_replacement(original, span.suggestion, span.bias_type)
        if original and original[0].isupper() and replacement:
            replacement = replacement[0].upper() + replacement[1:]
        result = result[:start] + replacement + result[end:]

    result = re.sub(
        r"\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])",
        lambda match: "a " + match.group(1),
        result,
    )
    result = re.sub(r"\s+([,.!?])", r"\1", result)
    result = re.sub(
        r"\b(and|or|but)\s+([A-Z])",
        lambda match: f"{match.group(1)} {match.group(2).lower()}",
        result,
    )
    result = re.sub(r"\s{2,}", " ", result).strip()
    return result
