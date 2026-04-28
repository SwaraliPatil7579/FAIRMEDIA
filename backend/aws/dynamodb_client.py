"""
AWS DynamoDB client for audit log storage.
"""

import boto3
from typing import Dict, Any, Optional, List
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class DynamoDBClient:
    """Client for DynamoDB operations."""
    
    def __init__(self, table_name: str = None):
        """
        Initialize DynamoDB client.
        
        Args:
            table_name: DynamoDB table name (defaults to settings)
        """
        self.dynamodb = boto3.resource(
            'dynamodb',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        self.table_name = table_name or settings.DYNAMODB_TABLE_NAME
        self.table = self.dynamodb.Table(self.table_name)
        
        logger.info(f"☁️  DynamoDB client initialized: {self.table_name}")
    
    def put_item(self, item: Dict[str, Any]) -> bool:
        """
        Put an item into DynamoDB.
        
        Args:
            item: Item dictionary
            
        Returns:
            True if successful
        """
        try:
            self.table.put_item(Item=item)
            logger.info(f"✅ Item stored in DynamoDB: {item.get('analysis_id', 'unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to put item: {e}")
            return False
    
    def get_item(self, key: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get an item from DynamoDB.
        
        Args:
            key: Primary key dictionary
            
        Returns:
            Item dictionary or None
        """
        try:
            response = self.table.get_item(Key=key)
            item = response.get('Item')
            
            if item:
                logger.info(f"✅ Item retrieved from DynamoDB")
            else:
                logger.warning(f"⚠️  Item not found in DynamoDB")
            
            return item
            
        except Exception as e:
            logger.error(f"❌ Failed to get item: {e}")
            return None
    
    def query_items(
        self,
        key_condition: str,
        expression_values: Dict[str, Any],
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Query items from DynamoDB.
        
        Args:
            key_condition: Key condition expression
            expression_values: Expression attribute values
            limit: Maximum items to return
            
        Returns:
            List of items
        """
        try:
            response = self.table.query(
                KeyConditionExpression=key_condition,
                ExpressionAttributeValues=expression_values,
                Limit=limit
            )
            
            items = response.get('Items', [])
            logger.info(f"✅ Query returned {len(items)} items")
            
            return items
            
        except Exception as e:
            logger.error(f"❌ Failed to query items: {e}")
            return []
    
    def scan_items(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Scan all items from DynamoDB.
        
        Args:
            limit: Maximum items to return
            
        Returns:
            List of items
        """
        try:
            response = self.table.scan(Limit=limit)
            items = response.get('Items', [])
            
            logger.info(f"✅ Scan returned {len(items)} items")
            
            return items
            
        except Exception as e:
            logger.error(f"❌ Failed to scan items: {e}")
            return []
    
    def delete_item(self, key: Dict[str, Any]) -> bool:
        """
        Delete an item from DynamoDB.
        
        Args:
            key: Primary key dictionary
            
        Returns:
            True if successful
        """
        try:
            self.table.delete_item(Key=key)
            logger.info(f"🗑️  Item deleted from DynamoDB")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete item: {e}")
            return False
