# Plan for Reliable Blog Image Fetching

This document outlines the plan to implement a more reliable image fetching mechanism for the blog, allowing for explicit TMDB ID specification in markdown.

## Core Idea

Modify the blog's image handling to allow specifying a TMDB Movie ID (and TMDB TV Show ID) directly in markdown. If an ID is provided, use it to fetch images. Otherwise, fall back to the current method of searching by title.

## 1. New Markdown Syntax for Images

-   **For Movies (using TMDB Movie ID):**
    `![Alt Text for Image](tmdbid:YOUR_MOVIE_ID)`
    *   Example: `![Poster for Inception](tmdbid:27205)`

-   **For TV Shows (using TMDB TV Show ID):**
    `![Alt Text for Image](tmdbtvid:YOUR_TV_SHOW_ID)`
    *   Example: `![Poster for Breaking Bad](tmdbtvid:1396)`

## 2. Update the `CustomImage` Component (`src/pages/BlogPostPage.jsx`)

The `useEffect` hook within the `CustomImage` component will be updated with the following logic:

-   **Priority 1: Check for Provided ID:**
    *   Examine the `src` prop (from the markdown image URL).
    *   If `src` starts with `tmdbid:` or `tmdbtvid:`:
        1.  Extract the ID and determine media type (movie/TV).
        2.  Attempt to fetch image from Fanart.tv using the explicit ID.
        3.  If Fanart.tv fails, attempt to fetch poster directly from TMDB using the explicit ID.
-   **Priority 2: Fallback to Text-Based Search (Current Behavior):**
    *   If `src` does not contain an explicit ID:
        1.  Clean the `alt` or `title` text.
        2.  Search TMDB for a movie/TV ID based on this text.
        3.  Attempt Fanart.tv and TMDB poster fetches with the derived ID.
-   **Final Fallback:**
    *   If all above methods fail, use the original `props.src` if it was a full URL.
    *   Otherwise, use the placeholder image.

## 3. Visualized Logic Flow

```mermaid
graph TD
    A[CustomImage Receives Props: src, alt, title] --> B{src starts with 'tmdbid:' or 'tmdbtvid:'?};
    B -- Yes --> C[Extract ID and Type (Movie/TV) from src];
    C --> D{Fetch from Fanart.tv using explicit ID};
    D -- Success --> E[Set imgSrc from Fanart];
    D -- Failure --> F{Fetch Poster from TMDB using explicit ID};
    F -- Success --> G[Set imgSrc from TMDB Poster];
    F -- Failure --> H[Log error, proceed to final fallback];
    B -- No --> I[Attempt Text-Based Search (current logic)];
    I -- ID Found --> J{Fetch from Fanart.tv using derived ID};
    J -- Success --> E;
    J -- Failure --> K{Fetch Poster from TMDB using derived ID};
    K -- Success --> G;
    K -- Failure --> H;
    E --> Z[Display Image];
    G --> Z;
    H --> L{Use original props.src if it's a valid URL?};
    L -- Yes --> M[Set imgSrc from props.src];
    L -- No / Error --> N[Set imgSrc to Placeholder];
    M --> Z;
    N --> Z;
```

## 4. Benefits

*   **Reliability:** Direct ID provision significantly improves image fetching accuracy.
*   **Control:** Explicit control over which media item's images are fetched.
*   **Fallback:** Existing posts and images without IDs continue to work.
*   **Extensibility:** Supports both movie and TV show IDs.