"""
Storage services package.
Provides local and AWS storage implementations.
"""

from services.storage.local_storage import LocalStorageService

__all__ = ["LocalStorageService"]
