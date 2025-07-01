# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the MovieRec application across different environments. The deployment process involves both AWS infrastructure setup and frontend application deployment.

## Prerequisites

### Required Tools
- **Node.js 18+** - Runtime environment
- **AWS CLI** - AWS command line interface
- **AWS CDK CLI** - Infrastructure as Code tool
- **Git** - Version control

### AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI configured with credentials
- CDK bootstrapped in target region (eu-north-1)

### Required Credentials
- **TMDB API Key** - For movie/TV data
- **AWS Access Keys** - For infrastructure deployment
- **Domain** - For custom domain setup (optional)

## Environment Setup

### 1. Install Dependencies

```bash
# Clone repository
git clone https://github.com/your-org/movierec.git
cd movierec

# Install main dependencies
npm install

# Install infrastructure dependencies
cd infrastructure
npm install
cd ..

# Install test dependencies
cd tests
npm install
cd ..
```

### 2. Environment Variables

Create `.env` file in project root:
```bash
# TMDB API (Required)
REACT_APP_TMDB_API_KEY=your_tmdb_api_key

# AWS Cognito (Will be provided after infrastructure deployment)
REACT_APP_COGNITO_USER_POOL_ID=
REACT_APP_COGNITO_CLIENT_ID=

# API Gateway (Will be provided after infrastructure deployment)
REACT_APP_API_GATEWAY_INVOKE_URL=

# OAuth Redirects
REACT_APP_REDIRECT_SIGN_IN=https://yourdomain.com/
REACT_APP_REDIRECT_SIGN_OUT=https://yourdomain.com/

# Optional
REACT_APP_FANART_TV_API_KEY=your_fanart_api_key
```

### 3. AWS Configuration

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity

# Bootstrap CDK (if not done previously)
cd infrastructure
npx cdk bootstrap
cd ..
```

## Deployment Procedures

### Option 1: Full Infrastructure Deployment (Recommended)

#### Step 1: Deploy AWS Infrastructure

```bash
# Review infrastructure changes
npm run deploy:diff

# Deploy infrastructure
npm run deploy:infrastructure
```

**Expected Output:**
```
✅  MovieRecStack

Outputs:
MovieRecStack.ApiGatewayUrl = https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod/
MovieRecStack.UserPoolId = eu-north-1_xxxxxxxxx
MovieRecStack.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx

Stack ARN:
arn:aws:cloudformation:eu-north-1:xxxxxxxxxxxx:stack/MovieRecStack/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Step 2: Update Environment Variables

Update `.env` with the deployed infrastructure outputs:
```bash
REACT_APP_COGNITO_USER_POOL_ID=eu-north-1_xxxxxxxxx
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_API_GATEWAY_INVOKE_URL=https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod/
```

#### Step 3: Deploy Frontend

**Option A: AWS Amplify (Recommended)**
1. Connect GitHub repository to AWS Amplify
2. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
   ```
3. Add environment variables in Amplify console
4. Deploy automatically on git push

**Option B: Manual Build and Upload**
```bash
# Build production assets
npm run build

# Upload to S3 or hosting service
aws s3 sync dist/ s3://your-bucket-name --delete
```

### Option 2: Serverless Framework Deployment

#### Step 1: Deploy with Serverless

```bash
# Deploy all functions and tables
serverless deploy --stage prod

# Deploy only tables (if needed)
serverless deploy --config tables-only.yml --stage prod
```

#### Step 2: Configure API Gateway (if needed)
```bash
# Create API Gateway manually or use CDK for complex routing
npm run deploy:infrastructure
```

## Environment-Specific Deployments

### Development Environment

```bash
# Start local development
npm run dev

# Or start components separately
npm run dev:frontend    # Frontend on port 3000
npm run dev:backend     # Backend on port 3001

# Check status
npm run dev:status
```

**Local Environment Variables:**
```bash
REACT_APP_API_GATEWAY_INVOKE_URL=http://localhost:3001
REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000/
```

### Staging Environment

```bash
# Deploy infrastructure to staging
cd infrastructure
npx cdk deploy --context stage=staging
cd ..

# Deploy frontend to staging domain
# (Configure in AWS Amplify or hosting service)
```

### Production Environment

```bash
# Review changes before deployment
npm run deploy:diff

# Deploy infrastructure
npm run deploy:infrastructure

# Run post-deployment tests
npm run test:aws

# Deploy frontend (automatic via Amplify)
git push origin main
```

## Verification and Testing

### Infrastructure Verification

```bash
# Verify AWS resources
aws cloudformation describe-stacks --stack-name MovieRecStack

# Test API endpoints
npm run test:api

# Test AWS services
npm run test:aws
```

### Frontend Verification

```bash
# Build and test locally
npm run build
npm start

# Check production build
cd dist && python -m http.server 8080
```

### End-to-End Testing

```bash
# Run comprehensive tests
npm run test

# Test API endpoints specifically
npm run test:api

# Test AWS integrations
npm run test:aws:endpoints
```

## Domain and SSL Setup

### Custom Domain Configuration

#### Step 1: Domain Registration
- Register domain with Route 53 or external provider
- Configure DNS to point to Amplify/CloudFront

#### Step 2: SSL Certificate
```bash
# Request ACM certificate (must be in us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name movierec.net \
  --subject-alternative-names www.movierec.net \
  --validation-method DNS \
  --region us-east-1
```

#### Step 3: Configure in Amplify
1. Go to AWS Amplify Console
2. Select your app
3. Domain management → Add domain
4. Follow verification steps

### CORS Updates for New Domain

Update `serverless.yml` and CDK configuration:
```yaml
# serverless.yml
cors:
  origins:
    - https://yourdomain.com
    - https://www.yourdomain.com
    - http://localhost:3000
```

```typescript
// infrastructure/lib/infrastructure-stack.ts
api.addCorsPreflight('/**', {
  allowOrigins: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'http://localhost:3000'
  ]
});
```

## Monitoring Setup

### CloudWatch Dashboards

```bash
# Deploy monitoring dashboard
aws cloudwatch put-dashboard \
  --dashboard-name MovieRecDashboard \
  --dashboard-body file://monitoring/dashboard.json
```

### Log Aggregation

```bash
# Create log insights queries
aws logs create-log-group --log-group-name /aws/lambda/movierec-app
```

### Alerts Configuration

```bash
# Set up CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "MovieRec-HighErrorRate" \
  --alarm-description "High error rate detected" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Rollback Procedures

### Infrastructure Rollback

```bash
# Rollback CDK deployment
cd infrastructure
npx cdk deploy --rollback
cd ..

# Or destroy and redeploy previous version
npx cdk destroy
git checkout previous-version
npx cdk deploy
```

### Application Rollback

```bash
# Amplify rollback via console or CLI
aws amplify start-deployment \
  --app-id your-app-id \
  --branch-name main \
  --job-id previous-job-id
```

### Database Rollback

```bash
# Point-in-time recovery (if needed)
aws dynamodb restore-table-to-point-in-time \
  --source-table-name UserPreferences \
  --target-table-name UserPreferences-Restored \
  --restore-date-time 2024-01-01T12:00:00Z
```

## Troubleshooting

### Common Deployment Issues

#### CDK Bootstrap Not Found
```bash
# Solution: Bootstrap CDK in target region
npx cdk bootstrap aws://ACCOUNT-NUMBER/eu-north-1
```

#### Permission Denied Errors
```bash
# Solution: Check IAM permissions
aws iam get-user
aws sts get-caller-identity

# Ensure user has required permissions:
# - CloudFormation full access
# - Lambda full access
# - DynamoDB full access
# - API Gateway full access
# - IAM role creation
```

#### Environment Variables Not Loading
```bash
# Solution: Verify .env file location and format
cat .env

# Ensure no spaces around = signs
# Verify file is in project root
# Check for BOM or encoding issues
```

#### CORS Issues After Deployment
```bash
# Solution: Update CORS configuration and redeploy
npm run deploy:infrastructure

# Verify API Gateway CORS settings
aws apigateway get-resources --rest-api-id YOUR-API-ID
```

### Debugging Tools

```bash
# Check AWS resources
aws cloudformation describe-stack-events --stack-name MovieRecStack

# Monitor Lambda logs
aws logs tail /aws/lambda/movierec-signin --follow

# Test API endpoints
curl -X GET https://your-api-url/recommendations \
  -H "Authorization: Bearer YOUR-JWT-TOKEN"
```

### Health Checks

```bash
# API health check
curl https://your-api-url/health

# Database connectivity
npm run test:aws:dynamodb

# Authentication flow
npm run test:auth
```

## Post-Deployment Tasks

### 1. Security Review
- Review IAM permissions
- Verify CORS settings
- Check CloudWatch logs for errors
- Validate SSL certificate

### 2. Performance Optimization
- Monitor Lambda cold starts
- Check DynamoDB read/write patterns
- Optimize bundle sizes
- Enable CloudFront caching

### 3. User Acceptance Testing
- Test user registration flow
- Verify recommendation engine
- Check favorites/watchlist functionality
- Test responsive design

### 4. Documentation Updates
- Update API documentation
- Record configuration changes
- Document custom domain setup
- Update team runbooks

## Automation Scripts

### Deployment Script (`deploy.sh`)
```bash
#!/bin/bash
set -e

echo "Starting MovieRec deployment..."

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "AWS CLI required but not installed." >&2; exit 1; }
command -v cdk >/dev/null 2>&1 || { echo "CDK CLI required but not installed." >&2; exit 1; }

# Deploy infrastructure
echo "Deploying infrastructure..."
npm run deploy:infrastructure

# Run tests
echo "Running tests..."
npm run test:aws

# Build frontend
echo "Building frontend..."
npm run build

echo "Deployment completed successfully!"
echo "Don't forget to update environment variables in Amplify console."
```

### Environment Setup Script (`setup.sh`)
```bash
#!/bin/bash
set -e

echo "Setting up MovieRec development environment..."

# Install dependencies
npm install
cd infrastructure && npm install && cd ..
cd tests && npm install && cd ..

# Copy environment template
cp .env.example .env

echo "Environment setup complete!"
echo "Please update .env with your API keys and configuration."
```

This deployment guide provides comprehensive instructions for deploying the MovieRec application across different environments, ensuring a smooth and reliable deployment process.