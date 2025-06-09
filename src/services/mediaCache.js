import axios from 'axios';

const API_GATEWAY_URL = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const CLIENT_CACHE_PREFIX = 'media_rec_cache_v2';

/**
 * Fetches personalized media recommendations via API Gateway
 * @param {Object} options
 * @returns {Promise<{items: Array, source: String}>}
 */
export const fetchCachedMedia = async (options = {}) => {
  const {
    mediaType = 'both',
    limit = 6,
    excludeIds = [],
    token,
    preferences = {},
    favoriteIds = [],
    watchlistIds = [],
    forceRefresh = false,
  } = options;

  const currentExcludeIdsStr = excludeIds.map(String).sort();
  const favoriteIdsStr = favoriteIds.map(String).sort();
  const watchlistIdsStr = watchlistIds.map(String).sort();

  // Generate a cache key based on query parameters
  const generateCacheKey = (specificExcludeIds) => {
    const normalizedPreferences = {};
    if (preferences && typeof preferences === 'object' && preferences !== null) {
      Object.keys(preferences).sort().forEach(key => {
        if (preferences[key] !== undefined) {
          normalizedPreferences[key] = preferences[key];
        }
      });
    }
    const payload = JSON.stringify({
      v: 2, mediaType, limit,
      excludeIds: specificExcludeIds,
      preferences: normalizedPreferences,
      favoriteIds: favoriteIdsStr,
      watchlistIds: watchlistIdsStr,
    });
    return CLIENT_CACHE_PREFIX + '_' + btoa(unescape(encodeURIComponent(payload)));
  };

  const lookupCacheKey = generateCacheKey(currentExcludeIdsStr);
  const canonicalExcludeIdsForWrite = [];
  const writeCacheKey = forceRefresh ? generateCacheKey(canonicalExcludeIdsForWrite) : lookupCacheKey;

  // Try client cache if not forceRefresh
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
      localStorage.removeItem(lookupCacheKey);
    }
  } else {
    console.log(`[MediaCache] Bypassing client cache (forceRefresh=true). Will write to: ${writeCacheKey}`);
  }

  // Fetch from API if cache miss or forceRefresh
  try {
    console.log(`[MediaCache] Attempting to fetch from Personalized API (forceRefresh=${forceRefresh}, excludeIds=${currentExcludeIdsStr.join(',') || 'none'})`);
    if (!API_GATEWAY_URL) {
        console.error('[MediaCache] API_GATEWAY_URL is not defined.');
        return { items: [], source: 'error' };
    }

    const apiUrl = `${API_GATEWAY_URL}/recommendations`;
    const response = await axios.get(
      apiUrl,
      {
        params: {
          mediaType,
          exclude: currentExcludeIdsStr.join(','),
          ...(Object.keys(preferences).length > 0 && { preferences: JSON.stringify(preferences) }),
          ...(favoriteIdsStr.length > 0 && { favorites: favoriteIdsStr.join(',') }),
          ...(watchlistIdsStr.length > 0 && { watchlist: watchlistIdsStr.join(',') }),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 25000,
      }
    );

    if (response.status === 200 && response.data && Array.isArray(response.data.items)) {
      const fetchedItems = response.data.items;
      const source = response.data.source || 'personalized_lambda';

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

    return { items: [], source: 'error' };

  } catch (error) {
    let errorDetails = error.message;
    if (error.response) {
      errorDetails = `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}, Headers: ${JSON.stringify(error.response.headers)}`;
      console.error('[MediaCache] API Error Response:', error.response);
    } else if (error.request) {
      errorDetails = 'No response received from server.';
      console.error('[MediaCache] API No Response:', error.request);
    } else {
      console.error('[MediaCache] API Request Setup Error:', error.message);
    }
    console.error(`[MediaCache] Full Error fetching from API: ${errorDetails}`, error);
    return { items: [], source: 'error' };
  }
};

// Returns true if cache is expired or invalid
export const shouldRefreshCache = (cacheTimestamp) => {
  if (!cacheTimestamp) return true;
  const ts = typeof cacheTimestamp === 'number'
    ? cacheTimestamp
    : new Date(cacheTimestamp).getTime();
  if (isNaN(ts)) return true;
  return Date.now() - ts > CACHE_EXPIRATION_TIME;
};
