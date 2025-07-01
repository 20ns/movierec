# AWS Lambda Functions Documentation

## Overview

The MovieRec backend consists of 8 AWS Lambda functions that handle authentication, user data management, content caching, and personalized recommendations. All functions are deployed using the Serverless Framework with Node.js 18.x runtime in the eu-north-1 region.

## Architecture Patterns

### Common Patterns
- **JWT Token Verification**: All protected endpoints use `aws-jwt-verify` library
- **CORS Configuration**: Supports production domains and localhost development
- **DynamoDB Integration**: AWS SDK v3 with Document Client for all database operations
- **Lambda Layers**: Shared dependencies for optimized deployment and cold start performance
- **Error Handling**: Standardized error responses with appropriate HTTP status codes

### Security Model
- **Authentication**: JWT tokens from AWS Cognito
- **Authorization**: User context extracted from JWT claims
- **Data Isolation**: All user data partitioned by userId
- **Offline Development**: JWT bypass for local development

---

## Function Specifications

### 1. Signin Function
**Endpoint:** `POST /auth/signin`  
**Purpose:** User authentication via AWS Cognito

#### Request Schema
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

#### Response Schema
```json
{
  "AccessToken": "string",
  "IdToken": "string",
  "RefreshToken": "string",
  "email": "string"
}
```

#### Implementation Details
- **Authentication Flow**: Uses Cognito `InitiateAuthCommand` with `USER_PASSWORD_AUTH`
- **Validation**: Email format and password presence validation
- **Token Management**: Returns all three Cognito token types

#### Error Responses
- `400`: Missing email/password
- `401`: Invalid credentials (`NotAuthorizedException`)
- `403`: Unconfirmed user account (`UserNotConfirmedException`)
- `500`: General authentication failure

#### Performance Characteristics
- **Cold Start**: Minimal due to simple dependencies
- **Execution Time**: Single Cognito API call (~200-500ms)
- **Memory Usage**: Low (default 128MB allocation)

---

### 2. SignupHandler Function
**Endpoint:** `POST /auth/signup`  
**Purpose:** User registration and email verification

#### Request Schemas

**Registration Request:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Verification Request:**
```json
{
  "email": "string (required)",
  "code": "string (required)"
}
```

#### Database Operations
- **Table**: `UserProfiles`
- **Operation**: Creates user profile with Cognito sub as partition key
- **Schema**: `{ sub: string, email: string, createdAt: ISO_string }`

#### Implementation Details
- **Dual Mode**: Handles both signup and verification in same function
- **User Profile Creation**: Automatic DynamoDB entry on successful registration
- **Error Tolerance**: Continues even if profile creation fails (logged but non-blocking)

#### Authentication Logic
- Uses Cognito `SignUpCommand` for registration
- Uses `ConfirmSignUpCommand` for verification
- Optional client secret handling for flexibility

#### Error Handling
- Maps Cognito error codes to user-friendly messages
- Specific handling for rate limiting, password policy violations
- Graceful degradation for profile creation failures

---

### 3. UserPreferencesFunction
**Endpoint:** `GET/POST /user/preferences`  
**Purpose:** User taste profile and content preference management

#### Request Schema (POST)
```json
{
  "favoriteGenres": ["string"],
  "keywords": ["string"],
  "minRating": "number",
  "maxRating": "number",
  "releaseYearStart": "number",
  "releaseYearEnd": "number",
  "subgenrePreferences": ["string"],
  "moodPreferences": ["string"],
  "eraPreferences": ["string"],
  "languagePreferences": ["string"],
  "criticalAcclaimPreferences": ["string"],
  "aestheticPreferences": ["string"],
  "storyStructurePreferences": ["string"],
  "characterPreferences": ["string"]
}
```

#### Database Operations
- **Table**: `UserPreferences`
- **Key Schema**: `userId` (from JWT sub)
- **Operations**: 
  - GET: Retrieve user preferences
  - PUT: Update/create preferences

#### Implementation Details
- **Default Values**: Returns sensible defaults if no preferences exist
- **Preference Validation**: Sanitizes and validates preference data
- **Timestamp Tracking**: Updates `updatedAt` field on modifications

#### Authentication Requirements
- **JWT Verification**: Required for all operations
- **User Context**: Extracts `userId` from verified token
- **Offline Mode**: Bypasses verification for development

#### Performance Considerations
- **Single Operation**: One DynamoDB operation per request
- **Client-side Caching**: Preferences cached to minimize API calls
- **Lightweight Payload**: Efficient JSON serialization

---

### 4. FavouritesFunction
**Endpoint:** `GET/POST/DELETE /user/favourites`  
**Purpose:** User favorites management

#### Request Schema (POST)
```json
{
  "mediaId": "string (required)",
  "title": "string",
  "poster_path": "string",
  "release_date": "string",
  "vote_average": "number"
}
```

#### Database Operations
- **Table**: `Favourites`
- **Key Schema**: `userId` (HASH), `movieId` (RANGE)
- **Operations**:
  - GET: Query all favorites by userId
  - POST: Add item to favorites
  - DELETE: Remove item (mediaId via query parameter)

#### Implementation Details
- **Backward Compatibility**: Supports both `mediaId` and legacy `movieId`
- **Rich Metadata**: Stores complete media information for offline viewing
- **Timestamp Tracking**: `addedAt` field for chronological sorting

#### Authentication Requirements
- **JWT Verification**: Required for all operations
- **Data Isolation**: User can only access their own favorites
- **Permission Model**: Full CRUD access to own data

#### Error Handling
- **Validation**: Required media ID validation
- **Duplicate Prevention**: Graceful handling of duplicate additions
- **Not Found**: Appropriate responses for missing items

#### Performance Characteristics
- **Query Optimization**: User-specific partition key for efficient queries
- **Batch Operations**: Efficient for bulk favorite operations
- **Low Latency**: Typically <100ms response time

---

### 5. Watchlist Function
**Endpoint:** `GET/POST/DELETE /user/watchlist`  
**Purpose:** User watch-later list management

#### Implementation
- **Architecture**: Identical to FavouritesFunction
- **Database Table**: `Watchlist` (separate namespace)
- **Schema**: Same structure as Favourites table
- **Operations**: Complete CRUD functionality

#### Key Differences
- **Table Name**: Only difference from Favourites implementation
- **Semantic Purpose**: Watch-later vs already-watched distinction
- **Data Isolation**: Separate table for clear separation of concerns

---

### 6. MovieRecPersonalizedApiHandler
**Endpoint:** `GET /recommendations`  
**Purpose:** Core recommendation engine for personalized content

#### Request Parameters (Query String)
```
mediaType: 'movie' | 'tv' | 'both'
exclude: 'comma,separated,ids'
favorites: 'comma,separated,ids'
watchlist: 'comma,separated,ids'
preferences: 'JSON_string'
```

#### Database Operations
- **Primary Table**: `MovieRecCache`
- **Query Types**: 
  - Genre-based filtering using GSI
  - Batch item retrieval
  - Content metadata enrichment

#### Algorithm Architecture

**Multi-Stage Processing:**
1. **Seed Analysis**: Analyzes user favorites/watchlist for preference patterns
2. **Genre Mapping**: Maps content to preference categories
3. **Candidate Generation**: Builds pool of potential recommendations
4. **Advanced Scoring**: Multi-factor scoring algorithm
5. **Diversity Optimization**: Ensures varied recommendations

**Scoring Algorithm:**
- **Genre Matching**: Up to 30 points for preference alignment
- **Quality Weighting**: Up to 30 points for popularity/ratings
- **Personalization**: Up to 40 points for user-specific factors
- **Diversity Bonuses**: Additional points for recommendation variety

#### External API Integration
- **TMDB API**: Fallback content source and metadata enrichment
- **Rate Limiting**: Custom implementation prevents API exhaustion
- **Caching Strategy**: DynamoDB as primary cache reduces TMDB dependency

#### Performance Optimizations
- **Content Pool Limit**: 200 candidates maximum for processing efficiency
- **Parallel Processing**: Concurrent API calls with rate limiting
- **Emergency Fallback**: Guaranteed response even with API failures
- **Memory Management**: Efficient data structures for large datasets

#### Error Handling & Resilience
- **Multi-layer Fallbacks**: DynamoDB → TMDB API → Emergency content
- **Graceful Degradation**: Maintains functionality at each failure level
- **Error Recovery**: Automatic retry with exponential backoff
- **Monitoring**: Comprehensive error tracking and performance metrics

#### Authentication & Authorization
- **JWT Required**: All requests must include valid token
- **User Context**: Recommendations personalized to authenticated user
- **Privacy**: No cross-user data leakage

---

### 7. MediaCache Function
**Endpoint:** `GET /media` (API Mode)  
**Purpose:** TMDB content caching and catalog management

#### Dual Operation Modes

**API Request Handler:**
- Serves cached media lists from DynamoDB
- Supports trending, popular, and top-rated content
- Efficient filtering and pagination

**Background Processor:**
- Grows content catalog from TMDB API
- Progressive processing across invocations
- Intelligent state management

#### Request Parameters (API Mode)
```
listType: 'trending' | 'popular' | 'top_rated'
mediaType: 'movie' | 'tv'
limit: number
excludeIds: 'comma,separated,ids'
```

#### Database Operations
- **Table**: `MovieRecCache`
- **Complex Schema**: Media content + progress tracking + list management
- **Operations**:
  - Batch content storage
  - Progress state persistence
  - List metadata management

#### External API Integration
- **TMDB Endpoints**:
  - `/trending/{media_type}/week`
  - `/{media_type}/popular`
  - `/{media_type}/top_rated`
  - `/{media_type}/{id}` (detailed metadata)

#### Background Processing Features
- **Progressive Catalog Building**: Resumes processing across invocations
- **State Persistence**: Saves progress every 10 items
- **Runtime Management**: Built-in 240-second timeout handling
- **Rate Limiting**: Controlled API call frequency
- **Batch Processing**: Configurable batch sizes for efficiency

#### Performance Characteristics
- **Memory Efficiency**: Streaming approach for large datasets
- **Processing Speed**: ~50-100 items per invocation
- **State Recovery**: Automatic resume from last checkpoint
- **API Efficiency**: Batch operations minimize API calls

#### Error Handling
- **API Failures**: Graceful handling of TMDB API issues
- **Data Integrity**: Validation and sanitization of external data
- **Progress Recovery**: Resume from last successful state
- **Resource Management**: Proper cleanup and timeout handling

---

### 8. RefreshTokenLambda
**Endpoint:** `POST /auth/refresh`  
**Purpose:** JWT token refresh functionality

#### Current Status
- **Implementation**: Function handler exists but empty
- **Expected Functionality**: Cognito refresh token operations
- **Integration**: Would use `InitiateAuthCommand` with `REFRESH_TOKEN_AUTH`

#### Planned Features
- Refresh token validation
- New access token generation
- Token expiration handling
- Security validation

---

## Database Schema

### Table Designs

#### UserPreferences
```
Partition Key: userId (String)
Attributes: {
  favoriteGenres: [String],
  keywords: [String],
  minRating: Number,
  maxRating: Number,
  releaseYearStart: Number,
  releaseYearEnd: Number,
  [additional preference fields],
  updatedAt: String (ISO timestamp)
}
Access Pattern: Single-user retrieval/update
```

#### MovieRecCache
```
Partition Key: mediaId (String)
Sort Key: mediaType (String)
GSI: genre-index (genre as partition key)
Attributes: {
  title: String,
  overview: String,
  poster_path: String,
  vote_average: Number,
  release_date: String,
  genre_ids: [Number],
  popularity: Number,
  [additional TMDB fields],
  cachedAt: String (ISO timestamp)
}
Access Pattern: Content discovery by genre, individual retrieval
```

#### Favourites
```
Partition Key: userId (String)
Sort Key: movieId (String)
Attributes: {
  title: String,
  poster_path: String,
  release_date: String,
  vote_average: Number,
  addedAt: String (ISO timestamp)
}
Access Pattern: User-specific lists, individual management
```

#### Watchlist
```
Schema: Identical to Favourites
Purpose: Separate namespace for watch-later functionality
```

#### UserProfiles
```
Partition Key: sub (String) - Cognito user ID
Attributes: {
  email: String,
  createdAt: String (ISO timestamp)
}
Access Pattern: User lookup by Cognito sub
```

## Security Architecture

### Authentication Flow
1. **Client Authentication**: Cognito Amplify handles initial authentication
2. **Token Verification**: JWT verification on every protected endpoint
3. **User Context**: Extracted from JWT claims for authorization
4. **Data Isolation**: All user data partitioned by userId

### CORS Configuration
- **Production Domains**: `https://movierec.net`, `https://www.movierec.net`
- **Development**: `http://localhost:3000`, `http://localhost:8080`
- **Headers**: Comprehensive support for modern web applications
- **Credentials**: Enabled for authenticated requests

### Data Security
- **Access Control**: All database access through Lambda functions
- **User Isolation**: Partition keys ensure complete data separation
- **Input Validation**: Schema validation and sanitization
- **Error Handling**: Minimal internal information exposure

## Performance Optimization

### Lambda Optimization
- **Runtime**: Node.js 18.x for optimal performance
- **Memory Allocation**: Right-sized for each function's requirements
- **Cold Start Mitigation**: Lambda layers for shared dependencies
- **Timeout Configuration**: Appropriate limits per function complexity

### Database Performance
- **DynamoDB Configuration**: PAY_PER_REQUEST billing with auto-scaling
- **Access Patterns**: Optimized partition key design
- **GSI Usage**: Efficient secondary access patterns
- **Batch Operations**: Optimized for bulk data operations

### External API Management
- **Rate Limiting**: Custom implementation for TMDB API
- **Caching Strategy**: Multi-layer caching reduces external dependencies
- **Fallback Systems**: Multiple content sources for reliability
- **Error Recovery**: Comprehensive retry and fallback logic

## Monitoring and Observability

### Error Handling Patterns
- **Standardized Responses**: Consistent error format across all functions
- **HTTP Status Codes**: Appropriate codes for different error conditions
- **CORS Compliance**: Error responses maintain CORS headers
- **Logging**: Comprehensive error logging for debugging

### Common Error Types
- **401 Unauthorized**: Invalid or expired JWT tokens
- **403 Forbidden**: Insufficient permissions
- **400 Bad Request**: Malformed request data
- **429 Too Many Requests**: Rate limiting exceeded
- **500 Internal Server Error**: Unexpected errors with fallback responses

### Performance Metrics
- **Execution Duration**: Function execution time tracking
- **Memory Usage**: Memory consumption monitoring
- **Error Rates**: Success/failure rate tracking
- **API Dependencies**: External API response time monitoring

This Lambda function architecture provides a robust, scalable foundation for the MovieRec application with sophisticated recommendation capabilities, comprehensive user data management, and production-ready security and error handling.