"""
FAIRMEDIA Data Schemas Package.
Defines all request/response models for the API.
"""

from schemas.request_schema import AnalyzeRequest, AnalyzeRequestMetadata
from schemas.response_schema import AnalyzeResponse, ErrorResponse
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan
from schemas.fairness_schema import FairnessResult, MitigationWeights

__all__ = [
    "AnalyzeRequest",
    "AnalyzeRequestMetadata",
    "AnalyzeResponse",
    "ErrorResponse",
    "AIAnalysisResult",
    "BiasScores",
    "HighlightedSpan",
    "FairnessResult",
    "MitigationWeights",
]
