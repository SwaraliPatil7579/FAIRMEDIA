"""
Local file-based storage service.
Stores audit logs as JSON files for development.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class LocalStorageService:
    """
    Local JSON file storage for audit logs.
    
    Storage structure:
    ./data/audit_logs/
      - {analysis_id}.json
      - {analysis_id}.json
      - ...
    """
    
    def __init__(self):
        self.base_path = Path(settings.LOCAL_STORAGE_PATH)
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"💾 Local storage initialized at: {self.base_path.absolute()}")
    
    async def store_audit_log(self, log_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Store audit log as JSON file.
        
        Args:
            log_data: Complete audit log data
            
        Returns:
            Storage result with location and status
        """
        analysis_id = log_data['analysis_id']
        file_path = self.base_path / f"{analysis_id}.json"
        
        try:
            # Add storage metadata
            log_data['stored_at'] = datetime.utcnow().isoformat() + "Z"
            log_data['storage_type'] = 'local'
            
            # Write to file with pretty formatting
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ Audit log stored: {file_path.name}")
            
            return {
                "status": "success",
                "location": str(file_path.absolute()),
                "storage_type": "local",
                "analysis_id": analysis_id
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to store audit log: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "storage_type": "local"
            }
    
    async def retrieve_audit_log(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve audit log from JSON file.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            Audit log data or None if not found
        """
        file_path = self.base_path / f"{analysis_id}.json"
        
        if not file_path.exists():
            logger.warning(f"⚠️  Audit log not found: {analysis_id}")
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                log_data = json.load(f)
            
            logger.info(f"✅ Audit log retrieved: {analysis_id}")
            return log_data
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve audit log: {e}")
            return None
    
    async def list_audit_logs(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List all audit logs, optionally filtered by date range.
        
        Args:
            start_date: ISO 8601 timestamp (inclusive)
            end_date: ISO 8601 timestamp (inclusive)
            limit: Maximum number of results
            
        Returns:
            List of audit logs sorted by timestamp (newest first)
        """
        logs = []
        
        for file_path in self.base_path.glob("*.json"):
            if len(logs) >= limit:
                break
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    log_data = json.load(f)
                
                # Filter by date if specified
                if start_date or end_date:
                    log_timestamp = log_data.get('timestamp', '')
                    
                    if start_date and log_timestamp < start_date:
                        continue
                    if end_date and log_timestamp > end_date:
                        continue
                
                logs.append(log_data)
                
            except Exception as e:
                logger.warning(f"⚠️  Error reading {file_path.name}: {e}")
        
        # Sort by timestamp, newest first
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        logger.info(f"📋 Listed {len(logs)} audit logs")
        
        return logs
    
    async def delete_audit_log(self, analysis_id: str) -> bool:
        """
        Delete an audit log.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            True if deleted, False if not found
        """
        file_path = self.base_path / f"{analysis_id}.json"
        
        if not file_path.exists():
            logger.warning(f"⚠️  Audit log not found for deletion: {analysis_id}")
            return False
        
        try:
            file_path.unlink()
            logger.info(f"🗑️  Audit log deleted: {analysis_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete audit log: {e}")
            return False
