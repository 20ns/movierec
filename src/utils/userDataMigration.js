// User Data Migration Utility for AWS Amplify v5 → v6 Transition
// Handles migration of localStorage data from old user ID formats to new UUID format

/**
 * Migrates user preferences from old localStorage keys to new UUID-based keys
 * @param {string} newUserId - New UUID from AWS Amplify v6
 * @param {string} userEmail - User's email for identifying old preferences
 * @returns {Object} - Migration result with found preferences
 */
export const migrateUserPreferences = (newUserId, userEmail = null) => {
  try {
    console.log('[UserDataMigration] Starting migration for user ID:', newUserId);
    console.log('[UserDataMigration] User email:', userEmail);
    
    // List all localStorage keys to understand what's stored
    const allKeys = Object.keys(localStorage);
    console.log('[UserDataMigration] All localStorage keys:', allKeys);
    
    // Look for existing preference keys with different patterns
    const preferenceKeys = allKeys.filter(key => 
      key.includes('userPrefs_') || 
      key.includes('questionnaire_completed_') ||
      key.includes('Prefs') ||
      key.includes('preferences') ||
      key.includes('user_preferences') ||
      key.includes('movieRec') ||
      key.includes('profile') ||
      key.includes('questionnaire') ||
      (key.includes('user') && (key.includes('pref') || key.includes('quest'))) ||
      // Common email patterns
      key.includes('@') ||
      // Any key that looks like it might contain preference data
      (key.includes('_') && (
        key.toLowerCase().includes('genre') ||
        key.toLowerCase().includes('rating') ||
        key.toLowerCase().includes('completed') ||
        key.toLowerCase().includes('settings')
      ))
    );
    
    console.log('[UserDataMigration] Found preference-related keys:', preferenceKeys);
    
    let migratedPreferences = null;
    let migratedQuestionnaire = false;
    let sourceKey = null;
    
    // Try to find preferences with different key patterns
    for (const key of preferenceKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          console.log(`[UserDataMigration] Checking key ${key}:`, data.substring(0, 100) + '...');
          
          // Try to parse the data
          let parsedData;
          if (key.includes('questionnaire_completed_')) {
            parsedData = data === 'true';
            if (parsedData) {
              migratedQuestionnaire = true;
              console.log(`[UserDataMigration] Found completed questionnaire in ${key}`);
            }
          } else {
            parsedData = JSON.parse(data);
            if (parsedData && typeof parsedData === 'object') {
              migratedPreferences = parsedData;
              sourceKey = key;
              console.log(`[UserDataMigration] Found preferences in ${key}:`, Object.keys(parsedData));
              break; // Use the first valid preferences found
            }
          }
        }
      } catch (e) {
        console.warn(`[UserDataMigration] Could not parse data from ${key}:`, e.message);
      }
    }
    
    // If we found preferences, migrate them to the new keys
    if (migratedPreferences || migratedQuestionnaire) {
      const newPrefsKey = `userPrefs_${newUserId}`;
      const newQuestionnaireKey = `questionnaire_completed_${newUserId}`;
      
      if (migratedPreferences) {
        console.log(`[UserDataMigration] Migrating preferences from ${sourceKey} to ${newPrefsKey}`);
        localStorage.setItem(newPrefsKey, JSON.stringify(migratedPreferences));
      }
      
      if (migratedQuestionnaire) {
        console.log(`[UserDataMigration] Migrating questionnaire completion to ${newQuestionnaireKey}`);
        localStorage.setItem(newQuestionnaireKey, 'true');
      }
      
      return {
        success: true,
        migratedPreferences,
        migratedQuestionnaire,
        sourceKey,
        newPrefsKey,
        newQuestionnaireKey
      };
    }
    
    console.log('[UserDataMigration] No preferences found to migrate');
    return {
      success: false,
      reason: 'No preferences found',
      availableKeys: preferenceKeys
    };
    
  } catch (error) {
    console.error('[UserDataMigration] Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets the user's email from current user session for migration purposes
 * @param {Object} currentUser - Current AWS Amplify user object
 * @returns {Promise<string|null>} - User email or null
 */
export const getUserEmailForMigration = async (currentUser) => {
  try {
    // Try different ways to get email from v6 format
    if (currentUser?.signInDetails?.loginId) {
      return currentUser.signInDetails.loginId;
    }
    
    // Try from token
    const { getCurrentUserInfo } = await import('./tokenUtils');
    const userInfo = await getCurrentUserInfo();
    if (userInfo?.email) {
      return userInfo.email;
    }
    
    // Fallback to v5 format if present
    if (currentUser?.attributes?.email) {
      return currentUser.attributes.email;
    }
    
    return null;
  } catch (error) {
    console.warn('[UserDataMigration] Could not get user email:', error.message);
    return null;
  }
};

/**
 * Checks if migration is needed for the current user
 * @param {string} newUserId - New UUID from AWS Amplify v6
 * @returns {boolean} - True if migration is needed
 */
export const needsMigration = (newUserId) => {
  const newPrefsKey = `userPrefs_${newUserId}`;
  const newQuestionnaireKey = `questionnaire_completed_${newUserId}`;
  
  // If new keys already exist, no migration needed
  const hasNewPrefs = localStorage.getItem(newPrefsKey);
  const hasNewQuestionnaire = localStorage.getItem(newQuestionnaireKey);
  
  if (hasNewPrefs || hasNewQuestionnaire) {
    console.log('[UserDataMigration] New format data already exists, no migration needed');
    return false;
  }
  
  // Check if any old format data exists using the same patterns as migration
  const allKeys = Object.keys(localStorage);
  const hasOldData = allKeys.some(key => 
    // Skip the new format keys
    !key.includes(`userPrefs_${newUserId}`) && 
    !key.includes(`questionnaire_completed_${newUserId}`) &&
    (
      key.includes('userPrefs_') || 
      key.includes('questionnaire_completed_') ||
      key.includes('Prefs') ||
      key.includes('preferences') ||
      key.includes('user_preferences') ||
      key.includes('movieRec') ||
      key.includes('profile') ||
      key.includes('questionnaire') ||
      (key.includes('user') && (key.includes('pref') || key.includes('quest'))) ||
      key.includes('@') ||
      (key.includes('_') && (
        key.toLowerCase().includes('genre') ||
        key.toLowerCase().includes('rating') ||
        key.toLowerCase().includes('completed') ||
        key.toLowerCase().includes('settings')
      ))
    )
  );
  
  console.log('[UserDataMigration] Migration needed:', hasOldData);
  return hasOldData;
};

export default {
  migrateUserPreferences,
  getUserEmailForMigration,
  needsMigration
};