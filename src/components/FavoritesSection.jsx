// FavoritesSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/solid';
import { MediaCard } from './MediaCard';

// Cache utilities for favorites
const FAVORITES_CACHE_KEY = 'user_favorites_cache';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

const getFavoritesFromCache = (userId) => {
  try {
    const cacheData = localStorage.getItem(`${FAVORITES_CACHE_KEY}_${userId}`);
    if (!cacheData) return null;
    
    const { data, timestamp } = JSON.parse(cacheData);
    
    // Check if cache is still valid (not expired)
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
const MediaCardSkeleton = () => (
  <motion.div 
    className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md"
    initial={{ opacity: 0.6 }}
    animate={{ 
      opacity: [0.6, 0.8, 0.6],
      transition: { 
        repeat: Infinity, 
        duration: 1.5 
      }
    }}
  >
    <div className="aspect-w-2 aspect-h-3 bg-gray-700" />
    <div className="p-3">
      <div className="w-3/4 h-5 bg-gray-700 rounded mb-2" />
      <div className="w-1/2 h-4 bg-gray-700 rounded" />
    </div>
  </motion.div>
);

const FavoritesSection = ({ currentUser, isAuthenticated, onClose, inHeader = false }) => {
  const [isOpen, setIsOpen] = useState(inHeader ? true : false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);
  const favoritesScrollRef = useRef(null);
  
  // Add an effect to handle clicks outside the panel
  useEffect(() => {
    function handleClickOutside(event) {
      // Only proceed if the panel is open and we're in header mode
      if (!isOpen || !inHeader) return;
      
      // Check if click is outside the panel
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        handleClose();
      }
    }
    
    // Add the event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, inHeader]);

  const fetchFavorites = async () => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No access token available');
      setError('Authentication token missing');
      return;
    }
  
    setIsLoading(true);
    
    try {
      // First check if we have valid cached data
      const userId = currentUser.username || currentUser.attributes?.sub;
      const cachedFavorites = getFavoritesFromCache(userId);
      
      if (cachedFavorites) {
        console.log('Using cached favorites data');
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
        console.error('Error response:', response.status, response.statusText);
        throw new Error(`Failed to fetch favorites: ${response.status} ${response.statusText}`);
      }

      // Parse the response according to what your Lambda returns
      const data = await response.json();
      console.log('Favorites data received:', data);
      
      // Check if the data has the expected structure
      const favorites = data && data.items ? data.items : (Array.isArray(data) ? data : []);
      
      // Cache the favorites data
      cacheFavorites(userId, favorites);
      
      // Update state
      setUserFavorites(favorites);
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
    if (favoritesScrollRef.current) {
      const scrollableDiv = favoritesScrollRef.current;
      
      const handleScroll = () => {
        const scrollPosition = scrollableDiv.scrollTop;
        const maxScroll = scrollableDiv.scrollHeight - scrollableDiv.clientHeight;
        const scrollPercentage = scrollPosition / maxScroll;
        
        // Apply subtle shadow based on scroll position
        if (scrollPosition > 10) {
          scrollableDiv.classList.add('shadow-inner-top');
        } else {
          scrollableDiv.classList.remove('shadow-inner-top');
        }
        
        if (scrollPosition < maxScroll - 10 && maxScroll > 0) {
          scrollableDiv.classList.add('shadow-inner-bottom');
        } else {
          scrollableDiv.classList.remove('shadow-inner-bottom');
        }
      };
      
      scrollableDiv.addEventListener('scroll', handleScroll);
      return () => scrollableDiv.removeEventListener('scroll', handleScroll);
    }
  }, [userFavorites]);

  if (!isAuthenticated) {
    return null;
  }
  // Make sure to use the onClose prop if it's provided (for the header version)
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    setIsOpen(false);
  };

  // Handle favorite toggle callback from MediaCard
  const handleFavoriteToggle = async (mediaId, isFavorite) => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No access token available');
      return;
    }
    
    const userId = currentUser.username || currentUser.attributes?.sub;
    
    if (!isFavorite) {
      // If removed from favorites, update the UI immediately with a smoother animation
      const updatedFavorites = userFavorites.filter(fav => fav.mediaId !== mediaId);
      setUserFavorites(updatedFavorites);
      
      // Update the cache
      cacheFavorites(userId, updatedFavorites);
      
      // Also send the removal request to backend
      try {
        await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite/${mediaId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );
      } catch (error) {
        console.error('Error removing from favorites:', error);
        // Consider showing a toast notification for errors
      }
    } else {
      // Fetch the latest data to keep everything in sync
      fetchFavorites();
    }
  };

  // Different render for header mode vs standalone mode
  if (inHeader) {
    return (
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          transition: {
            duration: 0.15,
            ease: "easeOut"
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.95,
          transition: {
            duration: 0.1,
            ease: "easeIn"
          }
        }}
        className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 w-full"
      >
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">
              Your Favorites
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
              aria-label="Close favorites"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-3 max-h-[50vh] pr-2">
              {[1, 2, 3].map(i => (
                <MediaCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-3 text-sm">
              {error}
            </div>
          )}

          {!isLoading && userFavorites.length === 0 && (
            <div className="text-center py-6 px-4">
              <motion.div 
                className="text-4xl mb-3"
                animate={{ 
                  scale: [1, 1.2, 1],
                  transition: { duration: 1.5, repeat: Infinity }
                }}
              >
                ❤️
              </motion.div>
              <p className="text-white font-medium mb-2">Your favorites list is empty</p>
              <p className="text-gray-300 text-sm mb-3">
                Browse movies and shows and click the heart icon to add them to your favorites
              </p>
              <button 
                onClick={handleClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-4 rounded-full transition-colors"
              >
                Browse content
              </button>
            </div>
          )}

          {!isLoading && userFavorites.length > 0 && (
            <div 
              ref={favoritesScrollRef}
              className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar"
              style={{
                scrollBehavior: 'smooth',
              }}
            >
              <AnimatePresence mode="popLayout">
                {userFavorites.map((fav) => {
                  // Fix the data issues while maintaining the existing visual style
                  const result = {
                    id: fav.mediaId,
                    title: fav.title,
                    poster_path: fav.posterPath,
                    media_type: fav.mediaType,
                    overview: fav.overview || "No description available",
                    // Add these fields to fix NaN issues
                    release_date: fav.releaseDate || (fav.year ? `${fav.year}-01-01` : '2023-01-01'),
                    first_air_date: fav.firstAirDate || (fav.year ? `${fav.year}-01-01` : '2023-01-01'),
                    vote_average: fav.voteAverage || fav.rating || 7.0,
                    popularity: fav.popularity || 50
                  };
                  return (
                    <motion.div
                      key={fav.mediaId}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        transition: {
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                          mass: 1
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.9,
                        transition: {
                          duration: 0.2,
                          ease: "easeOut"
                        }
                      }}
                      className="mb-2"
                    >
                      <MediaCard
                        result={result}
                        currentUser={{
                          ...currentUser,
                          token: currentUser.signInUserSession.accessToken.jwtToken
                        }}
                        promptLogin={() => {}}
                        onClick={() => {}}
                        simplifiedView={true}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Standalone mode render (not in header)
  return (
    <div className="fixed right-4 sm:right-20 top-4 z-50">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!currentUser?.signInUserSession}
        className={`flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors duration-300 shadow-md ${
          !currentUser?.signInUserSession ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {currentUser?.signInUserSession ? (
          <>
            <HeartIcon className="w-5 h-5 sm:w-6 sm:h-6 inline-block mr-1 sm:mr-2 text-red-200" />
            <span className="font-medium text-sm sm:text-base">Favorites</span>
          </>
        ) : (
          'Loading auth...'
        )}
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
              exit={{ 
                opacity: 0, 
                y: -15,
                transition: {
                  duration: 0.2,
                  ease: "easeIn"
                }
              }}
              className="bg-gray-800 rounded-xl shadow-xl overflow-hidden max-w-xl w-[90vw] sm:w-[80vw] mt-2 border border-gray-700"
              style={{ 
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '0.5rem'
              }}
            >
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Your Favorites
                  </h2>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Close favorites"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh]">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <MediaCardSkeleton key={i} />
                    ))}
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-3 text-sm">
                    {error}
                  </div>
                )}

                {!isLoading && userFavorites.length === 0 && (
                  <div className="text-center py-6 px-4">
                    <motion.div 
                      className="text-4xl mb-3"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        transition: { duration: 1.5, repeat: Infinity }
                      }}
                    >
                      ❤️
                    </motion.div>
                    <p className="text-white font-medium mb-2">Your favorites list is empty</p>
                    <p className="text-gray-300 text-sm mb-3">
                      Browse movies and shows and click the heart icon to add them to your favorites
                    </p>
                    <button 
                      onClick={handleClose}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-4 rounded-full transition-colors"
                    >
                      Browse content
                    </button>
                  </div>
                )}
                
                {!isLoading && userFavorites.length > 0 && (
                  <div 
                    ref={favoritesScrollRef}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
                  >
                    <AnimatePresence mode="popLayout">
                      {userFavorites.map((fav) => {
                        // Fix the data issues while maintaining the existing visual style
                        const result = {
                          id: fav.mediaId,
                          title: fav.title,
                          poster_path: fav.posterPath,
                          media_type: fav.mediaType,
                          overview: fav.overview || "No description available",
                          // Add these fields to fix NaN issues
                          release_date: fav.releaseDate || (fav.year ? `${fav.year}-01-01` : '2023-01-01'),
                          first_air_date: fav.firstAirDate || (fav.year ? `${fav.year}-01-01` : '2023-01-01'),
                          vote_average: fav.voteAverage || fav.rating || 7.0,
                          popularity: fav.popularity || 50
                        };
                        return (
                          <motion.div
                            key={fav.mediaId}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1,
                              transition: {
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                                mass: 1
                              }
                            }}
                            exit={{ 
                              opacity: 0, 
                              scale: 0.9,
                              transition: {
                                duration: 0.2,
                                ease: "easeOut"
                              }
                            }}
                            className="mb-2"
                          >
                            <MediaCard
                              result={result}
                              currentUser={{
                                ...currentUser,
                                token: currentUser.signInUserSession.accessToken.jwtToken
                              }}
                              promptLogin={() => {}}
                              onClick={() => {}}
                              simplifiedView={true}
                              onFavoriteToggle={handleFavoriteToggle}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FavoritesSection;