# CI/CD Setup Guide for MovieRec

## 🚀 Overview

This guide explains the comprehensive CI/CD pipeline implemented for MovieRec, ensuring that only functional, tested code reaches production.

## 📋 Pipeline Architecture

### 1. **Continuous Integration (CI) Pipeline**
**File:** `.github/workflows/ci.yml`
**Triggers:** All pushes and pull requests

**Stages:**
- **Code Quality:** ESLint, formatting checks, security audit
- **Build & Test:** Unit tests, API tests, AWS integration tests
- **Build Verification:** Production build validation
- **Infrastructure Validation:** CDK synth and infrastructure tests
- **Security Scanning:** Trivy vulnerability scanner

### 2. **Staging Deployment Pipeline**
**File:** `.github/workflows/deploy-staging.yml`
**Triggers:** Pushes to `develop` or `staging` branches

**Stages:**
- **Pre-deployment Checks:** Essential tests and validation
- **Infrastructure Deployment:** Deploy staging AWS resources
- **Frontend Deployment:** Build and deploy to staging S3/CloudFront
- **Post-deployment Testing:** Health checks and integration tests
- **Performance Testing:** Basic performance verification

### 3. **Production Deployment Pipeline**
**File:** `.github/workflows/deploy-production.yml`
**Triggers:** Pushes to `main` branch

**Stages:**
- **Pre-deployment Validation:** Comprehensive test suite
- **Backup Current State:** Create rollback point
- **Infrastructure Deployment:** Deploy production AWS resources
- **Frontend Deployment:** Build and deploy to production
- **Post-deployment Verification:** Comprehensive health checks
- **Rollback on Failure:** Automatic rollback if deployment fails

## 🔧 Setup Instructions

### 1. GitHub Repository Secrets

Configure the following secrets in your GitHub repository (`Settings` → `Secrets and variables` → `Actions`):

#### AWS Configuration
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_ACCOUNT_ID=your_aws_account_id
AWS_REGION=eu-north-1
```

#### Production Environment
```
REACT_APP_API_GATEWAY_INVOKE_URL=https://your-prod-api.amazonaws.com/prod/
REACT_APP_TMDB_API_KEY=your_production_tmdb_key
REACT_APP_COGNITO_USER_POOL_ID=your_prod_user_pool_id
REACT_APP_COGNITO_CLIENT_ID=your_prod_client_id
```

#### Staging Environment
```
STAGING_API_URL=https://your-staging-api.amazonaws.com/prod/
STAGING_TMDB_API_KEY=your_staging_tmdb_key
STAGING_COGNITO_USER_POOL_ID=your_staging_user_pool_id
STAGING_COGNITO_CLIENT_ID=your_staging_client_id
```

### 2. AWS Amplify Setup

#### Production App
- **Domain**: movierec.net (already configured)
- **Branch**: main (auto-deployment enabled)
- **Environment Variables**: Set in Amplify console

#### Staging App (Optional)
- **Domain**: staging.movierec.net
- **Branch**: develop
- **Environment Variables**: Set staging values

### 3. Branch Protection Rules

Configure branch protection for `main` branch:
1. Go to repository `Settings` → `Branches`
2. Add rule for `main` branch:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Required status checks: `CI Success`
   - ✅ Restrict pushes that create files larger than 100MB
   - ✅ Require linear history

### 4. Environment Setup

#### Install Dependencies
```bash
npm install
npm run prepare  # Sets up Husky hooks
```

#### Local Health Checks
```bash
# Check production health
npm run health-check

# Check staging health
npm run health-check:staging
```

### 5. Amplify Environment Variables

#### Production Amplify App
Set these environment variables in the Amplify console:
```
REACT_APP_API_GATEWAY_INVOKE_URL=https://your-api-gateway-url.amazonaws.com/prod/
REACT_APP_ENVIRONMENT=production
REACT_APP_TMDB_API_KEY=your_tmdb_api_key
REACT_APP_COGNITO_USER_POOL_ID=your_user_pool_id
REACT_APP_COGNITO_CLIENT_ID=your_client_id
REACT_APP_COGNITO_REGION=eu-north-1
```

#### Staging Amplify App (if using)
```
REACT_APP_API_GATEWAY_INVOKE_URL=https://staging-api-gateway-url.amazonaws.com/prod/
REACT_APP_ENVIRONMENT=staging
REACT_APP_TMDB_API_KEY=your_staging_tmdb_api_key
REACT_APP_COGNITO_USER_POOL_ID=your_staging_user_pool_id
REACT_APP_COGNITO_CLIENT_ID=your_staging_client_id
REACT_APP_COGNITO_REGION=eu-north-1
```

## 🏗️ Infrastructure Components

### Health Check Endpoint
**File:** `lambda-functions/health/index.js`

The health check endpoint provides:
- DynamoDB table status
- Environment variable validation
- Lambda function metrics
- Overall system health score

**Endpoint:** `GET /health`

### Pre-commit Hooks
**Files:** `.husky/pre-commit`, `.husky/pre-push`

**Pre-commit:** Runs on every commit
- ESLint code quality checks
- Unit tests
- Build verification

**Pre-push:** Runs on every push
- Full test suite for main branch
- Security audit
- Production build verification

## 📊 Deployment Flow

### Feature Development Flow
```
feature-branch → develop → staging → main → production
```

1. **Feature Branch**: Work on features, CI runs on every push
2. **Develop Branch**: Integration testing, deploys to staging
3. **Staging**: Full testing environment with production-like setup
4. **Main Branch**: Production deployment with full validation

### Emergency Deployment
For urgent fixes, use the manual deployment trigger:
1. Go to `Actions` tab in GitHub
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Check "Skip tests" if necessary (not recommended)

## 🔍 Monitoring & Health Checks

### Automated Health Checks
- **Frontend**: Page load, manifest.json, service worker, Amplify hosting detection
- **Backend**: API endpoints, CORS, DynamoDB connectivity
- **Infrastructure**: Lambda functions, CDK validation

### Health Check Script
```bash
# Manual health check
node scripts/health-check.js [environment]

# Example output:
✅ Overall Status: HEALTHY
📊 Health: 95% (19/20 checks passed)
```

### Performance Monitoring
Each deployment includes:
- Response time measurement
- Bundle size verification
- Core Web Vitals tracking

## 🔄 Rollback Procedures

### Manual Rollback (No Automatic Rollback with Amplify)
Since we're using AWS Amplify for frontend deployment, rollbacks are manual:

1. **Frontend Rollback**:
   - Go to AWS Amplify Console
   - Select your app
   - Choose "Deployments" tab
   - Find previous successful deployment
   - Click "Redeploy this version"

2. **Infrastructure Rollback**:
   ```bash
   # Revert CDK deployment
   cd infrastructure
   git checkout [previous-commit]
   npx cdk deploy
   ```

3. **Full System Rollback**:
   - Rollback infrastructure (above)
   - Rollback frontend via Amplify console
   - Verify health checks pass

## 🚨 Troubleshooting

### Common Issues

#### 1. **CI Tests Failing**
```bash
# Run tests locally
npm run test
npm run test:coverage
npm run lint
```

#### 2. **AWS Credentials Issues**
- Verify GitHub secrets are set correctly
- Check IAM permissions for deployment user
- Ensure AWS CLI is configured properly

#### 3. **Health Check Failures**
```bash
# Debug health endpoint
curl -v https://movierec.net/health

# Check specific components
npm run health-check:staging
```

#### 4. **Deployment Stuck**
- Check CloudFormation stack status in AWS Console
- Review GitHub Actions logs
- Verify S3 bucket permissions

### Debug Commands

```bash
# Lint specific files
npm run lint:fix

# Run specific test suites
npm run test:api
npm run test:aws

# Build debugging
npm run build:watch

# Infrastructure debugging
cd infrastructure && npx cdk diff
```

## 📈 Metrics & Analytics

### CI/CD Metrics Tracked
- **Build Time**: Average CI pipeline duration
- **Test Coverage**: Code coverage percentage
- **Deployment Frequency**: How often we deploy
- **Lead Time**: Time from commit to production
- **Failure Rate**: Percentage of failed deployments
- **Recovery Time**: Time to restore service after failure

### Monitoring Dashboard
Access deployment metrics via:
- GitHub Actions history
- AWS CloudWatch logs
- Health check endpoint responses

## 🔐 Security Considerations

### Secrets Management
- All sensitive data stored in GitHub Secrets
- Environment variables never logged
- API keys rotated regularly

### Access Control
- Branch protection rules enforced
- Required reviews for main branch
- Audit trail for all deployments

### Security Scanning
- Dependency vulnerability scanning
- Container security with Trivy
- Code quality analysis with ESLint

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
- [MovieRec Architecture Overview](./01-architecture-overview.md)
- [Testing Guide](./12-testing-guide.md)

---

**Last Updated:** $(date)
**Version:** 1.0
**Maintainer:** MovieRec Team