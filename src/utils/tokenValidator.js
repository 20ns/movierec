// JWT Token Validation Utility
// Provides comprehensive token validation and debugging capabilities

/**
 * Validates a JWT token structure and expiration
 * @param {string} token - JWT token to validate
 * @returns {Object} - Validation result with valid flag, error message, and payload
 */
export const validateToken = (token) => {
  if (!token) {
    return { valid: false, error: 'No token provided', code: 'NO_TOKEN' };
  }

  if (typeof token !== 'string') {
    return { valid: false, error: 'Token must be a string', code: 'INVALID_TYPE' };
  }

  // Check JWT format (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { 
      valid: false, 
      error: `Invalid token format: expected 3 parts, got ${parts.length}`, 
      code: 'INVALID_FORMAT' 
    };
  }

  try {
    // Decode header
    const header = JSON.parse(atob(parts[0]));
    
    // Decode payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      const expiredMinutes = Math.floor((now - payload.exp) / 60);
      return { 
        valid: false, 
        error: `Token expired ${expiredMinutes} minutes ago`, 
        code: 'EXPIRED',
        payload 
      };
    }

    // Check if token is issued too far in the future
    if (payload.iat && payload.iat > now + 300) { // 5 minutes tolerance
      return { 
        valid: false, 
        error: 'Token issued in the future', 
        code: 'FUTURE_TOKEN',
        payload 
      };
    }

    return { valid: true, payload, header };
  } catch (error) {
    return { 
      valid: false, 
      error: `Invalid token structure: ${error.message}`, 
      code: 'DECODE_ERROR' 
    };
  }
};

/**
 * Extracts user information from a validated token
 * @param {Object} tokenPayload - Decoded JWT payload
 * @returns {Object} - User information
 */
export const extractUserInfo = (tokenPayload) => {
  if (!tokenPayload) return null;

  return {
    userId: tokenPayload.sub,
    username: tokenPayload.username,
    email: tokenPayload.email,
    tokenUse: tokenPayload.token_use,
    issuedAt: tokenPayload.iat,
    expiresAt: tokenPayload.exp,
    issuer: tokenPayload.iss,
    audience: tokenPayload.aud
  };
};

/**
 * Checks if a token will expire within the specified minutes
 * @param {string} token - JWT token to check
 * @param {number} minutesThreshold - Minutes until expiration to consider as "expiring soon"
 * @returns {Object} - Expiration check result
 */
export const checkTokenExpiration = (token, minutesThreshold = 5) => {
  const validation = validateToken(token);
  
  if (!validation.valid) {
    return { expiringSoon: false, expired: true, ...validation };
  }

  const now = Math.floor(Date.now() / 1000);
  const thresholdTime = now + (minutesThreshold * 60);
  
  const expiringSoon = validation.payload.exp < thresholdTime;
  const timeUntilExpiry = validation.payload.exp - now;
  
  return {
    expiringSoon,
    expired: false,
    valid: true,
    timeUntilExpiry,
    minutesUntilExpiry: Math.floor(timeUntilExpiry / 60)
  };
};

/**
 * Debug function to log token information
 * @param {string} token - JWT token to debug
 * @param {string} context - Context for logging
 */
export const debugToken = (token, context = 'Token Debug') => {
  const validation = validateToken(token);
  
  console.group(`[${context}]`);
  console.log('Token validation:', validation);
  
  if (validation.valid) {
    const userInfo = extractUserInfo(validation.payload);
    console.log('User info:', userInfo);
    
    const expirationCheck = checkTokenExpiration(token);
    console.log('Expiration check:', expirationCheck);
  }
  
  console.groupEnd();
  
  return validation;
};