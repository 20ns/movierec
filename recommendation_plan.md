# Personalized Recommendation Improvement Plan

## Goal

Deliver highly personalized recommendations by leveraging user data (favorites, watchlist, questionnaire) more effectively, prioritizing the DynamoDB cache but falling back to TMDB when necessary, and implementing a "fetch 6, show 3" pattern for faster refreshes.

## Phases

### Phase 1: Backend Enhancement (AWS Lambda)

*   **Modify Lambda:** Update the Lambda function for the `/media-recommendations` endpoint.
    *   **Input:** Correctly receive and parse `userId`, `mediaType`, `limit`, `excludeIds`, `preferences` (JSON string), `favorites` (comma-separated IDs), and `watchlist` (comma-separated IDs).
    *   **Personalized Ranking Logic:**
        *   **Seed Identification:** Use `favorites`/`watchlist` IDs to identify user-relevant "seed" items and fetch their details (genres) from DynamoDB.
        *   **Candidate Generation:** Query DynamoDB (e.g., using `GenrePopularityIndex`, filtered by `mediaType`) based on seed genres and user `preferences`. Fetch a larger candidate pool (e.g., 50-100 items).
        *   **Filtering:** Remove items present in `excludeIds`, `favorites`, and `watchlist` from the candidate pool.
        *   **Scoring & Ranking:** Score remaining candidates based on a weighted combination of:
            *   Genre overlap with seeds and preferences.
            *   Match with other `preferences` (era, mood - using existing fields).
            *   Item popularity/rating (as a contributing factor).
            *   Recency (optional).
        *   **TMDB Fallback:** If DynamoDB yields fewer than 6 candidates after filtering, make targeted TMDB API calls (`/discover` based on preferences/genres, passing `excludeIds`) to supplement the pool. Re-score and rank the combined pool.
    *   **Output:** Return the **top 6** highest-scoring items and indicate the source (e.g., `{ items: [...], source: 'dynamo_personalized' }`).

### Phase 2: Frontend Adjustments (`PersonalizedRecommendations.jsx` & `mediaCache.js`)

*   **Request More Items:** Modify `fetchCachedMedia` and its usage to request `limit: 6`.
*   **Store Full Set:** Update the state in `PersonalizedRecommendations.jsx` to store the full list of 6 recommendations received.
*   **Implement Display Logic:**
    *   Initially, display only the first 3 items.
    *   **Refresh Logic:** On the *first* refresh click after a new set is loaded, display items 4-6. On *subsequent* refresh clicks, trigger a full backend fetch (`fetchRecommendations(true)`) for a new set of 6.

### Phase 3: Data Enrichment (Future Consideration)

*   Defer enriching the existing 10,000 DynamoDB items for now. Revisit if results from Phases 1 & 2 need further improvement.

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend (React)
    participant API Gateway
    participant Lambda Function
    participant DynamoDB
    participant TMDB API

    User->>Frontend (React): Loads Page
    Frontend (React)->>API Gateway: GET /media-recommendations (limit=6, ...)
    API Gateway->>Lambda Function: Invoke
    Lambda Function->>DynamoDB: Query Candidates + Seeds
    DynamoDB-->>Lambda Function: Items
    alt DynamoDB results < 6
        Lambda Function->>TMDB API: Call /discover
        TMDB API-->>Lambda Function: Supplementary candidates
    end
    Lambda Function->>Lambda Function: Filter & Rank (Score based on user data + existing fields)
    Lambda Function->>API Gateway: Return top 6 ranked items
    API Gateway-->>Frontend (React): Response { items: [item1..item6] }
    Frontend (React)->>Frontend (React): Store [item1..item6], Display [item1, item2, item3]
    Frontend (React)->>User: Show Recommendations [1, 2, 3]

    User->>Frontend (React): Clicks Refresh (1st time)
    Frontend (React)->>Frontend (React): Display [item4, item5, item6]
    Frontend (React)->>User: Show Recommendations [4, 5, 6]

    User->>Frontend (React): Clicks Refresh (2nd time)
    Frontend (React)->>API Gateway: GET /media-recommendations (limit=6, new exclude list)
    Note right of Frontend (React): Repeat fetch cycle for new set
    API Gateway-->>Frontend (React): Response { items: [newItem1..newItem6] }
    Frontend (React)->>Frontend (React): Store [newItem1..newItem6], Display [newItem1, newItem2, newItem3]
    Frontend (React)->>User: Show Recommendations [new 1, 2, 3]