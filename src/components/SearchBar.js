import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, CalendarIcon, ChartBarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import Skeleton from 'react-loading-skeleton';
import axios from 'axios';
import 'react-loading-skeleton/dist/skeleton.css';
import TrailerModal from './TrailerModal';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  // Fetch suggestions with debounce
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
          params: {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            query: query,
            include_adult: false,
            language: 'en-US',
            page: 1
          }
        });

        const topSuggestions = response.data.results
          .filter(item => item.title || item.name)
          .slice(0, 3)
          .map(item => ({
            id: item.id,
            title: item.title || item.name,
            type: item.media_type
          }));

        setSuggestions(topSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (query.trim() !== '') {
        fetchSuggestions();
      }
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Handle search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim() !== '') {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);

    const apiKey = process.env.REACT_APP_TMDB_API_KEY;

    if (!apiKey) {
      setError('API key is missing. Please check your environment variables.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
        params: {
          api_key: apiKey,
          query: query,
          include_adult: false,
          language: 'en-US',
          page: 1
        }
      });

      if (!response.data.results) {
        throw new Error('No results found in API response');
      }

      const filteredResults = response.data.results
        .filter(result => result.genre_ids && result.genre_ids.length > 0 && result.title && result.title.toLowerCase() !== query.toLowerCase())
        .sort((a, b) => {
          const aScore = (a.vote_average || 0) + (a.popularity || 0);
          const bScore = (b.vote_average || 0) + (b.popularity || 0);
          return bScore - aScore;
        })
        .slice(0, 3);

      setResults(filteredResults);
    } catch (error) {
      setError(error.response?.data?.status_message || error.message || 'An error occurred while searching');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = async (result) => {
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/${result.media_type}/${result.id}/videos`, {
        params: {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
        },
      });

      const trailer = response.data.results.find(video => video.type === 'Trailer');
      if (trailer) {
        setSelectedTrailer(trailer.key);
      } else {
        setError('No trailer found for this result.');
      }
    } catch (error) {
      setError('Error fetching trailer.');
    }
  };

  const handleCloseModal = () => {
    setSelectedTrailer(null);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    handleSearch();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-16"
        >
          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative max-w-5xl mx-auto"
            animate={{
              scale: isFocused ? 1.02 : 1,
              boxShadow: isFocused 
                ? '0 8px 30px rgba(0, 0, 0, 0.12)' 
                : '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-full border-2 border-blue-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-200/50 transition-all duration-300">
              {/* Search Icon */}
              <motion.div
                className="pl-6 text-gray-400"
                animate={{ 
                  scale: isLoading ? [1, 1.2, 1] : 1,
                  rotate: isLoading ? 360 : 0 
                }}
                transition={{ 
                  duration: 1,
                  repeat: isLoading ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <MagnifyingGlassIcon className="w-8 h-8" />
              </motion.div>
              
              {/* Input Field */}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search for movies or TV shows..."
                className="flex-grow pl-6 pr-4 py-6 text-xl bg-transparent focus:outline-none"
              />
              
              {/* Search Button */}
              <div className="pr-3">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-10 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-lg font-semibold rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Search
                </motion.button>
              </div>
            </div>
          </motion.form>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {suggestions.length > 0 && isFocused && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 mt-2 max-w-5xl mx-auto z-50"
              >
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="cursor-pointer group"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="px-6 py-3 hover:bg-blue-50 transition-colors duration-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                          <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {suggestion.title}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 capitalize px-2 py-1 rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors duration-200">
                          {suggestion.type}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-red-500 text-center text-lg"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-lg p-3">
                <Skeleton height={200} />
                <Skeleton height={24} width={150} className="mt-3" />
                <Skeleton count={2} className="mt-2" />
              </div>
            ))
          ) : (
            results.map((result) => (
              <motion.div
                key={result.id}
                className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500"
                whileHover={{ y: -4 }}
                onClick={() => handleResultClick(result)}
              >
                <div className="relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <motion.img
                    src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
                    alt={result.title || result.name}
                    className="w-full h-48 object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="absolute top-2 right-2 z-20"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="bg-blue-500/90 text-white px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                      {result.media_type === 'movie' ? 'Movie' : 'TV Show'}
                    </span>
                  </motion.div>
                </div>

                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">
                    {result.title || result.name}
                  </h2>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {result.overview}
                  </p>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                    <motion.div
                      className="flex items-center space-x-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      <StarIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {result.vote_average ? result.vote_average.toFixed(1) : 'N/A'}
                      </span>
                    </motion.div>

                    <motion.div
                      className="flex items-center space-x-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(result.release_date || result.first_air_date).getFullYear()}
                      </span>
                    </motion.div>

                    <motion.div
                      className="flex items-center space-x-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      <ChartBarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {Math.round(result.popularity)}
                      </span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {selectedTrailer && (
        <TrailerModal trailerKey={selectedTrailer} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default SearchBar;