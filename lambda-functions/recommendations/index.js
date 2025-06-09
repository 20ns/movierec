const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const axios = require('axios');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        // Get user ID from Cognito token (if authenticated)
        const userId = event.requestContext?.authorizer?.claims?.sub;
        
        // Get query parameters
        const queryParams = event.queryStringParameters || {};
        const mediaType = queryParams.mediaType || 'both';
        const exclude = queryParams.exclude ? queryParams.exclude.split(',') : [];
        const preferences = queryParams.preferences ? JSON.parse(queryParams.preferences) : {};
        const favorites = queryParams.favorites ? queryParams.favorites.split(',') : [];
        const watchlist = queryParams.watchlist ? queryParams.watchlist.split(',') : [];

        // Check cache first
        const cacheKey = generateCacheKey(userId, mediaType, exclude, preferences, favorites, watchlist);
        const cachedResult = await getCachedRecommendations(cacheKey);
        
        if (cachedResult) {
            console.log('Returning cached recommendations');
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    items: cachedResult.items,
                    source: 'cache',
                    cached: true
                })
            };
        }

        // Generate new recommendations
        const recommendations = await generateRecommendations(userId, mediaType, exclude, preferences, favorites, watchlist);
        
        // Cache the results
        await cacheRecommendations(cacheKey, recommendations);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                items: recommendations,
                source: 'generated',
                cached: false
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};

function generateCacheKey(userId, mediaType, exclude, preferences, favorites, watchlist) {
    const keyData = {
        userId: userId || 'anonymous',
        mediaType,
        exclude: exclude.sort(),
        preferences,
        favorites: favorites.sort(),
        watchlist: watchlist.sort()
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 50);
}

async function getCachedRecommendations(cacheKey) {
    try {
        const params = {
            TableName: process.env.RECOMMENDATIONS_CACHE_TABLE,
            Key: { cacheKey: cacheKey }
        };

        const result = await dynamodb.get(params).promise();
        
        if (result.Item && result.Item.ttl > Math.floor(Date.now() / 1000)) {
            return result.Item;
        }
        
        return null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

async function cacheRecommendations(cacheKey, recommendations) {
    try {
        const params = {
            TableName: process.env.RECOMMENDATIONS_CACHE_TABLE,
            Item: {
                cacheKey: cacheKey,
                items: recommendations,
                ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
                createdAt: new Date().toISOString()
            }
        };

        await dynamodb.put(params).promise();
    } catch (error) {
        console.error('Cache put error:', error);
        // Don't throw - caching is not critical
    }
}

async function generateRecommendations(userId, mediaType, exclude, preferences, favorites, watchlist) {
    // This is where you'd implement your recommendation logic
    // For now, using TMDB API as fallback
    
    try {
        const tmdbApiKey = process.env.TMDB_API_KEY;
        if (!tmdbApiKey) {
            throw new Error('TMDB API key not configured');
        }

        // Determine API endpoint based on media type
        let endpoint = 'https://api.themoviedb.org/3/discover/movie';
        if (mediaType === 'tv') {
            endpoint = 'https://api.themoviedb.org/3/discover/tv';
        }

        // Build query parameters
        const params = {
            api_key: tmdbApiKey,
            sort_by: 'vote_average.desc',
            'vote_count.gte': 1000,
            page: Math.floor(Math.random() * 5) + 1 // Random page 1-5
        };

        // Apply user preferences if available
        if (preferences.favoriteGenres && preferences.favoriteGenres.length > 0) {
            params.with_genres = preferences.favoriteGenres.join(',');
        }

        if (preferences.languagePreferences && preferences.languagePreferences.length > 0) {
            params.with_original_language = preferences.languagePreferences[0];
        }

        const response = await axios.get(endpoint, { params });
        let results = response.data.results || [];

        // Filter out excluded items
        if (exclude.length > 0) {
            results = results.filter(item => !exclude.includes(item.id.toString()));
        }

        // Transform to consistent format
        const recommendations = results.slice(0, 10).map(item => ({
            mediaId: item.id,
            mediaType: mediaType === 'tv' ? 'tv' : 'movie',
            title: item.title || item.name,
            overview: item.overview,
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
            voteAverage: item.vote_average,
            releaseDate: item.release_date || item.first_air_date,
            popularity: item.popularity,
            genres: item.genre_ids ? item.genre_ids.join('|') : '',
            genre: null
        }));

        return recommendations;

    } catch (error) {
        console.error('Recommendation generation error:', error);
        return [];
    }
}
