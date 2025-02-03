import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiltersSection } from './FiltersSection';
import { SearchInput } from './SearchInput';
import { MediaResults } from './MediaResults';
import { ErrorMessage } from './ErrorMessage';
import { LoadMoreButton } from './LoadMoreButton';
import { useSearch } from './useSearch';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/react/24/solid';

export const SearchBar = () => {
  const [showFilters, setShowFilters] = useState(false);
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

  return (
    <div className="w-full h-screen max-w-7xl mx-auto px-4 relative flex flex-col items-center justify-start pt-16 md:pt-24">
      {/* Filters Toggle Button */}
      {hasSearched && (
        <motion.button
          onClick={() => setShowFilters(!showFilters)}
          className={`mb-4 flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
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
      )}

      {/* Filters Section */}
      {hasSearched && showFilters && (
        <FiltersSection
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
        />
      )}

      {/* Search Input */}
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

      {/* Error Messages */}
      <ErrorMessage error={error} isVisible={isErrorVisible} />

      {/* Results Grid */}
      <MediaResults
        hasSearched={hasSearched}
        isLoading={isLoading}
        displayedResults={displayedResults}
        handleResultClick={handleResultClick}
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