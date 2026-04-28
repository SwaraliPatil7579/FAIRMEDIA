"""
AI Service schema for Member 2's output.
This defines the contract between Member 1 and Member 2.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional


class BiasScores(BaseModel):
    """
    Bias scores for different bias types.
    All scores are in range [0.0, 1.0] where higher = more biased.
    """
    
    model_config = ConfigDict(protected_namespaces=())
    
    gender_bias: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Gender bias score (0=no bias, 1=maximum bias)",
        examples=[0.65]
    )
    
    stereotype: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Stereotype bias score",
        examples=[0.42]
    )
    
    language_dominance: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Language dominance bias score",
        examples=[0.28]
    )
    
    overall: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall bias score (weighted average)",
        examples=[0.52]
    )


class HighlightedSpan(BaseModel):
    """A text span that contributes to bias."""
    
    model_config = ConfigDict(protected_namespaces=())
    
    span: List[int] = Field(
        ...,
        min_length=2,
        max_length=2,
        description="[start_index, end_index] in the original text",
        examples=[[20, 23]]
    )
    
    text: str = Field(
        ...,
        description="The actual text in this span",
        examples=["his"]
    )
    
    bias_type: str = Field(
        ...,
        description="Type of bias detected",
        examples=["gender_bias"]
    )
    
    severity: str = Field(
        ...,
        description="Severity level (low, medium, high)",
        examples=["medium"]
    )
    
    contribution_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="How much this span contributes to overall bias",
        examples=[0.15]
    )
    
    suggestion: Optional[str] = Field(
        None,
        description="Alternative neutral text suggestion",
        examples=["their"]
    )


class AIAnalysisResult(BaseModel):
    """
    Complete result from AI Service (Member 2).
    This is what Member 2 MUST return to Member 1.
    """
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "bias_scores": {
                    "gender_bias": 0.65,
                    "stereotype": 0.42,
                    "language_dominance": 0.28,
                    "overall": 0.52
                },
                "explanations": {
                    "gender_bias": "Detected gendered pronouns ('his') and implicit role associations",
                    "stereotype": "Identified stereotypical gender-role patterns",
                    "language_dominance": "Minimal English-centric bias detected"
                },
                "highlighted_text": [
                    {
                        "span": [20, 23],
                        "text": "his",
                        "bias_type": "gender_bias",
                        "severity": "medium",
                        "contribution_score": 0.15
                    }
                ],
                "language_detected": "en",
                "confidence": 0.95,
                "model_version": "bert-bias-v1.0.0"
            }
        }
    )
    
    bias_scores: BiasScores = Field(
        ...,
        description="Bias scores for all bias types"
    )
    
    explanations: Dict[str, str] = Field(
        ...,
        description="Human-readable explanations for each bias type"
    )
    
    highlighted_text: List[HighlightedSpan] = Field(
        ...,
        description="Text spans that contribute to bias"
    )
    
    language_detected: str = Field(
        ...,
        description="Detected language (ISO 639-1 code)",
        examples=["en"]
    )
    
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence in the analysis",
        examples=[0.95]
    )
    
    model_version: Optional[str] = Field(
        None,
        description="Version of the AI model used",
        examples=["bert-bias-v1.0.0"]
    )
