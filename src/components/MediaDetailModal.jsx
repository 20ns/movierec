// src/components/MediaDetailModal.jsx
import React, { useState, useCallback, useEffect } from 'react'; // Consolidated React imports
import { motion, AnimatePresence } from 'framer-motion'; // Keep one framer-motion import
import { XMarkIcon, StarIcon, CalendarIcon } from '@heroicons/react/24/solid'; // Keep one heroicons import
import ReviewsSection from './ReviewsSection'; // Import the reviews component
import AdUnit from './AdUnit'; // Import AdUnit

// Helper to extract year
const extractYear = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isNaN(date.getFullYear()) ? 'N/A' : date.getFullYear().toString();
};

const MediaDetailModal = ({ item, isOpen, onClose, currentUser }) => {
  const [hasReviews, setHasReviews] = useState(false); // State to track if reviews exist

  // Callback for ReviewsSection
  const handleReviewsLoaded = useCallback((reviewsExist) => {
    setHasReviews(reviewsExist);
  }, []);

  // Reset hasReviews when the modal item changes or closes
  useEffect(() => { // Use useEffect directly
    if (!isOpen || !item) {
      setHasReviews(false);
    }
  }, [isOpen, item]);


  if (!item) return null; // Don't render if no item is selected

  const {
    id, title, name, poster_path, backdrop_path, overview, vote_average,
    release_date, first_air_date, media_type
  } = item;

  const displayTitle = title || name || 'Untitled';
  const year = extractYear(release_date || first_air_date);
  const rating = vote_average ? Math.round(vote_average * 10) / 10 : 'N/A';
  const posterUrl = poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : '/placeholder.png';
  const backdropUrl = backdrop_path ? `https://image.tmdb.org/t/p/w1280${backdrop_path}` : null;
  const mediaId = id?.toString(); // Ensure mediaId is a string for ReviewsSection

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onMouseDown={onClose} // Close on backdrop click
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative border border-gray-700"
            onMouseDown={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            {/* Header with Backdrop */}
            <div className="relative h-48 sm:h-64 flex-shrink-0">
              {backdropUrl ? (
                <img src={backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-700 opacity-50"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 text-gray-300 hover:bg-black/70 hover:text-white transition-colors"
                aria-label="Close details"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 pt-0 -mt-20 sm:-mt-24 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-6">
                {/* Poster */}
                <div className="flex-shrink-0 w-32 sm:w-40 h-auto rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
                  <img src={posterUrl} alt={`Poster for ${displayTitle}`} className="w-full h-full object-cover" />
                </div>
                {/* Title and Meta */}
                <div className="flex-grow min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 line-clamp-2" title={displayTitle}>
                    {displayTitle}
                  </h2>
                  <div className="flex items-center space-x-4 text-gray-400 text-sm">
                    <span className="flex items-center">
                      <StarIcon className="w-4 h-4 text-yellow-400 mr-1" /> {rating}
                    </span>
                    <span className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" /> {year}
                    </span>
                    <span className="capitalize bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-300">
                      {media_type || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Overview */}
              {overview && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{overview}</p>
                </div>
              )}

              {/* Ad Unit - Placed within the modal content */}
              {/* Condition: Only show if modal is open AND reviews exist */}
              {isOpen && hasReviews && (
                <div className="my-6"> {/* Add some margin */}
                  <AdUnit
                    className="w-full rounded-lg overflow-hidden"
                    // Optional: Add specific ad slot ID if needed for modal context
                    // adSlot="YOUR_MODAL_AD_SLOT_ID"
                  />
                </div>
              )}

              {/* Reviews Section */}
              {mediaId && (
                <ReviewsSection
                  mediaId={mediaId}
                  currentUser={currentUser}
                  onReviewsLoaded={handleReviewsLoaded} // Pass the callback
                />
              )}

              {/* Placeholder for other details (Cast, Crew, etc.) */}
              {/* <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2">More Details</h3>
                <p className="text-gray-400 text-sm">Cast, crew, and other information could go here.</p>
              </div> */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaDetailModal;