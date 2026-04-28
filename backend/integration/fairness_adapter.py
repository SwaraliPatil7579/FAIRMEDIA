"""
Adapter for Member 3's Fairness Engine.
Handles all communication with the fairness calculation service.
"""

import httpx
from typing import Optional, Dict
from schemas.ai_schema import BiasScores
from schemas.fairness_schema import FairnessResult, MitigationWeights
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class FairnessAdapter:
    """
    Adapter for communicating with Member 3's Fairness Engine.
    
    When Member 3's service is ready, update the calculate_fairness method
    to make real HTTP calls instead of using mock data.
    """
    
    def __init__(self):
        self.base_url = settings.FAIRNESS_SERVICE_URL
        self.timeout = 30.0
        logger.info(f"⚖️  Fairness Adapter initialized: {self.base_url}")
    
    async def calculate_fairness(
        self,
        bias_scores: BiasScores,
        content: str,
        analysis_id: str,
        metadata: Optional[Dict] = None
    ) -> FairnessResult:
        """
        Call fairness engine to calculate risk and recommendations.
        
        Args:
            bias_scores: Bias scores from AI service (Member 2)
            content: Original text content
            analysis_id: Unique identifier
            metadata: Optional additional metadata
            
        Returns:
            FairnessResult with risk level and recommendations
            
        Raises:
            httpx.HTTPError: If the fairness service is unreachable
        
        TODO: Replace mock implementation with real HTTP call when
        Member 3's service is ready. Uncomment the code below.
        """
        logger.info(f"⚖️  Fairness Adapter: Calculating fairness for {analysis_id}")
        
        # Use the real Fairness Engine
        from services.fairness_engine.fairness_engine import FairnessEngine
        
        fairness_engine = FairnessEngine()
        result = await fairness_engine.calculate_fairness(
            bias_scores, content, analysis_id, metadata
        )
        
        logger.info(
            f"✅ Fairness calculation completed for {analysis_id}: "
            f"risk_level={result.risk_level}, "
            f"fairness_score={result.fairness_score:.2f}"
        )
        
        return result
    
    async def health_check(self) -> bool:
        """
        Check if Fairness Engine is healthy.
        
        Returns:
            True if service is healthy, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"⚠️  Fairness service health check failed: {e}")
            return False
