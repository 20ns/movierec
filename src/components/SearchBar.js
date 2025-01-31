import React from 'react';
import { FiltersSection } from './FiltersSection';
import { SearchInput } from './SearchInput';
import { MediaResults } from './MediaResults';
import { ErrorMessage } from './ErrorMessage';
import { LoadMoreButton } from './LoadMoreButton';
import { useSearch } from './useSearch';

export const SearchBar = () => {
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
      {/* Filters Section */}
      {hasSearched && (
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