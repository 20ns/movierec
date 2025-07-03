import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  TrendingUpIcon,
  FilmIcon,
  TvIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/solid';
import { MobileInfiniteScroll } from './MobileTouchGestures';

// Quick search filters for mobile
const QUICK_FILTERS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'movie', label: 'Movies', icon: FilmIcon },
  { id: 'tv', label: 'TV Shows', icon: TvIcon },
  { id: 'trending', label: 'Trending', icon: TrendingUpIcon }
];

// Recent search suggestions
const RECENT_SEARCHES = [
  'Marvel movies',
  'Comedy shows',
  'Sci-fi series',
  'Action films',
  'Horror movies'
];

// Trending searches
const TRENDING_SEARCHES = [
  'The Bear',
  'House of the Dragon',
  'Wednesday',
  'Avatar',
  'Top Gun Maverick'
];

const MobileSearch = ({ 
  isVisible,
  onClose,
  onSearch,
  searchResults = [],
  isLoading = false,
  hasMore = true,
  onLoadMore
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  // Auto-focus input when visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isVisible]);

  // Load search history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('movieRec_searchHistory') || '[]');
    setSearchHistory(history.slice(0, 5)); // Keep only last 5 searches
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = [...TRENDING_SEARCHES, ...RECENT_SEARCHES]
        .filter(item => 
          item.toLowerCase().includes(searchQuery.toLowerCase()) &&
          item.toLowerCase() !== searchQuery.toLowerCase()
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSearch = useCallback((query = searchQuery) => {
    if (!query.trim()) return;

    // Add to search history
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('movieRec_searchHistory', JSON.stringify(newHistory));

    // Perform search
    onSearch && onSearch(query, activeFilter);

    // Clear suggestions
    setSuggestions([]);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [searchQuery, activeFilter, searchHistory, onSearch]);

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    if (searchQuery) {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('movieRec_searchHistory');
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900 z-50 flex flex-col md:hidden"
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-700">
        <div className="flex-1 relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search movies, shows, actors..."
              className="w-full pl-10 pr-10 py-3 bg-gray-800 text-white rounded-xl border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            />
            {searchQuery && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="ml-3 p-2 text-gray-400 hover:text-white"
        >
          <XMarkIcon className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Quick Filters */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {QUICK_FILTERS.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <motion.button
                  key={filter.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleFilterChange(filter.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeFilter === filter.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  <span>{filter.label}</span>
                </motion.button>
              );
            })}
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 pt-3">
                <select className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600">
                  <option>Any Year</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                </select>
                <select className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600">
                  <option>Any Genre</option>
                  <option>Action</option>
                  <option>Comedy</option>
                  <option>Drama</option>
                  <option>Horror</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {searchQuery && searchResults.length === 0 && !isLoading && (
          /* Search Results */
          <MobileInfiniteScroll
            loadMore={onLoadMore}
            hasMore={hasMore}
            loading={isLoading}
          >
            <div className="p-4">
              {searchResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg mb-3"
                >
                  <img
                    src={result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '/placeholder-poster.jpg'}
                    alt={result.title || result.name}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {result.title || result.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {result.media_type === 'movie' ? 'Movie' : 'TV Show'} • {result.release_date?.split('-')[0] || result.first_air_date?.split('-')[0]}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className="flex items-center text-yellow-400 text-sm">
                        ⭐ {result.vote_average?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </MobileInfiniteScroll>
        )}

        {!searchQuery && (
          /* Suggestions and History */
          <div className="p-4">
            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium flex items-center">
                    <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                    Recent Searches
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-gray-400 text-sm hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {searchHistory.map((item, index) => (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                    >
                      {item}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div>
              <h3 className="text-white font-medium mb-3 flex items-center">
                <TrendingUpIcon className="w-4 h-4 mr-2 text-gray-400" />
                Trending Searches
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {TRENDING_SEARCHES.map((item, index) => (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSuggestionClick(item)}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-left transition-colors"
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-gray-800 border-t border-gray-600 z-10 max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-3 hover:bg-gray-700 text-gray-300 border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center">
                    <MagnifyingGlassIcon className="w-4 h-4 mr-3 text-gray-500" />
                    {suggestion}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MobileSearch;