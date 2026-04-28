"""
AWS Storage Service using DynamoDB and S3.
Production storage backend for audit logs.
"""

import json
import boto3
from typing import Dict, Any, Optional, List
from datetime import datetime
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class AWSStorageService:
    """
    AWS storage service using DynamoDB for metadata and S3 for full logs.
    
    Storage strategy:
    - DynamoDB: Stores metadata and small audit logs (< 400KB)
    - S3: Stores full audit logs for archival and large content
    """
    
    def __init__(self):
        """Initialize AWS clients."""
        self.dynamodb = boto3.resource(
            'dynamodb',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        self.s3 = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        self.table_name = settings.DYNAMODB_TABLE_NAME
        self.bucket_name = settings.S3_BUCKET_NAME
        self.table = self.dynamodb.Table(self.table_name)
        
        logger.info(
            f"☁️  AWS Storage initialized: "
            f"table={self.table_name}, bucket={self.bucket_name}"
        )
    
    async def store_audit_log(self, log_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Store audit log in DynamoDB and S3.
        
        Args:
            log_data: Complete audit log data
            
        Returns:
            Storage result with locations
        """
        analysis_id = log_data['analysis_id']
        timestamp = log_data['timestamp']
        
        try:
            # Add storage metadata
            log_data['stored_at'] = datetime.utcnow().isoformat() + "Z"
            log_data['storage_type'] = 'aws'
            
            # Store in S3 for archival
            s3_key = f"audit_logs/{analysis_id}.json"
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=json.dumps(log_data, indent=2),
                ContentType='application/json'
            )
            
            # Store metadata in DynamoDB
            item = {
                'analysis_id': analysis_id,
                'timestamp': timestamp,
                'stored_at': log_data['stored_at'],
                'risk_level': log_data.get('fairness_result', {}).get('risk_level', 'unknown'),
                'overall_bias': log_data.get('ai_result', {}).get('bias_scores', {}).get('overall', 0),
                'fairness_score': log_data.get('fairness_result', {}).get('fairness_score', 0),
                's3_location': f"s3://{self.bucket_name}/{s3_key}",
                'content_length': len(log_data.get('content', '')),
                'metadata': log_data.get('metadata', {})
            }
            
            self.table.put_item(Item=item)
            
            logger.info(f"✅ Audit log stored in AWS: {analysis_id}")
            
            return {
                "status": "success",
                "location": f"s3://{self.bucket_name}/{s3_key}",
                "dynamodb_table": self.table_name,
                "storage_type": "aws",
                "analysis_id": analysis_id
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to store audit log in AWS: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "storage_type": "aws"
            }
    
    async def retrieve_audit_log(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve audit log from S3.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            Audit log data or None if not found
        """
        try:
            # Get S3 location from DynamoDB
            response = self.table.get_item(Key={'analysis_id': analysis_id})
            
            if 'Item' not in response:
                logger.warning(f"⚠️  Audit log not found in DynamoDB: {analysis_id}")
                return None
            
            s3_location = response['Item'].get('s3_location', '')
            s3_key = s3_location.replace(f"s3://{self.bucket_name}/", "")
            
            # Retrieve from S3
            s3_response = self.s3.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            log_data = json.loads(s3_response['Body'].read())
            
            logger.info(f"✅ Audit log retrieved from AWS: {analysis_id}")
            return log_data
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve audit log from AWS: {e}")
            return None
    
    async def list_audit_logs(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List audit logs from DynamoDB.
        
        Args:
            start_date: ISO 8601 timestamp (inclusive)
            end_date: ISO 8601 timestamp (inclusive)
            limit: Maximum number of results
            
        Returns:
            List of audit log metadata
        """
        try:
            # Scan DynamoDB table
            scan_kwargs = {'Limit': limit}
            
            if start_date or end_date:
                filter_expressions = []
                expression_values = {}
                
                if start_date:
                    filter_expressions.append('timestamp >= :start')
                    expression_values[':start'] = start_date
                
                if end_date:
                    filter_expressions.append('timestamp <= :end')
                    expression_values[':end'] = end_date
                
                if filter_expressions:
                    scan_kwargs['FilterExpression'] = ' AND '.join(filter_expressions)
                    scan_kwargs['ExpressionAttributeValues'] = expression_values
            
            response = self.table.scan(**scan_kwargs)
            items = response.get('Items', [])
            
            # Sort by timestamp
            items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            logger.info(f"📋 Listed {len(items)} audit logs from AWS")
            
            return items
            
        except Exception as e:
            logger.error(f"❌ Failed to list audit logs from AWS: {e}")
            return []
    
    async def delete_audit_log(self, analysis_id: str) -> bool:
        """
        Delete audit log from DynamoDB and S3.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            True if deleted, False if not found
        """
        try:
            # Get S3 location
            response = self.table.get_item(Key={'analysis_id': analysis_id})
            
            if 'Item' not in response:
                logger.warning(f"⚠️  Audit log not found for deletion: {analysis_id}")
                return False
            
            s3_location = response['Item'].get('s3_location', '')
            s3_key = s3_location.replace(f"s3://{self.bucket_name}/", "")
            
            # Delete from S3
            self.s3.delete_object(Bucket=self.bucket_name, Key=s3_key)
            
            # Delete from DynamoDB
            self.table.delete_item(Key={'analysis_id': analysis_id})
            
            logger.info(f"🗑️  Audit log deleted from AWS: {analysis_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete audit log from AWS: {e}")
            return False
