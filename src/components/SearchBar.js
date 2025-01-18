import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StarIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import Skeleton from 'react-loading-skeleton';
import axios from 'axios';
import 'react-loading-skeleton/dist/skeleton.css';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);

const handleSearch = async (e) => {
  e.preventDefault();
  if (query.trim() === '') return;

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
      .filter(result => result.genre_ids && result.genre_ids.length > 0)
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4">
      <motion.form
        onSubmit={handleSearch}
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative flex w-full max-w-2xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies or TV shows..."
            className="w-full px-4 py-2 text-base rounded-l-lg border-2 border-r-0 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-r-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Search
          </motion.button>
        </div>
      </motion.form>

      {error && (
        <div className="text-red-500 text-center mb-4">
          {error}
        </div>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
        <div className="mt-8">
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${selectedTrailer}`}
            title="Trailer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
