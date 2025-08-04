// src/hooks/useFavorites.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ENV_CONFIG from '../config/environment';
import { getCurrentAccessToken, isAuthenticatedWithValidSession } from '../utils/tokenUtils';

// --- Cache Utilities ---
const FAVORITES_CACHE_KEY = 'user_favorites_cache';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

const clearFavoritesCache = (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(`${FAVORITES_CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error('[useFavorites] Error clearing cache:', error);
  }
};

const getFavoritesFromCache = (userId) => {
  if (!userId) return null;
  try {
    const cacheData = localStorage.getItem(`${FAVORITES_CACHE_KEY}_${userId}`);
    if (!cacheData) return null;

    const { data, timestamp } = JSON.parse(cacheData);

    if (Date.now() - timestamp < CACHE_EXPIRY_TIME) {
      return data;
    }
    clearFavoritesCache(userId); // Clear expired cache
    return null;
  } catch (error) {
    console.error('[useFavorites] Error retrieving from cache:', error);
    return null;
  }
};

const cacheFavorites = (userId, favorites) => {
  if (!userId) return;
  try {
    const cacheData = {
      data: favorites,
      timestamp: Date.now()
    };
    localStorage.setItem(`${FAVORITES_CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('[useFavorites] Error saving to cache:', error);
  }
};

// --- Helper to get User ID ---
const getUserId = (currentUser) => {
  return currentUser?.username || currentUser?.attributes?.sub;
};

// --- The Hook ---
function useFavorites(currentUser, isAuthenticated) {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('dateAdded'); 
  const lastFetchTimeRef = useRef(0);
  const isFetchingRef = useRef(false);

  const userId = getUserId(currentUser);

  // --- Fetching Logic ---
  const fetchFavorites = useCallback(async (forceRefresh = false) => {
    // Check authentication using v6 compatible method
    const hasValidSession = await isAuthenticatedWithValidSession();
    if (!isAuthenticated || !hasValidSession || isFetchingRef.current) {
      return;
    }

    const currentUserId = getUserId(currentUser);
    if (!currentUserId) {
      console.error('[useFavorites] No user ID available for fetching.');
      setError('User ID missing.');
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      return;
    }

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedFavorites = getFavoritesFromCache(currentUserId);
      if (cachedFavorites) {
        setFavorites(cachedFavorites);
        setIsLoading(false); // Ensure loading is false if using cache
        setError(null);
        return; // Use cached data
      }
    }

    setIsLoading(true);
    setError(null);
    isFetchingRef.current = true;

    try {
      const token = await getCurrentAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(
        ENV_CONFIG.getApiUrl('/user/favourites'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawFavorites = data && data.items ? data.items : (Array.isArray(data) ? data : []);

      // Process favorites items to ensure metadata is properly formatted
      const processedFavorites = rawFavorites.map(item => ({
        ...item,
        mediaType: item.mediaType || 'movie', // Default to movie if missing
        posterPath: item.posterPath || null,
        backdropPath: item.backdropPath || null,
        voteAverage: parseFloat(item.voteAverage || item.vote_average || 0), // Ensure number
        popularity: item.popularity || 0,
        releaseDate: item.releaseDate || null,
        genreIds: item.genreIds || [], // Ensure array
        // Ensure title exists, potentially falling back if needed (though API should provide it)
        title: item.title || item.name || 'Untitled',
      }));

      lastFetchTimeRef.current = Date.now();
      cacheFavorites(currentUserId, processedFavorites);
      setFavorites(processedFavorites);

    } catch (err) {
      console.error('[useFavorites] Error fetching favorites:', err);
      setError('Failed to load favorites. Please try again later.');
      // Optionally clear cache on error? Or keep stale data? Keeping for now.
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [currentUser, isAuthenticated]); // Dependencies: currentUser for token/userId, isAuthenticated

  // --- Initial Fetch and Fetch on User Change ---
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchFavorites(); // Fetch on initial load or user change
    } else {
      // Clear state if user logs out
      setFavorites([]);
      setIsLoading(false);
      setError(null);
      lastFetchTimeRef.current = 0;
      // No need to clear cache here, it's user-specific
    }
  }, [isAuthenticated, userId, fetchFavorites]); // Depend on userId derived from currentUser

  // --- Remove Favorite Logic ---
  const removeFavorite = useCallback(async (mediaId) => {
    const hasValidSession = await isAuthenticatedWithValidSession();
    if (!isAuthenticated || !hasValidSession || !userId) {
      console.error('[useFavorites] Cannot remove favorite: User not authenticated or missing ID/token.');
      return;
    }

    // Optimistic UI update
    const originalFavorites = [...favorites];
    const updatedFavorites = originalFavorites.filter(item => item.mediaId !== mediaId);
    setFavorites(updatedFavorites);
    cacheFavorites(userId, updatedFavorites); // Update cache optimistically

    try {
      const token = await getCurrentAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(
        ENV_CONFIG.getApiUrl('/user/favourites'),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ mediaId })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to remove from favorites: ${response.status}`);
      }

    } catch (error) {
      console.error('[useFavorites] Error removing from favorites:', error);
      setError('Failed to remove favorite. Please try again.');
      // Revert optimistic update on error
      setFavorites(originalFavorites);
      cacheFavorites(userId, originalFavorites);
    }
  }, [currentUser, isAuthenticated, userId, favorites]); // Depend on favorites for optimistic update

  // --- Handle External Updates (e.g., adding a favorite elsewhere) ---
  useEffect(() => {
    const handleFavoriteUpdate = (event) => {
      const { mediaId: updatedId, isFavorited: newStatus, mediaData } = event.detail || {};
      const currentUserId = getUserId(currentUser); // Get current user ID inside handler

      if (!currentUserId || currentUserId !== getUserId(event.detail?.currentUser)) {
         // Ignore events not for the current user
         return;
      }

      if (newStatus && mediaData) {
        // Item was added - Add it locally and update cache
        // Ensure mediaData has the expected structure
        const newItem = {
          mediaId: mediaData.id,
          mediaType: mediaData.media_type || 'movie',
          title: mediaData.title || mediaData.name || 'Untitled',
          posterPath: mediaData.poster_path,
          backdropPath: mediaData.backdrop_path,
          voteAverage: parseFloat(mediaData.vote_average || 0),
          popularity: mediaData.popularity || 0,
          releaseDate: mediaData.release_date || mediaData.first_air_date,
          genreIds: mediaData.genre_ids || [],
          // Add timestamp if needed for sorting by date added locally? API might handle this.
        };
        setFavorites(prev => {
          // Avoid duplicates if event fires multiple times
          if (prev.some(item => item.mediaId === newItem.mediaId)) {
            return prev;
          }
          const updated = [newItem, ...prev]; // Add to beginning assuming newest first
          cacheFavorites(currentUserId, updated);
          return updated;
        });

      } else if (!newStatus && updatedId) {
        // Item was removed - Remove it locally and update cache
        setFavorites(prev => {
          const updated = prev.filter(item => item.mediaId !== updatedId);
          cacheFavorites(currentUserId, updated);
          return updated;
        });
      }
    };

    document.addEventListener('favorites-updated', handleFavoriteUpdate);
    return () => {
      document.removeEventListener('favorites-updated', handleFavoriteUpdate);
    };
  }, [currentUser]); // Re-run if currentUser changes to get the correct userId inside handler


  // --- Sorting Logic ---
  const sortedFavorites = useMemo(() => {
    if (!favorites.length) return [];

    const favoritesToSort = [...favorites]; // Create a copy

    switch (sortOption) {
      case 'alphabetical':
        return favoritesToSort.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'rating':
        // Ensure voteAverage is treated as a number
        return favoritesToSort.sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0));
      case 'dateAdded':
      default:
        // Assuming the API/local add puts newest first
        return favoritesToSort;
    }
  }, [favorites, sortOption]);

  // --- Refresh Function ---
  const refreshFavorites = useCallback(() => {
    clearFavoritesCache(userId);
    fetchFavorites(true);
  }, [fetchFavorites, userId]);

  return {
    favorites: sortedFavorites,
    isLoading,
    error,
    sortOption,
    setSortOption,
    refreshFavorites,
    removeFavorite,
  };
}

export default useFavorites;