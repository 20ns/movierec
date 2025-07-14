/**
 * Semantic Enhancement Smoke Test
 * Quick validation that semantic enhancement components can be loaded and basic functionality works
 */

describe('Semantic Enhancement Smoke Tests', () => {
  
  test('should be able to import SemanticSimilarityScorer', () => {
    expect(() => {
      const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
      expect(SemanticSimilarityScorer).toBeDefined();
      expect(typeof SemanticSimilarityScorer).toBe('function');
    }).not.toThrow();
  });

  test('should be able to create SemanticSimilarityScorer instance', () => {
    const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
    
    expect(() => {
      const scorer = new SemanticSimilarityScorer();
      expect(scorer).toBeDefined();
      expect(scorer.cache).toBeDefined();
      expect(typeof scorer.extractMovieText).toBe('function');
      expect(typeof scorer.calculateSimilarity).toBe('function');
    }).not.toThrow();
  });

  test('should handle basic text extraction without errors', () => {
    const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
    const scorer = new SemanticSimilarityScorer();
    
    const mockMovie = {
      title: "Test Movie",
      overview: "A test movie overview",
      genres: [{ id: 28, name: "Action" }]
    };
    
    const mockPreferences = {
      favoriteContent: "I like action movies"
    };
    
    expect(() => {
      const movieText = scorer.extractMovieText(mockMovie);
      const userText = scorer.extractUserPreferenceText(mockPreferences);
      
      expect(typeof movieText).toBe('string');
      expect(typeof userText).toBe('string');
      expect(movieText.length).toBeGreaterThan(0);
      expect(userText.length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  test('should be able to calculate keyword similarity', () => {
    const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
    const scorer = new SemanticSimilarityScorer();
    
    expect(() => {
      const similarity = scorer.calculateKeywordSimilarity("action movie", "action film");
      expect(typeof similarity).toBe('number');
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    }).not.toThrow();
  });

  test('should validate main recommendation engine can import semantic scorer', () => {
    expect(() => {
      // This will test if the require statement in index.js works
      const indexPath = '../lambda-functions/MovieRecPersonalizedApiHandler/index.js';
      delete require.cache[require.resolve(indexPath)];
      require(indexPath);
    }).not.toThrow();
  });

  test('should handle environment variables gracefully', () => {
    const SemanticSimilarityScorer = require('../lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer');
    
    // Test with no environment variables set
    const originalEnv = process.env.USE_SEMANTIC_API;
    delete process.env.USE_SEMANTIC_API;
    
    expect(() => {
      const scorer = new SemanticSimilarityScorer();
      expect(scorer.useExternalAPI).toBe(false); // Should default to false
    }).not.toThrow();
    
    // Restore environment
    if (originalEnv) {
      process.env.USE_SEMANTIC_API = originalEnv;
    }
  });
});