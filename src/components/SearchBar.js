import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { MediaCard } from './MediaCard'; // Ensure this is properly imported

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

  // Add ref to track if initial URL search is being performed
  const isInitialUrlSearch = useRef(false);
  
  // Function to handle search with URL update
  const handleSearchWithUrlUpdate = (e) => {
    e?.preventDefault();
    handleSearch(e);
    
    // Update URL after search but not for initial URL-triggered search
    if (!isInitialUrlSearch.current) {
      setTimeout(() => {
        const searchParams = new URLSearchParams();
        if (query) searchParams.set('q', query);
        if (activeFilters.searchMode !== 'smart') searchParams.set('mode', activeFilters.searchMode);
        if (activeFilters.genre !== 'diverse') searchParams.set('genre', activeFilters.genre);
        if (activeFilters.time !== 'any') searchParams.set('time', activeFilters.time);
        if (activeFilters.type !== 'all') searchParams.set('type', activeFilters.type);
        if (activeFilters.releaseYear !== 'any') searchParams.set('year', activeFilters.releaseYear);
        if (activeFilters.popularity !== 'any') searchParams.set('pop', activeFilters.popularity);
        if (activeFilters.contentType !== 'any') searchParams.set('content', activeFilters.contentType);
        
        const newURL = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({ path: newURL }, '', newURL);
      }, 100);
    } else {
      isInitialUrlSearch.current = false;
    }
  };
  
  // Function to handle result click with redirect
  const handleResultClickWithRedirect = (item) => {
    handleResultClick(item);
    // Short delay before redirect
    setTimeout(() => window.location.href = '/', 100);
  };
  
  // Read URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('q');
    
    if (urlQuery) {
      isInitialUrlSearch.current = true;
      
      // Set query from URL
      setQuery(urlQuery);
      
      // Set filters from URL
      const newFilters = { ...activeFilters };
      
      const mode = urlParams.get('mode');
      if (mode === 'direct') newFilters.searchMode = mode;
      
      const genre = urlParams.get('genre');
      if (genre) newFilters.genre = genre;
      
      const time = urlParams.get('time');
      if (time) newFilters.time = time;
      
      const type = urlParams.get('type');
      if (type) newFilters.type = type;
      
      const year = urlParams.get('year');
      if (year) newFilters.releaseYear = year;
      
      const pop = urlParams.get('pop');
      if (pop) newFilters.popularity = pop;
      
      const content = urlParams.get('content');
      if (content) newFilters.contentType = content;
      
      setActiveFilters(newFilters);
      
      // Trigger search
      setTimeout(() => handleSearch(), 100);
    }
  }, []);

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

  // Updated pagination controls for mobile
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center my-4 sm:my-6">
        <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 rounded-l-md border 
              ${currentPage === 1 
                ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            <span className="sr-only sm:not-sr-only">Previous</span>
            <span className="sm:hidden">&laquo;</span>
          </button>
          
          {/* Page numbers - simplified for mobile */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
            // On mobile, only show current page, first, last, and adjacent pages
            const isMobile = window.innerWidth < 640;
            const showOnMobile = 
              pageNum === 1 || 
              pageNum === totalPages || 
              Math.abs(pageNum - currentPage) <= 1;
            
            if (isMobile && !showOnMobile) {
              // Show ellipsis for skipped pages on mobile
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return (
                  <span key={`ellipsis-${pageNum}`} className="relative inline-flex items-center px-3 py-2 border border-gray-600 bg-gray-700 text-gray-400">
                    ...
                  </span>
                );
              }
              return null;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`relative inline-flex items-center px-3 py-1 sm:py-2 border
                  ${pageNum === currentPage
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 rounded-r-md border 
              ${currentPage === totalPages
                ? 'border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            <span className="sr-only sm:not-sr-only">Next</span>
            <span className="sm:hidden">&raquo;</span>
          </button>
        </nav>
      </div>
    );
  };

  // Add debugging effect
  useEffect(() => {
    console.log("Current search results:", filteredResults);
    console.log("Search error state:", error);
    
    // Debug MediaCard import
    console.log("MediaCard component available:", typeof MediaCard);
  }, [filteredResults, error]);

  // Create error boundary component
  const ErrorFallback = () => (
    <div className="w-full p-4 bg-red-100 border border-red-300 rounded-lg my-4 text-center">
      <h3 className="text-red-700 font-medium">Something went wrong with the search results</h3>
      <p className="text-red-600 mt-2">Please try refreshing the page or try another search term.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Refresh Page
      </button>
    </div>
  );

  // Render section with error protection
  const renderResultsSection = () => {
    try {
      if (error) {
        return <ErrorFallback />;
      }
      
      // Rest of your render code with all the sections
      return (
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
                    onClick={() => handleResultClickWithRedirect(item)}
                    promptLogin={() => {}}
                    highlightMatch={true}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Direct Search Results */}
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
                    onClick={() => handleResultClickWithRedirect(item)}
                    promptLogin={() => {}}
                  />
                ))}
              </div>
              <PaginationControls />
            </div>
          )}

          {!isDirectSearch && (
            <>
              {/* Similar To Section - ENHANCED */}
              {queryIntent?.referenceName && hasSearched && (
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
                  
                  {/* Show no results message when we have a reference but no similar results */}
                  {groupedResults.similarTo?.length === 0 ? (
                    <div className="bg-gray-800/80 rounded-lg p-6 text-center">
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">No Similar Titles Found</h3>
                      <p className="text-gray-300 mb-4">
                        We couldn't find shows similar to "{queryIntent.referenceName}". This might be because:
                      </p>
                      <ul className="text-gray-400 list-disc list-inside text-left max-w-xl mx-auto mb-4">
                        <li>The title is new or not yet cataloged with similar shows</li>
                        <li>It may be a very unique show with few similar titles</li>
                        <li>The title could be from a niche category</li>
                      </ul>
                      <p className="text-gray-300">
                        Try searching for a broader category like "{queryIntent.referenceName?.split(' ')[0]} anime" or "anime action"
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedResults.similarTo.map(item => (
                        <MediaCard
                          key={`similar-${item.id}-${item.media_type}`}
                          result={item}
                          currentUser={currentUser}
                          onClick={() => handleResultClickWithRedirect(item)}
                          promptLogin={() => {}}
                          highlightMatch={item.isReferenceMedia}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Main Results Section with pagination */}
              {groupedResults.main && groupedResults.main.length > 0 && (
                <div className="w-full max-w-7xl mb-8">
                  <MediaResults
                    hasSearched={hasSearched}
                    isLoading={isLoading}
                    displayedResults={currentResults}
                    handleResultClick={handleResultClickWithRedirect}
                    currentUser={currentUser}
                  />
                  <PaginationControls />
                </div>
              )}
            </>
          )}
        </div>
      );
    } catch (err) {
      console.error("Error rendering search results:", err);
      return <ErrorFallback />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 relative flex flex-col items-center justify-start pt-16 md:pt-24 pb-20">
      {/* Search Input - Moved to top */}
      <div className="w-full max-w-2xl mb-4">
        <SearchInput
          query={query}
          setQuery={setQuery}
          handleSearch={handleSearchWithUrlUpdate} // Updated to use URL updater
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
          className="w-full max-w-4xl mb-4 p-2 sm:p-3 rounded-lg bg-blue-900/30 border border-blue-800 text-blue-200 flex items-center"
        >
          <DocumentDuplicateIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium truncate">
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
          className="w-full max-w-4xl mb-4 p-2 sm:p-3 rounded-lg bg-indigo-900/30 border border-indigo-800 text-indigo-200 flex items-center"
        >
          <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-indigo-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium truncate">{intentSummary}</p>
        </motion.div>
      )}

      {/* Filters Toggle and Section */}
      {(hasSearched || isDirectSearch) && (
        <div className="w-full max-w-4xl mb-4 space-y-2">
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all ${
              showFilters 
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'bg-white/90 text-indigo-500 hover:bg-indigo-50 backdrop-blur-sm'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showFilters ? (
              <FunnelSolidIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="font-semibold text-xs sm:text-sm">
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

      {/* Render Results with Error Boundary */}
      {renderResultsSection()}
    </div>
  );
};

export default SearchBar;