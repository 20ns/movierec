// src/components/FavoritesDropdown.jsx
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

const FavoritesDropdown = ({ currentUser, isAuthenticated, onClose, isOpen }) => {
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
  const panelRef = useRef(null);
  const sortMenuRef = useRef(null);
  const favoritesScrollRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!isOpen) return;
      // Check if the click is outside the panel AND outside the sort menu if it's open
      const isOutsidePanel = panelRef.current && !panelRef.current.contains(event.target);
      const isOutsideSortMenu = showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(event.target);

      // Close if click is outside panel, OR if sort menu is open and click is outside sort menu
      if (isOutsidePanel && (!showSortMenu || isOutsideSortMenu)) {
         // If sort menu is open and click is outside it, just close the sort menu
         if (showSortMenu && isOutsideSortMenu) {
            setShowSortMenu(false);
         } else {
            // Otherwise, close the whole dropdown
            handleClose();
         }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, showSortMenu]); // Added showSortMenu dependency

  // Close sort menu when clicking outside of it specifically
  useEffect(() => {
    function handleClickOutsideSort(event) {
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(event.target) && panelRef.current && !panelRef.current.contains(event.target)) {
         // Ensure the click is also outside the main panel trigger area if needed
         // This might be redundant given the logic in the other useEffect, but can be kept for clarity
        setShowSortMenu(false);
      }
    }
    // Use 'click' instead of 'mousedown' for sort menu to allow selecting an option
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
  if (!isAuthenticated || !isOpen) return null;

  return (
    <motion.div ref={panelRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }} // Added y offset
      animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } }}
      exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.1, ease: "easeIn" } }}
      // Positioned relative to the Header button - adjust as needed
      className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-xl overflow-visible border border-gray-700 w-72 sm:w-80 md:w-96 max-w-[90vw] z-50"
      // Prevent clicks inside from closing it via the document listener
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
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
                    className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-[60]" // Ensure higher z-index than panel
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

            {/* Use refreshFavorites from the hook */}
            <button
              onClick={refreshFavorites}
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

        {/* Use isLoading and favorites from the hook */}
        {isLoading && favorites.length === 0 && (
              <div className="grid grid-cols-2 gap-3 pb-2">
                {[...Array(4)].map((_, i) => (
                  <MediaCardSkeleton key={i} isMini />
                ))}
              </div>
            )}

        {error && (
          <div className="text-center py-6">
            <p className="text-red-400 mb-3">{error}</p>
            {/* Use refreshFavorites from the hook */}
            <button
              onClick={refreshFavorites}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Use isLoading and favorites from the hook */}
        {!isLoading && !error && favorites.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-2">
              <HeartIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-white font-medium mb-2">Your favorites are empty</p>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Click the heart icon on movies/shows to add them here.
            </p>
          </div>
        )}

        {/* Use isLoading and favorites from the hook */}
        {!isLoading && favorites.length > 0 && (
          <div
            ref={favoritesScrollRef}
            className="grid grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar"
          >
            <AnimatePresence initial={false}>
               {/* Use favorites directly (already sorted by hook) */}
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
                    result={{
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
                    isMiniCard={true}
                    initialIsFavorited={true}
                    fromFavorites={true}
                    // Pass the simplified remove handler
                    onFavoriteToggle={handleRemoveFavorite}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FavoritesDropdown;