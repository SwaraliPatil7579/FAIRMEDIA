# Deployment Guide

Complete deployment guide for the FAIRMEDIA bias detection system.

## Deployment Options

1. **Local Development** - Run on your machine
2. **EC2 Deployment** - Deploy on AWS EC2 instance
3. **Lambda + API Gateway** - Serverless deployment
4. **Container Deployment** - Docker + ECS/EKS

---

## Option 1: Local Development

### Prerequisites

- Python 3.9+
- Node.js 16+ (for React frontend)
- Git

### Steps

1. **Clone Repository**

```bash
git clone <repository-url>
cd FAIRMEDIA
```

2. **Set Up Python Environment**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure Environment**

```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Run Backend**

```bash
cd backend
python main.py
# Backend runs at http://localhost:8000
```

5. **Run Frontend**

```bash
cd frontend
npm install
npm start
# Frontend runs at http://localhost:3000
```

6. **Test the Application**

```bash
# Open browser to http://localhost:3000
# Or test API directly:
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content for bias analysis"}'
```

---

## Option 2: EC2 Deployment

### Prerequisites

- AWS Account
- EC2 instance (t3.medium or larger recommended)
- Security group allowing ports 80, 443, 8000

### Steps

1. **Launch EC2 Instance**

```bash
# Use Amazon Linux 2 or Ubuntu 22.04
# Instance type: t3.medium (2 vCPU, 4 GB RAM)
# Storage: 20 GB GP3
```

2. **Connect to Instance**

```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

3. **Install Dependencies**

```bash
# Update system
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Python 3.9+
sudo yum install python3.9 -y
# or
sudo apt install python3.9 python3.9-venv -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install nodejs -y
# or
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install nodejs -y

# Install Git
sudo yum install git -y
# or
sudo apt install git -y
```

4. **Clone and Setup Application**

```bash
git clone <repository-url>
cd FAIRMEDIA

# Setup Python environment
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd frontend
npm install
npm run build
cd ..
```

5. **Configure Environment**

```bash
cp .env.example .env
nano .env  # Edit configuration
```

6. **Setup Systemd Service**

Create `/etc/systemd/system/fairmedia.service`:

```ini
[Unit]
Description=FAIRMEDIA Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/FAIRMEDIA
Environment="PATH=/home/ec2-user/FAIRMEDIA/venv/bin"
ExecStart=/home/ec2-user/FAIRMEDIA/venv/bin/python backend/main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

7. **Start Service**

```bash
sudo systemctl daemon-reload
sudo systemctl enable fairmedia
sudo systemctl start fairmedia
sudo systemctl status fairmedia
```

8. **Setup Nginx (Optional)**

```bash
sudo yum install nginx -y
# or
sudo apt install nginx -y

# Configure Nginx
sudo nano /etc/nginx/conf.d/fairmedia.conf
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /home/ec2-user/FAIRMEDIA/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Option 3: Lambda + API Gateway (Serverless)

### Prerequisites

- AWS CLI configured
- AWS SAM CLI (optional)
- Docker (for building Lambda layers)

### Steps

1. **Prepare Lambda Package**

```bash
# Create deployment package
cd backend
pip install -r ../requirements.txt -t ./package
cd package
zip -r ../fairmedia-lambda.zip .
cd ..
zip -g fairmedia-lambda.zip -r . -x "package/*" "*.pyc" "__pycache__/*"
```

2. **Create Lambda Function**

```bash
aws lambda create-function \
    --function-name fairmedia-analyzer \
    --runtime python3.9 \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/FairMediaLambdaRole \
    --handler aws.lambda_handler.lambda_handler \
    --zip-file fileb://fairmedia-lambda.zip \
    --timeout 60 \
    --memory-size 1024 \
    --environment Variables="{STORAGE_MODE=aws,AWS_REGION=us-east-1}"
```

3. **Create API Gateway**

```bash
# Create REST API
aws apigateway create-rest-api \
    --name FairMediaAPI \
    --description "FAIRMEDIA Bias Detection API" \
    --endpoint-configuration types=REGIONAL

# Get API ID
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='FairMediaAPI'].id" --output text)

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)

# Create /analyze resource
aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part analyze

# Configure POST method
# (Follow AWS documentation for detailed API Gateway setup)
```

4. **Deploy Frontend to S3 + CloudFront**

```bash
# Build frontend
cd frontend
npm run build

# Create S3 bucket for static hosting
aws s3 mb s3://fairmedia-frontend
aws s3 website s3://fairmedia-frontend --index-document index.html

# Upload build
aws s3 sync build/ s3://fairmedia-frontend/

# Create CloudFront distribution (optional)
# (Follow AWS documentation)
```

---

## Option 4: Docker Deployment

### Prerequisites

- Docker installed
- Docker Compose installed

### Steps

1. **Create Dockerfile**

Create `Dockerfile` in project root:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ ./backend/
COPY schemas/ ./schemas/
COPY services/ ./services/

# Expose port
EXPOSE 8000

# Run application
CMD ["python", "backend/main.py"]
```

2. **Create Docker Compose**

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - STORAGE_MODE=local
      - API_HOST=0.0.0.0
      - API_PORT=8000
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  frontend:
    image: node:16-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "3000:3000"
    command: sh -c "npm install && npm start"
    restart: unless-stopped
```

3. **Build and Run**

```bash
docker-compose up -d
```

4. **Deploy to ECS (Optional)**

```bash
# Push to ECR
aws ecr create-repository --repository-name fairmedia
docker tag fairmedia:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fairmedia:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fairmedia:latest

# Create ECS cluster and service
# (Follow AWS ECS documentation)
```

---

## Post-Deployment

### 1. Health Check

```bash
curl http://your-domain.com/health
```

### 2. Test Analysis

```bash
curl -X POST http://your-domain.com/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The CEO announced that his company will hire more female engineers.",
    "language": "en"
  }'
```

### 3. Monitor Logs

```bash
# Local/EC2
tail -f /var/log/fairmedia.log

# Lambda
aws logs tail /aws/lambda/fairmedia-analyzer --follow

# Docker
docker-compose logs -f
```

### 4. Setup Monitoring

- Configure CloudWatch alarms
- Set up error notifications
- Monitor API latency and throughput

### 5. Backup Strategy

- DynamoDB: Enable point-in-time recovery
- S3: Enable versioning and lifecycle policies
- Database: Regular snapshots

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
journalctl -u fairmedia -n 50

# Check port availability
sudo netstat -tulpn | grep 8000

# Check Python environment
source venv/bin/activate
python -c "import fastapi; print('OK')"
```

### Frontend Build Fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 16+
```

### AWS Services Not Working

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test Bedrock access
aws bedrock list-foundation-models

# Test DynamoDB
aws dynamodb describe-table --table-name fairmedia-audit-logs
```

---

## Rollback Procedure

### EC2/Local

```bash
git checkout previous-version
sudo systemctl restart fairmedia
```

### Lambda

```bash
# List versions
aws lambda list-versions-by-function --function-name fairmedia-analyzer

# Rollback to previous version
aws lambda update-alias \
    --function-name fairmedia-analyzer \
    --name production \
    --function-version PREVIOUS_VERSION
```

---

## Security Checklist

- [ ] HTTPS enabled (SSL/TLS certificate)
- [ ] API authentication configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] AWS IAM roles follow least privilege
- [ ] Secrets stored in AWS Secrets Manager
- [ ] Security groups properly configured
- [ ] Logging and monitoring enabled
- [ ] Regular security updates scheduled

---

## Performance Optimization

1. **Enable caching** for repeated analyses
2. **Use CDN** (CloudFront) for frontend
3. **Optimize Lambda** memory and timeout
4. **Enable DynamoDB** auto-scaling
5. **Use connection pooling** for database
6. **Implement request queuing** for high load

---

## Support

For issues or questions:
- Check logs first
- Review AWS CloudWatch metrics
- Consult AWS documentation
- Contact support team
