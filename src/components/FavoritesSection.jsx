// FavoritesSection.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/solid';
import { MediaCard } from './MediaCard';

const FavoritesSection = ({ currentUser, isAuthenticated }) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchFavorites = async () => {
    if (!currentUser?.signInUserSession?.idToken?.jwtToken) {
      console.error('No JWT token available');
      setError('Authentication token missing');
      return;
    }

    setIsLoading(true); // Set loading state when starting fetch
    
    try {
      console.log('Fetching favorites from API...');
      // Using the correct endpoint based on your Lambda function
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.signInUserSession.idToken.jwtToken}`,
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
        setFavorites(data.items);
      } else {
        console.warn('Unexpected response format:', data);
        setFavorites(Array.isArray(data) ? data : []);
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed right-20 top-4 z-50">
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

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-20 right-4 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Your Favorites
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your favorites...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {!isLoading && favorites.length === 0 && (
                    <div className="text-center py-8">
                      <HeartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No favorites yet</p>
                      <p className="text-gray-400 text-sm">
                        Movies and TV shows you favorite will appear here
                      </p>
                    </div>
                  )}

                  {favorites.map((fav) => {
                    // Map the favorite item to the format expected by MediaCard
                    const result = {
                      id: fav.mediaId,
                      title: fav.title,
                      poster_path: fav.posterPath,
                      media_type: fav.mediaType,
                      overview: fav.overview || "No description available"
                    };
                    return (
                      <motion.div
                        key={fav.mediaId}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mb-4"
                      >
                        <MediaCard
                          result={result}
                          currentUser={{
                            ...currentUser,
                            token: currentUser.signInUserSession.idToken.jwtToken
                          }}
                          promptLogin={() => {}}
                          onClick={() => {}}
                        />
                      </motion.div>
                    );
                  })}
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
