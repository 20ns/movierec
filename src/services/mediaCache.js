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
    limit = 6, // *** Changed default limit to 6 ***
    excludeIds = [],
    token,
    preferences = {},
    favoriteIds = [],
    watchlistIds = [],
    forceRefresh = false, // Destructure forceRefresh
  } = options;

  // Ensure IDs are strings for consistency with backend/cache key
  const excludeIdsStr = excludeIds.map(String);
  const favoriteIdsStr = favoriteIds.map(String);
  const watchlistIdsStr = watchlistIds.map(String);

  // build a unique client-cache key including all relevant params
  const cacheKeyPayload = JSON.stringify({
      v: 2, // Version identifier for the cache structure
      mediaType,
      limit, // Include limit in cache key
      excludeIds: excludeIdsStr.sort(), // Sort for consistency
      preferences, // Assuming preferences object is stable or stringified consistently
      favoriteIds: favoriteIdsStr.sort(),
      watchlistIds: watchlistIdsStr.sort()
  });
   // Use a more robust hashing or encoding if needed, btoa might have issues with complex chars
  const cacheKey = CLIENT_CACHE_PREFIX + '_' + btoa(unescape(encodeURIComponent(cacheKeyPayload))); // Handle potential unicode

  // try client cache ONLY if forceRefresh is false
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const { timestamp, data } = JSON.parse(raw); // Expecting { timestamp, data: { items, source } }
        if (!shouldRefreshCache(timestamp)) {
          console.log('[MediaCache] Using client-side cache (forceRefresh=false)');
          // Ensure returning the nested structure { items, source }
          if (data && data.items && data.source) {
               return data;
          } else {
               // Clear invalid cache entry
               localStorage.removeItem(cacheKey);
          }
        } else {
           console.log('[MediaCache] Client cache expired');
           localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
        console.warn('[MediaCache] Error reading client cache:', e);
        localStorage.removeItem(cacheKey); // Clear potentially corrupted cache
    }
  } else {
      console.log('[MediaCache] Bypassing client cache (forceRefresh=true)');
  }


  // Proceed to API call if cache was skipped (forceRefresh=true) or missed/expired
  try {
    console.log(`[MediaCache] Attempting to fetch from Personalized API (forceRefresh=${forceRefresh})`);
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
          // limit: limit, // Lambda now defaults to 6, no need to send unless overriding
          // Pass user data for personalization
          exclude: excludeIdsStr.join(','), // Keep param name 'exclude' as expected by Lambda
          ...(Object.keys(preferences).length > 0 && { preferences: JSON.stringify(preferences) }),
          ...(favoriteIdsStr.length > 0 && { favorites: favoriteIdsStr.join(',') }),
          ...(watchlistIdsStr.length > 0 && { watchlist: watchlistIdsStr.join(',') }),
        },
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
         timeout: 15000 // Add a timeout (e.g., 15 seconds)
      }
    );

    if (response.status === 200 && response.data && Array.isArray(response.data.items)) {
      const fetchedItems = response.data.items;
      const source = response.data.source || 'personalized_lambda'; // Get source from response
      console.log(`[MediaCache] Successfully fetched ${fetchedItems.length} items from ${source}`);

      // Map to frontend format (ensure keys match MediaCard expectations)
      const mappedItems = fetchedItems.map(item => ({
        id: parseInt(item.mediaId, 10), // Ensure ID is number if needed by frontend
        media_type: item.mediaType,
        title: item.title,
        name: item.title, // Keep 'name' for compatibility if used
        overview: item.overview,
        poster_path: item.posterPath,
        backdrop_path: item.backdropPath,
        vote_average: item.voteAverage,
        release_date: item.releaseDate,
        popularity: item.popularity,
        // Parse genre IDs if needed, assuming 'genres' is pipe-separated IDs
        genre_ids: item.genres
                      ? item.genres.split('|').map(g => parseInt(g, 10)).filter(Number.isFinite)
                      : [],
        // Keep raw genre string if needed elsewhere
        genre: item.genre || null,
      }));

      // Store result { items, source } in client cache
      const cacheData = { items: mappedItems, source: source };
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: cacheData
        }));
      } catch (e) {
          console.warn('[MediaCache] Error writing to client cache:', e);
          // Consider clearing cache if quota exceeded: localStorage.clear();
      }

      return cacheData; // Return { items, source }
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
