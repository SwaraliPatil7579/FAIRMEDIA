"""
Analyze route handler.
Handles the main /analyze endpoint for bias detection.
"""

from fastapi import APIRouter, HTTPException, status
from schemas.request_schema import AnalyzeRequest
from schemas.response_schema import AnalyzeResponse
from backend.controller.pipeline_controller import PipelineController
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize pipeline controller
controller = PipelineController()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    """
    Analyze content for bias and generate mitigation recommendations.
    
    Flow:
    1. Receive content from frontend (Member 4)
    2. Call AI Service (Member 2) for bias detection
    3. Call Fairness Engine (Member 3) for mitigation
    4. Store results in storage
    5. Return comprehensive response
    
    Args:
        request: AnalyzeRequest with content and metadata
        
    Returns:
        AnalyzeResponse with complete analysis results
        
    Raises:
        HTTPException: If analysis fails
    """
    try:
        logger.info(f"📨 Received analysis request: {len(request.content)} characters")
        
        # Execute the central pipeline
        result = await controller.execute_pipeline(request)
        
        logger.info(f"✅ Analysis completed: {result.analysis_id}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/analyze/{analysis_id}")
async def get_analysis(analysis_id: str):
    """
    Retrieve a previously completed analysis by ID.
    
    Args:
        analysis_id: UUID of the analysis
        
    Returns:
        Stored analysis result
        
    Raises:
        HTTPException: If analysis not found or retrieval fails
    """
    try:
        logger.info(f"🔍 Retrieving analysis: {analysis_id}")
        
        result = await controller.get_stored_analysis(analysis_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Analysis {analysis_id} not found"
            )
        
        logger.info(f"✅ Analysis retrieved: {analysis_id}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Retrieval failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retrieval failed: {str(e)}"
        )
