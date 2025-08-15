// src/components/PersonalizedRecommendationsRefactored.jsx
// Enhanced version using UserDataContext for streamlined state management

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Context and utilities
import { useUserData } from '../contexts/UserDataContext';
import { RecommendationsErrorBoundary } from './ContextAwareErrorBoundary';
import { useLogger, performanceMonitor } from '../utils/centralizedLogger';

// Loading and animation systems
import { useComponentLoadingState, useAsyncOperation } from '../hooks/useLoadingState';
import { LOADING_OPERATIONS } from '../services/loadingStateService';
import { LoadingSpinner, LoadingOverlay, LoadingSkeleton, LoadingCard } from './LoadingComponents';
import { animationCoordinator, ANIMATION_PRESETS, createEntranceAnimation } from '../utils/animationCoordinator';
import { useConnectivity } from '../hooks/useConnectivity';

// Components and services
import MediaCard from './MediaCard';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { fetchCachedMedia } from '../services/mediaCache';
import { getCurrentAccessToken } from '../utils/tokenUtils';

// State management utilities (simplified with context)
import {
  RECOMMENDATION_STATES,
  createInitialState,
  processApiResponse,
  handleApiError,
  shouldRetry,
  createRotationState,
  getStatusMessage,
  shouldShowRecommendations,
  shouldShowLoading,
  shouldShowError,
  shouldShowEmpty
} from '../utils/recommendationStateManager';

const PersonalizedRecommendationsRefactored = forwardRef((props, ref) => {
  const { onMediaClick } = props;
  const navigate = useNavigate();
  const logger = useLogger('PersonalizedRecommendations');
  
  // Loading state management
  const loadingState = useComponentLoadingState('PersonalizedRecommendations');
  const fetchOperation = useAsyncOperation('PersonalizedRecommendations', LOADING_OPERATIONS.RECOMMENDATIONS_LOAD);
  const refreshOperation = useAsyncOperation('PersonalizedRecommendations', LOADING_OPERATIONS.RECOMMENDATIONS_REFRESH);
  const connectivity = useConnectivity();

  // Get unified context state
  const {
    currentUser,
    isAuthenticated,
    userId,
    userPreferences,
    questionnaireCompleted,
    canGenerateRecommendations,
    validationResult,
    userGuidance,
    recommendationsState,
    recommendationsVisible,
    recommendationsData,
    recommendationsError,
    initialAppLoadComplete,
    setRecommendationsState,
    setRecommendationsVisible,
    fetchPreferences
  } = useUserData();

  // ===== LOCAL STATE (Simplified) =====
  const [localState, setLocalState] = useState(() => createInitialState());
  const [contentTypeFilter, setContentTypeFilter] = useState('both');
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Refs for race condition prevention
  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  // ===== EFFECTS =====

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync with context recommendations state
  useEffect(() => {
    if (recommendationsState && recommendationsData) {
      setLocalState(prev => ({
        ...prev,
        state: recommendationsState,
        recommendations: recommendationsData.recommendations || [],
        allRecommendations: recommendationsData.allRecommendations || [],
        canRotate: recommendationsData.canRotate || false,
        errorMessage: recommendationsError || null
      }));
    }
  }, [recommendationsState, recommendationsData, recommendationsError]);

  // ===== CORE FETCH FUNCTION (Simplified with Context) =====
  const fetchRecommendations = useCallback(async (forceRefresh = false, overridePreferences = null) => {
    if (fetchInProgressRef.current) {
      logger.debug('Fetch already in progress, skipping');
      return;
    }

    if (!isAuthenticated || !userId) {
      logger.warn('Cannot fetch recommendations: not authenticated or no userId', {
        isAuthenticated,
        hasUserId: !!userId
      });
      return;
    }

    fetchInProgressRef.current = true;
    
    // Use new loading state management with retry capability
    const operation = forceRefresh ? refreshOperation : fetchOperation;
    
    try {
      const result = await operation.executeWithRetry(async () => {
        // Update context state to loading
        setRecommendationsState('loading');
        
        // Coordinate loading animation
        await animationCoordinator.startAnimation(
          `recommendations_fetch_${Date.now()}`,
          ANIMATION_PRESETS.loadingPulse,
          {
            component: 'PersonalizedRecommendations',
            priority: 3,
            coordinateWithLoading: true
          }
        );
      
      logger.info('Fetching recommendations', {
        forceRefresh,
        hasOverridePreferences: !!overridePreferences,
        hasUserPreferences: !!userPreferences,
        questionnaireCompleted
      });

      // Use context preferences or override
      const effectivePreferences = overridePreferences || userPreferences || {};

      // If no preferences available and no override, try to fetch them
      if (Object.keys(effectivePreferences).length === 0 && !overridePreferences) {
        logger.debug('No preferences available, attempting to fetch from context');
        await fetchPreferences(forceRefresh);
        
        // If still no preferences, show empty state
        if (!userPreferences || Object.keys(userPreferences).length === 0) {
          setRecommendationsState('empty', null, 'No preferences found. Please complete the questionnaire.');
          logger.warn('No preferences available after fetch attempt');
          return;
        }
      }

      // Get access token
      const token = await getCurrentAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      // API call parameters
      const apiParams = {
        mediaType: contentTypeFilter,
        limit: 9,
        excludeIds: [],
        token,
        preferences: effectivePreferences,
        favoriteIds: [],
        watchlistIds: [],
        forceRefresh
      };

      logger.debug('Making recommendations API call', {
        mediaType: contentTypeFilter,
        hasPreferences: !!effectivePreferences,
        preferencesKeys: Object.keys(effectivePreferences)
      });

      // Make API call
      const response = await fetchCachedMedia(apiParams);
      
      if (!isMountedRef.current) {
        logger.debug('Component unmounted, skipping response processing');
        return;
      }

      logger.apiCall(
        'PersonalizedRecommendations',
        '/recommendations',
        'POST',
        timer.end(),
        response ? 200 : 500
      );

      // Process response using existing utility
      const processedState = processApiResponse(response, effectivePreferences, localState);
      
      // Update both local and context state
      setLocalState(processedState);
      setRecommendationsState(
        processedState.state,
        {
          recommendations: processedState.recommendations,
          allRecommendations: processedState.allRecommendations,
          canRotate: processedState.canRotate
        },
        processedState.errorMessage
      );

      logger.info('Recommendations fetched successfully', {
        state: processedState.state,
        recommendationsCount: processedState.recommendations?.length || 0,
        canRotate: processedState.canRotate
      });
      });

    } catch (error) {
      logger.error('Failed to fetch recommendations', { error: error.message }, error);
      
      const errorState = handleApiError(error, userPreferences || {}, localState);
      
      setLocalState(errorState);
      setRecommendationsState(errorState.state, null, errorState.errorMessage);

      timer.end();
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [
    isAuthenticated,
    userId,
    userPreferences,
    questionnaireCompleted,
    contentTypeFilter,
    localState,
    setRecommendationsState,
    fetchPreferences,
    logger
  ]);

  // ===== ENHANCED HANDLERS =====
  const handleRotate = useCallback(() => {
    if (!localState.canRotate) return;
    
    logger.userAction('Recommendations Rotate');
    
    const newState = createRotationState(localState);
    setLocalState(newState);
    setRefreshCounter(prev => prev + 1);
  }, [localState.canRotate, localState, logger]);

  const handleRefresh = useCallback(() => {
    logger.userAction('Recommendations Refresh');
    fetchRecommendations(true);
    setRefreshCounter(prev => prev + 1);
  }, [fetchRecommendations, logger]);

  const handleRefreshWithPreferences = useCallback((newPreferences = null) => {
    logger.userAction('Refresh With New Preferences', { hasNewPreferences: !!newPreferences });
    
    fetchRecommendations(true, newPreferences);
    setRefreshCounter(prev => prev + 1);
  }, [fetchRecommendations, logger]);

  const handleRetry = useCallback(() => {
    if (shouldRetry(localState)) {
      logger.userAction('Recommendations Retry', { attemptCount: localState.attemptCount });
      fetchRecommendations(false);
    }
  }, [localState, fetchRecommendations, logger]);

  // ===== IMPERATIVE HANDLE (Simplified) =====
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
    refreshRecommendations: handleRefreshWithPreferences,
    rotate: handleRotate
  }), [handleRefresh, handleRefreshWithPreferences, handleRotate]);

  // ===== CONTEXT-DRIVEN EFFECTS (Simplified) =====

  // Initial load when context is ready
  useEffect(() => {
    if (
      isAuthenticated && 
      initialAppLoadComplete && 
      recommendationsVisible &&
      localState.state === RECOMMENDATION_STATES.UNINITIALIZED && 
      !fetchInProgressRef.current
    ) {
      logger.debug('Initial recommendations load triggered by context');
      fetchRecommendations(false);
    }
  }, [
    isAuthenticated,
    initialAppLoadComplete,
    recommendationsVisible,
    localState.state,
    fetchRecommendations,
    logger
  ]);

  // Handle questionnaire completion via context
  useEffect(() => {
    if (
      questionnaireCompleted &&
      isAuthenticated &&
      initialAppLoadComplete &&
      !fetchInProgressRef.current
    ) {
      logger.info('Questionnaire completed - refreshing recommendations via context');
      fetchRecommendations(true);
    }
  }, [
    questionnaireCompleted,
    isAuthenticated,
    initialAppLoadComplete,
    fetchRecommendations,
    logger
  ]);

  // Auto-retry on certain errors
  useEffect(() => {
    if (shouldRetry(localState) && !fetchInProgressRef.current) {
      const retryDelay = Math.min(2000 * Math.pow(2, localState.attemptCount), 10000);
      logger.debug(`Auto-retry scheduled in ${retryDelay}ms`);
      
      const timer = setTimeout(() => {
        if (!fetchInProgressRef.current) {
          handleRetry();
        }
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [localState.state, localState.attemptCount, handleRetry, logger]);

  // ===== RENDER HELPERS =====
  const renderStatusBar = () => {
    const statusMessage = getStatusMessage(localState);
    
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {localState.state === RECOMMENDATION_STATES.SUCCESS && (
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
          )}
          {shouldShowError(localState) && (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">
              {localState.state === RECOMMENDATION_STATES.SUCCESS 
                ? 'Personalized Recommendations' 
                : 'Recommendations'}
            </h2>
            <p className="text-sm text-gray-400">{statusMessage}</p>
          </div>
        </div>
        
        {localState.canRotate && (
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

  // ===== MAIN RENDER =====
  if (!isAuthenticated || !initialAppLoadComplete) {
    return null;
  }

  if (!recommendationsVisible) {
    return null;
  }

  return (
    <RecommendationsErrorBoundary>
      <section className="mb-12 max-w-7xl mx-auto px-4">
        {renderStatusBar()}

        <AnimatePresence mode="wait">
          {shouldShowLoading(localState) && (
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

          {shouldShowRecommendations(localState) && (
            <motion.div
              key={`recommendations-${refreshCounter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {localState.recommendations.map((item) => (
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

          {(shouldShowEmpty(localState) || shouldShowError(localState)) && (
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

        {localState.processingTime && (
          <div className="text-center text-xs text-gray-500 mt-4">
            Generated in {(localState.processingTime / 1000).toFixed(1)}s
          </div>
        )}
      </section>
    </RecommendationsErrorBoundary>
  );
});

PersonalizedRecommendationsRefactored.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendationsRefactored;