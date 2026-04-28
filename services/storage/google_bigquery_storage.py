"""
Google BigQuery storage service for analytics and audit logs.
"""

from google.cloud import bigquery
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class BigQueryStorageService:
    """
    BigQuery storage service for bias analysis audit logs and analytics.
    
    Storage strategy:
    - Store all analysis results in BigQuery for analytics
    - Enable SQL-based querying and reporting
    - Support time-series analysis of bias trends
    """
    
    def __init__(self, project_id: str, dataset_id: str = "fairmedia"):
        """
        Initialize BigQuery client.
        
        Args:
            project_id: Google Cloud project ID
            dataset_id: BigQuery dataset ID
        """
        self.client = bigquery.Client(project=project_id)
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.table_id = f"{project_id}.{dataset_id}.bias_audit_logs"
        
        # Ensure dataset and table exist
        self._ensure_dataset_exists()
        self._ensure_table_exists()
        
        logger.info(f"☁️  BigQuery storage initialized: {self.table_id}")
    
    def _ensure_dataset_exists(self):
        """Create dataset if it doesn't exist."""
        try:
            self.client.get_dataset(self.dataset_id)
        except Exception:
            dataset = bigquery.Dataset(f"{self.project_id}.{self.dataset_id}")
            dataset.location = "US"
            self.client.create_dataset(dataset)
            logger.info(f"✅ Created BigQuery dataset: {self.dataset_id}")
    
    def _ensure_table_exists(self):
        """Create table if it doesn't exist."""
        try:
            self.client.get_table(self.table_id)
        except Exception:
            schema = [
                bigquery.SchemaField("analysis_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
                bigquery.SchemaField("content_length", "INTEGER"),
                bigquery.SchemaField("language", "STRING"),
                bigquery.SchemaField("overall_bias", "FLOAT"),
                bigquery.SchemaField("gender_bias", "FLOAT"),
                bigquery.SchemaField("stereotype", "FLOAT"),
                bigquery.SchemaField("language_dominance", "FLOAT"),
                bigquery.SchemaField("risk_level", "STRING"),
                bigquery.SchemaField("fairness_score", "FLOAT"),
                bigquery.SchemaField("confidence", "FLOAT"),
                bigquery.SchemaField("processing_time_ms", "INTEGER"),
                bigquery.SchemaField("storage_type", "STRING"),
            ]
            
            table = bigquery.Table(self.table_id, schema=schema)
            table = self.client.create_table(table)
            logger.info(f"✅ Created BigQuery table: {self.table_id}")
    
    async def store_audit_log(self, log_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Store audit log in BigQuery.
        
        Args:
            log_data: Complete audit log data
            
        Returns:
            Storage result
        """
        try:
            # Extract relevant fields
            ai_result = log_data.get('ai_result', {})
            fairness_result = log_data.get('fairness_result', {})
            bias_scores = ai_result.get('bias_scores', {})
            
            row = {
                "analysis_id": log_data['analysis_id'],
                "timestamp": log_data['timestamp'],
                "content_length": len(log_data.get('content', '')),
                "language": log_data.get('metadata', {}).get('language', 'unknown'),
                "overall_bias": bias_scores.get('overall', 0.0),
                "gender_bias": bias_scores.get('gender_bias', 0.0),
                "stereotype": bias_scores.get('stereotype', 0.0),
                "language_dominance": bias_scores.get('language_dominance', 0.0),
                "risk_level": fairness_result.get('risk_level', 'unknown'),
                "fairness_score": fairness_result.get('fairness_score', 0.0),
                "confidence": ai_result.get('confidence', 0.0),
                "processing_time_ms": log_data.get('processing_time_ms', 0),
                "storage_type": "bigquery"
            }
            
            errors = self.client.insert_rows_json(self.table_id, [row])
            
            if errors:
                logger.error(f"❌ BigQuery insert errors: {errors}")
                return {
                    "status": "failed",
                    "error": str(errors),
                    "storage_type": "bigquery"
                }
            
            logger.info(f"✅ Audit log stored in BigQuery: {log_data['analysis_id']}")
            
            return {
                "status": "success",
                "location": self.table_id,
                "storage_type": "bigquery",
                "analysis_id": log_data['analysis_id']
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to store in BigQuery: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "storage_type": "bigquery"
            }
    
    async def retrieve_audit_log(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve audit log by analysis ID.
        
        Args:
            analysis_id: UUID of the analysis
            
        Returns:
            Audit log data or None
        """
        try:
            query = f"""
            SELECT *
            FROM `{self.table_id}`
            WHERE analysis_id = @analysis_id
            LIMIT 1
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("analysis_id", "STRING", analysis_id)
                ]
            )
            
            query_job = self.client.query(query, job_config=job_config)
            results = list(query_job)
            
            if results:
                logger.info(f"✅ Audit log retrieved from BigQuery: {analysis_id}")
                return dict(results[0])
            
            logger.warning(f"⚠️  Audit log not found in BigQuery: {analysis_id}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve from BigQuery: {e}")
            return None
    
    async def get_bias_trends(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get bias trends over time.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            List of daily bias statistics
        """
        try:
            query = f"""
            SELECT
                DATE(timestamp) as date,
                AVG(overall_bias) as avg_bias,
                AVG(fairness_score) as avg_fairness,
                COUNT(*) as analysis_count,
                risk_level,
                AVG(gender_bias) as avg_gender_bias,
                AVG(stereotype) as avg_stereotype,
                AVG(language_dominance) as avg_language_dominance
            FROM `{self.table_id}`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
            GROUP BY date, risk_level
            ORDER BY date DESC
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("days", "INT64", days)
                ]
            )
            
            query_job = self.client.query(query, job_config=job_config)
            results = [dict(row) for row in query_job]
            
            logger.info(f"✅ Retrieved bias trends: {len(results)} data points")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Failed to get bias trends: {e}")
            return []
    
    async def get_risk_distribution(self) -> Dict[str, int]:
        """
        Get distribution of risk levels.
        
        Returns:
            Dictionary with risk level counts
        """
        try:
            query = f"""
            SELECT
                risk_level,
                COUNT(*) as count
            FROM `{self.table_id}`
            GROUP BY risk_level
            ORDER BY count DESC
            """
            
            query_job = self.client.query(query)
            results = {row['risk_level']: row['count'] for row in query_job}
            
            logger.info(f"✅ Retrieved risk distribution: {results}")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Failed to get risk distribution: {e}")
            return {}
    
    async def get_language_statistics(self) -> List[Dict[str, Any]]:
        """
        Get bias statistics by language.
        
        Returns:
            List of language-specific statistics
        """
        try:
            query = f"""
            SELECT
                language,
                COUNT(*) as analysis_count,
                AVG(overall_bias) as avg_bias,
                AVG(fairness_score) as avg_fairness,
                AVG(language_dominance) as avg_language_dominance
            FROM `{self.table_id}`
            GROUP BY language
            ORDER BY analysis_count DESC
            """
            
            query_job = self.client.query(query)
            results = [dict(row) for row in query_job]
            
            logger.info(f"✅ Retrieved language statistics: {len(results)} languages")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Failed to get language statistics: {e}")
            return []
