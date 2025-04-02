import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiltersSection } from './FiltersSection';
import { SearchInput } from './SearchInput';
import { MediaResults } from './MediaResults';
import { ErrorMessage } from './ErrorMessage';
import { LoadMoreButton } from './LoadMoreButton';
import { useSearch } from './useSearch';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/react/24/solid';

export const SearchBar = ({ currentUser }) => {
  const [showFilters, setShowFilters] = useState(true);
  const {
    query,
    setQuery,
    activeFilters,
    setActiveFilters,
    hasSearched,
    isLoading,
    displayedResults,
    filteredResults,
    error,
    isErrorVisible,
    isFocused,
    setIsFocused,
    suggestions,
    handleSearch,
    handleShowMore,
    handleSuggestionClick,
    handleSuggestionHover,
    handleResultClick
  } = useSearch();

  // Separate exact title matches from other results
  const exactMatches = useMemo(() => {
    if (!query || !displayedResults.length) return [];
    
    const queryLower = query.toLowerCase();
    return displayedResults.filter(item => 
      (item.title && item.title.toLowerCase() === queryLower) ||
      (item.name && item.name.toLowerCase() === queryLower)
    );
  }, [displayedResults, query]);

  return (
    <div className="w-full h-screen max-w-7xl mx-auto px-4 relative flex flex-col items-center justify-start pt-16 md:pt-24">
      {/* Search Input - Moved to top */}
      <div className="w-full max-w-2xl mb-4">
        <SearchInput
          query={query}
          setQuery={setQuery}
          handleSearch={handleSearch}
          isLoading={isLoading}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          suggestions={suggestions}
          handleSuggestionClick={handleSuggestionClick}
          handleSuggestionHover={handleSuggestionHover}
        />
      </div>

      {/* Filters Toggle and Section - Positioned below search */}
      {hasSearched && (
        <div className="w-full max-w-4xl mb-4 space-y-2">
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
              showFilters 
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'bg-white/90 text-indigo-500 hover:bg-indigo-50 backdrop-blur-sm'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showFilters ? (
              <FunnelSolidIcon className="w-5 h-5" />
            ) : (
              <FunnelIcon className="w-5 h-5" />
            )}
            <span className="font-semibold text-sm">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </span>
          </motion.button>

          {showFilters && (
            <FiltersSection
              activeFilters={activeFilters}
              setActiveFilters={setActiveFilters}
            />
          )}
        </div>
      )}

      {/* Error Messages */}
      <ErrorMessage error={error} isVisible={isErrorVisible} />

      {/* Exact Match Section - New */}
      {exactMatches.length > 0 && hasSearched && (
        <div className="w-full max-w-7xl mb-8">
          <div className="py-2 px-3 bg-indigo-900/20 rounded-lg border border-indigo-800 mb-3">
            <h3 className="text-sm font-medium text-indigo-300">Exact Match Found</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {exactMatches.map(item => (
              <MediaCard
                key={`exact-${item.id}-${item.media_type}`}
                result={item}
                currentUser={currentUser}
                onClick={handleResultClick}
                promptLogin={() => {}}
                highlightMatch={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      <MediaResults
        hasSearched={hasSearched}
        isLoading={isLoading}
        displayedResults={displayedResults.filter(item => !exactMatches.some(match => match.id === item.id))}
        handleResultClick={handleResultClick}
        currentUser={currentUser}
      />

      {/* Load More Button */}
      <LoadMoreButton
        show={hasSearched && displayedResults.length < filteredResults.length}
        onClick={handleShowMore}
      />
    </div>
  );
};
export default SearchBar;