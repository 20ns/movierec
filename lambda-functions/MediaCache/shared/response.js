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
        console.log('CORS Debug - Origin matched, allowing:', requestOrigin);
    } else {
        // Improved fallback: check if origin is localhost and allow it, otherwise use production
        if (requestOrigin && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
            headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
            console.log('CORS Debug - Localhost detected, defaulting to localhost:3000');
        } else {
            headers['Access-Control-Allow-Origin'] = 'https://www.movierec.net';
            console.log('CORS Debug - Non-localhost origin, defaulting to production domain');
        }
        console.log('CORS Debug - Origin not matched exactly, request was from:', requestOrigin);
    }

    return headers;
}

function createApiResponse(statusCode, body, event) {
    // Extract origin from Lambda event headers (case-insensitive)
    const headers = event && event.headers ? event.headers : {};
    const requestOrigin = headers.origin || 
                         headers.Origin || 
                         headers['Origin'] || 
                         headers['origin'] ||
                         '';
    
    console.log('CORS Debug - Extracted origin:', requestOrigin);
    console.log('CORS Debug - All headers:', JSON.stringify(headers, null, 2));
    
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
