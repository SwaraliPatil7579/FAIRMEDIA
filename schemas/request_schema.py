"""
Request schemas for FAIRMEDIA API.
Defines the structure of incoming requests from Member 4 (Frontend).
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List


class AnalyzeRequestMetadata(BaseModel):
    """Optional metadata about the content being analyzed."""
    
    model_config = ConfigDict(protected_namespaces=())
    
    source: Optional[str] = Field(
        None,
        description="Source of the content (e.g., 'news_article', 'social_media')",
        examples=["news_article"]
    )
    author: Optional[str] = Field(
        None,
        description="Author of the content",
        examples=["John Doe"]
    )
    tags: Optional[List[str]] = Field(
        None,
        description="Tags associated with the content",
        examples=[["politics", "technology"]]
    )
    url: Optional[str] = Field(
        None,
        description="Original URL of the content",
        examples=["https://example.com/article"]
    )
    timestamp: Optional[str] = Field(
        None,
        description="When the content was published (ISO 8601)",
        examples=["2024-02-28T10:30:00Z"]
    )


class AnalyzeRequest(BaseModel):
    """
    Request schema for POST /api/v1/analyze endpoint.
    This is the main input from Member 4 (Frontend).
    """
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "content": "The CEO announced that his company will hire more female engineers to improve diversity.",
                "language": "en",
                "metadata": {
                    "source": "news_article",
                    "author": "Jane Smith",
                    "tags": ["business", "diversity"],
                    "url": "https://example.com/news/diversity-hiring",
                    "timestamp": "2024-02-28T10:30:00Z"
                }
            }
        }
    )
    
    content: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Text content to analyze for bias",
        examples=["The CEO announced that his company will hire more female engineers."]
    )
    
    language: Optional[str] = Field(
        None,
        description="ISO 639-1 language code (auto-detected if not provided)",
        examples=["en"]
    )
    
    metadata: Optional[AnalyzeRequestMetadata] = Field(
        None,
        description="Additional metadata about the content"
    )
    
    @field_validator('content')
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty or whitespace only')
        return v.strip()
    
    @field_validator('language')
    @classmethod
    def validate_language_code(cls, v):
        if v is not None and len(v) != 2:
            raise ValueError('Language code must be 2 characters (ISO 639-1)')
        return v.lower() if v else v
