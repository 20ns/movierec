# MovieRec Semantic Enhancement Implementation Plan

## Overview
This document outlines the complete implementation plan for enhancing the MovieRec recommendation system with AI-powered semantic understanding using sentence transformers and embedding-based similarity scoring.

## Current System Analysis

### Existing Architecture
- **Main Engine**: `PersonalizedRecommendationEngine` in `/lambda-functions/MovieRecPersonalizedApiHandler/index.js`
- **Scoring System**: Multi-factor weighted scoring (Genre 40%, Similarity 25%, Context 15%, Discovery 10%, Quality 10%)
- **Data Sources**: TMDB API, User Preferences (DynamoDB), Favorites, Watchlist
- **Processing Time**: ~11.5 seconds
- **Caching**: Lambda memory cache (5 min) + DynamoDB cache table

### Current Scoring Components
1. **Genre Match Score**: Based on user's genre ratings from questionnaire
2. **Favorite Similarity Score**: Matches against user's stated favorites
3. **Context Match Score**: Runtime and language preferences
4. **Discovery Preference Score**: Trending, hidden gems, award-winning content
5. **Quality Score**: TMDB ratings with weighted calculation

## Enhancement Strategy

### Phase 1: Core Semantic Enhancement
Add semantic understanding to content matching while preserving existing logic.

### New Scoring Distribution
- **Genre Match Score**: 35% (reduced from 40%)
- **Semantic Similarity Score**: 20% (NEW)
- **Favorite Similarity Score**: 20% (reduced from 25%)
- **Context Match Score**: 10% (reduced from 15%)
- **Discovery Preference Score**: 10% (unchanged)
- **Quality Score**: 5% (reduced from 10%)

## Implementation Plan

### Step 1: Create Lambda Layer with Sentence Transformers

#### 1.1 Create Layer Structure
```
lambda-layers/
└── sentence-transformers-layer/
    ├── python/
    │   └── lib/
    │       └── python3.9/
    │           └── site-packages/
    │               ├── sentence_transformers/
    │               ├── torch/
    │               ├── transformers/
    │               └── ... (dependencies)
    └── requirements.txt
```

#### 1.2 Layer Dependencies
```txt
sentence-transformers==2.2.2
torch==2.0.1+cpu
transformers==4.21.0
numpy==1.24.3
scikit-learn==1.3.0
```

#### 1.3 Build Script
Create `scripts/build-embedding-layer.sh`:
```bash
#!/bin/bash
mkdir -p lambda-layers/sentence-transformers-layer/python
pip install -r lambda-layers/sentence-transformers-layer/requirements.txt \
    --target lambda-layers/sentence-transformers-layer/python/lib/python3.9/site-packages/
```

#### 1.4 Model Selection
Use `sentence-transformers/all-MiniLM-L6-v2`:
- Size: ~80MB
- Performance: Good balance of speed and quality
- Suitable for content similarity tasks

### Step 2: Implement SemanticSimilarityScorer Class

#### 2.1 Create New File
Path: `/lambda-functions/MovieRecPersonalizedApiHandler/semanticScorer.js`

#### 2.2 Core Functionality
```javascript
class SemanticSimilarityScorer {
    constructor() {
        this.model = null;
        this.cache = new Map();
    }

    async initializeModel() {
        // Initialize sentence transformer model
    }

    async generateEmbedding(text) {
        // Generate embedding for text content
    }

    async calculateSimilarity(userPreferences, movieContent) {
        // Calculate semantic similarity score
    }

    getCachedEmbedding(key) {
        // Check cache for existing embeddings
    }

    setCachedEmbedding(key, embedding) {
        // Store embedding in cache
    }
}
```

#### 2.3 Text Processing Pipeline
1. **Content Extraction**: Extract meaningful text from movie data
   - Plot synopsis
   - Genre descriptions
   - Keywords
   - Director/cast information

2. **User Preference Processing**: Convert user preferences to text
   - Mood preferences
   - Genre explanations
   - Favorite movie descriptions
   - Deal-breaker text

3. **Embedding Generation**: Create vector representations

4. **Similarity Calculation**: Cosine similarity between embeddings

### Step 3: DynamoDB Embedding Cache Implementation

#### 3.1 Create New Table Schema
Table Name: `MovieRecEmbeddingCache`
```javascript
{
    contentId: "tmdb_123456", // Partition Key
    contentType: "movie|tv|user_preference", // Sort Key
    embedding: [0.1, 0.2, ...], // Embedding vector
    text: "Original text content",
    createdAt: "2025-01-15T10:30:00Z",
    expiresAt: "2025-02-15T10:30:00Z" // TTL for cache expiration
}
```

#### 3.2 Cache Strategy
- **Cache Duration**: 30 days for movie embeddings, 24 hours for user preferences
- **Cache Keys**: Combination of content ID + text hash
- **Fallback**: Generate embedding if cache miss

#### 3.3 Implementation Methods
```javascript
async getCachedEmbedding(contentId, contentType, textHash)
async setCachedEmbedding(contentId, contentType, textHash, embedding, text)
async batchGetEmbeddings(contentItems)
async cleanupExpiredEmbeddings()
```

### Step 4: Integration with PersonalizedRecommendationEngine

#### 4.1 Modify Constructor
Add semantic scorer initialization:
```javascript
constructor() {
    // Existing initialization
    this.semanticScorer = new SemanticSimilarityScorer();
}
```

#### 4.2 Update calculateRecommendationScore Method
```javascript
async calculateRecommendationScore(movie, userPreferences, userFavorites) {
    // Existing scores calculation
    const genreScore = this.calculateGenreScore(movie, userPreferences) * 0.35;
    const favoriteScore = this.calculateFavoriteScore(movie, userFavorites) * 0.20;
    const contextScore = this.calculateContextScore(movie, userPreferences) * 0.10;
    const discoveryScore = this.calculateDiscoveryScore(movie, userPreferences) * 0.10;
    const qualityScore = this.calculateQualityScore(movie) * 0.05;
    
    // NEW: Semantic similarity score
    const semanticScore = await this.calculateSemanticScore(movie, userPreferences) * 0.20;
    
    return genreScore + semanticScore + favoriteScore + contextScore + discoveryScore + qualityScore;
}
```

#### 4.3 Implement calculateSemanticScore Method
```javascript
async calculateSemanticScore(movie, userPreferences) {
    try {
        const movieText = this.extractMovieText(movie);
        const userText = this.extractUserPreferenceText(userPreferences);
        
        const similarity = await this.semanticScorer.calculateSimilarity(userText, movieText);
        return Math.max(0, Math.min(10, similarity * 10)); // Normalize to 0-10 scale
    } catch (error) {
        console.warn('Semantic scoring failed, using fallback:', error);
        return 5; // Neutral score as fallback
    }
}
```

#### 4.4 Text Extraction Methods
```javascript
extractMovieText(movie) {
    const components = [
        movie.overview || '',
        movie.tagline || '',
        (movie.genres || []).map(g => g.name).join(' '),
        (movie.keywords || []).map(k => k.name).join(' ')
    ];
    return components.filter(c => c.length > 0).join('. ');
}

extractUserPreferenceText(preferences) {
    const components = [
        preferences.favoriteGenres || '',
        preferences.moodPreferences || '',
        preferences.preferredThemes || '',
        preferences.favoriteMovieDescriptions || ''
    ];
    return components.filter(c => c.length > 0).join('. ');
}
```

### Step 5: Enhanced Explanation System

#### 5.1 Update generateRecommendationReason Method
Add semantic reasoning to explanations:
```javascript
generateRecommendationReason(movie, scores, userPreferences) {
    const reasons = [];
    
    // Existing reason generation
    if (scores.genre > 7) reasons.push(`Strong match with your ${topGenres.join(' and ')} preferences`);
    
    // NEW: Semantic reasoning
    if (scores.semantic > 7) {
        reasons.push(`The content themes and style align well with your interests`);
    }
    
    return reasons.join('. ') + '.';
}
```

### Step 6: Error Handling and Fallbacks

#### 6.1 Graceful Degradation
- If semantic scoring fails, fall back to original algorithm
- Log errors for monitoring
- Maintain original scoring weights as fallback

#### 6.2 Performance Monitoring
- Track embedding generation time
- Monitor cache hit rates
- Log semantic score distribution

### Step 7: Lambda Function Updates

#### 7.1 Update serverless.yml
Add layer reference:
```yaml
functions:
  movieRecPersonalizedApi:
    handler: index.handler
    layers:
      - { Ref: SentenceTransformersLayer }
    environment:
      EMBEDDING_CACHE_TABLE: ${self:provider.environment.EMBEDDING_CACHE_TABLE}
```

#### 7.2 Add Layer Definition
```yaml
layers:
  sentenceTransformers:
    path: ../lambda-layers/sentence-transformers-layer
    name: sentence-transformers-layer
    description: Sentence Transformers for semantic similarity
    compatibleRuntimes:
      - nodejs18.x
```

#### 7.3 Environment Variables
```yaml
environment:
  EMBEDDING_CACHE_TABLE: MovieRecEmbeddingCache-${self:provider.stage}
```

### Step 8: Infrastructure Updates

#### 8.1 Add DynamoDB Table to CDK
File: `infrastructure/lib/movierec-stack.ts`
```typescript
const embeddingCacheTable = new dynamodb.Table(this, 'EmbeddingCacheTable', {
    tableName: 'MovieRecEmbeddingCache',
    partitionKey: { name: 'contentId', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'contentType', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.ON_DEMAND,
    timeToLiveAttribute: 'expiresAt',
    pointInTimeRecovery: true
});
```

#### 8.2 Update Lambda Permissions
```typescript
embeddingCacheTable.grantReadWriteData(movieRecFunction);
```

## Testing Strategy

### Step 9: Comprehensive Testing

#### 9.1 Unit Tests
File: `tests/semantic-enhancement.test.js`
- Test embedding generation
- Test similarity calculation
- Test caching mechanisms
- Test fallback scenarios

#### 9.2 Integration Tests
- Test full recommendation flow with semantic scoring
- Test performance with different content types
- Test cache behavior

#### 9.3 A/B Testing Framework
- Compare recommendations with and without semantic scoring
- Measure user engagement differences
- Track recommendation accuracy

#### 9.4 Performance Tests
- Measure latency impact
- Test cold start performance
- Monitor memory usage

## Deployment Process

### Step 10: Deployment Steps

#### 10.1 Layer Deployment
```bash
# Build and deploy the layer
cd lambda-layers/sentence-transformers-layer
npm run build
serverless deploy --stage dev
```

#### 10.2 Infrastructure Deployment
```bash
# Deploy new DynamoDB table
cd infrastructure
cdk deploy --profile movieRec
```

#### 10.3 Function Deployment
```bash
# Deploy updated Lambda functions
npm run deploy:backend
```

#### 10.4 Frontend Updates (if needed)
```bash
# Deploy frontend changes
npm run build
# AWS Amplify will auto-deploy
```

## Monitoring and Optimization

### Step 11: Post-Deployment Monitoring

#### 11.1 Key Metrics
- Recommendation processing time
- Embedding cache hit rate
- User engagement with semantic recommendations
- Error rates and fallback usage

#### 11.2 Cost Monitoring
- Lambda execution time increase
- DynamoDB read/write costs
- Storage costs for embeddings

#### 11.3 Optimization Opportunities
- Batch embedding generation
- Model quantization for smaller size
- Precompute embeddings for popular content

## Rollback Plan

### Step 12: Safety Measures

#### 12.1 Feature Flags
Implement toggle to disable semantic scoring:
```javascript
const USE_SEMANTIC_SCORING = process.env.USE_SEMANTIC_SCORING === 'true';
```

#### 12.2 Gradual Rollout
- Deploy to dev environment first
- Test with limited user base
- Monitor metrics before full rollout

#### 12.3 Rollback Steps
1. Set USE_SEMANTIC_SCORING=false
2. Redeploy functions
3. Remove layer reference if needed
4. Clean up DynamoDB table

## Success Criteria

### Step 13: Evaluation Metrics

#### 13.1 Technical Success
- ✅ Semantic scoring implemented without breaking existing functionality
- ✅ Processing time remains under 15 seconds
- ✅ Error rate stays below 1%
- ✅ Cache hit rate above 70%

#### 13.2 Business Success
- ✅ Improved recommendation relevance (user feedback)
- ✅ Increased user engagement metrics
- ✅ Maintained or improved user satisfaction scores

## Timeline

### Step 14: Implementation Schedule

- **Day 1-2**: Layer creation and semantic scorer implementation
- **Day 3**: Integration with existing engine
- **Day 4**: DynamoDB cache implementation
- **Day 5**: Testing and debugging
- **Day 6**: Infrastructure updates and deployment
- **Day 7**: Monitoring and optimization

## Risk Mitigation

### Step 15: Risk Management

#### 15.1 Technical Risks
- **Lambda timeout**: Implement async processing and caching
- **Memory limits**: Use efficient models and optimize memory usage
- **Cold starts**: Layer keeps model loaded, implement warmup

#### 15.2 Business Risks
- **Cost overrun**: Monitor usage and implement cost alerts
- **User experience**: Maintain fallback to original system
- **Data privacy**: Ensure no user data is cached inappropriately

---

This plan provides a comprehensive roadmap for implementing semantic enhancement to the MovieRec recommendation system while maintaining cost-effectiveness and system reliability.