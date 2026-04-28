"""
Central pipeline controller - orchestrates all services.

THIS IS YOUR MOST IMPORTANT FILE AS MEMBER 1!
This controller connects all modules and nothing works without it.
"""

from typing import Dict, Any
from schemas.request_schema import AnalyzeRequest
from schemas.response_schema import AnalyzeResponse
from backend.integration.ai_adapter import AIAdapter
from backend.integration.fairness_adapter import FairnessAdapter
from backend.integration.storage_adapter import StorageAdapter
import uuid
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)


class PipelineController:
    """
    Central controller that orchestrates the entire analysis pipeline.
    
    Pipeline Flow:
    1. Generate analysis ID and timestamp
    2. Call AI Service (Member 2) → get bias scores and explanations
    3. Call Fairness Engine (Member 3) → get risk assessment and recommendations
    4. Store audit log (Member 1) → persist complete results
    5. Build and return comprehensive response
    
    Responsibilities:
    - Coordinate service calls in correct order
    - Handle errors and logging
    - Transform data between services
    - Store audit logs
    - Generate final response
    """
    
    def __init__(self):
        """Initialize all service adapters."""
        self.ai_adapter = AIAdapter()
        self.fairness_adapter = FairnessAdapter()
        self.storage_adapter = StorageAdapter()
        logger.info("🎯 Pipeline Controller initialized")
    
    async def execute_pipeline(self, request: AnalyzeRequest) -> AnalyzeResponse:
        """
        Execute the complete analysis pipeline.
        
        Args:
            request: AnalyzeRequest from frontend
            
        Returns:
            AnalyzeResponse with complete results
            
        Raises:
            Exception: If any step in the pipeline fails
        """
        start_time = time.time()
        
        # Step 1: Generate unique analysis ID and timestamp
        analysis_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        logger.info(f"🚀 Pipeline started for analysis_id: {analysis_id}")
        
        try:
            # Step 2: AI Service - Bias Detection
            logger.info("📊 Step 1/3: Calling AI Service for bias detection...")
            ai_result = await self.ai_adapter.analyze_bias(
                content=request.content,
                analysis_id=analysis_id,
                language=request.language
            )
            logger.info(
                f"✅ AI Service completed: "
                f"overall_bias={ai_result.bias_scores.overall:.2f}, "
                f"confidence={ai_result.confidence:.2f}"
            )
            
            # Step 3: Fairness Engine - Mitigation Recommendations
            logger.info("⚖️  Step 2/3: Calling Fairness Engine for risk assessment...")
            fairness_result = await self.fairness_adapter.calculate_fairness(
                bias_scores=ai_result.bias_scores,
                content=request.content,
                analysis_id=analysis_id,
                metadata=request.metadata.model_dump() if request.metadata else None
            )
            logger.info(
                f"✅ Fairness Engine completed: "
                f"risk_level={fairness_result.risk_level}, "
                f"fairness_score={fairness_result.fairness_score:.2f}"
            )
            
            # Step 4: Storage - Persist Audit Log
            logger.info("💾 Step 3/3: Storing audit log...")
            audit_log = {
                "analysis_id": analysis_id,
                "timestamp": timestamp,
                "content": request.content,
                "ai_result": ai_result.model_dump(),
                "fairness_result": fairness_result.model_dump(),
                "metadata": request.metadata.model_dump() if request.metadata else None
            }
            
            storage_result = await self.storage_adapter.store_audit_log(audit_log)
            logger.info(f"✅ Storage completed: {storage_result.get('location')}")
            
            # Step 5: Build Comprehensive Response
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            response = AnalyzeResponse(
                analysis_id=analysis_id,
                timestamp=timestamp,
                bias_detection=ai_result,
                fairness_metrics=fairness_result,
                storage_location=storage_result.get('location', 'unknown'),
                status="completed",
                processing_time_ms=processing_time_ms
            )
            
            logger.info(
                f"🎉 Pipeline completed successfully in {processing_time_ms}ms"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}", exc_info=True)
            raise
    
    async def get_stored_analysis(self, analysis_id: str) -> Dict[str, Any]:
        """
        Retrieve a stored analysis by ID.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            Stored audit log data
        """
        logger.info(f"🔍 Retrieving analysis: {analysis_id}")
        return await self.storage_adapter.retrieve_audit_log(analysis_id)
