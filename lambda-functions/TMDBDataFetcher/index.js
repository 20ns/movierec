const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB with retry configuration
const client = new DynamoDBClient({
    maxAttempts: 3,
    retryMode: 'standard'
});
const dynamoDB = DynamoDBDocumentClient.from(client);

// HTTP request function using native fetch API (Node.js 18+)
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 20000);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'MovieRec/1.0 (Scheduled Content Fetcher)',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Rate limiter to respect TMDB API limits (40 requests per 10 seconds)
const rateLimiter = {
    queue: [],
    running: 0,
    maxConcurrent: 8, // Conservative limit
    lastRequest: 0,
    minDelay: 250, // 250ms between requests
    
    async add(fn) {
        return new Promise((resolve) => {
            const run = async () => {
                this.running++;
                
                // Enforce minimum delay between requests
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequest;
                if (timeSinceLastRequest < this.minDelay) {
                    await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
                }
                
                try {
                    this.lastRequest = Date.now();
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    console.error('Rate limiter error:', error.message);
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

// Smart TMDB Data Fetcher Class
class TMDBDataFetcher {
    constructor() {
        // Validate required environment variables
        if (!process.env.REACT_APP_TMDB_API_KEY) {
            throw new Error('REACT_APP_TMDB_API_KEY environment variable not set');
        }
        
        if (!process.env.RECOMMENDATIONS_CACHE_TABLE) {
            throw new Error('RECOMMENDATIONS_CACHE_TABLE environment variable not set');
        }
        
        if (!process.env.EMBEDDING_CACHE_TABLE) {
            throw new Error('EMBEDDING_CACHE_TABLE environment variable not set');
        }
        
        this.tmdbApiKey = process.env.REACT_APP_TMDB_API_KEY;
        this.cacheTable = process.env.RECOMMENDATIONS_CACHE_TABLE;
        this.embeddingCacheTable = process.env.EMBEDDING_CACHE_TABLE;
        
        // Popular genres for focused fetching
        this.popularGenres = [
            28,    // Action
            35,    // Comedy  
            18,    // Drama
            878,   // Science Fiction
            27,    // Horror
            53,    // Thriller
            10749, // Romance
            14,    // Fantasy
            80,    // Crime
            12     // Adventure
        ];
    }

    // Main execution method based on schedule type
    async execute(scheduleType = 'daily') {
        console.log(`Starting TMDB data fetch - Schedule: ${scheduleType}`);
        const startTime = Date.now();
        let totalFetched = 0;
        
        try {
            switch (scheduleType) {
                case 'daily':
                    totalFetched = await this.executeDailyFetch();
                    break;
                case 'weekly':
                    totalFetched = await this.executeWeeklyFetch();
                    break;
                case 'full':
                    totalFetched = await this.executeFullRefresh();
                    break;
                default:
                    throw new Error(`Unknown schedule type: ${scheduleType}`);
            }
            
            const duration = Date.now() - startTime;
            console.log(`TMDB fetch completed: ${totalFetched} items in ${duration}ms`);
            
            return {
                success: true,
                scheduleType,
                itemsFetched: totalFetched,
                durationMs: duration
            };
            
        } catch (error) {
            console.error('TMDB fetch failed:', error);
            return {
                success: false,
                scheduleType,
                error: error.message,
                durationMs: Date.now() - startTime
            };
        }
    }

    // Daily fetch: Popular and trending content
    async executeDailyFetch() {
        console.log('Executing daily fetch: Popular + Trending content');
        let totalFetched = 0;
        
        const tasks = [
            // Popular content
            this.fetchAndCachePopular('movie', 2),
            this.fetchAndCachePopular('tv', 2),
            
            // Trending content
            this.fetchAndCacheTrending('movie', 1),
            this.fetchAndCacheTrending('tv', 1),
            this.fetchAndCacheTrending('all', 1), // Mixed trending
        ];
        
        const results = await Promise.all(tasks);
        totalFetched = results.reduce((sum, count) => sum + (count || 0), 0);
        
        console.log(`Daily fetch completed: ${totalFetched} items`);
        return totalFetched;
    }

    // Weekly fetch: Genre-based and specialized content
    async executeWeeklyFetch() {
        console.log('Executing weekly fetch: Genre-based + Specialized content');
        let totalFetched = 0;
        
        const tasks = [];
        
        // Genre-based content for popular genres (1 page each)
        for (const genreId of this.popularGenres.slice(0, 5)) { // Top 5 genres only
            tasks.push(this.fetchAndCacheGenreContent('movie', genreId, 1));
            tasks.push(this.fetchAndCacheGenreContent('tv', genreId, 1));
        }
        
        // Specialized content
        tasks.push(this.fetchAndCacheHiddenGems('movie', 1));
        tasks.push(this.fetchAndCacheHiddenGems('tv', 1));
        tasks.push(this.fetchAndCacheAwardWinning('movie', 1));
        tasks.push(this.fetchAndCacheAwardWinning('tv', 1));
        
        const results = await Promise.all(tasks);
        totalFetched = results.reduce((sum, count) => sum + (count || 0), 0);
        
        console.log(`Weekly fetch completed: ${totalFetched} items`);
        return totalFetched;
    }

    // Full refresh: All content types (for manual triggers)
    async executeFullRefresh() {
        console.log('Executing full refresh: All content types');
        const dailyCount = await this.executeDailyFetch();
        const weeklyCount = await this.executeWeeklyFetch();
        
        return dailyCount + weeklyCount;
    }

    // Fetch popular content
    async fetchAndCachePopular(mediaType, pages = 2) {
        const items = [];
        
        for (let page = 1; page <= pages; page++) {
            const result = await rateLimiter.add(async () => {
                const url = `https://api.themoviedb.org/3/${mediaType}/popular?api_key=${this.tmdbApiKey}&page=${page}`;
                const response = await fetchWithTimeout(url);
                return { data: await response.json() };
            });
            
            if (result?.data?.results) {
                items.push(...result.data.results);
            }
        }
        
        if (items.length > 0) {
            await this.cacheItems(items, mediaType, 'popular');
            console.log(`Cached ${items.length} popular ${mediaType} items`);
        }
        
        return items.length;
    }

    // Fetch trending content
    async fetchAndCacheTrending(mediaType, pages = 1) {
        const items = [];
        
        for (let page = 1; page <= pages; page++) {
            const result = await rateLimiter.add(async () => {
                const url = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${this.tmdbApiKey}&page=${page}`;
                const response = await fetchWithTimeout(url);
                return { data: await response.json() };
            });
            
            if (result?.data?.results) {
                items.push(...result.data.results);
            }
        }
        
        if (items.length > 0) {
            await this.cacheItems(items, mediaType, 'trending');
            console.log(`Cached ${items.length} trending ${mediaType} items`);
        }
        
        return items.length;
    }

    // Fetch genre-based content
    async fetchAndCacheGenreContent(mediaType, genreId, pages = 1) {
        const items = [];
        
        for (let page = 1; page <= pages; page++) {
            const result = await rateLimiter.add(async () => {
                const url = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${this.tmdbApiKey}&with_genres=${genreId}&page=${page}&sort_by=vote_average.desc&vote_count.gte=100`;
                const response = await fetchWithTimeout(url);
                return { data: await response.json() };
            });
            
            if (result?.data?.results) {
                items.push(...result.data.results);
            }
        }
        
        if (items.length > 0) {
            await this.cacheItems(items, mediaType, `genre_${genreId}`);
            console.log(`Cached ${items.length} genre ${genreId} ${mediaType} items`);
        }
        
        return items.length;
    }

    // Fetch hidden gems
    async fetchAndCacheHiddenGems(mediaType, pages = 1) {
        const items = [];
        
        for (let page = 1; page <= pages; page++) {
            const result = await rateLimiter.add(async () => {
                const url = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${this.tmdbApiKey}&page=${page}&sort_by=vote_average.desc&vote_count.gte=50&vote_count.lte=500`;
                const response = await fetchWithTimeout(url);
                return { data: await response.json() };
            });
            
            if (result?.data?.results) {
                items.push(...result.data.results);
            }
        }
        
        if (items.length > 0) {
            await this.cacheItems(items, mediaType, 'hidden_gems');
            console.log(`Cached ${items.length} hidden gems ${mediaType} items`);
        }
        
        return items.length;
    }

    // Fetch award-winning content
    async fetchAndCacheAwardWinning(mediaType, pages = 1) {
        const items = [];
        
        for (let page = 1; page <= pages; page++) {
            const result = await rateLimiter.add(async () => {
                const url = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${this.tmdbApiKey}&page=${page}&sort_by=vote_average.desc&vote_count.gte=1000`;
                const response = await fetchWithTimeout(url);
                return { data: await response.json() };
            });
            
            if (result?.data?.results) {
                items.push(...result.data.results);
            }
        }
        
        if (items.length > 0) {
            await this.cacheItems(items, mediaType, 'award_winning');
            console.log(`Cached ${items.length} award-winning ${mediaType} items`);
        }
        
        return items.length;
    }

    // Cache items in DynamoDB with efficient batching
    async cacheItems(items, mediaType, category) {
        if (!items || items.length === 0) return;
        
        const batchSize = 25; // DynamoDB batch write limit
        const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days TTL
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const writeRequests = batch.map(item => ({
                PutRequest: {
                    Item: {
                        // Composite key: category#mediaType#id
                        cacheKey: `${category}#${mediaType}#${item.id}`,
                        contentId: item.id.toString(),
                        contentType: mediaType,
                        category: category,
                        
                        // Essential data for recommendations
                        title: item.title || item.name || '',
                        overview: item.overview || '',
                        posterPath: item.poster_path || '',
                        backdropPath: item.backdrop_path || '',
                        voteAverage: item.vote_average || 0,
                        voteCount: item.vote_count || 0,
                        popularity: item.popularity || 0,
                        releaseDate: item.release_date || item.first_air_date || '',
                        genreIds: item.genre_ids || [],
                        originalLanguage: item.original_language || 'en',
                        adult: item.adult || false,
                        
                        // Metadata
                        fetchedAt: Date.now(),
                        expiresAt: expiresAt,
                        source: 'tmdb_scheduled_fetch'
                    }
                }
            }));
            
            try {
                await dynamoDB.send(new BatchWriteCommand({
                    RequestItems: {
                        [this.cacheTable]: writeRequests
                    }
                }));
                
                console.log(`Batch cached ${writeRequests.length} items for ${category}#${mediaType}`);
                
            } catch (error) {
                console.error(`Error caching batch for ${category}#${mediaType}:`, error);
                
                // Fallback to individual puts if batch fails
                for (const request of writeRequests) {
                    try {
                        await dynamoDB.send(new PutCommand({
                            TableName: this.cacheTable,
                            Item: request.PutRequest.Item
                        }));
                    } catch (putError) {
                        console.error(`Error caching individual item:`, putError);
                    }
                }
            }
            
            // Small delay between batches
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    // Get cache statistics for monitoring
    async getCacheStats() {
        try {
            const result = await dynamoDB.send(new QueryCommand({
                TableName: this.cacheTable,
                IndexName: 'GSI1', // Assuming you have a GSI on source
                KeyConditionExpression: '#source = :source',
                ExpressionAttributeNames: {
                    '#source': 'source'
                },
                ExpressionAttributeValues: {
                    ':source': 'tmdb_scheduled_fetch'
                },
                Select: 'COUNT'
            }));
            
            return {
                totalCachedItems: result.Count || 0,
                lastUpdated: Date.now()
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalCachedItems: 0,
                error: error.message
            };
        }
    }
}

// Lambda handler
exports.handler = async (event) => {
    console.log('TMDB Data Fetcher started:', JSON.stringify(event, null, 2));
    
    try {
        const fetcher = new TMDBDataFetcher();
        
        // Determine schedule type from event source
        let scheduleType = 'daily'; // default
        
        if (event.source === 'aws.events') {
            // EventBridge scheduled event
            scheduleType = event.detail?.scheduleType || 'daily';
        } else if (event.scheduleType) {
            // Direct invocation with scheduleType
            scheduleType = event.scheduleType;
        }
        
        const result = await fetcher.execute(scheduleType);
        
        // Add cache stats to result
        const stats = await fetcher.getCacheStats();
        result.cacheStats = stats;
        
        console.log('TMDB fetch result:', result);
        return result;
        
    } catch (error) {
        console.error('TMDB Data Fetcher error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
};