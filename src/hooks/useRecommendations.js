// src/hooks/useRecommendations.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { fetchCachedMedia } from '../services/mediaCache'; // Assuming mediaCache service exists
import ENV_CONFIG from '../config/environment';
import { ensureValidToken } from '../services/authService';

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
    console.log(`[useRecs] ${message}`, data !== undefined ? data : '');
  }
};

const logError = (message, error) => {
  console.error(`[useRecs] ${message}`, error);
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

const saveRecommendationsToCache = (data, currentUserId, currentDataSource, currentReason, currentContentType) => {
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
};

const getApiMediaType = (type) => {
  if (type === 'movies') return 'movie';
  if (type === 'tv') return 'tv';
  return 'movie'; // Default or handle 'both' case if needed differently
};

const moodToKeywords = (mood) => {
  const map = {
    'exciting': ['action', 'thrilling', 'intense', 'adventure'],
    'thoughtful': ['drama', 'deep', 'reflective', 'mystery'],
    'funny': ['comedy', 'hilarious', 'light', 'humor'],
    'scary': ['horror', 'terrifying', 'spooky', 'suspense'],
    'emotional': ['drama', 'touching', 'heartfelt', 'romance'],
  };
  return map[mood] || [];
};

const calculateSimilarity = (item, genresToUse, moodPrefs) => {
  const ratingScore = item.vote_average ? (item.vote_average / 10) * 25 : 0;
  const popScore = item.popularity ? (Math.log10(item.popularity + 1) / Math.log10(1000)) * 25 : 0; // Normalize popularity
  const releaseTime = item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getTime() : 0;
  const yearsOld = releaseTime > 0 ? (Date.now() - releaseTime) / (1000 * 60 * 60 * 24 * 365) : 100; // Treat missing date as very old
  const recencyScore = yearsOld < 10 ? ((10 - yearsOld) / 10) * 20 : 0; // Score higher for newer items (within 10 years)

  const itemGenreIds = new Set(item.genre_ids || []);
  const genreScore = genresToUse.reduce(
    (sum, g) => sum + (itemGenreIds.has(g.id) ? g.weight * 10 : 0), // Weighted score based on preference/favorite
    0
  );

  const keywords = (moodPrefs || []).flatMap(moodToKeywords);
  const moodScore = keywords.reduce(
    (sum, kw) => (item.overview?.toLowerCase().includes(kw) ? sum + 5 : sum), // Simple keyword check in overview
    0
  );

  return Math.min(Math.round(ratingScore + popScore + recencyScore + genreScore + moodScore), 100);
};


// --- The Hook ---
function useRecommendations(currentUser, isAuthenticated, userPreferences, hasCompletedQuestionnaire, initialAppLoadComplete) {
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

  const userId = useMemo(() => isAuthenticated ? currentUser?.attributes?.sub : null, [isAuthenticated, currentUser]);

  // --- Refs ---
  const isFetchingRef = useRef(false);
  const dataLoadAttemptedRef = useRef(false);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const loadingTimeoutRef = useRef(null);
  const prevPreferencesRef = useRef(null); // Stores a stringified version for comparison
  const prevUserIdRef = useRef(null);

  // Helper to get a stable, serializable representation for comparison
  const getSerializablePrefsForCompare = (prefs) => {
    if (!prefs) return null;
    // Select only the core preference fields that trigger a refresh
    try {
      return JSON.stringify({
        favoriteGenres: prefs.favoriteGenres,
        moodPreferences: prefs.moodPreferences,
        eraPreferences: prefs.eraPreferences,
        languagePreferences: prefs.languagePreferences,
        runtimePreference: prefs.runtimePreference,
        contentType: prefs.contentType,
        // Add any other fields from userPreferences that should trigger a refresh
      });
    } catch (e) {
      logError("Failed to stringify preferences for comparison", e);
      // Return a timestamp or random string to force a refresh if stringify fails
      return `stringify_error_${Date.now()}`;
    }
  };


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
     if (userId !== prevUserIdRef.current) {
       logMessage('User ID changed, resetting hook state');
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
       prevPreferencesRef.current = null; // Reset pref tracking on user change
       prevUserIdRef.current = userId;
     }
   }, [userId, safeSetState]);


  // --- Data Fetching Utilities ---
  const fetchGenericRecommendations = useCallback(async (excludeIds = new Set(), contentType = 'both') => {
    const apiKey = process.env.REACT_APP_TMDB_API_KEY;
    if (!apiKey) return [];

    let url;
    if (contentType === 'movies') url = 'https://api.themoviedb.org/3/movie/popular';
    else if (contentType === 'tv') url = 'https://api.themoviedb.org/3/tv/popular';
    else url = 'https://api.themoviedb.org/3/trending/all/week'; // Default to trending if 'both'

    try {
      // Fetch a random page from the first few pages
      const response = await axios.get(url, {
        params: { api_key: apiKey, page: Math.floor(Math.random() * 5) + 1 },
      });

      let items = response.data.results
        .filter((item) => item.poster_path && item.overview && !excludeIds.has(item.id?.toString()))
        .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) })); // Basic score

      // Ensure correct media_type if fetching specific type or trending
      if (contentType === 'movies') items = items.map(item => ({ ...item, media_type: 'movie' }));
      else if (contentType === 'tv') items = items.map(item => ({ ...item, media_type: 'tv' }));
      else items = items.filter(item => item.media_type === 'movie' || item.media_type === 'tv'); // Filter trending for movie/tv

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

    const pages = [1, 2]; // Fetch from first 2 pages of top rated/trending
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
          .filter((item) => item.poster_path && item.overview && !existingIds.has(item.id?.toString()))
          .map((item) => ({ ...item, score: Math.round((item.vote_average / 10) * 100) }));

        // Ensure correct media_type
        if (contentType === 'movies') items = items.map(item => ({ ...item, media_type: 'movie' }));
        else if (contentType === 'tv') items = items.map(item => ({ ...item, media_type: 'tv' }));
        else items = items.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

        items.forEach(item => {
          if (!existingIds.has(item.id?.toString())) {
            results.push(item);
            existingIds.add(item.id?.toString());
          }
        });

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
      const response = await fetch(ENV_CONFIG.getApiUrl('/user/favourites'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Favorites fetch failed');
      const favData = await response.json();
      const favorites = favData?.items || [];

      if (favorites.length === 0) return { favorites: [], genres: [], contentTypeRatio: { movies: 0.5, tv: 0.5 } };

      // Fetch details to get genres
      const detailPromises = favorites.map((item) =>
        axios.get(`https://api.themoviedb.org/3/${item.mediaType}/${item.mediaId}`, { params: { api_key: apiKey } })
          .catch(() => null) // Ignore errors for individual items
      );
      const detailResults = (await Promise.all(detailPromises)).filter(Boolean);
      const genres = detailResults.flatMap((res) => res.data?.genres?.map((g) => g.id) || []);
      const genreCount = genres.reduce((acc, g) => ({ ...acc, [g]: (acc[g] || 0) + 1 }), {});
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3) // Take top 3 genres from favorites
        .map(([id]) => parseInt(id, 10));

      // Calculate content type ratio from favorites
      const movieCount = favorites.filter((f) => f.mediaType === 'movie').length;
      const tvCount = favorites.filter((f) => f.mediaType === 'tv').length;
      const total = movieCount + tvCount || 1; // Avoid division by zero
      const contentTypeRatio = {
        movies: movieCount / total,
        tv: tvCount / total,
      };

      return { favorites, genres: topGenres, contentTypeRatio };
    } catch (error) {
      logError('Error fetching favorites/genres', error);
      return { favorites: [], genres: [], contentTypeRatio: { movies: 0.5, tv: 0.5 } }; // Default ratio on error
    }
  }, []);

  const fetchUserWatchlist = useCallback(async (token) => {
    if (!token) return [];
    try {
      const response = await fetch(ENV_CONFIG.getApiUrl('/user/watchlist'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
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

  const fetchFromDynamoDBCache = useCallback(async (currentContentTypeFilter, excludeIds = new Set(), prefs = {}, favoriteIds = [], watchlistIds = []) => {
    logMessage('Attempting to fetch from DynamoDB cache', { currentContentTypeFilter });
    try {
      const token = currentUser?.signInUserSession?.accessToken?.jwtToken;
      if (!token) {
        logMessage('No auth token available for DynamoDB cache fetch');
        return { success: false };
      }

      const mediaType = currentContentTypeFilter === 'both' ? 'both' : currentContentTypeFilter === 'movies' ? 'movie' : 'tv';
      const requestLimit = MAX_RECOMMENDATION_COUNT * 3; // Fetch more to allow for filtering

      const cacheResult = await fetchCachedMedia({
        mediaType,
        limit: requestLimit,
        excludeIds: Array.from(excludeIds),
        token,
        preferences: prefs,
        favoriteIds,
        watchlistIds,
      });

      if (cacheResult.items && cacheResult.items.length > 0) {
        // Ensure items have IDs and filter again just in case
        const filteredItems = cacheResult.items.filter(item => item.id && !excludeIds.has(item.id.toString()));
        if (filteredItems.length > 0) {
          logMessage(`Successfully fetched ${filteredItems.length} items from DynamoDB cache`);
          return {
            success: true,
            recommendations: filteredItems.map(item => ({
              ...item,
              score: item.score || Math.round((item.vote_average / 10) * 100) // Ensure score exists
            })),
            dataSource: 'dynamo_cache',
            reason: 'Daily trending content' // Or derive from cacheResult if available
          };
        }
      }
      logMessage('No usable results found in DynamoDB cache');
      return { success: false };
    } catch (error) {
      logError('Error fetching from DynamoDB cache', error);
      return { success: false };
    }
  }, [currentUser]); // Dependency on currentUser for token

  // --- Core Recommendation Fetch Logic ---
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated || !userId || !initialAppLoadComplete || isFetchingRef.current) {
        logMessage('Skipping fetchRecommendations', { isAuthenticated, userId, initialAppLoadComplete, isFetching: isFetchingRef.current });
        safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
        return false;
      }

      isFetchingRef.current = true;
      dataLoadAttemptedRef.current = true; // Mark that a fetch was initiated
      retryCountRef.current = 0; // Reset retries for a new fetch sequence

      safeSetState({
        isRefreshing: forceRefresh,
        isThinking: true,
        hasError: false,
        errorMessage: '',
        isLoading: true, // Set loading true at the start
      });

      // Start loading timeout
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        if (isFetchingRef.current && mountedRef.current) {
          logMessage('Loading timeout reached');
          safeSetState({
            isLoading: false, isThinking: false, isRefreshing: false,
            hasError: true, errorMessage: 'Loading recommendations timed out.', dataSource: 'error'
          });
          isFetchingRef.current = false;
        }
      }, LOADING_TIMEOUT);


      let fetchedRecs = [];
      let finalDataSource = 'none';
      let finalReason = '';
      let fetchSuccessful = false;

      try {
        // Use the proper auth service to get a valid token
        const token = await ensureValidToken(currentUser);
        const prefs = userPreferences || {};

        // Fetch favorites and watchlist concurrently
        const [favoritesData, watchlistItems] = await Promise.all([
          fetchUserFavoritesAndGenres(token),
          fetchUserWatchlist(token)
        ]);
        const { favorites, genres: favGenres, contentTypeRatio } = favoritesData;
        const favoriteIds = new Set(favorites.map((fav) => fav.mediaId?.toString()));
        const watchlistIds = new Set(watchlistItems.map((item) => item.mediaId?.toString()));

        // Combine exclusions
        const excludeIds = new Set([
          ...favoriteIds,
          ...watchlistIds,
          ...Array.from(shownItemsHistory) // Include previously shown items
        ]);
        logMessage(`Excluding ${excludeIds.size} items (favs, watchlist, history)`);

        const hasPrefs = Object.keys(prefs).length > 0 && (prefs.favoriteGenres?.length > 0 || prefs.moodPreferences?.length > 0 || prefs.eraPreferences?.length > 0 || prefs.languagePreferences?.length > 0 || prefs.runtimePreference);
        const hasFavs = favorites.length > 0;

        // 1. Try DynamoDB Cache
        logMessage('Attempting DynamoDB cache fetch');
        const cacheResult = await fetchFromDynamoDBCache(
          contentTypeFilter, excludeIds, prefs, Array.from(favoriteIds), Array.from(watchlistIds)
        );
        if (cacheResult.success && cacheResult.recommendations.length >= MIN_RECOMMENDATION_COUNT) {
          fetchedRecs = cacheResult.recommendations.slice(0, MAX_RECOMMENDATION_COUNT);
          finalDataSource = cacheResult.dataSource;
          finalReason = cacheResult.reason;
          fetchSuccessful = true;
          logMessage('Sufficient recommendations found in DynamoDB cache');
        } else {
          logMessage('DynamoDB cache insufficient');
        }

        // 2. Try TMDB Discover API (if cache failed or forced refresh)
        if (!fetchSuccessful || forceRefresh) {
          logMessage('Attempting TMDB API fetch based on preferences/favorites');
          const apiKey = process.env.REACT_APP_TMDB_API_KEY;
          if (!apiKey) throw new Error('TMDB API Key missing');

          // Determine media type for discovery
          let mediaType;
          if (contentTypeFilter !== 'both') {
            mediaType = getApiMediaType(contentTypeFilter);
          } else if (hasPrefs && prefs.contentType && prefs.contentType !== 'both') {
            mediaType = getApiMediaType(prefs.contentType);
          } else {
            // Use ratio from favorites, default 50/50
            mediaType = Math.random() < (contentTypeRatio.movies || 0.5) ? 'movie' : 'tv';
          }
          logMessage(`Selected mediaType for TMDB discovery: ${mediaType}`);

          // Combine genres from preferences (higher weight) and favorites
          const genresToUse = [];
          const prefGenreIds = new Set(prefs.favoriteGenres || []);
          const favGenreIds = new Set(favGenres || []);
          prefGenreIds.forEach(id => genresToUse.push({ id, weight: 2 }));
          favGenreIds.forEach(id => {
            if (!prefGenreIds.has(id)) genresToUse.push({ id, weight: 1 });
          });
          logMessage('Genres to use for TMDB discovery:', genresToUse);

          // Build TMDB Discover parameters
          const params = {
            api_key: apiKey,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50, // Basic quality filter
            'vote_average.gte': 5.5,
            include_adult: false,
          };
          if (genresToUse.length > 0) params.with_genres = genresToUse.map((g) => g.id).join(',');
          // Add other preference filters (era, language, runtime)
          if (prefs.eraPreferences?.length > 0) {
             const era = prefs.eraPreferences[0];
             const dateParamPrefix = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
             if (era === 'classic') params[`${dateParamPrefix}.lte`] = '1980-01-01';
             else if (era === 'modern') { params[`${dateParamPrefix}.gte`] = '1980-01-01'; params[`${dateParamPrefix}.lte`] = '2010-01-01'; }
             else if (era === 'recent') params[`${dateParamPrefix}.gte`] = '2010-01-01';
          }
          if (prefs.languagePreferences?.length > 0 && !prefs.languagePreferences.includes('any')) {
             params.with_original_language = prefs.languagePreferences.join(',');
          }
          if (mediaType === 'movie' && prefs.runtimePreference && prefs.runtimePreference !== 'any') {
             if (prefs.runtimePreference === 'short') params.with_runtime_lte = 90;
             else if (prefs.runtimePreference === 'medium') { params.with_runtime_gte = 90; params.with_runtime_lte = 120; }
             else if (prefs.runtimePreference === 'long') params.with_runtime_gte = 120;
          }

          // Fetch multiple pages from TMDB Discover
          const url = `https://api.themoviedb.org/3/discover/${mediaType}`;
          const maxPages = 5;
          const pages = Array.from({ length: maxPages }, (_, i) => i + 1);
          logMessage(`Fetching up to ${maxPages} pages from TMDB discover: ${url}`);

          const responses = await Promise.all(
            pages.map((p) => axios.get(url, { params: { ...params, page: p } }).catch(err => {
              logError(`Error fetching TMDB page ${p}`, err); return null;
            }))
          );

          // Process and score results
          const allItems = responses
            .filter(Boolean)
            .flatMap((r) => r.data.results)
            .filter((item) => item.poster_path && item.overview && item.id && !excludeIds.has(item.id.toString()))
            .map((item) => ({
              ...item,
              media_type: mediaType, // Ensure media_type is set correctly
              score: calculateSimilarity(item, genresToUse, prefs.moodPreferences),
            }));

          logMessage(`TMDB discover returned ${allItems.length} potential items after filtering`);

          // Sort by calculated score and take top N
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

        // 3. Fetch Supplementary (if needed)
        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          logMessage(`Need ${MIN_RECOMMENDATION_COUNT - fetchedRecs.length} more recommendations, trying supplementary`);
          const supplementary = await fetchSupplementaryRecommendations(
            fetchedRecs.length,
            new Set([...excludeIds, ...fetchedRecs.map(r => r.id?.toString())]), // Exclude already fetched
            contentTypeFilter
          );
          const combinedRecs = [...fetchedRecs, ...supplementary];
          fetchedRecs = combinedRecs.slice(0, MAX_RECOMMENDATION_COUNT);

          if (!fetchSuccessful && supplementary.length > 0) { // If this is the first successful fetch
            finalDataSource = 'supplementary';
            finalReason = 'Popular picks for you';
            fetchSuccessful = true;
          }
          logMessage(`Added ${supplementary.length} supplementary recommendations`);
        }

        // 4. Fetch Generic (if still needed)
        if (fetchedRecs.length < MIN_RECOMMENDATION_COUNT) {
          logMessage(`Still need ${MIN_RECOMMENDATION_COUNT - fetchedRecs.length} more recommendations, trying generic`);
          const genericRecs = await fetchGenericRecommendations(
            new Set([...excludeIds, ...fetchedRecs.map(r => r.id?.toString())]), // Exclude already fetched
            contentTypeFilter
          );
          const combinedRecs = [...fetchedRecs, ...genericRecs];
          fetchedRecs = combinedRecs.slice(0, MAX_RECOMMENDATION_COUNT);

          if (!fetchSuccessful && genericRecs.length > 0) { // If this is the first successful fetch
            finalDataSource = 'generic';
            finalReason = 'Trending now';
            fetchSuccessful = true;
          }
          logMessage(`Added ${genericRecs.length} generic recommendations`);
        }

        // Final Processing and State Update
        if (fetchSuccessful && fetchedRecs.length > 0) {
          // Final filter against any late-breaking fav/watchlist adds (unlikely but safe)
          fetchedRecs = fetchedRecs.filter(rec => rec.id && !favoriteIds.has(rec.id.toString()) && !watchlistIds.has(rec.id.toString()));

          // If filtering removed too many, try one last generic fill (edge case)
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

          // Update shown history
          const newHistory = new Set([...Array.from(shownItemsHistory), ...fetchedRecs.map((r) => r.id?.toString())].slice(-SHOWN_ITEMS_LIMIT));

          safeSetState({
            recommendations: fetchedRecs,
            dataSource: finalDataSource,
            recommendationReason: finalReason,
            hasError: false,
            errorMessage: '',
            shownItemsHistory: newHistory,
          });
        } else {
          logMessage('No recommendations found after all attempts');
          safeSetState({
            recommendations: [],
            dataSource: 'none',
            recommendationReason: 'Could not find recommendations. Try adjusting preferences or adding favorites!',
            hasError: false, // Not an error, just no results
          });
        }
      } catch (error) {
        logError('Fetch recommendations main error', error);
        if (retryCountRef.current < MAX_RETRIES && error.message !== 'TMDB API Key missing') {
          retryCountRef.current++;
          logMessage(`Retrying fetch (${retryCountRef.current}/${MAX_RETRIES})...`);
          isFetchingRef.current = false; // Allow retry
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); // Clear timeout before retry delay
          setTimeout(() => fetchRecommendations(forceRefresh), RETRY_DELAY);
          return false; // Indicate fetch is not complete yet
        }
        // Max retries reached or critical error
        safeSetState({
          recommendations: [], dataSource: 'error', recommendationReason: '',
          hasError: true, errorMessage: error.message || 'An unexpected error occurred',
        });
      } finally {
        // Ensure loading states are reset when the fetch attempt concludes, if mounted.
        // The retry logic handles setting isFetchingRef to false before its own timeout.
        if (mountedRef.current) {
          // Always reset UI loading states if mounted
          safeSetState({ isLoading: false, isThinking: false, isRefreshing: false });
          // Always reset the fetching flag if mounted, as the fetch attempt is over.
          isFetchingRef.current = false;
          // Clear any potentially lingering timeout
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        }
      }
      return fetchSuccessful && retryCountRef.current < MAX_RETRIES; // Return success status
    },
    [
      currentUser, isAuthenticated, userId, initialAppLoadComplete, userPreferences,
      contentTypeFilter, shownItemsHistory, fetchUserFavoritesAndGenres, fetchUserWatchlist,
      fetchFromDynamoDBCache, fetchSupplementaryRecommendations, fetchGenericRecommendations,
      safeSetState, // Removed calculateSimilarity, moodToKeywords as they are defined in hook scope
    ]
  );


  // --- Manual Refresh Handler ---
  const refreshRecommendations = useCallback(async (newPrefs = null) => {
    if (isFetchingRef.current || !userId || !isAuthenticated) {
      logMessage('Refresh skipped', { isFetching: isFetchingRef.current, userId, isAuthenticated });
      return;
    }
    logMessage('Manual refresh triggered');

    safeSetState({
      isLoading: true,
      isThinking: true,
      isRefreshing: true, // Indicate it's a manual refresh
      refreshCounter: c => c + 1, // Increment counter to help key changes
    });

    // Clear local storage cache for this user/filter
    const cacheKey = getCacheKey(userId, contentTypeFilter);
    if (cacheKey) localStorage.removeItem(cacheKey);
    sessionStorage.removeItem(SESSION_RECS_LOADED_FLAG); // Clear session flag too

    dataLoadAttemptedRef.current = false; // Allow fetch to run fully

    // If new preferences are provided, update the ref immediately using the comparable string
    if (newPrefs) {
      prevPreferencesRef.current = getSerializablePrefsForCompare(newPrefs);
    }

    // Use a small delay to allow state update before fetching
    setTimeout(async () => {
      await fetchRecommendations(true); // Force refresh
    }, 50);
  }, [userId, isAuthenticated, contentTypeFilter, fetchRecommendations, safeSetState]);


  // --- Initial Load and Dependency Changes ---
  useEffect(() => {
    if (!isAuthenticated || !userId || !initialAppLoadComplete) {
      logMessage('Initial load effect skipped', { isAuthenticated, userId, initialAppLoadComplete });
      return; // Don't fetch if not ready
    }

    const checkTokenAndFetch = async () => {
      try {
        const token = await ensureValidToken(currentUser);
        if (!token) {
          logMessage('Token not ready yet, skipping initial fetch');
          safeSetState({ isLoading: false, isThinking: false }); // Ensure loading is off if token disappears
          return;
        }
      } catch (error) {
        logMessage('Token validation failed, skipping initial fetch', error);
        safeSetState({ isLoading: false, isThinking: false, hasError: true, errorMessage: 'Authentication error' });
        return;
      }

      // First check cache once
      const cached = getRecommendationsFromCache(userId, contentTypeFilter);
      safeSetState({ cacheChecked: true });
      if (cached) {
        logMessage('Using cached recommendations on initial load');
        safeSetState({
          recommendations: cached.data,
          dataSource: cached.dataSource,
          recommendationReason: cached.reason || '',
          isLoading: false,
          isThinking: false,
        });
        dataLoadAttemptedRef.current = true;
        return;
      }
      // No cache or empty – now fetch
      if (!dataLoadAttemptedRef.current) {
        logMessage('Cache miss or invalid, initiating fetch');
        safeSetState({ isLoading: true, isThinking: true });
        fetchRecommendations(false);
      }
    };

    checkTokenAndFetch();

    // Cleanup timeout on unmount or before next effect run
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, initialAppLoadComplete, currentUser, contentTypeFilter, fetchRecommendations, safeSetState]); // Add fetchRecommendations, safeSetState


  // --- Preference Changes Trigger Refresh ---
  useEffect(() => {
    if (!initialAppLoadComplete || !hasCompletedQuestionnaire) return; // Only react after initial load and questionnaire completion

    const currentPrefsComparable = getSerializablePrefsForCompare(userPreferences);

    // Trigger refresh only if prefs actually changed since the last check
    // Compare the stringified comparable versions
    if (prevPreferencesRef.current !== null && prevPreferencesRef.current !== currentPrefsComparable) {
      logMessage('User preferences changed, triggering refresh');
      // Pass the full userPreferences object if fetchRecommendations needs it,
      // but the comparison uses the serializable string.
      refreshRecommendations(userPreferences);
    }

    // Update the ref for the next comparison
    prevPreferencesRef.current = currentPrefsComparable;

  }, [initialAppLoadComplete, hasCompletedQuestionnaire, userPreferences, refreshRecommendations]); // Depend on refreshRecommendations


  // --- Content Type Filter Change ---
  useEffect(() => {
    // Trigger a refresh whenever the contentTypeFilter changes, *after* the initial load sequence
    if (userId && initialAppLoadComplete && dataLoadAttemptedRef.current) {
        logMessage(`Content type filter changed to: ${contentTypeFilter}, triggering refresh.`);
        refreshRecommendations(); // Refresh uses the current contentTypeFilter from state
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTypeFilter]); // Only run when filter changes


  // --- Update shown history when recommendations change ---
  // This might be redundant if fetchRecommendations already updates it, but ensures consistency
  useEffect(() => {
    if (recommendations.length > 0) {
      const newIds = recommendations.map(r => r.id?.toString());
      safeSetState(prev => {
        const updatedHistory = new Set([...Array.from(prev.shownItemsHistory), ...newIds].slice(-SHOWN_ITEMS_LIMIT));
        // Only update state if the history actually changed
        if (updatedHistory.size !== prev.shownItemsHistory.size || !newIds.every(id => prev.shownItemsHistory.has(id))) {
          return { shownItemsHistory: updatedHistory };
        }
        return null; // No change needed
      });
    }
  }, [recommendations, safeSetState]);


  // --- Handlers for removing items locally ---
   const removeRecommendationById = useCallback((mediaId) => {
     safeSetState(prevState => ({
       recommendations: prevState.recommendations.filter(item => item.id?.toString() !== mediaId?.toString()),
       // Add to shown history immediately when removed due to fav/watchlist action
       shownItemsHistory: new Set([...prevState.shownItemsHistory, mediaId?.toString()])
     }));
   }, [safeSetState]);


  return {
    recommendations,
    dataSource,
    recommendationReason,
    isLoading,
    isThinking,
    isRefreshing,
    hasError,
    errorMessage,
    refreshCounter, // Expose counter for keying animations if needed
    contentTypeFilter,
    setContentTypeFilter: (filter) => safeSetState({ contentTypeFilter: filter }), // Setter for the filter
    refreshRecommendations, // Expose manual refresh
    removeRecommendationById, // Expose function to remove item locally
  };
}

export default useRecommendations;