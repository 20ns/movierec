// CORS Configuration Module
// Centralized CORS management for easy domain updates

const CORS_CONFIG = {
  // Development origins
  development: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
  ],
  
  // Production origins
  production: [
    'https://movierec.net',
    'https://www.movierec.net'
  ],
  
  // All allowed origins combined
  get allOrigins() {
    return [...this.development, ...this.production];
  },
  
  // Default headers for all CORS responses
  defaultHeaders: {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Accept,Origin,X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  },
  
  // Generate CORS headers for a specific origin
  generateHeaders(requestOrigin) {
    const headers = { ...this.defaultHeaders };
    
    // For credentialed requests, we must specify an exact origin, not '*'
    if (requestOrigin && this.allOrigins.includes(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    } else {
      // Default to localhost for development
      headers['Access-Control-Allow-Origin'] = this.development[0];
    }
    
    return headers;
  },
  
  // Serverless.yml compatible format
  get serverlessConfig() {
    return {
      origin: this.allOrigins,
      headers: [
        'Content-Type',
        'Authorization', 
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'Accept',
        'Origin',
        'X-Requested-With'
      ],
      allowCredentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    };
  }
};

module.exports = CORS_CONFIG;