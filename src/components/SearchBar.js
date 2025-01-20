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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-12"
      >
        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative max-w-4xl mx-auto"
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
              className="pl-4 text-gray-400"
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
              <MagnifyingGlassIcon className="w-6 h-6" />
            </motion.div>
            
            {/* Input Field */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search for movies or TV shows..."
              className="flex-grow pl-4 pr-4 py-4 text-lg bg-transparent focus:outline-none"
            />
            
            {/* Search Button */}
            <div className="pr-2">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Search
              </motion.button>
            </div>
          </div>
        </motion.form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-red-500 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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

      {selectedTrailer && (
        <TrailerModal trailerKey={selectedTrailer} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default SearchBar;