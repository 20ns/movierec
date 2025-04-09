// src/components/PersonalizedRecommendations.jsx

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { ArrowPathIcon, LightBulbIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

// --- Constants ---
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const RECOMMENDATIONS_CACHE_KEY_PREFIX = 'movieRec_recommendations_';
const SESSION_RECS_LOADED_FLAG = 'movieRec_session_loaded';
const MIN_RECOMMENDATION_COUNT = 3;
const MAX_RECOMMENDATION_COUNT = 6;
const SHOWN_ITEMS_LIMIT = 150;
const RETRY_DELAY = 1500;
const MAX_RETRIES = 2;
const LOADING_TIMEOUT = 15000;

const DEBUG_LOGGING = process.env.NODE_ENV === 'development';

// --- Helper Functions ---
const logMessage = (message, data) => {
  if (DEBUG_LOGGING) {
    console.log(`[PersonalRecs] ${message}`, data !== undefined ? data : '');
  }
};

const logError = (message, error) => {
  console.error(`[PersonalRecs] ${message}`, error);
};

const getCacheKey = (userId) => (userId ? `${RECOMMENDATIONS_CACHE_KEY_PREFIX}${userId}` : null);

const getRecommendationsFromCache = (userId) => {
  const cacheKey = getCacheKey(userId);
  if (!cacheKey) return null;

  try {
    const cachedString = localStorage.getItem(cacheKey);
    if (!cachedString) {
      logMessage(`Cache miss for user ${userId}: No item found.`);
      return null;
    }

    const parsed = JSON.parse(cachedString);
    const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRATION_TIME;

    if (isExpired) {
      logMessage(`Cache expired for user ${userId}. Timestamp: ${new Date(parsed.timestamp).toISOString()}`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    if (Array.isArray(parsed.data) && parsed.data.length > 0 && parsed.dataSource) {
      logMessage(`Valid cache found for user ${userId}. Source: ${parsed.dataSource}, Count: ${parsed.data.length}`);
      return parsed;
    } else {
      logMessage(`Invalid cache structure for user ${userId}. Removing.`);
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (e) {
    logError(`Error reading or parsing cache for user ${userId}`, e);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

// --- Component Definition ---
export const PersonalizedRecommendations = forwardRef((props, ref) => {
  const {
    currentUser,
    isAuthenticated,
    propUserPreferences,
    propHasCompletedQuestionnaire,
    initialAppLoadComplete = false,
  } = props;

  logMessage('Component Render/Update. Props:', {
    isAuthenticated: !!isAuthenticated,
    hasUser: !!currentUser,
    userId: currentUser?.attributes?.sub,
    hasPrefs: !!propUserPreferences,
    questCompleteProp: !!propHasCompletedQuestionnaire,
    appLoadComplete: !!initialAppLoadComplete,
  });

  const userId = isAuthenticated ? currentUser?.attributes?.sub : null;

  // --- State Management ---
  const [state, setState] = useState({
    recommendations: [],
    dataSource: null,
    recommendationReason: '',
    shownItemsHistory: new Set(),
    isLoading: false,
    isThinking: false,
    isRefreshing: false,
    hasError: false,
    errorMessage: '',
    cacheChecked: false,
    refreshCounter: 0,
  });

  const {
    recommendations,
    dataSource,
    recommendationReason,
    shownItemsHistory,
    isLoading,
    isThinking,
    isRefreshing,
    hasError,
    errorMessage,
    cacheChecked,
    refreshCounter,
  } = state;

  // --- Refs ---
  const isFetchingRef = useRef(false);
  const dataLoadAttemptedRef = useRef(false);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const loadingTimeoutRef = useRef(null);
  const prevPreferencesRef = useRef(null);
  const prevUserIdRef = useRef(null);

  // --- Lifecycle and Cleanup ---
  useEffect(() => {
    mountedRef.current = true;
    logMessage('Component Mounted');
    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      logMessage('Component Unmounted');
    };
  }, []);

  // --- Safe State Update ---
  const safeSetState = useCallback((newState) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...newState }));
    } else {
      logMessage('State update skipped: Component unmounted.', newState);
    }
  }, []);

  // --- User Change Detection ---
  useEffect(() => {
    const currentUserId = currentUser?.attributes?.sub;
    if (currentUserId !== prevUserIdRef.current) {
      logMessage(`User changed from ${prevUserIdRef.current} to ${currentUserId}. Resetting state.`);
      safeSetState({
        recommendations: [],
        dataSource: null,
        recommendationReason: '',
        shownItemsHistory: new Set(),
        isLoading: false,
        isThinking: false,
        isRefreshing: false,
        hasError: false,
        errorMessage: '',
        cacheChecked: false,
        refreshCounter: 0,
      });
      isFetchingRef.current = false;
      dataLoadAttemptedRef.current = false;
      retryCountRef.current = 0;
      prevPreferencesRef.current = null;
    }
    prevUserIdRef.current = currentUserId;
  }, [currentUser, safeSetState]);

  // --- Cache Management ---
  const saveRecommendationsToCache = useCallback((data, currentUserId, currentDataSource, currentReason) => {
    if (!currentUserId || !['both', 'preferences', 'favorites'].includes(currentDataSource)) {
      logMessage(`Skipping cache save. User: ${currentUserId}, Source: ${currentDataSource}`);
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      logMessage(`Skipping cache save: No data to cache.`);
      return;
    }

    const currentCacheKey = getCacheKey(currentUserId);
    if (!currentCacheKey) return;

    try {
      const cache = {
        timestamp: Date.now(),
        data,
        dataSource: currentDataSource,
        reason: currentReason,
      };
      localStorage.setItem(currentCacheKey, JSON.stringify(cache));
      sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true');
      logMessage(`Saved ${data.length} recommendations to cache. Source: ${currentDataSource}`);
    } catch (e) {
      logError('Error saving recommendations to localStorage', e);
      localStorage.removeItem(currentCacheKey);
    }
  }, []);

  // --- Data Fetching Utilities ---
  const fetchGenericRecommendations = useCallback(async (excludeIds = new Set()) => {
    logMessage('Fetching generic recommendations...');
    const combinedExclusions = new Set([...excludeIds, ...shownItemsHistory]);
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) {
      logError('TMDB API Key missing!');
      return [];
    }

    try {
      const trendingResponse = await axios.get('https://api.themoviedb.org/3/trending/all/week', {
        params: { api_key: apiKey, page: Math.floor(Math.random() * 5) + 1 },
      });
      let fetchedItems = trendingResponse.data.results
        .filter((item) => item.poster_path && item.overview && !combinedExclusions.has(item.id))
        .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

      if (fetchedItems.length < MAX_RECOMMENDATION_COUNT) {
        const needed = MAX_RECOMMENDATION_COUNT - fetchedItems.length;
        const topRatedResponse = await axios.get('https://api.themoviedb.org/3/movie/top_rated', {
          params: { api_key: apiKey, page: Math.floor(Math.random() * 5) + 1 },
        });
        const currentIds = new Set(fetchedItems.map((item) => item.id));
        const additionalItems = topRatedResponse.data.results
          .filter(
            (item) =>
              item.poster_path &&
              item.overview &&
              !currentIds.has(item.id) &&
              !combinedExclusions.has(item.id)
          )
          .map((item) => ({
            ...item,
            media_type: 'movie',
            score: Math.round((item.vote_average / 10) * 100),
          }))
          .slice(0, needed);
        fetchedItems = [...fetchedItems, ...additionalItems];
      }
      fetchedItems = fetchedItems.slice(0, MAX_RECOMMENDATION_COUNT);

      if (fetchedItems.length > 0) {
        logMessage(`Fetched ${fetchedItems.length} generic items.`);
        safeSetState({
          shownItemsHistory: new Set([...shownItemsHistory, ...fetchedItems.map((item) => item.id)].slice(-SHOWN_ITEMS_LIMIT)),
        });
      }
      return fetchedItems;
    } catch (error) {
      logError('Error fetching generic recommendations', error);
      return [];
    }
  }, [shownItemsHistory, safeSetState]);

  const fetchSupplementaryRecommendations = useCallback(async (currentCount, existingIds = new Set()) => {
    const neededCount = Math.max(0, MIN_RECOMMENDATION_COUNT - currentCount);
    if (neededCount <= 0) return [];
    logMessage(`Fetching ${neededCount} supplementary recommendations.`);
    const combinedExclusions = new Set([...existingIds, ...shownItemsHistory]);
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) {
      logError('TMDB API Key missing!');
      return [];
    }

    try {
      const [topRatedResponse, popularResponse] = await Promise.all([
        axios.get('https://api.themoviedb.org/3/movie/top_rated', {
          params: { api_key: apiKey, page: Math.floor(Math.random() * 2) + 1 },
        }),
        axios.get('https://api.themoviedb.org/3/movie/popular', {
          params: { api_key: apiKey, page: Math.floor(Math.random() * 2) + 1 },
        }),
      ]);

      const supplementaryResults = [
        ...topRatedResponse.data.results.map((item) => ({ ...item, media_type: 'movie' })),
        ...popularResponse.data.results.map((item) => ({ ...item, media_type: 'movie' })),
      ]
        .filter((item) => item.poster_path && item.overview && !combinedExclusions.has(item.id))
        .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

      const uniqueMap = new Map();
      supplementaryResults.forEach((item) => {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });
      const finalSupplementary = Array.from(uniqueMap.values())
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, neededCount);

      logMessage(`Fetched ${finalSupplementary.length} supplementary items.`);
      if (finalSupplementary.length > 0) {
        safeSetState({
          shownItemsHistory: new Set([...shownItemsHistory, ...finalSupplementary.map((item) => item.id)].slice(-SHOWN_ITEMS_LIMIT)),
        });
      }
      return finalSupplementary;
    } catch (error) {
      logError('Error fetching supplementary recommendations', error);
      return [];
    }
  }, [shownItemsHistory, safeSetState]);

  const fetchUserFavoritesAndGenres = useCallback(async (token) => {
    if (!token) return { favorites: [], genres: [] };
    logMessage('Fetching user favorites & deriving genres...');
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) {
      logError('TMDB API Key missing!');
      return { favorites: [], genres: [] };
    }

    try {
      const favResponse = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!favResponse.ok) throw new Error(`Favorites API Error: Status ${favResponse.status}`);
      const favData = await favResponse.json();
      const favorites = favData?.items || [];
      logMessage(`Fetched ${favorites.length} favorites.`);
      if (favorites.length === 0) return { favorites: [], genres: [] };

      const detailPromises = favorites.map((item) =>
        axios
          .get(`https://api.themoviedb.org/3/${item.mediaType}/${item.mediaId}`, { params: { api_key: apiKey } })
          .catch((e) => {
            console.warn(`Failed TMDB details for ${item.mediaType}/${item.mediaId}:`, e.message);
            return null;
          })
      );
      const detailResults = await Promise.all(detailPromises);
      const allGenreIds = detailResults.filter(Boolean).flatMap((res) => res.data?.genres?.map((g) => g.id) || []);
      const genreCount = allGenreIds.reduce((acc, g) => {
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      }, {});
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => parseInt(id, 10));

      logMessage('Derived top genres from favorites:', topGenres);
      return { favorites, genres: topGenres };
    } catch (error) {
      logError('Error fetching user favorites or deriving genres', error);
      return { favorites: [], genres: [] };
    }
  }, []);

  // --- Core Recommendation Fetch Logic ---
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      const currentUserId = currentUser?.attributes?.sub;
      const currentToken = currentUser?.signInUserSession?.accessToken?.jwtToken;

      if (!initialAppLoadComplete) {
        logMessage('Fetch skipped: Initial app load not complete.');
        return false;
      }
      if (!isAuthenticated || !currentUserId || !currentToken) {
        logMessage('Fetch skipped: Not authenticated or missing user details.', {
          isAuthenticated,
          hasUser: !!currentUserId,
          hasToken: !!currentToken,
        });
        safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
        return false;
      }
      if (isFetchingRef.current) {
        logMessage('Fetch skipped: Another fetch is already in progress.');
        return false;
      }
      if (!propHasCompletedQuestionnaire) {
        logMessage('Fetch skipped: Questionnaire not complete.');
        return false;
      }

      logMessage(`Fetch recommendations initiated. Force refresh: ${forceRefresh}`);
      isFetchingRef.current = true;
      dataLoadAttemptedRef.current = true;
      retryCountRef.current = 0;

      safeSetState({
        isRefreshing: forceRefresh,
        isThinking: true,
        hasError: false,
        errorMessage: '',
        isLoading: true, // Always show loading during fetch
        ...(forceRefresh && { shownItemsHistory: new Set() }),
      });

      await new Promise((resolve) => setTimeout(resolve, forceRefresh ? 300 : 100));
      if (!mountedRef.current) {
        isFetchingRef.current = false;
        return false;
      }

      let fetchedRecs = [];
      let finalDataSource = 'none';
      let finalReason = '';
      let fetchSuccessful = false;

      try {
        const effectivePreferences = propUserPreferences;
        const { favorites: currentFavorites, genres: derivedFavoriteGenres } = await fetchUserFavoritesAndGenres(
          currentToken
        );
        const favoriteIds = new Set(currentFavorites.map((fav) => fav.mediaId?.toString()));

        const hasValidPreferences =
          !!effectivePreferences &&
          Object.keys(effectivePreferences).length > 0 &&
          (effectivePreferences.favoriteGenres?.length > 0 || effectivePreferences.contentType);
        const hasFavorites = currentFavorites.length > 0;
        const canPersonalize = hasValidPreferences || hasFavorites;

        logMessage('Personalization check:', {
          canPersonalize,
          hasValidPreferences,
          hasFavorites,
          favCount: currentFavorites.length,
          derivedGenres: derivedFavoriteGenres,
        });

        if (canPersonalize) {
          const apiKey = process.env.REACT_APP_TMDB_API_KEY;
          if (!apiKey) throw new Error('TMDB API Key missing!');

          let mediaType = 'movie';
          if (effectivePreferences?.contentType === 'tv') mediaType = 'tv';
          else if (effectivePreferences?.contentType === 'both') mediaType = Math.random() < 0.6 ? 'movie' : 'tv';

          let genresToUse = [];
          if (hasValidPreferences && effectivePreferences.favoriteGenres?.length > 0) {
            genresToUse = effectivePreferences.favoriteGenres;
          } else if (derivedFavoriteGenres.length > 0) {
            genresToUse = derivedFavoriteGenres;
          }

          const params = {
            api_key: apiKey,
            sort_by: 'popularity.desc',
            page: Math.floor(Math.random() * 3) + 1,
            'vote_count.gte': 100,
            'vote_average.gte': 6.0,
            include_adult: false,
            language: 'en-US',
          };
          if (genresToUse.length > 0) params.with_genres = genresToUse.join(',');

          const hasSpecificFilters = !!params.with_genres;
          logMessage(`TMDB Discover params for ${mediaType}:`, params);

          if (hasSpecificFilters) {
            const discoverUrl = `https://api.themoviedb.org/3/discover/${mediaType}`;
            const response = await axios.get(discoverUrl, { params });
            if (response.data?.results?.length > 0) {
              fetchedRecs = response.data.results
                .filter(
                  (item) =>
                    item.poster_path &&
                    item.overview &&
                    !favoriteIds.has(item.id?.toString()) &&
                    !shownItemsHistory.has(item.id)
                )
                .map((item) => ({
                  ...item,
                  media_type: mediaType,
                  score: Math.round((item.vote_average / 10) * 100),
                }))
                .slice(0, MAX_RECOMMENDATION_COUNT);

              if (fetchedRecs.length > 0) {
                finalDataSource = hasValidPreferences && hasFavorites ? 'both' : hasValidPreferences ? 'preferences' : 'favorites';
                finalReason =
                  finalDataSource === 'both'
                    ? 'Based on your preferences & favorites'
                    : finalDataSource === 'preferences'
                    ? 'Based on your questionnaire'
                    : 'Because you liked similar items';
                fetchSuccessful = true;
                logMessage(`Personalized fetch successful (${finalDataSource}): ${fetchedRecs.length} items.`);
              } else {
                logMessage('Personalized fetch returned 0 valid results.');
              }
            }
          } else {
            logMessage('Skipping TMDB Discover: Insufficient specific filters.');
          }
        }

        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          logMessage(`Need more recommendations (${fetchedRecs.length}/${MIN_RECOMMENDATION_COUNT}). Fetching supplementary.`);
          const existingIds = new Set([...fetchedRecs.map((r) => r.id), ...favoriteIds]);
          const supplementary = await fetchSupplementaryRecommendations(fetchedRecs.length, existingIds);

          if (supplementary.length > 0) {
            fetchedRecs = [...fetchedRecs, ...supplementary].slice(0, MAX_RECOMMENDATION_COUNT);
            if (!fetchSuccessful) {
              finalDataSource = fetchedRecs.length === supplementary.length ? 'supplementary' : 'both_supp';
              finalReason = finalDataSource === 'supplementary' ? 'Popular movies you might like' : 'Based on your profile & popular items';
            }
            fetchSuccessful = true;
            logMessage(`Combined recommendations count: ${fetchedRecs.length}. Source: ${finalDataSource}`);
          }
        }

        if (fetchedRecs.length === 0) {
          logMessage('No personalized or supplementary results. Falling back to generic.');
          const genericRecs = await fetchGenericRecommendations(favoriteIds);
          if (genericRecs.length > 0) {
            fetchedRecs = genericRecs;
            finalDataSource = 'generic';
            finalReason = 'Popular This Week';
            fetchSuccessful = true;
          } else {
            logMessage('Generic fallback also returned no results.');
          }
        }

        if (fetchSuccessful && fetchedRecs.length > 0) {
          logMessage(`SUCCESS: Found ${fetchedRecs.length} recommendations. Final Source: ${finalDataSource}`);
          saveRecommendationsToCache(fetchedRecs, currentUserId, finalDataSource, finalReason);
          safeSetState({
            recommendations: fetchedRecs,
            dataSource: finalDataSource,
            recommendationReason: finalReason,
            hasError: false,
            errorMessage: '',
          });
        } else {
          logMessage('FAILURE: No recommendations found after all attempts.');
          safeSetState({
            recommendations: [],
            dataSource: 'none',
            recommendationReason: 'Could not find recommendations right now.',
            hasError: false,
          });
        }
      } catch (error) {
        logError('CRITICAL ERROR during recommendation fetch process', error);
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          logMessage(`Retrying fetch (${retryCountRef.current}/${MAX_RETRIES})...`);
          isFetchingRef.current = false;
          setTimeout(() => {
            if (mountedRef.current) fetchRecommendations(forceRefresh);
          }, RETRY_DELAY);
          return false;
        }
        safeSetState({
          recommendations: [],
          dataSource: 'error',
          recommendationReason: 'An error occurred while fetching recommendations.',
          hasError: true,
          errorMessage: `Error: ${error.message || 'Unknown error'}`,
        });
        fetchSuccessful = false;
      } finally {
        if (!mountedRef.current || (retryCountRef.current > 0 && retryCountRef.current <= MAX_RETRIES)) {
          // Skip reset if retrying or unmounted
        } else {
          setTimeout(() => {
            if (mountedRef.current) {
              safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
              isFetchingRef.current = false;
              logMessage('Fetch process complete. States reset.');
              sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true');
            }
          }, 150);
        }
      }
      return fetchSuccessful;
    },
    [
      currentUser,
      isAuthenticated,
      propHasCompletedQuestionnaire,
      initialAppLoadComplete,
      propUserPreferences,
      recommendations.length,
      shownItemsHistory,
      fetchUserFavoritesAndGenres,
      fetchSupplementaryRecommendations,
      fetchGenericRecommendations,
      saveRecommendationsToCache,
      safeSetState,
    ]
  );

  // --- Manual Refresh Handler ---
  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) {
      logMessage('Refresh skipped: Already fetching.');
      return;
    }
    if (!userId || !isAuthenticated || !propHasCompletedQuestionnaire) {
      logMessage('Refresh skipped: Conditions not met.', {
        userId,
        isAuthenticated,
        propHasCompletedQuestionnaire,
      });
      return;
    }

    logMessage('Manual refresh triggered.');
    const currentCacheKey = getCacheKey(userId);
    if (currentCacheKey) {
      localStorage.removeItem(currentCacheKey);
      logMessage('Cleared cache for refresh.');
    }
    sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);

    dataLoadAttemptedRef.current = false;
    safeSetState((prev) => ({ refreshCounter: prev.refreshCounter + 1 }));
    await fetchRecommendations(true);
  }, [userId, isAuthenticated, propHasCompletedQuestionnaire, fetchRecommendations, safeSetState]);

  // --- Effect: Initial Load with Cache or Fetch ---
  useEffect(() => {
    if (!isAuthenticated || !userId || !initialAppLoadComplete || !propHasCompletedQuestionnaire || cacheChecked) return;

    logMessage(`Initial Load Check for user ${userId}.`);
    const cached = getRecommendationsFromCache(userId);

    if (cached) {
      logMessage(`Cache HIT for user ${userId}. Applying cached data.`);
      safeSetState({
        recommendations: cached.data,
        dataSource: cached.dataSource,
        recommendationReason: cached.reason || '',
        cacheChecked: true,
        isLoading: false,
        isThinking: false,
      });
      dataLoadAttemptedRef.current = true;
      sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true');
    } else {
      logMessage(`Cache MISS for user ${userId}. Triggering fetch.`);
      safeSetState({ cacheChecked: true, isLoading: true, isThinking: true });
      fetchRecommendations(false);
    }
  }, [userId, isAuthenticated, initialAppLoadComplete, propHasCompletedQuestionnaire, cacheChecked, fetchRecommendations, safeSetState]);

  // --- Effect: Preference Changes ---
  useEffect(() => {
    if (!initialAppLoadComplete || !propHasCompletedQuestionnaire) return;

    const currentPrefsString = JSON.stringify(propUserPreferences || null);
    if (prevPreferencesRef.current !== null && prevPreferencesRef.current !== currentPrefsString) {
      logMessage('Preferences changed. Triggering fetch with loading.');
      safeSetState({ isLoading: true, isThinking: true });
      handleRefresh();
    }
    prevPreferencesRef.current = currentPrefsString;
  }, [propUserPreferences, initialAppLoadComplete, propHasCompletedQuestionnaire, handleRefresh, safeSetState]);

  // --- Imperative Handle ---
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
    getCurrentState: () => ({
      ...state,
      isFetching: isFetchingRef.current,
      dataLoadAttempted: dataLoadAttemptedRef.current,
    }),
  }), [handleRefresh, state]);

  // --- Render Logic ---
  if (!isAuthenticated || !propHasCompletedQuestionnaire || !initialAppLoadComplete) {
    logMessage('Render: Null (Not authenticated, questionnaire incomplete, or app not loaded)');
    return null;
  }

  let content;
  const showLoadingSkeleton = isLoading;
  const showRecommendationsGrid = !isLoading && recommendations.length > 0;
  const showErrorState = !isLoading && hasError;
  const showEmptyState = !isLoading && !hasError && dataLoadAttemptedRef.current && recommendations.length === 0;

  if (showLoadingSkeleton) {
    content = (
      <motion.div key={`loading-${refreshCounter}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(MAX_RECOMMENDATION_COUNT)].map((_, i) => (
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
  } else if (showRecommendationsGrid) {
    content = (
      <motion.div
        key={`recommendations-${refreshCounter}-${dataSource}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: isRefreshing ? 0.1 : 0.2 } },
          exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } },
        }}
      >
        {recommendations.map((item) => (
          <motion.div
            key={item.id}
            layout
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.95 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
              exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
            }}
          >
            <MediaCard result={item} currentUser={currentUser} />
          </motion.div>
        ))}
      </motion.div>
    );
  } else if (showErrorState) {
    content = (
      <motion.div
        key="error-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-red-700"
      >
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mb-4 text-5xl text-red-400">
          ⚠️
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-3">Something went wrong</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-6">{errorMessage || "We couldn't load recommendations."}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking || isLoading}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full transition-colors ${
            isThinking || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {(isThinking || isLoading) ? 'Trying...' : 'Try Again'}
        </motion.button>
      </motion.div>
    );
  } else if (showEmptyState) {
    content = (
      <motion.div
        key="empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-gray-700"
      >
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mb-4 text-5xl text-indigo-400">
          🤷‍♂️
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-3">No Recommendations Found</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-6">
          {recommendationReason || 'We couldn’t find anything matching your profile right now. Try refreshing.'}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking || isLoading}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full transition-colors ${
            isThinking || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {(isThinking || isLoading) ? 'Loading...' : 'Try Refreshing'}
        </motion.button>
      </motion.div>
    );
  } else {
    content = <div key="empty-fallback" className="min-h-[200px]"></div>;
  }

  let title = 'Recommendations';
  if (isLoading) title = 'Loading Recommendations...';
  else if (isRefreshing) title = 'Refreshing...';
  else if (dataSource === 'error') title = 'Error Loading';
  else if (dataSource === 'both') title = 'For You (Preferences & Favorites)';
  else if (dataSource === 'preferences') title = 'Based on Your Preferences';
  else if (dataSource === 'favorites') title = 'Because You Liked';
  else if (dataSource === 'generic') title = 'Popular This Week';
  else if (dataSource === 'supplementary' || dataSource === 'both_supp') title = 'Popular Movies';

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-12 max-w-7xl mx-auto px-4"
      aria-labelledby="recommendations-heading"
    >
      <div className="flex justify-between items-center mb-4 min-h-[36px]">
        <h2 id="recommendations-heading" className="text-2xl font-bold text-white flex items-center space-x-2 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={`heading-${title}-${refreshCounter}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="block"
            >
              {title}
            </motion.span>
          </AnimatePresence>
        </h2>
        {!hasError && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isLoading || isThinking}
            aria-label="Refresh recommendations"
            className={`flex items-center space-x-1.5 text-sm font-medium ${
              isLoading || isThinking
                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } px-3 py-1.5 rounded-full transition-all duration-200 shadow-md`}
          >
            <motion.div
              animate={isLoading || isThinking ? { rotate: 360 } : { rotate: 0 }}
              transition={isLoading || isThinking ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.3 }}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </motion.div>
            <span>{isLoading || isThinking ? 'Loading...' : 'Refresh'}</span>
          </motion.button>
        )}
      </div>

      {!isLoading && !hasError && recommendationReason && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 text-gray-300 text-sm flex items-center"
        >
          <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-1.5 flex-shrink-0" />
          <span>{recommendationReason}</span>
        </motion.div>
      )}

      {hasError && dataSource === 'error' && recommendationReason && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center bg-red-900/50 border border-red-700 rounded-lg p-2 mb-4 text-sm text-red-200"
        >
          <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
          <span>{recommendationReason}</span>
        </motion.div>
      )}

      {DEBUG_LOGGING && (
        <div className="mb-3 p-2 bg-gray-900 border border-gray-700 rounded-md text-xs text-gray-400 font-mono space-y-1">
          <p>
            State: Load={isLoading ? 'T' : 'F'} Think={isThinking ? 'T' : 'F'} Refresh={isRefreshing ? 'T' : 'F'} Err={
              hasError ? 'T' : 'F'
            }{' '}
            CacheChk={cacheChecked ? 'T' : 'F'} Src={dataSource || 'null'} Recs={recommendations.length}
          </p>
          <p>
            Refs: Fetching={isFetchingRef.current ? 'T' : 'F'} DataLoadAttempted={dataLoadAttemptedRef.current ? 'T' : 'F'}
          </p>
          <p>
            Props: Auth={isAuthenticated ? 'T' : 'F'} User={userId ? 'Yes' : 'No'} QuestComplete={
              propHasCompletedQuestionnaire ? 'T' : 'F'
            }{' '}
            AppLoad={initialAppLoadComplete ? 'T' : 'F'}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;