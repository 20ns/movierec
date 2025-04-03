import React from 'react';
import { motion } from 'framer-motion';
import { MediaCard } from './MediaCard'; // Ensure this import exists
import ScrollContainer from './ScrollContainer'; // Import the new component

export const MediaResults = ({
  hasSearched,
  isLoading,
  displayedResults,
  handleResultClick,
  currentUser
}) => {
  // Add error boundary
  const renderSafeResults = () => {
    try {
      return displayedResults.map((result) => (
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
      ));
    } catch (error) {
      console.error("Error rendering media results:", error);
      return (
        <div className="col-span-full p-4 bg-red-100 text-red-800 rounded-lg">
          <p>Error displaying results. Please try refreshing the page.</p>
        </div>
      );
    }
  };

  // Change from a standard div to the ScrollContainer for search results
  return (
    <div className="search-results-container w-full">
      {!hasSearched ? (
        <div className="text-center py-8 text-gray-400">
          Search for movies or TV shows to see results
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : displayedResults.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No results found. Try a different search.
        </div>
      ) : (
        <ScrollContainer 
          maxHeight="80vh" 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4"
          showShadows={true}
        >
          {renderSafeResults()}
        </ScrollContainer>
      )}
    </div>
  );
};

export default MediaResults;