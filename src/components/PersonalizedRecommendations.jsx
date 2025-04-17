// src/components/PersonalizedRecommendations.jsx

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import MediaCard from './MediaCard';
import { ArrowPathIcon, LightBulbIcon, ExclamationCircleIcon, FilmIcon, TvIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { fetchCachedMedia, shouldRefreshCache } from '../services/mediaCache';

// --- Constants ---
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const RECOMMENDATIONS_CACHE_KEY_PREFIX = 'movieRec_recommendations_';
const SESSION_RECS_LOADED_FLAG = 'movieRec_session_loaded';
const MIN_RECOMMENDATION_COUNT = 3;
const MAX_RECOMMENDATION_COUNT = 3;
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
      
      // If this is a new login (not initial load), add a delay before setting userId
      // to ensure AWS auth tokens are fully available
      const delay = prevUserIdRef.current === null ? 100 : 2000;
      console.log(`[PersonalRecs] Delaying user ID update by ${delay}ms to ensure auth is complete`);
      
      setTimeout(() => {
        prevUserIdRef.current = currentUserId;
        // If delay was for authentication, trigger a cache check
        if (delay > 100) {
          safeSetState({ cacheChecked: false });
        }
      }, delay);
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
      if (!isAuthenticated || !userId || !initialAppLoadComplete || isFetchingRef.current) {
        safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
        return false;
      }

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

        // First try fetching from DynamoDB cache if not forcing refresh
        if (!forceRefresh) {
          const cacheResult = await fetchFromDynamoDBCache(contentTypeFilter, favoriteIds, shownItemsHistory);
          if (cacheResult.success) {
            fetchedRecs = cacheResult.recommendations;
            finalDataSource = cacheResult.dataSource;
            finalReason = cacheResult.reason;
            fetchSuccessful = true;
          }
        }

        // If DynamoDB cache didn't have results, proceed with existing TMDB fetching logic
        if (!fetchSuccessful && (hasPrefs || hasFavs)) {
          const apiKey = process.env.REACT_APP_TMDB_API_KEY;
          if (!apiKey) throw new Error('TMDB API Key missing');

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
          let page = 1;
          const maxPages = 5;
          let allItems = [];
          while (allItems.length < MAX_RECOMMENDATION_COUNT && page <= maxPages) {
            const response = await axios.get(url, { params: { ...params, page } });
            const newItems = response.data.results
              .filter((item) => item.poster_path && item.overview && !favoriteIds.has(item.id?.toString()) && !shownItemsHistory.has(item.id))
              .map((item) => ({
                ...item,
                media_type: mediaType,
                score: calculateSimilarity(item, genresToUse, prefs.moodPreferences),
              }));
            allItems = [...allItems, ...newItems];
            page++;
          }
          fetchedRecs = allItems.sort((a, b) => b.score - a.score).slice(0, MAX_RECOMMENDATION_COUNT);

          if (fetchedRecs.length > 0) {
            finalDataSource = hasPrefs && hasFavs ? 'both' : hasPrefs ? 'preferences' : 'favorites';
            finalReason = finalDataSource === 'both' ? 'Based on your preferences & favorites' : hasPrefs ? 'Based on your taste' : 'Inspired by your favorites';
            fetchSuccessful = true;
          }
        }

        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          const existingIds = new Set([...fetchedRecs.map((r) => r.id), ...favoriteIds, ...shownItemsHistory]);
          const supplementary = await fetchSupplementaryRecommendations(fetchedRecs.length, existingIds, contentTypeFilter);
          fetchedRecs = [...fetchedRecs, ...supplementary].slice(0, MAX_RECOMMENDATION_COUNT);
          if (!fetchSuccessful && supplementary.length > 0) {
            finalDataSource = fetchedRecs.length === supplementary.length ? 'supplementary' : 'mixed';
            finalReason = 'Popular picks for you';
            fetchSuccessful = true;
          }
        }

        if (fetchedRecs.length === 0) {
          const genericRecs = await fetchGenericRecommendations(new Set([...favoriteIds, ...shownItemsHistory]), contentTypeFilter);
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
    let score = item.vote_average * 10;
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
    if (isFetchingRef.current || !userId || !isAuthenticated) return;

    safeSetState({
      isLoading: true,
      isThinking: true,
      refreshCounter: state.refreshCounter + 1,
    });

    // Clear cache for this user and content type
    const cacheKey = getCacheKey(userId, contentTypeFilter);
    if (cacheKey) localStorage.removeItem(cacheKey);
    sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);

    dataLoadAttemptedRef.current = false;

    // Small delay to ensure skeleton appears before fetch starts
    setTimeout(async () => {
      await fetchRecommendations(true);
    }, 100);
  }, [userId, isAuthenticated, contentTypeFilter, fetchRecommendations, safeSetState, state.refreshCounter]);
  // --- Initial Load and Preference Changes ---
  useEffect(() => {
    if (!isAuthenticated || !userId || !initialAppLoadComplete) return;

    // Validate authentication token is actually available
    const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
    
    console.log('[PersonalRecs] Checking for cached recommendations', {
      isAuthenticated,
      userId,
      initialAppLoadComplete,
      propHasCompletedQuestionnaire,
      cacheChecked,
      hasToken: !!token,
    });

    // If authenticated but no token yet, wait for token
    if (isAuthenticated && !token) {
      console.log('[PersonalRecs] Auth state is true but token not ready yet, delaying load');
      safeSetState({ 
        isLoading: false, 
        isThinking: false,
      });
      
      // Check again after a short delay
      const tokenCheckTimer = setTimeout(() => {
        safeSetState({ cacheChecked: false });
      }, 1500);
      
      return () => clearTimeout(tokenCheckTimer);
    }

    // Set up loading timeout to prevent infinite loading
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading && mountedRef.current) {
        logMessage('Loading timeout reached, forcing exit from loading state');
        safeSetState({ 
          isLoading: false, 
          isThinking: false, 
          hasError: true, 
          errorMessage: 'Loading recommendations timed out. Please try refreshing.',
          dataSource: 'error'
        });
        isFetchingRef.current = false;
      }
    }, LOADING_TIMEOUT);

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
      // Small delay to ensure AWS auth is fully ready before API calls
      setTimeout(() => {
        if (mountedRef.current) {
          fetchRecommendations(false);
        }
      }, 500);
    }

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [userId, isAuthenticated, initialAppLoadComplete, contentTypeFilter, cacheChecked, fetchRecommendations, safeSetState, propHasCompletedQuestionnaire, isLoading, currentUser]);

  useEffect(() => {
    if (!initialAppLoadComplete || !propHasCompletedQuestionnaire) return;

    const currentPrefs = JSON.stringify(propUserPreferences || null);
    if (prevPreferencesRef.current && prevPreferencesRef.current !== currentPrefs) {
      safeSetState({ isLoading: true, isThinking: true });
      handleRefresh();
    }
    prevPreferencesRef.current = currentPrefs;
  }, [propUserPreferences, initialAppLoadComplete, propHasCompletedQuestionnaire, handleRefresh, safeSetState]);

  // --- DynamoDB Cache Check ---
  const fetchFromDynamoDBCache = useCallback(async (contentTypeFilter, favoriteIds, shownItemsHistory) => {
    logMessage('Attempting to fetch from DynamoDB cache');
    try {
      const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
      if (!token) {
        logMessage('No auth token available for DynamoDB cache fetch');
        return { success: false };
      }

      // Convert contentTypeFilter to the format expected by the Lambda
      const mediaType = contentTypeFilter === 'both' 
        ? 'both' 
        : contentTypeFilter === 'movies' ? 'movie' : 'tv';
      
      // Prepare exclude IDs - combine shown history and favorites
      const excludeIds = [...Array.from(shownItemsHistory || []), ...Array.from(favoriteIds || [])];
      
      // Fetch from DynamoDB cache
      const cacheResult = await fetchCachedMedia({
        mediaType,
        limit: MAX_RECOMMENDATION_COUNT,
        excludeIds,
        token
      });

      if (cacheResult.items && cacheResult.items.length > 0) {
        logMessage(`Successfully fetched ${cacheResult.items.length} items from DynamoDB cache`);
        return {
          success: true,
          recommendations: cacheResult.items.map(item => ({
            ...item,
            score: Math.round((item.vote_average / 10) * 100)
          })),
          dataSource: 'dynamo_cache',
          reason: 'Daily trending content'
        };
      }
      
      logMessage('No results found in DynamoDB cache, will try TMDB API');
      return { success: false };
    } catch (error) {
      logError('Error fetching from DynamoDB cache', error);
      return { success: false };
    }
  }, [currentUser, logMessage]);

  // --- Expose methods for parent components to call ---
  useImperativeHandle(ref, () => ({
    refreshRecommendations: (updatedPrefs = null) => {
      logMessage('Refreshing recommendations from external trigger');

      safeSetState({
        isLoading: true,
        isThinking: true,
        refreshCounter: state.refreshCounter + 1,
      });

      if (userId) {
        const cacheKey = getCacheKey(userId, contentTypeFilter);
        if (cacheKey) localStorage.removeItem(cacheKey);
      }

      if (updatedPrefs) {
        prevPreferencesRef.current = JSON.stringify(updatedPrefs);
      }

      // Small delay to ensure the skeleton shows before heavy fetch operations
      setTimeout(() => {
        handleRefresh();
      }, 50);
    },
  }));

  // --- Render Logic ---
  if (!isAuthenticated || !initialAppLoadComplete) {
    console.log('[PersonalRecs] Not rendering due to:', {
      isAuthenticated,
      initialAppLoadComplete,
      userId: currentUser?.attributes?.sub || null,
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
      <motion.div
        key={`loading-${refreshCounter}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
  } else if (showRecs) {    content = (
      <motion.div
        key={`recommendations-${refreshCounter}-${dataSource}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
      >
        {recommendations.slice(0, MAX_RECOMMENDATION_COUNT).map((item) => (
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
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
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
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
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
  }  let title = "Recommendations";
  if (dataSource === 'error') title = "Error Loading";
  else if (dataSource === 'both') title = 'For You';
  else if (dataSource === 'preferences') title = 'Based on Your Taste';
  else if (dataSource === 'favorites') title = 'Inspired by Your Favorites';
  else if (dataSource === 'generic') title = 'Trending Now';
  else if (dataSource === 'dynamo_cache') title = 'Trending & Popular';
  else if (dataSource === 'supplementary' || dataSource === 'mixed') title = 'Popular Picks';

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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => safeSetState({ contentTypeFilter: 'both' })}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'both' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <VideoCameraIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Both</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => safeSetState({ contentTypeFilter: 'movies' })}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'movies' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <FilmIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Movies</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => safeSetState({ contentTypeFilter: 'tv' })}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'tv' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <TvIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>TV Shows</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isThinking || isLoading}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${isThinking || isLoading ? 'bg-gray-600 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            <motion.div
              animate={isThinking || isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={isThinking || isLoading ? { repeat: Infinity, duration: 1 } : { duration: 0.3 }}
            >
              <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4" />
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