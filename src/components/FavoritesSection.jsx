// FavoritesSection.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/solid';
import { MediaCard } from './MediaCard';

const FavoritesSection = ({ currentUser, isAuthenticated, onClose, inHeader = false }) => {
  const [isOpen, setIsOpen] = useState(inHeader ? true : false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
            {!inHeader && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={handleClose}
              />
            )}

            <motion.div
              initial={inHeader ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="w-full bg-gray-800 rounded-xl shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto border border-gray-700"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userFavorites.map((fav) => {
                    // Map the favorite zitem to the format expected by MediaCard
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
                            token: currentUser.signInUserSession.accessToken.jwtToken
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