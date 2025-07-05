const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require('axios');
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { 
  extractOrigin, 
  createCorsPreflightResponse, 
  createCorsErrorResponse, 
  createCorsSuccessResponse 
} = require("./cors-utils");

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

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

  // Advanced scoring algorithm
  calculateContentScore(candidate, preferences, userData) {
    let totalScore = 0;
    const scoreBreakdown = {};

    // 1. Genre Match Score (40% weight)
    const genreScore = this.calculateGenreScore(candidate, preferences);
    totalScore += genreScore * 0.4;
    scoreBreakdown.genre = genreScore;

    // 2. Deal-breaker Check (VETO power)
    const dealBreakerPenalty = this.checkDealBreakers(candidate, preferences);
    if (dealBreakerPenalty === -1000) {
      return { score: -1000, breakdown: { dealBreaker: true } };
    }
    totalScore += dealBreakerPenalty;
    scoreBreakdown.dealBreaker = dealBreakerPenalty;

    // 3. Favorite Similarity Score (25% weight)
    const similarityScore = this.calculateFavoriteSimilarity(candidate, preferences, userData);
    totalScore += similarityScore * 0.25;
    scoreBreakdown.similarity = similarityScore;

    // 4. Context Match Score (15% weight)
    const contextScore = this.calculateContextScore(candidate, preferences);
    totalScore += contextScore * 0.15;
    scoreBreakdown.context = contextScore;

    // 5. Discovery Preference Score (10% weight)
    const discoveryScore = this.calculateDiscoveryScore(candidate, preferences);
    totalScore += discoveryScore * 0.10;
    scoreBreakdown.discovery = discoveryScore;

    // 6. Quality Score (10% weight)
    const qualityScore = this.calculateQualityScore(candidate);
    totalScore += qualityScore * 0.10;
    scoreBreakdown.quality = qualityScore;

    return { score: totalScore, breakdown: scoreBreakdown };
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
      const scoredCandidates = enrichedCandidates.map(candidate => {
        const scoring = this.calculateContentScore(candidate, preferences, userData);
        return {
          ...candidate,
          score: scoring.score,
          scoreBreakdown: scoring.breakdown,
          recommendationReason: this.generateRecommendationReason(candidate, scoring.breakdown, preferences)
        };
      });
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
  const requestOrigin = extractOrigin(event);

  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createCorsPreflightResponse(requestOrigin);
  }

  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createCorsErrorResponse(401, "Unauthorized", requestOrigin);
    }

    const token = authHeader.substring(7);
    let payload;
    
    if (process.env.IS_OFFLINE === 'true') {
      // Bypass JWT verification in offline mode
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
      try {
        payload = await verifier.verify(token);
      } catch (error) {
        console.error("Token verification failed:", error);
        return createCorsErrorResponse(401, "Unauthorized", requestOrigin);
      }
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      try {
        // Get query parameters
        const queryParams = event.queryStringParameters || {};
        const mediaType = queryParams.mediaType || 'both';
        const excludeIds = queryParams.exclude ? queryParams.exclude.split(',').map(id => id.trim()) : [];
        const limit = Math.min(parseInt(queryParams.limit) || 9, 9); // Default to 9 for batch processing
        
        // Get user preferences for personalization
        let userPreferences = {};
        
        // First, try to use preferences from query parameters (from localStorage)
        if (queryParams.preferences) {
          try {
            const queryPrefs = JSON.parse(queryParams.preferences);
            console.log('Using preferences from query parameters:', queryPrefs);
            userPreferences = queryPrefs;
          } catch (error) {
            console.warn('Failed to parse preferences from query parameters:', error);
          }
        }
        
        // If no valid preferences from query params, fall back to DynamoDB
        if (!userPreferences || Object.keys(userPreferences).length === 0) {
          console.log('Falling back to DynamoDB preferences');
          const preferencesCommand = new GetCommand({
            TableName: process.env.USER_PREFERENCES_TABLE,
            Key: { userId: userId }
          });

          const preferencesResult = await dynamoDB.send(preferencesCommand);
          userPreferences = preferencesResult.Item || {};
        }
        
        console.log('Final userPreferences being used:', {
          hasPreferences: Object.keys(userPreferences).length > 0,
          preferenceKeys: Object.keys(userPreferences),
          questionnaireCompleted: userPreferences.questionnaireCompleted
        });
        
        console.log('Fetching recommendations with params:', { mediaType, excludeIds, limit, userId });

        // Fetch personalized recommendations using advanced algorithm
        const recommendations = await getRecommendations(mediaType, excludeIds, limit, userPreferences, userId);

        return createCorsSuccessResponse({
          items: recommendations,
          source: 'personalized_lambda',
          userPreferences: userPreferences
        }, requestOrigin);
      } catch (error) {
        console.error("Error getting recommendations:", error);
        return createCorsErrorResponse(500, "Internal server error", requestOrigin);
      }
    } else {
      return createCorsErrorResponse(405, "Method not allowed", requestOrigin);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return createCorsErrorResponse(500, "Internal server error", requestOrigin);
  }
};