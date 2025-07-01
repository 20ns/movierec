# API Endpoints Documentation

## Overview

The MovieRec API provides RESTful endpoints for user authentication, content management, and personalized recommendations. All endpoints are hosted on AWS API Gateway with Lambda function backends.

**Base URL:** `https://your-api-gateway-url.amazonaws.com/prod/`

## Authentication

### JWT Token Requirements
Most endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

### CORS Support
All endpoints support CORS with the following origins:
- `https://movierec.net`
- `https://www.movierec.net`
- `http://localhost:3000` (development)
- `http://localhost:8080` (development)

---

## Authentication Endpoints

### POST /auth/signin
User authentication via AWS Cognito.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "AccessToken": "eyJhbGciOiJIUzI1NiIs...",
  "IdToken": "eyJhbGciOiJIUzI1NiIs...",
  "RefreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "email": "user@example.com"
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Unconfirmed user account
- `500 Internal Server Error`: Authentication service error

**Example Request:**
```bash
curl -X POST https://api.movierec.net/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

### POST /auth/signup
User registration and email verification.

**Registration Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123"
}
```

**Verification Request:**
```json
{
  "email": "newuser@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "User registered successfully",
  "userSub": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid data
- `409 Conflict`: User already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Registration service error

**Example Requests:**
```bash
# Registration
curl -X POST https://api.movierec.net/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"secure123"}'

# Verification
curl -X POST https://api.movierec.net/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","code":"123456"}'
```

---

### POST /auth/refresh
JWT token refresh functionality.

**Status:** Currently not implemented (empty handler)

**Expected Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Expected Response:**
```json
{
  "AccessToken": "eyJhbGciOiJIUzI1NiIs...",
  "IdToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## User Data Endpoints

### GET /user/preferences
Retrieve user's content preferences.

**Authentication:** Required

**Response (200):**
```json
{
  "favoriteGenres": ["Action", "Sci-Fi", "Thriller"],
  "keywords": ["space", "technology", "adventure"],
  "minRating": 6.0,
  "maxRating": 10.0,
  "releaseYearStart": 2000,
  "releaseYearEnd": 2024,
  "subgenrePreferences": ["cyberpunk", "space opera"],
  "moodPreferences": ["exciting", "thought-provoking"],
  "eraPreferences": ["modern", "futuristic"],
  "languagePreferences": ["English", "Japanese"],
  "criticalAcclaimPreferences": ["award-winning"],
  "aestheticPreferences": ["visually stunning"],
  "storyStructurePreferences": ["complex narrative"],
  "characterPreferences": ["strong protagonist"],
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**Example Request:**
```bash
curl -X GET https://api.movierec.net/user/preferences \
  -H "Authorization: Bearer <jwt-token>"
```

---

### POST /user/preferences
Update user's content preferences.

**Authentication:** Required

**Request:**
```json
{
  "favoriteGenres": ["Action", "Sci-Fi", "Thriller"],
  "keywords": ["space", "technology", "adventure"],
  "minRating": 6.0,
  "maxRating": 10.0,
  "releaseYearStart": 2000,
  "releaseYearEnd": 2024,
  "subgenrePreferences": ["cyberpunk", "space opera"],
  "moodPreferences": ["exciting", "thought-provoking"],
  "eraPreferences": ["modern", "futuristic"],
  "languagePreferences": ["English", "Japanese"],
  "criticalAcclaimPreferences": ["award-winning"],
  "aestheticPreferences": ["visually stunning"],
  "storyStructurePreferences": ["complex narrative"],
  "characterPreferences": ["strong protagonist"]
}
```

**Response (200):**
```json
{
  "message": "Preferences updated successfully"
}
```

**Example Request:**
```bash
curl -X POST https://api.movierec.net/user/preferences \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"favoriteGenres":["Action","Sci-Fi"],"minRating":7.0}'
```

---

### GET /user/favourites
Retrieve user's favorite movies and TV shows.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "movieId": "550",
    "title": "Fight Club",
    "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    "release_date": "1999-10-15",
    "vote_average": 8.433,
    "addedAt": "2024-01-01T12:00:00Z"
  },
  {
    "movieId": "13",
    "title": "Forrest Gump",
    "poster_path": "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    "release_date": "1994-06-23",
    "vote_average": 8.471,
    "addedAt": "2024-01-02T10:30:00Z"
  }
]
```

**Example Request:**
```bash
curl -X GET https://api.movierec.net/user/favourites \
  -H "Authorization: Bearer <jwt-token>"
```

---

### POST /user/favourites
Add a movie or TV show to favorites.

**Authentication:** Required

**Request:**
```json
{
  "mediaId": "550",
  "title": "Fight Club",
  "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "release_date": "1999-10-15",
  "vote_average": 8.433
}
```

**Response (200):**
```json
{
  "message": "Added to favorites successfully"
}
```

**Example Request:**
```bash
curl -X POST https://api.movierec.net/user/favourites \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"mediaId":"550","title":"Fight Club","vote_average":8.433}'
```

---

### DELETE /user/favourites?mediaId={mediaId}
Remove a movie or TV show from favorites.

**Authentication:** Required

**Parameters:**
- `mediaId` (query parameter): ID of the media to remove

**Response (200):**
```json
{
  "message": "Removed from favorites successfully"
}
```

**Example Request:**
```bash
curl -X DELETE "https://api.movierec.net/user/favourites?mediaId=550" \
  -H "Authorization: Bearer <jwt-token>"
```

---

### GET/POST/DELETE /user/watchlist
Watchlist endpoints with identical functionality to favourites endpoints.

**Note:** All watchlist endpoints mirror the favorites endpoints exactly, but operate on the user's watch-later list instead of favorites.

**Endpoints:**
- `GET /user/watchlist` - Retrieve watchlist
- `POST /user/watchlist` - Add to watchlist
- `DELETE /user/watchlist?mediaId={mediaId}` - Remove from watchlist

**Request/Response Schemas:** Identical to favorites endpoints

---

## Content & Recommendations

### GET /recommendations
Get personalized movie and TV show recommendations.

**Authentication:** Required

**Query Parameters:**
- `mediaType` (optional): `'movie'`, `'tv'`, or `'both'` (default: `'both'`)
- `exclude` (optional): Comma-separated list of media IDs to exclude
- `favorites` (optional): Comma-separated list of user's favorite media IDs
- `watchlist` (optional): Comma-separated list of user's watchlist media IDs
- `preferences` (optional): JSON string of user preferences

**Response (200):**
```json
{
  "recommendations": [
    {
      "id": 680,
      "title": "Pulp Fiction",
      "poster_path": "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      "overview": "A burger-loving hit man, his philosophical partner...",
      "vote_average": 8.487,
      "release_date": "1994-09-10",
      "genre_ids": [80, 18],
      "media_type": "movie",
      "score": 85,
      "scoreReasons": [
        "Matches your preference for crime dramas",
        "High rating aligns with your quality standards",
        "Similar to movies in your favorites"
      ]
    }
  ],
  "metadata": {
    "totalCandidates": 150,
    "processingTime": "2.3s",
    "cacheHit": true,
    "fallbackUsed": false
  }
}
```

**Algorithm Details:**
- **Multi-stage Processing**: Seed analysis → Genre mapping → Candidate generation → Scoring → Diversity optimization
- **Scoring Factors**: Genre matching (30pts) + Quality/popularity (30pts) + Personalization (40pts)
- **Diversity**: Ensures varied recommendations across genres and content types

**Example Request:**
```bash
curl -X GET "https://api.movierec.net/recommendations?mediaType=movie&exclude=550,680" \
  -H "Authorization: Bearer <jwt-token>"
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing JWT token
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Recommendation service error

---

### GET /media
Retrieve cached media content lists.

**Authentication:** Optional (some features require authentication)

**Query Parameters:**
- `listType` (required): `'trending'`, `'popular'`, or `'top_rated'`
- `mediaType` (required): `'movie'` or `'tv'`
- `limit` (optional): Number of items to return (default: 20, max: 100)
- `excludeIds` (optional): Comma-separated list of media IDs to exclude

**Response (200):**
```json
{
  "results": [
    {
      "id": 533535,
      "title": "Deadpool & Wolverine",
      "poster_path": "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
      "overview": "A listless Wade Wilson toils away in civilian life...",
      "vote_average": 7.7,
      "release_date": "2024-07-24",
      "genre_ids": [28, 35, 878],
      "popularity": 8234.123,
      "media_type": "movie"
    }
  ],
  "total_results": 250,
  "page": 1,
  "total_pages": 13,
  "list_type": "trending",
  "media_type": "movie"
}
```

**Content Sources:**
- **Primary**: DynamoDB cache for fast response times
- **Fallback**: Direct TMDB API calls if cache miss
- **Background Processing**: Automatic cache updates via background Lambda

**Example Request:**
```bash
curl -X GET "https://api.movierec.net/media?listType=trending&mediaType=movie&limit=10" \
  -H "Authorization: Bearer <jwt-token>"
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Common HTTP Status Codes

#### 400 Bad Request
- Missing required parameters
- Invalid data format
- Malformed JSON request body

#### 401 Unauthorized
- Missing Authorization header
- Invalid or expired JWT token
- Token verification failure

#### 403 Forbidden
- Insufficient permissions
- Unconfirmed user account (signup required)
- Resource access denied

#### 404 Not Found
- Endpoint does not exist
- Resource not found

#### 409 Conflict
- User already exists (signup)
- Duplicate resource creation

#### 429 Too Many Requests
- Rate limit exceeded
- API quota reached

#### 500 Internal Server Error
- Database connection errors
- External API failures
- Unexpected server errors

#### 503 Service Unavailable
- External dependencies unavailable
- Maintenance mode

## Rate Limiting

### Default Limits
- **Authentication endpoints**: 10 requests/minute per IP
- **User data endpoints**: 100 requests/minute per user
- **Recommendations**: 20 requests/minute per user
- **Media content**: 200 requests/minute per IP

### Rate Limit Headers
Responses include rate limit information:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Data Flow Patterns

### Authentication Flow
```
Client → POST /auth/signin → Cognito → JWT Tokens → Client Storage
```

### User Data Flow
```
Client → JWT Token → API Gateway → Lambda → DynamoDB → Response
```

### Recommendation Flow
```
Client → GET /recommendations → Lambda → DynamoDB Cache
                                     ↓
                               TMDB API (fallback)
                                     ↓
                              Recommendation Engine
                                     ↓
                              Personalized Results
```

### Content Caching Flow
```
Background Process → TMDB API → Lambda → DynamoDB Cache
                                              ↓
Client Request → GET /media → Lambda → Cache Lookup → Response
```

## SDK Integration

### JavaScript/TypeScript Example
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.movierec.net',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get recommendations
const getRecommendations = async (mediaType = 'both') => {
  try {
    const response = await apiClient.get('/recommendations', {
      params: { mediaType }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    throw error;
  }
};

// Add to favorites
const addToFavorites = async (mediaData) => {
  try {
    const response = await apiClient.post('/user/favourites', mediaData);
    return response.data;
  } catch (error) {
    console.error('Failed to add to favorites:', error);
    throw error;
  }
};
```

This API documentation provides comprehensive information for integrating with the MovieRec backend services, enabling developers to build rich movie and TV show recommendation experiences.