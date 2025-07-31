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

const DEBUG_LOGGING = true;

const logMessage = (message, data) => {
  // Debug logging disabled for cleaner console output
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

  // --- State Management ---
  const [recState, setRecState] = useState(() => createInitialState());
  const [contentTypeFilter, setContentTypeFilter] = useState('both');
  const [refreshCounter, setRefreshCounter] = useState(0);

  // --- Refs ---
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

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

  // --- Safe state update helper ---
  const safeSetState = useCallback((updates) => {
    if (isMounted.current) {
      if (typeof updates === 'function') {
        setRecState(updates);
      } else {
        setRecState(prev => ({ ...prev, ...updates }));
      }
    }
  }, []);

  // --- Core recommendation fetching function ---
  const fetchRecommendations = useCallback(async (forceRefresh = false, overridePreferences = null) => {
    logMessage('fetchRecommendations called', {
      forceRefresh,
      fetchInProgress: fetchInProgress.current,
      isAuthenticated,
      userId,
      propUserPreferences: !!propUserPreferences,
      propHasCompletedQuestionnaire,
      hasOverridePreferences: !!overridePreferences
    });

    if (fetchInProgress.current) {
      logMessage('Fetch already in progress, skipping');
      return;
    }

    if (!isAuthenticated || !userId) {
      logMessage('Not authenticated, cannot fetch recommendations');
      return;
    }

    fetchInProgress.current = true;

    // Get effective user preferences - use override if provided (for fresh questionnaire completion)
    let userPreferences = overridePreferences || propUserPreferences || {};

    try {
      // Set loading state
      logMessage('Setting loading state');
      safeSetState({ state: RECOMMENDATION_STATES.LOADING });
      
      // Check localStorage as fallback
      if (!userPreferences || Object.keys(userPreferences).length === 0) {
        try {
          const localPrefs = localStorage.getItem(`userPrefs_${userId}`);
          if (localPrefs) {
            const parsedPrefs = JSON.parse(localPrefs);
            
            // Flatten nested preferences if needed
            if (parsedPrefs.preferences && typeof parsedPrefs.preferences === 'object') {
              userPreferences = { ...parsedPrefs, ...parsedPrefs.preferences };
              delete userPreferences.preferences;
            } else {
              userPreferences = parsedPrefs;
            }
          }
        } catch (e) {
          console.warn('Error reading localStorage preferences:', e);
        }
      }

      logMessage('Using preferences for API call', { 
        hasPreferences: Object.keys(userPreferences).length > 0,
        source: propUserPreferences ? 'props' : 'localStorage'
      });

      // Validate if we should attempt recommendations
      if (!shouldAttemptRecommendations(userPreferences || {})) {
        logMessage('Insufficient data for recommendations');
        const validation = validateUserPreferences(userPreferences);
        const guidance = getUserGuidance(validation);
        
        safeSetState({
          state: RECOMMENDATION_STATES.EMPTY_INSUFFICIENT_DATA,
          userValidation: validation,
          userGuidance: guidance,
          errorMessage: guidance.message
        });
        return;
      }

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

    } catch (error) {
      logMessage('Error fetching recommendations:', error);
      console.error('Full error details:', error);
      const errorState = handleApiError(error, userPreferences || {}, recState);
      safeSetState(errorState);
    } finally {
      fetchInProgress.current = false;
    }
  }, [isAuthenticated, userId, currentUser, propUserPreferences, contentTypeFilter, safeSetState]);

  // --- Handle rotation ---
  const handleRotate = useCallback(() => {
    if (!canRotate) return;
    
    const newState = createRotationState(recState);
    safeSetState(newState);
    setRefreshCounter(prev => prev + 1);
  }, [canRotate, recState, safeSetState]);

  // --- Handle refresh ---
  const handleRefresh = useCallback(() => {
    fetchRecommendations(true);
    setRefreshCounter(prev => prev + 1);
  }, [fetchRecommendations]);

  // --- Handle retry ---
  const handleRetry = useCallback(() => {
    if (shouldRetry(recState)) {
      fetchRecommendations(false);
    }
  }, [recState, fetchRecommendations]);

  // --- Enhanced refresh that can handle new preferences ---
  const handleRefreshWithPreferences = useCallback((newPreferences = null) => {
    logMessage('handleRefreshWithPreferences called', { 
      hasNewPreferences: !!newPreferences,
      currentState
    });
    
    // Use the new preferences directly in the fetch call
    fetchRecommendations(true, newPreferences); // Pass new preferences as override
    setRefreshCounter(prev => prev + 1);
  }, [fetchRecommendations, currentState]);

  // --- Expose methods via ref ---
  useImperativeHandle(ref, () => ({
    refresh: () => handleRefresh(),
    refreshRecommendations: (newPreferences) => {
      // Handle the legacy method call from App.js and MainLayout.js
      logMessage('Legacy refreshRecommendations called with preferences:', !!newPreferences);
      if (newPreferences) {
        handleRefreshWithPreferences(newPreferences);
      } else {
        handleRefresh();
      }
    },
    rotate: () => handleRotate()
  }), [handleRefresh, handleRefreshWithPreferences, handleRotate]);

  // --- Initial load when component mounts and user is ready ---
  useEffect(() => {
    if (isAuthenticated && userId && initialAppLoadComplete && currentState === RECOMMENDATION_STATES.UNINITIALIZED && !fetchInProgress.current) {
      logMessage('Initial load triggered');
      fetchRecommendations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, initialAppLoadComplete, currentState]);

  // --- Handle questionnaire completion ---
  useEffect(() => {
    if (isAuthenticated && userId && initialAppLoadComplete && propHasCompletedQuestionnaire && !fetchInProgress.current) {
      logMessage('Questionnaire completed - fetching recommendations', {
        propHasCompletedQuestionnaire,
        currentState,
        propUserPreferences: !!propUserPreferences
      });
      
      // Force fetch recommendations when questionnaire is completed
      fetchRecommendations(true); // Force refresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, initialAppLoadComplete, propHasCompletedQuestionnaire]);

  // --- Handle user preferences changes ---
  useEffect(() => {
    if (isAuthenticated && userId && initialAppLoadComplete && propUserPreferences && propUserPreferences.questionnaireCompleted && !fetchInProgress.current) {
      logMessage('User preferences loaded with completed questionnaire - fetching recommendations', {
        propHasCompletedQuestionnaire,
        currentState,
        propUserPreferences: !!propUserPreferences
      });
      
      // Force fetch recommendations when user preferences are loaded with completed questionnaire
      fetchRecommendations(true); // Force refresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, initialAppLoadComplete, propUserPreferences]);

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
  if (!isAuthenticated || !initialAppLoadComplete) {
    return null;
  }

  return (
    <section className="mb-12 max-w-7xl mx-auto px-4">
      {renderStatusBar()}

      <AnimatePresence mode="wait">
        {shouldShowLoading(recState) && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
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

        {shouldShowRecommendations(recState) && (
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

        {(shouldShowEmpty(recState) || shouldShowError(recState)) && (
          <motion.div
            key="empty-or-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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