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

// Function to get recommendations from TMDB API
async function getRecommendations(mediaType, excludeIds, limit, userPreferences) {
  const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    console.error('REACT_APP_TMDB_API_KEY environment variable not set');
    return [];
  }

  const recommendations = [];
  const seenIds = new Set(excludeIds.map(id => parseInt(id, 10)));

  try {
    // Determine what types of content to fetch
    const contentTypes = [];
    if (mediaType === 'both' || mediaType === 'movie') {
      contentTypes.push('movie');
    }
    if (mediaType === 'both' || mediaType === 'tv') {
      contentTypes.push('tv');
    }

    // Fetch popular content for each type
    for (const type of contentTypes) {
      const endpoint = type === 'movie' ? 'movie/popular' : 'tv/popular';
      const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&page=1`;
      
      console.log(`Fetching from TMDB: ${url}`);
      
      const response = await rateLimiter.add(async () => {
        return await axiosInstance.get(url);
      });

      if (response && response.data && response.data.results) {
        for (const item of response.data.results) {
          if (recommendations.length >= limit) break;
          if (seenIds.has(item.id)) continue;
          
          // Convert to our format
          const recommendation = {
            mediaId: item.id.toString(),
            title: item.title || item.name,
            overview: item.overview || '',
            posterPath: item.poster_path || '',
            backdropPath: item.backdrop_path || '',
            voteAverage: item.vote_average || 0,
            releaseDate: item.release_date || item.first_air_date || '',
            popularity: item.popularity || 0,
            mediaType: type,
            genres: item.genre_ids ? item.genre_ids.join('|') : ''
          };
          
          recommendations.push(recommendation);
          seenIds.add(item.id);
        }
      }
    }

    console.log(`Generated ${recommendations.length} recommendations`);
    return recommendations;

  } catch (error) {
    console.error('Error fetching recommendations from TMDB:', error);
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
        // Get user preferences for personalization
        const preferencesCommand = new GetCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: { userId: userId }
        });

        const preferencesResult = await dynamoDB.send(preferencesCommand);
        const userPreferences = preferencesResult.Item || {};

        // Get query parameters
        const queryParams = event.queryStringParameters || {};
        const mediaType = queryParams.mediaType || 'both';
        const excludeIds = queryParams.exclude ? queryParams.exclude.split(',').map(id => id.trim()) : [];
        const limit = Math.min(parseInt(queryParams.limit) || 6, 20); // Max 20 items
        
        console.log('Fetching recommendations with params:', { mediaType, excludeIds, limit });

        // Fetch recommendations from TMDB
        const recommendations = await getRecommendations(mediaType, excludeIds, limit, userPreferences);

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