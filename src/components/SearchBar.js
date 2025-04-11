import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiltersSection } from './FiltersSection';
import { SearchInput } from './SearchInput';
import { MediaResults } from './MediaResults';
import { ErrorMessage } from './ErrorMessage';
import { useSearch } from './useSearch';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/react/24/solid';
import { 
  LightBulbIcon, 
  SparklesIcon, 
  DocumentDuplicateIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import { formatQueryIntentSummary } from './SearchBarUtils';
import { MediaCard } from './MediaCard';

export const SearchBar = ({ currentUser }) => {
  // State management
  const [showFilters, setShowFilters] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchContainerRef = useRef(null);
  
  // Search functionality from custom hook
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
    
    // Auto-expand search interface when search is performed
    setIsExpanded(true);
    
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
      setIsExpanded(true); // Expand search interface if URL has query
      
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

  // Scroll tracking for showing the back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
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

  // Updated pagination controls with improved design
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center my-4 sm:my-6">
        <nav className="inline-flex rounded-md shadow-lg -space-x-px" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-l-md border 
              ${currentPage === 1 
                ? 'border-gray-700 bg-gray-800/70 text-gray-500 cursor-not-allowed' 
                : 'border-gray-600 bg-gray-700/80 text-gray-300 hover:bg-indigo-600/70 hover:text-white transition-all'
              }`}
          >
            <span className="sr-only sm:not-sr-only">Previous</span>
            <span className="sm:hidden">&laquo;</span>
          </button>
          
          {/* Page numbers with animation */}
          <div className="flex overflow-hidden">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
              // On narrow screens, only show current page, first, last, and adjacent pages
              const isNarrowScreen = window.innerWidth < 480;
              const showOnNarrow = 
                pageNum === 1 || 
                pageNum === totalPages || 
                Math.abs(pageNum - currentPage) <= 1;
              
              if (isNarrowScreen && !showOnNarrow) {
                // Show ellipsis for skipped pages on narrow screens
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return (
                    <span key={`ellipsis-${pageNum}`} className="relative inline-flex items-center px-3 py-2 border border-gray-600 bg-gray-700/80 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              }
              
              return (
                <motion.button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`relative inline-flex items-center px-3 py-1.5 sm:py-2.5 border
                    ${pageNum === currentPage
                      ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-md shadow-indigo-500/30'
                      : 'bg-gray-700/80 text-gray-300 border-gray-600 hover:bg-indigo-500/70 hover:text-white transition-all'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {pageNum}
                </motion.button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-r-md border 
              ${currentPage === totalPages
                ? 'border-gray-700 bg-gray-800/70 text-gray-500 cursor-not-allowed'
                : 'border-gray-600 bg-gray-700/80 text-gray-300 hover:bg-indigo-600/70 hover:text-white transition-all'
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
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 bg-red-900/30 border border-red-700/50 backdrop-blur-md rounded-xl my-4 text-center"
    >
      <h3 className="text-red-300 font-medium">Something went wrong with the search results</h3>
      <p className="text-red-200/80 mt-2">Please try refreshing the page or try another search term.</p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => window.location.reload()}
        className="mt-3 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg shadow-lg transition-all"
      >
        Refresh Page
      </motion.button>
    </motion.div>
  );

  // Render section with error protection
  const renderResultsSection = () => {
    try {
      if (error) {
        return <ErrorFallback />;
      }
        // If no search performed yet, show empty state
      if (!hasSearched && !isLoading) {
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-2xl mx-auto text-center p-8 mt-4"
          >
            <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-indigo-400/50" />
            <h3 className="mt-4 text-xl font-medium text-gray-300">Search for movies and shows</h3>
            <p className="mt-2 text-gray-400">
              Try searching for a title, a mood, or even "movies like [title]"
            </p>
          </motion.div>
        );
      }
      
      // Display loader when loading
      if (isLoading) {
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl mb-8 p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800/40 backdrop-blur-sm rounded-xl h-72 animate-pulse"></div>
              ))}
            </div>
          </motion.div>
        );
      }
      
      // Rest of your render code with all the sections
      return (
        <div className="search-results-container w-full max-h-[80vh] overflow-y-scroll">
          {/* Exact Match Section */}
          {exactMatches.length > 0 && hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-7xl mb-8"
            >
              <div className="py-2 px-3 bg-indigo-900/30 backdrop-blur-sm rounded-xl border border-indigo-700/50 mb-3 flex items-center">
                <LightBulbIcon className="h-4 w-4 text-yellow-400 mr-2" />
                <h3 className="text-sm font-medium text-indigo-300">Exact Match Found</h3>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exactMatches.map(item => (
                  <motion.div
                    key={`exact-${item.id}-${item.media_type}`}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <MediaCard
                      result={item}
                      currentUser={currentUser}
                      onClick={() => handleResultClickWithRedirect(item)}
                      promptLogin={() => {}}
                      highlightMatch={true}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Direct Search Results */}
          {isDirectSearch && filteredResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-full max-w-7xl mb-8"
            >
              <div className="py-2 px-3 bg-blue-900/30 backdrop-blur-sm rounded-xl border border-blue-700/50 mb-3 flex items-center">
                <DocumentDuplicateIcon className="h-4 w-4 text-blue-400 mr-2" />
                <h3 className="text-sm font-medium text-blue-300">Title Search Results</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentResults.map(item => (
                  <motion.div
                    key={`direct-${item.id}-${item.media_type}`}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <MediaCard
                      result={item}
                      currentUser={currentUser}
                      onClick={() => handleResultClickWithRedirect(item)}
                      promptLogin={() => {}}
                    />
                  </motion.div>
                ))}
              </div>
              <PaginationControls />
            </motion.div>
          )}

          {!isDirectSearch && (
            <>
              {/* Similar To Section - ENHANCED */}
              {queryIntent?.referenceName && hasSearched && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="w-full max-w-7xl mb-8"
                >
                  <div className="py-2 px-3 bg-purple-900/30 backdrop-blur-sm rounded-xl border border-purple-700/50 mb-3 flex items-center">
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
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700/50"
                    >
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
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedResults.similarTo.map(item => (
                        <motion.div
                          key={`similar-${item.id}-${item.media_type}`}
                          whileHover={{ scale: 1.03 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <MediaCard
                            result={item}
                            currentUser={currentUser}
                            onClick={() => handleResultClickWithRedirect(item)}
                            promptLogin={() => {}}
                            highlightMatch={item.isReferenceMedia}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Main Results Section with pagination */}
              {groupedResults.main && groupedResults.main.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="w-full max-w-7xl mb-8"
                >
                  <MediaResults
                    hasSearched={hasSearched}
                    isLoading={isLoading}
                    displayedResults={currentResults}
                    handleResultClick={handleResultClickWithRedirect}
                    currentUser={currentUser}
                  />
                  <PaginationControls />
                </motion.div>
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
  // Main floating search bar design
  return (
    <div 
      ref={searchContainerRef}
      className="w-full max-w-screen-2xl mx-auto px-3 sm:px-6 relative flex flex-col items-center justify-start"
    >
      {/* Floating Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-2xl z-10"
      >
        <div className="relative backdrop-blur-lg transition-all duration-300">
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-gray-200 font-medium px-2">Search Movies & Shows</h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-white p-1 rounded-full"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="border-b border-gray-700/50 mb-3"></div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Search Input - Enhanced */}
          <div className="w-full">
            <SearchInput
              query={query}
              setQuery={setQuery}
              handleSearch={(e) => {
                setIsExpanded(true);
                handleSearchWithUrlUpdate(e);
              }}
              isLoading={isLoading}
              isFocused={isFocused}
              setIsFocused={(focused) => {
                setIsFocused(focused);
                if (focused && !isExpanded) {
                  setIsExpanded(true);
                }
              }}
              suggestions={suggestions}
              handleSuggestionClick={(suggestion) => {
                setIsExpanded(true);
                handleSuggestionClick(suggestion);
              }}
              handleSuggestionHover={handleSuggestionHover}
              searchMode={activeFilters.searchMode}
            />
          </div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Search Mode Toggle */}
                <div className="mt-3 flex items-center justify-between px-2">
                  <div className="flex items-center space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-full transition-all ${
                        showFilters 
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-800/70 text-gray-300 hover:bg-indigo-700/50'
                      }`}
                    >
                      {showFilters ? (
                        <FunnelSolidIcon className="w-3.5 h-3.5" />
                      ) : (
                        <FunnelIcon className="w-3.5 h-3.5" />
                      )}
                      <span className="font-medium text-xs">
                        {showFilters ? 'Hide Filters' : 'Filters'}
                      </span>
                    </motion.button>
                    
                    <div className="flex items-center space-x-1.5">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveFilters({...activeFilters, searchMode: 'smart'})}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          activeFilters.searchMode === 'smart'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-800/70 text-gray-300 hover:bg-indigo-700/50'
                        }`}
                      >
                        Smart
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveFilters({...activeFilters, searchMode: 'direct'})}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          activeFilters.searchMode === 'direct'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800/70 text-gray-300 hover:bg-blue-700/50'
                        }`}
                      >
                        Direct
                      </motion.button>
                    </div>
                  </div>
                  
                  {hasSearched && filteredResults.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {/* Filters Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 overflow-hidden"
                    >
                      <FiltersSection
                        activeFilters={activeFilters}
                        setActiveFilters={setActiveFilters}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Direct Search Indicator */}
      {isDirectSearch && hasSearched && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mb-4 p-2.5 rounded-xl bg-blue-900/30 backdrop-blur-sm border border-blue-800/50 text-blue-200 flex items-center shadow-lg"
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
          className="w-full max-w-4xl mb-4 p-2.5 rounded-xl bg-indigo-900/30 backdrop-blur-sm border border-indigo-800/50 text-indigo-200 flex items-center shadow-lg"
        >
          <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-indigo-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium truncate">{intentSummary}</p>
        </motion.div>
      )}
      
      {/* Error Messages */}
      <ErrorMessage error={error} isVisible={isErrorVisible} />

      {/* Render Results with Error Boundary */}
      <div className={`w-full transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-75'}`}>
        {renderResultsSection()}
      </div>
      
      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-indigo-600/80 backdrop-blur-sm text-white shadow-lg z-50"
          >
            <ArrowUpIcon className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;