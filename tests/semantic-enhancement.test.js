/**
 * Semantic Enhancement Test Suite
 * Tests for the new AI-powered semantic similarity features
 */

const axios = require('axios');
require('dotenv').config();

// Import the semantic scorer for unit testing
// For integration tests, we'll test through the API
const mockSemanticScorer = {
  // Mock implementation for unit tests
  extractMovieText: jest.fn(),
  extractUserPreferenceText: jest.fn(),
  calculateSimilarity: jest.fn(),
  generateEmbedding: jest.fn(),
  cosineSimilarity: jest.fn(),
  calculateKeywordSimilarity: jest.fn()
};

describe('Semantic Enhancement Test Suite', () => {
  
  // Configuration
  const API_BASE_URL = process.env.API_BASE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
  const TEST_TIMEOUT = 60000; // 60 seconds for recommendation tests
  
  // Mock test data
  const mockUserPreferences = {
    favoriteContent: "I love action movies like John Wick, Marvel superhero films, and sci-fi thrillers",
    moodPreferences: "exciting, adrenaline-pumping, visually spectacular",
    genreRatings: {
      28: 9, // Action
      878: 8, // Science Fiction
      53: 7  // Thriller
    },
    favoritePeople: {
      actors: ["Keanu Reeves", "Robert Downey Jr."],
      directors: ["Christopher Nolan", "Denis Villeneuve"]
    }
  };

  const mockMovieData = {
    id: 550,
    title: "Fight Club",
    overview: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club.",
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" }
    ],
    keywords: [
      { name: "philosophy" },
      { name: "underground" },
      { name: "nihilism" }
    ],
    cast: [
      { name: "Brad Pitt" },
      { name: "Edward Norton" }
    ],
    crew: [
      { name: "David Fincher", job: "Director" }
    ],
    voteAverage: 8.4,
    tagline: "Mischief. Mayhem. Soap."
  };

  // ====================================
  // UNIT TESTS FOR SEMANTIC SCORER
  // ====================================

  describe('SemanticSimilarityScorer Unit Tests', () => {
    
    test('should extract meaningful text from movie data', () => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      const scorer = new SemanticSimilarityScorer();
      
      const movieText = scorer.extractMovieText(mockMovieData);
      
      expect(movieText).toContain("Fight Club");
      expect(movieText).toContain("insomniac office worker");
      expect(movieText).toContain("Drama");
      expect(movieText).toContain("Thriller");
      expect(movieText).toContain("Brad Pitt");
      expect(movieText).toContain("David Fincher");
      expect(movieText.length).toBeGreaterThan(50);
    });

    test('should extract user preference text', () => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      const scorer = new SemanticSimilarityScorer();
      
      const userText = scorer.extractUserPreferenceText(mockUserPreferences);
      
      expect(userText).toContain("action movies");
      expect(userText).toContain("John Wick");
      expect(userText).toContain("exciting");
      expect(userText).toContain("Keanu Reeves");
      expect(userText).toContain("Christopher Nolan");
      expect(userText.length).toBeGreaterThan(20);
    });

    test('should calculate cosine similarity between vectors', () => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      const scorer = new SemanticSimilarityScorer();
      
      // Test with identical vectors (should be 1.0)
      const vector1 = [1, 0, 1, 0];
      const vector2 = [1, 0, 1, 0];
      const similarity1 = scorer.cosineSimilarity(vector1, vector2);
      expect(similarity1).toBeCloseTo(1.0, 5);
      
      // Test with orthogonal vectors (should be 0.0)
      const vector3 = [1, 0, 0, 0];
      const vector4 = [0, 1, 0, 0];
      const similarity2 = scorer.cosineSimilarity(vector3, vector4);
      expect(similarity2).toBeCloseTo(0.0, 5);
      
      // Test with similar vectors
      const vector5 = [1, 2, 3];
      const vector6 = [2, 4, 6];
      const similarity3 = scorer.cosineSimilarity(vector5, vector6);
      expect(similarity3).toBeCloseTo(1.0, 5); // Parallel vectors
    });

    test('should calculate keyword similarity as fallback', () => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      const scorer = new SemanticSimilarityScorer();
      
      const text1 = "action superhero exciting adventure";
      const text2 = "superhero action adventure thrilling";
      
      const similarity = scorer.calculateKeywordSimilarity(text1, text2);
      
      expect(similarity).toBeGreaterThan(0.5); // Should have good overlap
      expect(similarity).toBeLessThanOrEqual(1.0);
    });

    test('should generate keyword embedding for fallback', () => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      const scorer = new SemanticSimilarityScorer();
      
      const text = "action adventure superhero exciting";
      const embedding = scorer.generateKeywordEmbedding(text);
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(50); // Fixed size
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    });

    test('should hash text consistently', () => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      const scorer = new SemanticSimilarityScorer();
      
      const text = "test text for hashing";
      const hash1 = scorer.hashText(text);
      const hash2 = scorer.hashText(text);
      
      expect(hash1).toBe(hash2); // Same text should produce same hash
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });
  });

  // ====================================
  // INTEGRATION TESTS
  // ====================================

  describe('Semantic Enhancement Integration Tests', () => {
    
    let authToken;
    
    beforeAll(async () => {
      // Get authentication token for API tests
      try {
        const authResponse = await axios.post(`${API_BASE_URL}/auth/signin`, {
          email: process.env.TEST_USER_EMAIL || 'test@movierec.net',
          password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
        });
        
        if (authResponse.data && authResponse.data.accessToken) {
          authToken = authResponse.data.accessToken;
        }
      } catch (error) {
        console.warn('Authentication failed for integration tests:', error.message);
        // Tests will run without auth (may have limited functionality)
      }
    }, 30000);

    test('should return recommendations with semantic scores', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=3&mediaType=movie`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(Array.isArray(response.data.items)).toBe(true);
      
      if (response.data.items.length > 0) {
        const firstItem = response.data.items[0];
        
        // Check that semantic scoring is working (score should be present)
        expect(firstItem).toHaveProperty('score');
        expect(typeof firstItem.score).toBe('number');
        expect(firstItem.score).toBeGreaterThan(-1000); // Not a deal-breaker
        
        // Check for recommendation reason (should include semantic insights)
        expect(firstItem).toHaveProperty('recommendationReason');
        expect(typeof firstItem.recommendationReason).toBe('string');
      }
    }, TEST_TIMEOUT);

    test('should handle preferences with semantic analysis', async () => {
      if (!authToken) {
        console.warn('Skipping authenticated test - no auth token');
        return;
      }

      // Post user preferences that should trigger semantic analysis
      const preferences = {
        favoriteContent: "I love sci-fi movies with complex plots like Inception, Blade Runner, and The Matrix",
        moodPreferences: "thought-provoking, visually stunning, philosophical",
        genreRatings: {
          878: 10, // Science Fiction
          53: 8    // Thriller
        }
      };

      const headers = { Authorization: `Bearer ${authToken}` };
      
      // Set preferences
      await axios.post(`${API_BASE_URL}/user/preferences`, preferences, { headers });
      
      // Get recommendations
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=5&mediaType=movie`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items.length).toBeGreaterThan(0);
      
      // Check if recommendations include sci-fi content
      const sciFiRecommendations = response.data.items.filter(item => 
        item.genres && item.genres.includes('878') // Sci-Fi genre ID
      );
      
      // With semantic enhancement, we should get some sci-fi recommendations
      expect(sciFiRecommendations.length).toBeGreaterThan(0);
      
    }, TEST_TIMEOUT);

    test('should process different content types', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      // Test both movies and TV shows
      const movieResponse = await axios.get(`${API_BASE_URL}/recommendations?limit=3&mediaType=movie`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      const tvResponse = await axios.get(`${API_BASE_URL}/recommendations?limit=3&mediaType=tv`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(movieResponse.status).toBe(200);
      expect(tvResponse.status).toBe(200);
      
      // Both should return valid recommendations
      expect(movieResponse.data.items.length).toBeGreaterThan(0);
      expect(tvResponse.data.items.length).toBeGreaterThan(0);
      
      // Movies should have movie-specific fields
      if (movieResponse.data.items[0]) {
        expect(movieResponse.data.items[0]).toHaveProperty('mediaType');
      }
      
    }, TEST_TIMEOUT);

    test('should maintain performance with semantic enhancement', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      const startTime = Date.now();
      
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=9&mediaType=both`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(response.data.items.length).toBeGreaterThan(0);
      
      // Processing time should be included in response
      if (response.data.items[0] && response.data.items[0].processingTime) {
        expect(response.data.items[0].processingTime).toBeLessThan(30000); // Under 30 seconds
      }
      
      // API response time should be reasonable
      expect(responseTime).toBeLessThan(TEST_TIMEOUT);
      
    }, TEST_TIMEOUT);

    test('should gracefully handle empty or invalid preferences', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      // Test with minimal user data
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=3&mediaType=movie`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items.length).toBeGreaterThan(0);
      
      // Should still provide recommendations even with minimal data
      response.data.items.forEach(item => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('score');
        expect(item).toHaveProperty('recommendationReason');
      });
      
    }, TEST_TIMEOUT);
  });

  // ====================================
  // PERFORMANCE TESTS
  // ====================================

  describe('Semantic Enhancement Performance Tests', () => {
    
    test('should handle concurrent recommendation requests', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 3 }, () =>
        axios.get(`${API_BASE_URL}/recommendations?limit=3&mediaType=movie`, {
          headers,
          timeout: TEST_TIMEOUT
        })
      );
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.items.length).toBeGreaterThan(0);
      });
      
    }, TEST_TIMEOUT);

    test('should not exceed memory limits', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      // Request maximum recommendations
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=9&mediaType=both`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items.length).toBeGreaterThan(0);
      expect(response.data.items.length).toBeLessThanOrEqual(9);
      
      // Check response size is reasonable
      const responseSize = JSON.stringify(response.data).length;
      expect(responseSize).toBeLessThan(1000000); // Under 1MB
      
    }, TEST_TIMEOUT);
  });

  // ====================================
  // ERROR HANDLING TESTS
  // ====================================

  describe('Semantic Enhancement Error Handling', () => {
    
    test('should handle API failures gracefully', async () => {
      // Test with invalid auth token
      const headers = { Authorization: 'Bearer invalid-token' };
      
      try {
        const response = await axios.get(`${API_BASE_URL}/recommendations?limit=3`, {
          headers,
          timeout: TEST_TIMEOUT
        });
        
        // Should either work with fallback or return proper error
        if (response.status === 200) {
          expect(response.data.items).toBeDefined();
        }
      } catch (error) {
        // Should return proper HTTP error code
        expect([401, 403]).toContain(error.response?.status);
      }
    }, TEST_TIMEOUT);

    test('should handle malformed preference data', async () => {
      if (!authToken) {
        console.warn('Skipping authenticated test - no auth token');
        return;
      }

      const headers = { Authorization: `Bearer ${authToken}` };
      
      // Test with malformed preferences
      const malformedPrefs = {
        favoriteContent: "", // Empty string
        moodPreferences: null, // Null value
        genreRatings: "not-an-object" // Wrong type
      };
      
      try {
        await axios.post(`${API_BASE_URL}/user/preferences`, malformedPrefs, { headers });
      } catch (error) {
        // Preferences endpoint might reject malformed data
      }
      
      // Recommendations should still work
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=3`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items.length).toBeGreaterThan(0);
      
    }, TEST_TIMEOUT);
  });

  // ====================================
  // SEMANTIC QUALITY TESTS
  // ====================================

  describe('Semantic Quality Tests', () => {
    
    test('should provide meaningful recommendation reasons', async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      
      const response = await axios.get(`${API_BASE_URL}/recommendations?limit=5`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(response.status).toBe(200);
      
      response.data.items.forEach(item => {
        expect(item.recommendationReason).toBeTruthy();
        expect(item.recommendationReason.length).toBeGreaterThan(10);
        
        // Should contain semantic-related reasoning
        const reason = item.recommendationReason.toLowerCase();
        const semanticKeywords = [
          'matches', 'aligns', 'preferences', 'interests',
          'similar', 'rated', 'genre', 'quality'
        ];
        
        const hasSemanticReason = semanticKeywords.some(keyword => 
          reason.includes(keyword)
        );
        
        expect(hasSemanticReason).toBe(true);
      });
      
    }, TEST_TIMEOUT);

    test('should differentiate between user preferences', async () => {
      if (!authToken) {
        console.warn('Skipping authenticated test - no auth token');
        return;
      }

      const headers = { Authorization: `Bearer ${authToken}` };
      
      // Set specific sci-fi preferences
      const sciFiPrefs = {
        favoriteContent: "Star Wars, Star Trek, Dune - I love space opera and hard science fiction",
        moodPreferences: "epic, futuristic, space adventures",
        genreRatings: { 878: 10, 12: 8 } // Sci-Fi and Adventure
      };
      
      await axios.post(`${API_BASE_URL}/user/preferences`, sciFiPrefs, { headers });
      
      const sciFiResponse = await axios.get(`${API_BASE_URL}/recommendations?limit=5&mediaType=movie`, {
        headers,
        timeout: TEST_TIMEOUT
      });
      
      expect(sciFiResponse.status).toBe(200);
      
      // Should have recommendations with sci-fi elements
      const hasSciFi = sciFiResponse.data.items.some(item => 
        item.genres && item.genres.includes('878')
      );
      
      expect(hasSciFi).toBe(true);
      
    }, TEST_TIMEOUT);
  });
});

// Export for use in other test files
module.exports = {
  mockUserPreferences,
  mockMovieData,
  API_BASE_URL: process.env.API_BASE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod'
};