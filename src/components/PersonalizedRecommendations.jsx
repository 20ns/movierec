// src/components/PersonalizedRecommendations.jsx

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { ArrowPathIcon, LightBulbIcon, ExclamationCircleIcon, FilmIcon, TvIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

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

const getCacheKey = (userId, contentType) => userId ? `${RECOMMENDATIONS_CACHE_KEY_PREFIX}${userId}_${contentType}` : null;

const getRecommendationsFromCache = (userId, contentType) => {
  const cacheKey = getCacheKey(userId, contentType);
  if (!cacheKey) return null;

  try {
    const cachedString = localStorage.getItem(cacheKey);
    if (!cachedString) return null;

    const parsed = JSON.parse(cachedString);
    const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRATION_TIME;

    if (isExpired) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    if (Array.isArray(parsed.data) && parsed.data.length > 0 && parsed.dataSource) {
      return parsed;
    } else {
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (e) {
    logError(`Error reading cache for ${cacheKey}`, e);
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
    contentTypeFilter: 'both',
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
    contentTypeFilter,
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
      console.log('[PersonalRecs] User ID changed, resetting component state');
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
        contentTypeFilter: 'both',
      });
      isFetchingRef.current = false;
      dataLoadAttemptedRef.current = false;
      retryCountRef.current = 0;
      prevPreferencesRef.current = null;
      
      // Adding a small delay to avoid UI jank and unnecessary state flaps
      setTimeout(() => {
        prevUserIdRef.current = currentUserId;
      }, 100);
    }
  }, [currentUser, safeSetState]);

  // --- Cache Management ---
  const saveRecommendationsToCache = useCallback((data, currentUserId, currentDataSource, currentReason, currentContentType) => {
    if (!currentUserId || !data.length) return;

    const cacheKey = getCacheKey(currentUserId, currentContentType);
    if (!cacheKey) return;

    try {
      const cache = {
        timestamp: Date.now(),
        data,
        dataSource: currentDataSource,
        reason: currentReason,
      };
      localStorage.setItem(cacheKey, JSON.stringify(cache));
      sessionStorage.setItem(SESSION_RECS_LOADED_FLAG, 'true');
    } catch (e) {
      logError('Error saving to cache', e);
      localStorage.removeItem(cacheKey);
    }
  }, []);

  // --- Data Fetching Utilities ---
  const fetchGenericRecommendations = useCallback(async (excludeIds = new Set(), contentType = 'both') => {
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) return [];

    let url;
    if (contentType === 'movies') url = 'https://api.themoviedb.org/3/movie/popular';
    else if (contentType === 'tv') url = 'https://api.themoviedb.org/3/tv/popular';
    else url = 'https://api.themoviedb.org/3/trending/all/week';

    try {
      const response = await axios.get(url, {
        params: { api_key: apiKey, page: Math.floor(Math.random() * 5) + 1 },
      });

      let items = response.data.results
        .filter((item) => item.poster_path && item.overview && !excludeIds.has(item.id))
        .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

      if (contentType === 'both') {
        items = items.filter((item) => item.media_type === 'movie' || item.media_type === 'tv');
      } else {
        items = items.map((item) => ({ ...item, media_type: contentType }));
      }

      return items.slice(0, MAX_RECOMMENDATION_COUNT);
    } catch (error) {
      logError('Error fetching generic recommendations', error);
      return [];
    }
  }, []);

  const fetchSupplementaryRecommendations = useCallback(async (currentCount, existingIds = new Set(), contentType = 'both') => {
    const neededCount = Math.max(0, MIN_RECOMMENDATION_COUNT - currentCount);
    if (neededCount <= 0) return [];

    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) return [];

    let url;
    if (contentType === 'movies') url = 'https://api.themoviedb.org/3/movie/top_rated';
    else if (contentType === 'tv') url = 'https://api.themoviedb.org/3/tv/top_rated';
    else url = 'https://api.themoviedb.org/3/trending/all/week';

    try {
      const response = await axios.get(url, { params: { api_key: apiKey, page: Math.floor(Math.random() * 2) + 1 } });

      let items = response.data.results
        .filter((item) => item.poster_path && item.overview && !existingIds.has(item.id))
        .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

      if (contentType === 'both') {
        items = items.filter((item) => item.media_type === 'movie' || item.media_type === 'tv');
      } else {
        items = items.map((item) => ({ ...item, media_type: contentType }));
      }

      return items.slice(0, neededCount);
    } catch (error) {
      logError('Error fetching supplementary recommendations', error);
      return [];
    }
  }, []);

  const fetchUserFavoritesAndGenres = useCallback(async (token) => {
    if (!token) return { favorites: [], genres: [], contentTypeRatio: { movies: 0.5, tv: 0.5 } };

    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) return { favorites: [], genres: [], contentTypeRatio: { movies: 0.5, tv: 0.5 } };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Favorites fetch failed');
      const favData = await response.json();
      const favorites = favData?.items || [];

      if (favorites.length === 0) return { favorites: [], genres: [], contentTypeRatio: { movies: 0.5, tv: 0.5 } };

      const detailPromises = favorites.map((item) =>
        axios.get(`https://api.themoviedb.org/3/${item.mediaType}/${item.mediaId}`, { params: { api_key: apiKey } })
          .catch(() => null)
      );
      const detailResults = (await Promise.all(detailPromises)).filter(Boolean);
      const genres = detailResults.flatMap((res) => res.data?.genres?.map((g) => g.id) || []);
      const genreCount = genres.reduce((acc, g) => ({ ...acc, [g]: (acc[g] || 0) + 1 }), {});
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => parseInt(id, 10));

      const movieCount = favorites.filter((f) => f.mediaType === 'movie').length;
      const tvCount = favorites.filter((f) => f.mediaType === 'tv').length;
      const total = movieCount + tvCount || 1;
      const contentTypeRatio = {
        movies: movieCount / total,
        tv: tvCount / total,
      };

      return { favorites, genres: topGenres, contentTypeRatio };
    } catch (error) {
      logError('Error fetching favorites', error);
      return { favorites: [], genres: [], contentTypeRatio: { movies: 0.5, tv: 0.5 } };
    }
  }, []);

  // --- Helper Function to Map Content Type to API Media Type ---
  const getApiMediaType = (type) => {
    if (type === 'movies') return 'movie';
    if (type === 'tv') return 'tv';
    return 'movie'; // Default to movie if invalid
  };

  // --- Core Recommendation Fetch Logic ---
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      // Modified to not depend on questionnaire completion
      if (!isAuthenticated || !userId || !initialAppLoadComplete || isFetchingRef.current) {
        safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
        return false;
      }

      // Continue with rest of function
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

      let fetchedRecs = [];
      let finalDataSource = 'none';
      let finalReason = '';
      let fetchSuccessful = false;

      try {
        const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
        const prefs = propUserPreferences || {};
        const { favorites, genres: favGenres, contentTypeRatio } = await fetchUserFavoritesAndGenres(token);
        const favoriteIds = new Set(favorites.map((fav) => fav.mediaId?.toString()));
        const hasPrefs = prefs.favoriteGenres?.length > 0;
        const hasFavs = favorites.length > 0;

        if (hasPrefs || hasFavs) {
          const apiKey = process.env.REACT_APP_TMDB_API_KEY;
          if (!apiKey) throw new Error('TMDB API Key missing');

          // Set mediaType correctly using the helper function
          let mediaType;
          if (contentTypeFilter !== 'both') {
            mediaType = getApiMediaType(contentTypeFilter);
          } else if (hasPrefs && prefs.contentType !== 'both') {
            mediaType = getApiMediaType(prefs.contentType);
          } else {
            mediaType = Math.random() < contentTypeRatio.movies ? 'movie' : 'tv';
          }

          const genresToUse = [];
          if (hasPrefs && prefs.favoriteGenres?.length > 0) {
            prefs.favoriteGenres.forEach((g) => genresToUse.push({ id: g, weight: favGenres.includes(g) ? 2 : 1 }));
          } else if (favGenres.length > 0) {
            favGenres.forEach((g) => genresToUse.push({ id: g, weight: 1 }));
          }

          const params = {
            api_key: apiKey,
            sort_by: 'popularity.desc',
            page: Math.floor(Math.random() * 3) + 1,
            'vote_count.gte': 100,
            'vote_average.gte': 6.0,
            include_adult: false,
          };

          if (genresToUse.length > 0) params.with_genres = genresToUse.map((g) => g.id).join(',');

          if (prefs.moodPreferences?.length > 0) {
            const keywords = prefs.moodPreferences.flatMap((m) => moodToKeywords(m));
            if (keywords.length > 0) params.with_keywords = keywords.join(',');
          }

          if (prefs.eraPreferences?.length > 0) {
            const era = prefs.eraPreferences[0];
            if (era === 'classic') params[`${mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'}.lte`] = '1980-01-01';
            else if (era === 'modern') {
              params[`${mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'}.gte`] = '1980-01-01';
              params[`${mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'}.lte`] = '2010-01-01';
            } else if (era === 'recent') params[`${mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'}.gte`] = '2010-01-01';
          }

          if (prefs.languagePreferences?.length > 0 && !prefs.languagePreferences.includes('any')) {
            params.with_original_language = prefs.languagePreferences.join(',');
          }

          if (mediaType === 'movie' && prefs.runtimePreference && prefs.runtimePreference !== 'any') {
            if (prefs.runtimePreference === 'short') params.with_runtime_lte = 90;
            else if (prefs.runtimePreference === 'medium') {
              params.with_runtime_gte = 90;
              params.with_runtime_lte = 120;
            } else if (prefs.runtimePreference === 'long') params.with_runtime_gte = 120;
          }

          const url = `https://api.themoviedb.org/3/discover/${mediaType}`;
          const response = await axios.get(url, { params });

          if (response.data?.results?.length > 0) {
            fetchedRecs = response.data.results
              .filter((item) => item.poster_path && item.overview && !favoriteIds.has(item.id?.toString()) && !shownItemsHistory.has(item.id))
              .map((item) => ({
                ...item,
                media_type: mediaType,
                score: calculateSimilarity(item, genresToUse, prefs.moodPreferences),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, MAX_RECOMMENDATION_COUNT);

            if (fetchedRecs.length > 0) {
              finalDataSource = hasPrefs && hasFavs ? 'both' : hasPrefs ? 'preferences' : 'favorites';
              finalReason = finalDataSource === 'both' ? 'Based on your preferences & favorites' : hasPrefs ? 'Based on your taste' : 'Inspired by your favorites';
              fetchSuccessful = true;
            }
          }
        }

        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          const existingIds = new Set([...fetchedRecs.map((r) => r.id), ...favoriteIds]);
          const supplementary = await fetchSupplementaryRecommendations(fetchedRecs.length, existingIds, contentTypeFilter);
          fetchedRecs = [...fetchedRecs, ...supplementary].slice(0, MAX_RECOMMENDATION_COUNT);
          if (!fetchSuccessful && supplementary.length > 0) {
            finalDataSource = fetchedRecs.length === supplementary.length ? 'supplementary' : 'mixed';
            finalReason = 'Popular picks for you';
            fetchSuccessful = true;
          }
        }

        if (fetchedRecs.length === 0) {
          const genericRecs = await fetchGenericRecommendations(favoriteIds, contentTypeFilter);
          if (genericRecs.length > 0) {
            fetchedRecs = genericRecs;
            finalDataSource = 'generic';
            finalReason = 'Trending now';
            fetchSuccessful = true;
          }
        }

        if (fetchSuccessful) {
          saveRecommendationsToCache(fetchedRecs, userId, finalDataSource, finalReason, contentTypeFilter);
          safeSetState({
            recommendations: fetchedRecs,
            dataSource: finalDataSource,
            recommendationReason: finalReason,
            hasError: false,
            errorMessage: '',
            shownItemsHistory: new Set([...shownItemsHistory, ...fetchedRecs.map((r) => r.id)].slice(-SHOWN_ITEMS_LIMIT)),
          });
        } else {
          safeSetState({
            recommendations: [],
            dataSource: 'none',
            recommendationReason: 'No recommendations found.',
            hasError: false,
          });
        }
      } catch (error) {
        logError('Fetch error', error);
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          isFetchingRef.current = false;
          setTimeout(() => fetchRecommendations(forceRefresh), RETRY_DELAY);
          return false;
        }
        safeSetState({
          recommendations: [],
          dataSource: 'error',
          recommendationReason: 'Error fetching recommendations.',
          hasError: true,
          errorMessage: error.message,
        });
      } finally {
        if (mountedRef.current && retryCountRef.current <= MAX_RETRIES) {
          safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
          isFetchingRef.current = false;
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
      contentTypeFilter,
      shownItemsHistory,
      fetchUserFavoritesAndGenres,
      fetchSupplementaryRecommendations,
      fetchGenericRecommendations,
      saveRecommendationsToCache,
      safeSetState,
    ]
  );

  // --- Similarity Scoring ---
  const calculateSimilarity = (item, genresToUse, moodPrefs) => {
    let score = item.vote_average * 10; // Base score from rating
    if (genresToUse.length > 0) {
      const itemGenres = item.genre_ids || [];
      genresToUse.forEach((g) => {
        if (itemGenres.includes(g.id)) score += 20 * g.weight;
      });
    }
    if (moodPrefs?.length > 0) {
      const keywords = moodPrefs.flatMap((m) => moodToKeywords(m));
      if (keywords.some((k) => item.overview?.toLowerCase().includes(k))) score += 15;
    }
    return Math.min(score, 100);
  };

  // --- Mood to Keywords Mapping ---
  const moodToKeywords = (mood) => {
    const map = {
      'exciting': ['action', 'thrilling', 'intense'],
      'thoughtful': ['drama', 'deep', 'reflective'],
      'funny': ['comedy', 'hilarious', 'light'],
      'scary': ['horror', 'terrifying', 'spooky'],
      'emotional': ['drama', 'touching', 'heartfelt'],
    };
    return map[mood] || [];
  };

  // --- Manual Refresh Handler ---
  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current || !userId || !isAuthenticated || !propHasCompletedQuestionnaire) return;

    const cacheKey = getCacheKey(userId, contentTypeFilter);
    if (cacheKey) localStorage.removeItem(cacheKey);
    sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);

    dataLoadAttemptedRef.current = false;
    safeSetState((prev) => ({ refreshCounter: prev.refreshCounter + 1 }));
    await fetchRecommendations(true);
  }, [userId, isAuthenticated, propHasCompletedQuestionnaire, contentTypeFilter, fetchRecommendations, safeSetState]);

  // --- Initial Load and Preference Changes ---
  useEffect(() => {
    // Simplified check to allow rendering even without completed questionnaire
    if (!isAuthenticated || !userId || !initialAppLoadComplete) return;

    console.log('[PersonalRecs] Checking for cached recommendations', { 
      isAuthenticated, 
      userId, 
      initialAppLoadComplete, 
      propHasCompletedQuestionnaire, 
      cacheChecked 
    });

    const cached = getRecommendationsFromCache(userId, contentTypeFilter);
    if (cached) {
      safeSetState({
        recommendations: cached.data,
        dataSource: cached.dataSource,
        recommendationReason: cached.reason || '',
        cacheChecked: true,
        isLoading: false,
        isThinking: false,
      });
      dataLoadAttemptedRef.current = true;
    } else {
      safeSetState({ cacheChecked: true, isLoading: true, isThinking: true });
      fetchRecommendations(false);
    }
  }, [userId, isAuthenticated, initialAppLoadComplete, contentTypeFilter, cacheChecked, fetchRecommendations, safeSetState, propHasCompletedQuestionnaire]);

  useEffect(() => {
    if (!initialAppLoadComplete || !propHasCompletedQuestionnaire) return;

    const currentPrefs = JSON.stringify(propUserPreferences || null);
    if (prevPreferencesRef.current && prevPreferencesRef.current !== currentPrefs) {
      safeSetState({ isLoading: true, isThinking: true });
      handleRefresh();
    }
    prevPreferencesRef.current = currentPrefs;
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
  // IMPORTANT FIX: Only require authentication, not questionnaire completion
  if (!isAuthenticated || !initialAppLoadComplete) {
    console.log('[PersonalRecs] Not rendering due to:', { 
      isAuthenticated, 
      initialAppLoadComplete,
      userId: currentUser?.attributes?.sub || null
    });
    return null;
  }

  const showLoading = isLoading;
  const showRecs = !isLoading && recommendations.length > 0;
  const showError = !isLoading && hasError;
  const showEmpty = !isLoading && !hasError && dataLoadAttemptedRef.current && recommendations.length === 0;

  let content;
  if (showLoading) {
    content = (
      <motion.div key={`loading-${refreshCounter}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        key={`recommendations-${refreshCounter}-${dataSource}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
        }}
      >
        {recommendations.map((item) => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            <MediaCard result={item} currentUser={currentUser} />
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
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-red-700"
      >
        <div className="mb-4 text-5xl text-red-400">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-3">Something went wrong</h3>
        <p className="text-gray-400 mb-6">{errorMessage || "We couldn't load recommendations."}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isThinking || isLoading}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {(isThinking || isLoading) ? 'Trying...' : 'Try Again'}
        </motion.button>
      </motion.div>
    );
  } else if (showEmpty) {
    content = (
      <motion.div
        key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 bg-gray-800/50 rounded-xl p-8 border border-gray-700"
      >
        <div className="mb-4 text-5xl text-indigo-400">🤷‍♂️</div>
        <h3 className="text-xl font-semibold text-white mb-3">No Recommendations Found</h3>
        <p className="text-gray-400 mb-6">{recommendationReason}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full"
        >
          Try Refreshing
        </motion.button>
      </motion.div>
    );
  } else {
    content = <div key="fallback" className="min-h-[200px]"></div>;
  }

  let title = "Recommendations";
  if (isThinking && recommendations.length === 0) title = "Finding Recommendations...";
  else if (isLoading) title = "Loading Recommendations...";
  else if (isRefreshing) title = "Refreshing...";
  else if (dataSource === 'error') title = "Error Loading";
  else if (dataSource === 'both') title = 'For You';
  else if (dataSource === 'preferences') title = 'Based on Your Taste';
  else if (dataSource === 'favorites') title = 'Inspired by Your Favorites';
  else if (dataSource === 'generic') title = 'Trending Now';
  else if (dataSource === 'supplementary' || dataSource === 'mixed') title = 'Popular Picks';

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-12 max-w-7xl mx-auto px-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => safeSetState({ contentTypeFilter: 'both' })}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${contentTypeFilter === 'both' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <VideoCameraIcon className="h-4 w-4" />
            <span>Both</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => safeSetState({ contentTypeFilter: 'movies' })}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${contentTypeFilter === 'movies' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <FilmIcon className="h-4 w-4" />
            <span>Movies</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => safeSetState({ contentTypeFilter: 'tv' })}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${contentTypeFilter === 'tv' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <TvIcon className="h-4 w-4" />
            <span>TV Shows</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isThinking || isLoading}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${isThinking || isLoading ? 'bg-gray-600 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            <motion.div
              animate={isThinking || isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={isThinking || isLoading ? { repeat: Infinity, duration: 1 } : { duration: 0.3 }}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </motion.div>
            <span>{isThinking || isLoading ? 'Loading...' : 'Refresh'}</span>
          </motion.button>
        </div>
      </div>

      {!isLoading && !hasError && recommendationReason && recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 text-gray-300 text-sm flex items-center">
          <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-1.5" />
          <span>{recommendationReason}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </motion.section>
  );
});

PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;