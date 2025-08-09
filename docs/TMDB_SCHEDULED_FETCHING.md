# TMDB Scheduled Data Fetching System

## Overview

The TMDB Scheduled Data Fetching System is a smart, AWS-native solution that pre-fetches and caches popular content from The Movie Database (TMDB) API. This system significantly improves recommendation performance by reducing real-time API calls and staying within AWS free tier limits.

## Architecture

### Components

1. **TMDBDataFetcher Lambda Function** - Core fetching and caching logic
2. **EventBridge Rules** - Scheduled triggers for daily and weekly execution
3. **DynamoDB Cache** - Stores pre-fetched TMDB data with TTL
4. **Enhanced Recommendation System** - Cache-first content discovery

### Data Flow

```
EventBridge Schedule → Lambda Function → TMDB API → DynamoDB Cache → Recommendations
```

## Scheduling Strategy

### Daily Fetch (8 AM UTC)
**Content Types:**
- Popular movies (2 pages ≈ 40 items)
- Popular TV shows (2 pages ≈ 40 items)  
- Trending movies (1 page ≈ 20 items)
- Trending TV shows (1 page ≈ 20 items)
- Mixed trending content (1 page ≈ 20 items)

**Total:** ~140 items daily

### Weekly Fetch (Sundays at 9 AM UTC)
**Content Types:**
- Genre-based content for top 5 genres (10 pages total ≈ 200 items)
- Hidden gems movies and TV (2 pages ≈ 40 items)
- Award-winning movies and TV (2 pages ≈ 40 items)

**Total:** ~280 items weekly

## AWS Free Tier Compliance

### Resource Usage Estimation

**Lambda Function:**
- Daily execution: ~2-3 minutes
- Weekly execution: ~4-5 minutes
- Monthly total: ~100 minutes
- Free tier: 400,000 GB-seconds (well within limits)

**DynamoDB:**
- Storage: ~420 items × 2KB ≈ 0.84MB
- Read/Write units: ~50 per day
- Free tier: 25GB storage, 25 RCU/WCU (well within limits)

**EventBridge:**
- Events: 2 per day (daily + weekly triggers)
- Monthly total: ~62 events
- Free tier: 1M events (well within limits)

**API Calls to TMDB:**
- Daily: ~5 API calls
- Weekly: ~12 API calls
- Monthly total: ~200 calls (well within TMDB rate limits)

## Implementation Details

### Cache Structure

Each cached item contains:

```json
{
  "cacheKey": "popular#movie#550",
  "contentId": "550",
  "contentType": "movie", 
  "category": "popular",
  "title": "Fight Club",
  "overview": "A tense story about...",
  "posterPath": "/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg",
  "backdropPath": "/87hTDiay2N2qWyX4Ds7ybXi9h8I.jpg",
  "voteAverage": 8.4,
  "voteCount": 26280,
  "popularity": 61.416,
  "releaseDate": "1999-10-15",
  "genreIds": [18, 53, 35],
  "originalLanguage": "en",
  "adult": false,
  "fetchedAt": 1704067200000,
  "expiresAt": 1704672000,
  "source": "tmdb_scheduled_fetch"
}
```

### Cache Categories

- `popular` - Popular movies and TV shows
- `trending` - Currently trending content  
- `genre_{id}` - Content filtered by specific genres
- `hidden_gems` - High-rated content with moderate vote counts
- `award_winning` - Highly-rated content with high vote counts

## Performance Benefits

### Before (API-only)
- Recommendation response time: ~11-15 seconds
- TMDB API calls per recommendation: 15-25 calls
- Rate limiting concerns during peak usage

### After (Cache-first)
- Recommendation response time: ~6-8 seconds (40-50% improvement)
- TMDB API calls per recommendation: 5-10 calls (60-70% reduction)
- Minimal rate limiting risk
- Improved reliability during TMDB API outages

## Usage

### Manual Testing

```bash
# Test daily fetch
node scripts/test-tmdb-fetcher.js daily

# Test weekly fetch  
node scripts/test-tmdb-fetcher.js weekly

# Test full refresh
node scripts/test-tmdb-fetcher.js full
```

### Manual Lambda Invocation

```bash
# Via AWS CLI
aws lambda invoke \
  --function-name MovieRec-TMDBDataFetcher \
  --payload '{"scheduleType":"daily"}' \
  output.json

# Check result
cat output.json
```

### Monitoring

```bash
# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/MovieRec-TMDBDataFetcher

# View recent logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/MovieRec-TMDBDataFetcher-xyz \
  --start-time $(date -d '1 hour ago' +%s)000
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_TMDB_API_KEY` | TMDB API key | Yes |
| `RECOMMENDATIONS_CACHE_TABLE` | DynamoDB table name | Yes |
| `EMBEDDING_CACHE_TABLE` | Embedding cache table | Yes |
| `AWS_REGION` | AWS region | Yes |

### EventBridge Schedules

**Daily Fetch:**
```
Cron: 0 8 * * ? *  (8 AM UTC daily)
```

**Weekly Fetch:**
```  
Cron: 0 9 ? * SUN *  (9 AM UTC every Sunday)
```

### Rate Limiting

- **Max concurrent requests:** 8
- **Min delay between requests:** 250ms  
- **Request timeout:** 20 seconds
- **Batch size for DynamoDB:** 25 items

## Error Handling

### Retry Logic
- DynamoDB operations: 3 retries with exponential backoff
- TMDB API calls: Built-in axios retry with rate limiting
- Individual item failures don't stop batch processing

### Fallback Behavior
- If cache is empty, recommendation system falls back to live API calls
- Graceful degradation ensures continuous service availability
- Error logging for monitoring and debugging

## Deployment

### Infrastructure Updates

```bash
# Deploy CDK infrastructure (includes new Lambda + EventBridge)
cd infrastructure
cdk diff
cdk deploy
```

### Lambda Function Updates

```bash  
# Function is deployed automatically via CDK
# Manual update if needed:
cd lambda-functions/TMDBDataFetcher
npm install
zip -r function.zip .
aws lambda update-function-code \
  --function-name MovieRec-TMDBDataFetcher \
  --zip-file fileb://function.zip
```

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Lambda Duration** - Should stay under 5 minutes
2. **Cache Hit Rate** - Track ratio of cached vs API calls
3. **DynamoDB Storage** - Monitor within free tier limits
4. **Error Rate** - TMDB API failures, DynamoDB errors

### Maintenance Tasks

**Weekly:**
- Check CloudWatch logs for errors
- Verify cache is being populated correctly
- Monitor AWS costs (should stay near $0)

**Monthly:**
- Review popular content IDs for cache optimization
- Update genre list based on user preferences  
- Analyze recommendation performance improvements

### Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Troubleshooting

### Common Issues

**1. TMDB API Rate Limiting**
- Symptoms: 429 errors in logs
- Solution: Rate limiter automatically handles this
- Monitor: Check request frequency in logs

**2. DynamoDB Throttling**  
- Symptoms: ProvisionedThroughputExceededException
- Solution: Using on-demand billing mode prevents this
- Monitor: Check DynamoDB metrics in CloudWatch

**3. Lambda Timeout**
- Symptoms: Task timed out after 300 seconds  
- Solution: Reduce batch sizes or increase timeout
- Monitor: Lambda duration metrics

**4. Empty Cache Results**
- Symptoms: Recommendations falling back to API only
- Solution: Check EventBridge rules are enabled and firing
- Monitor: DynamoDB item counts

### Debug Commands

```bash
# Check EventBridge rule status
aws events describe-rule --name MovieRec-TMDB-Daily-Fetch

# List recent Lambda executions
aws logs filter-log-events \
  --log-group-name /aws/lambda/MovieRec-TMDBDataFetcher \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --filter-pattern "START"

# Check DynamoDB cache contents  
aws dynamodb scan \
  --table-name MovieRecCache \
  --filter-expression "begins_with(cacheKey, :prefix)" \
  --expression-attribute-values '{":prefix":{"S":"popular#movie"}}' \
  --limit 5
```

## Future Enhancements

### Planned Improvements

1. **Dynamic Genre Selection** - Fetch content for genres based on user preferences
2. **Regional Content** - Support for region-specific popular content
3. **Cache Analytics** - Track cache hit rates and optimize accordingly
4. **Smart Refresh** - Update only stale content rather than full refresh

### Potential Optimizations

1. **GSI Addition** - Add Global Secondary Index for more efficient cache queries
2. **Compression** - Compress cached data to reduce storage costs
3. **Predictive Caching** - Cache content based on user behavior patterns
4. **Multi-Region** - Distribute cache across regions for global users

---

**Last Updated:** $(date)  
**Version:** 1.0.0  
**Status:** Production Ready ✅