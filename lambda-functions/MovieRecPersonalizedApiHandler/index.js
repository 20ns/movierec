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

  // PHASE 1 ENHANCEMENT: Analyze user's favorites to extract content DNA patterns
  async analyzeFavoritesContentDNA(favorites) {
    if (!favorites || favorites.length === 0) {
      return {
        preferredActors: [],
        preferredDirectors: [],
        genreDistribution: {},
        decadePreferences: {},
        ratingPatterns: { average: 0, count: 0 },
        contentThemes: []
      };
    }

    const patterns = {
      preferredActors: [],
      preferredDirectors: [],
      genreDistribution: {},
      decadePreferences: {},
      ratingPatterns: { average: 0, count: 0 },
      contentThemes: []
    };

    // Enrich favorites with detailed metadata if not already done
    const enrichedFavorites = await this.enrichFavoritesMetadata(favorites);
    
    // Extract actor patterns
    const actorFrequency = {};
    enrichedFavorites.forEach(fav => {
      if (fav.cast && Array.isArray(fav.cast)) {
        fav.cast.slice(0, 5).forEach(actor => {
          if (actor.name) {
            const weight = this.calculateTemporalWeight(fav.addedAt);
            actorFrequency[actor.name] = (actorFrequency[actor.name] || 0) + weight;
          }
        });
      }
    });

    patterns.preferredActors = Object.entries(actorFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, frequency]) => ({ name, frequency: Math.round(frequency * 100) / 100 }));

    // Extract director patterns
    const directorFrequency = {};
    enrichedFavorites.forEach(fav => {
      if (fav.crew && Array.isArray(fav.crew)) {
        const directors = fav.crew.filter(person => person.job === 'Director');
        directors.forEach(director => {
          if (director.name) {
            const weight = this.calculateTemporalWeight(fav.addedAt);
            directorFrequency[director.name] = (directorFrequency[director.name] || 0) + weight;
          }
        });
      }
    });

    patterns.preferredDirectors = Object.entries(directorFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, frequency]) => ({ name, frequency: Math.round(frequency * 100) / 100 }));

    // Analyze genre distribution with temporal weighting
    enrichedFavorites.forEach(fav => {
      if (fav.genres && Array.isArray(fav.genres)) {
        const weight = this.calculateTemporalWeight(fav.addedAt);
        fav.genres.forEach(genre => {
          patterns.genreDistribution[genre.id] = (patterns.genreDistribution[genre.id] || 0) + weight;
        });
      }
    });

    // Analyze decade preferences
    enrichedFavorites.forEach(fav => {
      const year = this.extractYear(fav.releaseDate || fav.release_date || fav.first_air_date);
      if (year) {
        const decade = Math.floor(year / 10) * 10;
        const weight = this.calculateTemporalWeight(fav.addedAt);
        patterns.decadePreferences[decade] = (patterns.decadePreferences[decade] || 0) + weight;
      }
    });

    // Calculate rating patterns
    const validRatings = enrichedFavorites
      .map(fav => fav.voteAverage || fav.vote_average)
      .filter(rating => rating && rating > 0);

    if (validRatings.length > 0) {
      patterns.ratingPatterns = {
        average: validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length,
        count: validRatings.length,
        minimum: Math.min(...validRatings),
        maximum: Math.max(...validRatings)
      };
    }

    console.log(`Analyzed ${enrichedFavorites.length} favorites: ${patterns.preferredActors.length} actors, ${patterns.preferredDirectors.length} directors`);
    return patterns;
  }

  // PHASE 1 ENHANCEMENT: Calculate temporal weight for preferences (recent = more important)
  calculateTemporalWeight(addedAt, maxDays = 180) {
    if (!addedAt) return 0.5; // Default weight for unknown dates
    
    const daysSince = (Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: recent favorites weighted higher
    // Weight decreases to ~37% after maxDays/3, ~13% after maxDays*2/3
    return Math.exp(-daysSince / (maxDays / 3));
  }

  // PHASE 1 ENHANCEMENT: Calculate watchlist influence on recommendations
  calculateWatchlistInfluence(candidate, watchlist) {
    if (!watchlist || watchlist.length === 0) return 0;

    let influenceScore = 0;
    
    watchlist.forEach(watchItem => {
      const similarity = this.calculateContentSimilarity(candidate, watchItem);
      if (similarity > 0.6) {
        // Strong positive signal for similar content
        const recency = this.calculateTemporalWeight(watchItem.addedAt);
        influenceScore += similarity * 20 * recency;
      }
    });
    
    return Math.min(influenceScore, 50); // Cap at 50 points
  }

  // PHASE 1 ENHANCEMENT: Enhanced content similarity calculation
  calculateContentSimilarity(content1, content2) {
    let similarity = 0;
    
    // Genre similarity (40% weight)
    if (content1.genres && content2.genres) {
      const genreOverlap = this.calculateGenreOverlap(content1.genres, content2.genres);
      similarity += genreOverlap * 0.4;
    }
    
    // Cast similarity (30% weight)
    if (content1.cast && content2.cast) {
      const castOverlap = this.calculateCastOverlap(content1.cast, content2.cast);
      similarity += castOverlap * 0.3;
    }
    
    // Director similarity (30% weight)
    if (this.shareDirector(content1, content2)) {
      similarity += 0.3;
    }
    
    return Math.min(similarity, 1.0);
  }

  // Helper method to calculate genre overlap
  calculateGenreOverlap(genres1, genres2) {
    if (!genres1 || !genres2 || genres1.length === 0 || genres2.length === 0) return 0;
    
    const ids1 = new Set(genres1.map(g => g.id || g));
    const ids2 = new Set(genres2.map(g => g.id || g));
    
    const intersection = new Set([...ids1].filter(x => ids2.has(x)));
    const union = new Set([...ids1, ...ids2]);
    
    return intersection.size / union.size;
  }

  // Helper method to calculate cast overlap
  calculateCastOverlap(cast1, cast2) {
    if (!cast1 || !cast2 || cast1.length === 0 || cast2.length === 0) return 0;
    
    const names1 = new Set(cast1.slice(0, 10).map(actor => actor.name).filter(name => name));
    const names2 = new Set(cast2.slice(0, 10).map(actor => actor.name).filter(name => name));
    
    const intersection = new Set([...names1].filter(x => names2.has(x)));
    const maxSize = Math.max(names1.size, names2.size);
    
    return maxSize > 0 ? intersection.size / maxSize : 0;
  }

  // Helper method to check if content shares directors
  shareDirector(content1, content2) {
    if (!content1.crew || !content2.crew) return false;
    
    const directors1 = content1.crew.filter(person => person.job === 'Director').map(d => d.name);
    const directors2 = content2.crew.filter(person => person.job === 'Director').map(d => d.name);
    
    return directors1.some(director => directors2.includes(director));
  }

  // Helper method to extract year from date string
  extractYear(dateString) {
    if (!dateString) return null;
    const year = parseInt(dateString.substring(0, 4));
    return isNaN(year) ? null : year;
  }

  // Helper method to enrich favorites with metadata if needed
  async enrichFavoritesMetadata(favorites) {
    const enriched = [];
    
    for (const favorite of favorites) {
      // If favorite already has detailed metadata, use it
      if (favorite.cast && favorite.crew && favorite.genres) {
        enriched.push(favorite);
        continue;
      }
      
      // Otherwise, fetch metadata from TMDB
      try {
        const mediaType = favorite.mediaType || (favorite.title ? 'movie' : 'tv');
        const response = await cachedTmdbRequest(
          `https://api.themoviedb.org/3/${mediaType}/${favorite.mediaId}?api_key=${this.tmdbApiKey}&append_to_response=credits`
        );
        
        if (response?.data) {
          enriched.push({
            ...favorite,
            genres: response.data.genres || [],
            cast: response.data.credits?.cast || [],
            crew: response.data.credits?.crew || [],
            vote_average: response.data.vote_average || favorite.voteAverage,
            release_date: response.data.release_date || response.data.first_air_date || favorite.releaseDate
          });
        } else {
          enriched.push(favorite);
        }
      } catch (error) {
        console.warn(`Failed to enrich favorite ${favorite.mediaId}:`, error);
        enriched.push(favorite);
      }
    }
    
    return enriched;
  }

  // PHASE 1 ENHANCEMENT: Build enhanced user profile for semantic analysis
  buildEnhancedUserProfile(preferences, favorites, watchlist) {
    const components = [];
    
    // Original preferences
    if (preferences.favoriteContent) {
      components.push(`Favorite content: ${preferences.favoriteContent}`);
    }
    
    if (preferences.moodPreferences) {
      components.push(`Mood preferences: ${preferences.moodPreferences}`);
    }
    
    // Enhanced with favorites data
    if (favorites && favorites.length > 0) {
      const recentFavorites = favorites
        .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
        .slice(0, 8)
        .map(fav => fav.title || fav.name)
        .filter(title => title);
      
      if (recentFavorites.length > 0) {
        components.push(`Recently loved: ${recentFavorites.join(', ')}`);
      }
    }
    
    // Add watchlist interests
    if (watchlist && watchlist.length > 0) {
      const recentWatchlist = watchlist
        .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
        .slice(0, 5)
        .map(item => item.title || item.name)
        .filter(title => title);
      
      if (recentWatchlist.length > 0) {
        components.push(`Want to watch: ${recentWatchlist.join(', ')}`);
      }
    }
    
    // Add favorite people from preferences
    if (preferences.favoritePeople) {
      if (preferences.favoritePeople.actors && preferences.favoritePeople.actors.length > 0) {
        components.push(`Favorite actors: ${preferences.favoritePeople.actors.join(', ')}`);
      }
      if (preferences.favoritePeople.directors && preferences.favoritePeople.directors.length > 0) {
        components.push(`Favorite directors: ${preferences.favoritePeople.directors.join(', ')}`);
      }
    }
    
    return components.filter(comp => comp && comp.length > 0).join('. ');
  }

  // Discover content candidates from multiple sources
  async discoverCandidates(mediaType, preferences, favorites, excludeIds) {
    const candidates = new Map(); // Use Map to avoid duplicates
    const maxCandidates = 80;
    const seenIds = new Set(excludeIds.map(id => parseInt(id, 10)));

    try {
      // Content discovery strategies
      const discoveryTasks = [];

      // 1. Genre-based discovery (using user's highest-rated genres)
      if (preferences.genreRatings) {
        const topGenres = Object.entries(preferences.genreRatings)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([genreId]) => genreId);

        for (const genreId of topGenres) {
          discoveryTasks.push(this.discoverByGenre(mediaType, genreId, 1));
        }
      }

      // 2. Similar to favorites (analyze user's stated favorites)
      if (preferences.favoriteContent) {
        const favoritesTitles = this.parseFavoriteContent(preferences.favoriteContent);
        for (const title of favoritesTitles.slice(0, 3)) {
          discoveryTasks.push(this.findSimilarToFavorite(mediaType, title));
        }
      }

      // 3. Discovery preference-based content
      const discoveryPref = preferences.contentDiscoveryPreference;
      if (discoveryPref?.includes('trending')) {
        discoveryTasks.push(this.discoverTrending(mediaType, 2));
      }
      if (discoveryPref?.includes('hiddenGems')) {
        discoveryTasks.push(this.discoverHiddenGems(mediaType, 2));
      }
      if (discoveryPref?.includes('awardWinning')) {
        discoveryTasks.push(this.discoverAwardWinning(mediaType, 2));
      }

      // 4. Fallback: Popular content
      discoveryTasks.push(this.discoverPopular(mediaType, 3));

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

    // 3. Semantic Similarity Score (20% weight - ENHANCED)
    const semanticScore = await this.calculateSemanticScore(candidate, preferences, userData);
    totalScore += semanticScore * 0.20;
    scoreBreakdown.semantic = semanticScore;

    // 4. Favorite Similarity Score (20% weight - ENHANCED)
    const similarityScore = await this.calculateFavoriteSimilarity(candidate, preferences, userData);
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

  // PHASE 1 ENHANCED: Calculate semantic similarity score with enhanced user profile
  async calculateSemanticScore(candidate, preferences, userData) {
    try {
      // Extract movie text representation
      const movieText = this.semanticScorer.extractMovieText(candidate);
      
      // Build enhanced user profile using favorites and watchlist
      const { favorites, watchlist } = userData || {};
      const enhancedUserText = this.buildEnhancedUserProfile(preferences, favorites, watchlist);
      
      // Fallback to original method if enhanced profile is too short
      const userText = enhancedUserText.length > 20 ? 
        enhancedUserText : 
        this.semanticScorer.extractUserPreferenceText(preferences);

      // Skip if no meaningful text available
      if (!movieText || movieText.length < 10 || !userText || userText.length < 10) {
        console.log('Insufficient text for semantic analysis, returning neutral score');
        return 50; // Neutral score
      }

      // Calculate semantic similarity
      const similarity = await this.semanticScorer.calculateSimilarity(userText, movieText);
      
      // Convert similarity (0-1) to score (0-100) with enhanced weighting
      const score = Math.max(0, Math.min(100, similarity * 100));
      
      console.log(`Enhanced semantic score for ${candidate.title || candidate.name}: ${score.toFixed(1)}`);
      return score;
    } catch (error) {
      console.warn('Enhanced semantic scoring failed, using neutral score:', error.message);
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

  // PHASE 1 ENHANCED: Advanced favorite similarity using content DNA and watchlist
  async calculateFavoriteSimilarity(candidate, preferences, userData) {
    let score = 50; // Base score

    const { favorites, watchlist } = userData;

    // 1. Enhanced cast similarity using favorites content DNA
    if (favorites && favorites.length > 0) {
      try {
        const contentDNA = await this.analyzeFavoritesContentDNA(favorites);
        
        // Check actor matches with temporal weighting
        if (contentDNA.preferredActors.length > 0 && candidate.cast) {
          const candidateActors = new Set(candidate.cast.map(actor => actor.name));
          
          for (const preferredActor of contentDNA.preferredActors) {
            if (candidateActors.has(preferredActor.name)) {
              // Higher score for more frequently liked actors
              const actorBonus = Math.min(preferredActor.frequency * 15, 25);
              score += actorBonus;
              break; // Avoid double-counting
            }
          }
        }
        
        // Check director matches with temporal weighting
        if (contentDNA.preferredDirectors.length > 0 && candidate.crew) {
          const candidateDirectors = new Set(
            candidate.crew.filter(person => person.job === 'Director').map(d => d.name)
          );
          
          for (const preferredDirector of contentDNA.preferredDirectors) {
            if (candidateDirectors.has(preferredDirector.name)) {
              // Higher score for more frequently liked directors
              const directorBonus = Math.min(preferredDirector.frequency * 20, 35);
              score += directorBonus;
              break; // Avoid double-counting
            }
          }
        }
        
        // Enhanced genre similarity using favorites distribution
        if (Object.keys(contentDNA.genreDistribution).length > 0 && candidate.genres) {
          let genreAlignment = 0;
          let totalWeight = 0;
          
          candidate.genres.forEach(genre => {
            const userPreference = contentDNA.genreDistribution[genre.id] || 0;
            genreAlignment += userPreference * 10; // Scale to meaningful range
            totalWeight += userPreference;
          });
          
          if (totalWeight > 0) {
            score += Math.min(genreAlignment / candidate.genres.length, 20);
          }
        }
        
        // Direct content similarity to favorites
        let maxSimilarity = 0;
        for (const favorite of favorites.slice(0, 10)) { // Limit for performance
          const similarity = this.calculateContentSimilarity(candidate, favorite);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }
        }
        score += maxSimilarity * 25; // Up to 25 points for content similarity
        
      } catch (error) {
        console.warn('Error analyzing favorites DNA:', error);
      }
    }

    // 2. Original preference-based matching (fallback)
    if (preferences.favoritePeople?.actors && candidate.cast) {
      const actorMatch = candidate.cast.some(actor => 
        preferences.favoritePeople.actors.includes(actor.name)
      );
      if (actorMatch) score += 20; // Reduced since we have enhanced version above
    }

    if (preferences.favoritePeople?.directors && candidate.crew) {
      const directorMatch = candidate.crew.some(crew => 
        crew.job === 'Director' && preferences.favoritePeople.directors.includes(crew.name)
      );
      if (directorMatch) score += 25; // Reduced since we have enhanced version above
    }

    // 3. Add watchlist influence
    const watchlistInfluence = this.calculateWatchlistInfluence(candidate, watchlist);
    score += watchlistInfluence;

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
