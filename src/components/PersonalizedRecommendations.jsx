import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MediaCard from './MediaCard';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { fetchCachedMedia } from '../services/mediaCache';
import { 
  validateUserPreferences, 
  getUserGuidance, 
  shouldAttemptRecommendations 
} from '../utils/userDataValidator';
import {
  createInitialState,
  processApiResponse,
  handleApiError,
  shouldRetry,
  createRotationState,
  getStatusMessage,
  shouldShowRecommendations,
  shouldShowLoading,
  shouldShowError,
  shouldShowEmpty,
  RECOMMENDATION_STATES
} from '../utils/recommendationStateManager';
import {
  preComputeUserDataState,
  createTransitionState,
  isValidTransition,
  hasSignificantDataChange,
  UI_STATES,
  USER_DATA_STATES
} from '../utils/userDataPreComputer';

const DEBUG_LOGGING = true;

const logMessage = (message, data) => {
  if (DEBUG_LOGGING) {
    console.log(`[PersonalRecs] ${message}`, data || '');
  }
};

export const PersonalizedRecommendations = forwardRef((props, ref) => {
  const {
    currentUser,
    isAuthenticated,
    propUserPreferences,
    propHasCompletedQuestionnaire,
    initialAppLoadComplete = false,
    onMediaClick,
  } = props;

  const userId = isAuthenticated ? currentUser?.attributes?.sub : null;
  const navigate = useNavigate();

  // --- Enhanced State Management ---
  const [recState, setRecState] = useState(() => createInitialState());
  const [contentTypeFilter, setContentTypeFilter] = useState('both');
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // UI State Management for flicker prevention
  const [uiState, setUiState] = useState(UI_STATES.INITIALIZING);
  const [preComputedData, setPreComputedData] = useState(null);
  const [lastPreferencesRef, setLastPreferencesRef] = useState(null);

  // --- Refs ---
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const initialComputationDone = useRef(false);
  const transitionState = useRef(null);

  // Extract current state for easier access
  const {
    state: currentState,
    recommendations,
    allRecommendations,
    canRotate,
    userValidation,
    userGuidance,
    errorMessage,
    dataSource,
    processingTime,
    attemptCount
  } = recState;

  // --- Cleanup on unmount ---
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // --- Safe state update helpers ---
  const safeSetState = useCallback((updates) => {
    if (isMounted.current) {
      if (typeof updates === 'function') {
        setRecState(updates);
      } else {
        setRecState(prev => ({ ...prev, ...updates }));
      }
    }
  }, []);

  const safeSetUiState = useCallback((newState, reason = '') => {
    if (isMounted.current && isValidTransition(uiState, newState)) {
      transitionState.current = createTransitionState(uiState, newState, reason);
      setUiState(newState);
      logMessage(`UI State transition: ${uiState} -> ${newState}`, { reason });
    } else if (isMounted.current) {
      logMessage(`Invalid UI transition attempted: ${uiState} -> ${newState}`, { reason });
    }
  }, [uiState]);

  // --- Pre-computation effect - runs first to determine correct initial UI state ---
  useEffect(() => {
    if (initialComputationDone.current) return;
    
    logMessage('Running initial pre-computation', {
      isAuthenticated,
      userId,
      propUserPreferences: !!propUserPreferences,
      propHasCompletedQuestionnaire,
      initialAppLoadComplete
    });

    const computed = preComputeUserDataState(
      propUserPreferences,
      propHasCompletedQuestionnaire,
      isAuthenticated,
      initialAppLoadComplete,
      userId
    );

    setPreComputedData(computed);
    setLastPreferencesRef(computed.effectivePreferences);
    
    // Set initial UI state based on pre-computation
    safeSetUiState(computed.initialUIState, computed.reasoning);
    
    // Update recommendation state with user validation info
    if (computed.userValidation) {
      safeSetState({
        userValidation: computed.userValidation,
        userGuidance: getUserGuidance(computed.userValidation)
      });
    }

    initialComputationDone.current = true;
    
    logMessage('Pre-computation complete', {
      userDataState: computed.userDataState,
      initialUIState: computed.initialUIState,
      shouldFetchRecommendations: computed.shouldFetchRecommendations,
      reasoning: computed.reasoning
    });
    
  }, [isAuthenticated, userId, propUserPreferences, propHasCompletedQuestionnaire, initialAppLoadComplete, safeSetUiState, safeSetState]);

  // --- Core recommendation fetching function ---
  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    logMessage('fetchRecommendations called', {
      forceRefresh,
      fetchInProgress: fetchInProgress.current,
      uiState,
      preComputedData: !!preComputedData
    });

    if (fetchInProgress.current) {
      logMessage('Fetch already in progress, skipping');
      return;
    }

    if (!preComputedData?.shouldFetchRecommendations && !forceRefresh) {
      logMessage('Pre-computation indicates not to fetch recommendations');
      return;
    }

    fetchInProgress.current = true;
    
    // Set loading state
    safeSetUiState(UI_STATES.SHOW_LOADING, 'Starting recommendation fetch');
    safeSetState({ state: RECOMMENDATION_STATES.LOADING });

    // Get effective user preferences
    let userPreferences = preComputedData?.effectivePreferences || propUserPreferences || {};

    try {
      logMessage('Using preferences for API call', { 
        hasPreferences: Object.keys(userPreferences).length > 0,
        source: preComputedData ? 'precomputed' : 'fallback'
      });

      // Make API call
      const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
      const excludeIds = []; // You can implement exclusion logic here if needed

      logMessage('Making API call with params:', {
        mediaType: contentTypeFilter,
        limit: 9,
        hasToken: !!token,
        hasPreferences: !!userPreferences,
        preferencesKeys: userPreferences ? Object.keys(userPreferences) : [],
        forceRefresh
      });

      const response = await fetchCachedMedia({
        mediaType: contentTypeFilter,
        limit: 9,
        excludeIds,
        token,
        preferences: userPreferences,
        favoriteIds: [], // You can pass actual favorites here
        watchlistIds: [], // You can pass actual watchlist here
        forceRefresh
      });

      logMessage('API response received', {
        status: response ? 'success' : 'failed',
        itemCount: response?.items?.length || 0,
        responseStructure: response ? Object.keys(response) : 'no response',
        responseData: response?.data ? Object.keys(response.data) : 'no data',
        fullResponse: response
      });

      // Process the response
      const newState = processApiResponse(response, userPreferences, recState);
      logMessage('Processed state:', {
        newStateType: newState.state,
        recommendationsCount: newState.recommendations?.length || 0,
        allRecommendationsCount: newState.allRecommendations?.length || 0,
        canRotate: newState.canRotate,
        errorMessage: newState.errorMessage
      });
      
      safeSetState(newState);
      
      // Update UI state based on API response
      if (newState.state === RECOMMENDATION_STATES.SUCCESS && newState.recommendations.length > 0) {
        safeSetUiState(UI_STATES.SHOW_RECOMMENDATIONS, 'Recommendations loaded successfully');
      } else if (newState.state === RECOMMENDATION_STATES.EMPTY_INSUFFICIENT_DATA) {
        safeSetUiState(UI_STATES.SHOW_BANNER, 'Insufficient data for recommendations');
      } else if (shouldShowError(newState)) {
        safeSetUiState(UI_STATES.SHOW_ERROR, 'API error occurred');
      }

    } catch (error) {
      logMessage('Error fetching recommendations:', error);
      console.error('Full error details:', error);
      const errorState = handleApiError(error, userPreferences || {}, recState);
      safeSetState(errorState);
      safeSetUiState(UI_STATES.SHOW_ERROR, `API error: ${error.message}`);
    } finally {
      fetchInProgress.current = false;
    }
  }, [isAuthenticated, userId, currentUser, preComputedData, contentTypeFilter, safeSetState, safeSetUiState]);

  // --- Handle rotation ---
  const handleRotate = useCallback(() => {
    if (!canRotate || uiState !== UI_STATES.SHOW_RECOMMENDATIONS) return;
    
    const newState = createRotationState(recState);
    safeSetState(newState);
    setRefreshCounter(prev => prev + 1);
    
    logMessage('Rotated recommendations', {
      newDisplayIndex: newState.displayIndex,
      showingCount: newState.recommendations.length
    });
  }, [canRotate, recState, safeSetState, uiState]);

  // --- Handle refresh ---
  const handleRefresh = useCallback(() => {
    // Always allow refresh - it might upgrade user from banner to recommendations
    safeSetUiState(UI_STATES.SHOW_LOADING, 'User triggered refresh');
    fetchRecommendations(true);
    setRefreshCounter(prev => prev + 1);
  }, [fetchRecommendations, safeSetUiState]);

  // --- Handle retry ---
  const handleRetry = useCallback(() => {
    if (shouldRetry(recState)) {
      safeSetUiState(UI_STATES.SHOW_LOADING, 'Retrying after error');
      fetchRecommendations(false);
    }
  }, [recState, fetchRecommendations, safeSetUiState]);

  // --- Expose methods via ref ---
  useImperativeHandle(ref, () => ({
    refresh: () => handleRefresh(),
    rotate: () => handleRotate()
  }), [handleRefresh, handleRotate]);

  // --- Auto-fetch recommendations when pre-computation determines we should ---
  useEffect(() => {
    if (
      preComputedData?.shouldFetchRecommendations &&
      uiState === UI_STATES.SHOW_LOADING &&
      currentState === RECOMMENDATION_STATES.UNINITIALIZED &&
      !fetchInProgress.current
    ) {
      logMessage('Auto-triggering recommendation fetch based on pre-computation');
      fetchRecommendations(false);
    }
  }, [preComputedData, uiState, currentState, fetchRecommendations]);

  // --- Handle significant user preferences changes ---
  useEffect(() => {
    if (!initialComputationDone.current || !preComputedData) return;
    
    const currentEffectivePrefs = preComputedData.effectivePreferences;
    
    if (hasSignificantDataChange(lastPreferencesRef, currentEffectivePrefs)) {
      logMessage('Significant user data change detected - re-computing state', {
        previous: !!lastPreferencesRef,
        current: !!currentEffectivePrefs
      });
      
      // Re-run pre-computation with new data
      const newComputed = preComputeUserDataState(
        propUserPreferences,
        propHasCompletedQuestionnaire,
        isAuthenticated,
        initialAppLoadComplete,
        userId
      );
      
      setPreComputedData(newComputed);
      setLastPreferencesRef(newComputed.effectivePreferences);
      
      // Update UI state based on new computation
      if (newComputed.shouldFetchRecommendations && !fetchInProgress.current) {
        safeSetUiState(UI_STATES.SHOW_LOADING, 'User data updated, fetching new recommendations');
        fetchRecommendations(true); // Force refresh with new data
      } else if (!newComputed.shouldFetchRecommendations) {
        safeSetUiState(UI_STATES.SHOW_BANNER, 'User data updated but insufficient for recommendations');
      }
      
      // Update validation states
      if (newComputed.userValidation) {
        safeSetState({
          userValidation: newComputed.userValidation,
          userGuidance: getUserGuidance(newComputed.userValidation)
        });
      }
    }
  }, [propUserPreferences, propHasCompletedQuestionnaire, isAuthenticated, initialAppLoadComplete, userId, preComputedData, lastPreferencesRef, fetchRecommendations, safeSetState, safeSetUiState]);

  // --- Auto-retry on certain errors ---
  useEffect(() => {
    if (shouldRetry(recState) && !fetchInProgress.current) {
      const retryDelay = Math.min(2000 * Math.pow(2, attemptCount), 10000); // Exponential backoff
      logMessage(`Auto-retry in ${retryDelay}ms (attempt ${attemptCount + 1})`);
      
      const timer = setTimeout(() => {
        if (!fetchInProgress.current) {
          handleRetry();
        }
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [recState.state, attemptCount, handleRetry]);

  // --- Render helpers ---
  const renderStatusBar = () => {
    const statusMessage = getStatusMessage(recState);
    
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {currentState === RECOMMENDATION_STATES.SUCCESS && (
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
          )}
          {shouldShowError(recState) && (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">
              {currentState === RECOMMENDATION_STATES.SUCCESS ? 'Personalized Recommendations' : 'Recommendations'}
            </h2>
            <p className="text-sm text-gray-400">{statusMessage}</p>
          </div>
        </div>
        
        {canRotate && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRotate}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
            <span>More</span>
          </motion.button>
        )}
      </div>
    );
  };

  const renderUserGuidance = () => {
    if (!userGuidance) return null;

    return (
      <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
        <h4 className="text-lg font-medium text-white mb-2">{userGuidance.title}</h4>
        <p className="text-gray-300 mb-4">{userGuidance.message}</p>
        
        {userGuidance.showProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Profile Completion</span>
              <span>{userGuidance.progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${userGuidance.progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {userGuidance.primaryAction && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (userGuidance.primaryAction.action === 'questionnaire') {
                  navigate('/onboarding');
                } else if (userGuidance.primaryAction.action === 'refresh') {
                  handleRefresh();
                }
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                userGuidance.primaryAction.variant === 'primary'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {userGuidance.primaryAction.text}
            </motion.button>
          )}

          {userGuidance.secondaryAction && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (userGuidance.secondaryAction.action === 'questionnaire') {
                  navigate('/onboarding');
                } else if (userGuidance.secondaryAction.action === 'refresh') {
                  handleRefresh();
                }
              }}
              className="px-6 py-3 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
              {userGuidance.secondaryAction.text}
            </motion.button>
          )}
        </div>
      </div>
    );
  };

  // --- Main render logic ---
  if (!isAuthenticated || !initialAppLoadComplete || uiState === UI_STATES.INITIALIZING) {
    return null;
  }

  return (
    <section className="mb-12 max-w-7xl mx-auto px-4">
      {renderStatusBar()}

      <AnimatePresence mode="wait">
        {uiState === UI_STATES.SHOW_LOADING && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl overflow-hidden h-[350px] shadow-lg animate-pulse max-w-full">
                <div className="h-[180px] bg-gray-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="flex justify-between pt-2">
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-700 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {uiState === UI_STATES.SHOW_RECOMMENDATIONS && shouldShowRecommendations(recState) && (
          <motion.div
            key={`recommendations-${refreshCounter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {recommendations.map((item) => (
              <MediaCard
                key={item.id}
                result={item}
                currentUser={currentUser}
                onClick={onMediaClick}
                showRecommendationReason={true}
                recommendationReason={item.recommendationReason}
                recommendationScore={item.score}
              />
            ))}
          </motion.div>
        )}

        {(uiState === UI_STATES.SHOW_BANNER || uiState === UI_STATES.SHOW_ERROR) && (
          <motion.div
            key="banner-or-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderUserGuidance()}
          </motion.div>
        )}
      </AnimatePresence>

      {processingTime && (
        <div className="text-center text-xs text-gray-500 mt-4">
          Generated in {(processingTime / 1000).toFixed(1)}s
        </div>
      )}
    </section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;