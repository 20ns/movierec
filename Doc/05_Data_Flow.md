# 05: Data Flow

## 1. Overview

The application's data flow is designed to be efficient and scalable, with a clear separation between the client, the API layer, and the data persistence layer. The flow is centered around user interactions, which trigger requests to the backend, leading to data retrieval, processing, and storage.

## 2. Data Sources

There are three primary sources of data in this application:

1.  **User-Generated Data**: This includes user preferences, favorites, and watchlists. This data is created and modified by users and is stored in DynamoDB.

2.  **The Movie Database (TMDB)**: An external API that provides comprehensive information about movies and TV shows, including metadata, ratings, and popularity.

3.  **`MovieRecCache` (DynamoDB)**: A crucial component of the data architecture. This is a DynamoDB table that acts as a cache for media data fetched from TMDB. It is populated by the `MediaCache` Lambda function and serves as the primary source of candidate media for the recommendation engine.

## 3. Key Data Flow Scenarios

### 3.1. Personalized Recommendations

This is the most complex and important data flow in the application.

1.  **Frontend (`PersonalizedRecommendations.jsx`)**: When the component mounts, it triggers a request to fetch personalized recommendations.

2.  **Frontend Service (`mediaCache.js`)**: The `fetchCachedMedia` function is called. It first checks the browser's local storage for a cached version of the recommendations. If a valid, non-expired cache entry is found, it is returned immediately.

3.  **API Gateway & Lambda (`MovieRecPersonalizedApiHandler`)**: If there is no valid client-side cache, a request is made to the `/recommendations` endpoint. The `MovieRecPersonalizedApiHandler` Lambda is invoked.

4.  **Lambda Logic**:
    *   The Lambda authenticates the user.
    *   It fetches the user's preferences, favorites, and watchlist from their respective DynamoDB tables.
    *   It queries the `MovieRecCache` DynamoDB table to get a large pool of candidate media, filtering by genre and other criteria.
    *   It scores and ranks these candidates based on the user's data.
    *   If the cache doesn't provide enough results, it makes a fallback request to the **TMDB API** to discover more media.
    *   It returns the final, ranked list of recommendations to the frontend.

5.  **Frontend Caching**: The frontend receives the recommendations and stores them in local storage for future requests.

### 3.2. Populating the Media Cache

The `MediaCache` Lambda function is responsible for keeping the `MovieRecCache` DynamoDB table up-to-date.

1.  **Trigger**: This Lambda can be triggered by a scheduled event (e.g., a daily CloudWatch cron job) or by a direct API call.

2.  **Lambda Logic (`MediaCache/index.js`)**:
    *   The function fetches top-rated and popular movies and TV shows from the **TMDB API**.
    *   For each new media item, it fetches the full details (including genres, cast, etc.).
    *   It stores this detailed information as a new item in the `MovieRecCache` DynamoDB table.
    *   It maintains a `progress_tracker` item in the table to keep track of which pages of the TMDB API have already been processed, preventing duplicate work.

### 3.3. User Data Management (Favorites/Watchlist)

1.  **Frontend**: A user clicks a button to add a movie to their favorites.

2.  **API Gateway & Lambda**: A `POST` request is sent to the `/user/favourites` endpoint, which invokes the `FavouritesFunction` Lambda.

3.  **Lambda Logic**:
    *   The Lambda authenticates the user.
    *   It receives the media item's ID and other details in the request body.
    *   It creates a new item in the `Favourites` DynamoDB table, associating the media ID with the user's ID.

4.  **Data Retrieval**: When the user views their favorites list, a `GET` request is made to the same endpoint, which queries the `Favourites` table for all items associated with that user.

## 4. Data Enrichment (`tmdbEnricher.js`)

On the frontend, the `tmdbEnricher.js` utility is used to fill in any missing details for media items. If a media item is missing information like a poster image or a user rating, this service will make a direct request to the TMDB API to fetch the latest details. This ensures that the UI always displays the most complete and up-to-date information, even if the cached data is slightly stale.
