"""
Integration adapters package.
Provides adapters for communicating with external services.
"""

from backend.integration.ai_adapter import AIAdapter
from backend.integration.fairness_adapter import FairnessAdapter
from backend.integration.storage_adapter import StorageAdapter

__all__ = [
    "AIAdapter",
    "FairnessAdapter",
    "StorageAdapter",
]
