// Authentication Service
// Provides robust authentication management with token validation and refresh

import { Auth } from 'aws-amplify';
import { validateToken, debugToken } from '../utils/tokenValidator';

// Constants
const TOKEN_REFRESH_THRESHOLD_MINUTES = 10;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * Ensures a valid JWT token is available, refreshing if necessary
 * @param {Object} currentUser - Current authenticated user from Amplify
 * @param {boolean} forceRefresh - Force token refresh even if current token is valid
 * @returns {Promise<string>} - Valid JWT token
 */
export const ensureValidToken = async (currentUser, forceRefresh = false) => {
  const context = 'ensureValidToken';
  
  try {
    // Check if we have a user session
    if (!currentUser?.signInUserSession) {
      throw new Error('No user session available');
    }

    const currentToken = currentUser.signInUserSession.accessToken?.jwtToken;
    
    if (!currentToken) {
      throw new Error('No access token in user session');
    }

    // Validate current token
    const validation = validateToken(currentToken);
    
    if (!forceRefresh && validation.valid) {
      // Check if token is expiring soon
      const now = Math.floor(Date.now() / 1000);
      const thresholdTime = now + (TOKEN_REFRESH_THRESHOLD_MINUTES * 60);
      
      if (validation.payload.exp > thresholdTime) {
        console.log(`[${context}] Current token is valid and not expiring soon`);
        return currentToken;
      }
      
      console.log(`[${context}] Token expiring soon, refreshing...`);
    } else if (!validation.valid) {
      console.log(`[${context}] Current token is invalid:`, validation.error);
    }

    // Refresh the token
    console.log(`[${context}] Attempting token refresh...`);
    const session = await Auth.currentSession();
    const newToken = session.getAccessToken().getJwtToken();
    
    // Validate the new token
    const newValidation = validateToken(newToken);
    if (!newValidation.valid) {
      throw new Error(`Refreshed token is invalid: ${newValidation.error}`);
    }

    console.log(`[${context}] Token refreshed successfully`);
    return newToken;

  } catch (error) {
    console.error(`[${context}] Token validation/refresh failed:`, error);
    
    // If all else fails, try to get a fresh session
    try {
      console.log(`[${context}] Attempting to get fresh session...`);
      const user = await Auth.currentAuthenticatedUser();
      const token = user.signInUserSession?.accessToken?.jwtToken;
      
      if (!token) {
        throw new Error('No token available after fresh session');
      }

      const validation = validateToken(token);
      if (!validation.valid) {
        throw new Error(`Fresh session token is invalid: ${validation.error}`);
      }

      return token;
    } catch (freshSessionError) {
      console.error(`[${context}] Fresh session attempt failed:`, freshSessionError);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
};

/**
 * Validates the current authentication state
 * @param {Object} currentUser - Current authenticated user
 * @returns {Object} - Authentication state information
 */
export const validateAuthState = async (currentUser) => {
  const context = 'validateAuthState';
  
  try {
    if (!currentUser) {
      return { 
        valid: false, 
        error: 'No user provided', 
        code: 'NO_USER' 
      };
    }

    const token = await ensureValidToken(currentUser);
    const validation = validateToken(token);
    
    if (!validation.valid) {
      return { 
        valid: false, 
        error: validation.error, 
        code: validation.code 
      };
    }

    return {
      valid: true,
      token,
      userInfo: {
        userId: validation.payload.sub,
        username: validation.payload.username,
        email: validation.payload.email,
        tokenUse: validation.payload.token_use
      }
    };

  } catch (error) {
    console.error(`[${context}] Auth state validation failed:`, error);
    return { 
      valid: false, 
      error: error.message, 
      code: 'VALIDATION_ERROR' 
    };
  }
};

/**
 * Makes an authenticated API request with automatic token refresh and retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {Object} currentUser - Current authenticated user
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Response>} - API response
 */
export const makeAuthenticatedRequest = async (url, options = {}, currentUser, retries = MAX_RETRY_ATTEMPTS) => {
  const context = 'makeAuthenticatedRequest';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[${context}] Attempt ${attempt}/${retries} for ${url}`);
      
      // Ensure we have a valid token
      const token = await ensureValidToken(currentUser);
      
      // Make the request
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      // Success - return response
      if (response.ok) {
        console.log(`[${context}] Request successful on attempt ${attempt}`);
        return response;
      }

      // Handle authentication errors
      if (response.status === 401) {
        console.log(`[${context}] Authentication error on attempt ${attempt}`);
        
        if (attempt < retries) {
          console.log(`[${context}] Retrying with token refresh...`);
          // Force token refresh for next attempt
          await ensureValidToken(currentUser, true);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_BASE * Math.pow(2, attempt - 1)));
          continue;
        }
        
        throw new Error(`Authentication failed after ${retries} attempts`);
      }

      // Handle other HTTP errors
      if (response.status >= 500 && attempt < retries) {
        console.log(`[${context}] Server error ${response.status} on attempt ${attempt}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_BASE * Math.pow(2, attempt - 1)));
        continue;
      }

      // Non-retryable error
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);

    } catch (error) {
      console.error(`[${context}] Attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_BASE * Math.pow(2, attempt - 1)));
    }
  }
};

/**
 * Saves user preferences with robust error handling
 * @param {Object} preferences - User preferences to save
 * @param {Object} currentUser - Current authenticated user
 * @param {string} apiUrl - API endpoint URL
 * @returns {Promise<Object>} - Save result
 */
export const saveUserPreferences = async (preferences, currentUser, apiUrl) => {
  const context = 'saveUserPreferences';
  
  try {
    console.log(`[${context}] Saving preferences for user:`, currentUser?.attributes?.sub);
    
    // Validate authentication state
    const authState = await validateAuthState(currentUser);
    if (!authState.valid) {
      throw new Error(`Authentication required: ${authState.error}`);
    }

    // Prepare request data
    const requestData = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };

    // Make the API request
    const response = await makeAuthenticatedRequest(
      apiUrl,
      {
        method: 'POST',
        body: JSON.stringify(requestData)
      },
      currentUser
    );

    const result = await response.json();
    console.log(`[${context}] Preferences saved successfully`);
    
    return {
      success: true,
      data: result,
      message: 'Preferences saved successfully'
    };

  } catch (error) {
    console.error(`[${context}] Failed to save preferences:`, error);
    
    return {
      success: false,
      error: error.message,
      code: error.code || 'SAVE_ERROR'
    };
  }
};

/**
 * Fetches user preferences with robust error handling
 * @param {Object} currentUser - Current authenticated user  
 * @param {string} apiUrl - API endpoint URL
 * @returns {Promise<Object>} - Fetch result
 */
export const fetchUserPreferences = async (currentUser, apiUrl) => {
  const context = 'fetchUserPreferences';
  
  try {
    console.log(`[${context}] Fetching preferences for user:`, currentUser?.attributes?.sub);
    
    // Validate authentication state
    const authState = await validateAuthState(currentUser);
    if (!authState.valid) {
      throw new Error(`Authentication required: ${authState.error}`);
    }

    // Make the API request
    const response = await makeAuthenticatedRequest(
      apiUrl,
      { method: 'GET' },
      currentUser
    );

    if (response.status === 404) {
      console.log(`[${context}] No preferences found for user`);
      return {
        success: true,
        data: null,
        message: 'No preferences found'
      };
    }

    const result = await response.json();
    console.log(`[${context}] Preferences fetched successfully`);
    
    return {
      success: true,
      data: result.preferences || result,
      message: 'Preferences fetched successfully'
    };

  } catch (error) {
    console.error(`[${context}] Failed to fetch preferences:`, error);
    
    return {
      success: false,
      error: error.message,
      code: error.code || 'FETCH_ERROR'
    };
  }
};