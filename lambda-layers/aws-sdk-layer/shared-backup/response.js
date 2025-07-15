// Get allowed origins from environment variable or use defaults
const getDefaultOrigins = () => [
    'https://www.movierec.net',
    'https://movierec.net', 
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
];

const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS 
    ? process.env.ALLOWED_CORS_ORIGINS.split(',').map(origin => origin.trim())
    : getDefaultOrigins();

function getCorsHeaders(requestOrigin) {
    const headers = {
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key,Accept,Origin,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };

    console.log('CORS Debug - Request Origin:', requestOrigin);
    console.log('CORS Debug - Allowed Origins:', allowedOrigins);
    console.log('CORS Debug - Environment ALLOWED_CORS_ORIGINS:', process.env.ALLOWED_CORS_ORIGINS);

    // Handle wildcard case
    if (allowedOrigins.includes('*')) {
        headers['Access-Control-Allow-Origin'] = '*';
        console.log('CORS Debug - Using wildcard origin');
        return headers;
    }

    // For credentialed requests, we must specify an exact origin, not '*'
    // Check if request origin is in allowed origins (exact match)
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        headers['Access-Control-Allow-Origin'] = requestOrigin;
        console.log('CORS Debug - Origin matched exactly, allowing:', requestOrigin);
        return headers;
    }

    // Enhanced fallback logic for better compatibility
    if (requestOrigin) {
        // Check for localhost variations
        if (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')) {
            // Allow any localhost origin that's in our default list
            const localhostOrigins = ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000'];
            for (const localhostOrigin of localhostOrigins) {
                if (allowedOrigins.includes(localhostOrigin)) {
                    headers['Access-Control-Allow-Origin'] = localhostOrigin;
                    console.log('CORS Debug - Localhost fallback to:', localhostOrigin);
                    return headers;
                }
            }
            // Default localhost fallback
            headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
            console.log('CORS Debug - Default localhost fallback');
            return headers;
        }
        
        // Check for production domain variations
        if (requestOrigin.includes('movierec.net')) {
            const productionOrigins = ['https://www.movierec.net', 'https://movierec.net'];
            for (const prodOrigin of productionOrigins) {
                if (allowedOrigins.includes(prodOrigin)) {
                    headers['Access-Control-Allow-Origin'] = prodOrigin;
                    console.log('CORS Debug - Production domain fallback to:', prodOrigin);
                    return headers;
                }
            }
        }
    }

    // Final fallback - use the first allowed origin or production
    const fallbackOrigin = allowedOrigins.includes('https://www.movierec.net') 
        ? 'https://www.movierec.net' 
        : allowedOrigins[0] || 'https://www.movierec.net';
    
    headers['Access-Control-Allow-Origin'] = fallbackOrigin;
    console.log('CORS Debug - Final fallback to:', fallbackOrigin, 'for origin:', requestOrigin);

    return headers;
}

function createApiResponse(statusCode, body, event) {
    // Extract origin from Lambda event headers (case-insensitive)
    const headers = event && event.headers ? event.headers : {};
    
    // More thorough origin extraction
    const requestOrigin = headers.origin || 
                         headers.Origin || 
                         headers['Origin'] || 
                         headers['origin'] ||
                         (event && event.requestContext && event.requestContext.domainName ? 
                          `https://${event.requestContext.domainName}` : '');
    
    console.log('CORS Debug - Extracted origin:', requestOrigin);
    console.log('CORS Debug - Request context:', event?.requestContext?.domainName);
    console.log('CORS Debug - All headers keys:', Object.keys(headers));
    
    const corsHeaders = getCorsHeaders(requestOrigin);

    return {
        statusCode: statusCode,
        headers: {
            ...corsHeaders,
        },
        body: body ? JSON.stringify(body) : '',
    };
}

module.exports = { createApiResponse };