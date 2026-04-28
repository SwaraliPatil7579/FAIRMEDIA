"""
Storage adapter - routes to local or AWS storage based on configuration.
"""

from typing import Dict, Any
from backend.config import settings
from services.storage.local_storage import LocalStorageService
import logging

logger = logging.getLogger(__name__)


class StorageAdapter:
    """
    Storage adapter that routes to local or AWS storage based on configuration.
    
    Automatically selects storage backend:
    - Local: JSON files (development)
    - AWS: DynamoDB + S3 (production)
    """
    
    def __init__(self):
        if settings.STORAGE_MODE == "aws":
            logger.info("☁️  AWS storage mode selected")
            try:
                from services.storage.aws_storage import AWSStorageService
                self.storage = AWSStorageService()
            except ImportError:
                logger.warning("⚠️  AWS storage not available, falling back to local")
                self.storage = LocalStorageService()
        else:
            logger.info("💾 Local storage mode selected")
            self.storage = LocalStorageService()
    
    async def store_audit_log(self, log_data: Dict[str, Any]):
        """
        Store audit log using configured storage backend.
        
        Args:
            log_data: Complete audit log data
            
        Returns:
            Storage result with location information
        """
        return await self.storage.store_audit_log(log_data)
    
    async def retrieve_audit_log(self, analysis_id: str):
        """
        Retrieve audit log by ID from configured storage backend.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            Audit log data or None if not found
        """
        return await self.storage.retrieve_audit_log(analysis_id)
    
    async def list_audit_logs(self, start_date=None, end_date=None):
        """
        List audit logs from configured storage backend.
        
        Args:
            start_date: Optional start date filter (ISO 8601)
            end_date: Optional end date filter (ISO 8601)
            
        Returns:
            List of audit logs
        """
        return await self.storage.list_audit_logs(start_date, end_date)
