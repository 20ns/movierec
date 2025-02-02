import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  SparklesIcon, 
  ClockIcon, 
  FilmIcon, 
  TvIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/react/24/solid';
import { FilterPill } from './FilterPill';
import { useSearch } from './useSearch';

// FiltersSection Component
const FiltersSection = ({ activeFilters, setActiveFilters }) => {
  const timePeriodOptions = [
    { value: 'any', label: 'Any Time', icon: <ClockIcon className="w-4 h-4" /> },
    { value: 'recent', label: 'Recent', icon: <SparklesIcon className="w-4 h-4" /> },
    { value: 'classic', label: 'Classic', icon: <FilmIcon className="w-4 h-4" /> },
    { value: '90s00s', label: '90s/00s', icon: <TvIcon className="w-4 h-4" /> }
  ];

  const genreOptions = [
    { value: 'diverse', label: 'Diverse Genres', icon: <SparklesIcon className="w-4 h-4" /> },
    { value: 'specific', label: 'Specific Genre', icon: <FilmIcon className="w-4 h-4" /> }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types', icon: <TvIcon className="w-4 h-4" /> },
    { value: 'movie', label: 'Movies', icon: <FilmIcon className="w-4 h-4" /> },
    { value: 'tv', label: 'TV Shows', icon: <TvIcon className="w-4 h-4" /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scaleY: 0.9 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -20, scaleY: 0.9 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-4xl mb-6 space-y-4"
    >
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-indigo-100">
        <div className="space-y-4">
          <FilterGroup 
            title="Filter Results" 
            icon={<SparklesIcon className="w-4 h-4 mr-2" />}
            options={genreOptions}
            filterKey="genre"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Time Period"
            icon={<ClockIcon className="w-4 h-4 mr-2" />}
            options={timePeriodOptions}
            filterKey="time"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />

          <FilterGroup
            title="Media Type"
            icon={<TvIcon className="w-4 h-4 mr-2" />}
            options={typeOptions}
            filterKey="type"
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
          />
        </div>
      </div>
    </motion.div>
  );
};

// FilterGroup Component
const FilterGroup = ({ title, icon, options, filterKey, activeFilters, setActiveFilters }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-indigo-500 mb-2 flex items-center">
      {icon}
      {title}
    </h3>
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <FilterPill
          key={option.value}
          active={activeFilters[filterKey] === option.value}
          onClick={() => setActiveFilters(prev => ({ ...prev, [filterKey]: option.value }))}
          icon={option.icon}
        >
          {option.label}
        </FilterPill>
      ))}
    </div>
  </div>
);

// SearchBar Component
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
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            placeholder="Search movies and TV shows..."
            className="w-full px-6 py-4 rounded-2xl border border-indigo-100 bg-white/80 backdrop-blur-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
          />
          
          {/* Search Icon */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="absolute right-3 top-3 p-2 bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors"
          >
            <SparklesIcon className="w-6 h-6 text-white" />
          </button>
        </motion.div>
      </div>

      {/* Rest of your existing components */}
      {/* MediaResults component */}
      {hasSearched && !isLoading && displayedResults && displayedResults.length > 0 && (
          <MediaResults 
            results={displayedResults}
            filteredResults={filteredResults} 
            handleResultClick={handleResultClick} 
          />
        )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center mt-6">
          <p>Loading...</p>
        </div>
      )}

       {/* Error Message */}
        {isErrorVisible && error && (
            <ErrorMessage message={error} />
          )}

         {/* Load More Button */}
          {hasSearched && displayedResults && displayedResults.length < filteredResults?.length && !isLoading && (
            <LoadMoreButton onClick={handleShowMore} />
        )}
         {/* Search Suggestions */}
         {isFocused && query && suggestions && suggestions.length > 0 && (
          <SearchSuggestions 
              suggestions={suggestions} 
              handleSuggestionClick={handleSuggestionClick}
              handleSuggestionHover={handleSuggestionHover} 
          />
        )}
    </div>
  );
};


// MediaResults Component
const MediaResults = ({ results, filteredResults, handleResultClick }) => {
    if (!results || results.length === 0) {
        return <p className="mt-4 text-center">No results found.</p>;
      }
  
    return (
      <div className="mt-8 w-full max-w-4xl mx-auto">
        <ul className="space-y-4">
          {results.map((result) => (
            <motion.li
            key={result.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className="bg-white/90 backdrop-blur-lg p-4 rounded-2xl shadow-lg border border-indigo-100 cursor-pointer"
            onClick={() => handleResultClick(result)}
          >
            <div className="flex items-start space-x-4">
              <img
              src={result.poster_path ? `https://image.tmdb.org/t/p/w200/${result.poster_path}` : "https://via.placeholder.com/200x300"}
                alt={result.title || result.name}
                className="w-24 h-36 object-cover rounded-lg shadow-md"
                onError={(e) => { e.target.src = "https://via.placeholder.com/200x300"; }}
              />
              <div className="flex-1">
              <h3 className="font-semibold text-lg text-indigo-600">{result.title || result.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{result.overview && result.overview.length > 100 ? `${result.overview.substring(0, 100)}...` : result.overview}</p>
                <p className="text-xs text-gray-500 mt-2">
                    {result.release_date ? `Release Date: ${new Date(result.release_date).toLocaleDateString()}` : ''}
                    {result.first_air_date ? `First Air Date: ${new Date(result.first_air_date).toLocaleDateString()}` : ''}
                  </p>
              </div>
            </div>
          </motion.li>
          ))}
        </ul>
      </div>
    );
  };

  // ErrorMessage Component
const ErrorMessage = ({ message }) => (
    <div className="mt-4 w-full max-w-2xl text-center text-red-500">
      <p>{message}</p>
    </div>
  );

  // LoadMoreButton Component
  const LoadMoreButton = ({ onClick }) => (
    <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-6 px-6 py-3 rounded-full bg-indigo-500 text-white font-semibold shadow-lg hover:bg-indigo-600 transition-colors"
      >
       Load More
    </motion.button>
  );


  // SearchSuggestions Component
const SearchSuggestions = ({ suggestions, handleSuggestionClick, handleSuggestionHover }) => (
    <motion.ul
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-0 mt-2 w-full max-w-2xl bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-indigo-100 overflow-hidden"
    >
      {suggestions.map((suggestion, index) => (
        <motion.li
          key={index}
          onClick={() => handleSuggestionClick(suggestion.title)}
          onMouseEnter={() => handleSuggestionHover(suggestion.title)}
          className="px-6 py-3 hover:bg-indigo-50 cursor-pointer transition-colors"
          whileHover={{ backgroundColor: '#f0f0f5'}}
        >
          {suggestion.title}
        </motion.li>
      ))}
    </motion.ul>
  );

export default SearchBar;