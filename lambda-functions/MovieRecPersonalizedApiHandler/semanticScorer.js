const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require('axios');

// Initialize DynamoDB client for embedding cache
const client = new DynamoDBClient({
    maxAttempts: 3,
    retryMode: 'standard'
});
const dynamoDB = DynamoDBDocumentClient.from(client);

/**
 * SemanticSimilarityScorer - Provides semantic similarity scoring for movie recommendations
 * Uses Hugging Face Inference API for sentence transformers when available,
 * with fallback to keyword-based similarity
 */
class SemanticSimilarityScorer {
    constructor() {
        this.cache = new Map(); // In-memory cache for current execution
        this.useExternalAPI = process.env.USE_SEMANTIC_API === 'true';
        this.apiEndpoint = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';
        this.maxRetries = 2;
        
        // Fallback keyword similarity configuration
        this.keywordWeights = {
            'genre': 1.0,
            'director': 0.8,
            'actor': 0.6,
            'keyword': 0.7,
            'plot': 0.9
        };
    }

    /**
     * Generate semantic embedding for text content
     * @param {string} text - Text to generate embedding for
     * @param {string} cacheKey - Unique identifier for caching
     * @returns {Promise<Array>} - Embedding vector or null if failed
     */
    async generateEmbedding(text, cacheKey = null) {
        if (!text || text.trim().length === 0) {
            return null;
        }

        // Check cache first
        if (cacheKey) {
            const cached = await this.getCachedEmbedding(cacheKey);
            if (cached) {
                return cached;
            }
        }

        try {
            if (this.useExternalAPI && process.env.HUGGINGFACE_API_KEY) {
                return await this.generateEmbeddingAPI(text, cacheKey);
            } else {
                // Use fallback similarity approach
                return this.generateKeywordEmbedding(text);
            }
        } catch (error) {
            console.warn('Embedding generation failed, using fallback:', error);
            return this.generateKeywordEmbedding(text);
        }
    }

    /**
     * Generate embedding using Hugging Face API
     * @param {string} text - Text to process
     * @param {string} cacheKey - Cache identifier
     * @returns {Promise<Array>} - Embedding vector
     */
    async generateEmbeddingAPI(text, cacheKey) {
        const headers = {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
        };

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await axios.post(this.apiEndpoint, {
                    inputs: text.substring(0, 512) // Limit text length
                }, { 
                    headers,
                    timeout: 10000 // 10 second timeout
                });

                if (response.data && Array.isArray(response.data)) {
                    const embedding = response.data;
                    
                    // Cache the result
                    if (cacheKey) {
                        await this.setCachedEmbedding(cacheKey, embedding, text);
                    }
                    
                    return embedding;
                }
            } catch (error) {
                console.warn(`API attempt ${attempt + 1} failed:`, error.message);
                if (attempt === this.maxRetries) {
                    throw error;
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        
        throw new Error('All API attempts failed');
    }

    /**
     * Generate simple keyword-based embedding (fallback)
     * @param {string} text - Text to process
     * @returns {Array} - Simple keyword vector
     */
    generateKeywordEmbedding(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);

        // Create a simple frequency-based vector
        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        // Convert to normalized vector (simplified)
        const totalWords = words.length;
        const embedding = Object.keys(wordFreq)
            .slice(0, 50) // Limit to top 50 words
            .map(word => wordFreq[word] / totalWords);

        // Pad or truncate to fixed size
        while (embedding.length < 50) embedding.push(0);
        return embedding.slice(0, 50);
    }

    /**
     * Calculate semantic similarity between two pieces of text
     * @param {string} userText - User preference text
     * @param {string} movieText - Movie content text
     * @returns {Promise<number>} - Similarity score (0-1)
     */
    async calculateSimilarity(userText, movieText) {
        try {
            const userKey = `user_${this.hashText(userText)}`;
            const movieKey = `movie_${this.hashText(movieText)}`;

            // Generate embeddings
            const [userEmbedding, movieEmbedding] = await Promise.all([
                this.generateEmbedding(userText, userKey),
                this.generateEmbedding(movieText, movieKey)
            ]);

            if (!userEmbedding || !movieEmbedding) {
                // Fallback to keyword similarity
                return this.calculateKeywordSimilarity(userText, movieText);
            }

            // Calculate cosine similarity
            return this.cosineSimilarity(userEmbedding, movieEmbedding);
        } catch (error) {
            console.warn('Similarity calculation failed, using keyword fallback:', error);
            return this.calculateKeywordSimilarity(userText, movieText);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} a - First vector
     * @param {Array} b - Second vector
     * @returns {number} - Cosine similarity (0-1)
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            console.warn('Vector length mismatch in cosine similarity');
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        const similarity = dotProduct / (normA * normB);
        return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
    }

    /**
     * Fallback keyword-based similarity calculation
     * @param {string} userText - User preference text
     * @param {string} movieText - Movie content text
     * @returns {number} - Similarity score (0-1)
     */
    calculateKeywordSimilarity(userText, movieText) {
        const userWords = new Set(
            userText.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2)
        );

        const movieWords = new Set(
            movieText.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2)
        );

        // Calculate Jaccard similarity
        const intersection = new Set([...userWords].filter(x => movieWords.has(x)));
        const union = new Set([...userWords, ...movieWords]);

        if (union.size === 0) return 0;
        return intersection.size / union.size;
    }

    /**
     * Generate hash for text caching
     * @param {string} text - Text to hash
     * @returns {string} - Hash string
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get cached embedding from DynamoDB
     * @param {string} cacheKey - Cache key
     * @returns {Promise<Array|null>} - Cached embedding or null
     */
    async getCachedEmbedding(cacheKey) {
        try {
            // Check in-memory cache first
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Check DynamoDB cache
            const command = new GetCommand({
                TableName: process.env.EMBEDDING_CACHE_TABLE || 'MovieRecEmbeddingCache',
                Key: {
                    contentId: cacheKey,
                    contentType: 'embedding'
                }
            });

            const result = await dynamoDB.send(command);
            if (result.Item && result.Item.embedding) {
                const embedding = result.Item.embedding;
                // Store in memory cache for current execution
                this.cache.set(cacheKey, embedding);
                return embedding;
            }
        } catch (error) {
            console.warn('Cache retrieval failed:', error);
        }
        return null;
    }

    /**
     * Store embedding in cache
     * @param {string} cacheKey - Cache key
     * @param {Array} embedding - Embedding vector
     * @param {string} originalText - Original text
     */
    async setCachedEmbedding(cacheKey, embedding, originalText) {
        try {
            // Store in memory cache
            this.cache.set(cacheKey, embedding);

            // Store in DynamoDB cache (with TTL)
            const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

            const command = new PutCommand({
                TableName: process.env.EMBEDDING_CACHE_TABLE || 'MovieRecEmbeddingCache',
                Item: {
                    contentId: cacheKey,
                    contentType: 'embedding',
                    embedding: embedding,
                    text: originalText.substring(0, 500), // Store limited text for debugging
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAt
                }
            });

            await dynamoDB.send(command);
        } catch (error) {
            console.warn('Cache storage failed:', error);
            // Don't throw error - caching is not critical
        }
    }

    /**
     * Extract meaningful text from movie data for semantic analysis
     * @param {Object} movie - Movie/TV show object
     * @returns {string} - Combined text for analysis
     */
    extractMovieText(movie) {
        const components = [];

        // Add overview/plot
        if (movie.overview) {
            components.push(movie.overview);
        }

        // Add tagline
        if (movie.tagline) {
            components.push(movie.tagline);
        }

        // Add genre names
        if (movie.genres && Array.isArray(movie.genres)) {
            const genreNames = movie.genres.map(g => g.name || '').filter(name => name);
            if (genreNames.length > 0) {
                components.push('Genres: ' + genreNames.join(', '));
            }
        }

        // Add keywords
        if (movie.keywords && Array.isArray(movie.keywords)) {
            const keywordNames = movie.keywords.map(k => k.name || '').filter(name => name);
            if (keywordNames.length > 0) {
                components.push('Keywords: ' + keywordNames.slice(0, 10).join(', '));
            }
        }

        // Add cast information (top actors)
        if (movie.cast && Array.isArray(movie.cast)) {
            const actorNames = movie.cast.slice(0, 5).map(actor => actor.name || '').filter(name => name);
            if (actorNames.length > 0) {
                components.push('Starring: ' + actorNames.join(', '));
            }
        }

        // Add director information
        if (movie.crew && Array.isArray(movie.crew)) {
            const directors = movie.crew.filter(person => person.job === 'Director');
            if (directors.length > 0) {
                const directorNames = directors.map(d => d.name).filter(name => name);
                components.push('Directed by: ' + directorNames.join(', '));
            }
        }

        return components.filter(comp => comp && comp.length > 0).join('. ');
    }

    /**
     * Extract user preference text for semantic analysis
     * @param {Object} preferences - User preferences object
     * @returns {string} - Combined preference text
     */
    extractUserPreferenceText(preferences) {
        const components = [];

        // Add favorite content descriptions
        if (preferences.favoriteContent) {
            components.push('Favorite content: ' + preferences.favoriteContent);
        }

        // Add mood preferences
        if (preferences.moodPreferences) {
            components.push('Mood preferences: ' + preferences.moodPreferences);
        }

        // Add genre preferences (text descriptions)
        if (preferences.genreDescriptions) {
            components.push('Genre interests: ' + preferences.genreDescriptions);
        }

        // Add favorite people
        if (preferences.favoritePeople) {
            if (preferences.favoritePeople.actors) {
                components.push('Favorite actors: ' + preferences.favoritePeople.actors.join(', '));
            }
            if (preferences.favoritePeople.directors) {
                components.push('Favorite directors: ' + preferences.favoritePeople.directors.join(', '));
            }
        }

        // Add content discovery preferences
        if (preferences.contentDiscoveryPreference && Array.isArray(preferences.contentDiscoveryPreference)) {
            components.push('Discovery preferences: ' + preferences.contentDiscoveryPreference.join(', '));
        }

        return components.filter(comp => comp && comp.length > 0).join('. ');
    }
}

module.exports = SemanticSimilarityScorer;