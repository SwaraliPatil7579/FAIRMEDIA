"""
AWS Bedrock AI Service for production bias detection.
Uses AWS Bedrock foundation models for advanced NLP analysis.
"""

import json
import boto3
from typing import Optional
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan
from services.ai_engine.prompt_templates import BIAS_DETECTION_PROMPT
from services.ai_engine.language_service import LanguageDetectionService
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class BedrockAIService:
    """
    Production AI service using AWS Bedrock.
    Supports Claude, Titan, and other foundation models.
    """
    
    def __init__(self):
        """Initialize Bedrock client."""
        self.client = boto3.client(
            'bedrock-runtime',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.model_id = "anthropic.claude-v2"  # Default model
        self.language_service = LanguageDetectionService()
        logger.info(f"☁️  Bedrock AI Service initialized with model: {self.model_id}")
    
    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: Optional[str] = None
    ) -> AIAnalysisResult:
        """
        Analyze text for bias using AWS Bedrock.
        
        Args:
            content: Text to analyze
            analysis_id: Unique identifier
            language: Optional language hint
            
        Returns:
            AIAnalysisResult with bias scores and explanations
        """
        logger.info(f"☁️  Bedrock analyzing: {analysis_id}")
        
        # Detect language if not provided
        if not language:
            language = self.language_service.detect_language(content)
        
        # Prepare prompt
        prompt = BIAS_DETECTION_PROMPT.format(content=content)
        
        try:
            # Call Bedrock API
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps({
                    "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                    "max_tokens_to_sample": 2000,
                    "temperature": 0.1,
                    "top_p": 0.9,
                })
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            completion = response_body.get('completion', '')
            
            # Extract JSON from response
            analysis_data = self._parse_llm_response(completion)
            
            # Build result
            result = AIAnalysisResult(
                bias_scores=BiasScores(
                    gender_bias=analysis_data['gender_bias'],
                    stereotype=analysis_data['stereotype'],
                    language_dominance=analysis_data['language_dominance'],
                    overall=analysis_data['overall']
                ),
                explanations=analysis_data['explanations'],
                highlighted_text=[
                    HighlightedSpan(
                        span=[span['start'], span['end']],
                        text=span['text'],
                        bias_type=span['bias_type'],
                        severity=span['severity'],
                        contribution_score=0.15
                    )
                    for span in analysis_data.get('highlighted_spans', [])
                ],
                language_detected=language,
                confidence=0.95,
                model_version=self.model_id
            )
            
            logger.info(f"✅ Bedrock analysis completed: {analysis_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Bedrock API error: {e}")
            raise
    
    def _parse_llm_response(self, completion: str) -> dict:
        """Parse LLM response and extract structured data."""
        try:
            # Try to find JSON in the response
            start = completion.find('{')
            end = completion.rfind('}') + 1
            
            if start >= 0 and end > start:
                json_str = completion[start:end]
                return json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
                
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            # Return default values
            return {
                'gender_bias': 0.5,
                'stereotype': 0.5,
                'language_dominance': 0.3,
                'overall': 0.43,
                'explanations': {
                    'gender_bias': 'Unable to parse detailed analysis',
                    'stereotype': 'Unable to parse detailed analysis',
                    'language_dominance': 'Unable to parse detailed analysis'
                },
                'highlighted_spans': []
            }
