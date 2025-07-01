# Frontend Architecture

## Overview

The MovieRec frontend is a sophisticated React 18 single-page application (SPA) built with modern patterns and performance optimizations. It follows a component-based architecture with clear separation of concerns, advanced state management, and comprehensive user experience features.

## Application Structure

```
src/
├── index.js                    # Application bootstrap and PWA setup
├── App.js                      # Main application container
├── AppRoutes.js                # Routing configuration
├── components/                 # Reusable UI components
├── pages/                      # Route-specific components
├── hooks/                      # Custom React hooks
├── services/                   # API service layer
├── auth/                       # Authentication components
├── utils/                      # Utility functions
└── config/                     # Configuration files
```

## Core Application Flow

### Application Bootstrap (index.js)
```javascript
// Key responsibilities:
- AWS Amplify configuration
- Service Worker setup for PWA
- React 18 root initialization
- SEO provider setup (HelmetProvider)
- Web vitals monitoring
```

### Main Application Container (App.js)
The App.js serves as the central orchestrator with complex state management:

```javascript
// State management includes:
- Authentication state
- Modal coordination (search, favorites, watchlist, preferences)
- User preferences and questionnaire flow
- Performance dashboard integration
- Route protection and navigation
```

## Component Architecture Patterns

### 1. Layout Components

#### Header Component (`Header.js`)
**Pattern**: Memoized functional component with complex interaction management

**Key Features:**
- Responsive design with mobile hamburger menu
- Panel state coordination (prevents multiple panels open simultaneously)
- Authentication-aware navigation elements
- Performance-optimized with `useCallback` for event handlers
- Animated dropdowns and tooltips

```javascript
// Usage pattern:
const Header = memo(({ 
  onSearchToggle, 
  onFavoritesToggle, 
  onWatchlistToggle 
}) => {
  // Memoized callbacks for performance
  const handlePanelToggle = useCallback((panelType) => {
    // Coordinated panel state management
  }, []);
});
```

#### Dashboard Component (`Dashboard.js`)
**Pattern**: Content orchestrator with loading states

**Components Managed:**
- PersonalizedRecommendations
- TrendingSection
- CategoryBrowser
- GenreResults
- AdUnit placements

### 2. Core Content Components

#### MediaCard Component (`MediaCard.jsx`)
**Pattern**: Highly reusable, performance-optimized component

**Key Features:**
- Universal media display (movies and TV shows)
- Global state caching for favorites/watchlist status
- Optimistic UI updates with error rollback
- Visual feedback animations
- Multiple display modes (simplified, from-favorites, from-watchlist)
- Real-time rating fetching from TMDB
- Accessibility support with keyboard navigation

```javascript
// Props interface:
<MediaCard
  media={mediaObject}
  simplified={boolean}
  fromFavorites={boolean}
  fromWatchlist={boolean}
  onClick={handleClick}
/>
```

#### PersonalizedRecommendations Component (`PersonalizedRecommendations.jsx`)
**Pattern**: Forward ref with imperative handle for external control

**Data Sources (Multi-tier fallback):**
1. DynamoDB cache
2. TMDB Discover API with user preferences
3. Supplementary recommendations
4. Generic fallback content

**State Management:**
```javascript
const [state, setState] = useState({
  recommendations: [],
  loading: true,
  error: null,
  retryCount: 0
});
```

### 3. Advanced Search System

#### SearchBar Component (`SearchBar.js`)
**Pattern**: Compound component with multiple sub-components

**Features:**
- Smart vs Direct search modes
- Real-time query intent analysis
- Pagination with smooth transitions
- Lazy-loaded MediaCard components
- Advanced filtering system
- URL state synchronization
- Performance monitoring integration

```javascript
// Search modes:
- Smart Search: AI-powered content discovery
- Direct Search: Traditional query matching
- Filter Search: Genre and preference-based
```

### 4. Modal System

#### Modal Components Architecture
- **MediaDetailModal.jsx**: Detailed media information display
- **OnboardingQuestionnaire.jsx**: User preference collection
- **FavoritesModal.jsx**: Favorites management interface

**Pattern**: Centralized modal state management in App.js

```javascript
// Modal state coordination:
const [modals, setModals] = useState({
  search: false,
  favorites: false,
  watchlist: false,
  mediaDetail: null,
  preferences: false
});
```

### 5. User Data Management Components

#### FavoritesSection & WatchlistSection
**Pattern**: Dropdown panels with real-time updates

**Features:**
- Live synchronization across components
- Optimistic UI updates
- Sorting and filtering capabilities
- Responsive grid layouts

```javascript
// Real-time sync pattern:
useEffect(() => {
  // Listen for favorites changes across components
  const handleFavoritesChange = (event) => {
    setFavorites(event.detail.favorites);
  };
  
  window.addEventListener('favoritesChanged', handleFavoritesChange);
  return () => window.removeEventListener('favoritesChanged', handleFavoritesChange);
}, []);
```

## Custom Hooks Architecture

### Authentication Hook (`useAuth`)
```javascript
// Features:
- Centralized auth state with AWS Amplify integration
- Automatic token refresh
- User session management
- Route protection logic
```

### Recommendations Hook (`useRecommendations`)
**Pattern**: Sophisticated state machine with multiple data sources

```javascript
// Architecture:
const useRecommendations = () => {
  // Cache management with expiration
  // Preference change detection
  // Content type filtering
  // Error handling with retries
  // Performance optimization with memoization
};
```

### Favorites Hook (`useFavorites`)
**Pattern**: Optimistic updates with cache invalidation

```javascript
// Features:
- Local storage caching
- Real-time synchronization
- Error rollback mechanisms
- Cross-component event emission
```

### Search Hook (`useSearch`)
```javascript
// Features:
- Query intent analysis
- Results filtering and pagination
- Suggestion system
- Performance tracking
```

## State Management Strategy

### Global State (Context-based)
```javascript
// Authentication Context
const AuthContext = createContext();

// User Preferences Context
const PreferencesContext = createContext();
```

### Local State Management
- Component-level state for UI interactions
- Form state management
- Loading and error states

### Caching Strategy
**Multi-level caching:**
1. **Memory Cache**: Component-level caching for frequently accessed data
2. **Session Storage**: Temporary session data
3. **Local Storage**: User preferences and favorites
4. **Service Worker**: PWA caching for offline functionality

## Performance Optimization Patterns

### 1. Code Splitting
```javascript
// Route-based splitting
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));

// Component-based splitting for heavy components
const MediaCard = lazy(() => import('./components/MediaCard'));
```

### 2. Memoization Strategy
```javascript
// Component memoization
const MediaCard = memo(({ media, onClick }) => {
  // Expensive component operations
});

// Hook memoization
const memoizedValue = useMemo(() => {
  return expensiveCalculation(dependencies);
}, [dependencies]);
```

### 3. Event Handling Optimization
```javascript
// Throttled scroll handlers
const throttledScrollHandler = useCallback(
  throttle(() => {
    // Scroll handling logic
  }, 100),
  []
);
```

### 4. Image Optimization
- Lazy loading for media posters
- Responsive image sizes
- WebP format support with fallbacks

## API Integration Patterns

### Service Layer Architecture
```javascript
// services/mediaCache.js
export const MediaCacheService = {
  // Centralized API communication
  // Request/response transformation
  // Cache key generation
  // Error handling and fallbacks
};
```

### Authentication Flow
```javascript
// AWS Amplify integration
const authFlow = {
  signIn: async (credentials) => {
    // JWT token management
    // Session handling
    // User state updates
  }
};
```

### Data Fetching Patterns
```javascript
// Multi-source data aggregation
const fetchRecommendations = async () => {
  // Try DynamoDB cache first
  // Fallback to TMDB API
  // Combine with user preferences
  // Return enriched data
};
```

## Error Handling Architecture

### Error Boundary Strategy
```javascript
// Strategic error boundary placement
<ErrorBoundary fallback={<ErrorFallback />}>
  <ExpensiveComponent />
</ErrorBoundary>
```

### Graceful Degradation
- Fallback content for failed API calls
- Skeleton loading states
- Progressive enhancement

### User Feedback System
- Toast notifications for actions
- Error states with retry options
- Loading indicators

## Responsive Design System

### Mobile-First Approach
```javascript
// Tailwind CSS responsive utilities
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### Adaptive Layouts
- Container queries for component-based responsiveness
- Flexible grid systems
- Dynamic spacing and sizing

### Touch Interactions
- Mobile-optimized gesture handling
- Touch-friendly button sizes
- Swipe gestures for navigation

## Animation System

### Framer Motion Integration
```javascript
// Consistent animation patterns
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <Component />
</motion.div>
```

### Animation Patterns
- **Staggered Animations**: List and grid item animations
- **Micro-Interactions**: Button hover states and transitions
- **Page Transitions**: Route change animations
- **Loading Animations**: Skeleton and spinner components

## SEO and Performance

### SEO Strategy
```javascript
// React Helmet for meta management
<Helmet>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta property="og:title" content={pageTitle} />
</Helmet>
```

### Performance Monitoring
- Web Vitals tracking
- Performance dashboard integration
- Bundle size monitoring
- User experience metrics

## Build and Development

### Webpack Configuration
- Code splitting configuration
- Asset optimization
- Development server setup
- Production build optimization

### Development Tools
- Hot module replacement
- Source maps for debugging
- ESLint for code quality
- Prettier for code formatting

This frontend architecture provides a robust, scalable, and maintainable foundation for the MovieRec platform, leveraging modern React patterns while ensuring optimal user experience and performance.