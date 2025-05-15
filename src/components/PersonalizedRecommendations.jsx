import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaCard from './MediaCard';
import { ArrowPathIcon, LightBulbIcon, ExclamationCircleIcon, FilmIcon, TvIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { fetchCachedMedia } from '../services/mediaCache'; // Removed shouldRefreshCache as it's handled internally

// --- Constants ---
const MIN_RECOMMENDATION_COUNT = 3; // Number of items to display at once
const ITEMS_TO_FETCH = 6; // Number of items to fetch from backend
const SHOWN_ITEMS_LIMIT = 150; // Limit history to prevent excessive exclusion list size
const RETRY_DELAY = 1500;
const MAX_RETRIES = 2;
const LOADING_TIMEOUT = 15000; // Timeout for fetch operation

const DEBUG_LOGGING = process.env.NODE_ENV === 'development';

// --- Helper Functions ---
const logMessage = (message, data) => {
  if (DEBUG_LOGGING) {
    // console.log(`[PersonalRecs] ${message}`, data !== undefined ? data : ''); // Removed log
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
    propUserPreferences, // Renamed for clarity
    propHasCompletedQuestionnaire, // Renamed for clarity
    initialAppLoadComplete = false,
    onMediaClick, // Add prop for handling media click
  } = props;

  const userId = isAuthenticated ? currentUser?.attributes?.sub : null;

  // --- State Management ---
  const [state, setState] = useState({
    allRecommendations: [], // Holds all fetched items (up to ITEMS_TO_FETCH)
    recommendations: [], // Holds the currently displayed items (up to MIN_RECOMMENDATION_COUNT)
    displayIndex: 0, // 0 for first set, 1 for second set
    dataSource: null,
    recommendationReason: '',
    shownItemsHistory: new Set(),
    isLoading: false,
    isThinking: false, // More specific state for refresh button animation
    isRefreshing: false, // Flag for full backend refresh vs display update
    hasError: false,
    errorMessage: '',
    refreshCounter: 0, // Used for key prop to force re-render animations
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
    // isRefreshing, // Not directly used in render logic anymore
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
  const dataLoadAttemptedRef = useRef(false); // Track if initial load was tried

  // --- Lifecycle and Cleanup ---
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  // --- Safe State Update ---
  const safeSetState = useCallback((newState) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...newState }));
    }
  }, []);

  // --- User Change Detection ---
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
      prevPreferencesRef.current = null; // Reset pref tracking on user change
      prevUserIdRef.current = currentUserId;
    }
  }, [currentUser, safeSetState]);


  // --- Simplified Fetch Wrapper ---
  const fetchFromPersonalizedApi = useCallback(async (currentContentTypeFilter, excludeIdsSet = new Set(), preferences = {}, favoriteIdsList = [], watchlistIdsList = [], forceRefresh = false) => {
    logMessage('Calling fetchCachedMedia', { currentContentTypeFilter, excludeIdsCount: excludeIdsSet.size, preferences, favoriteIdsCount: favoriteIdsList.length, watchlistIdsCount: watchlistIdsList.length, forceRefresh });
    try {
      const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
      // No need for token check here if API Gateway doesn't require it,
      // but pass it if it might be used for authorization/logging later.

      const mediaType = currentContentTypeFilter === 'both' ? 'both' : currentContentTypeFilter === 'movies' ? 'movie' : 'tv';

      // fetchCachedMedia now handles limit internally (defaults to 6)
      const result = await fetchCachedMedia({
        mediaType,
        // limit: ITEMS_TO_FETCH, // Not needed if backend defaults to 6
        excludeIds: Array.from(excludeIdsSet),
        token,
        preferences,
        favoriteIds: favoriteIdsList,
        watchlistIds: watchlistIdsList,
        forceRefresh, // Pass the forceRefresh flag
      });

      // fetchCachedMedia returns { items: [], source: '...' }
      if (result.items && result.items.length > 0) {
        logMessage(`Successfully fetched ${result.items.length} items via fetchCachedMedia. Source: ${result.source}`);
        return {
          success: true,
          recommendations: result.items, // Already mapped in fetchCachedMedia
          dataSource: result.source,
          // Reason can be derived from source or set generically
          reason: result.source === 'client-cache' ? 'From your recent recommendations' : 'Fresh recommendations for you'
        };
      }

      logMessage('fetchCachedMedia returned no items or an error state', result);
      return { success: false, dataSource: result.source }; // Pass source even on failure if available

    } catch (error) {
      logError('Error calling fetchCachedMedia', error);
      return { success: false, dataSource: 'error' };
    }
  }, [currentUser]); // Dependency on currentUser for token


  // --- Core Recommendation Fetch Logic (Simplified) ---
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      // console.log('[fetchRecommendations] Called.', { forceRefresh }); // <-- Remove log
      // console.log('[fetchRecommendations] Checking conditions:', { isAuthenticated, userId, initialAppLoadComplete, isFetching: isFetchingRef.current }); // <-- Remove log
      // Prevent fetching if not authenticated, initial load not complete, or already fetching
      if (!isAuthenticated || !userId || !initialAppLoadComplete || isFetchingRef.current) {
        if (!isFetchingRef.current) { // Only reset loading state if not already fetching
             safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
        }
        logMessage('Fetch skipped', { isAuthenticated, userId, initialAppLoadComplete, isFetching: isFetchingRef.current });
        // console.log('[fetchRecommendations] Exiting early due to conditions.'); // <-- Remove log
        return false;
      }

      logMessage(`Starting fetchRecommendations (forceRefresh: ${forceRefresh})`);
      isFetchingRef.current = true;
      dataLoadAttemptedRef.current = true; // Mark that a load was attempted
      retryCountRef.current = 0; // Reset retries for this fetch cycle

      // Set loading states
      safeSetState({
        isRefreshing: forceRefresh, // Indicate if it's a full refresh
        isThinking: true, // For button animation
        hasError: false,
        errorMessage: '',
        isLoading: true, // General loading indicator
      });

      // Start loading timeout
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

        // Fetch favorite/watchlist IDs directly if needed by API (already passed in current setup)
        // For exclusion, we primarily use shownItemsHistory now, backend handles fav/watchlist exclusion
        const excludeIds = new Set(Array.from(shownItemsHistory));

        // Fetch favorite/watchlist IDs to pass to the API
        // NOTE: This assumes you have functions to get these IDs efficiently.
        // If not, the backend needs to handle fetching them based on userId.
        // Placeholder: Replace with actual calls if needed.
        const favoriteIdsList = []; // await getFavoriteIds(token);
        const watchlistIdsList = []; // await getWatchlistIds(token);

        logMessage('Attempting fetch via fetchFromPersonalizedApi');
        const apiResult = await fetchFromPersonalizedApi(
          contentTypeFilter,
          excludeIds,
          prefs,
          favoriteIdsList,
          watchlistIdsList,
          forceRefresh // Pass forceRefresh down
        );

        if (apiResult.success && apiResult.recommendations.length > 0) {
          fetchedRecs = apiResult.recommendations; // These are the 6 items
          resultDataSource = apiResult.dataSource;
          resultReason = apiResult.reason;
          fetchSuccessful = true;
          logMessage(`Fetch successful, received ${fetchedRecs.length} items. Source: ${resultDataSource}`);

          // Update state with the new full list and display the first set
          const newHistory = new Set([...Array.from(shownItemsHistory), ...fetchedRecs.map((r) => r.id?.toString())].slice(-SHOWN_ITEMS_LIMIT));

          safeSetState({
            allRecommendations: fetchedRecs,
            recommendations: fetchedRecs.slice(0, MIN_RECOMMENDATION_COUNT), // Display first 3
            displayIndex: 0, // Reset display index
            dataSource: resultDataSource,
            recommendationReason: resultReason,
            hasError: false,
            errorMessage: '',
            shownItemsHistory: newHistory,
          });

        } else {
          // Handle case where API call succeeded but returned no items, or failed
          logMessage('Fetch did not return successful recommendations', apiResult);
          safeSetState({
            allRecommendations: [],
            recommendations: [],
            displayIndex: 0,
            dataSource: apiResult.dataSource || 'none', // Use source from result if available
            recommendationReason: 'Could not find recommendations matching your profile. Try adjusting preferences or adding favorites!',
            hasError: apiResult.dataSource === 'error', // Set error flag if source indicates error
            errorMessage: apiResult.dataSource === 'error' ? 'Failed to fetch recommendations from the server.' : '',
          });
        }

      } catch (error) {
        logError('Fetch recommendations main error', error);
        // Retry logic remains similar
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          logMessage(`Retrying fetch (${retryCountRef.current}/${MAX_RETRIES})...`);
          isFetchingRef.current = false; // Allow retry
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); // Clear timeout before retry delay
          setTimeout(() => fetchRecommendations(forceRefresh), RETRY_DELAY);
          return false; // Indicate fetch is not complete (retrying)
        }
        // Max retries reached or unrecoverable error
        safeSetState({
          allRecommendations: [],
          recommendations: [],
          displayIndex: 0,
          dataSource: 'error',
          recommendationReason: 'Error fetching recommendations',
          hasError: true,
          errorMessage: error.message || 'An unexpected error occurred',
        });
        fetchSuccessful = false; // Ensure fetch is marked as unsuccessful

      } finally {
          // This specific execution of fetchRecommendations is finishing.
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
          if (mountedRef.current) {
              // Reset UI loading state regardless of success/failure/retry
              safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
          }
          isFetchingRef.current = false; // Always reset the flag for this execution context
          // console.log('[fetchRecommendations] finally: Reset isFetchingRef to false.'); // Remove log
      }
      // Return true only if the fetch cycle completed successfully in *this* execution (not counting retries)
      return fetchSuccessful && retryCountRef.current < MAX_RETRIES;
    },
    [
      currentUser, // Needed for token
      isAuthenticated,
      userId,
      initialAppLoadComplete,
      propUserPreferences,
      contentTypeFilter,
      shownItemsHistory, // Needed for exclusion list
      fetchFromPersonalizedApi, // Use the simplified wrapper
      safeSetState,
    ]
  );


  // --- Event Handlers ---
  const handleMediaFavoriteToggle = useCallback((mediaId, isFavorited) => {
    logMessage(`Media favorite status changed: ${mediaId} - ${isFavorited ? 'Added to' : 'Removed from'} favorites`);
    // Remove from current display if added to favorites
    if (isFavorited) {
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        // Also remove from the full list to prevent reappearance on refresh cycle
        allRecommendations: prevState.allRecommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()]) // Add to history
      }));
    }
    // Optionally trigger a full refresh if desired, but local removal is faster UX
    // handleRefresh();
  }, [safeSetState]);

  const handleMediaWatchlistToggle = useCallback((mediaId, isInWatchlist) => {
    logMessage(`Media watchlist status changed: ${mediaId} - ${isInWatchlist ? 'Added to' : 'Removed from'} watchlist`);
    // Remove from current display if added to watchlist
    if (isInWatchlist) {
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        // Also remove from the full list
        allRecommendations: prevState.allRecommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()]) // Add to history
      }));
    }
    // Optionally trigger a full refresh
    // handleRefresh();
  }, [safeSetState]);

  // --- Refresh Logic (Fetch 6, Show 3) ---
  const handleRefresh = useCallback(async () => {
    // console.log('[handleRefresh] Clicked!'); // <-- Remove log
    // console.log('[handleRefresh] Checking conditions:', { isFetching: isFetchingRef.current, userId, isAuthenticated }); // <-- Remove log
    if (isFetchingRef.current || !userId || !isAuthenticated) {
        // console.log('[handleRefresh] Exiting early due to conditions.'); // <-- Remove log
        return;
    }

    // Always fetch a new batch from the backend when "Get New Recommendations" is clicked.
    logMessage('Forcing new batch fetch from backend due to handleRefresh call.');
    // Set loading states immediately before async call
    safeSetState({
        isLoading: true, // Use isLoading for the full fetch
        isThinking: true,
        isRefreshing: true, // Mark as a full refresh
        refreshCounter: state.refreshCounter + 1,
    });
    // displayIndex will be reset to 0 inside fetchRecommendations on successful fetch of new batch.
    await fetchRecommendations(true); // Pass true for forceRefresh
  }, [
      userId,
      isAuthenticated,
      // displayIndex, // No longer needed as we always fetch
      // allRecommendations, // No longer needed
      fetchRecommendations,
      safeSetState,
      state.refreshCounter
  ]);


  // --- Initial Load ---
  useEffect(() => {
    // Conditions to prevent initial load
    if (!isAuthenticated || !userId || !initialAppLoadComplete || dataLoadAttemptedRef.current) {
         logMessage('Skipping initial load', { isAuthenticated, userId, initialAppLoadComplete, dataLoadAttempted: dataLoadAttemptedRef.current });
        return;
    }

    logMessage('Attempting initial load');
    // Set loading state immediately
    safeSetState({ isLoading: true, isThinking: true });
    fetchRecommendations(false); // Call fetch, don't force refresh

    // Cleanup for timeout is handled within fetchRecommendations now
  }, [isAuthenticated, userId, initialAppLoadComplete, fetchRecommendations, safeSetState]); // Add fetchRecommendations and safeSetState


  // --- Preference Changes ---
  useEffect(() => {
    // Only trigger refresh if questionnaire is complete and preferences actually change
    if (!initialAppLoadComplete || !propHasCompletedQuestionnaire) return;

    const currentPrefs = JSON.stringify(propUserPreferences || null);
    if (prevPreferencesRef.current !== null && prevPreferencesRef.current !== currentPrefs) {
      logMessage('Preferences changed, triggering refresh');
      // Don't set loading state here, handleRefresh will do it
      handleRefresh();
    }
    // Update ref *after* comparison
    prevPreferencesRef.current = currentPrefs;
  }, [initialAppLoadComplete, propHasCompletedQuestionnaire, propUserPreferences, handleRefresh]); // Add handleRefresh dependency


  // --- Expose methods for parent components ---
  useImperativeHandle(ref, () => ({
    refreshRecommendations: (updatedPrefs = null) => {
      logMessage('Refreshing recommendations from external trigger');
      // Update internal preference tracking if new prefs are passed
      if (updatedPrefs) {
        prevPreferencesRef.current = JSON.stringify(updatedPrefs);
      }
      // Trigger the refresh handler
      handleRefresh();
    },
  }));

  // --- Listen for external favorites and watchlist updates ---
  useEffect(() => {
    const handleExternalUpdate = (event) => {
      const { mediaId, type } = event.detail || {};
      if (!mediaId) return;

      logMessage(`External ${type} update detected for: ${mediaId}. Removing from current display.`);
      // Remove the item from both lists if it's currently displayed or in the buffer
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        allRecommendations: prevState.allRecommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()]) // Ensure it's added to history
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
  }, [safeSetState]); // Add safeSetState dependency


  // --- Render Logic ---
  if (!isAuthenticated || !initialAppLoadComplete) {
    logMessage('Not rendering: Not authenticated or initial app load incomplete');
    return null; // Don't render anything if not ready
  }

  // Determine what to show based on state
  const showLoading = isLoading;
  // Show recommendations only if not loading AND there are items in the current display list
  const showRecs = !isLoading && recommendations.length > 0;
  const showError = !isLoading && hasError;
  // Show empty state if: not loading, no error, a fetch was attempted, and the current display list is empty
  const showEmpty = !isLoading && !hasError && dataLoadAttemptedRef.current && recommendations.length === 0;

  let content;
  if (showLoading) {
    content = (
      <motion.div
        key={`loading-${refreshCounter}`} // Use counter for unique key
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Skeleton Loader */}
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
        // Key includes displayIndex to trigger animation when switching sets
        key={`recommendations-${refreshCounter}-${displayIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
      >
        {/* Render the 'recommendations' state which holds the current 3 items */}
        {recommendations.map((item) => (
          <motion.div
            key={item.id} // Use item ID as key
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
              onClick={onMediaClick} // Pass the click handler to MediaCard
            />
          </motion.div>
        ))}
      </motion.div>
    );
  } else if (showError) {
    content = (
      <motion.div
        key="error" // Static key for error state
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-red-700"
      >
        {/* Error Message UI */}
        <div className="mb-4 text-5xl text-red-400">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-3">Something went wrong</h3>
        <p className="text-gray-400 mb-6">{errorMessage || "We couldn't load recommendations"}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking} // Disable only on thinking state
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isThinking ? 'Trying...' : 'Try Again'}
        </motion.button>
      </motion.div>
    );
  } else if (showEmpty) {
    content = (
      <motion.div
        key="empty" // Static key for empty state
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-gray-700"
      >
        {/* Empty State UI */}
        <div className="mb-4 text-5xl text-indigo-400">🤷‍♂️</div>
        <h3 className="text-xl font-semibold text-white mb-3">No Recommendations Found</h3>
        <p className="text-gray-400 mb-6">{recommendationReason || "We couldn't find anything matching your profile right now."}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking} // Disable only on thinking state
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isThinking ? 'Loading...' : 'Get New Recommendations'}
        </motion.button>
      </motion.div>
    );
  } else {
    // Fallback for initial render before first fetch attempt or unexpected states
    content = <div key="fallback" className="min-h-[200px]"></div>;
  }

  // Dynamic Title based on dataSource
  let title = 'Recommendations For You';
  if (dataSource === 'error') title = "Error Loading";
  else if (dataSource === 'client-cache') title = 'Recent Recommendations';
  else if (dataSource === 'personalized_lambda' || dataSource === 'dynamo_personalized') title = 'Fresh Recommendations'; // Adjust based on actual source string from Lambda
  // Add more specific titles based on backend source if needed
  else if (dataSource === 'none') title = 'No Recommendations Found';


  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-12 max-w-7xl mx-auto px-4"
    >
      {/* Header with Title and Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {/* Content Type Filter Buttons */}
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
          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isThinking} // Disable button while thinking/loading
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

      {/* Recommendation Reason */}
      {!isLoading && !hasError && recommendationReason && recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 text-gray-300 text-sm flex items-center">
          <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-1.5 flex-shrink-0" />
          <span>{recommendationReason}</span>
        </motion.div>
      )}

      {/* Content Area (Loading/Recs/Error/Empty) */}
      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;
