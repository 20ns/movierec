# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common problems encountered during development, deployment, and operation of the MovieRec application.

## Development Environment Issues

### Node.js and npm Issues

#### Problem: Node.js Version Compatibility
```bash
Error: engine node is incompatible with this module
```

**Solution:**
```bash
# Check current Node.js version
node --version

# Install Node.js 18+ (recommended: use nvm)
nvm install 18
nvm use 18

# Verify version
node --version  # Should show v18.x.x
```

#### Problem: npm Permission Errors
```bash
Error: EACCES: permission denied, access '/usr/local/lib/node_modules'
```

**Solution:**
```bash
# Use nvm to manage Node.js (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Or fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

#### Problem: Package Installation Failures
```bash
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Clean npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps

# Or use the development helper
node dev.js clean
```

### Environment Variable Issues

#### Problem: Environment Variables Not Loading
```bash
Error: TMDB API key is undefined
```

**Solution:**
```bash
# Check .env file exists in project root
ls -la .env

# Verify .env file format (no spaces around =)
cat .env

# Check for BOM or encoding issues
file .env

# Correct format:
REACT_APP_TMDB_API_KEY=your_api_key_here
REACT_APP_COGNITO_USER_POOL_ID=eu-north-1_xxxxxxxxx
```

#### Problem: Wrong Environment Values in Browser
**Symptoms**: API calls fail, wrong URLs in network tab

**Solution:**
```bash
# Restart development server after .env changes
node dev.js start

# Clear browser cache and hard refresh
Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Check environment values in browser console
console.log(process.env.REACT_APP_API_GATEWAY_INVOKE_URL)
```

### Port and Server Issues

#### Problem: Port Already in Use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm start
```

#### Problem: Backend Server Not Responding
```bash
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solution:**
```bash
# Check if backend is running
node dev.js status

# Start backend server
node dev.js backend

# Check for serverless-offline issues
npm install -g serverless
npm run start:offline

# Verify serverless.yml configuration
cat serverless.yml | grep -A 5 "host:"
```

## AWS and Infrastructure Issues

### AWS CLI Configuration

#### Problem: AWS Credentials Not Found
```bash
Error: Unable to locate credentials
```

**Solution:**
```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity

# Check credentials file
cat ~/.aws/credentials

# Set environment variables (alternative)
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=eu-north-1
```

#### Problem: Permission Denied Errors
```bash
Error: User is not authorized to perform: cloudformation:CreateStack
```

**Solution:**
```bash
# Check current user permissions
aws iam get-user

# Required permissions for MovieRec deployment:
# - CloudFormation: Full access
# - Lambda: Full access
# - DynamoDB: Full access
# - API Gateway: Full access
# - IAM: Role creation and attachment
# - Cognito: User pool management

# Contact AWS administrator to assign proper policies
```

### CDK Deployment Issues

#### Problem: CDK Bootstrap Not Found
```bash
Error: This stack uses assets, so the toolkit stack must be deployed to the environment
```

**Solution:**
```bash
# Bootstrap CDK in target region
npx cdk bootstrap aws://ACCOUNT-NUMBER/eu-north-1

# Verify bootstrap stack exists
aws cloudformation describe-stacks --stack-name CDKToolkit --region eu-north-1
```

#### Problem: CDK Version Mismatch
```bash
Error: This CDK CLI is not compatible with the CDK library used by your application
```

**Solution:**
```bash
# Check CDK CLI version
cdk --version

# Check CDK library version
cat infrastructure/package.json | grep aws-cdk

# Update CDK CLI to match library version
npm install -g aws-cdk@2.199.0

# Or update library to match CLI
cd infrastructure && npm install aws-cdk-lib@latest
```

### Lambda Function Issues

#### Problem: Lambda Function Timeouts
```bash
Error: Task timed out after 30.00 seconds
```

**Solution:**
```bash
# Check function timeout in serverless.yml
grep -A 5 "timeout:" serverless.yml

# Increase timeout for specific functions
functions:
  recommendations:
    timeout: 300  # 5 minutes

# Deploy changes
npm run deploy:infrastructure
```

#### Problem: Lambda Layer Issues
```bash
Error: Could not find layer version
```

**Solution:**
```bash
# Check layer configuration in serverless.yml
grep -A 10 "layers:" serverless.yml

# Rebuild and deploy layers
cd lambda-layers/aws-sdk-layer
npm install
cd ../..
serverless deploy
```

### DynamoDB Issues

#### Problem: Table Not Found
```bash
Error: Requested resource not found
```

**Solution:**
```bash
# Check if tables exist
aws dynamodb list-tables --region eu-north-1

# Expected tables:
# - UserPreferences
# - MovieRecCache  
# - Favourites
# - Watchlist

# Deploy tables if missing
serverless deploy --config tables-only.yml
```

#### Problem: DynamoDB Access Denied
```bash
Error: User is not authorized to perform: dynamodb:GetItem
```

**Solution:**
```bash
# Check IAM role permissions
aws iam get-role-policy --role-name your-lambda-role --policy-name DynamoDBPolicy

# Verify table ARNs in IAM policy match actual tables
aws dynamodb describe-table --table-name UserPreferences --region eu-north-1
```

## API and CORS Issues

### CORS Configuration Problems

#### Problem: CORS Errors in Browser
```bash
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**
```bash
# Check CORS configuration in serverless.yml
grep -A 10 "cors:" serverless.yml

# Verify allowed origins include your domain
cors:
  origins:
    - https://movierec.net
    - https://www.movierec.net
    - http://localhost:3000

# Deploy updated configuration
npm run deploy:infrastructure
```

#### Problem: Preflight OPTIONS Requests Failing
```bash
Response to preflight request doesn't pass access control check
```

**Solution:**
```bash
# Ensure OPTIONS method is configured
# Check API Gateway CORS settings in AWS Console
# Or add explicit OPTIONS handling in CDK:

api.addCorsPreflight('/**', {
  allowOrigins: ['https://movierec.net'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
});
```

### Authentication Issues

#### Problem: JWT Token Validation Failures
```bash
Error: Invalid or expired token
```

**Solution:**
```bash
# Check token in browser localStorage
localStorage.getItem('accessToken')

# Verify Cognito configuration
aws cognito-idp describe-user-pool --user-pool-id eu-north-1_x2FwI0mFK

# Check lambda function JWT verification
# Ensure aws-jwt-verify library is properly configured
```

#### Problem: Cognito User Pool Errors
```bash
Error: User pool does not exist
```

**Solution:**
```bash
# Verify user pool ID in .env
echo $REACT_APP_COGNITO_USER_POOL_ID

# Check if user pool exists
aws cognito-idp describe-user-pool --user-pool-id eu-north-1_x2FwI0mFK

# If missing, deploy infrastructure
npm run deploy:infrastructure
```

## API Integration Issues

### TMDB API Problems

#### Problem: TMDB API Rate Limiting
```bash
Error: 429 Too Many Requests
```

**Solution:**
```bash
# Check TMDB API usage in AWS CloudWatch
# Implement exponential backoff in lambda functions
# Consider caching TMDB responses in DynamoDB

# Temporary fix: wait and retry
sleep 10
```

#### Problem: Invalid TMDB API Key
```bash
Error: 401 Unauthorized - Invalid API key
```

**Solution:**
```bash
# Verify API key in .env
echo $REACT_APP_TMDB_API_KEY

# Test API key directly
curl "https://api.themoviedb.org/3/movie/popular?api_key=YOUR_API_KEY"

# Get new API key from https://www.themoviedb.org/settings/api
```

### API Gateway Issues

#### Problem: API Gateway 5xx Errors
```bash
Error: 502 Bad Gateway or 503 Service Unavailable
```

**Solution:**
```bash
# Check Lambda function logs
aws logs tail /aws/lambda/movierec-signin --follow

# Check API Gateway logs in CloudWatch
# Verify Lambda function exists and is properly configured
aws lambda get-function --function-name movierec-signin

# Check Lambda execution role permissions
```

## Performance Issues

### Frontend Performance

#### Problem: Slow Page Loading
**Symptoms**: High First Contentful Paint, large bundle sizes

**Solution:**
```bash
# Analyze bundle size
npm run build
npx webpack-bundle-analyzer dist/static/js/*.js

# Enable code splitting
# Check webpack.config.js for optimization settings
# Implement lazy loading for heavy components

# Use React.lazy for code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

#### Problem: Memory Leaks in Development
**Symptoms**: Browser tab becomes slow, high memory usage

**Solution:**
```bash
# Check for memory leaks in React DevTools
# Look for components not unmounting properly
# Verify useEffect cleanup functions

useEffect(() => {
  const subscription = subscribeToSomething();
  return () => subscription.unsubscribe(); // Cleanup
}, []);
```

### Backend Performance

#### Problem: Lambda Cold Starts
**Symptoms**: First request to endpoint is very slow

**Solution:**
```bash
# Implement warming strategy
# Use provisioned concurrency for critical functions
# Optimize bundle size and dependencies

# In serverless.yml:
functions:
  recommendations:
    provisionedConcurrency: 2
```

#### Problem: DynamoDB Throttling
```bash
Error: ProvisionedThroughputExceededException
```

**Solution:**
```bash
# Check DynamoDB metrics in CloudWatch
# Use PAY_PER_REQUEST billing mode (already configured)
# Optimize query patterns to avoid hot partitions

# In CDK/CloudFormation:
BillingMode: PAY_PER_REQUEST
```

## Testing Issues

### Test Failures

#### Problem: Tests Failing in CI/CD
**Symptoms**: Tests pass locally but fail in GitHub Actions

**Solution:**
```bash
# Check environment variables in CI/CD
# Ensure test timeouts are sufficient for CI environment
# Use --detectOpenHandles to find hanging processes

# In jest.config.js:
testTimeout: 60000,  // Increase for CI
detectOpenHandles: true
```

#### Problem: AWS Tests Failing
```bash
Error: Region not configured properly
```

**Solution:**
```bash
# Set AWS region in test environment
export AWS_DEFAULT_REGION=eu-north-1

# Configure AWS credentials for tests
# Use IAM role with minimal required permissions
```

## Monitoring and Debugging

### CloudWatch Debugging

#### Problem: No Logs Appearing in CloudWatch
**Solution:**
```bash
# Check Lambda execution role has CloudWatch permissions
# Verify log group exists
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/movierec

# Check log retention settings
# Enable detailed monitoring in Lambda console
```

#### Problem: High Error Rates
**Solution:**
```bash
# Check CloudWatch metrics for error patterns
# Analyze error logs for common issues
aws logs filter-log-events \
  --log-group-name /aws/lambda/movierec-signin \
  --filter-pattern "ERROR"

# Set up CloudWatch alarms for critical metrics
```

## Deployment Issues

### Build Failures

#### Problem: Webpack Build Failures
```bash
Error: Module not found or Can't resolve
```

**Solution:**
```bash
# Clear webpack cache
rm -rf node_modules/.cache

# Check for TypeScript/JavaScript mismatches
# Verify all imports use correct file extensions
# Check webpack.config.js for resolve settings

# Update webpack configuration if needed
resolve: {
  extensions: ['.js', '.jsx', '.ts', '.tsx']
}
```

#### Problem: CDK Deployment Failures
```bash
Error: Resource creation cancelled
```

**Solution:**
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name MovieRecStack

# Review resource limits and quotas
# Check for resource naming conflicts
# Verify IAM permissions for all resources
```

## Emergency Procedures

### Complete System Reset

If everything is broken and you need to start fresh:

```bash
# 1. Clean local environment
node dev.js clean
rm -rf .env

# 2. Reset AWS infrastructure
npm run deploy:destroy
aws cloudformation delete-stack --stack-name MovieRecStack

# 3. Fresh setup
cp .env.example .env
# Edit .env with correct values

# 4. Reinstall everything
node dev.js install

# 5. Deploy infrastructure
npm run deploy:infrastructure

# 6. Update .env with new infrastructure outputs

# 7. Test everything
node dev.js test
```

### Rollback Procedures

#### Application Rollback
```bash
# Rollback to previous Git commit
git log --oneline -10
git checkout <previous-commit-hash>

# Redeploy infrastructure if needed
npm run deploy:infrastructure
```

#### Database Rollback
```bash
# Point-in-time recovery (if needed)
aws dynamodb restore-table-to-point-in-time \
  --source-table-name UserPreferences \
  --target-table-name UserPreferences-Restored \
  --restore-date-time 2024-01-01T12:00:00Z
```

## Getting Help

### Debug Information Collection

Before asking for help, collect this information:

```bash
# System information
node --version
npm --version
aws --version
cdk --version

# Project status
node dev.js status
npm run deploy:diff

# Error logs
# Copy relevant error messages
# Include CloudWatch logs for AWS issues
# Provide .env file (with sensitive values removed)
```

### Support Resources

1. **AWS Documentation**: https://docs.aws.amazon.com/
2. **React Documentation**: https://react.dev/
3. **TMDB API Documentation**: https://developers.themoviedb.org/
4. **Serverless Framework**: https://www.serverless.com/framework/docs/
5. **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/

### Community Support

- Stack Overflow (tag questions with relevant technologies)
- AWS Developer Forums
- GitHub Issues (for tool-specific problems)
- Discord/Slack communities for React/AWS

Remember: Always provide minimal reproducible examples when asking for help, and remove sensitive information from logs and configuration files.