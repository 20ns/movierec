# React Components Guide

## Overview

This guide provides comprehensive documentation for all React components in the MovieRec application. Components are organized by category with detailed information about their purpose, props, usage patterns, and integration points.

## Component Categories

### Core Display Components

#### MediaCard Component
**Location:** `src/components/MediaCard.jsx`

**Purpose:** Primary UI element for displaying movie and TV show information across the application.

**Props Interface:**
```typescript
interface MediaCardProps {
  result: {
    id: string | number;
    title?: string;
    name?: string;
    poster_path?: string;
    overview?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: 'movie' | 'tv';
    genre_ids?: number[];
    score?: number;
    scoreReasons?: string[];
    popularity?: number;
  };
  onClick?: (result: object) => void;
  promptLogin?: () => void;
  currentUser?: object;
  isAuthenticated?: boolean;
  simplifiedView?: boolean;
  onFavoriteToggle?: (mediaId: string, isFavorited: boolean) => void;
  onWatchlistToggle?: (mediaId: string, isInWatchlist: boolean) => void;
  highlightMatch?: boolean;
  initialIsFavorited?: boolean | null;
  initialIsInWatchlist?: boolean | null;
  fromWatchlist?: boolean;
  fromFavorites?: boolean;
  isMiniCard?: boolean;
}
```

**Key Features:**
- Dynamic content rendering based on context
- Global caching system for favorite/watchlist status
- Real-time updates via custom events
- Optimistic UI updates with error rollback
- Responsive design with mobile-first approach
- Accessibility support with proper ARIA labels

**Usage Examples:**
```jsx
// Basic usage in search results
<MediaCard
  result={searchItem}
  currentUser={currentUser}
  onClick={handleMediaClick}
/>

// In favorites section
<MediaCard
  result={favoriteItem}
  currentUser={currentUser}
  initialIsFavorited={true}
  fromFavorites={true}
  onFavoriteToggle={handleRemoveFavorite}
/>

// Simplified view
<MediaCard
  result={item}
  currentUser={currentUser}
  simplifiedView={true}
/>
```

**State Management:**
- Local state for loading states and user feedback
- Global cache for favorite/watchlist IDs (30-second cooldown)
- Event-driven synchronization across components

---

### Navigation Components

#### Header Component
**Location:** `src/components/Header.js`

**Purpose:** Main navigation interface with search, user account management, and responsive mobile navigation.

**Props Interface:**
```typescript
interface HeaderProps {
  currentUser: object;
  isAuthenticated: boolean;
  onSearchClick: (visible?: boolean) => void;
  showSearch: boolean;
  onPreferencesClick: () => void;
  onFavoritesClick: (visible?: boolean) => void;
  showFavorites: boolean;
  onWatchlistClick: (visible?: boolean) => void;
  showWatchlist: boolean;
  onSignout: () => void;
  onAccountClick: () => void;
  hasBasicPreferencesOnly?: boolean;
  searchContainerRef?: React.RefObject;
}
```

**Key Features:**
- Panel coordination (prevents multiple panels open simultaneously)
- Responsive design with mobile hamburger menu
- Authentication-aware navigation elements
- Performance-optimized with memoized callbacks
- Animated dropdowns and tooltips

**Usage Example:**
```jsx
<Header
  currentUser={currentUser}
  isAuthenticated={isAuthenticated}
  onSearchClick={handleSearchToggle}
  showSearch={showSearch}
  onPreferencesClick={handlePreferencesModal}
  onFavoritesClick={handleFavoritesToggle}
  showFavorites={showFavorites}
  onWatchlistClick={handleWatchlistToggle}
  showWatchlist={showWatchlist}
  onSignout={handleSignout}
  onAccountClick={handleAccountModal}
  hasBasicPreferencesOnly={hasBasicPreferencesOnly}
  searchContainerRef={searchContainerRef}
/>
```

**State Management:**
- Local UI state for dropdown and mobile menu visibility
- Panel coordination to ensure single panel display
- Memoized event handlers for performance

---

### Search Components

#### SearchBar Component
**Location:** `src/components/SearchBar.js`

**Purpose:** Comprehensive search interface with intelligent discovery capabilities.

**Props Interface:**
```typescript
interface SearchBarProps {
  currentUser: object;
  onMediaClick: (item: object) => void;
}
```

**Key Features:**
- **Smart Search Modes:**
  - Smart mode: Intent-based search with similarity analysis
  - Direct mode: Traditional title-based search
- Query intent analysis for complex searches
- Advanced filtering (genre, year, popularity, content type)
- Pagination with smooth transitions
- URL state synchronization
- Real-time suggestions with debounced autocomplete

**Usage Example:**
```jsx
<SearchBar
  currentUser={currentUser}
  onMediaClick={handleMediaDetailModal}
/>
```

**State Management:**
- Uses custom `useSearch` hook for centralized logic
- URL synchronization for search state persistence
- Complex filter state management

---

### Content Section Components

#### Dashboard Component
**Location:** `src/components/Dashboard.js`

**Purpose:** Main authenticated user interface orchestrating multiple content sections.

**Props Interface:**
```typescript
interface DashboardProps {
  currentUser: object;
  isAuthenticated: boolean;
  initialAppLoadComplete: boolean;
  userPreferences: object;
  hasCompletedQuestionnaire: boolean;
  showPageLoading: boolean;
  showRecommendations: boolean;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string | null) => void;
  personalizedRecommendationsRef: React.RefObject;
}
```

**Key Features:**
- Conditional rendering based on authentication and loading states
- Comprehensive skeleton loading states
- Progressive content enhancement
- Strategic ad unit placement
- Responsive layout optimization

**Usage Example:**
```jsx
<Dashboard
  currentUser={currentUser}
  isAuthenticated={isAuthenticated}
  initialAppLoadComplete={initialAppLoadComplete}
  userPreferences={userPreferences}
  hasCompletedQuestionnaire={hasCompletedQuestionnaire}
  showPageLoading={showPageLoading}
  showRecommendations={showRecommendations}
  selectedGenre={selectedGenre}
  setSelectedGenre={setSelectedGenre}
  personalizedRecommendationsRef={personalizedRecommendationsRef}
/>
```

**Integration Patterns:**
- Orchestrates PersonalizedRecommendations, TrendingSection, CategoryBrowser
- Coordinates loading states across multiple data sources
- Strategic advertisement placement between content sections

---

#### PersonalizedRecommendations Component
**Location:** `src/components/PersonalizedRecommendations.jsx`

**Purpose:** AI-driven personalized movie and TV show recommendations.

**Props Interface:**
```typescript
interface PersonalizedRecommendationsProps {
  currentUser: object;
  isAuthenticated: boolean;
  propUserPreferences: object;
  propHasCompletedQuestionnaire: boolean;
  initialAppLoadComplete: boolean;
  onMediaClick?: (item: object) => void;
}
```

**Key Features:**
- **Multi-tier Data Sources:**
  1. DynamoDB cache
  2. TMDB Discover API with user preferences
  3. Supplementary recommendations
  4. Generic fallback content
- Intelligent caching and refresh logic
- Content filtering (movies, TV shows, or both)
- Performance monitoring with web vitals
- Real-time updates on preference changes

**Usage Example:**
```jsx
<PersonalizedRecommendations
  ref={personalizedRecommendationsRef}
  currentUser={currentUser}
  isAuthenticated={isAuthenticated}
  propUserPreferences={userPreferences}
  propHasCompletedQuestionnaire={hasCompletedQuestionnaire}
  initialAppLoadComplete={initialAppLoadComplete}
/>
```

**State Management:**
- Complex state object with multiple related properties
- Ref-based lifecycle management
- Event listeners for external updates
- Imperative API via forwardRef

---

### Modal Components

#### MediaDetailModal Component
**Location:** `src/components/MediaDetailModal.jsx`

**Purpose:** Detailed movie/TV show information display in modal interface.

**Props Interface:**
```typescript
interface MediaDetailModalProps {
  item: {
    id: string | number;
    title?: string;
    name?: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
    curator_notes?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  currentUser: object;
}
```

**Key Features:**
- Rich media display with backdrop images
- Curator notes integration
- Reviews system integration
- Conditional advertisement placement
- Responsive modal design
- Proper focus management

**Usage Example:**
```jsx
<MediaDetailModal
  item={selectedMedia}
  isOpen={showMediaModal}
  onClose={() => setShowMediaModal(false)}
  currentUser={currentUser}
/>
```

---

#### FavoritesModal Component
**Location:** `src/components/FavoritesModal.jsx`

**Purpose:** Dedicated interface for managing user's favorite movies and TV shows.

**Props Interface:**
```typescript
interface FavoritesModalProps {
  currentUser: object;
  isAuthenticated: boolean;
  onClose: () => void;
  isOpen: boolean;
}
```

**Key Features:**
- Custom `useFavorites` hook integration
- Sorting options (date added, alphabetical, rating)
- Responsive grid layout
- Real-time updates
- Helpful empty state

**Usage Example:**
```jsx
<FavoritesModal
  currentUser={currentUser}
  isAuthenticated={isAuthenticated}
  onClose={handleCloseFavorites}
  isOpen={showFavoritesModal}
/>
```

---

#### OnboardingQuestionnaire Component
**Location:** `src/components/OnboardingQuestionnaire.jsx`

**Purpose:** User preference collection interface for personalized recommendations.

**Props Interface:**
```typescript
interface OnboardingQuestionnaireProps {
  currentUser: object;
  onComplete: (preferences: object) => void;
  onSkip?: () => void;
  isModal?: boolean;
  existingPreferences?: object;
}
```

**Key Features:**
- Progressive disclosure with skip options
- Genre preference collection
- Mood and content type preferences
- Viewing habit analysis
- Both modal and full-page modes

**Usage Example:**
```jsx
<OnboardingQuestionnaire
  currentUser={currentUser}
  onComplete={handlePreferencesComplete}
  onSkip={handleSkipQuestionnaire}
  isModal={true}
  existingPreferences={userPreferences}
/>
```

---

#### AccountDetailsModal Component
**Location:** `src/components/AccountDetailsModal.js`

**Purpose:** Comprehensive user account management interface.

**Props Interface:**
```typescript
interface AccountDetailsModalProps {
  currentUser: object;
  onClose: () => void;
}
```

**Key Features:**
- Tabbed interface (Profile, Security, Preferences)
- Password management with secure validation
- Account deletion with confirmation
- AWS Amplify Auth integration
- Form validation and error handling

**Usage Example:**
```jsx
<AccountDetailsModal
  currentUser={currentUser}
  onClose={handleCloseAccountModal}
/>
```

---

### User Data Components

#### FavoritesSection Component
**Location:** `src/components/FavoritesSection.jsx`

**Purpose:** Dropdown panel for quick access to user's favorite content.

**Props Interface:**
```typescript
interface FavoritesSectionProps {
  currentUser: object;
  isAuthenticated: boolean;
  onMediaClick: (item: object) => void;
}
```

**Key Features:**
- Dropdown panel with real-time updates
- Live synchronization across components
- Optimistic UI updates
- Responsive grid layout
- Quick access to favorites management

**Usage Example:**
```jsx
<FavoritesSection
  currentUser={currentUser}
  isAuthenticated={isAuthenticated}
  onMediaClick={handleMediaClick}
/>
```

---

#### WatchlistSection Component
**Location:** `src/components/WatchlistSection.jsx`

**Purpose:** Dropdown panel for managing user's watchlist.

**Props Interface:**
```typescript
interface WatchlistSectionProps {
  currentUser: object;
  isAuthenticated: boolean;
  onMediaClick: (item: object) => void;
}
```

**Key Features:**
- Similar to FavoritesSection but for watchlist
- Real-time synchronization
- Sorting and filtering capabilities
- Responsive design
- Quick watchlist management

**Usage Example:**
```jsx
<WatchlistSection
  currentUser={currentUser}
  isAuthenticated={isAuthenticated}
  onMediaClick={handleMediaClick}
/>
```

---

### Content Discovery Components

#### TrendingSection Component
**Location:** `src/components/TrendingSection.jsx`

**Purpose:** Display trending movies and TV shows.

**Props Interface:**
```typescript
interface TrendingSectionProps {
  currentUser: object;
  onMediaClick: (item: object) => void;
}
```

**Key Features:**
- TMDB trending data integration
- Automatic content updates
- Responsive grid layout
- Loading states with skeletons
- Error handling with fallbacks

**Usage Example:**
```jsx
<TrendingSection
  currentUser={currentUser}
  onMediaClick={handleMediaClick}
/>
```

---

#### CategoryBrowser Component
**Location:** `src/components/CategoryBrowser.jsx`

**Purpose:** Genre-based content browsing interface.

**Props Interface:**
```typescript
interface CategoryBrowserProps {
  currentUser: object;
  onMediaClick: (item: object) => void;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string | null) => void;
}
```

**Key Features:**
- Genre-based content discovery
- Interactive genre selection
- Responsive genre grid
- Loading states and error handling
- Smooth transitions between categories

**Usage Example:**
```jsx
<CategoryBrowser
  currentUser={currentUser}
  onMediaClick={handleMediaClick}
  selectedGenre={selectedGenre}
  setSelectedGenre={setSelectedGenre}
/>
```

---

### Utility Components

#### ErrorBoundary Component
**Location:** `src/components/ErrorBoundary.jsx`

**Purpose:** Error containment with graceful fallbacks.

**Props Interface:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error}>;
}
```

**Key Features:**
- Component error catching
- Graceful fallback UI
- Error reporting
- Recovery mechanisms

**Usage Example:**
```jsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <ExpensiveComponent />
</ErrorBoundary>
```

---

#### LoadMoreButton Component
**Location:** `src/components/LoadMoreButton.jsx`

**Purpose:** Standardized pagination button.

**Props Interface:**
```typescript
interface LoadMoreButtonProps {
  show: boolean;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}
```

**Key Features:**
- Conditional rendering
- Loading states
- Hover and tap animations
- Consistent styling

**Usage Example:**
```jsx
<LoadMoreButton
  show={hasMoreResults}
  onClick={handleLoadMore}
  loading={isLoading}
/>
```

---

#### Skeletons Component Library
**Location:** `src/components/Skeletons.jsx`

**Purpose:** Standardized loading skeleton components.

**Available Components:**
- `MediaCardSkeleton`: Individual media card loading
- `RecommendationsSkeleton`: Recommendations section loading
- `TrendingSkeleton`: Trending section loading
- `CategoryBrowserSkeleton`: Category browser loading
- `DashboardSkeleton`: Full dashboard loading

**Key Features:**
- Responsive design
- Subtle pulse animations
- Consistent loading states
- Proper spacing and dimensions

**Usage Example:**
```jsx
{isLoading ? (
  <MediaCardSkeleton count={8} />
) : (
  <MediaGrid items={items} />
)}
```

---

## Custom Hooks

### useSearch Hook
**Location:** `src/components/useSearch.js`

**Purpose:** Comprehensive search logic abstraction.

**Return Interface:**
```typescript
interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  activeFilters: FilterState;
  setActiveFilters: (filters: FilterState) => void;
  hasSearched: boolean;
  isLoading: boolean;
  displayedResults: Array<any>;
  filteredResults: Array<any>;
  resultsToShow: number;
  error: string | null;
  isErrorVisible: boolean;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  suggestions: Array<any>;
  handleSearch: (e?: Event) => void;
  handleShowMore: () => void;
  handleSuggestionClick: (suggestion: any) => void;
  handleSuggestionHover: (suggestion: any) => void;
  handleResultClick: (result: any) => void;
}
```

**Key Features:**
- Intent analysis for complex queries
- Smart filtering system
- Performance optimization with caching
- Error handling and recovery
- Similarity search capabilities

---

## Utility Libraries

### SearchBarUtils
**Location:** `src/components/SearchBarUtils.js`

**Purpose:** Utility functions for search functionality.

**Key Exports:**
- `fetchWithRetry`: HTTP client with retry logic
- `calculateMatchScore`: Search relevance scoring
- `analyzeContent`: Content analysis for mood/themes
- `getGenreColor`: Genre-based color mapping
- `getMoodFromText`: Text-to-mood analysis
- `formatQueryIntentSummary`: User-friendly intent descriptions

**Features:**
- Advanced caching with TTL
- Multi-source recommendation aggregation
- Performance-optimized algorithms
- Comprehensive genre classification

---

## Component Integration Patterns

### State Management
- **Component State**: Local `useState` for UI-specific state
- **Props Drilling**: Controlled data flow
- **Custom Hooks**: Logic abstraction for complex behavior
- **Event System**: Custom DOM events for cross-component communication
- **Caching**: Module-level caching for performance

### Performance Optimizations
- **Memoization**: `React.memo`, `useMemo`, `useCallback`
- **Lazy Loading**: Code splitting with `React.lazy`
- **Debouncing**: Search input and API call throttling
- **Caching**: Multi-level caching strategy
- **Pagination**: Efficient data loading over infinite scroll

### Error Handling
- **Error Boundaries**: Component-level error catching
- **Graceful Degradation**: Fallback states
- **User Feedback**: Clear error messages and recovery
- **Retry Logic**: Automatic retry with exponential backoff
- **Validation**: Input validation and form errors

### Accessibility
- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling
- **Color Contrast**: High contrast design
- **Semantic HTML**: Proper structure and semantics

This comprehensive component guide provides developers with the information needed to understand, maintain, and extend the MovieRec React application effectively.