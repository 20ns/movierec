# MovieRec Improvement Plan (Including AdSense Compliance)

## 🎯 Original Project Aim

MovieRec aims to be an intelligent and intuitive platform for discovering movies and TV shows perfectly tailored to individual user tastes. By leveraging user viewing history, explicit preferences (collected via an onboarding questionnaire and preference center), and trending data, MovieRec provides a personalized discovery experience, making it effortless to find your next favorite thing to watch.

## ⚠️ AdSense Compliance Issues

The site has faced AdSense rejection due to:

1.  **Low Value Content:** Primarily relying on aggregated TMDB data without sufficient unique publisher content.
2.  **Google-served ads on screens without publisher content:** Ads potentially appearing on pages with insufficient content or during loading states, despite existing checks.

## 📈 Proposed Improvement Plan

This plan aims to address AdSense compliance issues by enhancing content value and refining the ad strategy.

### Plan Overview (Mermaid Diagram)

```mermaid
graph TD
    A[Start: AdSense Rejection] --> B{Analyze Issues};
    B --> C[Low Value Content];
    B --> D[Ads on Screens w/o Content];

    C --> E[Strategy: Enhance Content Value];
    E --> E1[Add User Reviews/Comments];
    E --> E2[Introduce Editorial Content (Blog, Lists)];
    E --> E3[Develop Community Features];
    E --> E4[Unique Data Presentation];

    D --> F[Strategy: Refine Ad Placement];
    F --> F1[Reduce Ad Density (Fewer Units)];
    F --> F2[Place Ads ONLY on High-Value Pages Initially];
    F --> F3[Stricter Ad Loading Conditions];
    F --> F4[Ensure Clear Separation from Navigation];

    subgraph Implementation Steps
        G[Implement Content Features (e.g., Reviews Backend/UI)]
        H[Refactor Ad Logic (Use stricter conditions, fewer units)]
        I[Review Site Navigation & UX]
        J[Resubmit to AdSense]
    end

    E1 & E2 & E3 & E4 --> G;
    F1 & F2 & F3 & F4 --> H;
    G & H --> I;
    I --> J;

    style E fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#ccf,stroke:#333,stroke-width:2px
```

### Detailed Plan Steps:

1.  **Enhance Content Value (Primary Focus):**
    *   **User Reviews/Comments:** Implement a system allowing logged-in users to write short reviews or comments on movie/TV show pages.
    *   **Editorial Content:** Create a simple blog section or dedicated pages for curated lists, short articles, or "Editor's Picks" with unique commentary.
    *   **(Optional) Community Features:** Consider adding user profiles or discussion forums.
    *   **(Optional) Unique Data Insights:** Present interesting insights based on anonymized user interaction data.

2.  **Refine Ad Placement Strategy:**
    *   **Reduce Ad Density:** Start with fewer ad units (e.g., one per main content page).
    *   **Target High-Value Pages:** Initially place ads only on pages with guaranteed unique content (blog, reviews pages).
    *   **Strengthen Loading Conditions:** Tie ad loading more directly to the presence of unique content elements.
    *   **Clear Separation:** Ensure ads are visually distinct from core content and navigation.

3.  **Review User Experience:**
    *   Ensure fast load times and intuitive navigation.
    *   Clearly communicate the site's value proposition (recommendations + unique content/community).

4.  **Implementation & Resubmission:**
    *   Implement the necessary backend and frontend changes for content features and ad logic.
    *   Thoroughly test the changes.
    *   Resubmit the site to AdSense for review.