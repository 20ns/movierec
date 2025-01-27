import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, CalendarIcon, ChartBarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import Skeleton from 'react-loading-skeleton';
import axios from 'axios';
import 'react-loading-skeleton/dist/skeleton.css';
import TrailerModal from './TrailerModal';
import { EventEmitter } from '../events';

const hexToRgb = (hex) => {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  const genreColors = {
    28: '#7f1d1d',   12: '#14532d',   16: '#713f12',
    35: '#4c1d95',   80: '#1e293b',   18: '#1e3a8a',
    10751: '#134e4a', 14: '#581c87',  27: '#3c1513',
    9648: '#312e81', 10749: '#831843', 878: '#0c4a6e',
    default: '#1e1b4b'
  };

  const getGenreColor = (genreIds = []) => {
    const firstGenre = genreIds[0] || 'default';
    const hexColor = genreColors[firstGenre] || genreColors.default;
    const rgbValues = hexColor.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
      (m, r, g, b) => '#' + r + r + g + g + b + b)
      .substring(1).match(/.{2}/g)
      .map(x => parseInt(x, 16));
    const baseDark = [20, 20, 20];
    const tintStrength = 0.1;
    const darkened = rgbValues.map((c, i) =>
      Math.round(baseDark[i] * (1 - tintStrength) + c * tintStrength)
    );
    return `rgb(${darkened.join(',')})`;
  };

  const calculateMatchScore = (item, targetDetails) => {
    let score = 0;
    const genreMatches = item.genre_ids.filter(id =>
      targetDetails.genres.includes(id)
    ).length;
    score += genreMatches * 4;

    const currentYear = new Date().getFullYear();
    const releaseYear = new Date(
      item.release_date || item.first_air_date || currentYear
    ).getFullYear();
    score += (currentYear - releaseYear <= 5) ? 3 : 0;

    score += Math.min(Math.floor((item.popularity || 0) / 20), 5);
    score += (item.vote_average || 0) * 2.5;

    const uniqueGenres = new Set(item.genre_ids).size;
    score += Math.min(uniqueGenres, 3);

    return Math.min(Math.round(score), 100);
  };

  const fetchEnhancedRecommendations = async (targetMedia) => {
    try {
      const mediaType = targetMedia.media_type;
      const mediaId = targetMedia.id;
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;

      const detailsResponse = await axios.get(
        `https://api.themoviedb.org/3/${mediaType}/${mediaId}`,
        { params: { api_key: apiKey, append_to_response: 'keywords,credits' } }
      );

      const targetDetails = {
        genres: detailsResponse.data.genres.map(g => g.id),
        keywords: detailsResponse.data.keywords.keywords?.map(k => k.id) || [],
        director: detailsResponse.data.credits.crew.find(c => c.job === 'Director')?.id,
        cast: detailsResponse.data.credits.cast.slice(0, 5).map(c => c.id)
      };

      const [similar, recommendations, discover] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/similar`, {
          params: { api_key: apiKey }
        }),
        axios.get(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/recommendations`, {
          params: { api_key: apiKey }
        }),
        axios.get(`https://api.themoviedb.org/3/discover/${mediaType}`, {
          params: {
            api_key: apiKey,
            with_genres: targetDetails.genres.join(','),
            with_people: [...targetDetails.cast, targetDetails.director].filter(Boolean).join(','),
            'with_keywords': targetDetails.keywords.join('|'),
            sort_by: 'popularity.desc',
            include_adult: false
          }
        })
      ]);

      const combinedResults = [
        ...similar.data.results,
        ...recommendations.data.results,
        ...discover.data.results
      ].reduce((acc, current) => {
        if (!acc.some(item => item.id === current.id) && current.id !== mediaId) {
          acc.push(current);
        }
        return acc;
      }, []);

      let scoredResults = combinedResults
        .map(item => ({
          ...item,
          score: calculateMatchScore(item, targetDetails)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      if (scoredResults.length < 3) {
        const trending = await axios.get(
          `https://api.themoviedb.org/3/trending/${mediaType}/week`,
          { params: { api_key: apiKey } }
        );
        scoredResults = [...scoredResults, ...trending.data.results]
          .filter(r => !scoredResults.some(sr => sr.id === r.id))
          .slice(0, 6);
      }

      return scoredResults;

    } catch (error) {
      console.error('Recommendation engine error:', error);
      return [];
    }
  };

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

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const searchResponse = await axios.get(
        'https://api.themoviedb.org/3/search/multi',
        {
          params: {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            query: query,
            include_adult: false
          }
        }
      );

      const primaryResult = searchResponse.data.results[0];
      if (!primaryResult) throw new Error('No results found');

      const recommendations = await fetchEnhancedRecommendations(primaryResult);

      const finalResults = recommendations
        .filter(result =>
          result.poster_path &&
          result.overview &&
          result.vote_count > 100 &&
          result.vote_average > 5
        )
        .slice(0, 3);

      setResults(finalResults);

    } catch (error) {
      setError(error.message || 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = async (result) => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/${result.media_type}/${result.id}/videos`,
        { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } }
      );

      const trailer = response.data.results.find(video => video.type === 'Trailer');
      setSelectedTrailer(trailer?.key || null);

    } catch (error) {
      setError('Error fetching trailer.');
    }
  };

  const handleCloseModal = () => setSelectedTrailer(null);
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    handleSearch();
  };

  return (
    <div className="w-full h-screen max-w-7xl mx-auto px-4 relative flex flex-col z-10">
      {/* Search Container - Move to highest z-index */}
      <div className="relative" style={{ zIndex: 50 }}>
        <motion.div
          className="flex-grow flex items-center justify-center"
          animate={{
            paddingTop: hasSearched ? '2rem' : '0',
            paddingBottom: hasSearched ? '2rem' : '0',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <motion.div
            className="w-full max-w-3xl relative"
            animate={{
              y: hasSearched ? 40 : 0,
              scale: hasSearched ? 0.95 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <motion.form
              onSubmit={handleSearch}
              className="relative"
              style={{ zIndex: 50 }}
              animate={{
                scale: isFocused ? 1.02 : 1,
                boxShadow: isFocused
                  ? '0 8px 30px rgba(98, 102, 241, 0.2)'
                  : '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="flex items-center bg-gradient-to-r from-indigo-50 to-blue-50 backdrop-blur-xl rounded-full border-2 border-indigo-100 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-200/50 transition-all duration-300 shadow-lg">
                <motion.div
                  className="pl-6 text-indigo-400"
                  animate={{ scale: isLoading ? [1, 1.2, 1] : 1, rotate: isLoading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
                >
                  <MagnifyingGlassIcon className="w-8 h-8" />
                </motion.div>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  placeholder="Search for movies or TV shows..."
                  className="flex-grow pl-6 pr-4 py-6 text-xl bg-transparent focus:outline-none placeholder-indigo-300 text-indigo-600 font-medium"
                />

                <div className="pr-3">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-3 bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-lg font-semibold rounded-full hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-indigo-200/50"
                  >
                    Search
                  </motion.button>
                </div>
              </div>
            </motion.form>

            {/* Suggestions Dropdown - Ensure it's a direct child of the search container */}
            <AnimatePresence>
              {suggestions.length > 0 && isFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 right-0 mt-2"
                  style={{ zIndex: 100 }}
                >
                  <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-indigo-50">
                    {suggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1, type: 'spring' }}
                        className="cursor-pointer group"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="px-6 py-3 hover:bg-indigo-50/50 transition-colors duration-200 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <MagnifyingGlassIcon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" />
                            <span className="text-indigo-700 group-hover:text-indigo-900 transition-colors duration-200 font-medium">
                              {suggestion.title}
                            </span>
                          </div>
                          <span className="text-xs text-indigo-600 px-2 py-1 rounded-full bg-indigo-100 group-hover:bg-indigo-200 transition-colors duration-200">
                            {suggestion.type}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message remains the same */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-red-500 text-center text-lg bg-red-50 px-4 py-2 rounded-full shadow-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      {/* Results Container - Lower z-index */}
      <div className="relative" style={{ zIndex: 40 }}>
        <AnimatePresence mode='wait'>
          {hasSearched ? (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-grow h-[50vh] overflow-hidden px-4 pb-8"
            >
              {isLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    variants={itemVariants}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg p-4 hover:shadow-xl transition-shadow duration-300 h-full"
                  >
                    <Skeleton height="25vh" className="rounded-xl" />
                    <Skeleton height={28} width={180} className="mt-4" />
                    <Skeleton count={2} className="mt-2" />
                    <div className="mt-4 flex justify-between">
                      <Skeleton width={60} height={24} />
                      <Skeleton width={80} height={24} />
                      <Skeleton width={60} height={24} />
                    </div>
                  </motion.div>
                ))
              ) : (
                results.map((result) => (
                  <motion.div
                    key={result.id}
                    variants={itemVariants}
                    className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative h-full flex flex-col"
                    whileHover={{ scale: 1.01, rotate: 1 }}
                    onClick={() => handleResultClick(result)}
                    layout
                    onMouseEnter={() => EventEmitter.emit('accentColor', getGenreColor(result.genre_ids))}
                    onMouseLeave={() => EventEmitter.emit('accentColor', null)}
                  >
                    <div className="relative overflow-hidden h-[25vh] flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                      <motion.img
                        src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
                        alt={result.title || result.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                        Match: {result.score}%
                      </div>
                      <motion.div
                        className="absolute top-3 right-3 z-20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="bg-indigo-500/90 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
                          {result.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                        </span>
                      </motion.div>
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <h2 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">
                        {result.title || result.name}
                      </h2>
                      <p className="text-gray-600 line-clamp-3 mb-4 text-sm leading-relaxed flex-grow">
                        {result.overview}
                      </p>

                      <div className="border-t border-gray-100 pt-3 flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <StarIcon className="w-5 h-5 text-amber-400" />
                          <span className="font-medium text-gray-700 text-sm">
                            {result.vote_average?.toFixed(1) || 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-600 text-sm">
                            {new Date(result.release_date || result.first_air_date).getFullYear()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <ChartBarIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-600 text-sm">
                            {Math.round(result.popularity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8 flex-grow flex items-center justify-center"
            >
              <div className="max-w-md">
                <div className="text-indigo-400/50 text-6xl mb-4">🎬</div>
                <h3 className="text-2xl font-semibold text-gray-500 mb-2">
                  Search for Movies & TV Shows
                </h3>
                <p className="text-gray-400">
                  Enter a title and press search to discover your next favorite movie or TV show
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedTrailer && (
        <TrailerModal trailerKey={selectedTrailer} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default SearchBar;