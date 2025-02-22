import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/solid';
import { MediaCard } from './MediaCard';
import { ErrorBoundary } from 'react-error-boundary';

function FallbackComponent({ error }) {
  return (
    <div className="text-red-500 p-4">
      <p>Error loading favorites: {error.message}</p>
    </div>
  );
}

const FavoritesSection = ({ currentUser, isAuthenticated }) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchFavorites = async () => {
    // Check if user is authenticated
    if (!currentUser?.tokens?.accessToken) {
        setError('Authentication required');
        setFavorites([]);
        return;
    }

    // Initialize loading state
    setIsLoading(true);
    setError(null);

    // Log request details for debugging
    console.log("Current access token:", currentUser?.tokens?.accessToken);
    console.log("Making request to:", `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favorite`);

    try {
        // Make the fetch request
        const response = await fetch(
            `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favorite`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${currentUser.tokens.accessToken}`,
                },
            }
        );

        console.log("Response status:", response.status);

        // Parse response body as JSON once
        let data;
        try {
            data = await response.json();
            console.log("Parsed response data:", data);
        } catch (jsonError) {
            console.error("Failed to parse JSON:", jsonError);
            throw new Error("Invalid response format");
        }

        // Handle 401 Unauthorized specifically
        if (response.status === 401) {
            localStorage.removeItem('currentUser');
            window.location.reload();
            return;
        }

        // Handle other error statuses
        if (!response.ok) {
            throw new Error(data.error || `Failed to fetch favorites: ${response.status}`);
        }

        // Set favorites if successful
        setFavorites(Array.isArray(data) ? data : []);

    } catch (err) {
        // Handle all errors
        console.error('Error fetching favorites:', err);
        setError(err.message || 'Failed to load favorites. Please try again later.');
        setFavorites([]);
    } finally {
        // Cleanup loading state
        setIsLoading(false);
    }
};
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchFavorites();
    }
  }, [isOpen, isAuthenticated, currentUser?.tokens?.accessToken]);


  const safeFavorites = Array.isArray(favorites) ? favorites : [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent}>
      <div className="fixed right-20 top-4 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative px-6 py-3 rounded-full text-white border-2 border-red-500 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 transition-all duration-500 ease-in-out overflow-hidden hover:border-red-400 hover:shadow-lg hover:shadow-red-500/50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600 to-pink-500 opacity-30 blur-lg z-[-1] transition-opacity duration-500 ease-in-out group-hover:opacity-50"></div>
          <HeartIcon className="w-6 h-6 inline-block mr-2" />
          Favorites
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
                    {!isLoading && safeFavorites.length === 0 && (
                      <div className="text-center py-8">
                        <HeartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No favorites yet</p>
                        <p className="text-gray-400 text-sm">
                          Movies and TV shows you favorite will appear here
                        </p>
                      </div>
                    )}

                    {safeFavorites.map((fav) => {
                      const result = {
                        id: fav.mediaId,
                        title: fav.title,
                        poster_path: fav.posterPath,
                        media_type: fav.mediaType,
                      };
                      return (
                        <motion.div
                          key={fav.mediaId}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <MediaCard
                            result={result}
                            currentUser={currentUser}
                            onFavoriteToggle={fetchFavorites}
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
    </ErrorBoundary>
  );
};

export default FavoritesSection;