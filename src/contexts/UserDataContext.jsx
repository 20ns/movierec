// src/contexts/UserDataContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { validateUserPreferences, getUserGuidance } from '../utils/userDataValidator';
import { loadPreferences } from '../services/preferenceService';
import { validateAuthState } from '../services/authService';
import { getUserId, getCurrentAccessToken } from '../utils/tokenUtils';

// ===== ACTION TYPES =====
const ActionTypes = {
  // Authentication
  SET_AUTH_STATE: 'SET_AUTH_STATE',
  SET_INITIAL_LOAD_COMPLETE: 'SET_INITIAL_LOAD_COMPLETE',
  
  // Preferences
  SET_PREFERENCES_LOADING: 'SET_PREFERENCES_LOADING',
  SET_PREFERENCES_SUCCESS: 'SET_PREFERENCES_SUCCESS',
  SET_PREFERENCES_ERROR: 'SET_PREFERENCES_ERROR',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  
  // Questionnaire
  SET_QUESTIONNAIRE_COMPLETED: 'SET_QUESTIONNAIRE_COMPLETED',
  SET_QUESTIONNAIRE_STAGE: 'SET_QUESTIONNAIRE_STAGE',
  UPDATE_COMPLETED_STAGES: 'UPDATE_COMPLETED_STAGES',
  
  // Recommendations
  SET_RECOMMENDATIONS_STATE: 'SET_RECOMMENDATIONS_STATE',
  SET_RECOMMENDATIONS_LOADING: 'SET_RECOMMENDATIONS_LOADING',
  SET_RECOMMENDATIONS_VISIBLE: 'SET_RECOMMENDATIONS_VISIBLE',
  
  // Progress & Stats
  UPDATE_USER_PROGRESS: 'UPDATE_USER_PROGRESS',
  
  // UI State
  SET_UI_STATE: 'SET_UI_STATE',
  RESET_STATE: 'RESET_STATE'
};

// ===== INITIAL STATE =====
const initialState = {
  // Authentication
  isAuthenticated: false,
  currentUser: null,
  userId: null,
  initialAppLoadComplete: false,
  justSignedIn: false,
  
  // Preferences
  userPreferences: null,
  preferencesLoading: false,
  preferencesError: null,
  preferencesLastUpdated: null,
  preferencesSource: null, // 'local' | 'cloud' | 'questionnaire'
  
  // Questionnaire State
  questionnaireCompleted: false,
  currentStage: 'essential',
  completedStages: [],
  questionnaireProgress: 0,
  
  // Validation & Guidance
  validationResult: null,
  userGuidance: null,
  completionPercentage: 0,
  canGenerateRecommendations: false,
  hasBasicProfile: false,
  
  // Recommendations
  recommendationsState: 'uninitialized', // 'uninitialized' | 'loading' | 'success' | 'error'
  recommendationsVisible: false,
  recommendationsData: null,
  recommendationsError: null,
  
  // Progress & Stats
  userProgress: {
    level: 1,
    xp: 0,
    streak: 0,
    stats: {}
  },
  
  // UI State
  showPreferencesPrompt: false,
  showQuestionnaireModal: false,
  syncInProgress: false,
  lastSyncTimestamp: null
};

// ===== REDUCER =====
function userDataReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_AUTH_STATE:
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        currentUser: action.payload.currentUser,
        userId: action.payload.userId,
        justSignedIn: action.payload.justSignedIn || false
      };

    case ActionTypes.SET_INITIAL_LOAD_COMPLETE:
      return {
        ...state,
        initialAppLoadComplete: action.payload
      };

    case ActionTypes.SET_PREFERENCES_LOADING:
      return {
        ...state,
        preferencesLoading: action.payload,
        preferencesError: action.payload ? null : state.preferencesError
      };

    case ActionTypes.SET_PREFERENCES_SUCCESS:
      const { preferences, source, validationResult, userGuidance } = action.payload;
      return {
        ...state,
        userPreferences: preferences,
        preferencesLoading: false,
        preferencesError: null,
        preferencesLastUpdated: new Date().toISOString(),
        preferencesSource: source,
        questionnaireCompleted: preferences?.questionnaireCompleted || false,
        validationResult,
        userGuidance,
        completionPercentage: userGuidance?.progressPercent ?? validationResult?.confidence ?? 0,
        canGenerateRecommendations: validationResult?.canGenerateRecommendations || false,
        hasBasicProfile: validationResult?.hasBasicProfile || false
      };

    case ActionTypes.SET_PREFERENCES_ERROR:
      return {
        ...state,
        preferencesLoading: false,
        preferencesError: action.payload,
        userPreferences: null,
        questionnaireCompleted: false
      };

    case ActionTypes.UPDATE_PREFERENCES:
      const newPreferences = action.payload;
      const newValidation = validateUserPreferences(newPreferences);
      const newGuidance = getUserGuidance(newValidation);
      
      return {
        ...state,
        userPreferences: newPreferences,
        preferencesLastUpdated: new Date().toISOString(),
        validationResult: newValidation,
        userGuidance: newGuidance,
        completionPercentage: newGuidance?.progressPercent ?? newValidation?.confidence ?? 0,
        canGenerateRecommendations: newValidation?.canGenerateRecommendations || false,
        hasBasicProfile: newValidation?.hasBasicProfile || false,
        questionnaireCompleted: newPreferences?.questionnaireCompleted || false
      };

    case ActionTypes.SET_QUESTIONNAIRE_COMPLETED:
      return {
        ...state,
        questionnaireCompleted: action.payload,
        showQuestionnaireModal: false,
        showPreferencesPrompt: !action.payload
      };

    case ActionTypes.SET_QUESTIONNAIRE_STAGE:
      return {
        ...state,
        currentStage: action.payload
      };

    case ActionTypes.UPDATE_COMPLETED_STAGES:
      return {
        ...state,
        completedStages: action.payload
      };

    case ActionTypes.SET_RECOMMENDATIONS_STATE:
      return {
        ...state,
        recommendationsState: action.payload.state,
        recommendationsData: action.payload.data || state.recommendationsData,
        recommendationsError: action.payload.error || null
      };

    case ActionTypes.SET_RECOMMENDATIONS_LOADING:
      return {
        ...state,
        recommendationsState: action.payload ? 'loading' : 'uninitialized'
      };

    case ActionTypes.SET_RECOMMENDATIONS_VISIBLE:
      return {
        ...state,
        recommendationsVisible: action.payload
      };

    case ActionTypes.UPDATE_USER_PROGRESS:
      return {
        ...state,
        userProgress: {
          ...state.userProgress,
          ...action.payload
        }
      };

    case ActionTypes.SET_UI_STATE:
      return {
        ...state,
        ...action.payload
      };

    case ActionTypes.RESET_STATE:
      return {
        ...initialState,
        initialAppLoadComplete: state.initialAppLoadComplete
      };

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

// ===== CONTEXT =====
const UserDataContext = createContext(null);

// ===== CUSTOM HOOK =====
export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

// ===== PROVIDER COMPONENT =====
export const UserDataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userDataReducer, initialState);
  
  // Refs for preventing race conditions
  const fetchingPreferencesRef = useRef(false);
  const refreshCycleRef = useRef(0);
  const prevUserIdRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Logging helper
  const logContext = useCallback((message, data) => {
    console.log(`[UserDataContext] ${message}`, data || '');
  }, []);

  // ===== CORE ACTION CREATORS =====

  const setAuthState = useCallback(async (isAuthenticated, currentUser) => {
    const userId = currentUser ? await getUserId(currentUser) : null;
    
    dispatch({
      type: ActionTypes.SET_AUTH_STATE,
      payload: {
        isAuthenticated,
        currentUser,
        userId,
        justSignedIn: isAuthenticated && !state.isAuthenticated
      }
    });

    // Reset state on logout
    if (!isAuthenticated) {
      dispatch({ type: ActionTypes.RESET_STATE });
    }

    logContext('Auth state updated', { isAuthenticated, userId });
  }, [state.isAuthenticated]);

  const setInitialLoadComplete = useCallback((complete) => {
    dispatch({
      type: ActionTypes.SET_INITIAL_LOAD_COMPLETE,
      payload: complete
    });
    logContext('Initial load complete', complete);
  }, []);

  // ===== PREFERENCE MANAGEMENT =====

  const fetchPreferences = useCallback(async (forceRefresh = false) => {
    if (!state.isAuthenticated || !state.currentUser || fetchingPreferencesRef.current) {
      logContext('Fetch preferences skipped', {
        isAuthenticated: state.isAuthenticated,
        hasUser: !!state.currentUser,
        isFetching: fetchingPreferencesRef.current
      });
      return null;
    }

    // Prevent concurrent fetches
    fetchingPreferencesRef.current = true;
    refreshCycleRef.current++;
    const currentCycle = refreshCycleRef.current;

    dispatch({ type: ActionTypes.SET_PREFERENCES_LOADING, payload: true });
    logContext('Fetching preferences', { userId: state.userId, forceRefresh, cycle: currentCycle });

    try {
      // Validate auth state
      const authState = await validateAuthState(state.currentUser);
      if (!authState.valid) {
        throw new Error(`Authentication validation failed: ${authState.error}`);
      }

      // Load preferences
      const result = await loadPreferences(state.currentUser, forceRefresh);

      // Check if this fetch is still relevant (race condition protection)
      if (currentCycle !== refreshCycleRef.current || !isMountedRef.current) {
        logContext('Aborting outdated fetch', { cycle: currentCycle, current: refreshCycleRef.current });
        return null;
      }

      if (result.success && result.data) {
        const preferences = result.data;
        const validation = validateUserPreferences(preferences);
        const guidance = getUserGuidance(validation);

        dispatch({
          type: ActionTypes.SET_PREFERENCES_SUCCESS,
          payload: {
            preferences,
            source: result.source,
            validationResult: validation,
            userGuidance: guidance
          }
        });

        logContext('Preferences loaded successfully', {
          source: result.source,
          questionnaireCompleted: preferences.questionnaireCompleted,
          isConsistent: result.isConsistent
        });

        // Update localStorage
        try {
          if (state.userId) {
            localStorage.setItem(`userPrefs_${state.userId}`, JSON.stringify(preferences));
            if (preferences.questionnaireCompleted) {
              localStorage.setItem(`questionnaire_completed_${state.userId}`, 'true');
            }
          }
        } catch (e) {
          console.warn('Error updating localStorage:', e);
        }

        return preferences;
      } else {
        logContext('No preferences found', { code: result.code, error: result.error });
        dispatch({
          type: ActionTypes.SET_PREFERENCES_ERROR,
          payload: result.error || 'No preferences found'
        });
        return null;
      }

    } catch (error) {
      logContext('Error fetching preferences', error);
      dispatch({
        type: ActionTypes.SET_PREFERENCES_ERROR,
        payload: error.message || 'Failed to load preferences'
      });
      return null;
    } finally {
      if (currentCycle === refreshCycleRef.current && isMountedRef.current) {
        fetchingPreferencesRef.current = false;
        logContext('Fetch preferences completed', { cycle: currentCycle });
      }
    }
  }, [state.isAuthenticated, state.currentUser, state.userId]);

  const updatePreferences = useCallback((newPreferences) => {
    if (!state.userId || !newPreferences) return;

    dispatch({
      type: ActionTypes.UPDATE_PREFERENCES,
      payload: newPreferences
    });

    // Update localStorage
    try {
      localStorage.setItem(`userPrefs_${state.userId}`, JSON.stringify(newPreferences));
    } catch (e) {
      console.warn('Error updating localStorage:', e);
    }

    logContext('Preferences updated', {
      questionnaireCompleted: newPreferences.questionnaireCompleted
    });
  }, [state.userId]);

  const completeQuestionnaire = useCallback((updatedPreferences, completionData = {}) => {
    if (!state.userId || !updatedPreferences) {
      console.error('Cannot complete questionnaire: missing data');
      return false;
    }

    // Validate preferences have real content
    const hasGenreRatings = updatedPreferences.genreRatings && 
                           Object.keys(updatedPreferences.genreRatings).length > 0;
    const hasFavoriteGenres = updatedPreferences.favoriteGenres && 
                             Array.isArray(updatedPreferences.favoriteGenres) && 
                             updatedPreferences.favoriteGenres.length > 0;
    const hasGenrePreferences = updatedPreferences.genrePreferences && 
                               Object.keys(updatedPreferences.genrePreferences).length > 0;

    if (!hasGenreRatings && !hasFavoriteGenres && !hasGenrePreferences) {
      console.error('Questionnaire completion rejected: insufficient preference data');
      return false;
    }

    const validatedPreferences = {
      ...updatedPreferences,
      questionnaireCompleted: true,
      userId: state.userId,
      updatedAt: new Date().toISOString()
    };

    dispatch({
      type: ActionTypes.UPDATE_PREFERENCES,
      payload: validatedPreferences
    });

    dispatch({
      type: ActionTypes.SET_QUESTIONNAIRE_COMPLETED,
      payload: true
    });

    // Update localStorage
    try {
      localStorage.setItem(`questionnaire_completed_${state.userId}`, 'true');
      localStorage.setItem(`userPrefs_${state.userId}`, JSON.stringify(validatedPreferences));
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }

    logContext('Questionnaire completed', {
      hasPreferences: !!validatedPreferences,
      source: completionData.source
    });

    // Force refresh from cloud to ensure sync
    if (completionData.forceRefresh !== false) {
      setTimeout(() => {
        fetchPreferences(true);
      }, 500);
    }

    return true;
  }, [state.userId, fetchPreferences]);

  // ===== RECOMMENDATION MANAGEMENT =====

  const setRecommendationsState = useCallback((newState, data = null, error = null) => {
    dispatch({
      type: ActionTypes.SET_RECOMMENDATIONS_STATE,
      payload: { state: newState, data, error }
    });
    logContext('Recommendations state updated', newState);
  }, []);

  const setRecommendationsVisible = useCallback((visible) => {
    dispatch({
      type: ActionTypes.SET_RECOMMENDATIONS_VISIBLE,
      payload: visible
    });
    logContext('Recommendations visibility changed', visible);
  }, []);

  // ===== PROGRESS MANAGEMENT =====

  const updateUserProgress = useCallback((progressData) => {
    dispatch({
      type: ActionTypes.UPDATE_USER_PROGRESS,
      payload: progressData
    });
    logContext('User progress updated', progressData);
  }, []);

  // ===== UI STATE MANAGEMENT =====

  const setUIState = useCallback((uiState) => {
    dispatch({
      type: ActionTypes.SET_UI_STATE,
      payload: uiState
    });
  }, []);

  // ===== EFFECTS =====

  // Handle user changes and initial preference loading
  useEffect(() => {
    const currentUserId = state.userId;
    
    // User changed - reset state and fetch new data
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      
      if (currentUserId && state.isAuthenticated && state.initialAppLoadComplete) {
        logContext('User changed, fetching preferences', currentUserId);
        fetchPreferences(false);
      }
    }
  }, [state.userId, state.isAuthenticated, state.initialAppLoadComplete, fetchPreferences]);

  // Handle questionnaire completion effects
  useEffect(() => {
    if (state.questionnaireCompleted && state.initialAppLoadComplete && state.isAuthenticated) {
      logContext('Questionnaire completed - updating UI state');
      
      // Show recommendations
      if (!state.recommendationsVisible) {
        setRecommendationsVisible(true);
      }
      
      // Hide preferences prompt
      setUIState({ showPreferencesPrompt: false });
    }
  }, [state.questionnaireCompleted, state.initialAppLoadComplete, state.isAuthenticated, state.recommendationsVisible]);

  // Show recommendations after app load
  useEffect(() => {
    if (state.initialAppLoadComplete && state.isAuthenticated && !state.preferencesLoading && !state.justSignedIn) {
      if (!state.recommendationsVisible) {
        logContext('App loaded, showing recommendations');
        setRecommendationsVisible(true);
      }
    }
  }, [state.initialAppLoadComplete, state.isAuthenticated, state.preferencesLoading, state.justSignedIn, state.recommendationsVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ===== CONTEXT VALUE =====
  const contextValue = {
    // State
    ...state,
    
    // Actions
    setAuthState,
    setInitialLoadComplete,
    fetchPreferences,
    updatePreferences,
    completeQuestionnaire,
    setRecommendationsState,
    setRecommendationsVisible,
    updateUserProgress,
    setUIState,
    
    // Computed properties
    hasBasicPreferencesOnly: state.userPreferences?.questionnaireCompleted && !state.userPreferences?.detailedQuestionsCompleted,
    isReady: state.initialAppLoadComplete && !state.preferencesLoading,
    
    // Force refresh function for external use
    forceRefreshPreferences: useCallback(() => {
      logContext('Force refresh triggered externally');
      fetchPreferences(true);
    }, [fetchPreferences])
  };

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserDataContext;