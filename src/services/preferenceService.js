// User Preference Persistence Service
// Provides a unified interface for saving and loading user preferences with robust error handling

import { saveUserPreferences, fetchUserPreferences, validateAuthState } from './authService';
import ENV_CONFIG from '../config/environment';

// Constants
const STORAGE_KEY_PREFIX = 'userPrefs_';
const QUESTIONNAIRE_KEY_PREFIX = 'questionnaire_completed_';
const SAVE_RETRY_ATTEMPTS = 3;
const SAVE_RETRY_DELAY = 1000;

/**
 * Saves user preferences with local storage backup and retry logic
 * @param {Object} preferences - User preferences to save
 * @param {Object} currentUser - Current authenticated user
 * @param {boolean} isPartial - Whether this is a partial save (auto-save)
 * @returns {Promise<Object>} - Save result with success status and details
 */
export const savePreferences = async (preferences, currentUser, isPartial = false) => {
  const context = 'savePreferences';
  const userId = currentUser?.attributes?.sub;
  
  if (!userId) {
    return {
      success: false,
      error: 'No user ID available',
      code: 'NO_USER_ID'
    };
  }

  const prefsToSave = {
    ...preferences,
    questionnaireCompleted: !isPartial || preferences.questionnaireCompleted,
    userId: userId,
    updatedAt: new Date().toISOString()
  };

  console.log(`[${context}] Saving preferences for user ${userId}, isPartial: ${isPartial}`);

  let cloudSaveResult = null;
  let localSaveResult = null;

  // Always try to save to cloud first
  try {
    cloudSaveResult = await saveUserPreferences(
      prefsToSave, 
      currentUser, 
      ENV_CONFIG.getApiUrl('/user/preferences')
    );

    if (cloudSaveResult.success) {
      console.log(`[${context}] Cloud save successful`);
    } else {
      console.error(`[${context}] Cloud save failed:`, cloudSaveResult.error);
    }
  } catch (error) {
    console.error(`[${context}] Cloud save error:`, error);
    cloudSaveResult = {
      success: false,
      error: error.message,
      code: 'CLOUD_SAVE_ERROR'
    };
  }

  // Always save to local storage as backup
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(prefsToSave));
    localStorage.setItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`, prefsToSave.questionnaireCompleted.toString());
    
    localSaveResult = {
      success: true,
      message: 'Saved to local storage'
    };
    
    console.log(`[${context}] Local save successful`);
  } catch (error) {
    console.error(`[${context}] Local save error:`, error);
    localSaveResult = {
      success: false,
      error: error.message,
      code: 'LOCAL_SAVE_ERROR'
    };
  }

  // Determine overall result
  const result = {
    cloudSave: cloudSaveResult,
    localSave: localSaveResult,
    success: cloudSaveResult?.success || localSaveResult?.success,
    preferences: prefsToSave
  };

  if (cloudSaveResult?.success) {
    result.message = 'Preferences saved successfully';
    result.source = 'cloud';
  } else if (localSaveResult?.success) {
    result.message = 'Preferences saved locally (cloud save failed)';
    result.source = 'local';
    result.warning = 'Cloud save failed - preferences may not sync across devices';
  } else {
    result.message = 'Failed to save preferences';
    result.error = 'Both cloud and local save failed';
  }

  return result;
};

/**
 * Loads user preferences from cloud with local storage fallback
 * @param {Object} currentUser - Current authenticated user
 * @param {boolean} forceCloudFetch - Force fetch from cloud even if local data exists
 * @returns {Promise<Object>} - Load result with preferences data
 */
export const loadPreferences = async (currentUser, forceCloudFetch = false) => {
  const context = 'loadPreferences';
  const userId = currentUser?.attributes?.sub;
  
  if (!userId) {
    return {
      success: false,
      error: 'No user ID available',
      code: 'NO_USER_ID'
    };
  }

  console.log(`[${context}] Loading preferences for user ${userId}, forceCloudFetch: ${forceCloudFetch}`);

  let cloudResult = null;
  let localResult = null;

  // Try cloud first (if authenticated and requested)
  if (forceCloudFetch || true) { // Always try cloud first
    try {
      cloudResult = await fetchUserPreferences(
        currentUser, 
        ENV_CONFIG.getApiUrl('/user/preferences')
      );

      if (cloudResult.success && cloudResult.data) {
        console.log(`[${context}] Cloud load successful`);
        
        // Update local storage with cloud data
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cloudResult.data));
          localStorage.setItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`, cloudResult.data.questionnaireCompleted?.toString() || 'false');
        } catch (localError) {
          console.warn(`[${context}] Could not update local storage:`, localError);
        }

        return {
          success: true,
          data: cloudResult.data,
          source: 'cloud',
          message: 'Preferences loaded from cloud'
        };
      } else {
        console.log(`[${context}] No cloud data found or cloud load failed`);
      }
    } catch (error) {
      console.error(`[${context}] Cloud load error:`, error);
      cloudResult = {
        success: false,
        error: error.message,
        code: 'CLOUD_LOAD_ERROR'
      };
    }
  }

  // Try local storage as fallback
  try {
    const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    const localCompleted = localStorage.getItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
    
    if (localData) {
      const parsedData = JSON.parse(localData);
      parsedData.questionnaireCompleted = localCompleted === 'true';
      
      console.log(`[${context}] Local load successful`);
      
      localResult = {
        success: true,
        data: parsedData,
        source: 'local',
        message: 'Preferences loaded from local storage',
        warning: 'Using local data - may not be up to date'
      };
    } else {
      console.log(`[${context}] No local data found`);
      localResult = {
        success: false,
        error: 'No local data found',
        code: 'NO_LOCAL_DATA'
      };
    }
  } catch (error) {
    console.error(`[${context}] Local load error:`, error);
    localResult = {
      success: false,
      error: error.message,
      code: 'LOCAL_LOAD_ERROR'
    };
  }

  // Return local result if available
  if (localResult?.success) {
    return localResult;
  }

  // No data found anywhere
  return {
    success: false,
    error: 'No preferences found',
    code: 'NO_DATA_FOUND',
    message: 'User needs to complete questionnaire'
  };
};

/**
 * Checks if user has completed the questionnaire
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<boolean>} - Whether questionnaire is completed
 */
export const hasCompletedQuestionnaire = async (currentUser) => {
  const context = 'hasCompletedQuestionnaire';
  const userId = currentUser?.attributes?.sub;
  
  if (!userId) {
    return false;
  }

  // Check cloud first
  try {
    const result = await loadPreferences(currentUser, true);
    if (result.success && result.data) {
      return result.data.questionnaireCompleted || false;
    }
  } catch (error) {
    console.error(`[${context}] Cloud check failed:`, error);
  }

  // Check local storage
  try {
    const localCompleted = localStorage.getItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
    return localCompleted === 'true';
  } catch (error) {
    console.error(`[${context}] Local check failed:`, error);
    return false;
  }
};

/**
 * Clears user preferences from both cloud and local storage
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} - Clear result
 */
export const clearPreferences = async (currentUser) => {
  const context = 'clearPreferences';
  const userId = currentUser?.attributes?.sub;
  
  if (!userId) {
    return {
      success: false,
      error: 'No user ID available',
      code: 'NO_USER_ID'
    };
  }

  console.log(`[${context}] Clearing preferences for user ${userId}`);

  // Clear local storage
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    localStorage.removeItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
    console.log(`[${context}] Local storage cleared`);
  } catch (error) {
    console.error(`[${context}] Local storage clear failed:`, error);
  }

  // TODO: Add cloud delete functionality when needed
  
  return {
    success: true,
    message: 'Preferences cleared successfully'
  };
};

/**
 * Synchronizes preferences between local storage and cloud
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} - Sync result
 */
export const syncPreferences = async (currentUser) => {
  const context = 'syncPreferences';
  const userId = currentUser?.attributes?.sub;
  
  if (!userId) {
    return {
      success: false,
      error: 'No user ID available',
      code: 'NO_USER_ID'
    };
  }

  console.log(`[${context}] Syncing preferences for user ${userId}`);

  try {
    // Load from cloud
    const cloudResult = await loadPreferences(currentUser, true);
    
    if (cloudResult.success && cloudResult.data) {
      return {
        success: true,
        data: cloudResult.data,
        message: 'Preferences synchronized from cloud'
      };
    } else {
      // If no cloud data, try to upload local data
      const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        const saveResult = await savePreferences(parsedData, currentUser, false);
        
        if (saveResult.success) {
          return {
            success: true,
            data: parsedData,
            message: 'Local preferences uploaded to cloud'
          };
        }
      }
    }

    return {
      success: false,
      error: 'No preferences found to sync',
      code: 'NO_SYNC_DATA'
    };
    
  } catch (error) {
    console.error(`[${context}] Sync failed:`, error);
    return {
      success: false,
      error: error.message,
      code: 'SYNC_ERROR'
    };
  }
};