// src/services/preferenceServiceEnhanced.js
// Enhanced User Preference Persistence Service with improved conflict resolution and retry logic

import { saveUserPreferences, fetchUserPreferences, validateAuthState } from './authService';
import ENV_CONFIG from '../config/environment';
import { 
  getUserId, 
  getCurrentUserInfo, 
  getAuthenticationStatus,
  refreshTokensIfNeeded 
} from '../utils/tokenUtilsEnhanced';
import { migrateUserPreferences, needsMigration } from '../utils/userDataMigration';
import { createComponentLogger, performanceMonitor } from '../utils/centralizedLogger';

const logger = createComponentLogger('PreferenceService');

// ===== CONSTANTS =====
const STORAGE_KEY_PREFIX = 'userPrefs_';
const QUESTIONNAIRE_KEY_PREFIX = 'questionnaire_completed_';
const CONFLICT_RESOLUTION_KEY = 'conflict_resolution_';
const SYNC_STATUS_KEY = 'sync_status_';

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 8000; // 8 seconds
const CLOUD_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ===== CACHING SYSTEM =====
class PreferenceCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = CACHE_TTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expires = Date.now() + ttl;
    this.cache.set(key, { value, expires });
    
    // Auto-cleanup
    setTimeout(() => {
      if (this.cache.has(key) && this.cache.get(key).expires <= Date.now()) {
        this.cache.delete(key);
      }
    }, ttl);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

const preferenceCache = new PreferenceCache();

// ===== RETRY LOGIC =====
const withRetry = async (operation, operationName, maxRetries = MAX_RETRY_ATTEMPTS) => {
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
      
      // Exponential backoff with jitter
      const baseDelay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
      const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
      const delay = baseDelay + jitter;
      
      logger.warn(`${operationName} attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`, { 
        error: error.message,
        nextDelay: delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// ===== CONFLICT RESOLUTION =====
const resolvePreferenceConflicts = (cloudData, localData, userId) => {
  const timer = performanceMonitor.startTiming('preference_conflict_resolution');
  
  try {
    if (!cloudData || !localData) {
      timer.end();
      return cloudData || localData;
    }

    const cloudTimestamp = new Date(cloudData.updatedAt || 0);
    const localTimestamp = new Date(localData.updatedAt || 0);

    // Strategy 1: Use most recent timestamp
    if (Math.abs(cloudTimestamp - localTimestamp) > 5000) { // 5 second difference
      const winner = cloudTimestamp > localTimestamp ? cloudData : localData;
      const source = cloudTimestamp > localTimestamp ? 'cloud' : 'local';
      
      logger.info('Conflict resolved by timestamp', {
        source,
        cloudTime: cloudTimestamp.toISOString(),
        localTime: localTimestamp.toISOString()
      });
      
      timer.end();
      return winner;
    }

    // Strategy 2: Merge complementary data
    const merged = {
      ...localData,
      ...cloudData,
      updatedAt: new Date().toISOString(),
      mergedAt: new Date().toISOString(),
      conflictResolved: true
    };

    // Handle questionnaire completion carefully
    const cloudCompleted = cloudData.questionnaireCompleted === true;
    const localCompleted = localData.questionnaireCompleted === true;
    
    // Validate completion with actual data
    const cloudGenreCount = countGenres(cloudData);
    const localGenreCount = countGenres(localData);
    
    if (cloudCompleted && cloudGenreCount > 0) {
      merged.questionnaireCompleted = true;
      merged.genreRatings = cloudData.genreRatings || merged.genreRatings;
    } else if (localCompleted && localGenreCount > 0) {
      merged.questionnaireCompleted = true;
      merged.genreRatings = localData.genreRatings || merged.genreRatings;
    } else {
      merged.questionnaireCompleted = false;
    }

    // Store conflict resolution metadata
    try {
      localStorage.setItem(`${CONFLICT_RESOLUTION_KEY}${userId}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        cloudTimestamp: cloudTimestamp.toISOString(),
        localTimestamp: localTimestamp.toISOString(),
        resolution: 'merged',
        cloudGenreCount,
        localGenreCount
      }));
    } catch (storageError) {
      logger.warn('Could not store conflict resolution metadata', { error: storageError.message });
    }

    logger.info('Preferences merged successfully', {
      cloudGenreCount,
      localGenreCount,
      finalCompleted: merged.questionnaireCompleted
    });
    
    timer.end();
    return merged;
    
  } catch (error) {
    logger.error('Error in conflict resolution', { error: error.message }, error);
    timer.end();
    // Fall back to cloud data as it's more likely to be authoritative
    return cloudData || localData;
  }
};

const countGenres = (data) => {
  if (!data) return 0;
  
  if (data.genreRatings && typeof data.genreRatings === 'object') {
    return Object.keys(data.genreRatings).length;
  }
  
  if (data.favoriteGenres && Array.isArray(data.favoriteGenres)) {
    return data.favoriteGenres.length;
  }
  
  if (data.genrePreferences && typeof data.genrePreferences === 'object') {
    return Object.keys(data.genrePreferences).length;
  }
  
  return 0;
};

// ===== VALIDATION =====
const validatePreferences = (preferences) => {
  if (!preferences || typeof preferences !== 'object') {
    return { valid: false, error: 'Preferences must be an object' };
  }

  const errors = [];
  
  // Validate completion status consistency
  if (preferences.questionnaireCompleted === true) {
    const genreCount = countGenres(preferences);
    if (genreCount === 0) {
      errors.push('Questionnaire marked complete but no genre data found');
    }
  }

  // Validate timestamps
  if (preferences.updatedAt && isNaN(new Date(preferences.updatedAt))) {
    errors.push('Invalid updatedAt timestamp');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : null,
    warnings: [] // Can add non-blocking warnings here
  };
};

// ===== ENHANCED SERVICE METHODS =====

/**
 * Saves user preferences with enhanced retry logic and conflict resolution
 * @param {Object} preferences - User preferences to save
 * @param {Object} currentUser - Current authenticated user
 * @param {boolean} isPartial - Whether this is a partial save (auto-save)
 * @returns {Promise<Object>} - Save result with success status and details
 */
export const savePreferences = async (preferences, currentUser, isPartial = false) => {
  const timer = performanceMonitor.startTiming('save_preferences');
  
  try {
    // Pre-flight checks
    const authStatus = await getAuthenticationStatus();
    if (!authStatus.isAuthenticated) {
      timer.end();
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_ERROR'
      };
    }

    const userId = await getUserId(currentUser);
    if (!userId) {
      timer.end();
      return {
        success: false,
        error: 'No user ID available',
        code: 'NO_USER_ID'
      };
    }

    // Validate preferences
    const validation = validatePreferences(preferences);
    if (!validation.valid) {
      timer.end();
      return {
        success: false,
        error: `Invalid preferences: ${validation.errors.join(', ')}`,
        code: 'VALIDATION_ERROR'
      };
    }

    const prefsToSave = {
      ...preferences,
      questionnaireCompleted: !isPartial || preferences.questionnaireCompleted,
      userId: userId,
      updatedAt: new Date().toISOString(),
      deviceId: navigator.userAgent?.slice(0, 50) || 'unknown', // For conflict resolution
      saveType: isPartial ? 'partial' : 'complete'
    };

    logger.debug('Starting preference save', {
      userId: '[USER_ID]',
      isPartial,
      questionnaireCompleted: prefsToSave.questionnaireCompleted,
      genreCount: countGenres(prefsToSave)
    });

    let cloudSaveResult = null;
    let localSaveResult = null;

    // Attempt cloud save with retry logic
    try {
      cloudSaveResult = await withRetry(async () => {
        // Refresh tokens if needed for long operations
        await refreshTokensIfNeeded();
        
        return await saveUserPreferences(
          prefsToSave, 
          currentUser, 
          ENV_CONFIG.getApiUrl('/user/preferences')
        );
      }, 'cloud_save');

      if (cloudSaveResult.success) {
        logger.info('Cloud save successful', {
          userId: '[USER_ID]',
          isPartial,
          responseTime: timer.getElapsed()
        });
        
        // Invalidate cache on successful save
        preferenceCache.invalidate(`prefs_${userId}`);
      }
    } catch (error) {
      logger.error('Cloud save failed after retries', { 
        error: error.message,
        userId: '[USER_ID]'
      }, error);
      
      cloudSaveResult = {
        success: false,
        error: error.message,
        code: error.name === 'TypeError' ? 'NETWORK_ERROR' : 'CLOUD_SAVE_ERROR'
      };
    }

    // Always save to local storage with error handling
    try {
      const localStorageKey = `${STORAGE_KEY_PREFIX}${userId}`;
      const questionnaireKey = `${QUESTIONNAIRE_KEY_PREFIX}${userId}`;
      
      localStorage.setItem(localStorageKey, JSON.stringify(prefsToSave));
      localStorage.setItem(questionnaireKey, prefsToSave.questionnaireCompleted.toString());
      
      // Update sync status
      localStorage.setItem(`${SYNC_STATUS_KEY}${userId}`, JSON.stringify({
        lastLocalSave: new Date().toISOString(),
        lastCloudSync: cloudSaveResult?.success ? new Date().toISOString() : null,
        pendingSync: !cloudSaveResult?.success
      }));
      
      localSaveResult = {
        success: true,
        message: 'Saved to local storage'
      };
      
      logger.debug('Local save successful', { userId: '[USER_ID]' });
      
    } catch (error) {
      logger.error('Local save failed', { 
        error: error.message,
        userId: '[USER_ID]'
      }, error);
      
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
      preferences: prefsToSave,
      performance: {
        totalTime: timer.getElapsed(),
        cloudTime: cloudSaveResult?.responseTime || null
      }
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

    timer.end();
    return result;
    
  } catch (error) {
    timer.end();
    logger.error('Unexpected error in savePreferences', { error: error.message }, error);
    
    return {
      success: false,
      error: error.message,
      code: 'UNEXPECTED_ERROR'
    };
  }
};

/**
 * Loads user preferences with enhanced caching and conflict resolution
 * @param {Object} currentUser - Current authenticated user
 * @param {boolean} forceCloudFetch - Force fetch from cloud even if cached
 * @returns {Promise<Object>} - Load result with preferences data
 */
export const loadPreferences = async (currentUser, forceCloudFetch = false) => {
  const timer = performanceMonitor.startTiming('load_preferences');
  
  try {
    const authStatus = await getAuthenticationStatus();
    if (!authStatus.isAuthenticated) {
      timer.end();
      return {
        success: false,
        error: 'User not authenticated',
        code: 'AUTH_ERROR'
      };
    }

    const userId = await getUserId(currentUser);
    if (!userId) {
      timer.end();
      return {
        success: false,
        error: 'No user ID available',
        code: 'NO_USER_ID'
      };
    }

    const cacheKey = `prefs_${userId}`;
    
    // Check cache first (unless force refresh)
    if (!forceCloudFetch) {
      const cached = preferenceCache.get(cacheKey);
      if (cached) {
        logger.debug('Using cached preferences', { userId: '[USER_ID]' });
        timer.end();
        return {
          success: true,
          data: cached,
          source: 'cache',
          message: 'Preferences loaded from cache'
        };
      }
    }

    logger.debug('Loading preferences', { 
      userId: '[USER_ID]',
      forceCloudFetch 
    });

    // Check for migration needs
    if (needsMigration(userId)) {
      logger.info('Migration needed, attempting migration', { userId: '[USER_ID]' });
      const migrationResult = migrateUserPreferences(userId);
      logger.info('Migration completed', { 
        userId: '[USER_ID]',
        success: migrationResult.success
      });
    }

    let cloudResult = null;
    let localResult = null;

    // Attempt cloud fetch with timeout and retry
    try {
      cloudResult = await withRetry(async () => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud fetch timeout')), CLOUD_TIMEOUT)
        );
        
        const fetchPromise = fetchUserPreferences(
          currentUser, 
          ENV_CONFIG.getApiUrl('/user/preferences')
        );
        
        return Promise.race([fetchPromise, timeoutPromise]);
      }, 'cloud_fetch');

      if (cloudResult.success && cloudResult.data) {
        logger.debug('Cloud fetch successful', {
          userId: '[USER_ID]',
          questionnaireCompleted: cloudResult.data.questionnaireCompleted,
          genreCount: countGenres(cloudResult.data)
        });
      }
    } catch (error) {
      logger.warn('Cloud fetch failed', {
        error: error.message,
        userId: '[USER_ID]'
      });
      
      cloudResult = {
        success: false,
        error: error.message,
        code: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'CLOUD_FETCH_ERROR'
      };
    }

    // Load local data for comparison/fallback
    try {
      const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      const localCompleted = localStorage.getItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
      
      if (localData) {
        const parsedData = JSON.parse(localData);
        parsedData.questionnaireCompleted = localCompleted === 'true';
        
        localResult = {
          success: true,
          data: parsedData,
          source: 'local'
        };
        
        logger.debug('Local data loaded', {
          userId: '[USER_ID]',
          questionnaireCompleted: parsedData.questionnaireCompleted,
          genreCount: countGenres(parsedData)
        });
      }
    } catch (error) {
      logger.warn('Local data load failed', {
        error: error.message,
        userId: '[USER_ID]'
      });
    }

    // Resolve conflicts and determine final result
    let finalResult = null;
    
    if (cloudResult?.success && localResult?.success) {
      // Both sources available - resolve conflicts
      const resolvedData = resolvePreferenceConflicts(
        cloudResult.data, 
        localResult.data, 
        userId
      );
      
      finalResult = {
        success: true,
        data: resolvedData,
        source: 'merged',
        message: 'Preferences loaded and conflicts resolved',
        conflictResolution: true
      };
      
      // Save resolved data back to both sources
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(resolvedData));
        localStorage.setItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`, resolvedData.questionnaireCompleted.toString());
      } catch (storageError) {
        logger.warn('Could not update local storage with resolved data', { 
          error: storageError.message 
        });
      }
      
    } else if (cloudResult?.success) {
      // Only cloud data available
      finalResult = {
        success: true,
        data: cloudResult.data,
        source: 'cloud',
        message: 'Preferences loaded from cloud'
      };
      
      // Update local storage
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cloudResult.data));
        localStorage.setItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`, cloudResult.data.questionnaireCompleted.toString());
      } catch (storageError) {
        logger.warn('Could not update local storage', { error: storageError.message });
      }
      
    } else if (localResult?.success) {
      // Only local data available
      finalResult = {
        success: true,
        data: localResult.data,
        source: 'local',
        message: 'Preferences loaded from local storage (cloud unavailable)',
        warning: 'Using local data - cloud sync will occur when network is available'
      };
      
    } else {
      // No data found
      finalResult = {
        success: false,
        error: 'No preferences found',
        code: 'NO_DATA_FOUND',
        message: 'User needs to complete questionnaire'
      };
    }

    // Cache successful results
    if (finalResult.success && finalResult.data) {
      preferenceCache.set(cacheKey, finalResult.data);
      
      // Validate data consistency
      const validation = validatePreferences(finalResult.data);
      finalResult.isValid = validation.valid;
      finalResult.validationWarnings = validation.warnings;
    }

    timer.end();
    finalResult.performance = {
      totalTime: timer.getElapsed()
    };

    return finalResult;
    
  } catch (error) {
    timer.end();
    logger.error('Unexpected error in loadPreferences', { error: error.message }, error);
    
    return {
      success: false,
      error: error.message,
      code: 'UNEXPECTED_ERROR'
    };
  }
};

/**
 * Enhanced questionnaire completion check with validation
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<boolean>} - Whether questionnaire is completed
 */
export const hasCompletedQuestionnaire = async (currentUser) => {
  const timer = performanceMonitor.startTiming('check_questionnaire_completion');
  
  try {
    const result = await loadPreferences(currentUser, true); // Force fresh check
    
    timer.end();
    
    if (result.success && result.data) {
      const isCompleted = result.data.questionnaireCompleted === true;
      const hasValidData = countGenres(result.data) > 0;
      const isConsistent = !isCompleted || hasValidData;
      
      logger.debug('Questionnaire completion check', {
        isCompleted,
        hasValidData,
        isConsistent,
        genreCount: countGenres(result.data)
      });
      
      return isCompleted && isConsistent;
    }
    
    return false;
    
  } catch (error) {
    timer.end();
    logger.error('Error checking questionnaire completion', { error: error.message }, error);
    return false;
  }
};

/**
 * Enhanced preference synchronization
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} - Sync result
 */
export const syncPreferences = async (currentUser) => {
  const timer = performanceMonitor.startTiming('sync_preferences');
  
  try {
    const userId = await getUserId(currentUser);
    if (!userId) {
      timer.end();
      return {
        success: false,
        error: 'No user ID available',
        code: 'NO_USER_ID'
      };
    }

    logger.info('Starting preference synchronization', { userId: '[USER_ID]' });
    
    // Invalidate cache to force fresh data
    preferenceCache.invalidate(`prefs_${userId}`);
    
    const result = await loadPreferences(currentUser, true);
    
    if (result.success) {
      // Update sync status
      try {
        localStorage.setItem(`${SYNC_STATUS_KEY}${userId}`, JSON.stringify({
          lastSync: new Date().toISOString(),
          status: 'success',
          source: result.source
        }));
      } catch (storageError) {
        logger.warn('Could not update sync status', { error: storageError.message });
      }
      
      timer.end();
      return {
        success: true,
        data: result.data,
        source: result.source,
        message: `Preferences synchronized from ${result.source}`,
        performance: {
          syncTime: timer.getElapsed()
        }
      };
    }
    
    timer.end();
    return {
      success: false,
      error: result.error || 'Sync failed',
      code: result.code || 'SYNC_ERROR'
    };
    
  } catch (error) {
    timer.end();
    logger.error('Sync failed with error', { error: error.message }, error);
    
    return {
      success: false,
      error: error.message,
      code: 'SYNC_ERROR'
    };
  }
};

/**
 * Clear preferences with proper cleanup
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} - Clear result
 */
export const clearPreferences = async (currentUser) => {
  const timer = performanceMonitor.startTiming('clear_preferences');
  
  try {
    const userId = await getUserId(currentUser);
    if (!userId) {
      timer.end();
      return {
        success: false,
        error: 'No user ID available',
        code: 'NO_USER_ID'
      };
    }

    logger.info('Clearing preferences', { userId: '[USER_ID]' });

    // Clear cache
    preferenceCache.invalidate(`prefs_${userId}`);

    // Clear local storage
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
      localStorage.removeItem(`${QUESTIONNAIRE_KEY_PREFIX}${userId}`);
      localStorage.removeItem(`${CONFLICT_RESOLUTION_KEY}${userId}`);
      localStorage.removeItem(`${SYNC_STATUS_KEY}${userId}`);
      
      logger.debug('Local storage cleared', { userId: '[USER_ID]' });
    } catch (error) {
      logger.warn('Could not clear local storage', { error: error.message });
    }

    timer.end();
    return {
      success: true,
      message: 'Preferences cleared successfully',
      performance: {
        clearTime: timer.getElapsed()
      }
    };
    
  } catch (error) {
    timer.end();
    logger.error('Error clearing preferences', { error: error.message }, error);
    
    return {
      success: false,
      error: error.message,
      code: 'CLEAR_ERROR'
    };
  }
};

/**
 * Get sync status and diagnostics
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} - Sync status information
 */
export const getSyncStatus = async (currentUser) => {
  try {
    const userId = await getUserId(currentUser);
    if (!userId) {
      return {
        success: false,
        error: 'No user ID available'
      };
    }

    const syncStatus = localStorage.getItem(`${SYNC_STATUS_KEY}${userId}`);
    const conflictResolution = localStorage.getItem(`${CONFLICT_RESOLUTION_KEY}${userId}`);
    
    return {
      success: true,
      syncStatus: syncStatus ? JSON.parse(syncStatus) : null,
      conflictResolution: conflictResolution ? JSON.parse(conflictResolution) : null,
      cacheStatus: {
        hasCachedPrefs: preferenceCache.get(`prefs_${userId}`) !== null
      }
    };
    
  } catch (error) {
    logger.error('Error getting sync status', { error: error.message }, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ===== EXPORTS =====
export default {
  savePreferences,
  loadPreferences,
  hasCompletedQuestionnaire,
  syncPreferences,
  clearPreferences,
  getSyncStatus
};