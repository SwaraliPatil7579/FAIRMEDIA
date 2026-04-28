"""
Google Vertex AI client for ML-based bias detection.
"""

from google.cloud import aiplatform
from google.cloud.aiplatform.gapic.schema import predict
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class VertexAIClient:
    """Client for Google Vertex AI model predictions."""
    
    def __init__(
        self,
        project_id: str,
        location: str = "us-central1",
        endpoint_id: Optional[str] = None
    ):
        """
        Initialize Vertex AI client.
        
        Args:
            project_id: Google Cloud project ID
            location: GCP region
            endpoint_id: Deployed model endpoint ID
        """
        aiplatform.init(project=project_id, location=location)
        
        self.project_id = project_id
        self.location = location
        self.endpoint_id = endpoint_id
        self.endpoint = None
        
        if endpoint_id:
            self.endpoint = aiplatform.Endpoint(endpoint_name=endpoint_id)
        
        logger.info(f"☁️  Vertex AI client initialized: {project_id}/{location}")
    
    async def predict_bias(
        self,
        text: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Predict bias scores using Vertex AI model.
        
        Args:
            text: Input text to analyze
            language: Language code
            
        Returns:
            Prediction results with bias scores
        """
        if not self.endpoint:
            raise ValueError("Endpoint not configured. Deploy a model first.")
        
        try:
            instances = [{
                "content": text,
                "language": language
            }]
            
            prediction = self.endpoint.predict(instances=instances)
            
            result = {
                "bias_scores": {
                    "overall": prediction.predictions[0].get("overall_bias", 0.0),
                    "gender_bias": prediction.predictions[0].get("gender_bias", 0.0),
                    "stereotype": prediction.predictions[0].get("stereotype", 0.0),
                    "language_dominance": prediction.predictions[0].get("language_dominance", 0.0)
                },
                "confidence": prediction.predictions[0].get("confidence", 0.0),
                "model_version": prediction.model_version_id,
                "model_resource_name": prediction.model_resource_name
            }
            
            logger.info(f"✅ Vertex AI prediction completed: overall_bias={result['bias_scores']['overall']:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Vertex AI prediction failed: {e}")
            raise
    
    async def batch_predict(
        self,
        texts: list,
        language: str = "en"
    ) -> list:
        """
        Batch prediction for multiple texts.
        
        Args:
            texts: List of texts to analyze
            language: Language code
            
        Returns:
            List of prediction results
        """
        if not self.endpoint:
            raise ValueError("Endpoint not configured")
        
        try:
            instances = [
                {"content": text, "language": language}
                for text in texts
            ]
            
            prediction = self.endpoint.predict(instances=instances)
            
            results = []
            for pred in prediction.predictions:
                results.append({
                    "bias_scores": {
                        "overall": pred.get("overall_bias", 0.0),
                        "gender_bias": pred.get("gender_bias", 0.0),
                        "stereotype": pred.get("stereotype", 0.0),
                        "language_dominance": pred.get("language_dominance", 0.0)
                    },
                    "confidence": pred.get("confidence", 0.0)
                })
            
            logger.info(f"✅ Batch prediction completed: {len(results)} texts")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Batch prediction failed: {e}")
            raise
