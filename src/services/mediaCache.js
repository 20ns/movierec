// src/services/mediaCache.js

import axios from 'axios';

// Base URL updated to the user's current API Gateway stage
const API_GATEWAY_URL = 'https://n09230hhhj.execute-api.eu-north-1.amazonaws.com/prod'; // Updated URL
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const CLIENT_CACHE_PREFIX = 'media_rec_cache_v2'; // Updated prefix for new logic

/**
 * Fetches personalized media recommendations via API Gateway
 * @param {Object} options Options for fetching media
 * @param {String} options.mediaType 'movie', 'tv', or 'both'
 * @param {Number} options.limit Number of items to return (defaults to 6)
 * @param {Array} options.excludeIds Array of media IDs to exclude
 * @param {String} options.token JWT auth token
 * @param {Object} options.preferences User preferences object
 * @param {Array} options.favoriteIds Array of favorite media IDs
 * @param {Array} options.watchlistIds Array of watchlist media IDs
 * @returns {Promise<{items: Array, source: String}>} Media items and source info
 */
export const fetchCachedMedia = async (options = {}) => {
  const {
    mediaType = 'both',
    limit = 6, // Default limit
    excludeIds = [], // Exclusions for the current fetch operation
    token,
    preferences = {},
    favoriteIds = [],
    watchlistIds = [],
    forceRefresh = false,
  } = options;

  const currentExcludeIdsStr = excludeIds.map(String).sort();
  const favoriteIdsStr = favoriteIds.map(String).sort();
  const watchlistIdsStr = watchlistIds.map(String).sort();

  // Helper to generate cache keys
  const generateCacheKey = (specificExcludeIds) => {
    // Normalize preferences for cache key generation by sorting keys
    const normalizedPreferences = {};
    if (preferences && typeof preferences === 'object' && preferences !== null) {
      Object.keys(preferences).sort().forEach(key => {
        // Only include defined properties to avoid "undefined" in stringified object
        if (preferences[key] !== undefined) {
          normalizedPreferences[key] = preferences[key];
        }
      });
    }

    const payload = JSON.stringify({
      v: 2, mediaType, limit,
      excludeIds: specificExcludeIds,
      preferences: normalizedPreferences, // Use normalized (sorted keys) preferences
      favoriteIds: favoriteIdsStr,
      watchlistIds: watchlistIdsStr,
    });
    // Using btoa for simplicity. Ensure payload doesn't contain chars problematic for btoa, or use a more robust hash.
    // The unescape(encodeURIComponent()) pattern is a common way to handle UTF-8 for btoa.
    return CLIENT_CACHE_PREFIX + '_' + btoa(unescape(encodeURIComponent(payload)));
  };

  // Key for looking up in cache: uses the exact excludeIds provided for this call.
  const lookupCacheKey = generateCacheKey(currentExcludeIdsStr);

  // Key for writing to cache:
  // If forceRefresh is true, we write to a "canonical" key (e.g., with empty excludes),
  // making this fetched data the new standard for this query.
  // Otherwise (not forceRefresh, just a cache miss), we write to the same key we looked up.
  const canonicalExcludeIdsForWrite = []; // Represents the base query without one-time exclusions
  const writeCacheKey = forceRefresh ? generateCacheKey(canonicalExcludeIdsForWrite) : lookupCacheKey;

  // 1. Try client cache if not forceRefresh
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(lookupCacheKey);
      if (raw) {
        const { timestamp, data } = JSON.parse(raw);
        if (!shouldRefreshCache(timestamp)) {
          if (data && data.items && data.source) {
            console.log(`[MediaCache] Cache hit for key: ${lookupCacheKey}`);
            return data;
          } else {
            console.warn(`[MediaCache] Invalid cache data for key: ${lookupCacheKey}`);
            localStorage.removeItem(lookupCacheKey);
          }
        } else {
          console.log(`[MediaCache] Cache expired for key: ${lookupCacheKey}`);
          localStorage.removeItem(lookupCacheKey);
        }
      } else {
        console.log(`[MediaCache] Cache miss for key: ${lookupCacheKey}`);
      }
    } catch (e) {
      console.warn(`[MediaCache] Error reading client cache for key ${lookupCacheKey}:`, e);
      localStorage.removeItem(lookupCacheKey); // Clear potentially corrupted cache
    }
  } else {
    console.log(`[MediaCache] Bypassing client cache (forceRefresh=true). Will write to: ${writeCacheKey}`);
  }

  // 2. Proceed to API call
  try {
    console.log(`[MediaCache] Attempting to fetch from Personalized API (forceRefresh=${forceRefresh}, excludeIds=${currentExcludeIdsStr.join(',') || 'none'})`);
    if (!API_GATEWAY_URL) {
        console.error('[MediaCache] API_GATEWAY_URL is not defined. Check environment variables.');
        return { items: [], source: 'error' };
    }

    const apiUrl = `${API_GATEWAY_URL}/media-recommendations`;
    console.log(`[MediaCache] Fetching from: ${apiUrl}`);

    const response = await axios.get(
      apiUrl,
      {
        params: {
          mediaType,
          // limit: limit, // Lambda now defaults to 6
          exclude: currentExcludeIdsStr.join(','), // Use currentExcludeIdsStr for the API call
          ...(Object.keys(preferences).length > 0 && { preferences: JSON.stringify(preferences) }),
          ...(favoriteIdsStr.length > 0 && { favorites: favoriteIdsStr.join(',') }),
          ...(watchlistIdsStr.length > 0 && { watchlist: watchlistIdsStr.join(',') }),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 25000, // 25 seconds timeout
      }
    );

    if (response.status === 200 && response.data && Array.isArray(response.data.items)) {
      const fetchedItems = response.data.items;
      const source = response.data.source || 'personalized_lambda';
      console.log(`[MediaCache] Successfully fetched ${fetchedItems.length} items from ${source}. Will cache with key: ${writeCacheKey}`);

      const mappedItems = fetchedItems.map(item => ({
        id: parseInt(item.mediaId, 10),
        media_type: item.mediaType,
        title: item.title,
        name: item.title,
        overview: item.overview,
        poster_path: item.posterPath,
        backdrop_path: item.backdropPath,
        vote_average: item.voteAverage,
        release_date: item.releaseDate,
        popularity: item.popularity,
        genre_ids: item.genres
                      ? item.genres.split('|').map(g => parseInt(g, 10)).filter(Number.isFinite)
                      : [],
        genre: item.genre || null,
      }));

      const cacheDataToStore = { items: mappedItems, source: source };
      try {
        // Use writeCacheKey for storing the data
        localStorage.setItem(writeCacheKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: cacheDataToStore,
        }));
        console.log(`[MediaCache] Data stored in cache with key: ${writeCacheKey}`);
      } catch (e) {
        console.warn(`[MediaCache] Error writing to client cache with key ${writeCacheKey}:`, e);
      }
      return cacheDataToStore;
    }

    console.log('[MediaCache] No valid response from API');
    return { items: [], source: 'error' }; // Indicate error source

  } catch (error) {
    // Enhanced error logging
    let errorDetails = error.message;
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorDetails = `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}, Headers: ${JSON.stringify(error.response.headers)}`;
      console.error('[MediaCache] API Error Response:', error.response);
    } else if (error.request) {
      // The request was made but no response was received
      errorDetails = 'No response received from server.';
      console.error('[MediaCache] API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[MediaCache] API Request Setup Error:', error.message);
    }
    console.error(`[MediaCache] Full Error fetching from API: ${errorDetails}`, error);
     // Return error source and potentially empty items
    return { items: [], source: 'error' };
  }
};

// simplify to accept ISO string or number
export const shouldRefreshCache = (cacheTimestamp) => {
  if (!cacheTimestamp) return true; // Treat missing timestamp as expired
  const ts = typeof cacheTimestamp === 'number'
    ? cacheTimestamp
    : new Date(cacheTimestamp).getTime();
  if (isNaN(ts)) return true; // Treat invalid date as expired
  return Date.now() - ts > CACHE_EXPIRATION_TIME;
};
