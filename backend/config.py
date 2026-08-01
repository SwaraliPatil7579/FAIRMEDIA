"""
Configuration management using Pydantic Settings.
Loads configuration from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8501",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Storage Configuration
    STORAGE_MODE: str = "local"
    LOCAL_STORAGE_PATH: str = "./data/audit_logs"

    # AI Model Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"   # Groq OpenAI-compat model

    # Service Endpoints (kept for reference, not used by main pipeline)
    AI_SERVICE_URL: str = "http://localhost:8001"
    FAIRNESS_SERVICE_URL: str = "http://localhost:8002"

    # Feature Flags
    ENABLE_AUTHENTICATION: bool = False
    ENABLE_RATE_LIMITING: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    # Frontend (ignored by backend)
    REACT_APP_API_URL: str = "http://localhost:8000"

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Global settings instance
settings = Settings()
