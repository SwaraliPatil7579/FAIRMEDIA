"""
Main FastAPI application.
Entry point for the FAIRMEDIA backend server.
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import analyze, fetch_url, batch_analyze
from backend.config import settings
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 FAIRMEDIA Backend starting up...")
    logger.info(f"📦 Storage mode: {settings.STORAGE_MODE}")

    gemini_key = settings.GEMINI_API_KEY.strip()
    groq_key = settings.GROQ_API_KEY.strip()

    if gemini_key:
        logger.info(f"🤖 AI Primary:  Gemini ({settings.GEMINI_MODEL}) ✅")
    if groq_key:
        logger.info(f"🤖 AI Fallback: Groq   ({settings.GROQ_MODEL}) ✅")
    if not gemini_key and not groq_key:
        logger.info("🤖 AI Model: Mock/rule-based (set GEMINI_API_KEY or GROQ_API_KEY to enable LLM)")

    logger.info(f"🌐 API running at: http://{settings.API_HOST}:{settings.API_PORT}")
    logger.info(f"📂 Project root: {project_root}")

    yield

    # Shutdown
    logger.info("👋 FAIRMEDIA Backend shutting down...")


app = FastAPI(
    title="FAIRMEDIA Bias Audit API",
    description="AI-powered bias detection and mitigation system",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow all origins for public API
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
app.include_router(batch_analyze.router, prefix="/api/v1", tags=["batch"])


@app.get("/")
async def root():
    return {
        "message": "FAIRMEDIA Bias Audit API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    gemini_key = settings.GEMINI_API_KEY.strip()
    groq_key = settings.GROQ_API_KEY.strip()

    if gemini_key and groq_key:
        ai_model = f"gemini/{settings.GEMINI_MODEL} → groq/{settings.GROQ_MODEL} (fallback)"
    elif gemini_key:
        ai_model = f"gemini/{settings.GEMINI_MODEL}"
    elif groq_key:
        ai_model = f"groq/{settings.GROQ_MODEL}"
    else:
        ai_model = "mock/rule-based"

    return {
        "status": "healthy",
        "service": "fairmedia-backend",
        "version": "2.0.0",
        "storage_mode": settings.STORAGE_MODE,
        "ai_model": ai_model,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
    )
