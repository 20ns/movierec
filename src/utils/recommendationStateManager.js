/**
 * Recommendation State Manager
 * 
 * Manages recommendation state with robust error handling and validation
 */

import { validateUserPreferences, getUserGuidance, shouldAttemptRecommendations } from './userDataValidator';

/**
 * Recommendation states
 */
export const RECOMMENDATION_STATES = {
  UNINITIALIZED: 'uninitialized',
  LOADING: 'loading', 
  SUCCESS: 'success',
  EMPTY_VALID: 'empty_valid', // API succeeded but returned no items (valid case)
  EMPTY_INSUFFICIENT_DATA: 'empty_insufficient_data', // No data due to incomplete profile
  ERROR: 'error',
  ERROR_NETWORK: 'error_network',
  ERROR_AUTH: 'error_auth'
};

/**
 * Creates initial recommendation state
 */
export function createInitialState() {
  return {
    state: RECOMMENDATION_STATES.UNINITIALIZED,
    recommendations: [],
    allRecommendations: [],
    displayIndex: 0,
    canRotate: false,
    userValidation: null,
    userGuidance: null,
    errorMessage: '',
    lastUpdateTimestamp: null,
    processingTime: null,
    dataSource: 'none',
    attemptCount: 0,
    maxAttempts: 3
  };
}

/**
 * Validates API response and determines appropriate state
 */
export function validateApiResponse(response, preferences) {
  const validation = {
    isValid: false,
    state: RECOMMENDATION_STATES.ERROR,
    items: [],
    message: '',
    dataSource: 'error'
  };

  // Check if response exists
  if (!response) {
    validation.message = 'No API response received';
    return validation;
  }

  let items = [];
  let dataSource = 'api';

  // Handle different response structures
  if (Array.isArray(response)) {
    // Direct array response
    items = response;
    dataSource = 'api';
  } else if (response.data && Array.isArray(response.data.items)) {
    // Wrapped in data object with items array
    items = response.data.items;
    dataSource = response.data.source || 'api';
  } else if (response.data && Array.isArray(response.data)) {
    // Wrapped in data object as direct array
    items = response.data;
    dataSource = 'api';
  } else if (response.items && Array.isArray(response.items)) {
    // Direct items property
    items = response.items;
    dataSource = response.source || 'api';
  } else {
    validation.message = 'Invalid API response structure - no items array found';
    return validation;
  }

  // Valid response structure
  validation.isValid = true;
  validation.items = items;
  validation.dataSource = dataSource;

  // Determine state based on items count and user data
  if (items.length > 0) {
    validation.state = RECOMMENDATION_STATES.SUCCESS;
    validation.message = `Found ${items.length} recommendations`;
  } else {
    // Empty response - determine if this is valid or due to insufficient data
    const userValidation = validateUserPreferences(preferences);
    
    if (userValidation.canGenerateRecommendations) {
      // User has sufficient data but API returned empty results
      // This could be due to very restrictive preferences or deal-breakers
      validation.state = RECOMMENDATION_STATES.EMPTY_VALID;
      validation.message = 'No matches found for your preferences. Try adjusting your deal-breakers or genre ratings.';
    } else {
      // User doesn't have sufficient data for recommendations
      validation.state = RECOMMENDATION_STATES.EMPTY_INSUFFICIENT_DATA;
      validation.message = userValidation.userGuidance;
    }
  }

  return validation;
}

/**
 * Processes API response and updates state accordingly
 */
export function processApiResponse(response, preferences, currentState) {
  const validation = validateApiResponse(response, preferences);
  const userValidation = validateUserPreferences(preferences);
  const userGuidance = getUserGuidance(userValidation);

  const newState = {
    ...currentState,
    state: validation.state,
    userValidation,
    userGuidance,
    errorMessage: validation.message,
    dataSource: validation.dataSource,
    lastUpdateTimestamp: Date.now(),
    processingTime: response?.data?.processingTime || response?.processingTime || null
  };

  if (validation.state === RECOMMENDATION_STATES.SUCCESS) {
    const items = validation.items.slice(0, 9); // Ensure max 9 items
    const displayItems = items.slice(0, 3); // Show first 3
    
    newState.allRecommendations = items;
    newState.recommendations = displayItems;
    newState.displayIndex = 0;
    newState.canRotate = items.length > 3;
    newState.errorMessage = '';
  } else {
    // For any non-success state, clear recommendations
    newState.allRecommendations = [];
    newState.recommendations = [];
    newState.displayIndex = 0;
    newState.canRotate = false;
  }

  return newState;
}

/**
 * Handles API errors and determines appropriate error state
 */
export function handleApiError(error, preferences, currentState) {
  let errorState = RECOMMENDATION_STATES.ERROR;
  let errorMessage = 'Unable to load recommendations';

  // Determine specific error type
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    errorState = RECOMMENDATION_STATES.ERROR_NETWORK;
    errorMessage = 'Network connection failed. Please check your internet connection.';
  } else if (error.response?.status === 401 || error.response?.status === 403) {
    errorState = RECOMMENDATION_STATES.ERROR_AUTH;
    errorMessage = 'Authentication failed. Please sign in again.';
  } else if (error.response?.status >= 500) {
    errorMessage = 'Server error. Please try again in a moment.';
  } else if (error.response?.status === 400) {
    errorMessage = 'Invalid request. Please complete your profile.';
  }

  const userValidation = validateUserPreferences(preferences);
  const userGuidance = getUserGuidance(userValidation);

  return {
    ...currentState,
    state: errorState,
    recommendations: [],
    allRecommendations: [],
    displayIndex: 0,
    canRotate: false,
    userValidation,
    userGuidance,
    errorMessage,
    dataSource: 'error',
    lastUpdateTimestamp: Date.now(),
    attemptCount: currentState.attemptCount + 1
  };
}

/**
 * Determines if another attempt should be made based on current state
 */
export function shouldRetry(state) {
  const retryableStates = [
    RECOMMENDATION_STATES.ERROR_NETWORK,
    RECOMMENDATION_STATES.ERROR
  ];

  return retryableStates.includes(state.state) && 
         state.attemptCount < state.maxAttempts;
}

/**
 * Creates rotation state for showing next set of recommendations
 */
export function createRotationState(currentState) {
  if (!currentState.canRotate || currentState.allRecommendations.length <= 3) {
    return currentState;
  }

  const totalItems = currentState.allRecommendations.length;
  const nextIndex = (currentState.displayIndex + 3) % totalItems;
  
  // Handle case where we don't have enough items for a full rotation
  const remainingItems = totalItems - nextIndex;
  const itemsToShow = Math.min(3, remainingItems);
  
  let nextRecommendations;
  if (itemsToShow < 3) {
    // If we can't show 3 full items, wrap around
    const endItems = currentState.allRecommendations.slice(nextIndex);
    const startItems = currentState.allRecommendations.slice(0, 3 - itemsToShow);
    nextRecommendations = [...endItems, ...startItems];
  } else {
    nextRecommendations = currentState.allRecommendations.slice(nextIndex, nextIndex + 3);
  }

  return {
    ...currentState,
    recommendations: nextRecommendations,
    displayIndex: nextIndex,
    lastUpdateTimestamp: Date.now()
  };
}

/**
 * Gets user-friendly status message based on current state
 */
export function getStatusMessage(state) {
  switch (state.state) {
    case RECOMMENDATION_STATES.LOADING:
      return 'Finding perfect recommendations for you...';
    
    case RECOMMENDATION_STATES.SUCCESS:
      const total = state.allRecommendations.length;
      const showing = state.recommendations.length;
      const sets = Math.ceil(total / 3);
      return `Showing ${showing} of ${total} personalized recommendations • ${sets} sets available`;
    
    case RECOMMENDATION_STATES.EMPTY_VALID:
      return 'No matches found with current preferences';
    
    case RECOMMENDATION_STATES.EMPTY_INSUFFICIENT_DATA:
      return 'Complete your profile to get recommendations';
    
    case RECOMMENDATION_STATES.ERROR_NETWORK:
      return 'Connection failed - Check your internet';
    
    case RECOMMENDATION_STATES.ERROR_AUTH:
      return 'Authentication required - Please sign in';
    
    case RECOMMENDATION_STATES.ERROR:
      return 'Unable to load recommendations';
    
    default:
      return 'Ready to find recommendations';
  }
}

/**
 * Determines if recommendations should be displayed
 */
export function shouldShowRecommendations(state) {
  return state.state === RECOMMENDATION_STATES.SUCCESS && 
         state.recommendations.length > 0;
}

/**
 * Determines if loading state should be displayed
 */
export function shouldShowLoading(state) {
  return state.state === RECOMMENDATION_STATES.LOADING;
}

/**
 * Determines if error state should be displayed
 */
export function shouldShowError(state) {
  const errorStates = [
    RECOMMENDATION_STATES.ERROR,
    RECOMMENDATION_STATES.ERROR_NETWORK,
    RECOMMENDATION_STATES.ERROR_AUTH
  ];
  return errorStates.includes(state.state);
}

/**
 * Determines if empty state should be displayed
 */
export function shouldShowEmpty(state) {
  const emptyStates = [
    RECOMMENDATION_STATES.EMPTY_VALID,
    RECOMMENDATION_STATES.EMPTY_INSUFFICIENT_DATA
  ];
  return emptyStates.includes(state.state);
}