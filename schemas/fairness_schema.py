"""
Fairness Engine schema for Member 3's output.
This defines the contract between Member 1 and Member 3.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Any, List, Dict, Optional


class MitigationWeights(BaseModel):
    """Weight adjustments for bias mitigation."""
    
    model_config = ConfigDict(protected_namespaces=())
    
    original_weight: float = Field(
        ...,
        description="Original content weight (typically 1.0)",
        examples=[1.0]
    )
    
    adjusted_weight: float = Field(
        ...,
        ge=0.1,
        le=1.0,
        description="Adjusted weight after bias mitigation (minimum 0.1)",
        examples=[0.75]
    )
    
    adjustment_factor: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="How much the weight was reduced",
        examples=[0.25]
    )
    
    rationale: Optional[str] = Field(
        None,
        description="Explanation for the weight adjustment",
        examples=["Reduced weight due to medium-level gender bias"]
    )


class FairnessResult(BaseModel):
    """
    Complete result from Fairness Engine (Member 3).
    This is what Member 3 MUST return to Member 1.
    """
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "risk_level": "medium",
                "fairness_score": 0.58,
                "recommendations": [
                    "Consider using gender-neutral language",
                    "Review role-based gender associations"
                ],
                "mitigation_weights": {
                    "original_weight": 1.0,
                    "adjusted_weight": 0.75,
                    "adjustment_factor": 0.25,
                    "rationale": "Weight reduced due to medium bias"
                },
                "detailed_metrics": {
                    "gender_fairness": 0.45,
                    "stereotype_fairness": 0.68,
                    "language_fairness": 0.82
                },
                "engine_version": "fairness-v1.0.0"
            }
        }
    )
    
    risk_level: str = Field(
        ...,
        description="Overall risk level",
        examples=["medium"]
    )
    
    fairness_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Fairness score (0=unfair, 1=fair)",
        examples=[0.58]
    )
    
    recommendations: List[str] = Field(
        ...,
        description="List of actionable recommendations"
    )
    
    mitigation_weights: MitigationWeights = Field(
        ...,
        description="Weight adjustments for content re-ranking"
    )
    
    detailed_metrics: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional detailed metrics"
    )
    
    engine_version: Optional[str] = Field(
        None,
        description="Version of the fairness engine",
        examples=["fairness-v1.0.0"]
    )
