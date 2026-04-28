"""
Configuration management using Pydantic Settings.
Loads configuration from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional


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
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Storage Configuration
    STORAGE_MODE: str = "local"
    LOCAL_STORAGE_PATH: str = "./data/audit_logs"

    # AWS Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    DYNAMODB_TABLE_NAME: str = "fairmedia-audit-logs"
    S3_BUCKET_NAME: str = "fairmedia-logs"

    # Google Cloud Configuration
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    BIGQUERY_DATASET_ID: str = "fairmedia"
    BIGQUERY_TABLE_ID: str = "bias_audit_logs"
    VERTEX_AI_ENDPOINT_ID: str = ""
    VERTEX_AI_MODEL_NAME: str = "bias-detector-v1"
    GCS_BUCKET_NAME: str = "fairmedia-audit-logs"
    FIRESTORE_COLLECTION: str = "realtime_analyses"
    PUBSUB_TOPIC_NAME: str = "bias-alerts"
    PUBSUB_SUBSCRIPTION_NAME: str = "bias-alerts-sub"

    # Service Endpoints
    AI_SERVICE_URL: str = "http://localhost:8001"
    FAIRNESS_SERVICE_URL: str = "http://localhost:8002"

    # AI Model Configuration
    GEMINI_API_KEY: str = ""        # Get free key at https://aistudio.google.com
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    GROQ_API_KEY: str = ""          # Get free key at https://console.groq.com
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Feature Flags
    ENABLE_AUTHENTICATION: bool = False
    ENABLE_RATE_LIMITING: bool = False
    ENABLE_GOOGLE_NLP: bool = False
    ENABLE_VERTEX_AI: bool = False
    ENABLE_BIGQUERY_ANALYTICS: bool = False
    ENABLE_REALTIME_MONITORING: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    # Frontend (ignored by backend, but present in .env)
    REACT_APP_API_URL: str = "http://localhost:8000"

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",   # silently ignore any extra .env keys
    }


# Global settings instance
settings = Settings()
