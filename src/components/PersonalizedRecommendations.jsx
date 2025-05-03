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
      prevUserIdRef.current = currentUserId;
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

    const pages = [1, 2];
    const results = [];

    for (const page of pages) {
      if (results.length >= neededCount) break;
      
      let url;
      if (contentType === 'movies') url = 'https://api.themoviedb.org/3/movie/top_rated';
      else if (contentType === 'tv') url = 'https://api.themoviedb.org/3/tv/top_rated';
      else url = 'https://api.themoviedb.org/3/trending/all/week';

      try {
        const response = await axios.get(url, { 
          params: { api_key: apiKey, page: page } 
        });

        let items = response.data.results
          .filter((item) => item.poster_path && item.overview && !existingIds.has(item.id))
          .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

        if (contentType === 'both') {
          items = items.filter((item) => item.media_type === 'movie' || item.media_type === 'tv');
        } else {
          items = items.map((item) => ({ ...item, media_type: contentType === 'movies' ? 'movie' : 'tv' }));
        }

        results.push(...items);
        items.forEach(item => existingIds.add(item.id));
      } catch (error) {
        logError('Error fetching supplementary recommendations', error);
      }
    }

    return results.slice(0, neededCount);
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

  const fetchUserWatchlist = useCallback(async (token) => {
    if (!token) return [];

    try {
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/watchlist`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        logError('Watchlist fetch failed with status', response.status);
        return [];
      }
      
      const watchlistData = await response.json();
      return watchlistData?.items || [];
    } catch (error) {
      logError('Error fetching watchlist', error);
      return [];
    }
  }, []);

  const getApiMediaType = (type) => {
    if (type === 'movies') return 'movie';
    if (type === 'tv') return 'tv';
    return 'movie';
  };

  const fetchFromDynamoDBCache = useCallback(async (contentTypeFilter, excludeIds = new Set(), preferences = {}, favoriteIds = [], watchlistIds = []) => {
    logMessage('Attempting to fetch from DynamoDB cache', { contentTypeFilter, excludeIdsCount: excludeIds.size, preferences, favoriteIdsCount: favoriteIds.length, watchlistIdsCount: watchlistIds.length });
    try {
      const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
      if (!token) {
        logMessage('No auth token available for DynamoDB cache fetch');
        return { success: false };
      }

      const mediaType = contentTypeFilter === 'both' ? 'both' : contentTypeFilter === 'movies' ? 'movie' : 'tv';
      const requestLimit = MAX_RECOMMENDATION_COUNT * 3;

      const excludeIdsArray = Array.from(excludeIds);

      const cacheResult = await fetchCachedMedia({
        mediaType,
        limit: requestLimit,
        excludeIds: excludeIdsArray,
        token,
        preferences,
        favoriteIds,
        watchlistIds,
      });

      if (cacheResult.items && cacheResult.items.length > 0) {
        const filteredItems = cacheResult.items.filter(item => item.id && !excludeIds.has(item.id.toString()));
        if (filteredItems.length > 0) {
          logMessage(`Successfully fetched ${cacheResult.items.length} items from DynamoDB cache, ${filteredItems.length} remain after exclusion`);
          return {
            success: true,
            recommendations: filteredItems.map(item => ({
              ...item,
              score: item.score || Math.round((item.vote_average / 10) * 100)
            })),
            dataSource: 'dynamo_cache',
            reason: 'Daily trending content'
          };
        } else {
          logMessage(`Fetched ${cacheResult.items.length} from DynamoDB, but all were excluded`);
          return { success: false };
        }
      }

      logMessage('No results found in DynamoDB cache');
      return { success: false };
    } catch (error) {
      logError('Error fetching from DynamoDB cache', error);
      return { success: false };
    }
  }, [currentUser, logMessage, fetchCachedMedia]);

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

        const [favoritesData, watchlistItems] = await Promise.all([
          fetchUserFavoritesAndGenres(token),
          fetchUserWatchlist(token)
        ]);
        const { favorites, genres: favGenres, contentTypeRatio } = favoritesData;
        const favoriteIds = new Set(favorites.map((fav) => fav.mediaId?.toString()));
        const watchlistIds = new Set(watchlistItems.map((item) => item.mediaId?.toString()));

        const excludeIds = new Set([
          ...favoriteIds,
          ...watchlistIds,
          ...Array.from(shownItemsHistory)
        ]);
        logMessage(`Excluding ${favoriteIds.size} favorites, ${watchlistIds.size} watchlist items, and ${shownItemsHistory.size} previously shown items`);

        const hasPrefs = prefs.favoriteGenres?.length > 0 || prefs.moodPreferences?.length > 0 || prefs.eraPreferences?.length > 0 || prefs.languagePreferences?.length > 0 || prefs.runtimePreference;
        const hasFavs = favorites.length > 0;

        logMessage('Attempting DynamoDB cache fetch first');
        const cacheResult = await fetchFromDynamoDBCache(
          contentTypeFilter,
          excludeIds,
          prefs,
          Array.from(favoriteIds),
          Array.from(watchlistIds)
        );
        if (cacheResult.success && cacheResult.recommendations.length >= MIN_RECOMMENDATION_COUNT) {
          fetchedRecs = cacheResult.recommendations.slice(0, MAX_RECOMMENDATION_COUNT);
          finalDataSource = cacheResult.dataSource;
          finalReason = cacheResult.reason;
          fetchSuccessful = true;
          logMessage('Sufficient recommendations found in DynamoDB cache');
        } else {
          logMessage('DynamoDB cache did not yield sufficient results');
        }

        if (!fetchSuccessful || forceRefresh) {
          logMessage('Attempting TMDB API fetch based on preferences/favorites');
          const apiKey = process.env.REACT_APP_TMDB_API_KEY;
          if (!apiKey) throw new Error('TMDB API Key missing');

          let mediaType;
          if (contentTypeFilter !== 'both') {
            mediaType = getApiMediaType(contentTypeFilter);
          } else if (hasPrefs && prefs.contentType && prefs.contentType !== 'both') {
            mediaType = getApiMediaType(prefs.contentType);
          } else {
            mediaType = Math.random() < (contentTypeRatio.movies || 0.5) ? 'movie' : 'tv';
          }
          logMessage(`Selected mediaType for TMDB discovery: ${mediaType}`);

          const genresToUse = [];
          const prefGenreIds = new Set(prefs.favoriteGenres || []);
          const favGenreIds = new Set(favGenres || []);

          prefGenreIds.forEach(id => genresToUse.push({ id, weight: 2 }));
          favGenreIds.forEach(id => {
            if (!prefGenreIds.has(id)) {
              genresToUse.push({ id, weight: 1 });
            }
          });
          logMessage('Genres to use for TMDB discovery:', genresToUse);

          const params = {
            api_key: apiKey,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50,
            'vote_average.gte': 5.5,
            include_adult: false,
          };

          if (genresToUse.length > 0) {
            params.with_genres = genresToUse.map((g) => g.id).join(',');
          }

          if (prefs.moodPreferences?.length > 0) {
            const keywords = prefs.moodPreferences.flatMap((m) => moodToKeywords(m));
            if (keywords.length > 0) {
              logMessage('Mood preferences identified, will be used for scoring:', keywords);
            }
          }

          if (prefs.eraPreferences?.length > 0) {
            const era = prefs.eraPreferences[0];
            const dateParamPrefix = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
            if (era === 'classic') params[`${dateParamPrefix}.lte`] = '1980-01-01';
            else if (era === 'modern') {
              params[`${dateParamPrefix}.gte`] = '1980-01-01';
              params[`${dateParamPrefix}.lte`] = '2010-01-01';
            } else if (era === 'recent') params[`${dateParamPrefix}.gte`] = '2010-01-01';
            logMessage('Era preference applied:', { era, params });
          }

          if (prefs.languagePreferences?.length > 0 && !prefs.languagePreferences.includes('any')) {
            params.with_original_language = prefs.languagePreferences.join(',');
            logMessage('Language preference applied:', params.with_original_language);
          }

          if (mediaType === 'movie' && prefs.runtimePreference && prefs.runtimePreference !== 'any') {
            if (prefs.runtimePreference === 'short') params.with_runtime_lte = 90;
            else if (prefs.runtimePreference === 'medium') {
              params.with_runtime_gte = 90;
              params.with_runtime_lte = 120;
            } else if (prefs.runtimePreference === 'long') params.with_runtime_gte = 120;
            logMessage('Runtime preference applied:', prefs.runtimePreference);
          }

          const url = `https://api.themoviedb.org/3/discover/${mediaType}`;
          const maxPages = 5;
          const pages = Array.from({ length: maxPages }, (_, i) => i + 1);
          logMessage(`Fetching up to ${maxPages} pages from TMDB discover endpoint: ${url}`);

          const responses = await Promise.all(
            pages.map((p) => axios.get(url, { params: { ...params, page: p } }).catch(err => {
              logError(`Error fetching TMDB page ${p}`, err);
              return null;
            }))
          );

          const allItems = responses
            .filter(Boolean)
            .flatMap((r) => r.data.results)
            .filter((item) =>
              item.poster_path &&
              item.overview &&
              item.id &&
              !excludeIds.has(item.id.toString())
            )
            .map((item) => ({
              ...item,
              media_type: mediaType,
              score: calculateSimilarity(item, genresToUse, prefs.moodPreferences),
            }));

          logMessage(`TMDB discover returned ${allItems.length} potential items after filtering`);

          const sortedItems = allItems.sort((a, b) => b.score - a.score);
          fetchedRecs = sortedItems.slice(0, MAX_RECOMMENDATION_COUNT);

          if (fetchedRecs.length > 0) {
            finalDataSource = hasPrefs && hasFavs ? 'both' : hasPrefs ? 'preferences' : 'favorites';
            finalReason = finalDataSource === 'both' ? 'Based on your preferences & favorites' : hasPrefs ? 'Based on your taste' : 'Inspired by your favorites';
            fetchSuccessful = true;
            logMessage(`Successfully fetched ${fetchedRecs.length} recommendations from TMDB based on user data`);
          } else {
            logMessage('TMDB API fetch based on user data yielded no results');
          }
        }

        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          logMessage(`Need ${MIN_RECOMMENDATION_COUNT - fetchedRecs.length} more recommendations, trying supplementary`);
          const supplementary = await fetchSupplementaryRecommendations(
            fetchedRecs.length,
            new Set([...excludeIds, ...fetchedRecs.map(r => r.id?.toString())]),
            contentTypeFilter
          );
          const combinedRecs = [...fetchedRecs, ...supplementary];
          fetchedRecs = combinedRecs.slice(0, MAX_RECOMMENDATION_COUNT);

          if (!fetchSuccessful && supplementary.length > 0) {
            finalDataSource = 'supplementary';
            finalReason = 'Popular picks for you';
            fetchSuccessful = true;
            logMessage(`Added ${supplementary.length} supplementary recommendations`);
          }
        }

        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          logMessage(`Still need ${MIN_RECOMMENDATION_COUNT - fetchedRecs.length} more recommendations, trying generic`);
          const genericRecs = await fetchGenericRecommendations(
            new Set([...excludeIds, ...fetchedRecs.map(r => r.id?.toString())]),
            contentTypeFilter
          );
          const combinedRecs = [...fetchedRecs, ...genericRecs];
          fetchedRecs = combinedRecs.slice(0, MAX_RECOMMENDATION_COUNT);

          if (!fetchSuccessful && genericRecs.length > 0) {
            finalDataSource = 'generic';
            finalReason = 'Trending now';
            fetchSuccessful = true;
            logMessage(`Added ${genericRecs.length} generic recommendations`);
          }
        }

        if (fetchSuccessful && fetchedRecs.length > 0) {
          fetchedRecs = fetchedRecs.filter(rec => rec.id && !favoriteIds.has(rec.id.toString()) && !watchlistIds.has(rec.id.toString()));
          if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
            logMessage(`Filtering removed items, now have ${fetchedRecs.length}. Fetching final generic fill`);
            const finalFillRecs = await fetchGenericRecommendations(
              new Set([...excludeIds, ...fetchedRecs.map(r => r.id?.toString())]),
              contentTypeFilter
            );
            fetchedRecs = [...fetchedRecs, ...finalFillRecs].slice(0, MAX_RECOMMENDATION_COUNT);
          }

          logMessage(`Final recommendations count: ${fetchedRecs.length}, DataSource: ${finalDataSource}, Reason: ${finalReason}`);
          saveRecommendationsToCache(fetchedRecs, userId, finalDataSource, finalReason, contentTypeFilter);
          safeSetState({
            recommendations: fetchedRecs,
            dataSource: finalDataSource,
            recommendationReason: finalReason,
            hasError: false,
            errorMessage: '',
            shownItemsHistory: new Set([...Array.from(shownItemsHistory), ...fetchedRecs.map((r) => r.id?.toString())].slice(-SHOWN_ITEMS_LIMIT)),
          });
        } else {
          logMessage('No recommendations found after all attempts');
          safeSetState({
            recommendations: [],
            dataSource: 'none',
            recommendationReason: 'Could not find recommendations matching your profile. Try adjusting preferences or adding favorites!',
            hasError: false,
          });
        }
      } catch (error) {
        logError('Fetch recommendations main error', error);
        if (retryCountRef.current < MAX_RETRIES && error.message !== 'TMDB API Key missing') {
          retryCountRef.current++;
          logMessage(`Retrying fetch (${retryCountRef.current}/${MAX_RETRIES})...`);
          isFetchingRef.current = false;
          setTimeout(() => fetchRecommendations(forceRefresh), RETRY_DELAY);
          return false;
        }
        safeSetState({
          recommendations: [],
          dataSource: 'error',
          recommendationReason: 'Error fetching recommendations',
          hasError: true,
          errorMessage: error.message || 'An unexpected error occurred',
        });
      } finally {
        if (mountedRef.current) {
          safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
          isFetchingRef.current = false;
        }
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
      fetchUserFavoritesAndGenres,
      fetchUserWatchlist,
      fetchFromDynamoDBCache,
      fetchSupplementaryRecommendations,
      fetchGenericRecommendations,
      saveRecommendationsToCache,
      safeSetState,
      getApiMediaType,
      calculateSimilarity,
      moodToKeywords,
    ]
  );

  // --- Similarity Scoring and Mood to Keywords ---
  const calculateSimilarity = (item, genresToUse, moodPrefs) => {
    const ratingScore = item.vote_average ? (item.vote_average / 10) * 25 : 0;
    const popScore = item.popularity ? (Math.log10(item.popularity + 1) / Math.log10(1000)) * 25 : 0;
    const releaseTime = item.release_date ? new Date(item.release_date).getTime() : 0;
    const yearsOld = (Date.now() - releaseTime) / (1000 * 60 * 60 * 24 * 365);
    const recencyScore = yearsOld < 10 ? ((10 - yearsOld) / 10) * 20 : 0;
    const genreScore = genresToUse.reduce(
      (sum, g) => sum + (item.genre_ids.includes(g.id) ? g.weight * 10 : 0),
      0
    );
    const keywords = (moodPrefs || []).flatMap(moodToKeywords);
    const moodScore = keywords.reduce(
      (sum, kw) => item.overview?.toLowerCase().includes(kw) ? sum + 5 : sum,
      0
    );
    return Math.min(Math.round(ratingScore + popScore + recencyScore + genreScore + moodScore), 100);
  };

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

  // --- Event Handlers ---
  const handleMediaFavoriteToggle = useCallback((mediaId, isFavorited) => {
    logMessage(`Media favorite status changed: ${mediaId} - ${isFavorited ? 'Added to' : 'Removed from'} favorites`);
    // Update state locally instead of refreshing the whole list
    if (isFavorited) {
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id.toString() !== mediaId),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId])
      }));
    }
    // No handleRefresh() call needed here
  }, [safeSetState, logMessage]);

  const handleMediaWatchlistToggle = useCallback((mediaId, isInWatchlist) => {
    logMessage(`Media watchlist status changed: ${mediaId} - ${isInWatchlist ? 'Added to' : 'Removed from'} watchlist`);
    // Update state locally instead of refreshing the whole list
    if (isInWatchlist) {
      safeSetState(prevState => ({
        recommendations: prevState.recommendations.filter(item => item.id.toString() !== mediaId),
        shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId])
      }));
    }
    // No handleRefresh() call needed here
  }, [safeSetState, logMessage]);

  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current || !userId || !isAuthenticated) return;

    safeSetState({
      isLoading: true,
      isThinking: true,
      refreshCounter: state.refreshCounter + 1,
    });

    const cacheKey = getCacheKey(userId, contentTypeFilter);
    if (cacheKey) localStorage.removeItem(cacheKey);
    sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG);

    dataLoadAttemptedRef.current = false;

    setTimeout(async () => {
      await fetchRecommendations(true);
    }, 100);
  }, [userId, isAuthenticated, contentTypeFilter, fetchRecommendations, safeSetState, state.refreshCounter]);

  // --- Initial Load ---
  useEffect(() => {
    if (!isAuthenticated || !userId || !initialAppLoadComplete) return;

    const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
    if (isAuthenticated && !token) {
      console.log('[PersonalRecs] Auth state is true but token not ready yet');
      safeSetState({ isLoading: false, isThinking: false });
      return;
    }

    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading && mountedRef.current) {
        logMessage('Loading timeout reached, forcing exit from loading state');
        safeSetState({ 
          isLoading: false, 
          isThinking: false, 
          hasError: true, 
          errorMessage: 'Loading recommendations timed out. Please try refreshing',
          dataSource: 'error'
        });
        isFetchingRef.current = false;
      }
    }, LOADING_TIMEOUT);

    const cached = getRecommendationsFromCache(userId, contentTypeFilter);
    if (cached && !cacheChecked) {
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

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [isAuthenticated, userId, initialAppLoadComplete]);

  // --- Preference Changes ---
  useEffect(() => {
    if (!initialAppLoadComplete || !propHasCompletedQuestionnaire) return;

    const currentPrefs = JSON.stringify(propUserPreferences || null);
    if (prevPreferencesRef.current && prevPreferencesRef.current !== currentPrefs) {
      safeSetState({ isLoading: true, isThinking: true });
      handleRefresh();
    }
    prevPreferencesRef.current = currentPrefs;
  }, [initialAppLoadComplete, propHasCompletedQuestionnaire, propUserPreferences]);

  // --- Expose methods for parent components ---
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

      setTimeout(() => {
        handleRefresh();
      }, 50);
    },
  }));

  // --- Listen for favorites and watchlist updates ---
  useEffect(() => {
    const handleFavoritesUpdate = (event) => {
      const { mediaId, isFavorited } = event.detail || {};
      if (mediaId && isFavorited) {
        logMessage(`External favorite update detected for: ${mediaId}. Recommendation list state update handled by direct callback.`);
        // State update is now handled by handleMediaFavoriteToggle passed via prop.
        // safeSetState(prevState => ({
        //   recommendations: prevState.recommendations.filter(item => item.id.toString() !== mediaId),
        //   shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId])
        // }));
      }
    };

    const handleWatchlistUpdate = (event) => {
      const { mediaId, isInWatchlist } = event.detail || {};
      if (mediaId && isInWatchlist) {
        logMessage(`External watchlist update detected for: ${mediaId}. Recommendation list state update handled by direct callback.`);
        // State update is now handled by handleMediaWatchlistToggle passed via prop.
        // safeSetState(prevState => ({
        //   recommendations: prevState.recommendations.filter(item => item.id.toString() !== mediaId),
        //   shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId])
        // }));
      }
    };

    document.addEventListener('favorites-updated', handleFavoritesUpdate);
    document.addEventListener('watchlist-updated', handleWatchlistUpdate);
    
    return () => {
      document.removeEventListener('favorites-updated', handleFavoritesUpdate);
      document.removeEventListener('watchlist-updated', handleWatchlistUpdate);
    };
  }, [safeSetState, logMessage, handleRefresh]);

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
            <MediaCard 
              result={item} 
              currentUser={currentUser} 
              onFavoriteToggle={handleMediaFavoriteToggle}
              onWatchlistToggle={handleMediaWatchlistToggle}
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
          disabled={isThinking || isLoading}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full ${isThinking || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {(isThinking || isLoading) ? 'Trying...' : 'Get New Recommendations'}
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
          Get New Recommendations
        </motion.button>
      </motion.div>
    );
  } else {
    content = <div key="fallback" className="min-h-[200px]"></div>;
  }

  let title = 'Recommendations For You';
  if (dataSource === 'error') title = "Error Loading";
  else if (dataSource === 'both') title = 'For You (Taste & Favorites)';
  else if (dataSource === 'preferences') title = 'Based on Your Taste';
  else if (dataSource === 'favorites') title = 'Inspired by Your Favorites';
  else if (dataSource === 'generic') title = 'Trending Now';
  else if (dataSource === 'dynamo_cache') title = 'Trending & Popular';
  else if (dataSource === 'supplementary' || dataSource === 'mixed') title = 'Popular Picks For You';
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { safeSetState({ contentTypeFilter: 'both' }); handleRefresh(); }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'both' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            disabled={isLoading || isThinking}
          >
            <VideoCameraIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Both</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { safeSetState({ contentTypeFilter: 'movies' }); handleRefresh(); }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'movies' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            disabled={isLoading || isThinking}
          >
            <FilmIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Movies</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { safeSetState({ contentTypeFilter: 'tv' }); handleRefresh(); }}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm ${contentTypeFilter === 'tv' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            disabled={isLoading || isThinking}
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
            <span>{isThinking || isLoading ? 'Loading...' : 'Get New Recommendations'}</span>
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