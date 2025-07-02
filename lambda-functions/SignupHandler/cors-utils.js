// Shared CORS Utilities for Lambda Functions
// Consistent CORS handling across all endpoints

const ALLOWED_ORIGINS = [
  'https://movierec.net',
  'https://www.movierec.net', 
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000'
];

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Accept,Origin,X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

/**
 * Generate CORS headers for a specific request origin
 * @param {string} requestOrigin - The origin from the request headers
 * @returns {Object} CORS headers object
 */
const generateCorsHeaders = (requestOrigin) => {
  const headers = { ...DEFAULT_HEADERS };
  
  // For credentialed requests, we must specify an exact origin, not '*'
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else {
    // Default to localhost:3000 for development if origin not recognized
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[2]; // localhost:3000
  }
  
  return headers;
};

/**
 * Create a standardized OPTIONS response for CORS preflight
 * @param {string} requestOrigin - The origin from the request headers
 * @returns {Object} Lambda response object for OPTIONS request
 */
const createCorsPreflightResponse = (requestOrigin) => {
  return {
    statusCode: 204,
    headers: generateCorsHeaders(requestOrigin),
    body: ''
  };
};

/**
 * Create a standardized error response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} requestOrigin - The origin from the request headers
 * @param {Object} additionalData - Additional data to include in response
 * @returns {Object} Lambda response object
 */
const createCorsErrorResponse = (statusCode, message, requestOrigin, additionalData = {}) => {
  return {
    statusCode,
    headers: generateCorsHeaders(requestOrigin),
    body: JSON.stringify({
      message,
      ...additionalData
    })
  };
};

/**
 * Create a standardized success response with CORS headers
 * @param {Object} data - Response data
 * @param {string} requestOrigin - The origin from the request headers
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Lambda response object
 */
const createCorsSuccessResponse = (data, requestOrigin, statusCode = 200) => {
  return {
    statusCode,
    headers: generateCorsHeaders(requestOrigin),
    body: JSON.stringify(data)
  };
};

/**
 * Extract origin from Lambda event headers
 * @param {Object} event - Lambda event object
 * @returns {string} Request origin
 */
const extractOrigin = (event) => {
  return event.headers?.origin || 
         event.headers?.Origin || 
         event.headers?.['Origin'] || 
         '';
};

module.exports = {
  ALLOWED_ORIGINS,
  DEFAULT_HEADERS,
  generateCorsHeaders,
  createCorsPreflightResponse,
  createCorsErrorResponse,
  createCorsSuccessResponse,
  extractOrigin
};