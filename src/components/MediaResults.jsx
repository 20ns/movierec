import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import { MediaCard } from './MediaCard';
import { FaceFrownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const MediaResults = ({ hasSearched, isLoading, displayedResults }) => (
  <div className="relative w-full mt-8" style={{ zIndex: 40 }}>
    <AnimatePresence mode='wait'>
      {hasSearched ? (
        <ResultsGrid 
          isLoading={isLoading} 
          displayedResults={displayedResults}
          hasSearched={hasSearched}
        />
      ) : (
        <EmptyState />
      )}
    </AnimatePresence>
  </div>
);

const ResultsGrid = ({ isLoading, displayedResults, hasSearched }) => {
  if (isLoading) {
    return <LoadingSkeletons />;
  }

  if (displayedResults.length === 0 && hasSearched) {
    return <NoResults />;
  }

  return (
    <motion.div
      key="results"
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 pb-4"
    >
      {displayedResults.map((result) => (
        <MediaCard key={result.id} result={result} />
      ))}
    </motion.div>
  );
};

const NoResults = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="text-center py-8 flex-grow flex items-center justify-center"
  >
    <div className="max-w-md">
      <FaceFrownIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-2xl font-semibold text-gray-600 mb-2">
        No Matching Results
      </h3>
      <p className="text-gray-500">
        We couldn't find any movies or shows matching your search. Try different keywords or adjust your filters.
      </p>
      <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
        <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
        <span>Pro tip: Search for genres like "comedy" or "sci-fi"</span>
      </div>
    </div>
  </motion.div>
);

const LoadingSkeletons = () => (
  Array(3).fill(0).map((_, index) => (
    <motion.div
      key={`skeleton-${index}`}
      className="bg-white rounded-2xl overflow-hidden shadow-lg p-3 hover:shadow-xl transition-shadow duration-300 h-full"
    >
      <Skeleton height="200px" className="rounded-xl" />
      <Skeleton height={24} width={160} className="mt-3" />
      <Skeleton count={2} className="mt-1" />
      <div className="mt-2 flex justify-between">
        <Skeleton width={50} height={20} />
        <Skeleton width={70} height={20} />
        <Skeleton width={50} height={20} />
      </div>
    </motion.div>
  ))
);

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="text-center py-8 flex-grow flex items-center justify-center"
  >
    <div className="max-w-md">
      <div className="text-indigo-400/50 text-6xl mb-4">🎬</div>
      <h3 className="text-2xl font-semibold text-gray-500 mb-2">
        Search for Movies & TV Shows
      </h3>
      <p className="text-gray-400">
        Enter a title and press search to discover your next favorite movie or TV show
      </p>
    </div>
  </motion.div>
);