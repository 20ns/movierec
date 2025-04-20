// tmdbEnricher.js - Utility to enrich media items with data from TMDb API

// Cache to avoid redundant API calls
const detailsCache = new Map();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Enriches a media item with details from TMDb API
 * @param {Object} item - Media item to enrich
 * @returns {Promise<Object>} - Enriched media item
 */
export const enrichWithTmdbData = async (item) => {
  if (!item || !item.mediaId) return item;
  
  const cacheKey = `${item.mediaType}-${item.mediaId}`;
  const now = Date.now();
  
  // Check cache first
  if (detailsCache.has(cacheKey)) {
    const cachedData = detailsCache.get(cacheKey);
    if (now - cachedData.timestamp < CACHE_EXPIRY) {
      return { ...item, ...cachedData.data };
    }
  }
  
  // If item already has a rating, just return it
  if ((item.voteAverage && item.voteAverage > 0) || (item.vote_average && item.vote_average > 0)) {
    return item;
  }
  
  try {
    const mediaType = item.mediaType === 'movie' ? 'movie' : 'tv';
    const response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${item.mediaId}?api_key=${process.env.REACT_APP_TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch details for ${mediaType} ${item.mediaId}`);
      return item;
    }
    
    const tmdbData = await response.json();
    
    // Store in cache
    detailsCache.set(cacheKey, {
      data: {
        voteAverage: tmdbData.vote_average || 0,
        vote_average: tmdbData.vote_average || 0,
        popularity: tmdbData.popularity || 0,
        // Add any other fields you want to enrich
      },
      timestamp: now
    });
    
    // Return enriched item
    return {
      ...item,
      voteAverage: tmdbData.vote_average || item.voteAverage || 0,
      vote_average: tmdbData.vote_average || item.vote_average || 0,
      popularity: tmdbData.popularity || item.popularity || 0,
      // Add any other fields you want to enrich
    };
  } catch (error) {
    console.error(`Error fetching TMDb data for ${item.mediaType} ${item.mediaId}:`, error);
    return item;
  }
};

/**
 * Enriches an array of media items with details from TMDb API
 * @param {Array} items - Array of media items to enrich
 * @returns {Promise<Array>} - Array of enriched media items
 */
export const enrichItemsWithTmdbData = async (items) => {
  if (!items || !Array.isArray(items)) return items;
  
  // Filter items that need enrichment (missing ratings)
  const itemsToEnrich = items.filter(
    item => !((item.voteAverage && item.voteAverage > 0) || (item.vote_average && item.vote_average > 0))
  );
  
  if (itemsToEnrich.length === 0) return items;
  
  try {
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    const enrichedItems = [...items];
    
    for (let i = 0; i < itemsToEnrich.length; i += batchSize) {
      const batch = itemsToEnrich.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(batch.map(item => enrichWithTmdbData(item)));
      
      // Update the original array with enriched items
      enrichedBatch.forEach(enrichedItem => {
        const index = enrichedItems.findIndex(i => i.mediaId === enrichedItem.mediaId);
        if (index !== -1) {
          enrichedItems[index] = enrichedItem;
        }
      });
      
      // Add a small delay to avoid rate limiting
      if (i + batchSize < itemsToEnrich.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return enrichedItems;
  } catch (error) {
    console.error('Error enriching items with TMDb data:', error);
    return items;
  }
};
