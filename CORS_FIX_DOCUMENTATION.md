# CORS Fix Documentation - Complete Solution

## Problem
The production website (https://www.movierec.net) was experiencing CORS errors when making requests to the API Gateway endpoints. The Lambda functions were incorrectly returning `http://localhost:3000` in the `Access-Control-Allow-Origin` header instead of the correct production domain.

## Root Cause
1. **Module Import Issue**: Lambda functions were trying to import from `../shared/response` but the shared directory wasn't being packaged with each function during deployment.
2. **Logic Error**: The CORS handling logic in `shared/response.js` had flawed origin matching logic.

## Solution
1. **Fixed CORS Logic**: Updated `shared/response.js` to:
   - Properly match origins against the `ALLOWED_CORS_ORIGINS` environment variable
   - Default to the production domain when origin is not recognized
   - Handle both development and production origins correctly

2. **Fixed Module Structure**: 
   - Copy the shared directory to each Lambda function directory before deployment
   - Update import paths from `../shared/response` to `./shared/response`

3. **Robust Origin Handling**:
   - Production origin (`https://www.movierec.net`) → Returns same origin
   - Localhost origin (`http://localhost:3000`) → Returns same origin  
   - Invalid origin (`https://malicious.com`) → Returns production domain as default

## Files Modified
- `lambda-functions/shared/response.js` - Fixed CORS logic
- All Lambda function `index.js` files - Updated import paths
- `scripts/prepare-lambda-deployment.ps1` - Automated shared directory copying
- `scripts/deploy.ps1` - Comprehensive deployment script
- `scripts/test-cors.ps1` - CORS testing script

## Deployment Process
1. Run `scripts/prepare-lambda-deployment.ps1` to copy shared code
2. Run `npm run cdk deploy` from the infrastructure directory
3. Run `scripts/test-cors.ps1` to verify CORS is working

Or use the all-in-one deployment script:
```powershell
.\scripts\deploy.ps1
```

## Environment Variables
The CORS handling relies on the `ALLOWED_CORS_ORIGINS` environment variable being set correctly:
```
ALLOWED_CORS_ORIGINS=https://www.movierec.net,https://movierec.net,http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000
```

## Testing
Use the `test-cors.ps1` script to verify CORS is working correctly for all endpoints:
- `/user/watchlist`
- `/user/favourites` 
- `/user/preferences`
- `/user/stats/summary`
- `/recommendations`
- `/health`

## Security
- Only allows origins specified in `ALLOWED_CORS_ORIGINS`
- Defaults to production domain for unrecognized origins
- Supports credentials for authenticated requests
- Properly handles preflight OPTIONS requests

## Future Considerations
Consider moving shared code to a Lambda Layer to avoid the need for copying directories during deployment.
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