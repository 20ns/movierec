# MovieRec Semantic Enhancement Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the semantic enhancement features to your AWS MovieRec infrastructure.

## Prerequisites

Before deploying, ensure you have:
- AWS CLI configured with appropriate permissions
- AWS CDK installed and configured
- Node.js 18+ installed
- Serverless Framework installed globally
- Environment variables properly set

## Deployment Order

**IMPORTANT:** Follow this exact deployment order to avoid conflicts:

1. Infrastructure (DynamoDB table)
2. Backend Lambda functions
3. Testing and validation

## Step 1: Deploy Infrastructure

The new embedding cache DynamoDB table must be created first.

```bash
# Navigate to infrastructure directory
cd infrastructure

# Deploy the updated infrastructure
cdk deploy --profile movieRec

# Confirm deployment when prompted
# This will create the new MovieRecEmbeddingCache table
```

Expected output:
```
✅  InfrastructureStack

✨  Deployment time: 45.67s

Outputs:
InfrastructureStack.EmbeddingCacheTableName = MovieRecEmbeddingCache
InfrastructureStack.ApiGatewayUrl = https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/
```

## Step 2: Deploy Backend Functions

Deploy the updated Lambda functions with semantic enhancement.

```bash
# Navigate back to project root
cd ..

# Deploy serverless backend
npm run deploy:backend

# Alternative command if the above doesn't work:
# serverless deploy --stage prod
```

Expected output:
```
✅ Service deployed to stack movierec-backend-prod (45s)

endpoints:
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/auth/signin
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/auth/signup
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/auth/refresh
  GET - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences
  GET - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/favourites
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/favourites
  DELETE - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/favourites
  GET - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/watchlist
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/watchlist
  DELETE - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/watchlist
  GET - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/stats/{action}
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/stats/{action}
  GET - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/recommendations
  POST - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/recommendations
  GET - https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/media

functions:
  signin: movierec-backend-prod-signin (1.2 MB)
  signup: movierec-backend-prod-signup (1.2 MB)
  refreshToken: movierec-backend-prod-refreshToken (1.2 MB)
  userPreferences: movierec-backend-prod-userPreferences (1.2 MB)
  favourites: movierec-backend-prod-favourites (1.2 MB)
  watchlist: movierec-backend-prod-watchlist (1.2 MB)
  userStats: movierec-backend-prod-userStats (1.2 MB)
  recommendations: movierec-backend-prod-recommendations (1.5 MB)
  mediaCache: movierec-backend-prod-mediaCache (1.2 MB)
```

## Step 3: Environment Variables (Optional)

To enable external AI APIs for enhanced semantic understanding, set these environment variables:

```bash
# Set environment variables for enhanced AI features (optional)
export USE_SEMANTIC_API=true
export HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# Redeploy with new environment variables
npm run deploy:backend
```

**Note:** The system works with keyword-based similarity by default. External APIs are optional enhancements.

## Step 4: Validation and Testing

### 4.1 Run Smoke Tests

```bash
# Navigate to tests directory
cd tests

# Install test dependencies if needed
npm install

# Run semantic enhancement smoke tests
npm run test:semantic:verbose
```

Expected output:
```
PASS ./semantic-smoke.test.js
  Semantic Enhancement Smoke Tests
    ✓ should be able to import SemanticSimilarityScorer
    ✓ should be able to create SemanticSimilarityScorer instance
    ✓ should handle basic text extraction without errors
    ✓ should be able to calculate keyword similarity
    ✓ should validate main recommendation engine can import semantic scorer
    ✓ should handle environment variables gracefully

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

### 4.2 Test API Endpoints

```bash
# Test recommendation endpoint with curl
curl -X GET "https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/recommendations?limit=3&mediaType=movie" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Expected response should include semantic scores in recommendation reasons
```

### 4.3 Test Full Integration

```bash
# Run comprehensive integration tests
npm run test:full

# This runs both critical system tests and semantic enhancement tests
```

## Step 5: Monitor Deployment

### 5.1 Check CloudWatch Logs

Monitor the recommendation Lambda function logs:

```bash
# Check logs for the recommendations function
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/movierec-backend-prod-recommendations"

# Tail logs in real-time
aws logs tail "/aws/lambda/movierec-backend-prod-recommendations" --follow
```

Look for these log entries indicating semantic enhancement is working:
```
Semantic score for [Movie Title]: 75.3
Step 4: Scoring 15 candidates...
```

### 5.2 Verify DynamoDB Table

Check that the embedding cache table was created:

```bash
# List DynamoDB tables to confirm MovieRecEmbeddingCache exists
aws dynamodb list-tables --query 'TableNames[?contains(@, `MovieRecEmbeddingCache`)]'

# Check table details
aws dynamodb describe-table --table-name MovieRecEmbeddingCache
```

Expected output should show:
- Table Status: ACTIVE
- Billing Mode: ON_DEMAND
- TTL Enabled: true (on expiresAt attribute)

## Step 6: Performance Verification

### 6.1 Test Response Times

The semantic enhancement should maintain reasonable response times:

```bash
# Time a recommendation request
time curl -X GET "https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/recommendations?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response time: **< 20 seconds** for initial requests, **< 15 seconds** for cached requests.

### 6.2 Monitor Costs

The semantic enhancement should maintain minimal cost impact:

```bash
# Check current AWS costs (replace with your billing commands)
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Expected additional costs: **< $1/month** with current usage patterns.

## Troubleshooting

### Common Issues

#### 1. DynamoDB Table Creation Failed
```bash
# Check if table already exists
aws dynamodb describe-table --table-name MovieRecEmbeddingCache

# If needed, delete and recreate
aws dynamodb delete-table --table-name MovieRecEmbeddingCache
cd infrastructure && cdk deploy
```

#### 2. Lambda Function Timeout
```bash
# Check CloudWatch logs for timeout errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/movierec-backend-prod-recommendations" \
  --filter-pattern "Task timed out"

# If timeouts occur, increase timeout in serverless.yml
```

#### 3. Semantic Scoring Not Working
```bash
# Check Lambda logs for semantic-related errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/movierec-backend-prod-recommendations" \
  --filter-pattern "semantic"

# Common fix: Ensure USE_SEMANTIC_API environment variable is set correctly
```

#### 4. High Memory Usage
```bash
# Monitor Lambda memory usage
aws logs filter-log-events \
  --log-group-name "/aws/lambda/movierec-backend-prod-recommendations" \
  --filter-pattern "Max Memory Used"

# If needed, increase memory allocation in serverless.yml
```

### Rollback Procedure

If issues occur, you can rollback the deployment:

```bash
# Rollback Lambda functions to previous version
serverless remove --stage prod
git checkout HEAD~1  # Go back to previous commit
serverless deploy --stage prod

# Rollback infrastructure (this will delete the embedding cache table)
cd infrastructure
cdk destroy
# Deploy previous version
git checkout HEAD~1
cdk deploy
```

## Feature Flags

You can disable semantic enhancement without redeployment:

```bash
# Disable semantic API usage
export USE_SEMANTIC_API=false
npm run deploy:backend

# Or modify serverless.yml environment variables:
# USE_SEMANTIC_API: false
```

## Verification Checklist

After deployment, verify these items:

- [ ] DynamoDB table `MovieRecEmbeddingCache` exists and is ACTIVE
- [ ] Lambda function deploys successfully with new code
- [ ] Recommendation API returns results with semantic scores
- [ ] Recommendation reasons include semantic insights
- [ ] Response times remain under 20 seconds
- [ ] No error rate increase in CloudWatch
- [ ] Smoke tests pass
- [ ] Integration tests pass

## Success Criteria

Your deployment is successful when:

1. **Functional Requirements:**
   - ✅ Recommendations include semantic similarity scores
   - ✅ Recommendation reasons mention content alignment
   - ✅ API response times remain reasonable (< 20s)
   - ✅ System handles fallback to keyword similarity gracefully

2. **Technical Requirements:**
   - ✅ New DynamoDB table created and accessible
   - ✅ Lambda functions deploy without errors
   - ✅ All existing functionality continues to work
   - ✅ Error rate remains below 1%

3. **Performance Requirements:**
   - ✅ No significant cost increase (< $1/month additional)
   - ✅ Response times improve or remain the same over time (due to caching)
   - ✅ Memory usage stays within Lambda limits

## Next Steps

After successful deployment:

1. **Monitor for 24 hours** to ensure stability
2. **Collect user feedback** on recommendation quality
3. **Optionally enable external AI APIs** for enhanced semantic understanding
4. **Consider A/B testing** semantic vs. traditional recommendations
5. **Monitor caching performance** and adjust TTL if needed

## Support

If you encounter issues during deployment:

1. Check CloudWatch logs first
2. Verify environment variables are set correctly
3. Ensure AWS permissions are sufficient
4. Run the provided test suites for diagnostics
5. Check the troubleshooting section above

Remember: The system is designed to gracefully degrade, so if semantic enhancement fails, it will fall back to the original recommendation algorithm.

---

**Deployment Complete!** 🎉

Your MovieRec system now includes AI-powered semantic understanding for more intelligent movie and TV show recommendations.