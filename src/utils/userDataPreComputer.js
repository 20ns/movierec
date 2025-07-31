/**
 * User Data Pre-Computer
 * 
 * Pre-computes user data validity to prevent UI flicker and ensure 
 * the correct initial state is shown immediately on component mount.
 * This solves the issue where users briefly see the "complete profile" 
 * banner even when they have sufficient data for recommendations.
 */

import { validateUserPreferences, shouldAttemptRecommendations } from './userDataValidator';

/**
 * Pre-computed user data states
 */
export const USER_DATA_STATES = {
  UNKNOWN: 'unknown',                    // Initial state, no data available yet
  INSUFFICIENT: 'insufficient',          // Not enough data for recommendations  
  SUFFICIENT: 'sufficient',              // Has enough data for recommendations
  EXCELLENT: 'excellent'                 // Complete profile with all data
};

/**
 * UI states based on user data pre-computation
 */
export const UI_STATES = {
  INITIALIZING: 'initializing',          // App is loading user data
  SHOW_BANNER: 'show_banner',           // Show complete profile banner
  SHOW_LOADING: 'show_loading',         // Show loading skeletons for recommendations
  SHOW_RECOMMENDATIONS: 'show_recommendations', // Show actual recommendations
  SHOW_ERROR: 'show_error'              // Show error state
};

/**
 * Pre-computes user data state to determine correct initial UI state
 * @param {Object} userPreferences - User preferences from props or localStorage
 * @param {boolean} hasCompletedQuestionnaire - Whether questionnaire is completed
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {boolean} initialAppLoadComplete - Whether initial app load is complete
 * @param {string} userId - User ID
 * @returns {Object} Pre-computed state information
 */
export function preComputeUserDataState(
  userPreferences, 
  hasCompletedQuestionnaire, 
  isAuthenticated, 
  initialAppLoadComplete, 
  userId
) {
  const result = {
    userDataState: USER_DATA_STATES.UNKNOWN,
    initialUIState: UI_STATES.INITIALIZING,
    shouldFetchRecommendations: false,
    shouldShowBanner: false,
    shouldShowLoading: false,
    canGenerateRecommendations: false,
    confidence: 0,
    reasoning: 'Initial state',
    userValidation: null,
    effectivePreferences: null
  };

  // Early returns for invalid states
  if (!isAuthenticated || !userId) {
    result.reasoning = 'User not authenticated';
    result.initialUIState = UI_STATES.SHOW_BANNER;
    result.shouldShowBanner = true;
    return result;
  }

  if (!initialAppLoadComplete) {
    result.reasoning = 'App still loading';
    result.initialUIState = UI_STATES.INITIALIZING;
    return result;
  }

  // Get effective user preferences (from props, localStorage, or empty)
  let effectivePreferences = getEffectiveUserPreferences(userPreferences, userId);
  result.effectivePreferences = effectivePreferences;

  // Validate user preferences
  const userValidation = validateUserPreferences(effectivePreferences);
  result.userValidation = userValidation;
  result.confidence = userValidation.confidence;

  // Determine user data state
  if (userValidation.canGenerateRecommendations) {
    if (userValidation.completionLevel === 'excellent') {
      result.userDataState = USER_DATA_STATES.EXCELLENT;
    } else {
      result.userDataState = USER_DATA_STATES.SUFFICIENT;
    }
    result.canGenerateRecommendations = true;
  } else {
    result.userDataState = USER_DATA_STATES.INSUFFICIENT;
    result.canGenerateRecommendations = false;
  }

  // Determine what actions should be taken
  result.shouldFetchRecommendations = shouldAttemptRecommendations(effectivePreferences);

  // Determine initial UI state
  if (result.shouldFetchRecommendations) {
    // User has sufficient data - show loading immediately, start fetching
    result.initialUIState = UI_STATES.SHOW_LOADING;
    result.shouldShowLoading = true;
    result.reasoning = `Sufficient data found (${userValidation.completionLevel}), starting recommendation fetch`;
  } else {
    // User doesn't have sufficient data - show banner immediately
    result.initialUIState = UI_STATES.SHOW_BANNER;
    result.shouldShowBanner = true;
    result.reasoning = `Insufficient data: ${userValidation.userGuidance}`;
  }

  return result;
}

/**
 * Gets effective user preferences by checking multiple sources
 * @param {Object} propUserPreferences - Preferences from props
 * @param {string} userId - User ID for localStorage lookup
 * @returns {Object} Effective user preferences
 */
function getEffectiveUserPreferences(propUserPreferences, userId) {
  // First try prop preferences
  if (propUserPreferences && Object.keys(propUserPreferences).length > 0) {
    return flattenNestedPreferences(propUserPreferences);
  }

  // Fallback to localStorage
  try {
    const localPrefs = localStorage.getItem(`userPrefs_${userId}`);
    if (localPrefs) {
      const parsedPrefs = JSON.parse(localPrefs);
      return flattenNestedPreferences(parsedPrefs);
    }
  } catch (error) {
    console.warn('Error reading localStorage preferences:', error);
  }

  // Return empty object if no preferences found
  return {};
}

/**
 * Flattens nested preference structures to handle legacy data formats
 * @param {Object} preferences - Raw preferences object
 * @returns {Object} Flattened preferences
 */
function flattenNestedPreferences(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    return {};
  }

  let flattened = { ...preferences };
  
  // Handle nested preferences structure
  if (preferences.preferences && typeof preferences.preferences === 'object') {
    flattened = { ...preferences, ...preferences.preferences };
    delete flattened.preferences;
  }

  return flattened;
}

/**
 * Creates a transition state object for managing UI state changes
 * @param {string} fromState - Current UI state
 * @param {string} toState - Target UI state
 * @param {string} reason - Reason for the transition
 * @returns {Object} Transition state information
 */
export function createTransitionState(fromState, toState, reason = '') {
  return {
    from: fromState,
    to: toState,
    reason,
    timestamp: Date.now(),
    isTransitioning: fromState !== toState
  };
}

/**
 * Validates a UI state transition to prevent invalid state changes
 * @param {string} fromState - Current state
 * @param {string} toState - Proposed new state
 * @returns {boolean} Whether the transition is valid
 */
export function isValidTransition(fromState, toState) {
  const validTransitions = {
    [UI_STATES.INITIALIZING]: [
      UI_STATES.SHOW_LOADING,
      UI_STATES.SHOW_BANNER,
      UI_STATES.SHOW_ERROR
    ],
    [UI_STATES.SHOW_LOADING]: [
      UI_STATES.SHOW_RECOMMENDATIONS,
      UI_STATES.SHOW_ERROR,
      UI_STATES.SHOW_BANNER
    ],
    [UI_STATES.SHOW_BANNER]: [
      UI_STATES.SHOW_LOADING,
      UI_STATES.SHOW_ERROR
    ],
    [UI_STATES.SHOW_RECOMMENDATIONS]: [
      UI_STATES.SHOW_LOADING,
      UI_STATES.SHOW_ERROR,
      UI_STATES.SHOW_BANNER
    ],
    [UI_STATES.SHOW_ERROR]: [
      UI_STATES.SHOW_LOADING,
      UI_STATES.SHOW_BANNER,
      UI_STATES.SHOW_RECOMMENDATIONS
    ]
  };

  return validTransitions[fromState]?.includes(toState) ?? false;
}

/**
 * Determines if user data has changed significantly enough to warrant re-computation
 * @param {Object} previousPreferences - Previous user preferences
 * @param {Object} currentPreferences - Current user preferences
 * @returns {boolean} Whether preferences have changed significantly
 */
export function hasSignificantDataChange(previousPreferences, currentPreferences) {
  if (!previousPreferences && !currentPreferences) return false;
  if (!previousPreferences || !currentPreferences) return true;

  // Check key fields that affect recommendation capability
  const keyFields = [
    'questionnaireCompleted',
    'genreRatings',
    'contentType',
    'dealBreakers'
  ];

  for (const field of keyFields) {
    const prevValue = previousPreferences[field];
    const currValue = currentPreferences[field];

    // Handle different data types
    if (typeof prevValue !== typeof currValue) return true;
    
    if (field === 'genreRatings') {
      // Check if genre ratings count has changed significantly
      const prevCount = prevValue ? Object.keys(prevValue).length : 0;
      const currCount = currValue ? Object.keys(currValue).length : 0;
      if (Math.abs(prevCount - currCount) > 2) return true;
    } else if (Array.isArray(prevValue) && Array.isArray(currValue)) {
      // Check array length changes
      if (Math.abs(prevValue.length - currValue.length) > 1) return true;
    } else {
      // Simple value comparison
      if (prevValue !== currValue) return true;
    }
  }

  return false;
}