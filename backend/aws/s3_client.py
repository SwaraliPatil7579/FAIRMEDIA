"""
AWS S3 client for file storage.
"""

import json
import boto3
from typing import Dict, Any, Optional
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class S3Client:
    """Client for S3 operations."""
    
    def __init__(self, bucket_name: str = None):
        """
        Initialize S3 client.
        
        Args:
            bucket_name: S3 bucket name (defaults to settings)
        """
        self.s3 = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        self.bucket_name = bucket_name or settings.S3_BUCKET_NAME
        
        logger.info(f"☁️  S3 client initialized: {self.bucket_name}")
    
    def put_object(
        self,
        key: str,
        data: Any,
        content_type: str = 'application/json'
    ) -> bool:
        """
        Put an object into S3.
        
        Args:
            key: Object key (path)
            data: Data to store (will be JSON-encoded if dict)
            content_type: Content type
            
        Returns:
            True if successful
        """
        try:
            body = json.dumps(data) if isinstance(data, dict) else data
            
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=body,
                ContentType=content_type
            )
            
            logger.info(f"✅ Object stored in S3: {key}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to put object: {e}")
            return False
    
    def get_object(self, key: str) -> Optional[Any]:
        """
        Get an object from S3.
        
        Args:
            key: Object key (path)
            
        Returns:
            Object data or None
        """
        try:
            response = self.s3.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            data = response['Body'].read()
            
            # Try to parse as JSON
            try:
                data = json.loads(data)
            except:
                pass
            
            logger.info(f"✅ Object retrieved from S3: {key}")
            return data
            
        except Exception as e:
            logger.error(f"❌ Failed to get object: {e}")
            return None
    
    def delete_object(self, key: str) -> bool:
        """
        Delete an object from S3.
        
        Args:
            key: Object key (path)
            
        Returns:
            True if successful
        """
        try:
            self.s3.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            logger.info(f"🗑️  Object deleted from S3: {key}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete object: {e}")
            return False
    
    def list_objects(self, prefix: str = '') -> list:
        """
        List objects in S3 bucket.
        
        Args:
            prefix: Key prefix to filter
            
        Returns:
            List of object keys
        """
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            objects = [obj['Key'] for obj in response.get('Contents', [])]
            
            logger.info(f"📋 Found {len(objects)} objects in S3")
            
            return objects
            
        except Exception as e:
            logger.error(f"❌ Failed to list objects: {e}")
            return []
    
    def generate_presigned_url(
        self,
        key: str,
        expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate a presigned URL for object access.
        
        Args:
            key: Object key
            expiration: URL expiration in seconds
            
        Returns:
            Presigned URL or None
        """
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=expiration
            )
            
            logger.info(f"✅ Presigned URL generated for: {key}")
            return url
            
        except Exception as e:
            logger.error(f"❌ Failed to generate presigned URL: {e}")
            return None
