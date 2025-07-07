# CORS Issue Resolution - Production Deployment Fix

## Problem Summary
After CI/CD deployment to the main branch, CORS errors were occurring on production (https://www.movierec.net) with the following error pattern:
```
Access to fetch at 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/favourites' 
from origin 'https://www.movierec.net' has been blocked by CORS policy: 
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3000' 
that is not equal to the supplied origin.
```

## Root Cause Analysis
The issue was in the AWS CDK infrastructure configuration (`infrastructure/lib/infrastructure-stack.ts`):

1. **Hardcoded Gateway Response Headers**: API Gateway's Gateway Response headers were hardcoded to `'http://localhost:3000'` for all error responses (401, 403, 502, etc.)
2. **CI/CD Pipeline Conflict**: The CI/CD pipeline uses CDK deployment, which overwrote any CORS fixes made via serverless.yml
3. **502 Bad Gateway Errors**: Lambda function failures were causing API Gateway to return 502 errors with the hardcoded localhost CORS headers

## Solution Implemented

### 1. Environment-Aware CORS Headers
Updated CDK infrastructure to use environment-based CORS configuration:
```typescript
const environmentContext = this.node.tryGetContext('environment') || 'development';
const primaryOrigin = environmentContext === 'production' 
  ? "'https://www.movierec.net'" 
  : "'http://localhost:3000'";
```

### 2. Comprehensive Gateway Response Updates
Fixed all API Gateway Response types:
- UnauthorizedResponse (401)
- ForbiddenResponse (403) 
- BadRequestResponse (400)
- InternalServerErrorResponse (5XX)
- Default4XXResponse (4XX)

### 3. Enhanced CORS Headers
Added comprehensive CORS headers including:
- `Access-Control-Allow-Headers` with all required headers
- `Access-Control-Max-Age` for caching
- `Access-Control-Allow-Credentials` for authentication

### 4. Health Endpoint Addition
Added health check endpoint to CDK infrastructure for CI/CD monitoring:
- Health function deployment
- `/health` API Gateway route
- Proper CORS configuration for health checks

## Deployment Commands
To deploy the fix:

```bash
# Deploy infrastructure via CDK with production context
cd infrastructure && npx cdk deploy --context environment=production

# Or let the CI/CD pipeline handle it when pushing to main branch
git add . && git commit -m "Fix CORS for production deployment"
git push origin main
```

## Files Modified
1. `infrastructure/lib/infrastructure-stack.ts` - Main CORS fix and health endpoint
2. All Lambda functions already had proper CORS utilities (no changes needed)

## Prevention Strategy
1. **Environment Context**: Always use `--context environment=production` for production deployments
2. **CI/CD Integration**: The GitHub Actions workflow automatically sets the production context
3. **Centralized CORS**: All CORS logic is now centralized in the CDK infrastructure
4. **Health Monitoring**: Health endpoint provides deployment verification

## Testing
To verify the fix:
1. **Local Development**: `http://localhost:3000` should work normally
2. **Production**: `https://www.movierec.net` should work without CORS errors
3. **Health Check**: `https://api-url/health` should return proper CORS headers
4. **Error Responses**: API Gateway errors should return correct origin headers

## Key Technical Details
- **API Gateway Limitation**: Gateway Response headers are static and cannot be dynamically set per request
- **Lambda Functions**: Continue to handle success responses with dynamic CORS origin matching
- **Error Handling**: Gateway Response headers handle API Gateway-level errors with appropriate origins
- **Environment Awareness**: CDK context distinguishes between development and production deployments

## Future Maintenance
- When adding new environments, update the environment context logic
- Ensure all new Lambda functions use the shared CORS utilities
- Test CORS functionality after any API Gateway configuration changes
- Monitor CloudWatch logs for any CORS-related errors

---
**Fix Applied**: 2025-01-07  
**Resolved By**: Claude Code Assistant  
**Status**: Ready for Production Deployment