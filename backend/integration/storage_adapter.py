"""
Storage adapter — uses local JSON file storage.
"""

from typing import Dict, Any
from services.storage.local_storage import LocalStorageService
import logging

logger = logging.getLogger(__name__)


class StorageAdapter:
    """
    Storage adapter using local JSON file storage.
    """

    def __init__(self):
        self.storage = LocalStorageService()
        logger.info("💾 Storage Adapter initialized (local)")

    async def store_audit_log(self, log_data: Dict[str, Any]):
        return await self.storage.store_audit_log(log_data)

    async def retrieve_audit_log(self, analysis_id: str):
        return await self.storage.retrieve_audit_log(analysis_id)

    async def list_audit_logs(self, start_date=None, end_date=None):
        return await self.storage.list_audit_logs(start_date, end_date)
