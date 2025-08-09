// Token Utilities for AWS Amplify v6
// Provides consistent token extraction across the application

import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Gets the current access token from AWS Amplify v6 session
 * @returns {Promise<string|null>} - JWT access token or null if not available
 */
export const getCurrentAccessToken = async () => {
  try {
    const session = await fetchAuthSession();
    return session?.tokens?.accessToken?.toString() || null;
  } catch (error) {
    console.warn('[TokenUtils] Failed to get access token:', error.message);
    return null;
  }
};

/**
 * Gets user information from the current session
 * @returns {Promise<Object|null>} - User info object or null
 */
export const getCurrentUserInfo = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.accessToken;
    
    if (!token) {
      return null;
    }

    // Extract user info from token payload
    const payload = token.payload;
    return {
      userId: payload?.sub,
      username: payload?.username,
      email: payload?.email,
      tokenUse: payload?.token_use
    };
  } catch (error) {
    console.warn('[TokenUtils] Failed to get user info:', error.message);
    return null;
  }
};

/**
 * Checks if user is authenticated with valid session
 * @returns {Promise<boolean>} - True if authenticated with valid session
 */
export const isAuthenticatedWithValidSession = async () => {
  try {
    const session = await fetchAuthSession();
    return !!(session?.tokens?.accessToken);
  } catch (error) {
    return false;
  }
};

/**
 * Legacy compatibility function - extracts user ID from user object or session
 * In v6, user object structure is different, so we get it from session
 * @param {Object} currentUser - Current user object (may be v5 or v6 format)
 * @returns {Promise<string|null>} - User ID or null
 */
export const getUserId = async (currentUser) => {
  try {
    
    // Try to get from v6 session first
    const userInfo = await getCurrentUserInfo();
    
    if (userInfo?.userId) {
      return userInfo.userId;
    }

    // Fallback to v5 format if somehow still present
    if (currentUser?.attributes?.sub) {
      return currentUser.attributes.sub;
    }

    // Another v5 fallback
    if (currentUser?.username) {
      return currentUser.username;
    }

    console.warn('[TokenUtils] No user ID found');
    return null;
  } catch (error) {
    console.warn('[TokenUtils] Failed to get user ID:', error.message);
    return null;
  }
};

export default {
  getCurrentAccessToken,
  getCurrentUserInfo,
  isAuthenticatedWithValidSession,
  getUserId
};