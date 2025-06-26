# 02: Backend Lambda Functions

## 1. Overview

The backend is built using a serverless architecture on AWS. The core of the backend is a set of AWS Lambda functions, each responsible for a specific piece of business logic. These functions are exposed as HTTP endpoints via Amazon API Gateway.

## 2. Core Technologies

*   **AWS Lambda**: The compute service that runs the backend code without provisioning or managing servers.
*   **Amazon API Gateway**: The service that creates, publishes, maintains, monitors, and secures APIs at any scale.
*   **Amazon DynamoDB**: The primary NoSQL database for storing application data.
*   **AWS Cognito**: Provides user identity and access management.
*   **Node.js**: The runtime environment for all Lambda functions.

## 3. Lambda Functions

Here is a breakdown of the key Lambda functions in the application:

### 3.1. `MovieRecPersonalizedApiHandler`

*   **Purpose**: This is the core function of the recommendation engine. It generates personalized movie and TV show recommendations for a user based on their preferences, favorites, and watchlist.
*   **Trigger**: API Gateway (GET /recommendations)
*   **Logic**:
    1.  Authenticates the user using a JWT from Cognito.
    2.  Retrieves the user's preferences, favorites, and watchlist from DynamoDB.
    3.  Fetches a pool of candidate media from a pre-populated DynamoDB cache.
    4.  Scores and ranks the candidates based on a sophisticated algorithm that considers genre matches, user ratings, and other factors.
    5.  If the cache doesn't yield enough results, it falls back to the TMDB API.
    6.  Returns a list of personalized recommendations.

### 3.2. `UserPreferencesFunction`

*   **Purpose**: Manages a user's preferences, such as their favorite genres, keywords, and rating ranges.
*   **Trigger**: API Gateway (GET /user/preferences, POST /user/preferences)
*   **Logic**:
    *   **GET**: Retrieves the user's current preferences from the `UserPreferences` DynamoDB table.
    *   **POST**: Updates the user's preferences in the `UserPreferences` table.

### 3.3. `FavouritesFunction`

*   **Purpose**: Manages a user's list of favorite movies and TV shows.
*   **Trigger**: API Gateway (GET /favorites, POST /favorites, DELETE /favorites)
*   **Logic**:
    *   **GET**: Retrieves the user's list of favorites from the `UserFavorites` DynamoDB table.
    *   **POST**: Adds a new item to the user's favorites list.
    *   **DELETE**: Removes an item from the user's favorites list.

### 3.4. `WatchlistFunction`

*   **Purpose**: Manages a user's watchlist.
*   **Trigger**: API Gateway (GET /watchlist, POST /watchlist, DELETE /watchlist)
*   **Logic**:
    *   **GET**: Retrieves the user's watchlist from the `UserWatchlist` DynamoDB table.
    *   **POST**: Adds a new item to the user's watchlist.
    *   **DELETE**: Removes an item from the user's watchlist.

### 3.5. `SignupHandler`

*   **Purpose**: Handles new user registration.
*   **Trigger**: API Gateway (POST /signup)
*   **Logic**:
    1.  Receives the user's email and password.
    2.  Uses the AWS Cognito SDK to create a new user in the Cognito User Pool.
    3.  Upon successful registration, it also adds a new entry for the user in the `UserProfiles` DynamoDB table.

### 3.6. `SigninHandler`

*   **Purpose**: Handles user authentication.
*   **Trigger**: API Gateway (POST /signin)
*   **Logic**:
    1.  Receives the user's email and password.
    2.  Uses the AWS Cognito SDK to authenticate the user.
    3.  If the credentials are valid, it returns a set of JWTs (access, ID, and refresh tokens) to the client.

### 3.7. `MediaCache`

*   **Purpose**: This is a crucial background function that populates and maintains a cache of media data in DynamoDB. This cache is used by the recommendation engine to quickly fetch candidate media without having to hit the TMDB API for every request.
*   **Trigger**: This function can be triggered in two ways:
    1.  **Scheduled Event (e.g., CloudWatch Events)**: To periodically grow the catalog with new and top-rated media.
    2.  **API Gateway (GET /media-recommendations)**: To handle simple, non-personalized recommendation requests (e.g., for trending or popular media).
*   **Logic**:
    1.  Fetches top-rated and popular movies and TV shows from the TMDB API.
    2.  Stores the detailed information for each media item in the `MovieRecCache` DynamoDB table.
    3.  Maintains a progress tracker to avoid re-fetching the same data.

### 3.8. `RefreshTokenLambda`

*   **Purpose**: This function is responsible for refreshing a user's session using a refresh token.
*   **Trigger**: API Gateway (POST /refresh-token)
*   **Logic**:
    1.  Receives a refresh token from the client.
    2.  Uses the AWS Cognito SDK to exchange the refresh token for a new set of access and ID tokens.
