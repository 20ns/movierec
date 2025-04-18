// src/services/mediaCache.js

import axios from 'axios';

const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL;
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

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
    token
  } = options;
  
  try {
    console.log('[MediaCache] Attempting to fetch from DynamoDB cache');
    
    // Call the API Gateway endpoint that triggers your Lambda
    const response = await axios.get(
      `${API_GATEWAY_URL}/media-recommendations`,
      {
        params: {
          mediaType,
          limit,
          exclude: excludeIds.join(',')
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {},
      }
    );
    
    if (response.status === 200 && response.data && Array.isArray(response.data.items)) {
      console.log(`[MediaCache] Successfully fetched ${response.data.items.length} items from cache`);
      
      // Map the DynamoDB structure to the format expected by components
      const mappedItems = response.data.items.map(item => ({
        id: parseInt(item.mediaId, 10),
        media_type: item.mediaType,
        title: item.title,
        name: item.title, // Duplicate for consistency
        overview: item.overview,
        poster_path: item.posterPath,
        backdrop_path: item.backdropPath,
        vote_average: item.voteAverage,
        release_date: item.releaseDate,
        popularity: item.popularity,
        genre_ids: item.genres ? item.genres.split('|').map(g => parseInt(g, 10)) : [],
      }));
      
      return {
        items: mappedItems,
        source: 'cache'
      };
    }
    
    console.log('[MediaCache] No valid response from cache');
    return { items: [], source: null };
  } catch (error) {
    console.error('[MediaCache] Error fetching from cache:', error);
    return { items: [], source: null };
  }
};

/**
 * Checks if a media cache source should be refreshed
 * @param {String} cacheTimestamp ISO date string of when the cache was created 
 * @returns {Boolean} Whether the cache should be refreshed
 */
export const shouldRefreshCache = (cacheTimestamp) => {
  if (!cacheTimestamp) return true;
  
  try {
    const timestamp = new Date(cacheTimestamp).getTime();
    const now = Date.now();
    return now - timestamp > CACHE_EXPIRATION_TIME;
  } catch (error) {
    return true;
  }
};
