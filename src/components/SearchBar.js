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
import { LightBulbIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { formatQueryIntentSummary } from './SearchBarUtils';

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

  // Extract query intent from results
  const queryIntent = useMemo(() => {
    if (!displayedResults.length) return null;
    return displayedResults[0].queryIntent;
  }, [displayedResults]);

  // Format query intent for display
  const intentSummary = useMemo(() => {
    return formatQueryIntentSummary(queryIntent);
  }, [queryIntent]);

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
  }, [displayedResults, queryIntent, exactMatches]);

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

      {/* Search Intent Display */}
      {intentSummary && hasSearched && !isLoading && (
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
          <MediaResults
            hasSearched={true}
            isLoading={isLoading}
            displayedResults={groupedResults.similarTo}
            handleResultClick={handleResultClick}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Mood-Based Section */}
      {groupedResults.moodBased && groupedResults.moodBased.length > 0 && (
        <div className="w-full max-w-7xl mb-8">
          <div className="py-2 px-3 bg-blue-900/20 rounded-lg border border-blue-800 mb-3 flex items-center">
            <LightBulbIcon className="h-4 w-4 text-blue-400 mr-2" />
            <h3 className="text-sm font-medium text-blue-300">
              {queryIntent.mood === 'exciting' && 'Exciting & Uplifting Content'}
              {queryIntent.mood === 'thoughtful' && 'Thoughtful & Meaningful Content'}
              {queryIntent.mood === 'emotional' && 'Emotional & Moving Content'}
              {queryIntent.mood === 'scary' && 'Scary & Thrilling Content'}
            </h3>
          </div>
          <MediaResults
            hasSearched={true}
            isLoading={isLoading}
            displayedResults={groupedResults.moodBased}
            handleResultClick={handleResultClick}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Context-Based Section */}
      {groupedResults.contextBased && groupedResults.contextBased.length > 0 && (
        <div className="w-full max-w-7xl mb-8">
          <div className="py-2 px-3 bg-green-900/20 rounded-lg border border-green-800 mb-3 flex items-center">
            <LightBulbIcon className="h-4 w-4 text-green-400 mr-2" />
            <h3 className="text-sm font-medium text-green-300">
              {queryIntent.context === 'date' && 'Perfect for Date Night'}
              {queryIntent.context === 'family' && 'Great for the Whole Family'}
              {queryIntent.context === 'friends' && 'Fun to Watch with Friends'}
              {queryIntent.context === 'solo' && 'Ideal for Solo Viewing'}
              {queryIntent.context === 'learning' && 'Educational Content'}
            </h3>
          </div>
          <MediaResults
            hasSearched={true}
            isLoading={isLoading}
            displayedResults={groupedResults.contextBased}
            handleResultClick={handleResultClick}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Subject-Based Section */}
      {groupedResults.subjectBased && groupedResults.subjectBased.length > 0 && (
        <div className="w-full max-w-7xl mb-8">
          <div className="py-2 px-3 bg-amber-900/20 rounded-lg border border-amber-800 mb-3 flex items-center">
            <LightBulbIcon className="h-4 w-4 text-amber-400 mr-2" />
            <h3 className="text-sm font-medium text-amber-300">
              {`Content about ${queryIntent.subjects.join(', ')}`}
            </h3>
          </div>
          <MediaResults
            hasSearched={true}
            isLoading={isLoading}
            displayedResults={groupedResults.subjectBased}
            handleResultClick={handleResultClick}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Main Results Section */}
      {groupedResults.main && groupedResults.main.length > 0 && (
        <MediaResults
          hasSearched={hasSearched}
          isLoading={isLoading}
          displayedResults={groupedResults.main}
          handleResultClick={handleResultClick}
          currentUser={currentUser}
        />
      )}

      {/* Load More Button */}
      <LoadMoreButton
        show={hasSearched && displayedResults.length < filteredResults.length}
        onClick={handleShowMore}
      />
    </div>
  );
};

export default SearchBar;