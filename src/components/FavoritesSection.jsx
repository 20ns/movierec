// FavoritesSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/solid';
import { MediaCard } from './MediaCard';

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
      if (data && data.items) {
        setUserFavorites(data.items);
      } else {
        console.warn('Unexpected response format:', data);
        setUserFavorites(Array.isArray(data) ? data : []);
      }
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
    } else {
      setIsOpen(false);
    }
  };

  // Handle favorite toggle callback from MediaCard
  const handleFavoriteToggle = (mediaId, isFavorite) => {
    if (!isFavorite) {
      // If removed from favorites, update the UI immediately with a smoother animation
      setUserFavorites(prev => prev.filter(fav => fav.mediaId !== mediaId));
    } else {
      // If added to favorites and we're showing the favorites section,
      // we might want to refresh the list
      fetchFavorites();
    }
  };

  return (
    <div className={inHeader ? "bg-gray-800 rounded-xl shadow-xl overflow-hidden" : "fixed right-20 top-4 z-50"}>
      {!inHeader && (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          disabled={!currentUser?.signInUserSession}
          className={`flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors duration-300 shadow-md ${
            !currentUser?.signInUserSession ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {currentUser?.signInUserSession ? (
            <>
              <HeartIcon className="w-6 h-6 inline-block mr-2 text-red-200" />
              <span className="font-medium">Favorites</span>
            </>
          ) : (
            'Loading auth...'
          )}
        </motion.button>
      )}

      <AnimatePresence>
        {(isOpen || inHeader) && (
          <>
            {/* Replace with linear transitions for backdrop */}
            {inHeader && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { duration: 0.25, ease: "linear" }
                }}
                exit={{ 
                  opacity: 0,
                  transition: { duration: 0.2, ease: "linear" }
                }}
                className="fixed inset-0 bg-gradient-to-br from-black/40 to-gray-900/50 z-40"
                onClick={handleClose}
              />
            )}
            
            {!inHeader && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { duration: 0.25, ease: "linear" }
                }}
                exit={{ 
                  opacity: 0,
                  transition: { duration: 0.2, ease: "linear" }
                }}
                className="fixed inset-0 bg-gradient-to-br from-black/50 to-gray-900/60 z-40"
                onClick={handleClose}
              />
            )}

            {/* Replace spring with linear transitions for panel */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                transition: {
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1.0], // Custom cubic bezier for smooth motion
                  opacity: { duration: 0.25 },
                  y: { duration: 0.3 }
                }
              }}
              exit={{ 
                opacity: 0, 
                y: -15,
                boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.5)",
                transition: {
                  duration: 0.2,
                  ease: "easeIn"
                }
              }}
              style={{ willChange: "transform, opacity, box-shadow" }}
              className="relative w-full bg-gray-800 rounded-xl shadow-xl overflow-hidden max-h-[70vh] border border-gray-700 z-50"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Your Favorites
                  </h2>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-300">Loading your favorites...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {!isLoading && userFavorites.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">💔</div>
                    <p className="text-gray-300 mb-4">No favorites yet</p>
                    <p className="text-gray-400 text-sm">
                      Use the heart button on movies or shows to add them to your favorites
                    </p>
                  </div>
                )}

                <div 
                  ref={favoritesScrollRef}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
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
                          className="mb-4"
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FavoritesSection;