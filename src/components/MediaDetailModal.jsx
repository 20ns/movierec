// src/components/MediaDetailModal.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { XMarkIcon, StarIcon, CalendarIcon } from '@heroicons/react/24/solid';
import ReviewsSection from './ReviewsSection'; 
import AdUnit from './AdUnit';

// Helper to extract year
const extractYear = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isNaN(date.getFullYear()) ? 'N/A' : date.getFullYear().toString();
};

const MediaDetailModal = ({ item, isOpen, onClose, currentUser }) => {
  const [hasReviews, setHasReviews] = useState(false); 

  // Callback for ReviewsSection
  const handleReviewsLoaded = useCallback((reviewsExist) => {
    setHasReviews(reviewsExist);
  }, []);

  // Reset hasReviews when the modal item changes or closes
  useEffect(() => {
    if (!isOpen || !item) {
      setHasReviews(false);
    }
  }, [isOpen, item]);


  if (!item) return null; 

  const {
    id, title, name, poster_path, backdrop_path, overview, vote_average,
    release_date, first_air_date, media_type,
    curator_notes /* New field for curated content */
  } = item;

  const displayTitle = title || name || 'Untitled';
  const year = extractYear(release_date || first_air_date);
  const rating = vote_average ? Math.round(vote_average * 10) / 10 : 'N/A';
  const posterUrl = poster_path ? `https://image.tmdb.org/t/p/w300${poster_path}` : null;
  const backdropUrl = backdrop_path ? `https://image.tmdb.org/t/p/w1280${backdrop_path}` : null;
  const mediaId = id?.toString();

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
            onMouseDown={(e) => e.stopPropagation()} 
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
                <div className="flex-shrink-0 w-32 sm:w-40 h-48 sm:h-60 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
                  {posterUrl ? (
                    <img 
                      src={posterUrl} 
                      alt={`Poster for ${displayTitle}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-full h-full bg-gray-800 flex items-center justify-center"
                    style={{ display: posterUrl ? 'none' : 'flex' }}
                  >
                    <div className="text-center text-gray-400">
                      <div className="text-3xl mb-2">🎬</div>
                      <div className="text-xs font-medium">No Image</div>
                    </div>
                  </div>
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

              {/* Curator's Notes/Why We Recommend It Section */}
              {curator_notes && (
                <div className="my-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/70">
                  <h3 className="text-lg font-semibold text-indigo-300 mb-2">Curator's Notes</h3>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{curator_notes}</p>
                </div>
              )}


              {isOpen && hasReviews && (
                <div className="my-6"> {/* Add some margin */}
                  <AdUnit
                    className="w-full rounded-lg overflow-hidden"

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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaDetailModal;