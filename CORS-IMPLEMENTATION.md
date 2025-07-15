# CORS Implementation Guide - MovieRec Project

## Overview

This document explains how Cross-Origin Resource Sharing (CORS) is implemented throughout the MovieRec project to support both development (`http://localhost:3000`) and production (`https://www.movierec.net`) domains.

## Architecture

### Centralized CORS Management

**✅ Solution Implemented**: All Lambda functions use a **shared CORS implementation** via AWS Lambda Layer.

- **Location**: `/lambda-layers/aws-sdk-layer/nodejs/shared/response.js`
- **Import Path**: All Lambda functions import from `/opt/nodejs/shared/response`
- **Benefits**: 
  - Single source of truth for CORS logic
  - Easy maintenance and updates
  - Consistent behavior across all endpoints

### Supported Origins

The following origins are automatically supported:

```javascript
const allowedOrigins = [
    'https://www.movierec.net',    // Production domain
    'https://movierec.net',        // Production domain (alternative)
    'http://localhost:3000',       // Development environment
    'http://localhost:8080',       // Alternative dev port
    'http://127.0.0.1:3000'       // Local IP development
];
```

## Configuration

### Environment Variables

CORS origins are configurable via environment variable:

```bash
# .env file
ALLOWED_CORS_ORIGINS=https://www.movierec.net,https://movierec.net,http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000
```

### Lambda Layer Structure

```
lambda-layers/aws-sdk-layer/nodejs/
├── package.json              # Layer dependencies
├── node_modules/             # AWS SDK and JWT dependencies  
└── shared/
    └── response.js           # Centralized CORS implementation
```

### Lambda Function Integration

All Lambda functions import the shared response function:

```javascript
const { createApiResponse } = require("/opt/nodejs/shared/response");

// Usage in Lambda handlers
exports.handler = async (event) => {
    // ... business logic ...
    
    return createApiResponse(200, { 
        message: "Success" 
    }, event);
};
```

## Implementation Details

### CORS Headers Applied

Every API response includes these CORS headers:

```javascript
{
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key,Accept,Origin,X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Origin': '[DYNAMIC_ORIGIN]'  // Based on request origin
}
```

### Dynamic Origin Handling

The CORS implementation uses intelligent origin matching:

1. **Exact Match**: If the request origin exactly matches an allowed origin, use it
2. **Localhost Fallback**: For localhost variations, default to `http://localhost:3000`
3. **Production Fallback**: For movierec.net variations, default to `https://www.movierec.net`
4. **Safe Fallback**: If no match, use the first allowed origin

### Debug Logging

Comprehensive CORS debug logging is included:

```javascript
console.log('CORS Debug - Request Origin:', requestOrigin);
console.log('CORS Debug - Allowed Origins:', allowedOrigins);
console.log('CORS Debug - Environment ALLOWED_CORS_ORIGINS:', process.env.ALLOWED_CORS_ORIGINS);
console.log('CORS Debug - Origin matched exactly, allowing:', requestOrigin);
```

## API Gateway Integration

### OPTIONS Preflight Support

API Gateway automatically handles OPTIONS preflight requests with:

- **Response**: `204 No Content`
- **Headers**: Full CORS headers for preflight validation
- **Caching**: 24-hour cache (`Access-Control-Max-Age: 86400`)

### Gateway Response Types

Custom gateway responses ensure CORS headers are included in error responses:

- `DEFAULT_4XX`: Client errors (400, 401, 403, 404)
- `DEFAULT_5XX`: Server errors (500, 502, 503)
- `UNAUTHORIZED`: 401 Unauthorized
- `FORBIDDEN`: 403 Forbidden
- `BAD_REQUEST`: 400 Bad Request

## Testing

### Automated Tests

CORS functionality is covered by comprehensive tests:

```bash
# Run all tests including CORS validation
npm test

# Run production health tests
npm run test:production
```

### Manual Testing Commands

Test CORS from different origins:

```bash
# Test localhost origin
curl -H "Origin: http://localhost:3000" -H "Authorization: Bearer token" \
  "https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences" -v

# Test production origin  
curl -H "Origin: https://www.movierec.net" -H "Authorization: Bearer token" \
  "https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences" -v

# Test OPTIONS preflight
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  "https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences" -v
```

## Security Considerations

### Credential Support

- **Enabled**: `Access-Control-Allow-Credentials: true`
- **Requirement**: Exact origin matching (no wildcards allowed with credentials)
- **Purpose**: Supports authentication cookies and authorization headers

### Origin Validation

- **Whitelist-based**: Only explicitly allowed origins are accepted
- **No Wildcards**: For security with credentials enabled
- **Case Sensitivity**: Exact string matching enforced

### Content Security Policy

Frontend CSP headers restrict allowed API endpoints:

```javascript
connect-src 'self' 
  https://*.execute-api.eu-north-1.amazonaws.com 
  https://*.amazonaws.com 
  https://api.themoviedb.org 
  https://image.tmdb.org
```

## Deployment Process

### Infrastructure Deployment

```bash
# Deploy complete infrastructure including Lambda layer
npm run deploy:infrastructure
```

### Lambda Layer Updates

When updating CORS logic:

1. Modify `/lambda-layers/aws-sdk-layer/nodejs/shared/response.js`
2. Run `npm run deploy:infrastructure`
3. All Lambda functions automatically get the updated layer
4. Test with both localhost and production origins

## Troubleshooting

### Common Issues

**Issue**: CORS error in browser console
```
Access to fetch at 'API_URL' from origin 'ORIGIN' has been blocked by CORS policy
```

**Solutions**:
1. Verify origin is in `ALLOWED_CORS_ORIGINS` environment variable
2. Check Lambda function imports from `/opt/nodejs/shared/response`
3. Ensure Lambda layer is properly deployed
4. Review CloudWatch logs for CORS debug output

**Issue**: 502 Bad Gateway errors
```
Failed to load resource: the server responded with a status of 502
```

**Solutions**:
1. Check Lambda function imports are correct
2. Verify Lambda layer dependencies are installed
3. Review Lambda CloudWatch logs for import errors
4. Ensure `createApiResponse` function is properly exported

### Debug Checklist

When CORS issues occur:

- [ ] Check browser network tab for actual response headers
- [ ] Verify `Access-Control-Allow-Origin` matches request origin
- [ ] Confirm OPTIONS preflight request succeeds (204 response)
- [ ] Review Lambda CloudWatch logs for CORS debug output
- [ ] Test with `curl` commands to isolate browser vs server issues
- [ ] Verify environment variables are set correctly

## Maintenance

### Adding New Origins

To support additional origins:

1. Update `.env` file:
   ```bash
   ALLOWED_CORS_ORIGINS=existing,origins,new-origin.com
   ```

2. Deploy infrastructure:
   ```bash
   npm run deploy:infrastructure
   ```

3. Test new origin:
   ```bash
   curl -H "Origin: new-origin.com" API_ENDPOINT -v
   ```

### Removing Origins

Follow same process but remove origins from `ALLOWED_CORS_ORIGINS`.

⚠️ **Warning**: Removing production origins will break the live website.

## Architecture Benefits

### Before (Individual Files)

❌ **Problems**:
- 10+ separate `shared/response.js` files
- Inconsistent CORS logic across functions
- Difficult to update CORS settings
- Manual synchronization required

### After (Lambda Layer)

✅ **Benefits**:
- Single source of truth (`/opt/nodejs/shared/response`)
- Consistent CORS behavior across all endpoints
- Easy updates via infrastructure deployment
- Centralized debug logging and monitoring

---

**Last Updated**: July 2025  
**Version**: 2.0 (Lambda Layer Implementation)  
**Status**: ✅ Production Ready

This implementation ensures reliable CORS support for both development and production environments while maintaining security best practices and ease of maintenance.