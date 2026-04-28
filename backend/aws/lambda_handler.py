"""
AWS Lambda handler for serverless deployment.
Entry point for Lambda function execution.
"""

import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.controller.pipeline_controller import PipelineController
from schemas.request_schema import AnalyzeRequest
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize controller (reused across invocations)
controller = PipelineController()


def lambda_handler(event, context):
    """
    AWS Lambda handler function.
    
    Args:
        event: Lambda event object
        context: Lambda context object
        
    Returns:
        API Gateway response
    """
    request_id = getattr(context, "aws_request_id", None)
    logger.info(f"🚀 Lambda invoked: {request_id}")
    
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Create request object
        request = AnalyzeRequest(**body)
        
        # Execute pipeline (note: Lambda doesn't support async directly)
        # You'll need to use asyncio.run() or make the handler async
        import asyncio
        result = asyncio.run(controller.execute_pipeline(request))
        
        # Return success response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(result.model_dump())
        }
        
    except ValueError as e:
        logger.error(f"❌ Validation error: {e}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': str(e)
                }
            })
        }
        
    except Exception as e:
        logger.error(f"❌ Lambda execution failed: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Analysis failed',
                    'details': str(e)
                }
            })
        }


def health_check_handler(event, context):
    """Health check Lambda handler."""
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'status': 'healthy',
            'service': 'fairmedia-lambda',
            'version': '1.0.0'
        })
    }
