// src/utils/tokenUtilsEnhanced.js
// Enhanced Token Utilities with session caching, retry logic, and centralized logging

import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { createComponentLogger, performanceMonitor } from './centralizedLogger';

const logger = createComponentLogger('TokenUtils');

// ===== SESSION CACHE MANAGEMENT =====
class SessionCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.shortTTL = 30 * 1000; // 30 seconds for failed attempts
  }

  set(key, value, ttl = this.defaultTTL) {
    const expires = Date.now() + ttl;
    this.cache.set(key, { value, expires });
    
    // Auto-cleanup expired entries
    setTimeout(() => {
      if (this.cache.has(key) && this.cache.get(key).expires <= Date.now()) {
        this.cache.delete(key);
      }
    }, ttl);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const entry = this.cache.get(key);
    return entry && Date.now() <= entry.expires;
  }
}

const sessionCache = new SessionCache();

// ===== TOKEN VALIDATION =====
const isTokenExpired = (token) => {
  if (!token || !token.payload) return true;
  
  const exp = token.payload.exp;
  if (!exp) return true;
  
  // Check if token expires within next 5 minutes (buffer for API calls)
  const bufferTime = 5 * 60; // 5 minutes in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  
  return exp <= (currentTime + bufferTime);
};

const getTokenTimeToExpiry = (token) => {
  if (!token || !token.payload || !token.payload.exp) return 0;
  
  const exp = token.payload.exp;
  const currentTime = Math.floor(Date.now() / 1000);
  
  return Math.max(0, exp - currentTime);
};

// ===== RETRY LOGIC =====
const withRetry = async (operation, operationName, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timer = performanceMonitor.startTiming(`${operationName}_attempt_${attempt}`);
      const result = await operation();
      timer.end();
      
      if (attempt > 1) {
        logger.info(`${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error(`${operationName} failed after ${maxRetries} attempts`, { 
          error: error.message,
          attempts: maxRetries 
        }, error);
        break;
      }
      
      // Exponential backoff: 100ms, 300ms, 900ms
      const delay = 100 * Math.pow(3, attempt - 1);
      logger.warn(`${operationName} attempt ${attempt} failed, retrying in ${delay}ms`, { 
        error: error.message 
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// ===== ENHANCED TOKEN UTILITIES =====

/**
 * Gets the current access token with caching and retry logic
 * @param {boolean} forceRefresh - Force refresh from auth service
 * @returns {Promise<string|null>} - JWT access token or null
 */
export const getCurrentAccessToken = async (forceRefresh = false) => {
  const cacheKey = 'accessToken';
  
  if (!forceRefresh && sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    if (cached && !isTokenExpired(cached)) {
      logger.debug('Using cached access token');
      return cached.toString();
    }
  }

  return withRetry(async () => {
    logger.debug('Fetching fresh access token');
    
    const session = await fetchAuthSession({ forceRefresh });
    const token = session?.tokens?.accessToken;
    
    if (!token) {
      sessionCache.set(cacheKey, null, sessionCache.shortTTL);
      logger.warn('No access token in session');
      return null;
    }
    
    if (isTokenExpired(token)) {
      sessionCache.set(cacheKey, null, sessionCache.shortTTL);
      logger.warn('Access token is expired');
      return null;
    }
    
    // Cache with time-to-expiry as TTL
    const ttl = Math.min(getTokenTimeToExpiry(token) * 1000, sessionCache.defaultTTL);
    sessionCache.set(cacheKey, token, ttl);
    
    logger.debug('Fresh access token cached', { 
      expiresIn: getTokenTimeToExpiry(token),
      cacheTTL: ttl 
    });
    
    return token.toString();
  }, 'getCurrentAccessToken');
};

/**
 * Gets comprehensive user information from the current session
 * @param {boolean} forceRefresh - Force refresh from auth service
 * @returns {Promise<Object|null>} - Enhanced user info object or null
 */
export const getCurrentUserInfo = async (forceRefresh = false) => {
  const cacheKey = 'userInfo';
  
  if (!forceRefresh && sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    logger.debug('Using cached user info');
    return cached;
  }

  return withRetry(async () => {
    logger.debug('Fetching fresh user info');
    
    const [session, currentUser] = await Promise.all([
      fetchAuthSession({ forceRefresh }),
      getCurrentUser().catch(() => null)
    ]);
    
    const token = session?.tokens?.accessToken;
    const idToken = session?.tokens?.idToken;
    
    if (!token) {
      sessionCache.set(cacheKey, null, sessionCache.shortTTL);
      logger.warn('No tokens in session for user info');
      return null;
    }

    const payload = token.payload;
    const idPayload = idToken?.payload || {};
    
    const userInfo = {
      // Core identity
      userId: payload?.sub || idPayload?.sub,
      username: payload?.username || idPayload?.username || currentUser?.username,
      email: payload?.email || idPayload?.email,
      
      // Token metadata
      tokenUse: payload?.token_use,
      issuer: payload?.iss,
      audience: payload?.aud,
      issuedAt: payload?.iat,
      expiresAt: payload?.exp,
      
      // User metadata from ID token
      emailVerified: idPayload?.email_verified,
      phoneNumber: idPayload?.phone_number,
      phoneNumberVerified: idPayload?.phone_number_verified,
      
      // Session metadata
      authTime: idPayload?.auth_time,
      sessionValid: !isTokenExpired(token),
      timeToExpiry: getTokenTimeToExpiry(token),
      
      // Additional user attributes
      attributes: currentUser?.attributes || {},
      
      // Computed properties
      isFullyAuthenticated: !!(payload?.sub && !isTokenExpired(token)),
      needsReauth: isTokenExpired(token)
    };
    
    // Cache with appropriate TTL
    const ttl = userInfo.sessionValid ? sessionCache.defaultTTL : sessionCache.shortTTL;
    sessionCache.set(cacheKey, userInfo, ttl);
    
    logger.debug('User info cached', {
      userId: userInfo.userId ? '[USER_ID]' : null,
      username: userInfo.username ? '[USERNAME]' : null,
      sessionValid: userInfo.sessionValid,
      timeToExpiry: userInfo.timeToExpiry
    });
    
    return userInfo;
  }, 'getCurrentUserInfo');
};

/**
 * Checks authentication status with comprehensive validation
 * @param {boolean} strictMode - Require valid, non-expired tokens
 * @returns {Promise<Object>} - Authentication status object
 */
export const getAuthenticationStatus = async (strictMode = true) => {
  const cacheKey = `authStatus_${strictMode}`;
  
  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    logger.debug('Using cached auth status');
    return cached;
  }

  return withRetry(async () => {
    logger.debug('Checking authentication status', { strictMode });
    
    try {
      const session = await fetchAuthSession();
      const accessToken = session?.tokens?.accessToken;
      const idToken = session?.tokens?.idToken;
      
      const status = {
        isAuthenticated: !!accessToken,
        hasValidSession: !!(accessToken && !isTokenExpired(accessToken)),
        hasIdToken: !!idToken,
        tokenExpired: accessToken ? isTokenExpired(accessToken) : true,
        timeToExpiry: accessToken ? getTokenTimeToExpiry(accessToken) : 0,
        needsRefresh: false,
        error: null
      };
      
      // In strict mode, require valid, non-expired tokens
      if (strictMode) {
        status.isAuthenticated = status.hasValidSession;
      }
      
      // Check if token needs refresh soon (within 10 minutes)
      if (status.timeToExpiry > 0 && status.timeToExpiry < 600) {
        status.needsRefresh = true;
      }
      
      // Cache with short TTL for frequent checks
      sessionCache.set(cacheKey, status, 30 * 1000); // 30 seconds
      
      logger.debug('Authentication status determined', {
        isAuthenticated: status.isAuthenticated,
        hasValidSession: status.hasValidSession,
        tokenExpired: status.tokenExpired,
        needsRefresh: status.needsRefresh,
        timeToExpiry: status.timeToExpiry
      });
      
      return status;
    } catch (error) {
      const status = {
        isAuthenticated: false,
        hasValidSession: false,
        hasIdToken: false,
        tokenExpired: true,
        timeToExpiry: 0,
        needsRefresh: false,
        error: error.message
      };
      
      // Cache failed status for short time
      sessionCache.set(cacheKey, status, sessionCache.shortTTL);
      
      logger.error('Authentication check failed', { error: error.message }, error);
      return status;
    }
  }, 'getAuthenticationStatus');
};

/**
 * Enhanced user ID extraction with fallback strategies
 * @param {Object} currentUser - Current user object (optional)
 * @param {boolean} forceRefresh - Force refresh from auth service
 * @returns {Promise<string|null>} - User ID or null
 */
export const getUserId = async (currentUser = null, forceRefresh = false) => {
  const cacheKey = 'userId';
  
  if (!forceRefresh && sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    logger.debug('Using cached user ID');
    return cached;
  }

  return withRetry(async () => {
    logger.debug('Extracting user ID');
    
    // Strategy 1: Get from enhanced user info
    const userInfo = await getCurrentUserInfo(forceRefresh);
    if (userInfo?.userId) {
      sessionCache.set(cacheKey, userInfo.userId);
      logger.debug('User ID extracted from session');
      return userInfo.userId;
    }
    
    // Strategy 2: Fallback to provided user object (v5 compatibility)
    if (currentUser?.attributes?.sub) {
      sessionCache.set(cacheKey, currentUser.attributes.sub);
      logger.debug('User ID extracted from user object attributes');
      return currentUser.attributes.sub;
    }
    
    // Strategy 3: Username fallback
    if (currentUser?.username) {
      sessionCache.set(cacheKey, currentUser.username);
      logger.debug('Using username as user ID fallback');
      return currentUser.username;
    }
    
    // Strategy 4: Direct getCurrentUser call
    try {
      const directUser = await getCurrentUser();
      if (directUser?.attributes?.sub) {
        sessionCache.set(cacheKey, directUser.attributes.sub);
        logger.debug('User ID extracted from direct getCurrentUser call');
        return directUser.attributes.sub;
      }
    } catch (error) {
      logger.warn('Direct getCurrentUser call failed', { error: error.message });
    }
    
    sessionCache.set(cacheKey, null, sessionCache.shortTTL);
    logger.warn('No user ID found in any strategy');
    return null;
  }, 'getUserId');
};

/**
 * Proactive token refresh for long-running operations
 * @returns {Promise<boolean>} - True if refresh successful
 */
export const refreshTokensIfNeeded = async () => {
  try {
    const status = await getAuthenticationStatus();
    
    if (!status.isAuthenticated) {
      logger.debug('User not authenticated, skipping token refresh');
      return false;
    }
    
    if (!status.needsRefresh) {
      logger.debug('Tokens do not need refresh yet');
      return true;
    }
    
    logger.info('Proactively refreshing tokens');
    
    // Force refresh and clear cache
    sessionCache.clear();
    await fetchAuthSession({ forceRefresh: true });
    
    logger.info('Token refresh completed');
    return true;
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message }, error);
    return false;
  }
};

/**
 * Clear all cached session data (useful for logout)
 */
export const clearSessionCache = () => {
  sessionCache.clear();
  logger.info('Session cache cleared');
};

/**
 * Get session cache statistics (for debugging)
 */
export const getSessionCacheStats = () => {
  const stats = {
    size: sessionCache.cache.size,
    keys: Array.from(sessionCache.cache.keys()),
    entries: Array.from(sessionCache.cache.entries()).map(([key, entry]) => ({
      key,
      expires: new Date(entry.expires).toISOString(),
      expired: Date.now() > entry.expires
    }))
  };
  
  logger.debug('Session cache stats', stats);
  return stats;
};

// ===== LEGACY COMPATIBILITY =====
export const isAuthenticatedWithValidSession = async () => {
  const status = await getAuthenticationStatus(true);
  return status.hasValidSession;
};

// ===== EXPORTS =====
export default {
  getCurrentAccessToken,
  getCurrentUserInfo,
  getAuthenticationStatus,
  getUserId,
  refreshTokensIfNeeded,
  clearSessionCache,
  getSessionCacheStats,
  isAuthenticatedWithValidSession
};