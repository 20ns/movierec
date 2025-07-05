import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MediaCard from './MediaCard';
import { ArrowPathIcon, LightBulbIcon, FilmIcon, TvIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { fetchCachedMedia } from '../services/mediaCache';
import { markPerformance, measurePerformance } from '../utils/webVitals';

// --- Constants ---
const MIN_RECOMMENDATION_COUNT = 3;
const ITEMS_TO_FETCH = 9; // Fetch 9 items for rotation
const ITEMS_TO_SHOW = 3; // Show 3 at a time
const SHOWN_ITEMS_LIMIT = 150;
const RETRY_DELAY = 1500;
const MAX_RETRIES = 2;
const LOADING_TIMEOUT = 30000; // Increased to 30 seconds for advanced processing

const DEBUG_LOGGING = false;

// --- Helper Functions ---
const logMessage = (message, data) => {
  if (DEBUG_LOGGING) {
    try {
      console.log(`[PersonalRecs] ${message}`, data !== undefined ? JSON.parse(JSON.stringify(data)) : '');
    } catch (e) {
      console.log(`[PersonalRecs] ${message} (raw data due to stringify error):`, data);
    }
  }
};

const logError = (message, error) => {
  console.error(`[PersonalRecs] ${message}`, error);
};

// --- Component Definition ---
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
  const [state, setState] = useState({
    allRecommendations: [], // All 9 recommendations from backend
    recommendations: [], // Currently displayed 3 recommendations
    displayIndex: 0, // Current rotation index (0, 3, 6)
    dataSource: null,
    recommendationReason: '',
    shownItemsHistory: new Set(),
    isLoading: false,
    isThinking: false,
    isRefreshing: false,
    hasError: false,
    errorMessage: '',
    refreshCounter: 0,
    contentTypeFilter: 'both',
    canRotate: false, // Whether we have more items to rotate
    processingTime: null, // Track recommendation processing time
  });

  const {
    allRecommendations,
    recommendations,
    displayIndex,
    dataSource,
    recommendationReason,
    shownItemsHistory,
    isLoading,
    isThinking,
    hasError,
    errorMessage,
    refreshCounter,
    contentTypeFilter,
    canRotate,
    processingTime,
  } = state;

  // --- Refs ---
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const loadingTimeoutRef = useRef(null);
  const prevPreferencesRef = useRef(null);
  const prevUserIdRef = useRef(null);
  const dataLoadAttemptedRef = useRef(false);

  // --- Lifecycle and Cleanup ---
  useEffect(() => {
    mountedRef.current = true;
    const currentLoadingTimeout = loadingTimeoutRef.current;
    return () => {
      mountedRef.current = false;
      if (currentLoadingTimeout) clearTimeout(currentLoadingTimeout);
      isFetchingRef.current = false;
    };
  }, []);

  // Safe method to update state when component is mounted
  const safeSetState = useCallback((newState) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...newState }));
    }
  }, []);

  // Reset component state when user changes
  useEffect(() => {
    const currentUserId = currentUser?.attributes?.sub;
    if (currentUserId !== prevUserIdRef.current) {
      logMessage('User ID changed, resetting component state');
      safeSetState({
        allRecommendations: [],
        recommendations: [],
        displayIndex: 0,
        dataSource: null,
        recommendationReason: '',
        shownItemsHistory: new Set(),
        isLoading: false,
        isThinking: false,
        isRefreshing: false,
        hasError: false,
        errorMessage: '',
        refreshCounter: 0,
        contentTypeFilter: 'both',
        canRotate: false,
        processingTime: null,
      });
      isFetchingRef.current = false;
      dataLoadAttemptedRef.current = false;
      retryCountRef.current = 0;
      prevPreferencesRef.current = null;
      prevUserIdRef.current = currentUserId;
    }
  }, [currentUser, safeSetState]);


  // Wrapper for the API fetch function
  const fetchFromPersonalizedApi = useCallback(async (currentContentTypeFilter, excludeIdsSet = new Set(), preferences = {}, favoriteIdsList = [], watchlistIdsList = [], forceRefresh = false) => {
    logMessage('Calling fetchCachedMedia', { currentContentTypeFilter, excludeIdsCount: excludeIdsSet.size, preferences, favoriteIdsCount: favoriteIdsList.length, watchlistIdsCount: watchlistIdsList.length, forceRefresh });
    
    // Enhanced debugging for preferences (commented out for production)
    // console.log('[PersonalizedRecommendations] 🔍 Request Debug:', {
    //   hasPreferences: Object.keys(preferences).length > 0,
    //   preferencesKeys: Object.keys(preferences),
    //   preferences: preferences,
    //   hasFavorites: favoriteIdsList.length > 0,
    //   hasWatchlist: watchlistIdsList.length > 0,
    //   excludeIdsCount: excludeIdsSet.size,
    //   mediaType: currentContentTypeFilter
    // });
    try {
      // Safely extract access token - return early if not available
      if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
        logError('No valid access token available for recommendations');
        console.log('[PersonalizedRecommendations] Auth Debug:', {
          userExists: !!currentUser,
          sessionExists: !!currentUser?.signInUserSession,
          accessTokenExists: !!currentUser?.signInUserSession?.accessToken,
          jwtTokenExists: !!currentUser?.signInUserSession?.accessToken?.jwtToken
        });
        return {
          success: false,
          recommendations: [],
          dataSource: 'auth-error',
          reason: 'Authentication required for recommendations'
        };
      }
      const token = currentUser.signInUserSession.accessToken.jwtToken;

      const mediaType = currentContentTypeFilter === 'both' ? 'both' : currentContentTypeFilter === 'movies' ? 'movie' : 'tv';

      const result = await fetchCachedMedia({
        mediaType,
        excludeIds: Array.from(excludeIdsSet),
        token,
        preferences,
        favoriteIds: favoriteIdsList,
        watchlistIds: watchlistIdsList,
        forceRefresh,
        limit: ITEMS_TO_FETCH, // Request 9 items for rotation
      });

      if (result.items && result.items.length > 0) {
        logMessage(`Successfully fetched ${result.items.length} items via fetchCachedMedia. Source: ${result.source}`);
        return {
          success: true,
          recommendations: result.items,
          dataSource: result.source,
          reason: result.source === 'client-cache' ? 'From your recent recommendations' : 'Fresh recommendations for you'
        };
      }

      logMessage('fetchCachedMedia returned no items or an error state', result);
      return { success: false, dataSource: result.source };

    } catch (error) {
      logError('Error calling fetchCachedMedia', error);
      return { success: false, dataSource: 'error' };
    }
  }, [currentUser]);

  // Main function to fetch recommendations
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      // Mark the start of recommendation fetching
      markPerformance('recommendations-fetch-start');
      
      logMessage('fetchRecommendations: called', { forceRefresh, currentPrefsFromProps: propUserPreferences, isAuthenticated, userId, initialAppLoadComplete, isFetching: isFetchingRef.current });
      
      if (!isAuthenticated || !userId || !initialAppLoadComplete || isFetchingRef.current) {
        if (!isFetchingRef.current) {
             safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
        }
        logMessage('Fetch skipped (conditions not met or already fetching)', { isAuthenticated, userId, initialAppLoadComplete, isFetching: isFetchingRef.current });
        return false;
      }

      logMessage(`Starting fetchRecommendations (forceRefresh: ${forceRefresh})`, { currentPrefsFromProps: propUserPreferences });
      isFetchingRef.current = true;
      dataLoadAttemptedRef.current = true;
      retryCountRef.current = 0;

      safeSetState({
        isRefreshing: forceRefresh,
        isThinking: true,
        hasError: false,
        errorMessage: '',
        isLoading: true,
      });

      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        if (isFetchingRef.current && mountedRef.current) {
          logError('Loading timeout reached');
          safeSetState({
            isLoading: false,
            isThinking: false,
            isRefreshing: false,
            hasError: true,
            errorMessage: 'Loading recommendations timed out. Please try refreshing.',
            dataSource: 'error',
            allRecommendations: [],
            recommendations: [],
            displayIndex: 0,
          });
          isFetchingRef.current = false;
        }
      }, LOADING_TIMEOUT);


      let fetchSuccessful = false;
      let resultDataSource = 'none';
      let resultReason = '';
      let fetchedRecs = [];

      try {
        const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
        let prefs = propUserPreferences || {};
        
        // Also check localStorage for recently saved preferences
        let hasLocalPreferences = false;
        try {
          console.log('[PersonalRecs] Checking localStorage for userId:', userId);
          const localPrefs = localStorage.getItem(`userPrefs_${userId}`);
          console.log('[PersonalRecs] LocalStorage raw data:', localPrefs);
          
          if (localPrefs) {
            const parsedPrefs = JSON.parse(localPrefs);
            console.log('[PersonalRecs] Parsed localStorage preferences:', parsedPrefs);
            hasLocalPreferences = parsedPrefs && Object.keys(parsedPrefs).length > 0;
            
            // If we have local preferences but not props, use local preferences
            if (hasLocalPreferences && Object.keys(prefs).length === 0) {
              console.log('[PersonalRecs] Using localStorage preferences for API call');
              
              // Flatten nested preferences structure if it exists
              let flattenedPrefs = { ...parsedPrefs };
              if (parsedPrefs.preferences && typeof parsedPrefs.preferences === 'object') {
                console.log('[PersonalRecs] Flattening nested preferences structure');
                flattenedPrefs = { ...parsedPrefs, ...parsedPrefs.preferences };
                delete flattenedPrefs.preferences; // Remove the nested object
              }
              
              prefs = flattenedPrefs;
              console.log('[PersonalRecs] Flattened preferences:', prefs);
            }
          } else {
            console.log('[PersonalRecs] No localStorage preferences found');
          }
        } catch (e) {
          console.warn('[PersonalRecs] Could not check localStorage preferences:', e);
        }
        
        console.log('[PersonalRecs] Final preferences being used:', { prefs, hasLocalPreferences, propPrefs: propUserPreferences });

        // Check if user has completed questionnaire
        const hasPreferences = prefs && Object.keys(prefs).length > 0;
        
        if (!hasPreferences) {
          logMessage('User has not completed questionnaire - showing welcome message instead of API call');
          
          // Double-check localStorage one more time with different approach
          let hasLocalPrefsDoubleCheck = false;
          try {
            const allLocalStorageKeys = Object.keys(localStorage);
            console.log('[PersonalRecs] All localStorage keys:', allLocalStorageKeys);
            const userPrefKeys = allLocalStorageKeys.filter(key => key.includes('userPrefs_'));
            console.log('[PersonalRecs] User pref keys found:', userPrefKeys);
            
            for (const key of userPrefKeys) {
              const data = localStorage.getItem(key);
              if (data) {
                const parsed = JSON.parse(data);
                if (parsed && Object.keys(parsed).length > 0) {
                  console.log('[PersonalRecs] Found preferences in key:', key, parsed);
                  if (key === `userPrefs_${userId}`) {
                    console.log('[PersonalRecs] Found matching userId preferences!');
                    
                    // Flatten nested preferences structure if it exists
                    let flattenedPrefs = { ...parsed };
                    if (parsed.preferences && typeof parsed.preferences === 'object') {
                      console.log('[PersonalRecs] Flattening nested preferences in double-check');
                      flattenedPrefs = { ...parsed, ...parsed.preferences };
                      delete flattenedPrefs.preferences; // Remove the nested object
                    }
                    
                    prefs = flattenedPrefs;
                    console.log('[PersonalRecs] Double-check flattened preferences:', prefs);
                    hasLocalPrefsDoubleCheck = true;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[PersonalRecs] Error in double-check:', e);
          }
          
          if (!hasLocalPrefsDoubleCheck) {
            safeSetState({
              allRecommendations: [],
              recommendations: [],
              displayIndex: 0,
              dataSource: 'no_questionnaire',
              recommendationReason: '🎬 Welcome! Complete your taste profile questionnaire to get personalized recommendations tailored just for you!',
              hasError: false,
              errorMessage: '',
            });
            return true; // Return success to avoid error state
          } else {
            console.log('[PersonalRecs] Double-check found preferences, proceeding with API call');
          }
        }

        const excludeIds = new Set(Array.from(shownItemsHistory));

        const favoriteIdsList = [];
        const watchlistIdsList = [];

        // Mark API call start
        markPerformance('recommendations-api-start');
        
        logMessage('Attempting fetch via fetchFromPersonalizedApi');
        const apiResult = await fetchFromPersonalizedApi(
          contentTypeFilter,
          excludeIds,
          prefs,
          favoriteIdsList,
          watchlistIdsList,
          forceRefresh
        );

        // Mark API call end and measure duration
        markPerformance('recommendations-api-end');
        const apiDuration = measurePerformance('recommendations-api-duration', 'recommendations-api-start', 'recommendations-api-end');
        
        if (apiResult.success && apiResult.recommendations.length > 0) {
          fetchedRecs = apiResult.recommendations;
          resultDataSource = apiResult.dataSource;
          resultReason = apiResult.reason;
          fetchSuccessful = true;
          logMessage(`Fetch successful, received ${fetchedRecs.length} items. Source: ${resultDataSource}. API Duration: ${apiDuration}ms`);

          // Extract processing time from first item if available
          const processingTimeMs = fetchedRecs[0]?.processingTime || null;

          const newHistory = new Set([...Array.from(shownItemsHistory), ...fetchedRecs.map((r) => r.id?.toString())].slice(-SHOWN_ITEMS_LIMIT));

          // Show first 3 items, keep all 9 for rotation
          const displayedItems = fetchedRecs.slice(0, ITEMS_TO_SHOW);
          const canRotateItems = fetchedRecs.length > ITEMS_TO_SHOW;

          safeSetState({
            allRecommendations: fetchedRecs,
            recommendations: displayedItems,
            displayIndex: 0,
            dataSource: resultDataSource,
            recommendationReason: resultReason,
            hasError: false,
            errorMessage: '',
            shownItemsHistory: newHistory,
            canRotate: canRotateItems,
            processingTime: processingTimeMs,
          });

        } else {
          logMessage('Fetch did not return successful recommendations', apiResult);
          
          // Check if user has no preferences (common cause of empty recommendations)
          const hasPreferences = prefs && Object.keys(prefs).length > 0;
          const hasFavorites = favoriteIdsList && favoriteIdsList.length > 0;
          const hasWatchlist = watchlistIdsList && watchlistIdsList.length > 0;
          
          let recommendationReason;
          if (!hasPreferences && !hasFavorites && !hasWatchlist) {
            recommendationReason = '🎬 Welcome! Complete your taste profile questionnaire to get personalized recommendations tailored just for you!';
          } else if (!hasPreferences) {
            recommendationReason = '📋 Complete your questionnaire to get better personalized recommendations!';
          } else {
            recommendationReason = 'Could not find recommendations matching your profile. Try adjusting preferences or adding favorites!';
          }
          
          // Debug logging (commented out for production)
          // console.log('[PersonalizedRecommendations] 🔍 Empty Recommendations Debug:', {
          //   hasPreferences,
          //   hasFavorites,
          //   hasWatchlist,
          //   preferencesKeys: hasPreferences ? Object.keys(prefs) : [],
          //   apiResultDataSource: apiResult.dataSource,
          //   recommendationReason
          // });
          
          safeSetState({
            allRecommendations: [],
            recommendations: [],
            displayIndex: 0,
            dataSource: apiResult.dataSource || 'none',
            recommendationReason,
            hasError: apiResult.dataSource === 'error',
            errorMessage: apiResult.dataSource === 'error' ? 'Failed to fetch recommendations from the server.' : '',
          });
        }

      } catch (error) {
        logError('Fetch recommendations main error', error);
        
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          logMessage(`Retrying fetch (${retryCountRef.current}/${MAX_RETRIES})...`);
          isFetchingRef.current = false;
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
          setTimeout(() => fetchRecommendations(forceRefresh), RETRY_DELAY);
          return false;
        }
        
        safeSetState({
          allRecommendations: [],
          recommendations: [],
          displayIndex: 0,
          dataSource: 'error',
          recommendationReason: 'Error fetching recommendations',
          hasError: true,
          errorMessage: error.message || 'An unexpected error occurred',
        });
        fetchSuccessful = false;      } finally {
          // Mark the end of recommendation fetching and measure total duration
          markPerformance('recommendations-fetch-end');
          const totalDuration = measurePerformance('recommendations-fetch-total', 'recommendations-fetch-start', 'recommendations-fetch-end');
          
          if (totalDuration) {
            logMessage(`Total recommendation fetch duration: ${totalDuration}ms`);
          }
          
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
          if (mountedRef.current) {
              safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
          }
          isFetchingRef.current = false;
      }
      
      return fetchSuccessful && retryCountRef.current < MAX_RETRIES;
    },
    [
      currentUser,
      isAuthenticated,
      userId,
      initialAppLoadComplete,
      propUserPreferences,
      contentTypeFilter,
      shownItemsHistory,
      fetchFromPersonalizedApi,
      safeSetState,
    ]
  );


  // Handle media favorite status changes
  const handleMediaFavoriteToggle = useCallback((mediaId, isFavorited) => {
    logMessage(`Media favorite status changed: ${mediaId} - ${isFavorited ? 'Added to' : 'Removed from'} favorites`);
    
    if (isFavorited) {
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        allRecommendations: prevState.allRecommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()])
      }));
    }
  }, [safeSetState]);

  // Handle media watchlist status changes
  const handleMediaWatchlistToggle = useCallback((mediaId, isInWatchlist) => {
    logMessage(`Media watchlist status changed: ${mediaId} - ${isInWatchlist ? 'Added to' : 'Removed from'} watchlist`);
    
    if (isInWatchlist) {
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        allRecommendations: prevState.allRecommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()])
      }));
    }
  }, [safeSetState]);

  // Rotate to next set of recommendations
  const handleRotateRecommendations = useCallback(() => {
    if (!canRotate || allRecommendations.length === 0) return;

    const nextIndex = (displayIndex + ITEMS_TO_SHOW) % allRecommendations.length;
    const nextItems = allRecommendations.slice(nextIndex, nextIndex + ITEMS_TO_SHOW);
    
    // If we don't have enough items for a full rotation, wrap around
    if (nextItems.length < ITEMS_TO_SHOW) {
      const remainingItems = allRecommendations.slice(0, ITEMS_TO_SHOW - nextItems.length);
      nextItems.push(...remainingItems);
    }

    logMessage(`Rotating recommendations: ${displayIndex} -> ${nextIndex}`);
    
    safeSetState({
      recommendations: nextItems,
      displayIndex: nextIndex,
      refreshCounter: refreshCounter + 1,
    });
  }, [canRotate, allRecommendations, displayIndex, refreshCounter, safeSetState]);

  // Refresh recommendations (get new batch from backend)
  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current || !userId || !isAuthenticated) {
        return;
    }

    logMessage('Forcing new batch fetch from backend due to handleRefresh call.');
    
    safeSetState({
        isLoading: true,
        isThinking: true,
        isRefreshing: true,
        refreshCounter: refreshCounter + 1,
    });
    
    await fetchRecommendations(true);
  }, [
      userId,
      isAuthenticated,
      fetchRecommendations,
      safeSetState,
      refreshCounter
  ]);


  // Load recommendations on initial mount
  useEffect(() => {
    if (
      !isAuthenticated ||
      !userId ||
      !initialAppLoadComplete ||
      dataLoadAttemptedRef.current ||
      isFetchingRef.current
    ) {
      logMessage('Skipping initial load', {
        isAuthenticated,
        userId,
        initialAppLoadComplete,
        dataLoadAttempted: dataLoadAttemptedRef.current,
        isFetching: isFetchingRef.current,
      });
      
      if (!isFetchingRef.current) {
        safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
      }
      return;
    }

    logMessage('Initial load useEffect: proceeding to call fetchRecommendations', { currentPrefs: propUserPreferences, dataLoadAttempted: dataLoadAttemptedRef.current, initialAppLoadComplete });
    fetchRecommendations(false);

  }, [
    isAuthenticated,
    userId,
    initialAppLoadComplete,
    fetchRecommendations,
    safeSetState,
  ]);


  // Check localStorage for preferences changes periodically
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const checkLocalStorageInterval = setInterval(() => {
      try {
        const localPrefs = localStorage.getItem(`userPrefs_${userId}`);
        if (localPrefs) {
          const parsedPrefs = JSON.parse(localPrefs);
          if (parsedPrefs && Object.keys(parsedPrefs).length > 0 && parsedPrefs.questionnaireCompleted) {
            console.log('[PersonalRecs] Detected completed questionnaire in localStorage, refreshing recommendations');
            clearInterval(checkLocalStorageInterval);
            setTimeout(() => fetchRecommendations(true), 500);
          }
        }
      } catch (e) {
        console.warn('[PersonalRecs] Error checking localStorage interval:', e);
      }
    }, 1000);

    // Clear interval after 30 seconds to avoid infinite polling
    setTimeout(() => clearInterval(checkLocalStorageInterval), 30000);

    return () => clearInterval(checkLocalStorageInterval);
  }, [isAuthenticated, userId, fetchRecommendations]);

  // Refresh recommendations when user preferences change
  useEffect(() => {
    if (!initialAppLoadComplete) return;

    const currentPrefs = JSON.stringify(propUserPreferences || {});
    const previousPrefsString = prevPreferencesRef.current !== null ? prevPreferencesRef.current : JSON.stringify({});

    if (previousPrefsString !== currentPrefs) {
      logMessage('Preference change useEffect: detected change', {
        prevStoredString: prevPreferencesRef.current,
        newPropPrefsObject: propUserPreferences,
        newPrefsString: currentPrefs,
        initialAppLoadComplete,
        propHasCompletedQuestionnaire
      });
      
      if (prevPreferencesRef.current !== null && propHasCompletedQuestionnaire) {
         logMessage('Preference change useEffect: Conditions met, calling handleRefresh.');
        handleRefresh();
      } else {
        logMessage('Preference change useEffect: Conditions not met for handleRefresh or first pref setting.', {
            wasPrevNull: prevPreferencesRef.current === null,
            hasCompletedQuestionnaire: propHasCompletedQuestionnaire
        });
      }
    }
    
    prevPreferencesRef.current = currentPrefs;
  }, [initialAppLoadComplete, propHasCompletedQuestionnaire, propUserPreferences, handleRefresh]);


  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    refreshRecommendations: (updatedPrefs = null) => {
      logMessage('Refreshing recommendations from external trigger');
      
      if (updatedPrefs) {
        prevPreferencesRef.current = JSON.stringify(updatedPrefs);
      }
      
      handleRefresh();
    },
  }));

  // Listen for external favorites and watchlist updates
  useEffect(() => {
    const handleExternalUpdate = (event) => {
      const { mediaId, type } = event.detail || {};
      if (!mediaId) return;

      logMessage(`External ${type} update detected for: ${mediaId}. Removing from current display.`);
      
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        allRecommendations: prevState.allRecommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()])
      }));
    };

    const handleFavoritesUpdate = (event) => handleExternalUpdate({ ...event, detail: { ...event.detail, type: 'favorite' } });
    const handleWatchlistUpdate = (event) => handleExternalUpdate({ ...event, detail: { ...event.detail, type: 'watchlist' } });

    document.addEventListener('favorites-updated', handleFavoritesUpdate);
    document.addEventListener('watchlist-updated', handleWatchlistUpdate);

    return () => {
      document.removeEventListener('favorites-updated', handleFavoritesUpdate);
      document.removeEventListener('watchlist-updated', handleWatchlistUpdate);
    };
  }, [safeSetState]);


  // --- Render Logic ---
  if (!isAuthenticated || !initialAppLoadComplete) {
    logMessage('Not rendering: Not authenticated or initial app load incomplete');
    return null;
  }

  const showLoading = isLoading;
  const showRecs = !isLoading && recommendations.length > 0;
  const showError = !isLoading && hasError;
  const showEmpty = !isLoading && !hasError && dataLoadAttemptedRef.current && recommendations.length === 0;

  let content;
  if (showLoading) {
    content = (
      <motion.div
        key={`loading-${refreshCounter}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[...Array(MIN_RECOMMENDATION_COUNT)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl h-[350px] shadow-md overflow-hidden animate-pulse">
              <div className="h-3/5 bg-gray-700"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  } else if (showRecs) {
    content = (
      <motion.div
        key={`recommendations-${refreshCounter}-${displayIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
      >
        {recommendations.map((item) => (
          <motion.div
            key={item.id}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            <MediaCard
              result={item}
              currentUser={currentUser}
              onFavoriteToggle={handleMediaFavoriteToggle}
              onWatchlistToggle={handleMediaWatchlistToggle}
              onClick={onMediaClick}
              showRecommendationReason={true}
              recommendationReason={item.recommendationReason}
              recommendationScore={item.score}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  } else if (showError) {
    content = (
      <motion.div
        key="error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-red-700"
      >
        <div className="mb-4 text-5xl text-red-400">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-3">Something went wrong</h3>
        <p className="text-gray-400 mb-6">{errorMessage || "We couldn't load recommendations"}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isThinking ? 'Trying...' : 'Try Again'}
        </motion.button>
      </motion.div>
    );
  } else if (showEmpty) {
    content = (
      <motion.div
        key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-gray-700"
      >
        <div className="mb-4 text-5xl text-indigo-400">🤷‍♂️</div>
        <h3 className="text-xl font-semibold text-white mb-3">No Recommendations Found</h3>
        <p className="text-gray-400 mb-6">{recommendationReason || "We couldn't find anything matching your profile right now."}</p>
        
        {/* Show different buttons based on whether user has preferences */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {(!propUserPreferences || Object.keys(propUserPreferences).length === 0) ? (
            // User has no preferences - show questionnaire button
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/onboarding')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium"
              >
                🎯 Complete Questionnaire
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isThinking}
                className={`bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-full ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isThinking ? 'Loading...' : 'Try Again'}
              </motion.button>
            </>
          ) : (
            // User has preferences - show refresh button
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={isThinking}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isThinking ? 'Loading...' : 'Get New Recommendations'}
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  } else {
    content = <div key="fallback" className="min-h-[200px]"></div>;
  }

  // Dynamic Title based on dataSource
  let title = 'Recommendations For You';
  if (dataSource === 'error') title = "Error Loading";
  else if (dataSource === 'client-cache') title = 'Recent Recommendations';
  else if (dataSource === 'personalized_lambda' || dataSource === 'dynamo_personalized') title = 'Fresh Recommendations';
  else if (dataSource === 'none') title = 'No Recommendations Found';


  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-12 max-w-7xl mx-auto px-4"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { safeSetState({ contentTypeFilter: 'both' }); handleRefresh(); }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'both' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            disabled={isThinking}
          >
            <VideoCameraIcon className="h-3 w-3 sm:h-4 sm:w-4" /> <span>Both</span>
          </motion.button>
          <motion.button
             whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { safeSetState({ contentTypeFilter: 'movies' }); handleRefresh(); }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'movies' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            disabled={isThinking}
          >
            <FilmIcon className="h-3 w-3 sm:h-4 sm:w-4" /> <span>Movies</span>
          </motion.button>
          <motion.button
             whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { safeSetState({ contentTypeFilter: 'tv' }); handleRefresh(); }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'tv' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            disabled={isThinking}
          >
            <TvIcon className="h-3 w-3 sm:h-4 sm:w-4" /> <span>TV Shows</span>
          </motion.button>
          {canRotate && !isLoading && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleRotateRecommendations}
              className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm bg-purple-600 text-white hover:bg-purple-700"
            >
              <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Show More</span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isThinking}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${isThinking ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            <motion.div
              animate={isThinking ? { rotate: 360 } : { rotate: 0 }}
              transition={isThinking ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.3 }}
            >
              <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </motion.div>
            <span>{isThinking ? 'Processing...' : 'New Batch'}</span>
          </motion.button>
        </div>
      </div>

      {!isLoading && !hasError && recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 space-y-2">
          {recommendationReason && (
            <div className="text-gray-300 text-sm flex items-center">
              <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-1.5 flex-shrink-0" />
              <span>{recommendationReason}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Showing {recommendations.length} of {allRecommendations.length} personalized recommendations
              {canRotate && ` • ${Math.floor(allRecommendations.length / ITEMS_TO_SHOW)} sets available`}
            </span>
            {processingTime && (
              <span>Generated in {(processingTime / 1000).toFixed(1)}s</span>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;
