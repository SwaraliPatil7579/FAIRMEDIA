"""
Main FastAPI application.
Entry point for the FAIRMEDIA backend server.
"""

import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import analyze, fetch_url
from backend.config import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="FAIRMEDIA Bias Audit API",
    description="AI-powered bias detection and mitigation system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware — allow all origins for public API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze.router, prefix="/api/v1", tags=["analysis"])
app.include_router(fetch_url.router, prefix="/api/v1", tags=["utilities"])


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "FAIRMEDIA Bias Audit API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    import os
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if gemini_key and groq_key:
        ai_model = "google/gemini-2.0-flash-lite → groq/llama-3.3-70b (fallback)"
    elif gemini_key:
        ai_model = "google/gemini-2.0-flash-lite"
    elif groq_key:
        ai_model = "groq/llama-3.3-70b-versatile"
    else:
        ai_model = "mock/rule-based"
    return {
        "status": "healthy",
        "service": "fairmedia-backend",
        "version": "1.0.0",
        "storage_mode": settings.STORAGE_MODE,
        "ai_model": ai_model,
        "python_path": str(project_root)
    }


@app.on_event("startup")
async def startup_event():
    """Startup event handler."""
    import os
    logger.info("🚀 FAIRMEDIA Backend starting up...")
    logger.info(f"📦 Storage mode: {settings.STORAGE_MODE}")

    # Show which AI model is active
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if gemini_key:
        logger.info("🤖 AI Model: Google Gemini 2.0 Flash Lite (primary) ✅")
    if groq_key:
        logger.info("🤖 AI Fallback: Groq LLaMA 3 (secondary) ✅")
    if not gemini_key and not groq_key:
        logger.info("🤖 AI Model: MockAIService (rule-based) — set GEMINI_API_KEY or GROQ_API_KEY to enable LLM")

    logger.info(f"⚖️  Fairness Service: {settings.FAIRNESS_SERVICE_URL}")
    logger.info(f"🌐 API running at: http://{settings.API_HOST}:{settings.API_PORT}")
    logger.info(f"📂 Project root: {project_root}")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    logger.info("👋 FAIRMEDIA Backend shutting down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )
