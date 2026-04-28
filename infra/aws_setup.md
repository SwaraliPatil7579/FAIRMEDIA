# AWS Infrastructure Setup Guide

This guide walks you through setting up the AWS infrastructure for the FAIRMEDIA bias detection system.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Python 3.9+ installed
- Terraform (optional, for infrastructure as code)

## Required AWS Services

1. **AWS Bedrock** - AI model inference
2. **DynamoDB** - Audit log metadata storage
3. **S3** - Full audit log storage
4. **Lambda** (optional) - Serverless deployment
5. **API Gateway** (optional) - HTTP API endpoint
6. **IAM** - Access management

## Step 1: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter output format (json)
```

## Step 2: Create DynamoDB Table

```bash
aws dynamodb create-table \
    --table-name fairmedia-audit-logs \
    --attribute-definitions \
        AttributeName=analysis_id,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=analysis_id,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### Table Schema

- **Primary Key**: `analysis_id` (String, Hash Key)
- **Sort Key**: `timestamp` (String, Range Key)
- **Attributes**:
  - `stored_at` - When the log was stored
  - `risk_level` - Risk assessment (low, medium, high, critical)
  - `overall_bias` - Overall bias score
  - `fairness_score` - Fairness score
  - `s3_location` - S3 URI for full log
  - `content_length` - Length of analyzed content
  - `metadata` - Additional metadata

## Step 3: Create S3 Bucket

```bash
aws s3 mb s3://fairmedia-logs --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket fairmedia-logs \
    --versioning-configuration Status=Enabled

# Set lifecycle policy (optional - archive old logs)
aws s3api put-bucket-lifecycle-configuration \
    --bucket fairmedia-logs \
    --lifecycle-configuration file://s3-lifecycle.json
```

### S3 Lifecycle Policy (s3-lifecycle.json)

```json
{
  "Rules": [
    {
      "Id": "ArchiveOldLogs",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

## Step 4: Enable AWS Bedrock

1. Go to AWS Console → Bedrock
2. Request access to foundation models:
   - Anthropic Claude
   - Amazon Titan
   - Other models as needed
3. Wait for approval (usually instant for Claude)

### Test Bedrock Access

```bash
aws bedrock list-foundation-models --region us-east-1
```

## Step 5: Create IAM Role and Policy

### IAM Policy (fairmedia-policy.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/fairmedia-audit-logs"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::fairmedia-logs",
        "arn:aws:s3:::fairmedia-logs/*"
      ]
    }
  ]
}
```

### Create Policy and Role

```bash
# Create policy
aws iam create-policy \
    --policy-name FairMediaPolicy \
    --policy-document file://fairmedia-policy.json

# Create role (for Lambda)
aws iam create-role \
    --role-name FairMediaLambdaRole \
    --assume-role-policy-document file://trust-policy.json

# Attach policy to role
aws iam attach-role-policy \
    --role-name FairMediaLambdaRole \
    --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/FairMediaPolicy
```

## Step 6: Deploy Lambda Function (Optional)

```bash
# Package the application
cd backend
zip -r ../fairmedia-lambda.zip . -x "*.pyc" -x "__pycache__/*"

# Create Lambda function
aws lambda create-function \
    --function-name fairmedia-analyzer \
    --runtime python3.9 \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/FairMediaLambdaRole \
    --handler aws.lambda_handler.lambda_handler \
    --zip-file fileb://../fairmedia-lambda.zip \
    --timeout 60 \
    --memory-size 512 \
    --environment Variables="{STORAGE_MODE=aws,AWS_REGION=us-east-1}"
```

## Step 7: Create API Gateway (Optional)

```bash
# Create REST API
aws apigateway create-rest-api \
    --name FairMediaAPI \
    --description "FAIRMEDIA Bias Detection API"

# Configure API Gateway to trigger Lambda
# (Follow AWS documentation for detailed steps)
```

## Step 8: Configure Environment Variables

Create `.env` file in project root:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Storage
STORAGE_MODE=aws
DYNAMODB_TABLE_NAME=fairmedia-audit-logs
S3_BUCKET_NAME=fairmedia-logs

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

## Step 9: Test the Setup

```bash
# Test DynamoDB
python -c "import boto3; print(boto3.resource('dynamodb').Table('fairmedia-audit-logs').table_status)"

# Test S3
aws s3 ls s3://fairmedia-logs

# Test Bedrock
python -c "import boto3; print(len(boto3.client('bedrock').list_foundation_models()['modelSummaries']))"
```

## Cost Estimation

### Monthly Costs (Approximate)

- **DynamoDB**: $0-5 (on-demand pricing, depends on usage)
- **S3**: $0.023/GB stored + $0.0004/1000 requests
- **Bedrock**: $0.01-0.03 per 1000 tokens (varies by model)
- **Lambda**: $0.20 per 1M requests + compute time
- **API Gateway**: $3.50 per million requests

**Estimated Total**: $10-50/month for moderate usage

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible
2. **Enable S3 bucket encryption** at rest
3. **Enable DynamoDB encryption** at rest
4. **Use VPC endpoints** for private connectivity
5. **Enable CloudTrail** for audit logging
6. **Rotate credentials** regularly
7. **Use least privilege** IAM policies

## Monitoring and Logging

### Enable CloudWatch Logs

```bash
# For Lambda
aws logs create-log-group --log-group-name /aws/lambda/fairmedia-analyzer

# Set retention
aws logs put-retention-policy \
    --log-group-name /aws/lambda/fairmedia-analyzer \
    --retention-in-days 30
```

### Create CloudWatch Dashboard

Monitor:
- Lambda invocations and errors
- DynamoDB read/write capacity
- S3 bucket size and requests
- Bedrock API calls and latency

## Troubleshooting

### Common Issues

1. **Bedrock Access Denied**
   - Ensure model access is approved in Bedrock console
   - Check IAM permissions

2. **DynamoDB Throttling**
   - Switch to provisioned capacity
   - Increase read/write capacity units

3. **Lambda Timeout**
   - Increase timeout setting (max 15 minutes)
   - Optimize code performance

4. **S3 Access Denied**
   - Check bucket policy
   - Verify IAM role permissions

## Cleanup

To remove all resources:

```bash
# Delete Lambda function
aws lambda delete-function --function-name fairmedia-analyzer

# Delete DynamoDB table
aws dynamodb delete-table --table-name fairmedia-audit-logs

# Delete S3 bucket (must be empty first)
aws s3 rm s3://fairmedia-logs --recursive
aws s3 rb s3://fairmedia-logs

# Delete IAM resources
aws iam detach-role-policy --role-name FairMediaLambdaRole --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/FairMediaPolicy
aws iam delete-role --role-name FairMediaLambdaRole
aws iam delete-policy --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/FairMediaPolicy
```

## Next Steps

- Review [deployment_steps.md](./deployment_steps.md) for application deployment
- Configure monitoring and alerts
- Set up CI/CD pipeline
- Implement backup and disaster recovery
