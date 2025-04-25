// src/services/mediaCache.js

import axios from 'axios';

const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL;
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const CLIENT_CACHE_PREFIX = 'media_rec_cache';  // client‐side cache key prefix

/**
 * Fetches media recommendations from DynamoDB cache via API Gateway
 * @param {Object} options Options for fetching media
 * @param {String} options.mediaType 'movie', 'tv', or 'both'
 * @param {Number} options.limit Number of items to return
 * @param {Array} options.excludeIds Array of media IDs to exclude
 * @param {String} options.token JWT auth token
 * @returns {Promise<{items: Array, source: String}>} Media items and source info
 */
export const fetchCachedMedia = async (options = {}) => {
  const {
    mediaType = 'both',
    limit = 5,
    excludeIds = [],
    token,
    preferences = {},
    favoriteIds = [],
    watchlistIds = [],
  } = options;

  // build a unique client‐cache key
  const cacheKey = CLIENT_CACHE_PREFIX + '_' +
    btoa(JSON.stringify({ mediaType, limit, excludeIds, preferences, favoriteIds, watchlistIds }));
  // try client cache
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { timestamp, items } = JSON.parse(raw);
      if (!shouldRefreshCache(timestamp)) {
        console.log('[MediaCache] Using client‐side cache');
        return { items, source: 'client-cache' };
      }
    }
  } catch { /* ignore cache errors */ }

  try {
    console.log('[MediaCache] Attempting to fetch from DynamoDB cache');

    const response = await axios.get(
      `${API_GATEWAY_URL}/media-recommendations`,
      {
        params: {
          mediaType,
          limit,
          exclude: excludeIds.join(','),
          // pass user data so your Lambda can tailor the cache query
          ...(Object.keys(preferences).length && { preferences: JSON.stringify(preferences) }),
          ...(favoriteIds.length && { favorites: favoriteIds.join(',') }),
          ...(watchlistIds.length && { watchlist: watchlistIds.join(',') }),
        },
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      }
    );

    if (response.status === 200 && response.data && Array.isArray(response.data.items)) {
      console.log(`[MediaCache] Successfully fetched ${response.data.items.length} items from cache`);

      const mappedItems = response.data.items.map(item => ({
        id:        parseInt(item.mediaId, 10),
        media_type:item.mediaType,
        title:     item.title,
        name:      item.title,
        overview:  item.overview,
        poster_path:   item.posterPath,
        backdrop_path: item.backdropPath,
        vote_average:  item.voteAverage,
        release_date:  item.releaseDate,
        popularity:    item.popularity,   // raw popularity
        genre_ids:     item.genres
                          ? item.genres.split('|').map(g => parseInt(g,10))
                          : [],
        genre:         item.genre || null, // raw genre key (for GSI)
      }));
      // store in client cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          items: mappedItems
        }));
      } catch { /* ignore */ }

      return {
        items: mappedItems,
        source: 'cache',
      };
    }

    console.log('[MediaCache] No valid response from cache');
    return { items: [], source: null };
  } catch (error) {
    console.error('[MediaCache] Error fetching from cache:', error);
    return { items: [], source: null };
  }
};

// simplify to accept ISO string or number
export const shouldRefreshCache = (cacheTimestamp) => {
  const ts = typeof cacheTimestamp === 'number'
    ? cacheTimestamp
    : new Date(cacheTimestamp || 0).getTime();
  return Date.now() - ts > CACHE_EXPIRATION_TIME;
};
