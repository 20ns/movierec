const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require('axios');
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { createApiResponse } = require("/opt/nodejs/shared/response");
const SemanticSimilarityScorer = require("./semanticScorer");

let verifier;
try {
  verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "access",
    clientId: process.env.COGNITO_CLIENT_ID,
  });
} catch (error) {
  console.error("Failed to create Cognito JWT verifier:", error);
}

// Initialize DynamoDB with retry configuration
const client = new DynamoDBClient({
    maxAttempts: 3,
    retryMode: 'standard'
});
const dynamoDB = DynamoDBDocumentClient.from(client);

// Create axios instance with timeout
const axiosInstance = axios.create({
    timeout: 20000 // 20 second timeout for API calls
});

// Enhanced rate limiter with better concurrency for API calls
const rateLimiter = {
    queue: [],
    running: 0,
    maxConcurrent: 5, // Increased for better performance
    
    async add(fn) {
        return new Promise((resolve) => {
            const run = async () => {
                this.running++;
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    console.error('Rate limiter error:', error);
                    resolve(null);
                } finally {
                    this.running--;
                    this.processQueue();
                }
            };
            
            if (this.running < this.maxConcurrent) {
                run();
            } else {
                this.queue.push(run);
            }
        });
    },
    
    processQueue() {
        if (this.queue.length > 0 && this.running < this.maxConcurrent) {
            const next = this.queue.shift();
            next();
        }
    }
};

// Add simple caching for TMDB results to improve performance
const tmdbCache = new Map();
const CACHE_TTL = 300000; // 5 minutes cache

function getCacheKey(url) {
    return url.replace(process.env.REACT_APP_TMDB_API_KEY, 'API_KEY');
}

async function cachedTmdbRequest(url) {
    const cacheKey = getCacheKey(url);
    const cached = tmdbCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    const response = await rateLimiter.add(async () => {
        return await axiosInstance.get(url);
    });
    
    if (response?.data) {
        tmdbCache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
        });
        
        // Clean cache if it gets too large
        if (tmdbCache.size > 100) {
            const oldestKey = tmdbCache.keys().next().value;
            tmdbCache.delete(oldestKey);
        }
    }
    
    return response;
}

// Advanced recommendation system with multi-factor scoring
class PersonalizedRecommendationEngine {
  constructor(tmdbApiKey) {
    this.tmdbApiKey = tmdbApiKey;
    this.semanticScorer = new SemanticSimilarityScorer();
    this.genreMap = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };
  }

  // Fetch user data (preferences, favorites, watchlist)
  async fetchUserData(userId) {
    try {
      const promises = [
        // Get user preferences
        dynamoDB.send(new GetCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: { userId }
        })),
        // Get user favorites
        dynamoDB.send(new QueryCommand({
          TableName: process.env.USER_FAVORITES_TABLE,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        })),
        // Get user watchlist
        dynamoDB.send(new QueryCommand({
          TableName: process.env.USER_WATCHLIST_TABLE,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        }))
      ];

      const [prefsResult, favoritesResult, watchlistResult] = await Promise.all(promises);

      return {
        preferences: prefsResult.Item || {},
        favorites: favoritesResult.Items || [],
        watchlist: watchlistResult.Items || []
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { preferences: {}, favorites: [], watchlist: [] };
    }
  }

  // Parse favorite content strings to extract titles
  parseFavoriteContent(favoriteContentString) {
    if (!favoriteContentString) return [];
    return favoriteContentString
      .split(',')
      .map(title => title.trim())
      .filter(title => title.length > 0);
  }

  // Get cached content from DynamoDB (pre-fetched data)
  async getCachedContent(category, mediaType, limit = 20) {
    try {
      // Use scan with filter for simplicity since we don't have a GSI yet
      // In production, you'd want to add a GSI on category + contentType
      const command = new BatchGetCommand({
        RequestItems: {
          [process.env.RECOMMENDATIONS_CACHE_TABLE]: {
            Keys: []
          }
        }
      });

      // Since we don't have a GSI, we'll try to get known cache keys
      // This is a simplified approach - in production you'd use a GSI
      const possibleKeys = [];
      for (let i = 1; i <= Math.min(limit, 50); i++) {
        possibleKeys.push({
          cacheKey: `${category}#${mediaType}#${i}` // This won't work perfectly
        });
      }

      // Alternative: Use direct cache key pattern matching
      // For now, let's use a simpler approach with known popular content IDs
      const knownPopularMovieIds = [550, 155, 13, 37165, 680, 27205, 862, 278, 497, 238];
      const knownPopularTVIds = [1399, 60625, 1396, 456, 1402, 63174, 18165, 60059, 94605, 85552];
      
      let itemsToFetch = [];
      if (category === 'popular' && mediaType === 'movie') {
        itemsToFetch = knownPopularMovieIds.slice(0, limit).map(id => ({
          cacheKey: `popular#movie#${id}`
        }));
      } else if (category === 'popular' && mediaType === 'tv') {
        itemsToFetch = knownPopularTVIds.slice(0, limit).map(id => ({
          cacheKey: `popular#tv#${id}`
        }));
      } else {
        // For other categories, return empty to force API fallback
        console.log(`No predefined cache keys for ${category}#${mediaType}, using API fallback`);
        return [];
      }

      if (itemsToFetch.length === 0) {
        return [];
      }

      command.RequestItems[process.env.RECOMMENDATIONS_CACHE_TABLE].Keys = itemsToFetch;
      
      const result = await dynamoDB.send(command);
      const items = result.Responses?.[process.env.RECOMMENDATIONS_CACHE_TABLE] || [];
      
      if (items.length > 0) {
        console.log(`Found ${items.length} cached items for ${category}#${mediaType}`);
        
        // Convert cached items back to TMDB format
        return items.map(item => ({
          id: parseInt(item.contentId),
          title: item.title,
          name: item.title,
          overview: item.overview,
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          vote_average: item.voteAverage,
          vote_count: item.voteCount,
          popularity: item.popularity,
          release_date: item.releaseDate,
          first_air_date: item.releaseDate,
          genre_ids: item.genreIds || [],
          original_language: item.originalLanguage,
          adult: item.adult,
          media_type: mediaType,
          cached: true, // Mark as cached for debugging
          fetchedAt: item.fetchedAt
        })).filter(item => item.id); // Filter out any invalid items
      }
      
      console.log(`No cached items found for ${category}#${mediaType}`);
      return [];
      
    } catch (error) {
      console.warn(`Error getting cached content for ${category}#${mediaType}:`, error);
      return [];
    }
  }

  // Enhanced discovery with cache-first approach
  async discoverCandidates(mediaType, preferences, favorites, excludeIds) {
    const candidates = new Map(); // Use Map to avoid duplicates
    const maxCandidates = 80;
    const seenIds = new Set(excludeIds.map(id => parseInt(id, 10)));

    try {
      console.log('Starting cache-first content discovery...');
      
      // Content discovery strategies with cache-first approach
      const discoveryTasks = [];

      // 1. Cache-first: Popular content (try cache first, fallback to API)
      discoveryTasks.push(this.discoverPopularCacheFirst(mediaType, 2));

      // 2. Cache-first: Trending content
      const discoveryPref = preferences.contentDiscoveryPreference;
      if (discoveryPref?.includes('trending')) {
        discoveryTasks.push(this.discoverTrendingCacheFirst(mediaType, 2));
      }

      // 3. Cache-first: Hidden gems and award-winning
      if (discoveryPref?.includes('hiddenGems')) {
        discoveryTasks.push(this.discoverHiddenGemsCacheFirst(mediaType, 1));
      }
      if (discoveryPref?.includes('awardWinning')) {
        discoveryTasks.push(this.discoverAwardWinningCacheFirst(mediaType, 1));
      }

      // 4. Genre-based discovery (cache-first for top genres)
      if (preferences.genreRatings) {
        const topGenres = Object.entries(preferences.genreRatings)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3) // Reduced to top 3 genres
          .map(([genreId]) => genreId);

        for (const genreId of topGenres) {
          discoveryTasks.push(this.discoverGenreCacheFirst(mediaType, genreId, 1));
        }
      }

      // 5. Similar to favorites (still uses API as it's user-specific)
      if (preferences.favoriteContent) {
        const favoritesTitles = this.parseFavoriteContent(preferences.favoriteContent);
        for (const title of favoritesTitles.slice(0, 2)) { // Reduced to 2 titles
          discoveryTasks.push(this.findSimilarToFavorite(mediaType, title));
        }
      }

      // 6. Fallback: API-based popular content if cache fails
      discoveryTasks.push(this.discoverPopular(mediaType, 1)); // Reduced pages

      // Execute all discovery tasks in parallel
      const discoveryResults = await Promise.all(discoveryTasks);

      // Collect candidates
      for (const results of discoveryResults) {
        for (const item of results) {
          if (candidates.size >= maxCandidates) break;
          if (seenIds.has(item.id)) continue;
          if (!candidates.has(item.id)) {
            candidates.set(item.id, {
              ...item,
              mediaType: item.media_type || (item.title ? 'movie' : 'tv')
            });
          }
        }
      }

      console.log(`Discovered ${candidates.size} candidate items`);
      return Array.from(candidates.values());

    } catch (error) {
      console.error('Error discovering candidates:', error);
      return [];
    }
  }

  // Discovery methods
  async discoverByGenre(mediaType, genreId, pages = 1) {
    const results = [];
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];

    for (const type of types) {
      for (let page = 1; page <= pages; page++) {
        const response = await cachedTmdbRequest(
          `https://api.themoviedb.org/3/discover/${type}?api_key=${this.tmdbApiKey}&with_genres=${genreId}&page=${page}&sort_by=vote_average.desc&vote_count.gte=100`
        );

        if (response?.data?.results) {
          results.push(...response.data.results);
        }
      }
    }
    return results;
  }

  async findSimilarToFavorite(mediaType, favoriteTitle) {
    const results = [];
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];

    for (const type of types) {
      try {
        // Search for the favorite title
        const searchResponse = await cachedTmdbRequest(
          `https://api.themoviedb.org/3/search/${type}?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(favoriteTitle)}`
        );

        if (searchResponse?.data?.results?.[0]) {
          const foundItem = searchResponse.data.results[0];
          
          // Get similar content
          const similarResponse = await cachedTmdbRequest(
            `https://api.themoviedb.org/3/${type}/${foundItem.id}/similar?api_key=${this.tmdbApiKey}`
          );

          if (similarResponse?.data?.results) {
            results.push(...similarResponse.data.results.slice(0, 10));
          }

          // Also get recommendations
          const recResponse = await cachedTmdbRequest(
            `https://api.themoviedb.org/3/${type}/${foundItem.id}/recommendations?api_key=${this.tmdbApiKey}`
          );

          if (recResponse?.data?.results) {
            results.push(...recResponse.data.results.slice(0, 10));
          }
        }
      } catch (error) {
        console.error(`Error finding similar to ${favoriteTitle}:`, error);
      }
    }
    return results;
  }

  async discoverTrending(mediaType, pages = 1) {
    const results = [];
    for (let page = 1; page <= pages; page++) {
      const endpoint = mediaType === 'both' ? 'all' : mediaType;
      const response = await cachedTmdbRequest(
        `https://api.themoviedb.org/3/trending/${endpoint}/week?api_key=${this.tmdbApiKey}&page=${page}`
      );

      if (response?.data?.results) {
        results.push(...response.data.results);
      }
    }
    return results;
  }

  async discoverHiddenGems(mediaType, pages = 1) {
    const results = [];
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];

    for (const type of types) {
      for (let page = 1; page <= pages; page++) {
        const response = await cachedTmdbRequest(
          `https://api.themoviedb.org/3/discover/${type}?api_key=${this.tmdbApiKey}&page=${page}&sort_by=vote_average.desc&vote_count.gte=50&vote_count.lte=500`
        );

        if (response?.data?.results) {
          results.push(...response.data.results);
        }
      }
    }
    return results;
  }

  async discoverAwardWinning(mediaType, pages = 1) {
    const results = [];
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];

    for (const type of types) {
      for (let page = 1; page <= pages; page++) {
        const response = await cachedTmdbRequest(
          `https://api.themoviedb.org/3/discover/${type}?api_key=${this.tmdbApiKey}&page=${page}&sort_by=vote_average.desc&vote_count.gte=1000`
        );

        if (response?.data?.results) {
          results.push(...response.data.results);
        }
      }
    }
    return results;
  }

  async discoverPopular(mediaType, pages = 1) {
    const results = [];
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];

    for (const type of types) {
      for (let page = 1; page <= pages; page++) {
        const response = await cachedTmdbRequest(
          `https://api.themoviedb.org/3/${type}/popular?api_key=${this.tmdbApiKey}&page=${page}`
        );

        if (response?.data?.results) {
          results.push(...response.data.results);
        }
      }
    }
    return results;
  }

  // Cache-first discovery methods
  async discoverPopularCacheFirst(mediaType, pages = 2) {
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];
    const results = [];
    
    for (const type of types) {
      // Try cache first
      const cachedItems = await this.getCachedContent('popular', type, pages * 20);
      if (cachedItems.length > 0) {
        results.push(...cachedItems);
        console.log(`Using ${cachedItems.length} cached popular ${type} items`);
      } else {
        // Fallback to API
        console.log(`No cached popular ${type} items, falling back to API`);
        const apiItems = await this.discoverPopular(type, Math.min(pages, 1));
        results.push(...apiItems);
      }
    }
    
    return results;
  }

  async discoverTrendingCacheFirst(mediaType, pages = 1) {
    const types = mediaType === 'both' ? ['movie', 'tv', 'all'] : [mediaType];
    const results = [];
    
    for (const type of types) {
      const cachedItems = await this.getCachedContent('trending', type, pages * 20);
      if (cachedItems.length > 0) {
        results.push(...cachedItems);
        console.log(`Using ${cachedItems.length} cached trending ${type} items`);
      } else {
        console.log(`No cached trending ${type} items, falling back to API`);
        const apiItems = await this.discoverTrending(type === 'all' ? 'both' : type, Math.min(pages, 1));
        results.push(...apiItems);
      }
    }
    
    return results;
  }

  async discoverHiddenGemsCacheFirst(mediaType, pages = 1) {
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];
    const results = [];
    
    for (const type of types) {
      const cachedItems = await this.getCachedContent('hidden_gems', type, pages * 20);
      if (cachedItems.length > 0) {
        results.push(...cachedItems);
        console.log(`Using ${cachedItems.length} cached hidden gems ${type} items`);
      } else {
        console.log(`No cached hidden gems ${type} items, falling back to API`);
        const apiItems = await this.discoverHiddenGems(type, Math.min(pages, 1));
        results.push(...apiItems);
      }
    }
    
    return results;
  }

  async discoverAwardWinningCacheFirst(mediaType, pages = 1) {
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];
    const results = [];
    
    for (const type of types) {
      const cachedItems = await this.getCachedContent('award_winning', type, pages * 20);
      if (cachedItems.length > 0) {
        results.push(...cachedItems);
        console.log(`Using ${cachedItems.length} cached award-winning ${type} items`);
      } else {
        console.log(`No cached award-winning ${type} items, falling back to API`);
        const apiItems = await this.discoverAwardWinning(type, Math.min(pages, 1));
        results.push(...apiItems);
      }
    }
    
    return results;
  }

  async discoverGenreCacheFirst(mediaType, genreId, pages = 1) {
    const types = mediaType === 'both' ? ['movie', 'tv'] : [mediaType];
    const results = [];
    
    for (const type of types) {
      const cachedItems = await this.getCachedContent(`genre_${genreId}`, type, pages * 20);
      if (cachedItems.length > 0) {
        results.push(...cachedItems);
        console.log(`Using ${cachedItems.length} cached genre ${genreId} ${type} items`);
      } else {
        console.log(`No cached genre ${genreId} ${type} items, falling back to API`);
        const apiItems = await this.discoverByGenre(type, genreId, Math.min(pages, 1));
        results.push(...apiItems);
      }
    }
    
    return results;
  }

  // Enrich candidates with detailed metadata
  async enrichCandidates(candidates) {
    const enrichedCandidates = [];
    const batchSize = 10;

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const enrichPromises = batch.map(candidate => this.enrichSingleCandidate(candidate));
      
      const enrichedBatch = await Promise.all(enrichPromises);
      enrichedCandidates.push(...enrichedBatch.filter(item => item !== null));
    }

    return enrichedCandidates;
  }

  async enrichSingleCandidate(candidate) {
    try {
      const type = candidate.mediaType;
      const response = await cachedTmdbRequest(
        `https://api.themoviedb.org/3/${type}/${candidate.id}?api_key=${this.tmdbApiKey}&append_to_response=credits,keywords`
      );

      if (!response?.data) return null;

      const data = response.data;
      return {
        ...candidate,
        enriched: true,
        genres: data.genres || [],
        runtime: data.runtime || data.episode_run_time?.[0] || 0,
        cast: data.credits?.cast?.slice(0, 10) || [],
        crew: data.credits?.crew?.slice(0, 10) || [],
        keywords: data.keywords?.keywords || data.keywords?.results || [],
        voteAverage: data.vote_average || 0,
        voteCount: data.vote_count || 0,
        popularity: data.popularity || 0,
        originalLanguage: data.original_language || 'en',
        adult: data.adult || false
      };
    } catch (error) {
      console.error(`Error enriching candidate ${candidate.id}:`, error);
      return candidate; // Return un-enriched if enrichment fails
    }
  }

  // Advanced scoring algorithm with semantic enhancement
  async calculateContentScore(candidate, preferences, userData) {
    let totalScore = 0;
    const scoreBreakdown = {};

    // 1. Genre Match Score (35% weight - reduced from 40%)
    const genreScore = this.calculateGenreScore(candidate, preferences);
    totalScore += genreScore * 0.35;
    scoreBreakdown.genre = genreScore;

    // 2. Deal-breaker Check (VETO power)
    const dealBreakerPenalty = this.checkDealBreakers(candidate, preferences);
    if (dealBreakerPenalty === -1000) {
      return { score: -1000, breakdown: { dealBreaker: true } };
    }
    totalScore += dealBreakerPenalty;
    scoreBreakdown.dealBreaker = dealBreakerPenalty;

    // 3. Semantic Similarity Score (20% weight - NEW)
    const semanticScore = await this.calculateSemanticScore(candidate, preferences);
    totalScore += semanticScore * 0.20;
    scoreBreakdown.semantic = semanticScore;

    // 4. Favorite Similarity Score (20% weight - reduced from 25%)
    const similarityScore = this.calculateFavoriteSimilarity(candidate, preferences, userData);
    totalScore += similarityScore * 0.20;
    scoreBreakdown.similarity = similarityScore;

    // 5. Context Match Score (10% weight - reduced from 15%)
    const contextScore = this.calculateContextScore(candidate, preferences);
    totalScore += contextScore * 0.10;
    scoreBreakdown.context = contextScore;

    // 6. Discovery Preference Score (10% weight - unchanged)
    const discoveryScore = this.calculateDiscoveryScore(candidate, preferences);
    totalScore += discoveryScore * 0.10;
    scoreBreakdown.discovery = discoveryScore;

    // 7. Quality Score (5% weight - reduced from 10%)
    const qualityScore = this.calculateQualityScore(candidate);
    totalScore += qualityScore * 0.05;
    scoreBreakdown.quality = qualityScore;

    return { score: totalScore, breakdown: scoreBreakdown };
  }

  // NEW: Calculate semantic similarity score
  async calculateSemanticScore(candidate, preferences) {
    try {
      // Extract text representations
      const movieText = this.semanticScorer.extractMovieText(candidate);
      const userText = this.semanticScorer.extractUserPreferenceText(preferences);

      // Skip if no meaningful text available
      if (!movieText || movieText.length < 10 || !userText || userText.length < 10) {
        console.log('Insufficient text for semantic analysis, returning neutral score');
        return 50; // Neutral score
      }

      // Calculate semantic similarity
      const similarity = await this.semanticScorer.calculateSimilarity(userText, movieText);
      
      // Convert similarity (0-1) to score (0-100) and add slight boost for semantic matches
      const score = Math.max(0, Math.min(100, similarity * 100));
      
      console.log(`Semantic score for ${candidate.title || candidate.name}: ${score.toFixed(1)}`);
      return score;
    } catch (error) {
      console.warn('Semantic scoring failed, using neutral score:', error.message);
      return 50; // Neutral fallback score
    }
  }

  calculateGenreScore(candidate, preferences) {
    if (!preferences.genreRatings || !candidate.genres) return 50;

    let totalWeight = 0;
    let weightedScore = 0;

    for (const genre of candidate.genres) {
      const rating = preferences.genreRatings[genre.id];
      if (rating !== undefined) {
        weightedScore += rating * 10; // Convert 1-10 to 10-100 scale
        totalWeight += 1;
      }
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 50;
  }

  checkDealBreakers(candidate, preferences) {
    if (!preferences.dealBreakers) return 0;

    const dealBreakers = preferences.dealBreakers;
    
    // Check various deal-breaker conditions
    if (dealBreakers.includes('violence') && this.hasExcessiveViolence(candidate)) {
      return -1000;
    }
    if (dealBreakers.includes('sexualContent') && this.hasSexualContent(candidate)) {
      return -1000;
    }
    if (dealBreakers.includes('profanity') && this.hasStrongLanguage(candidate)) {
      return -1000;
    }
    if (dealBreakers.includes('slowPace') && this.isSlowPaced(candidate)) {
      return -1000;
    }
    if (dealBreakers.includes('subtitles') && candidate.originalLanguage !== 'en') {
      return -1000;
    }

    return 0;
  }

  // Helper methods for deal-breaker checks
  hasExcessiveViolence(candidate) {
    const violentGenres = [28, 27, 53, 80]; // Action, Horror, Thriller, Crime
    return candidate.genres?.some(g => violentGenres.includes(g.id)) && candidate.voteAverage > 7;
  }

  hasSexualContent(candidate) {
    return candidate.adult || false;
  }

  hasStrongLanguage(candidate) {
    // This would require additional API calls to get content ratings
    // For now, use adult flag as proxy
    return candidate.adult || false;
  }

  isSlowPaced(candidate) {
    const slowGenres = [18, 36, 99]; // Drama, History, Documentary
    return candidate.genres?.some(g => slowGenres.includes(g.id)) && candidate.runtime > 150;
  }

  calculateFavoriteSimilarity(candidate, preferences, userData) {
    // This is a simplified similarity calculation
    // In a real system, you'd use more sophisticated similarity algorithms
    let score = 50;

    // Check if cast overlaps with user's favorite people
    if (preferences.favoritePeople?.actors && candidate.cast) {
      const actorMatch = candidate.cast.some(actor => 
        preferences.favoritePeople.actors.includes(actor.name)
      );
      if (actorMatch) score += 30;
    }

    // Check director overlap
    if (preferences.favoritePeople?.directors && candidate.crew) {
      const directorMatch = candidate.crew.some(crew => 
        crew.job === 'Director' && preferences.favoritePeople.directors.includes(crew.name)
      );
      if (directorMatch) score += 40;
    }

    return Math.min(score, 100);
  }

  calculateContextScore(candidate, preferences) {
    let score = 50;

    // Runtime preference
    if (preferences.runtimePreference) {
      const runtime = candidate.runtime || 90;
      if (preferences.runtimePreference === 'short' && runtime < 90) score += 20;
      if (preferences.runtimePreference === 'medium' && runtime >= 90 && runtime <= 120) score += 20;
      if (preferences.runtimePreference === 'long' && runtime > 120) score += 20;
    }

    // Language preference
    if (preferences.internationalContentPreference) {
      const isEnglish = candidate.originalLanguage === 'en';
      if (preferences.internationalContentPreference === 'englishPreferred' && isEnglish) score += 15;
      if (preferences.internationalContentPreference === 'veryOpen' && !isEnglish) score += 15;
    }

    return Math.min(score, 100);
  }

  calculateDiscoveryScore(candidate, preferences) {
    let score = 50;

    if (!preferences.contentDiscoveryPreference) return score;

    // Trending preference
    if (preferences.contentDiscoveryPreference.includes('trending')) {
      if (candidate.popularity > 50) score += 20;
    }

    // Hidden gems preference
    if (preferences.contentDiscoveryPreference.includes('hiddenGems')) {
      if (candidate.voteCount < 500 && candidate.voteAverage > 7) score += 25;
    }

    // Award winning preference
    if (preferences.contentDiscoveryPreference.includes('awardWinning')) {
      if (candidate.voteAverage > 8 && candidate.voteCount > 1000) score += 30;
    }

    return Math.min(score, 100);
  }

  calculateQualityScore(candidate) {
    const voteAverage = candidate.voteAverage || 0;
    const voteCount = candidate.voteCount || 0;

    // Weighted rating calculation (similar to IMDB's weighted rating)
    const minVotes = 25;
    const averageRating = 6.0; // Global average
    
    const weightedRating = (voteCount / (voteCount + minVotes)) * voteAverage + 
                          (minVotes / (voteCount + minVotes)) * averageRating;

    return Math.min(weightedRating * 10, 100); // Convert to 0-100 scale
  }

  // Main recommendation generation method
  async generatePersonalizedRecommendations(userId, mediaType, excludeIds, limit = 9) {
    console.log(`[${Date.now()}] Generating personalized recommendations for user ${userId}`);
    const startTime = Date.now();
    let stepTimes = {};

    try {
      // Step 1: Fetch user data
      const step1Start = Date.now();
      console.log('Step 1: Fetching user data...');
      const userData = await this.fetchUserData(userId);
      const { preferences } = userData;
      stepTimes.step1 = Date.now() - step1Start;

      // Log user preferences summary for debugging
      console.log(`User preferences summary: ${Object.keys(preferences).length} preference fields, ` +
        `${preferences.genreRatings ? Object.keys(preferences.genreRatings).length : 0} genre ratings, ` +
        `${preferences.dealBreakers?.length || 0} deal-breakers`);

      // Step 2: Discover candidates
      const step2Start = Date.now();
      console.log('Step 2: Discovering content candidates...');
      const candidates = await this.discoverCandidates(mediaType, preferences, userData.favorites, excludeIds);
      stepTimes.step2 = Date.now() - step2Start;
      
      if (candidates.length === 0) {
        console.log('No candidates found');
        return [];
      }

      // Step 3: Pre-filter candidates before enrichment for better performance
      const step3Start = Date.now();
      console.log(`Step 3: Pre-filtering and enriching ${candidates.length} candidates...`);
      
      // Quick filter based on basic criteria to reduce enrichment load
      const preFilteredCandidates = candidates.filter(candidate => {
        // Filter out adult content if user has deal-breakers
        if (preferences.dealBreakers?.includes('sexualContent') && candidate.adult) {
          return false;
        }
        // Filter out non-English content if user prefers English
        if (preferences.internationalContentPreference === 'englishPreferred' && 
            candidate.original_language !== 'en') {
          return false;
        }
        // Filter by minimum vote average for quality
        if ((candidate.vote_average || 0) < 4.0) {
          return false;
        }
        return true;
      });

      console.log(`Pre-filtered to ${preFilteredCandidates.length} candidates`);
      const topCandidates = preFilteredCandidates.slice(0, 30); // Reduced for better performance
      const enrichedCandidates = await this.enrichCandidates(topCandidates);
      stepTimes.step3 = Date.now() - step3Start;

      // Step 4: Score all candidates
      const step4Start = Date.now();
      console.log(`Step 4: Scoring ${enrichedCandidates.length} candidates...`);
      const scoredCandidates = await Promise.all(enrichedCandidates.map(async candidate => {
        const scoring = await this.calculateContentScore(candidate, preferences, userData);
        return {
          ...candidate,
          score: scoring.score,
          scoreBreakdown: scoring.breakdown,
          recommendationReason: this.generateRecommendationReason(candidate, scoring.breakdown, preferences)
        };
      }));
      stepTimes.step4 = Date.now() - step4Start;

      // Step 5: Filter and sort
      const step5Start = Date.now();
      const validCandidates = scoredCandidates
        .filter(item => item.score > -500) // Filter out deal-breakers and very low scores
        .sort((a, b) => b.score - a.score);
      stepTimes.step5 = Date.now() - step5Start;

      console.log(`Filtered to ${validCandidates.length} valid candidates with positive scores`);

      // Step 6: Apply diversity and select final recommendations
      const step6Start = Date.now();
      const finalRecommendations = this.applyDiversityFilter(validCandidates, limit);
      stepTimes.step6 = Date.now() - step6Start;

      const processingTime = Date.now() - startTime;
      console.log(`[${processingTime}ms] Generated ${finalRecommendations.length} recommendations`);
      console.log(`Step timings: ${JSON.stringify(stepTimes)}`);

      return finalRecommendations.map(item => ({
        mediaId: item.id.toString(),
        id: item.id.toString(), // For compatibility
        title: item.title || item.name,
        overview: item.overview || '',
        posterPath: item.poster_path || '',
        backdropPath: item.backdrop_path || '',
        voteAverage: item.voteAverage || 0,
        releaseDate: item.release_date || item.first_air_date || '',
        popularity: item.popularity || 0,
        mediaType: item.mediaType,
        genres: item.genres?.map(g => g.id).join('|') || '',
        score: item.score,
        recommendationReason: item.recommendationReason,
        processingTime: processingTime
      }));

    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return [];
    }
  }

  applyDiversityFilter(candidates, limit) {
    const selected = [];
    const usedGenres = new Set();
    const usedDecades = new Set();

    for (const candidate of candidates) {
      if (selected.length >= limit) break;

      // Check diversity criteria
      const mainGenre = candidate.genres?.[0]?.id;
      const releaseYear = new Date(candidate.release_date || candidate.first_air_date).getFullYear();
      const decade = Math.floor(releaseYear / 10) * 10;

      // Allow some repetition but prefer diversity
      if (selected.length < limit * 0.7 || !usedGenres.has(mainGenre) || !usedDecades.has(decade)) {
        selected.push(candidate);
        if (mainGenre) usedGenres.add(mainGenre);
        usedDecades.add(decade);
      }
    }

    // Fill remaining slots if we don't have enough
    for (const candidate of candidates) {
      if (selected.length >= limit) break;
      if (!selected.includes(candidate)) {
        selected.push(candidate);
      }
    }

    return selected;
  }

  generateRecommendationReason(candidate, scoreBreakdown, preferences) {
    const reasons = [];

    if (scoreBreakdown.genre > 70) {
      const genreNames = candidate.genres?.map(g => this.genreMap[g.id]).filter(Boolean).slice(0, 2);
      if (genreNames?.length) {
        reasons.push(`You rated ${genreNames.join(' and ')} highly`);
      }
    }

    // NEW: Add semantic reasoning
    if (scoreBreakdown.semantic > 70) {
      reasons.push('Matches your content preferences perfectly');
    } else if (scoreBreakdown.semantic > 60) {
      reasons.push('Aligns well with your interests');
    }

    if (scoreBreakdown.similarity > 70) {
      reasons.push('Similar to your favorites');
    }

    if (scoreBreakdown.quality > 80) {
      reasons.push(`Highly rated (${candidate.voteAverage?.toFixed(1)}/10)`);
    }

    if (scoreBreakdown.discovery > 70) {
      if (preferences.contentDiscoveryPreference?.includes('trending')) {
        reasons.push('Currently trending');
      }
      if (preferences.contentDiscoveryPreference?.includes('hiddenGems')) {
        reasons.push('Hidden gem you might love');
      }
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Personalized for you';
  }
}

// Updated main recommendation function
async function getRecommendations(mediaType, excludeIds, limit, userPreferences, userId) {
  const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    console.error('REACT_APP_TMDB_API_KEY environment variable not set');
    return [];
  }

  try {
    const engine = new PersonalizedRecommendationEngine(TMDB_API_KEY);
    const recommendations = await engine.generatePersonalizedRecommendations(
      userId, 
      mediaType, 
      excludeIds, 
      limit
    );
    
    return recommendations;
  } catch (error) {
    console.error('Error in recommendation engine:', error);
    return [];
  }
}

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle CORS preflight OPTIONS method
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  // Validate required environment variables
  if (!process.env.USER_PREFERENCES_TABLE || !process.env.REACT_APP_TMDB_API_KEY) {
    console.error("Required environment variables not set");
    return createApiResponse(500, { error: "Server configuration error" }, event);
  }

  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiResponse(401, { error: "Unauthorized" }, event);
    }

    const token = authHeader.substring(7);
    
    // Validate token format before processing
    if (!token || token.trim() === '') {
      console.error('Empty token after Bearer prefix');
      return createApiResponse(401, { error: "Token is empty" }, event);
    }
    
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid token format: expected 3 parts, got', tokenParts.length, 'token:', token.substring(0, 50));
      return createApiResponse(401, { 
        error: "Invalid JWT token format",
        details: `Expected 3 parts separated by dots, got ${tokenParts.length} parts`
      }, event);
    }
    
    let payload;
    
    if (process.env.IS_OFFLINE === 'true') {
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
      if (!verifier) {
        console.error("JWT verifier not available");
        return createApiResponse(500, { error: "JWT verifier configuration error" }, event);
      }
      try {
        payload = await verifier.verify(token);
      } catch (error) { // JWT token verification error
        console.error("Token verification error:", error);
        console.error("Token verification failed:", error);
        return createApiResponse(401, { error: "Authentication failed", details: "Invalid or expired token" }, event);
      }
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      try {
        const queryParams = event.queryStringParameters || {};
        const mediaType = queryParams.mediaType || 'both';
        const excludeIds = queryParams.exclude ? queryParams.exclude.split(',').map(id => id.trim()) : [];
        const limit = Math.min(parseInt(queryParams.limit) || 9, 9);
        
        let userPreferences = {};
        
        if (queryParams.preferences) {
          try {
            const queryPrefs = JSON.parse(queryParams.preferences);
            if (queryPrefs.preferences && typeof queryPrefs.preferences === 'object') {
              userPreferences = { ...queryPrefs, ...queryPrefs.preferences };
              delete userPreferences.preferences;
            } else {
              userPreferences = queryPrefs;
            }
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return createApiResponse(400, { error: "Invalid JSON in preferences parameter" }, event);
          }
        }
        
        if (!userPreferences || Object.keys(userPreferences).length === 0) {
          const preferencesCommand = new GetCommand({
            TableName: process.env.USER_PREFERENCES_TABLE,
            Key: { userId: userId }
          });
          const preferencesResult = await dynamoDB.send(preferencesCommand);
          userPreferences = preferencesResult.Item || {};
        }
        
        const recommendations = await getRecommendations(mediaType, excludeIds, limit, userPreferences, userId);

        return createApiResponse(200, {
          items: recommendations,
          source: 'personalized_lambda',
          userPreferences: userPreferences
        }, event);
      } catch (error) {
        console.error("Error getting recommendations:", error);
        return createApiResponse(500, { error: "Internal server error" }, event);
      }
    } else if (event.httpMethod === 'POST') {
      try {
        let requestBody = {};
        if (event.body) {
          try {
            requestBody = JSON.parse(event.body);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return createApiResponse(400, { error: "Invalid JSON in request body" }, event);
          }
        }

        const mediaType = requestBody.mediaType || 'both';
        const excludeIds = requestBody.exclude ? requestBody.exclude.split(',').map(id => id.trim()) : [];
        const limit = Math.min(parseInt(requestBody.limit) || 9, 9);
        
        let userPreferences = requestBody.preferences || {};
        
        if (!userPreferences || Object.keys(userPreferences).length === 0) {
          const preferencesCommand = new GetCommand({
            TableName: process.env.USER_PREFERENCES_TABLE,
            Key: { userId: userId }
          });
          const preferencesResult = await dynamoDB.send(preferencesCommand);
          userPreferences = preferencesResult.Item || {};
        }
        
        const recommendations = await getRecommendations(
          mediaType, 
          excludeIds, 
          limit, 
          userPreferences, 
          userId
        );

        return createApiResponse(200, {
          items: recommendations,
          source: 'personalized_lambda_post',
          userPreferences: userPreferences
        }, event);
      } catch (error) {
        console.error("Error getting recommendations (POST):", error);
        return createApiResponse(500, { error: "Internal server error" }, event);
      }
    } else {
      return createApiResponse(405, { error: "Method not allowed" }, event);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return createApiResponse(500, { error: "Internal server error" }, event);
  }
};
