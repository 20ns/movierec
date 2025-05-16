// src/components/FavoritesModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, ArrowPathIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import MediaCard from './MediaCard';
import useFavorites from '../hooks/useFavorites';
import { MediaCardSkeleton } from './Skeletons'; // Assuming skeleton is moved/imported

// Item animation variants for micro-interactions
const itemAnimationVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.5 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
};

const FavoritesModal = ({ currentUser, isAuthenticated, onClose, isOpen }) => {
  // Use the hook to manage favorites data and state
  const {
    favorites, // This is the sorted list based on the hook's sortOption
    isLoading,
    error,
    sortOption,
    setSortOption,
    refreshFavorites,
    removeFavorite,
  } = useFavorites(currentUser, isAuthenticated);

  // Local UI state for the sort menu visibility
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Refs for UI elements
  const sortMenuRef = useRef(null);
  const favoritesScrollRef = useRef(null);
  const modalContentRef = useRef(null);

  // Close sort menu when clicking outside
  useEffect(() => {
    function handleClickOutsideSort(event) {
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('click', handleClickOutsideSort);
    return () => document.removeEventListener('click', handleClickOutsideSort);
  }, [showSortMenu]);

  const handleClose = () => {
    if (onClose) onClose();
  };

  // Simplified handler for removing a favorite using the hook's function
  const handleRemoveFavorite = (mediaId) => {
    removeFavorite(mediaId);
  };

  // Don't render if not authenticated or not open
  // Note: AnimatePresence handles the isOpen logic for the modal itself
  if (!isAuthenticated) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          // Close modal on backdrop click
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            ref={modalContentRef} // Add ref to modal content
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl overflow-hidden relative" // Changed overflow-visible to hidden
            // Prevent backdrop click from triggering when clicking inside modal content
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Inner container for padding and scroll */}
            <div className="flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Your Favorites</h2>
                  <div className="flex items-center space-x-2">
                    {/* Sort control */}
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

                    {/* Refresh Button */}
                    <button
                      onClick={refreshFavorites}
                      className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Refresh favorites"
                      disabled={isLoading}
                    >
                      <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Close Button */}
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
              </div>

              {/* Content Area (Scrollable) */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-grow custom-scrollbar" ref={favoritesScrollRef}>
                {isLoading && favorites.length === 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                      <MediaCardSkeleton key={i} />
                    ))}
                  </div>
                )}

                {error && (
                  <div className="text-center py-8">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                      onClick={refreshFavorites}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!isLoading && !error && favorites.length === 0 && (
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

                {!isLoading && favorites.length > 0 && (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  >
                    <AnimatePresence initial={false}>
                      {favorites.map((item) => (
                        <motion.div
                          key={`favorite-${item.mediaId}-${item.mediaType}`}
                          variants={itemAnimationVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                        >
                          <MediaCard
                            result={{ // Map hook data structure to MediaCard props
                              id: item.mediaId,
                              media_type: item.mediaType,
                              title: item.title,
                              name: item.title,
                              poster_path: item.posterPath,
                              backdrop_path: item.backdropPath,
                              vote_average: item.voteAverage, 
                              popularity: item.popularity,
                              release_date: item.releaseDate,
                              first_air_date: item.releaseDate,
                              genre_ids: item.genreIds,
                            }}
                            currentUser={currentUser}
                            isMiniCard={false} 
                            initialIsFavorited={true} 
                            fromFavorites={true}
                            onFavoriteToggle={handleRemoveFavorite}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div> {/* End Scrollable Content Area */}
            </div> {/* End Flex Col Container */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FavoritesModal;