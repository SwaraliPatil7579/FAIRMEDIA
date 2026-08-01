"""
Batch analysis endpoint — process multiple texts in parallel.
"""

import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, field_validator

from backend.controller.pipeline_controller import PipelineController
from schemas.request_schema import AnalyzeRequest, AnalyzeRequestMetadata
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
pipeline = PipelineController()

# In-memory batch job store (sufficient for single-instance deployments)
batch_jobs: Dict[str, Dict[str, Any]] = {}


class BatchItem(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    language: Optional[str] = Field("en")
    metadata: Optional[Dict[str, Any]] = None
    item_id: Optional[str] = None

    @field_validator("language", mode="before")
    @classmethod
    def validate_language(cls, v):
        if v is None:
            return "en"
        v = str(v).strip().lower()
        # Accept any 2-char code or "auto"
        if len(v) == 2 or v == "auto":
            return v
        return "en"


class BatchAnalyzeRequest(BaseModel):
    items: List[BatchItem] = Field(..., min_length=1, max_length=50)
    batch_name: Optional[str] = None


class BatchAnalyzeResponse(BaseModel):
    batch_id: str
    status: str
    total_items: int
    completed_items: int    # successfully completed
    failed_items: int = 0   # failed items
    processed_items: int = 0  # total processed (completed + failed)
    results: List[Dict[str, Any]]
    created_at: str
    completed_at: Optional[str] = None


@router.post("/batch-analyze", response_model=Dict[str, Any])
async def batch_analyze(request: BatchAnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Start a batch analysis job.
    Returns a batch_id — poll GET /batch-analyze/{batch_id} for results.
    """
    batch_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"

    batch_jobs[batch_id] = {
        "batch_id": batch_id,
        "batch_name": request.batch_name or f"Batch {batch_id[:8]}",
        "status": "processing",
        "total_items": len(request.items),
        "completed_items": 0,   # successfully completed
        "failed_items": 0,      # failed items
        "processed_items": 0,   # total processed (completed + failed)
        "results": [],
        "created_at": created_at,
        "completed_at": None,
        "errors": [],
    }

    logger.info(f"📦 Batch started: {batch_id} ({len(request.items)} items)")
    background_tasks.add_task(process_batch, batch_id, request.items)

    return {
        "batch_id": batch_id,
        "status": "processing",
        "total_items": len(request.items),
        "message": f"Batch started. Poll GET /api/v1/batch-analyze/{batch_id} for results.",
    }


@router.get("/batch-analyze/{batch_id}", response_model=BatchAnalyzeResponse)
async def get_batch_status(batch_id: str):
    """Get status and results of a batch job."""
    if batch_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Batch job not found")

    job = batch_jobs[batch_id]
    return BatchAnalyzeResponse(
        batch_id=job["batch_id"],
        status=job["status"],
        total_items=job["total_items"],
        completed_items=job["completed_items"],
        failed_items=job.get("failed_items", 0),
        processed_items=job.get("processed_items", 0),
        results=job["results"],
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
    )


@router.get("/batch-analyze", response_model=List[Dict[str, Any]])
async def list_batch_jobs():
    """List all batch jobs, most recent first."""
    jobs = sorted(batch_jobs.values(), key=lambda x: x["created_at"], reverse=True)
    return [
        {
            "batch_id": j["batch_id"],
            "batch_name": j["batch_name"],
            "status": j["status"],
            "total_items": j["total_items"],
            "completed_items": j["completed_items"],
            "created_at": j["created_at"],
            "completed_at": j.get("completed_at"),
        }
        for j in jobs
    ]


async def process_batch(batch_id: str, items: List[BatchItem]):
    """Process all items in a batch sequentially to avoid API rate limits."""
    job = batch_jobs[batch_id]
    job.setdefault("completed_items", 0)
    job.setdefault("failed_items", 0)
    job.setdefault("processed_items", job["completed_items"] + job["failed_items"])
    job.setdefault("results", [])
    job.setdefault("errors", [])

    for index, item in enumerate(items):
        try:
            metadata = (
                AnalyzeRequestMetadata(**item.metadata) if item.metadata else None
            )
            request = AnalyzeRequest(
                content=item.content,
                language=item.language or "en",
                metadata=metadata,
            )
            result = await pipeline.execute_pipeline(request)

            bias_scores_dump = (
                result.bias_detection.bias_scores.model_dump()
                if result.bias_detection and result.bias_detection.bias_scores
                else {}
            )

            job["results"].append({
                "item_id": item.item_id or f"item_{index + 1}",
                "status": "completed",
                "analysis_id": result.analysis_id,
                "content": item.content,
                "bias_scores": bias_scores_dump,
                "overall_bias": bias_scores_dump.get("overall", 0.0),
                "risk_level": (
                    result.fairness_metrics.risk_level
                    if result.fairness_metrics
                    else "unknown"
                ),
                "language_detected": (
                    result.bias_detection.language_detected
                    if result.bias_detection
                    else "unknown"
                ),
                "highlighted_count": len(
                    result.bias_detection.highlighted_text or []
                ),
                "highlighted_spans": [
                    {
                        "text": s.text,
                        "bias_type": s.bias_type,
                        "severity": s.severity,
                        "suggestion": s.suggestion,
                        "span": s.span,
                    }
                    for s in (result.bias_detection.highlighted_text or [])
                ],
                "alternative_text": result.bias_detection.alternative_text or "",
            })
            job["completed_items"] += 1
            job["processed_items"] += 1
            logger.info(
                f"✅ Batch {batch_id[:8]}: item {index + 1}/{job['total_items']} done"
            )

        except Exception as e:
            logger.error(f"❌ Batch {batch_id[:8]}: item {index + 1} failed: {e}")
            job["errors"].append({
                "item_id": item.item_id or f"item_{index + 1}",
                "error": str(e)
            })
            job["results"].append({
                "item_id": item.item_id or f"item_{index + 1}",
                "status": "failed",
                "analysis_id": "failed",
                "content": item.content,
                "bias_scores": {
                    "overall": 0.0, "gender_bias": 0.0, "stereotype": 0.0,
                    "age_bias": 0.0, "disability_bias": 0.0,
                    "religious_bias": 0.0, "socioeconomic_bias": 0.0,
                    "language_dominance": 0.0,
                },
                "overall_bias": 0.0,
                "risk_level": "failed",
                "language_detected": "unknown",
                "highlighted_count": 0,
                "highlighted_spans": [],
                "alternative_text": "",
            })
            job["failed_items"] += 1
            job["processed_items"] += 1

        # Small delay between items to respect API rate limits
        if index < len(items) - 1:
            await asyncio.sleep(0.5)

    job["status"] = "completed" if job["failed_items"] < job["total_items"] else "failed"
    job["completed_at"] = datetime.utcnow().isoformat() + "Z"
    logger.info(
        f"🎉 Batch {batch_id[:8]} done: "
        f"{job['completed_items']} succeeded, {job['failed_items']} failed"
    )
