// FavoritesSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, ArrowPathIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import MediaCard from './MediaCard';

// Cache utilities for favorites
const FAVORITES_CACHE_KEY = 'user_favorites_cache';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Function to clear favorites cache for a user
const clearFavoritesCache = (userId) => {
  try {
    localStorage.removeItem(`${FAVORITES_CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error('Error clearing favorites cache:', error);
  }
};

const getFavoritesFromCache = (userId) => {
  try {
    const cacheData = localStorage.getItem(`${FAVORITES_CACHE_KEY}_${userId}`);
    if (!cacheData) return null;
    
    const { data, timestamp } = JSON.parse(cacheData);
    
    if (Date.now() - timestamp < CACHE_EXPIRY_TIME) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving from favorites cache:', error);
    return null;
  }
};

const cacheFavorites = (userId, favorites) => {
  try {
    const cacheData = {
      data: favorites,
      timestamp: Date.now()
    };
    localStorage.setItem(`${FAVORITES_CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to favorites cache:', error);
  }
};

// Loading skeleton for media cards
const MediaCardSkeleton = ({ isMini = false }) => (
  <motion.div 
    className={`bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md 
                ${isMini ? 'w-32' : 'w-full'}`}             // match mini card width when in header
    initial={{ opacity: 0.6 }}
    animate={{ 
      opacity: [0.6, 0.8, 0.6],
      transition: { repeat: Infinity, duration: 1.5 }
    }}
  >
    <div className="aspect-[2/3] bg-gray-700" />       {/* same poster aspect ratio */}
    <div className="p-3 space-y-2">
      <div className="w-3/4 h-5 bg-gray-700 rounded mb-2" />
      <div className="w-1/2 h-4 bg-gray-700 rounded" />
      <div className="flex justify-between items-center mt-1">
        <div className="w-10 h-4 bg-gray-700 rounded" />
        <div className="w-10 h-4 bg-gray-700 rounded" />
      </div>
    </div>
  </motion.div>
);

const FavoritesSection = ({ currentUser, isAuthenticated, onClose, inHeader = false }) => {
  const [isOpen, setIsOpen] = useState(inHeader ? true : false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('dateAdded'); // Default sort
  const [showSortMenu, setShowSortMenu] = useState(false);
  const panelRef = useRef(null);
  const sortMenuRef = useRef(null);
  const favoritesScrollRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!isOpen || !inHeader) return;
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, inHeader]);

  const fetchFavorites = async (forceRefresh = false) => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No access token available');
      setError('Authentication token missing');
      return;
    }
  
    // If not forcing refresh and we fetched recently (within last 5 seconds), don't fetch again
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      console.log('Skipping fetch - too soon since last fetch');
      return;
    }
  
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = currentUser.username || currentUser.attributes?.sub;
      
      // Only use cache if not forcing a refresh
      const cachedFavorites = !forceRefresh ? getFavoritesFromCache(userId) : null;
      
      if (cachedFavorites) {      console.log('Using cached favorites data');
        setUserFavorites(cachedFavorites);
        setIsLoading(false);
        return;
      }
      
      console.log('Fetching favorites from API...');
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const favorites = data && data.items ? data.items : (Array.isArray(data) ? data : []);
      
      // Process favorites items to ensure metadata is properly formatted
      const processedFavorites = favorites.map(item => ({
        ...item,
        // Ensure required fields have default values if missing
        mediaType: item.mediaType || 'movie',
        posterPath: item.posterPath || null,
        backdropPath: item.backdropPath || null,
        voteAverage: item.voteAverage || 0,
        popularity: item.popularity || 0,
        releaseDate: item.releaseDate || null,
        // Handle any other fields that might be missing
        genres: item.genres || []
      }));
      
      lastFetchTimeRef.current = now;
      cacheFavorites(userId, processedFavorites);
      setUserFavorites(processedFavorites);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to load favorites. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated && currentUser?.signInUserSession) {
      fetchFavorites();
    }
  }, [isOpen, isAuthenticated, currentUser?.signInUserSession]);

  useEffect(() => {
    const handleFavoriteUpdate = (event) => {
      const { mediaId: updatedId, isFavorited: newStatus } = event.detail || {};
      
      // Handle the favorite update event
      if (newStatus) {
        // Item was added to favorites - force refresh to get the full details
        fetchFavorites(true);
      } else if (!newStatus && updatedId) {
        // Item was removed - we can just filter it out without a full refresh
        setUserFavorites(prev => prev.filter(item => item.mediaId !== updatedId));
        
        // Also update cache
        if (currentUser) {
          const userId = currentUser.username || currentUser.attributes?.sub;
          const updatedFavorites = userFavorites.filter(item => item.mediaId !== updatedId);
          cacheFavorites(userId, updatedFavorites);
        }
      }
    };

    document.addEventListener('favorites-updated', handleFavoriteUpdate);
    return () => {
      document.removeEventListener('favorites-updated', handleFavoriteUpdate);
    };
  }, [currentUser, userFavorites]);

  // Close sort menu when clicking outside
  useEffect(() => {
    function handleClickOutsideSort(event) {
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSort);
    return () => document.removeEventListener('mousedown', handleClickOutsideSort);
  }, [showSortMenu]);

  // Sort favorites based on current sort option
  const sortedFavorites = React.useMemo(() => {
    if (!userFavorites.length) return [];
    
    const favorites = [...userFavorites]; // Create a copy to avoid mutating original
    
    switch (sortOption) {
      case 'alphabetical':
        return favorites.sort((a, b) => a.title.localeCompare(b.title));
      case 'rating':
        return favorites.sort((a, b) => b.voteAverage - a.voteAverage);
      case 'dateAdded':
      default:
        // Assuming most recently added is first in the array from API
        return favorites;
    }
  }, [userFavorites, sortOption]);

  // Item animation variants for micro-interactions
  const itemAnimationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.5 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  const handleClose = () => {
    if (onClose) onClose();
    setIsOpen(false);
  };

  const handleFavoriteToggle = async (mediaId, isFavorited) => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No access token available');
      return;
    }
    
    const userId = currentUser.username || currentUser.attributes?.sub;
    
    if (!isFavorited) {
      // Item is being removed from favorites
      const updatedFavorites = userFavorites.filter(item => item.mediaId !== mediaId);
      setUserFavorites(updatedFavorites);
      cacheFavorites(userId, updatedFavorites);
      
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ mediaId })
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to remove from favorites: ${response.status}`);
        }
        
        // Clear the cache to ensure fresh data on next fetch
        clearFavoritesCache(userId);
      } catch (error) {
        console.error('Error removing from favorites:', error);
        // Restore the item in case of error
        fetchFavorites(true);
      }
    } else {
      // Force fetch to update with the newly added item
      fetchFavorites(true);
    }
  };

  if (!isAuthenticated) return null;

  // Header mode render
  if (inHeader) {
    return (
      <motion.div ref={panelRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" } }}
        className="absolute top-16 right-0 bg-gray-800 rounded-lg shadow-xl overflow-visible border border-gray-700 w-72 sm:w-80 md:w-96 max-w-[90vw] z-50"
      >
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">Your Favorites</h2>
            <div className="flex items-center space-x-2">
              {/* Sort button */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Sort favorites"
                >
                  <ArrowsUpDownIcon className="h-5 w-5" />
                </button>
                
                {/* Sort dropdown menu */}
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      ref={sortMenuRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => { setSortOption('dateAdded'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'dateAdded' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          Date Added (Default)
                        </button>
                        <button
                          onClick={() => { setSortOption('alphabetical'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'alphabetical' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          Alphabetical (A-Z)
                        </button>
                        <button
                          onClick={() => { setSortOption('rating'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'rating' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          Rating (High to Low)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button
                onClick={() => fetchFavorites(true)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh favorites"
                disabled={isLoading}
              >
                <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Close favorites"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {isLoading && userFavorites.length === 0 && (
                <div className="grid grid-cols-2 gap-3 pb-2">
                  {[...Array(4)].map((_, i) => (
                    <MediaCardSkeleton key={i} isMini />       // pass isMini here
                  ))}
                </div>
              )}

          {error && (
            <div className="text-center py-6">
              <p className="text-red-400 mb-3">{error}</p>
              <button
                onClick={() => fetchFavorites(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && userFavorites.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-2">
                <HeartIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-white font-medium mb-2">Your favorites are empty</p>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Browse movies and shows and click the heart icon to add them to your favorites
              </p>
            </div>
          )}

          {!isLoading && userFavorites.length > 0 && (
            <div 
              ref={favoritesScrollRef}
              className="grid grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar"
            >
              <AnimatePresence initial={false}>
                {sortedFavorites.map((item) => (
                  <motion.div
                    key={`favorite-${item.mediaId}-${item.mediaType}`}
                    variants={itemAnimationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <MediaCard
                      result={{
                        id: item.mediaId,
                        media_type: item.mediaType,
                        title: item.title,
                        name: item.title,
                        poster_path: item.posterPath,
                        backdrop_path: item.backdropPath,
                        vote_average: item.voteAverage || 0,
                        popularity: item.popularity || 0,
                        release_date: item.releaseDate,
                        first_air_date: item.releaseDate,
                        genre_ids: item.genreIds || []
                      }}
                      currentUser={currentUser}
                      isMiniCard={true}
                      initialIsFavorited={true}
                      fromFavorites={true}
                      onFavoriteToggle={(mediaId) => handleFavoriteToggle(mediaId, false)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fullscreen mode render
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl overflow-visible relative"
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Your Favorites</h2>
                <div className="flex items-center space-x-2">
                  {/* Sort control for fullscreen mode */}
                  <div className="relative mr-2">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                    >
                      <ArrowsUpDownIcon className="h-4 w-4" />
                      <span className="text-sm">
                        {sortOption === 'dateAdded' && 'Date Added'}
                        {sortOption === 'alphabetical' && 'A-Z'}
                        {sortOption === 'rating' && 'Rating'}
                      </span>
                    </button>
                    
                    <AnimatePresence>
                      {showSortMenu && (
                        <motion.div
                          ref={sortMenuRef}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50"
                        >
                          <div className="py-1">
                            <button
                              onClick={() => { setSortOption('dateAdded'); setShowSortMenu(false); }}
                              className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'dateAdded' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                              Date Added (Default)
                            </button>
                            <button
                              onClick={() => { setSortOption('alphabetical'); setShowSortMenu(false); }}
                              className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'alphabetical' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                              Alphabetical (A-Z)
                            </button>
                            <button
                              onClick={() => { setSortOption('rating'); setShowSortMenu(false); }}
                              className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'rating' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                              Rating (High to Low)
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <button
                    onClick={() => fetchFavorites(true)}
                    className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Refresh favorites"
                    disabled={isLoading}
                  >
                    <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Close favorites"
                  >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {isLoading && userFavorites.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <MediaCardSkeleton key={i} />            // default isMini=false
                  ))}
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={() => fetchFavorites(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!isLoading && userFavorites.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 mb-4">
                    <HeartIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-white font-medium mb-2">Your favorites are empty</p>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    Browse movies and shows and click the heart icon to add them to your favorites
                  </p>
                </div>
              )}

              {!isLoading && userFavorites.length > 0 && (
                <div 
                  ref={favoritesScrollRef}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 custom-scrollbar"
                >
                  <AnimatePresence initial={false}>
                    {sortedFavorites.map((item) => (
                      <motion.div
                        key={`favorite-${item.mediaId}-${item.mediaType}`}
                        variants={itemAnimationVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        <MediaCard
                          result={{
                            id: item.mediaId,
                            media_type: item.mediaType,
                            title: item.title,
                            name: item.title,
                            poster_path: item.posterPath,
                            backdrop_path: item.backdropPath,
                            vote_average: item.voteAverage || 0,
                            release_date: item.releaseDate,
                            first_air_date: item.releaseDate,
                          }}
                          currentUser={currentUser}
                          isMiniCard={false}
                          initialIsFavorited={true}
                          fromFavorites={true}
                          onFavoriteToggle={(mediaId) => handleFavoriteToggle(mediaId, false)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FavoritesSection;