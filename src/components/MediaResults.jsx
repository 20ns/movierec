import React from 'react';
import { motion } from 'framer-motion';
import { MediaCard } from './MediaCard'; // Ensure this import exists

export const MediaResults = ({
  hasSearched,
  isLoading,
  displayedResults,
  handleResultClick,
  currentUser
}) => {
  if (isLoading) {
    return (
      <div className="w-full flex-grow flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xl font-medium text-gray-300">Searching...</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="w-full flex-grow flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-gray-300 mb-2">Search for movies and TV shows</h2>
        <p className="text-gray-400 max-w-lg">
          Use the search bar above to discover content based on titles, genres, moods, or contexts.
        </p>
      </div>
    );
  }

  if (displayedResults.length === 0) {
    return (
      <div className="w-full flex-grow flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-xl font-bold text-gray-300 mb-2">No results found</h2>
        <p className="text-gray-400 max-w-lg">
          Try adjusting your search terms or filters to find more content.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {displayedResults.map((result) => (
        <motion.div
          key={`${result.id}-${result.media_type}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MediaCard
            result={result}
            currentUser={currentUser}
            onClick={() => handleResultClick(result)}
            promptLogin={() => {}}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MediaResults;