"""
AWS Bedrock client for AI model inference.
"""

import json
import boto3
from typing import Dict, Any
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class BedrockClient:
    """Client for AWS Bedrock foundation models."""
    
    def __init__(self):
        """Initialize Bedrock runtime client."""
        self.client = boto3.client(
            'bedrock-runtime',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        logger.info("☁️  Bedrock client initialized")
    
    def invoke_model(
        self,
        model_id: str,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Invoke a Bedrock foundation model.
        
        Args:
            model_id: Model identifier (e.g., 'anthropic.claude-v2')
            prompt: Input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Model response dictionary
        """
        try:
            body = json.dumps({
                "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                "max_tokens_to_sample": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
            })
            
            response = self.client.invoke_model(
                modelId=model_id,
                contentType="application/json",
                accept="application/json",
                body=body
            )
            
            response_body = json.loads(response['body'].read())
            
            logger.info(f"✅ Bedrock model invoked: {model_id}")
            
            return response_body
            
        except Exception as e:
            logger.error(f"❌ Bedrock invocation failed: {e}")
            raise
    
    def list_foundation_models(self) -> list:
        """List available foundation models."""
        try:
            bedrock = boto3.client(
                'bedrock',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
            
            response = bedrock.list_foundation_models()
            models = response.get('modelSummaries', [])
            
            logger.info(f"📋 Found {len(models)} foundation models")
            
            return models
            
        except Exception as e:
            logger.error(f"❌ Failed to list models: {e}")
            return []
