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
      // Cloud save successful
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

  let cloudResult = null;
  let localResult = null;

  // Always try cloud first to ensure data consistency
  try {
    // Add timeout and retry logic for better reliability
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cloud fetch timeout')), 8000)
    );
    
    const fetchPromise = fetchUserPreferences(
      currentUser, 
      ENV_CONFIG.getApiUrl('/user/preferences')
    );
    
    cloudResult = await Promise.race([fetchPromise, timeoutPromise]);

    if (cloudResult.success && cloudResult.data) {
      console.log(`[${context}] Cloud load successful - questionnaire completed: ${cloudResult.data.questionnaireCompleted}`);
      
      // Validate that cloud data actually indicates completion (flexible validation)
      const hasCompletionFlag = cloudResult.data.questionnaireCompleted === true || cloudResult.data.isCompleted === true;
      const hasGenreData = !!(cloudResult.data.genreRatings || cloudResult.data.favoriteGenres || cloudResult.data.genrePreferences);
      let genreCount = 0;
      
      // Count genres in different possible formats
      if (cloudResult.data.genreRatings && typeof cloudResult.data.genreRatings === 'object') {
        genreCount = Object.keys(cloudResult.data.genreRatings).length;
      } else if (cloudResult.data.favoriteGenres && Array.isArray(cloudResult.data.favoriteGenres)) {
        genreCount = cloudResult.data.favoriteGenres.length;
      } else if (cloudResult.data.genrePreferences && typeof cloudResult.data.genrePreferences === 'object') {
        genreCount = Object.keys(cloudResult.data.genrePreferences).length;
      }
      
      const isReallyCompleted = hasCompletionFlag && hasGenreData && genreCount > 0;
      
      // Edge case: Handle malformed genre data
      if (hasGenreData && genreCount === 0) {
        console.warn(`[${context}] Edge case: Genre data exists but count is 0, checking for malformed data`);
        // Try to recover from malformed data structures
        const allGenreFields = [cloudResult.data.genreRatings, cloudResult.data.favoriteGenres, cloudResult.data.genrePreferences];
        for (const field of allGenreFields) {
          if (field && typeof field === 'object') {
            const recoveredCount = Array.isArray(field) ? field.filter(Boolean).length : Object.keys(field).length;
            if (recoveredCount > 0) {
              genreCount = recoveredCount;
              console.log(`[${context}] Recovered genre count: ${genreCount}`);
              break;
            }
          }
        }
      }
      
      // Debug logging for preference structure
      console.log(`[${context}] Cloud data structure:`, {
        questionnaireCompleted: cloudResult.data.questionnaireCompleted,
        isCompleted: cloudResult.data.isCompleted,
        hasCompletionFlag,
        hasGenreRatings: !!cloudResult.data.genreRatings,
        hasFavoriteGenres: !!cloudResult.data.favoriteGenres,
        hasGenrePreferences: !!cloudResult.data.genrePreferences,
        hasGenreData,
        genreCount,
        dataKeys: Object.keys(cloudResult.data),
        isReallyCompleted: hasCompletionFlag && hasGenreData && genreCount > 0
      });
      
      // Force consistency - fix both directions of corruption
      if (cloudResult.data.questionnaireCompleted && !isReallyCompleted) {
        console.warn(`[${context}] Cloud data inconsistent - marked complete but missing genre ratings`);
        cloudResult.data.questionnaireCompleted = false;
      } else if (!cloudResult.data.questionnaireCompleted && isReallyCompleted) {
        console.warn(`[${context}] Cloud data corruption detected - has genre data but marked incomplete. Auto-fixing...`);
        cloudResult.data.questionnaireCompleted = true;
        
        // Save the corrected data back to cloud to prevent future issues
        try {
          console.log(`[${context}] Saving corrected questionnaire completion flag to cloud...`);
          // Add retry logic for save operations
          let saveAttempts = 0;
          let saveResult = null;
          
          while (saveAttempts < 3) {
            try {
              saveResult = await savePreferences(cloudResult.data, currentUser, false);
              if (saveResult.success) break;
              saveAttempts++;
              if (saveAttempts < 3) {
                console.log(`[${context}] Save attempt ${saveAttempts} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * saveAttempts));
              }
            } catch (retryError) {
              saveAttempts++;
              if (saveAttempts >= 3) throw retryError;
            }
          }
          
          if (saveResult?.success) {
            console.log(`[${context}] Successfully saved corrected data to cloud (attempt ${saveAttempts})`);
          } else {
            console.warn(`[${context}] Failed to save corrected data to cloud after ${saveAttempts} attempts:`, saveResult?.error);
          }
        } catch (saveError) {
          console.error(`[${context}] Error saving corrected data to cloud:`, saveError);
          // Don't block the user experience if save fails
        }
      }
      
      // Update local storage with corrected cloud data
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cloudResult.data));
        localStorage.setItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`, cloudResult.data.questionnaireCompleted?.toString() || 'false');
        console.log(`[${context}] Updated localStorage with cloud data - completed: ${cloudResult.data.questionnaireCompleted}`);
      } catch (localError) {
        console.warn(`[${context}] Could not update local storage:`, localError);
      }

      return {
        success: true,
        data: cloudResult.data,
        source: 'cloud',
        message: 'Preferences loaded from cloud',
        isConsistent: isReallyCompleted || !cloudResult.data.questionnaireCompleted
      };
    } else {
      // No cloud data found or cloud load failed
      // If cloud explicitly returns no data, clear any stale local data
      if (cloudResult?.success === false && cloudResult?.code === 'NO_DATA_FOUND') {
        try {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
          localStorage.removeItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
          // Cleared stale local data - cloud confirmed no data exists
        } catch (e) {
          console.warn(`[${context}] Could not clear local storage:`, e);
        }
      }
    }
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    console.error(`[${context}] Cloud load error:`, error);
    
    // Categorize different types of errors for better handling
    let errorCode = 'CLOUD_LOAD_ERROR';
    if (errorMessage.includes('timeout') || errorMessage.includes('Network')) {
      errorCode = 'NETWORK_ERROR';
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      errorCode = 'AUTH_ERROR';
    } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      errorCode = 'SERVER_ERROR';
    }
    
    cloudResult = {
      success: false,
      error: errorMessage,
      code: errorCode
    };
  }

  // Try local storage as fallback (for network issues, server errors, or general cloud failures)
  if (cloudResult?.code === 'NETWORK_ERROR' || cloudResult?.code === 'SERVER_ERROR' || cloudResult?.code === 'CLOUD_LOAD_ERROR') {
    try {
      const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      const localCompleted = localStorage.getItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        parsedData.questionnaireCompleted = localCompleted === 'true';
        
        // Validate local data consistency too (flexible validation)
        const hasLocalCompletionFlag = parsedData.questionnaireCompleted === true || parsedData.isCompleted === true;
        const hasLocalGenreData = !!(parsedData.genreRatings || parsedData.favoriteGenres || parsedData.genrePreferences);
        let localGenreCount = 0;
        
        if (parsedData.genreRatings && typeof parsedData.genreRatings === 'object') {
          localGenreCount = Object.keys(parsedData.genreRatings).length;
        } else if (parsedData.favoriteGenres && Array.isArray(parsedData.favoriteGenres)) {
          localGenreCount = parsedData.favoriteGenres.length;
        } else if (parsedData.genrePreferences && typeof parsedData.genrePreferences === 'object') {
          localGenreCount = Object.keys(parsedData.genrePreferences).length;
        }
        
        const isLocallyConsistent = hasLocalCompletionFlag && hasLocalGenreData && localGenreCount > 0;
        
        if (parsedData.questionnaireCompleted && !isLocallyConsistent) {
          console.warn(`[${context}] Local data inconsistent - marking as incomplete`);
          parsedData.questionnaireCompleted = false;
          localStorage.setItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`, 'false');
        }
        
        // Local fallback load successful
        
        localResult = {
          success: true,
          data: parsedData,
          source: 'local',
          message: 'Preferences loaded from local storage (cloud unavailable)',
          warning: 'Using local data - cloud sync will occur when network is available',
          isConsistent: isLocallyConsistent || !parsedData.questionnaireCompleted
        };
      } else {
        // No local data found
      }
    } catch (error) {
      console.error(`[${context}] Local load error:`, error);
    }
  }

  // Return local result if available
  if (localResult?.success) {
    return localResult;
  }

  // No data found anywhere
  // No preferences found anywhere
  return {
    success: false,
    error: 'No preferences found',
    code: 'NO_DATA_FOUND',
    message: 'User needs to complete questionnaire'
  };
};

/**
 * Checks if user has completed the questionnaire with robust validation
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<boolean>} - Whether questionnaire is completed
 */
export const hasCompletedQuestionnaire = async (currentUser) => {
  const context = 'hasCompletedQuestionnaire';
  const userId = currentUser?.attributes?.sub;
  
  if (!userId) {
    // No user ID provided
    return false;
  }

  // Use the improved loadPreferences which validates data consistency
  try {
    const result = await loadPreferences(currentUser, true); // Force cloud check
    
    if (result.success && result.data) {
      const isCompleted = result.data.questionnaireCompleted === true;
      // Result from source: completed status, consistency status
      
      // If data is inconsistent, treat as incomplete regardless of flag
      if (!result.isConsistent) {
        console.warn(`[${context}] Data marked as inconsistent - treating as incomplete`);
        return false;
      }
      
      return isCompleted;
    }
    
    // No preferences found - questionnaire not completed
    return false;
    
  } catch (error) {
    console.error(`[${context}] Error checking questionnaire status:`, error);
    
    // Emergency fallback - check local storage but be very conservative
    try {
      const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      const localCompleted = localStorage.getItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
      
      if (localCompleted === 'true' && localData) {
        const parsedData = JSON.parse(localData);
        // Validate local data has actual content
        const hasRealData = parsedData.genreRatings && Object.keys(parsedData.genreRatings).length > 0;
        
        if (hasRealData) {
          console.warn(`[${context}] Using local fallback - questionnaire appears completed`);
          return true;
        } else {
          console.warn(`[${context}] Local data incomplete - treating as not completed`);
          // Clear inconsistent local data
          localStorage.removeItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
          return false;
        }
      }
    } catch (localError) {
      console.error(`[${context}] Local fallback failed:`, localError);
    }
    
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

  // Clear local storage
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    localStorage.removeItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
    // Local storage cleared
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

  // Syncing preferences
  
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