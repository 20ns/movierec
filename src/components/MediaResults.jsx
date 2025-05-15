import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaCard from './MediaCard';
import ScrollContainer from './ScrollContainer';

// Custom hook to replace react-intersection-observer
const useIsVisible = (rootMargin = '0px') => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [rootMargin]);

  return [ref, isVisible];
};

// Optimized result item component with lazy loading
const ResultItem = React.memo(({ result, currentUser, handleResultClick }) => {
  const [ref, isVisible] = useIsVisible('200px');
  const [hasRendered, setHasRendered] = useState(false);
  
  // Once visible, we keep the card rendered
  useEffect(() => {
    if (isVisible && !hasRendered) {
      setHasRendered(true);
    }
  }, [isVisible, hasRendered]);

  return (
    <motion.div
      ref={ref}
      key={`${result.id}-${result.media_type}`}
      initial={{ opacity: 0, y: 20 }}
      animate={(isVisible || hasRendered) ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="h-full"
      layout
    >
      {(isVisible || hasRendered) && (
        <MediaCard
          result={result}
          currentUser={currentUser}
          onClick={() => handleResultClick(result)}
          promptLogin={() => {}}
        />
      )}
    </motion.div>
  );
});

// Main component optimized with React.memo
export const MediaResults = React.memo(({
  hasSearched,
  isLoading,
  displayedResults,
  handleResultClick,
  currentUser
}) => {
  // Memoize the result rendering function to prevent unnecessary recalculations
  const renderSafeResults = useCallback(() => {
    try {
      return displayedResults.map((result) => (
        <ResultItem 
          key={`${result.id}-${result.media_type}`}
          result={result}
          currentUser={currentUser}
          handleResultClick={handleResultClick}
        />
      ));
    } catch (error) {
      console.error("Error rendering media results:", error);
      return (
        <div className="col-span-full p-4 bg-red-100 text-red-800 rounded-lg">
          <p>Error displaying results. Please try refreshing the page.</p>
        </div>
      );
    }
  }, [displayedResults, currentUser, handleResultClick]);

  // Memoize the content based on current state
  const content = useMemo(() => {
    if (!hasSearched) {
      return (
        <motion.div 
          className="text-center py-8 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Search for movies or TV shows to see results
        </motion.div>
      );
    }
    
    if (isLoading) {
      return (
        <motion.div 
          className="flex justify-center items-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </motion.div>
      );
    }
    
    if (displayedResults.length === 0) {
      return (
        <motion.div 
          className="text-center py-8 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          No results found. Try a different search.
        </motion.div>
      );
    }
    
    return (
      <ScrollContainer key={displayedResults.map(r => r.id).join('-')} className="overflow-x-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 py-4 px-2 md:px-0 w-full">
          {renderSafeResults()}
        </div>
      </ScrollContainer>
    );
  }, [hasSearched, isLoading, displayedResults, renderSafeResults]);

  return (
    <div className="search-results-container w-full">
      <AnimatePresence mode="wait">
        {content}
      </AnimatePresence>
    </div>
  );
});

export default MediaResults;