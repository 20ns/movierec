# 01: Frontend Architecture

## 1. Overview

The frontend is a single-page application (SPA) built with **React**. It is responsible for rendering the user interface, managing client-side state, and interacting with the backend services. The code is well-structured, with a clear separation of concerns between components, hooks, and services.

## 2. Core Technologies & Libraries

*   **React**: The core library for building the user interface.
*   **React Router**: For handling client-side routing and navigation.
*   **Tailwind CSS**: A utility-first CSS framework for styling.
*   **Framer Motion**: For creating fluid and complex animations.
*   **AWS Amplify**: Used for interacting with AWS services, particularly Cognito for authentication.
*   **Axios**: For making HTTP requests to the backend API.

## 3. Directory Structure

The `src` directory is organized as follows:

*   `account/`: Components related to user account management.
*   `auth/`: Components and logic for user authentication.
*   `components/`: Reusable UI components used throughout the application.
*   `config/`: Configuration files, such as the Amplify configuration.
*   `hooks/`: Custom React hooks for managing shared logic and state.
*   `pages/`: Components that represent entire pages or views.
*   `services/`: Modules for interacting with external services, like the TMDB API.
*   `utils/`: Utility functions and helper modules.

## 4. Routing

Routing is managed by the `react-router-dom` library. The main routing logic is defined in `src/App.js` within the `AppContent` component. The routes are defined using the `<Routes>` and `<Route>` components. The application uses a combination of public and private routes. Private routes are protected and require authentication.

Key routes include:

*   `/`: The main dashboard/landing page.
*   `/auth`, `/signin`, `/signup`: Authentication pages.
*   `/onboarding`: The user preferences questionnaire.
*   `/blog`, `/blog/:slug`: The blog section.

## 5. State Management

The application employs a combination of local component state (using `useState` and `useReducer`) and custom hooks for managing more complex, shared state. There is no global state management library like Redux or MobX in use. Instead, the application relies on React's built-in state management capabilities and custom hooks to share stateful logic.

Key custom hooks include:

*   `useAuth`: Manages authentication state and user information.
*   `useFavorites`: Handles the user's list of favorite media.
*   `useMediaList`: A generic hook for managing lists of media items.
*   `useRecommendations`: Fetches and manages personalized recommendations.
*   `useUserPreferences`: Manages the user's preferences.

## 6. Component Architecture

The application follows a component-based architecture. Components are generally small and focused on a single responsibility. They are organized into presentational components (dumb components) and container components (smart components).

*   **Container Components**: These components are aware of the application's state and logic. They fetch data, manage state, and pass it down to presentational components as props. Examples include `PersonalizedRecommendations`, `TrendingSection`, and `FavoritesSection`.

*   **Presentational Components**: These components are concerned with the UI and how things look. They receive data and callbacks as props and are not directly tied to the application's state. Examples include `MediaCard`, `Header`, and `SearchBar`.

## 7. Authentication Flow

1.  The user is presented with a sign-in or sign-up page.
2.  The `authPage.jsx` component handles the user input and uses the `aws-amplify` library to communicate with AWS Cognito.
3.  Upon successful authentication, Cognito returns a set of JWTs (ID token, access token, and refresh token).
4.  The `useAuth` hook manages these tokens and the user's authentication state.
5.  The access token is sent with every request to the backend API to authorize the user.

## 8. Data Fetching

Data fetching from the backend is primarily done using the `fetch` API. The application makes authenticated requests to the API Gateway endpoints, passing the JWT in the `Authorization` header.
