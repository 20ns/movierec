const AWS = require('aws-sdk');
const axios = require('axios');
const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

// Allowed origins for CORS
const allowedOrigins = [
    'https://account.d1akezqpdr5wgr.amplifyapp.com',
    'https://main.d1akezqpdr5wgr.amplifyapp.com',
    'https://www.movierec.net',
    'https://dev.d1akezqpdr5wgr.amplifyapp.com',
    'http://localhost:3000'
];

// Initialize DynamoDB with retry configuration
const dynamoDB = new AWS.DynamoDB.DocumentClient({
    maxRetries: 3,
    retryDelayOptions: { base: 300 }
});

// Create axios instance with timeout
const axiosInstance = axios.create({
    timeout: 20000 // 8 second timeout for API calls
});

// Simple rate limiter for API calls
const rateLimiter = {
    queue: [],
    running: 0,
    maxConcurrent: 3,
    
    async add(fn) {
        return new Promise((resolve) => {
            const run = async () => {
                this.running++;
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
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

// Environment variables
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TABLE_NAME = process.env.TABLE_NAME;
const GENRE_INDEX_NAME = process.env.GENRE_INDEX_NAME;

// Configuration
const CONFIG = {
    RECOMMENDATION_LIMIT: 6,
    CANDIDATE_POOL_SIZE: 200, // Increased for better candidate selection
    TMDB_FALLBACK_LIMIT: 40,  // Increased for better fallback coverage
};

// Map TMDB genre IDs to our system for better matching
const GENRE_ID_MAP = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

// Map our genre names back to TMDB ids for API queries
const REVERSE_GENRE_MAP = Object.entries(GENRE_ID_MAP).reduce((map, [id, name]) => {
    map[name.toLowerCase()] = id;
    return map;
}, {});

// Map subgenres to main genres for better categorization
const SUBGENRE_TO_GENRE_MAP = {
    'superhero': [28, 14], // Action, Fantasy
    'spy': [28, 53], // Action, Thriller
    'disaster': [28, 18], // Action, Drama
    'dystopian': [878, 18], // Sci-Fi, Drama
    'cyberpunk': [878], // Sci-Fi
    'biographical': [18, 36], // Drama, History
    'psychological': [18, 53], // Drama, Thriller
    'satire': [35], // Comedy
    'slasher': [27], // Horror
    'noir': [80, 53], // Crime, Thriller
    'comingofage': [18], // Drama
    'historical': [36, 18] // History, Drama
};

// Era mapping to year ranges
const ERA_TO_YEAR_MAP = {
    'classic': { start: 1900, end: 1979 },
    'modern': { start: 1980, end: 2009 },
    'recent': { start: 2010, end: new Date().getFullYear() }
};

// Mood to genre mapping for better content matching
const MOOD_TO_GENRE_MAP = {
    'exciting': ['Action', 'Adventure', 'Thriller', 'Science Fiction'],
    'thoughtful': ['Drama', 'Documentary', 'Mystery', 'History'],
    'funny': ['Comedy', 'Family', 'Animation'],
    'scary': ['Horror', 'Thriller', 'Mystery'],
    'emotional': ['Drama', 'Romance', 'Music']
};

// Emergency fallback recommendations - only used if everything else fails
const EMERGENCY_FALLBACKS = [
    {
        mediaId: "299534",
        mediaType: "movie",
        title: "Avengers: Endgame",
        overview: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more in order to undo Thanos' actions and restore order to the universe once and for all, no matter what consequences may be in store.",
        posterPath: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        backdropPath: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
        voteAverage: 8.3,
        releaseDate: "2019-04-24",
        popularity: 200.35,
        genres: "Action|Adventure|Science Fiction",
        genre: "Action",
        recommendationScore: 100,
        matchReason: "Popular blockbuster"
    },
    {
        mediaId: "399566",
        mediaType: "movie",
        title: "Godzilla vs. Kong",
        overview: "In a time when monsters walk the Earth, humanity's fight for its future sets Godzilla and Kong on a collision course that will see the two most powerful forces of nature on the planet collide in a spectacular battle for the ages.",
        posterPath: "/pgqgaUx1cJb5oZQQ5v0tNARCeBp.jpg",
        backdropPath: "/inJjDhCjfhh3RtrJWBmmDqeuSYC.jpg",
        voteAverage: 8.1,
        releaseDate: "2021-03-24",
        popularity: 177.16,
        genres: "Action|Science Fiction",
        genre: "Action",
        recommendationScore: 95,
        matchReason: "Popular action film"
    },
    {
        mediaId: "791373",
        mediaType: "movie",
        title: "Zack Snyder's Justice League",
        overview: "Determined to ensure Superman's ultimate sacrifice was not in vain, Bruce Wayne aligns forces with Diana Prince with plans to recruit a team of metahumans to protect the world from an approaching threat of catastrophic proportions.",
        posterPath: "/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg",
        backdropPath: "/pcDc2WJAYGJTTvRSEIpRZwM3Ola.jpg",
        voteAverage: 8.5,
        releaseDate: "2021-03-18",
        popularity: 146.73,
        genres: "Action|Adventure|Fantasy|Science Fiction",
        genre: "Action",
        recommendationScore: 90,
        matchReason: "Fan favorite"
    },
    {
        mediaId: "85552",
        mediaType: "tv",
        title: "Stranger Things",
        overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
        posterPath: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
        backdropPath: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
        voteAverage: 8.6,
        releaseDate: "2016-07-15",
        popularity: 166.47,
        genres: "Drama|Fantasy|Mystery",
        genre: "Drama",
        recommendationScore: 88,
        matchReason: "Popular TV series"
    },
    {
        mediaId: "82856",
        mediaType: "tv",
        title: "The Mandalorian",
        overview: "After the fall of the Galactic Empire, lawlessness has spread throughout the galaxy. A lone gunfighter makes his way through the outer reaches, earning his keep as a bounty hunter.",
        posterPath: "/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
        backdropPath: "/9ijMGlJKqcslswWUzTEwScm82Gs.jpg",
        voteAverage: 8.5,
        releaseDate: "2019-11-12",
        popularity: 140.38,
        genres: "Action & Adventure|Sci-Fi & Fantasy",
        genre: "Action & Adventure",
        recommendationScore: 85,
        matchReason: "Trending series"
    },
    {
        mediaId: "68507",
        mediaType: "tv",
        title: "His Dark Materials",
        overview: "Lyra is an orphan who lives in a parallel universe in which science, theology and magic are entwined. Lyra's search for a kidnapped friend uncovers a sinister plot involving stolen children, and turns into a quest to understand a mysterious phenomenon called Dust.",
        posterPath: "/g6tIKGc3f1H5QMz1dcgCwADKpZ7.jpg",
        backdropPath: "/xLWlpjdXdkYflOILl5N5pc0vjuZ.jpg",
        voteAverage: 8.1,
        releaseDate: "2019-11-03",
        popularity: 80.92,
        genres: "Drama|Sci-Fi & Fantasy",
        genre: "Drama",
        recommendationScore: 80,
        matchReason: "Fantasy series"
    }
];

// CORS handling function
const generateCorsHeaders = (requestOrigin) => {
    const headers = {
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Max-Age': '86400',
    };
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        headers['Access-Control-Allow-Origin'] = requestOrigin;
    } else {
        headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
    }
    return headers;
};

// Main Lambda handler
exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
    const corsHeaders = generateCorsHeaders(requestOrigin);

    if (event.httpMethod === 'OPTIONS') {
        console.log("Handling OPTIONS preflight request");
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ message: `Unsupported method: ${event.httpMethod}` }) };
    }    try {
        // Extract and verify JWT token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Unauthorized" })
            };
        }

        const token = authHeader.substring(7);
        let payload;
        
        try {
            payload = await verifier.verify(token);
        } catch (error) {
            console.error("Token verification failed:", error);
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Unauthorized" })
            };
        }

        const userId = payload.sub;
        console.log("Authenticated user:", userId);

        const startTime = Date.now();
        
        // Parse parameters
        const queryParams = event.queryStringParameters || {};
        const mediaTypeParam = queryParams.mediaType || 'both';
        const limit = CONFIG.RECOMMENDATION_LIMIT;
        const excludeIds = new Set(queryParams.exclude ? queryParams.exclude.split(',') : []);
        const favorites = queryParams.favorites ? queryParams.favorites.split(',') : [];
        const watchlist = queryParams.watchlist ? queryParams.watchlist.split(',') : [];
        let preferences = {};
        try {
            preferences = queryParams.preferences ? JSON.parse(queryParams.preferences) : {};
        } catch (e) { 
            console.warn("Could not parse preferences JSON:", queryParams.preferences); 
        }

        console.log("Received preferences:", JSON.stringify(preferences));

        favorites.forEach(id => excludeIds.add(id));
        watchlist.forEach(id => excludeIds.add(id));
        console.log("Parsed Params:", { mediaTypeParam, limit, excludeIdsSize: excludeIds.size });
        
        // Full recommendation process - high quality personalized recommendations
        const recommendationResults = await getFullRecommendations(
            mediaTypeParam, 
            limit, 
            excludeIds, 
            favorites, 
            watchlist, 
            preferences
        );
            
        // Return the recommendations
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(recommendationResults)
        };
            
    } catch (error) {
        console.error('Critical error in handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: 'Internal Server Error', 
                error: error.message,
                items: EMERGENCY_FALLBACKS.slice(0, CONFIG.RECOMMENDATION_LIMIT),
                source: 'emergency_fallback'
            })
        };
    }
};

// Full recommendation process - comprehensive and high quality
async function getFullRecommendations(mediaTypeParam, limit, excludeIds, favorites, watchlist, preferences) {
    const startTime = Date.now();
    
    try {
        // 1. Get Seed Genres and Content Attributes
        const { seedGenres, seedAttributes } = await getSeedContent(favorites, watchlist);
        console.log(`[${Date.now() - startTime}ms] Seed Genres:`, seedGenres);
        console.log(`[${Date.now() - startTime}ms] Seed Attributes:`, seedAttributes);

        // 2. Determine Target Genres (enhanced with subgenre mapping)
        const targetGenres = determineTargetGenres(seedGenres, preferences);
        console.log(`[${Date.now() - startTime}ms] Target Genres:`, targetGenres);

        // 3. Apply user content filters
        const contentFilters = buildContentFilters(preferences, mediaTypeParam);
        console.log(`[${Date.now() - startTime}ms] Content Filters:`, contentFilters);

        // 4. Query DynamoDB Candidates
        let candidates = [];
        if (targetGenres.length > 0) {
            candidates = await queryCandidatesByGenre(targetGenres, contentFilters, CONFIG.CANDIDATE_POOL_SIZE);
            console.log(`[${Date.now() - startTime}ms] Found ${candidates.length} candidates from DynamoDB`);
        } else {
            console.log(`[${Date.now() - startTime}ms] No target genres, falling back to popular items`);
            candidates = await queryPopularCandidates(contentFilters, CONFIG.CANDIDATE_POOL_SIZE);
        }

        // 5. Filter Candidates 
        const filteredCandidates = candidates.filter(item => {
            // Basic filter: has ID and not excluded
            if (!item.mediaId || excludeIds.has(item.mediaId.toString())) {
                return false;
            }
            
            // Apply advanced content filters
            return matchesContentFilters(item, contentFilters, preferences);
        });
        console.log(`[${Date.now() - startTime}ms] Filtered to ${filteredCandidates.length} candidates`);

        // 6. Score Candidates (enhanced scoring)
        const scoredCandidates = filteredCandidates.map(item => ({
            ...item,
            posterPath: item.posterPath || null,
            voteAverage: item.voteAverage || null,
            score: scoreItem(item, seedGenres, seedAttributes, preferences)
        }));
        scoredCandidates.sort((a, b) => b.score - a.score);
        console.log(`[${Date.now() - startTime}ms] Candidates scored`);

        // 7. Apply diversity boost
        const diversifiedCandidates = applyDiversityBoost(scoredCandidates, preferences);
        console.log(`[${Date.now() - startTime}ms] Diversity boost applied`);
        
        let finalRecommendations = diversifiedCandidates;

        // 8. Check if we need TMDB fallback
        if (finalRecommendations.length < limit) {
            console.log(`[${Date.now() - startTime}ms] Need ${limit - finalRecommendations.length} more items, trying TMDB fallback`);
            try {
                const tmdbResults = await fetchTmdbFallback(targetGenres, preferences, contentFilters, excludeIds, CONFIG.TMDB_FALLBACK_LIMIT);
                console.log(`[${Date.now() - startTime}ms] Got ${tmdbResults.length} items from TMDB fallback`);

                const newTmdbItems = [];
                for (const tmdbItem of tmdbResults) {
                    const tmdbIdStr = tmdbItem.id?.toString();
                    if (!tmdbIdStr) continue;
                    if (!excludeIds.has(tmdbIdStr) && !finalRecommendations.some(rec => rec.mediaId === tmdbIdStr)) {
                        excludeIds.add(tmdbIdStr);
                        
                        // Convert TMDB genre_ids to our format for scoring
                        const genreIds = tmdbItem.genre_ids || [];
                        const genreNames = genreIds.map(id => GENRE_ID_MAP[id] || '').filter(Boolean);
                        
                        const convertedItem = {
                            mediaId: tmdbIdStr,
                            mediaType: tmdbItem.media_type || (contentFilters.mediaType !== 'both' ? contentFilters.mediaType : 'unknown'),
                            title: tmdbItem.title || tmdbItem.name,
                            overview: tmdbItem.overview,
                            posterPath: tmdbItem.poster_path,
                            backdropPath: tmdbItem.backdrop_path,
                            voteAverage: tmdbItem.vote_average,
                            releaseDate: tmdbItem.release_date || tmdbItem.first_air_date,
                            popularity: tmdbItem.popularity,
                            genres: genreNames.join('|'),
                            genre: genreNames.length > 0 ? genreNames[0] : 'unknown',
                            genreIds: genreIds,
                            original_language: tmdbItem.original_language,
                            score: 0
                        };
                        
                        // Only include if it matches filters
                        if (convertedItem.mediaId && convertedItem.title && 
                            matchesContentFilters(convertedItem, contentFilters, preferences)) {
                            // Deep analysis scoring for TMDB items
                            convertedItem.score = scoreItem(convertedItem, seedGenres, seedAttributes, preferences, true);
                            newTmdbItems.push(convertedItem);
                        }
                    }
                }
                console.log(`[${Date.now() - startTime}ms] Added ${newTmdbItems.length} TMDB items`);
                finalRecommendations = [...finalRecommendations, ...newTmdbItems];
                finalRecommendations.sort((a, b) => b.score - a.score);
            } catch (tmdbError) { 
                console.error(`[${Date.now() - startTime}ms] Error during TMDB fallback:`, tmdbError); 
            }
        }

        // 9. Select top recommendations and enrich them
        let topRecommendations = finalRecommendations.slice(0, limit);
        console.log(`[${Date.now() - startTime}ms] Selected ${topRecommendations.length} recommendations before enrichment`);

        // 10. Enrich with TMDB details if needed
        if (topRecommendations.length > 0) {
            console.log(`[${Date.now() - startTime}ms] Enriching recommendations with TMDB details`);
            const enrichmentPromises = topRecommendations.map(async (item, index) => {
                // Only enrich if missing poster or vote
                if (item.mediaId && item.mediaType && (!item.posterPath || item.voteAverage === null || item.voteAverage === undefined)) {
                    return rateLimiter.add(async () => {
                        try {
                            const details = await fetchTmdbDetails(item.mediaId, item.mediaType);
                            if (details) {
                                return {
                                    ...item,
                                    posterPath: details.poster_path || item.posterPath,
                                    voteAverage: details.vote_average !== undefined ? details.vote_average : item.voteAverage,
                                    backdropPath: details.backdrop_path || item.backdropPath,
                                    overview: details.overview || item.overview,
                                };
                            }
                        } catch (error) {
                            console.log(`Error enriching item ${item.mediaId}:`, error);
                        }
                        return item;
                    });
                }
                return item;
            });
            
            const enrichedItems = await Promise.all(enrichmentPromises);
            topRecommendations = enrichedItems.filter(Boolean);
            console.log(`[${Date.now() - startTime}ms] Enrichment complete`);
        }

        // 11. Format for response
        const responseItems = topRecommendations.map(item => ({
            mediaId: item.mediaId,
            mediaType: item.mediaType,
            title: item.title,
            overview: item.overview,
            posterPath: item.posterPath,
            backdropPath: item.backdropPath,
            voteAverage: item.voteAverage,
            releaseDate: item.releaseDate,
            popularity: item.popularity,
            genres: item.genres,
            genre: item.genre,
            recommendationScore: item.score || 50,
            matchReason: getRecommendationReason(item, preferences)
        }));

        // 12. If we don't have enough recommendations, use emergency fallbacks
        if (!responseItems.length) {
            console.log(`[${Date.now() - startTime}ms] No recommendations found, using emergency fallbacks`);
            return {
                items: EMERGENCY_FALLBACKS.slice(0, limit),
                source: 'emergency_fallback'
            };
        }

        // Return the high-quality personalized recommendations
        console.log(`[${Date.now() - startTime}ms] Returning ${responseItems.length} personalized recommendations`);
        return {
            items: responseItems,
            source: 'deep_personalized_v2'
        };
        
    } catch (error) {
        console.error("Error in full recommendations process:", error);
        return {
            items: EMERGENCY_FALLBACKS.slice(0, limit),
            source: 'emergency_fallback'
        };
    }
}

// --- Helper Functions ---

// Get Seed Content - with error handling and timeouts
async function getSeedContent(favoriteIds, watchlistIds) {
    const seedIds = [...new Set([...favoriteIds, ...watchlistIds])];
    if (seedIds.length === 0) return { seedGenres: [], seedAttributes: {} };
    
    const keysToFetch = seedIds.flatMap(id => [
        { mediaId: id.toString(), mediaType: 'movie' },
        { mediaId: id.toString(), mediaType: 'tv' }
    ]);
    
    if (keysToFetch.length === 0) return { seedGenres: [], seedAttributes: {} };
    
    let seedItems = [];
    try {
        // Use smaller batch size to avoid DynamoDB errors
        for (let i = 0; i < keysToFetch.length; i += 25) {
            const batchKeys = keysToFetch.slice(i, i + 25);
            const params = { RequestItems: { [TABLE_NAME]: { Keys: batchKeys } } };
            
            try {
                const result = await dynamoDB.batchGet(params).promise();
                if (result.Responses && result.Responses[TABLE_NAME]) {
                    seedItems = seedItems.concat(result.Responses[TABLE_NAME]);
                }
            } catch (batchError) {
                console.error("DynamoDB batch error:", batchError);
                // Continue with whatever items we have
                continue;
            }
        }
        console.log(`Fetched ${seedItems.length} seed items.`);
    } catch (error) { 
        console.error("Error fetching seed items:", error); 
        return { seedGenres: [], seedAttributes: {} };
    }
    
    // Extract genres
    const genres = new Set();
    seedItems.forEach(item => {
        if (item.genre && item.genre !== 'unknown' && item.genre !== 'list' && item.genre !== 'system') {
            genres.add(item.genre);
        }
        
        // Also add any genres from the pipe-separated list if available
        if (item.genres) {
            item.genres.split('|').forEach(g => {
                if (g && g !== 'unknown') genres.add(g);
            });
        }
    });
    
    // Extract other useful attributes for similarity matching
    const seedAttributes = {
        directors: new Set(),
        actors: new Set(),
        keywords: new Set(),
        languages: new Set(),
        eraYears: [],
        avgVoteAverage: 0,
        medianReleaseYear: 0
    };
    
    // Process items for attributes
    const validItems = seedItems.filter(item => item.mediaId);
    
    if (validItems.length > 0) {
        // Calculate average vote average
        let totalVoteAverage = 0;
        let countWithVotes = 0;
        
        // Collect release years
        const releaseYears = [];
        
        validItems.forEach(item => {
            // Vote average
            if (item.voteAverage && !isNaN(item.voteAverage) && item.voteAverage > 0) {
                totalVoteAverage += item.voteAverage;
                countWithVotes++;
            }
            
            // Release year
            if (item.releaseDate) {
                const year = parseInt(item.releaseDate.substring(0, 4));
                if (!isNaN(year) && year > 1900) {
                    releaseYears.push(year);
                }
            }
        });
        
        // Calculate averages
        if (countWithVotes > 0) {
            seedAttributes.avgVoteAverage = totalVoteAverage / countWithVotes;
        }
        
        // Calculate median release year
        if (releaseYears.length > 0) {
            releaseYears.sort((a, b) => a - b);
            const mid = Math.floor(releaseYears.length / 2);
            seedAttributes.medianReleaseYear = 
                releaseYears.length % 2 === 0 
                    ? (releaseYears[mid - 1] + releaseYears[mid]) / 2 
                    : releaseYears[mid];
            
            seedAttributes.eraYears = releaseYears;
        }
    }
    
    return { 
        seedGenres: Array.from(genres), 
        seedAttributes 
    };
}

// Determine Target Genres - with safeguards
function determineTargetGenres(seedGenres, preferences) {
    const target = new Set(seedGenres || []);
    
    try {
        // Add genres from preferences (number IDs)
        if (preferences.favoriteGenres && Array.isArray(preferences.favoriteGenres)) {
            preferences.favoriteGenres.forEach(g => {
                // Handle both string IDs and number IDs
                if (typeof g === 'string' && g) {
                    target.add(g);
                } else if (typeof g === 'number') {
                    // Map ID to name if possible
                    const genreName = GENRE_ID_MAP[g];
                    if (genreName) target.add(genreName);
                }
            });
        }
        
        // Add genres from subgenre preferences
        if (preferences.subgenrePreferences && Array.isArray(preferences.subgenrePreferences)) {
            preferences.subgenrePreferences.forEach(subgenre => {
                const mappedGenreIds = SUBGENRE_TO_GENRE_MAP[subgenre];
                if (mappedGenreIds) {
                    mappedGenreIds.forEach(genreId => {
                        const genreName = GENRE_ID_MAP[genreId];
                        if (genreName) target.add(genreName);
                    });
                }
            });
        }
        
        // Add genres based on mood preferences
        if (preferences.moodPreferences && Array.isArray(preferences.moodPreferences)) {
            preferences.moodPreferences.forEach(mood => {
                const genresForMood = MOOD_TO_GENRE_MAP[mood];
                if (genresForMood) {
                    genresForMood.forEach(g => target.add(g));
                }
            });
        }
        
        // Remove disliked genres
        if (preferences.dislikedGenres && Array.isArray(preferences.dislikedGenres)) {
            preferences.dislikedGenres.forEach(g => {
                // Handle both string IDs and number IDs
                if (typeof g === 'string') {
                    target.delete(g);
                } else if (typeof g === 'number') {
                    const genreName = GENRE_ID_MAP[g];
                    if (genreName) target.delete(genreName);
                }
            });
        }
    } catch (error) {
        console.error("Error in determineTargetGenres:", error);
        // Continue with whatever genres we have so far
    }
    
    // If no genres determined, add some popular fallbacks
    if (target.size === 0) {
        target.add('Action');
        target.add('Drama');
        target.add('Comedy');
    }
    
    return Array.from(target);
}

// Build content filters based on user preferences
function buildContentFilters(preferences, mediaTypeParam) {
    const filters = {
        mediaType: mediaTypeParam || 'both',
        language: null,
        era: null,
        maturity: null,
        runtime: null
    };
    
    try {
        // Language preference
        if (preferences.languagePreferences && Array.isArray(preferences.languagePreferences) && 
            preferences.languagePreferences.length > 0 && 
            !preferences.languagePreferences.includes('any')) {
            filters.language = preferences.languagePreferences;
        }
        
        // Era preference
        if (preferences.eraPreferences && Array.isArray(preferences.eraPreferences) && 
            preferences.eraPreferences.length > 0) {
            filters.era = preferences.eraPreferences
                .map(era => ERA_TO_YEAR_MAP[era])
                .filter(Boolean);
        }
        
        // Maturity preference
        if (preferences.maturityPreference && Array.isArray(preferences.maturityPreference) && 
            preferences.maturityPreference.length > 0) {
            filters.maturity = preferences.maturityPreference;
        }
        
        // Runtime preference
        if (preferences.runtimePreference && preferences.runtimePreference !== 'any') {
            filters.runtime = preferences.runtimePreference;
        }

        // Watching context preference - for family-friendly content
        if (preferences.watchingContext && Array.isArray(preferences.watchingContext) && 
            preferences.watchingContext.includes('family')) {
            filters.familyFriendly = true;
        }
    } catch (error) {
        console.error("Error building content filters:", error);
        // Return with default filters
    }
    
    return filters;
}

// Check if an item matches content filters - with safeguards
function matchesContentFilters(item, filters, preferences) {
    try {
        // Media type filter
        if (filters.mediaType !== 'both' && item.mediaType !== filters.mediaType) {
            return false;
        }
        
        // Language filter (if we have language data)
        if (filters.language && item.original_language) {
            if (!filters.language.includes(item.original_language)) {
                return false;
            }
        }
        
        // Era filter (if we have release date)
        if (filters.era && filters.era.length > 0 && item.releaseDate) {
            const year = parseInt(item.releaseDate.substring(0, 4));
            if (!isNaN(year)) {
                // Check if year falls within any of our era ranges
                const yearInRange = filters.era.some(era => 
                    year >= era.start && year <= era.end
                );
                if (!yearInRange) return false;
            }
        }

        // Family-friendly filter
        if (filters.familyFriendly && item.adult === true) {
            return false;
        }

        // Maturity filter
        if (filters.maturity && filters.maturity.length > 0) {
            if (filters.maturity.includes('family') && item.adult === true) {
                return false;
            }
        }
        
        // Check if item's genre matches any disliked genres
        if (preferences.dislikedGenres && Array.isArray(preferences.dislikedGenres) && 
            preferences.dislikedGenres.length > 0 && item.genre) {
            
            // Map any numeric IDs to genre names
            const dislikedGenreNames = preferences.dislikedGenres
                .map(g => typeof g === 'number' ? GENRE_ID_MAP[g] : g)
                .filter(Boolean);
            
            // Check if the item's primary genre is disliked
            if (dislikedGenreNames.some(dg => 
                item.genre.toLowerCase().includes(dg.toLowerCase()))) {
                return false;
            }
            
            // If item has a genres list, check those too
            if (item.genres) {
                const itemGenres = item.genres.split('|');
                // If ANY genre matches a disliked genre, filter out
                if (itemGenres.some(ig => 
                    dislikedGenreNames.some(dg => 
                        ig.toLowerCase().includes(dg.toLowerCase())))) {
                    return false;
                }
            }
        }
    } catch (error) {
        console.error("Error in matchesContentFilters:", error);
        // If there's an error in matching, default to including the item
        return true;
    }
    
    // All filters passed
    return true;
}

// Query Candidates By Genre - with error handling and performance optimizations
async function queryCandidatesByGenre(genres, contentFilters, poolLimit) {
    let candidates = [];
    const BATCH_SIZE = 3; // Smaller batch size for better parallelism
    const MAX_ITEMS_PER_GENRE_QUERY = Math.max(20, Math.ceil(poolLimit / (genres.length || 1)));

    try {
        // Use a limited set of genres to improve performance
        const limitedGenres = genres.slice(0, 7); // Use top 7 genres max
        
        for (let i = 0; i < limitedGenres.length; i += BATCH_SIZE) {
            if (candidates.length >= poolLimit) break;
            
            const genreBatch = limitedGenres.slice(i, i + BATCH_SIZE);
            console.log(`Querying DynamoDB for genres: ${genreBatch.join(', ')}`);

            try {
                const promises = genreBatch.map(async (genre) => {
                    const params = {
                        TableName: TABLE_NAME,
                        IndexName: GENRE_INDEX_NAME,
                        KeyConditionExpression: 'genre = :g',
                        ExpressionAttributeValues: { ':g': genre },
                        ScanIndexForward: false,
                        Limit: MAX_ITEMS_PER_GENRE_QUERY
                    };
                    
                    // Apply basic media type filter
                    if (contentFilters.mediaType !== 'both') {
                        params.FilterExpression = 'mediaType = :mt';
                        params.ExpressionAttributeValues[':mt'] = contentFilters.mediaType;
                    }
                    
                    try {
                        const result = await dynamoDB.query(params).promise();
                        return result.Items || [];
                    } catch (error) { 
                        console.error(`Error querying DynamoDB for genre ${genre}:`, error);
                        return []; 
                    }
                });

                const results = await Promise.all(promises);
                results.forEach(items => candidates.push(...items));
                
                // De-duplicate based on mediaId + mediaType
                const uniqueCandidatesMap = new Map();
                candidates.forEach(item => {
                    const key = `${item.mediaId}#${item.mediaType}`;
                    if (!uniqueCandidatesMap.has(key)) {
                        uniqueCandidatesMap.set(key, item);
                    }
                });
                candidates = Array.from(uniqueCandidatesMap.values());
                
                console.log(`Total candidates after batch: ${candidates.length}`);
            } catch (batchError) {
                console.error("Error processing genre batch query:", batchError);
                // Continue with what we have
            }
        }
    } catch (error) {
        console.error("Error in queryCandidatesByGenre:", error);
        // Return whatever candidates we've managed to collect
    }
    
    return candidates.slice(0, poolLimit);
}

// Query Popular Candidates - Fallback
async function queryPopularCandidates(contentFilters, poolLimit) {
    console.warn("Using fallback popular genres query");
    
    // Use a variety of popular genres for better coverage
    const fallbackGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction'];
    
    try {
        return await queryCandidatesByGenre(fallbackGenres, contentFilters, poolLimit);
    } catch (error) {
        console.error("Error in queryPopularCandidates:", error);
        return [];
    }
}

// Enhanced scoring algorithm with safeguards
function scoreItem(item, seedGenres, seedAttributes, preferences, isTmdbItem = false) {
    try {
        let score = 0;
        let genreScore = 0;
        let popularityScore = 0;
        let qualityScore = 0;
        let preferenceScore = 0;
        let personalizationScore = 0;
        
        // GENRE MATCHING SCORE (30 points max)
        const itemGenre = item.genre;
        if (itemGenre && itemGenre !== 'unknown') {
            // Match with seed genres
            if (seedGenres && seedGenres.some(g => g.toLowerCase() === itemGenre.toLowerCase())) {
                genreScore += 20;
            }
            
            // Match with preferred genres
            if (preferences.favoriteGenres && Array.isArray(preferences.favoriteGenres)) {
                const hasMatch = preferences.favoriteGenres.some(g => {
                    if (typeof g === 'number') {
                        return GENRE_ID_MAP[g]?.toLowerCase() === itemGenre.toLowerCase();
                    }
                    return g?.toLowerCase() === itemGenre.toLowerCase();
                });
                
                if (hasMatch) genreScore += 10;
            }
            
            // Secondary genres
            if (item.genres) {
                const secondaryGenres = item.genres.split('|');
                
                // Seed genre match
                if (seedGenres && secondaryGenres.some(sg => 
                    seedGenres.some(g => g.toLowerCase() === sg.toLowerCase()))) {
                    genreScore += 5;
                }
                
                // Preferred genre match
                if (preferences.favoriteGenres && Array.isArray(preferences.favoriteGenres)) {
                    const hasSecondaryMatch = secondaryGenres.some(sg => 
                        preferences.favoriteGenres.some(g => {
                            const preferredGenre = typeof g === 'number' ? GENRE_ID_MAP[g] : g;
                            return preferredGenre?.toLowerCase() === sg.toLowerCase();
                        })
                    );
                    
                    if (hasSecondaryMatch) genreScore += 5;
                }
            }
            
            // TMDB genre_ids direct matching
            if (isTmdbItem && item.genreIds && Array.isArray(item.genreIds) && 
                preferences.favoriteGenres && Array.isArray(preferences.favoriteGenres)) {
                
                if (item.genreIds.some(id => preferences.favoriteGenres.includes(id))) {
                    genreScore += 10;
                }
            }

            // Subgenre matching
            if (preferences.subgenrePreferences && Array.isArray(preferences.subgenrePreferences)) {
                // Map item genre to possible subgenres
                for (const [subgenre, genreIds] of Object.entries(SUBGENRE_TO_GENRE_MAP)) {
                    const subgenreGenres = genreIds.map(id => GENRE_ID_MAP[id] || '');
                    
                    // Check if the item's genre matches any genres associated with this subgenre
                    if (subgenreGenres.some(g => g.toLowerCase() === itemGenre.toLowerCase())) {
                        // If this subgenre is in the user's preferences, add points
                        if (preferences.subgenrePreferences.includes(subgenre)) {
                            genreScore += 8;
                            break; // Only count one match
                        }
                    }
                }
            }
        }
        
        // Cap genre score at 30
        genreScore = Math.min(30, genreScore);
        score += genreScore;
        
        // QUALITY & POPULARITY SCORES (30 points max)
        const popularity = item.popularity || 0;
        if (popularity > 0) {
            popularityScore = Math.min(15, Math.log10(popularity + 1) * 5);
        }
        score += popularityScore;
        
        const voteAverage = item.vote_average || item.voteAverage || 0;
        if (voteAverage > 0) {
            qualityScore = Math.min(15, voteAverage * 1.5);
        }
        score += qualityScore;
        
        // PREFERENCE MATCHING SCORES (40 points max)
        
        // Era preferences
        if (preferences.eraPreferences && Array.isArray(preferences.eraPreferences) && 
            preferences.eraPreferences.length > 0 && item.releaseDate) {
            
            const year = parseInt(item.releaseDate.substring(0, 4));
            if (!isNaN(year)) {
                const matchesEra = preferences.eraPreferences.some(era => {
                    const range = ERA_TO_YEAR_MAP[era];
                    return range && year >= range.start && year <= range.end;
                });
                
                if (matchesEra) {
                    preferenceScore += 10;
                } else if (seedAttributes.medianReleaseYear > 0) {
                    const yearDiff = Math.abs(year - seedAttributes.medianReleaseYear);
                    if (yearDiff < 10) {
                        preferenceScore += 5;
                    } else if (yearDiff < 20) {
                        preferenceScore += 2;
                    }
                }
            }
        }
        
        // Mood preferences
        if (preferences.moodPreferences && Array.isArray(preferences.moodPreferences) && 
            preferences.moodPreferences.length > 0) {
            
            // Check for matches
            const itemGenres = [item.genre];
            if (item.genres) {
                item.genres.split('|').forEach(g => {
                    if (g) itemGenres.push(g);
                });
            }
            
            const matchesMood = preferences.moodPreferences.some(mood => {
                const moodGenres = MOOD_TO_GENRE_MAP[mood] || [];
                return itemGenres.some(g => moodGenres.includes(g));
            });
            
            if (matchesMood) {
                preferenceScore += 10;
            }
        }
        
        // Critical acclaim preferences
        if (preferences.criticalAcclaimPreferences && Array.isArray(preferences.criticalAcclaimPreferences) && 
            preferences.criticalAcclaimPreferences.length > 0) {
            
            if (preferences.criticalAcclaimPreferences.includes('awardWinning') || 
                preferences.criticalAcclaimPreferences.includes('criticallyAcclaimed')) {
                
                if (voteAverage >= 8) {
                    preferenceScore += 5;
                } else if (voteAverage >= 7) {
                    preferenceScore += 3;
                }
            }
            
            if (preferences.criticalAcclaimPreferences.includes('underrated')) {
                if (voteAverage >= 7 && popularity < 50) {
                    preferenceScore += 5;
                }
            }
            
            if (preferences.criticalAcclaimPreferences.includes('blockbuster')) {
                if (popularity > 100) {
                    preferenceScore += 5;
                }
            }

            if (preferences.criticalAcclaimPreferences.includes('cultClassic')) {
                // Cult classics often have modest popularity but dedicated fans
                if (voteAverage >= 7 && popularity <= 80 && popularity >= 20) {
                    preferenceScore += 5;
                }
            }
        }
        
        // Visual style preferences
        if (preferences.aestheticPreferences && Array.isArray(preferences.aestheticPreferences) && 
            preferences.aestheticPreferences.length > 0) {
            
            const visualGenres = ['Animation', 'Fantasy', 'Science Fiction', 'Adventure'];
            
            const itemGenres = [item.genre];
            if (item.genres) {
                item.genres.split('|').forEach(g => {
                    if (g) itemGenres.push(g);
                });
            }
            
            const hasVisualGenres = itemGenres.some(g => visualGenres.includes(g));
            
            if (preferences.aestheticPreferences.includes('visuallyStunning') && hasVisualGenres) {
                preferenceScore += 5;
            }

            if (preferences.aestheticPreferences.includes('darkMoody') && 
                (itemGenres.includes('Thriller') || itemGenres.includes('Horror') || itemGenres.includes('Crime'))) {
                preferenceScore += 5;
            }

            if (preferences.aestheticPreferences.includes('colorful') && 
                (itemGenres.includes('Animation') || itemGenres.includes('Family') || itemGenres.includes('Fantasy'))) {
                preferenceScore += 5;
            }
        }
        
        // Story structure preferences
        if (preferences.storyStructurePreferences && Array.isArray(preferences.storyStructurePreferences) && 
            preferences.storyStructurePreferences.length > 0) {
            
            // Mystery, thriller genres often have twists
            if (preferences.storyStructurePreferences.includes('twist') && 
                (item.genre === 'Mystery' || item.genre === 'Thriller')) {
                preferenceScore += 5;
            }

            // Non-linear storytelling often appears in specific genres
            if (preferences.storyStructurePreferences.includes('nonlinear') && 
                (item.genre === 'Drama' || item.genre === 'Mystery' || item.genre === 'Science Fiction')) {
                preferenceScore += 5;
            }
        }
        
        // Character preferences
        if (preferences.characterPreferences && Array.isArray(preferences.characterPreferences) && 
            preferences.characterPreferences.length > 0) {
            
            // Drama genre often has complex protagonists and character-driven stories
            if ((preferences.characterPreferences.includes('complexProtagonist') || 
                preferences.characterPreferences.includes('character-driven')) && 
                item.genre === 'Drama') {
                preferenceScore += 5;
            }

            // Some genres tend to have ensemble casts
            if (preferences.characterPreferences.includes('ensemble') && 
                ['Adventure', 'Action', 'Comedy'].includes(item.genre)) {
                preferenceScore += 5;
            }
        }
        
        // Cap preference score
        preferenceScore = Math.min(40, preferenceScore);
        score += preferenceScore;
        
        // Media type match
        if (preferences.contentType && 
            (item.mediaType === preferences.contentType || preferences.contentType === 'both')) {
            personalizationScore += 5;
        }
        
        // Specific language preference
        if (preferences.languagePreferences && 
            preferences.languagePreferences.includes(item.original_language)) {
            personalizationScore += 5;
        }
        
        score += personalizationScore;
        
        // Penalties for mismatches
        
        // Era preference mismatch penalty
        if (!preferences.eraPreferences?.includes('classic') && item.releaseDate) {
            const year = parseInt(item.releaseDate.substring(0, 4));
            if (!isNaN(year) && year < 1980) {
                score -= 5;
            }
        }
        
        // Language mismatch penalty
        if (preferences.languagePreferences && 
            preferences.languagePreferences.length > 0 && 
            !preferences.languagePreferences.includes('any') &&
            item.original_language && 
            !preferences.languagePreferences.includes(item.original_language)) {
            score -= 5;
        }
        
        // Store component scores for debugging
        item.scoreComponents = {
            genreScore,
            popularityScore,
            qualityScore,
            preferenceScore,
            personalizationScore
        };
        
        return Math.max(0, Math.round(score));
    } catch (error) {
        console.error("Error in scoreItem:", error);
        // Return a default score
        return 50;
    }
}

// Apply diversity boost to recommendations
function applyDiversityBoost(candidates, preferences) {
    try {
        if (candidates.length <= 1) return candidates;
        
        // Sort by score
        candidates.sort((a, b) => b.score - a.score);
        
        // Take top candidates
        const cutoff = Math.min(candidates.length, Math.max(20, Math.ceil(candidates.length * 0.7)));
        const topCandidates = candidates.slice(0, cutoff);
        const restCandidates = candidates.slice(cutoff);
        
        // Group by genre
        const genreGroups = {};
        topCandidates.forEach(item => {
            if (item.genre && item.genre !== 'unknown') {
                if (!genreGroups[item.genre]) {
                    genreGroups[item.genre] = [];
                }
                genreGroups[item.genre].push(item);
            } else {
                // Items without genres go directly to results
                if (!genreGroups['unknown']) {
                    genreGroups['unknown'] = [];
                }
                genreGroups['unknown'].push(item);
            }
        });
        
        // Sort each group
        Object.keys(genreGroups).forEach(genre => {
            genreGroups[genre].sort((a, b) => b.score - a.score);
        });
        
        // Build diverse results
        const diverseResults = [];
        let genreKeys = Object.keys(genreGroups).filter(g => g !== 'unknown');
        
        // First, include favorites if available
        if (preferences.favoriteGenres && Array.isArray(preferences.favoriteGenres)) {
            const favoriteGenreNames = preferences.favoriteGenres
                .map(g => typeof g === 'number' ? GENRE_ID_MAP[g] : g)
                .filter(Boolean);
            
            favoriteGenreNames.forEach(favGenre => {
                const matchingGenre = genreKeys.find(g => 
                    g.toLowerCase() === favGenre.toLowerCase()
                );
                
                if (matchingGenre && genreGroups[matchingGenre].length > 0) {
                    diverseResults.push(genreGroups[matchingGenre].shift());
                    
                    if (genreGroups[matchingGenre].length === 0) {
                        genreKeys = genreKeys.filter(g => g !== matchingGenre);
                    }
                }
            });
        }
        
        // Add unknown genre items (no genre assigned)
        if (genreGroups['unknown'] && genreGroups['unknown'].length > 0) {
            genreGroups['unknown'].forEach(item => {
                if (diverseResults.length < topCandidates.length) {
                    diverseResults.push(item);
                }
            });
        }
        
        // Round-robin through genres
        let currentIndex = 0;
        while (diverseResults.length < topCandidates.length && genreKeys.length > 0) {
            const genre = genreKeys[currentIndex % genreKeys.length];
            
            if (genreGroups[genre].length > 0) {
                diverseResults.push(genreGroups[genre].shift());
                
                if (genreGroups[genre].length === 0) {
                    genreKeys = genreKeys.filter(g => g !== genre);
                    if (genreKeys.length > 0) {
                        currentIndex = currentIndex % genreKeys.length;
                    } else {
                        break;
                    }
                } else {
                    currentIndex++;
                }
            } else {
                currentIndex++;
            }
            
            if (currentIndex > 0 && genreKeys.length > 0 && currentIndex % genreKeys.length === 0) {
                break;
            }
        }
        
        // Add any remaining top items
        Object.values(genreGroups).forEach(group => {
            group.forEach(item => {
                if (!diverseResults.includes(item) && diverseResults.length < topCandidates.length) {
                    diverseResults.push(item);
                }
            });
        });
        
        // Append rest of candidates
        return [...diverseResults, ...restCandidates];
    } catch (error) {
        console.error("Error in applyDiversityBoost:", error);
        // Return original candidates if there was an error
        return candidates;
    }
}

// Enhanced TMDB fallback with error handling
async function fetchTmdbFallback(targetGenres, preferences, contentFilters, excludeIds, fallbackLimit) {
    try {
        if (!TMDB_API_KEY) {
            console.error("TMDB_API_KEY is not configured");
            return [];
        }
        
        // Map our genres to TMDB IDs
        const tmdbGenreIds = targetGenres
            .map(genre => REVERSE_GENRE_MAP[genre.toLowerCase()])
            .filter(id => id !== undefined);
        
        console.log(`Mapped genres to TMDB IDs: ${tmdbGenreIds.join(',')}`);
        
        const params = { 
            api_key: TMDB_API_KEY, 
            sort_by: 'popularity.desc', 
            'vote_count.gte': 50, 
            include_adult: false, 
            page: 1 
        };
        
        // Add genre filter
        if (tmdbGenreIds.length > 0) {
            // Take only first 2 genres to avoid over-filtering
            params.with_genres = tmdbGenreIds.slice(0, 2).join(',');
        }
        
        // Add language filter
        if (contentFilters.language && contentFilters.language.length > 0) {
            params.with_original_language = contentFilters.language[0];
        }
        
        // Add year filter
        if (contentFilters.era && contentFilters.era.length > 0) {
            const era = contentFilters.era[0];
            if (era) {
                // Use more recent dates for better results
                const currentYear = new Date().getFullYear();
                params.primary_release_date_gte = `${Math.max(era.start, currentYear - 20)}-01-01`;
                params.primary_release_date_lte = `${Math.min(era.end, currentYear)}-12-31`;
            }
        }
        
        // Determine media type
        const mediaType = contentFilters.mediaType === 'both' ? 
                         (Math.random() < 0.5 ? 'movie' : 'tv') : 
                         contentFilters.mediaType;
        
        const url = `https://api.themoviedb.org/3/discover/${mediaType}`;
        
        console.log(`Fetching TMDB fallback: ${url} with params:`, params);
        const response = await axiosInstance.get(url, { params });
        
        let results = response.data.results || [];
        results = results.filter(item => item.id && !excludeIds.has(item.id.toString()));
        
        // Add media type
        results = results.map(item => ({
            ...item,
            media_type: mediaType
        }));
        
        return results.slice(0, fallbackLimit);
    } catch (error) {
        console.error("Error in fetchTmdbFallback:", error);
        return [];
    }
}

// Fetch TMDB details with error handling and timeout
async function fetchTmdbDetails(mediaId, mediaType) {
    try {
        if (!TMDB_API_KEY || !mediaId || !mediaType || mediaType === 'unknown') {
            return null;
        }
        
        const apiMediaType = (mediaType === 'movie' || mediaType === 'tv') ? mediaType : null;
        if (!apiMediaType) {
            return null;
        }

        const url = `https://api.themoviedb.org/3/${apiMediaType}/${mediaId}`;
        const params = { api_key: TMDB_API_KEY };

        console.log(`Fetching TMDB details for ${apiMediaType}/${mediaId}`);
        const response = await axiosInstance.get(url, { params });
        
        return {
            poster_path: response.data.poster_path,
            backdrop_path: response.data.backdrop_path,
            vote_average: response.data.vote_average,
            overview: response.data.overview,
            genres: response.data.genres ? response.data.genres.map(g => g.name).join('|') : null,
        };
    } catch (error) {
        console.error(`Error fetching TMDB details for ${mediaType}/${mediaId}:`, error);
        return null;
    }
}

// Generate user-friendly recommendation reasons
function getRecommendationReason(item, preferences) {
    try {
        const { 
            genreScore = 0, 
            popularityScore = 0, 
            qualityScore = 0, 
            preferenceScore = 0 
        } = item.scoreComponents || {};
        
        const maxComponent = Math.max(genreScore, popularityScore, qualityScore, preferenceScore);
        
        if (maxComponent === genreScore && genreScore > 0) {
            // Genre-based recommendation
            if (preferences.favoriteGenres && Array.isArray(preferences.favoriteGenres)) {
                const matchesPreferredGenre = preferences.favoriteGenres.some(g => {
                    const genreName = typeof g === 'number' ? GENRE_ID_MAP[g] : g;
                    return genreName && genreName.toLowerCase() === item.genre.toLowerCase();
                });
                
                if (matchesPreferredGenre) {
                    return `Because you enjoy ${item.genre}`;
                }
            }

            // Check if any subgenres match
            if (preferences.subgenrePreferences && Array.isArray(preferences.subgenrePreferences)) {
                for (const [subgenre, genreIds] of Object.entries(SUBGENRE_TO_GENRE_MAP)) {
                    if (preferences.subgenrePreferences.includes(subgenre)) {
                        const subgenreGenres = genreIds.map(id => GENRE_ID_MAP[id] || '');
                        
                        if (subgenreGenres.some(g => g === item.genre)) {
                            const subgenreName = subgenre.charAt(0).toUpperCase() + subgenre.slice(1);
                            return `Matches your interest in ${subgenreName}`;
                        }
                    }
                }
            }
            
            return `Similar to titles you've enjoyed`;
        } else if (maxComponent === popularityScore && popularityScore > 10) {
            // Popularity-based
            return `Popular ${item.genre} ${item.mediaType === 'movie' ? 'film' : 'show'}`;
        } else if (maxComponent === qualityScore && qualityScore > 10) {
            // Quality-based
            return `Highly rated ${item.genre} ${item.mediaType === 'movie' ? 'film' : 'show'}`;
        } else if (maxComponent === preferenceScore && preferenceScore > 10) {
            // Preference-based
            if (preferences.eraPreferences?.length > 0 && item.releaseDate) {
                const year = parseInt(item.releaseDate.substring(0, 4));
                if (!isNaN(year)) {
                    const matchesEra = preferences.eraPreferences.some(era => {
                        const range = ERA_TO_YEAR_MAP[era];
                        return range && year >= range.start && year <= range.end;
                    });
                    
                    if (matchesEra) {
                        const eraName = preferences.eraPreferences[0];
                        const eraDisplay = eraName.charAt(0).toUpperCase() + eraName.slice(1);
                        return `From your preferred ${eraDisplay} era`;
                    }
                }
            }
            
            if (preferences.moodPreferences?.length > 0) {
                const moodMap = {
                    'exciting': 'exciting content',
                    'thoughtful': 'thoughtful stories',
                    'funny': 'comedies',
                    'scary': 'thriller/horror',
                    'emotional': 'emotional stories'
                };
                
                for (const mood of preferences.moodPreferences) {
                    if (moodMap[mood]) {
                        return `Matches your interest in ${moodMap[mood]}`;
                    }
                }
            }

            // Check for aesthetic preferences
            if (preferences.aestheticPreferences?.length > 0) {
                if (preferences.aestheticPreferences.includes('visuallyStunning')) {
                    return 'Visually impressive';
                }
                if (preferences.aestheticPreferences.includes('darkMoody')) {
                    return 'Dark and moody atmosphere';
                }
                if (preferences.aestheticPreferences.includes('colorful')) {
                    return 'Vibrant and colorful visuals';
                }
                if (preferences.aestheticPreferences.includes('minimalist')) {
                    return 'Clean, minimalist style';
                }
                if (preferences.aestheticPreferences.includes('retro')) {
                    return 'Classic retro aesthetic';
                }
                if (preferences.aestheticPreferences.includes('experimental')) {
                    return 'Unique visual approach';
                }
            }

            // Check for story structure preferences
            if (preferences.storyStructurePreferences?.length > 0) {
                if (preferences.storyStructurePreferences.includes('nonlinear')) {
                    return 'Non-linear storytelling';
                }
                if (preferences.storyStructurePreferences.includes('twist')) {
                    return 'Story with unexpected turns';
                }
                if (preferences.storyStructurePreferences.includes('anthology')) {
                    return 'Multiple storylines';
                }
            }

            // Check for character preferences
            if (preferences.characterPreferences?.length > 0) {
                if (preferences.characterPreferences.includes('complexProtagonist')) {
                    return 'Features complex characters';
                }
                if (preferences.characterPreferences.includes('ensemble')) {
                    return 'Strong ensemble cast';
                }
            }

            // Critical acclaim preferences
            if (preferences.criticalAcclaimPreferences?.length > 0) {
                if (preferences.criticalAcclaimPreferences.includes('awardWinning')) {
                    return 'Award-winning title';
                }
                if (preferences.criticalAcclaimPreferences.includes('criticallyAcclaimed')) {
                    return 'Critically acclaimed';
                }
                if (preferences.criticalAcclaimPreferences.includes('underrated')) {
                    return 'Underrated gem';
                }
                if (preferences.criticalAcclaimPreferences.includes('cultClassic')) {
                    return 'Cult favorite';
                }
            }
            
            return `Matches your preferences`;
        }
        
        // Release date-based (fallback)
        if (item.releaseDate) {
            const year = parseInt(item.releaseDate.substring(0, 4));
            const currentYear = new Date().getFullYear();
            
            if (!isNaN(year)) {
                if (year >= currentYear - 1) {
                    return "New release";
                } else if (year >= currentYear - 3) {
                    return "Recent release";
                }
            }
        }
        
        return `You might enjoy this`;
    } catch (error) {
        console.error("Error in getRecommendationReason:", error);
        return "Recommended for you";
    }
}