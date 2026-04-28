"""
Response schemas for FAIRMEDIA API.
Defines the structure of API responses sent to Member 4 (Frontend).
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, Optional
from schemas.ai_schema import AIAnalysisResult
from schemas.fairness_schema import FairnessResult


class AnalyzeResponse(BaseModel):
    """
    Response schema for POST /api/v1/analyze endpoint.
    This is the main output sent to Member 4 (Frontend).
    """
    
    model_config = ConfigDict(protected_namespaces=())
    
    analysis_id: str = Field(
        ...,
        description="Unique identifier for this analysis (UUID)",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    
    timestamp: str = Field(
        ...,
        description="When the analysis was completed (ISO 8601)",
        examples=["2024-02-28T10:35:42Z"]
    )
    
    bias_detection: AIAnalysisResult = Field(
        ...,
        description="Bias detection results from AI service (Member 2)"
    )
    
    fairness_metrics: FairnessResult = Field(
        ...,
        description="Fairness metrics from fairness engine (Member 3)"
    )
    
    storage_location: str = Field(
        ...,
        description="Where the audit log is stored",
        examples=["./data/audit_logs/550e8400-e29b-41d4-a716-446655440000.json"]
    )
    
    status: str = Field(
        ...,
        description="Status of the analysis",
        examples=["completed"]
    )
    
    processing_time_ms: Optional[int] = Field(
        None,
        description="Total processing time in milliseconds",
        examples=[1250]
    )


class ErrorResponse(BaseModel):
    """Error response schema for all endpoints."""
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Content is required",
                    "details": "The 'content' field must be between 1-10000 characters",
                    "timestamp": "2024-02-28T10:35:42Z",
                    "request_id": "req_abc123"
                }
            }
        }
    )
    
    error: Dict[str, Any] = Field(
        ...,
        description="Error details"
    )
