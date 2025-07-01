import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaCard from './MediaCard';
import { ArrowPathIcon, LightBulbIcon, FilmIcon, TvIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { fetchCachedMedia } from '../services/mediaCache';
import { markPerformance, measurePerformance } from '../utils/webVitals';

// --- Constants ---
const MIN_RECOMMENDATION_COUNT = 3;
const ITEMS_TO_FETCH = 6;
const SHOWN_ITEMS_LIMIT = 150;
const RETRY_DELAY = 1500;
const MAX_RETRIES = 2;
const LOADING_TIMEOUT = 15000;

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

  // --- State Management ---
  const [state, setState] = useState({
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
    try {
      const token = currentUser?.signInUserSession?.accessToken?.jwtToken;

      const mediaType = currentContentTypeFilter === 'both' ? 'both' : currentContentTypeFilter === 'movies' ? 'movie' : 'tv';

      const result = await fetchCachedMedia({
        mediaType,
        excludeIds: Array.from(excludeIdsSet),
        token,
        preferences,
        favoriteIds: favoriteIdsList,
        watchlistIds: watchlistIdsList,
        forceRefresh,
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
        const prefs = propUserPreferences || {};
        logMessage('fetchRecommendations: using preferences for API call', { prefs });

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

          const newHistory = new Set([...Array.from(shownItemsHistory), ...fetchedRecs.map((r) => r.id?.toString())].slice(-SHOWN_ITEMS_LIMIT));

          safeSetState({
            allRecommendations: fetchedRecs,
            recommendations: fetchedRecs.slice(0, MIN_RECOMMENDATION_COUNT),
            displayIndex: 0,
            dataSource: resultDataSource,
            recommendationReason: resultReason,
            hasError: false,
            errorMessage: '',
            shownItemsHistory: newHistory,
          });

        } else {
          logMessage('Fetch did not return successful recommendations', apiResult);
          safeSetState({
            allRecommendations: [],
            recommendations: [],
            displayIndex: 0,
            dataSource: apiResult.dataSource || 'none',
            recommendationReason: 'Could not find recommendations matching your profile. Try adjusting preferences or adding favorites!',
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

  // Refresh recommendations
  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current || !userId || !isAuthenticated) {
        return;
    }

    logMessage('Forcing new batch fetch from backend due to handleRefresh call.');
    
    safeSetState({
        isLoading: true,
        isThinking: true,
        isRefreshing: true,
        refreshCounter: state.refreshCounter + 1,
    });
    
    await fetchRecommendations(true);
  }, [
      userId,
      isAuthenticated,
      fetchRecommendations,
      safeSetState,
      state.refreshCounter
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


  // Refresh recommendations when user preferences change
  useEffect(() => {
    if (!initialAppLoadComplete || !propHasCompletedQuestionnaire) return;

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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isThinking ? 'Loading...' : 'Get New Recommendations'}
        </motion.button>
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
            <span>{isThinking ? 'Loading...' : 'Get New Recommendations'}</span>
          </motion.button>
        </div>
      </div>

      {!isLoading && !hasError && recommendationReason && recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 text-gray-300 text-sm flex items-center">
          <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-1.5 flex-shrink-0" />
          <span>{recommendationReason}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;
