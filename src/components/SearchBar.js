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
import { LightBulbIcon, SparklesIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid';
import { formatQueryIntentSummary } from './SearchBarUtils';
import { MediaCard } from './MediaCard'; // Add this import

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
    handleResultClick,
    resultsToShow,
    setResultsToShow
  } = useSearch();

  // For pagination instead of "load more"
  const [currentPage, setCurrentPage] = useState(1);
  const RESULTS_PER_PAGE = 9; // Number of results per page

  // Calculate total pages
  const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);

  // Get current page items
  const currentResults = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return filteredResults.slice(start, start + RESULTS_PER_PAGE);
  }, [filteredResults, currentPage]);

  // Page change handler
  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    // Scroll back to top of results
    document.querySelector('.search-results-container')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Extract query intent from results
  const queryIntent = useMemo(() => {
    if (!displayedResults.length) return null;
    return displayedResults[0].queryIntent;
  }, [displayedResults]);

  // Format query intent for display
  const intentSummary = useMemo(() => {
    return formatQueryIntentSummary(queryIntent);
  }, [queryIntent]);

  // Check if this is a direct search
  const isDirectSearch = activeFilters.searchMode === 'direct';

  // Separate exact title matches from other results
  const exactMatches = useMemo(() => {
    if (!query || !displayedResults.length) return [];
    
    const queryLower = query.toLowerCase();
    return displayedResults.filter(item => 
      (item.title && item.title.toLowerCase() === queryLower) ||
      (item.name && item.name.toLowerCase() === queryLower)
    );
  }, [displayedResults, query]);

  // Group results by detected intent
  const groupedResults = useMemo(() => {
    // For direct search, don't group
    if (isDirectSearch) return { main: displayedResults };
    
    if (!queryIntent || !displayedResults.length) return { main: displayedResults };
    
    // Filter out exact matches since they'll be displayed separately
    const otherResults = displayedResults.filter(
      item => !exactMatches.some(match => match.id === item.id)
    );
    
    // For similarity searches
    if (queryIntent.referenceName) {
      return { similarTo: otherResults };
    }
    
    // For mood-based searches
    if (queryIntent.mood) {
      return { moodBased: otherResults };
    }
    
    // For contextual searches
    if (queryIntent.context) {
      return { contextBased: otherResults };
    }
    
    // For subject searches
    if (queryIntent.subjects && queryIntent.subjects.length > 0) {
      return { subjectBased: otherResults };
    }
    
    // Default grouping
    return { main: otherResults };
  }, [displayedResults, queryIntent, exactMatches, isDirectSearch]);

  // Pagination UI
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center my-6">
        <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-3 py-2 rounded-l-md border 
              ${currentPage === 1 
                ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`relative inline-flex items-center px-4 py-2 border
                ${pageNum === currentPage
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
            >
              {pageNum}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-3 py-2 rounded-r-md border 
              ${currentPage === totalPages
                ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Next
          </button>
        </nav>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 relative flex flex-col items-center justify-start pt-16 md:pt-24 pb-20">
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
          searchMode={activeFilters.searchMode} // Pass search mode
        />
      </div>

      {/* Direct Search Indicator */}
      {isDirectSearch && hasSearched && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mb-4 p-3 rounded-lg bg-blue-900/30 border border-blue-800 text-blue-200 flex items-center"
        >
          <DocumentDuplicateIcon className="h-5 w-5 mr-2 text-blue-400" />
          <p className="text-sm font-medium">
            Direct Title Search: {query}
            {filteredResults.length > 0 && ` (${filteredResults.length} results found)`}
          </p>
        </motion.div>
      )}

      {/* Search Intent Display */}
      {intentSummary && hasSearched && !isLoading && !isDirectSearch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mb-4 p-3 rounded-lg bg-indigo-900/30 border border-indigo-800 text-indigo-200 flex items-center"
        >
          <SparklesIcon className="h-5 w-5 mr-2 text-indigo-400" />
          <p className="text-sm font-medium">{intentSummary}</p>
        </motion.div>
      )}

      {/* Filters Toggle and Section */}
      {(hasSearched || isDirectSearch) && (
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

      <div className="search-results-container w-full">
        {/* Exact Match Section */}
        {exactMatches.length > 0 && hasSearched && (
          <div className="w-full max-w-7xl mb-8">
            <div className="py-2 px-3 bg-indigo-900/20 rounded-lg border border-indigo-800 mb-3 flex items-center">
              <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-2" />
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

        {/* Direct Search Results - New section for direct searches */}
        {isDirectSearch && filteredResults.length > 0 && (
          <div className="w-full max-w-7xl mb-8">
            <div className="py-2 px-3 bg-blue-900/20 rounded-lg border border-blue-800 mb-3 flex items-center">
              <DocumentDuplicateIcon className="h-4 w-4 text-blue-400 mr-2" />
              <h3 className="text-sm font-medium text-blue-300">Title Search Results</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentResults.map(item => (
                <MediaCard
                  key={`direct-${item.id}-${item.media_type}`}
                  result={item}
                  currentUser={currentUser}
                  onClick={handleResultClick}
                  promptLogin={() => {}}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            <PaginationControls />
          </div>
        )}

        {!isDirectSearch && (
          <>
            {/* Similar To Section */}
            {groupedResults.similarTo && groupedResults.similarTo.length > 0 && (
              <div className="w-full max-w-7xl mb-8">
                <div className="py-2 px-3 bg-purple-900/20 rounded-lg border border-purple-800 mb-3 flex items-center">
                  <LightBulbIcon className="h-4 w-4 text-purple-400 mr-2" />
                  <h3 className="text-sm font-medium text-purple-300">
                    {`Similar to "${queryIntent.referenceName}"`}
                    {queryIntent.modifierType && (
                      <span className="ml-2 text-purple-400">
                        {queryIntent.modifierType === 'family-friendly' && 'but more family-friendly'}
                        {queryIntent.modifierType === 'darker' && 'but with a darker tone'}
                        {queryIntent.modifierType === 'lighter' && 'but lighter'}
                        {queryIntent.modifierType === 'scarier' && 'but scarier'}
                        {queryIntent.modifierType === 'more-action' && 'but with more action'}
                        {queryIntent.modifierType === 'funnier' && 'but funnier'}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedResults.similarTo.map(item => (
                    <MediaCard
                      key={`similar-${item.id}-${item.media_type}`}
                      result={item}
                      currentUser={currentUser}
                      onClick={handleResultClick}
                      promptLogin={() => {}}
                      highlightMatch={item.isReferenceMedia}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other sectioned results - Mood, Context, etc. */}
            {/* ...existing code for these sections... */}

            {/* Main Results Section with pagination */}
            {groupedResults.main && groupedResults.main.length > 0 && (
              <div className="w-full max-w-7xl mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentResults.map(item => (
                    <MediaCard
                      key={`main-${item.id}-${item.media_type}`}
                      result={item}
                      currentUser={currentUser}
                      onClick={handleResultClick}
                      promptLogin={() => {}}
                    />
                  ))}
                </div>
                
                {/* Pagination Controls */}
                <PaginationControls />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchBar;