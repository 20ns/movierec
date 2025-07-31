// JWT Token Validation Utility
// Provides comprehensive token validation and debugging capabilities

import timeSync from '../services/timeSync';

/**
 * Validates a JWT token structure and expiration using synchronized server time
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
    
    // Use synchronized server time for validation
    const now = timeSync.getServerTime();
    const syncStatus = timeSync.getSyncStatus();
    
    // Check expiration
    if (payload.exp && payload.exp < now) {
      const expiredMinutes = Math.floor((now - payload.exp) / 60);
      return { 
        valid: false, 
        error: `Token expired ${expiredMinutes} minutes ago`, 
        code: 'EXPIRED',
        payload 
      };
    }

    // Check if token is issued too far in the future (using server time)
    if (payload.iat) {
      const timeDiff = payload.iat - now;
      const minutesDiff = Math.floor(timeDiff / 60);
      
      // Log validation details with sync status (development only)
      if (process.env.NODE_ENV === 'development') {
        // Token validation - Server time: X, IAT: Y, Diff: Zs (N minutes)
      }
      
      // Much stricter tolerance now that we use server time (5 minutes)
      if (timeDiff > 300) { // 5 minutes tolerance
        return { 
          valid: false, 
          error: `Token issued ${minutesDiff} minutes in the future`, 
          code: 'FUTURE_TOKEN',
          payload 
        };
      } else if (timeDiff > 60) { // Log warning if more than 1 minute
        console.warn(`[TokenValidator] Minor time difference: token issued ${minutesDiff} minutes in the future (within tolerance)`);
      }
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

  const now = timeSync.getServerTime();
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