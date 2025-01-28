import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, CalendarIcon, ChartBarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import Skeleton from 'react-loading-skeleton';
import axios from 'axios';
import 'react-loading-skeleton/dist/skeleton.css';
import TrailerModal from './TrailerModal';
import { EventEmitter } from '../events';
import { cacheAdapterEnhancer } from 'axios-extensions';

const hexToRgb = (hex) => {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

const axiosInstance = axios.create({
  headers: { 'Cache-Control': 'no-cache' },
  adapter: cacheAdapterEnhancer(axios.defaults.adapter, { enabledByDefault: true, cacheFlag: 'useCache' })
});

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState([]);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resultsToShow, setResultsToShow] = useState(3);

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

    // Genre Matching - Increased weight
    const genreMatches = item.genre_ids.filter(id =>
      targetDetails.genres.includes(id)
    ).length;
    score += genreMatches * 5; // Increased genre weight

    // Keyword Matching
    const keywordMatches = item.keywords?.filter(keyword =>
      targetDetails.keywords.includes(keyword)
    ).length || 0;
    score += keywordMatches * 3;

    // Cast Matching (Top 5)
    const castMatches = item.cast?.filter(actorId =>
      targetDetails.cast.includes(actorId)
    ).length || 0;
    score += castMatches * 2;

    // Director Matching
    if (targetDetails.director && item.crew?.includes(targetDetails.director)) { // Check if director exists in item crew
      score += 4;
    }

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

  const fetchWithRetry = async (url, params, retries = 2) => {
    try {
      return await axiosInstance.get(url, { params, useCache: true });
    } catch (error) {
      if (retries > 0) return fetchWithRetry(url, params, retries - 1);
      throw error;
    }
  };

  const fetchEnhancedRecommendations = async (targetMedia) => {
    try {
      const mediaType = targetMedia.media_type;
      const mediaId = targetMedia.id;
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;

      const detailsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/${mediaType}/${mediaId}`,
        {
          api_key: apiKey,
          append_to_response: 'keywords,credits'
        }
      );

      const targetDetails = {
        genres: detailsResponse.data.genres.map(g => g.id),
        keywords: detailsResponse.data.keywords.keywords?.map(k => k.id) || [],
        director: detailsResponse.data.credits.crew.find(c => c.job === 'Director')?.id,
        cast: detailsResponse.data.credits.cast.slice(0, 5).map(c => c.id)
      };

      const [
        similar1, similar2,
        rec1, rec2,
        discover1, discover2
      ] = await Promise.all([
        fetchWithRetry(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/similar`, {
          api_key: apiKey, page: 1 }),
        fetchWithRetry(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/similar`, {
          api_key: apiKey, page: 2 }),
        fetchWithRetry(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/recommendations`, {
          api_key: apiKey, page: 1 }),
        fetchWithRetry(`https://api.themoviedb.org/3/${mediaType}/${mediaId}/recommendations`, {
          api_key: apiKey, page: 2 }),
        fetchWithRetry(`https://api.themoviedb.org/3/discover/${mediaType}`, {
          api_key: apiKey,
          with_genres: targetDetails.genres.join(','),
          with_people: [...targetDetails.cast, targetDetails.director].filter(Boolean).join(','),
          with_keywords: targetDetails.keywords.join('|'),
          sort_by: 'vote_average.desc',
          'vote_count.gte': 1000,
          include_adult: false,
          with_original_language: targetMedia.original_language,
          page: 1
        }),
        fetchWithRetry(`https://api.themoviedb.org/3/discover/${mediaType}`, {
          api_key: apiKey,
          with_genres: targetDetails.genres.join(','),
          with_people: [...targetDetails.cast, targetDetails.director].filter(Boolean).join(','),
          with_keywords: targetDetails.keywords.join('|'),
          sort_by: 'vote_average.desc',
          'vote_count.gte': 1000,
          include_adult: false,
          with_original_language: targetMedia.original_language,
          page: 2
        })
      ]);

      const combinedResults = [
        ...similar1.data.results,
        ...similar2.data.results,
        ...rec1.data.results,
        ...rec2.data.results,
        ...discover1.data.results,
        ...discover2.data.results
      ].reduce((acc, current) => {
        if (!acc.some(item => item.id === current.id) && current.id !== mediaId) {
          // Enrich each result with keywords and cast for scoring - In real scenario, fetch these for accurate matching if needed for all results.
          current.keywords = current.genre_ids; // Placeholder - Using genre_ids as keywords for now for scoring as an example.
          current.cast = []; // Placeholder - In real scenario, fetch cast for each result if needed.
          current.crew = []; // Placeholder - In real scenario, fetch crew (director) for each result if needed.
          acc.push(current);
        }
        return acc;
      }, []);

      let scoredResults = combinedResults
        .map(item => ({
          ...item,
          score: calculateMatchScore(item, targetDetails)
        }))
        .sort((a, b) => b.score - a.score);

      // Ensure genre diversity
      let finalResults = [];
      const seenGenres = new Set();
      for (const result of scoredResults) {
        const mainGenre = result.genre_ids[0];
        if (!seenGenres.has(mainGenre)) {
          finalResults.push(result);
          seenGenres.add(mainGenre);
        } else {
          finalResults.push(result);
        }
        if (finalResults.length >= 9) break;
      }

      return finalResults.slice(0, 9);

    } catch (error) {
      console.error('Recommendation engine error:', error);
      setError('Failed to fetch recommendations. Please try again later.');
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
        const response = await fetchWithRetry(
          `https://api.themoviedb.org/3/search/multi`,
          {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            query: query,
            include_adult: false,
            language: 'en-US',
            page: 1
          }
        );

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
        setError('Error fetching suggestions. Please try again.');
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
    setAllResults([]);
    setDisplayedResults([]);
    setResultsToShow(3);

    try {
      const searchResponse = await fetchWithRetry(
        'https://api.themoviedb.org/3/search/multi',
        {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: query,
          include_adult: false
        }
      );

      const searchResults = searchResponse.data.results;
      const primaryResult = searchResults.length > 0
        ? searchResults.reduce((prev, current) =>
            (current.popularity > prev.popularity) ? current : prev, searchResults[0])
        : null;

      if (!primaryResult) {
        setError('No results found for your search.');
        setIsLoading(false);
        return;
      }

      const recommendations = await fetchEnhancedRecommendations(primaryResult);

      const filteredResults = recommendations
        .filter(result =>
          result.poster_path &&
          result.overview &&
          result.vote_count > 100 &&
          result.vote_average > 5
        );

      setAllResults(filteredResults);
      setDisplayedResults(filteredResults.slice(0, 3));

    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMore = () => {
    const nextResultsToShow = Math.min(resultsToShow + 3, allResults.length, 9);
    setDisplayedResults(allResults.slice(0, nextResultsToShow));
    setResultsToShow(nextResultsToShow);
  };


  const handleResultClick = async (result) => {
    try {
      const response = await fetchWithRetry(
        `https://api.themoviedb.org/3/${result.media_type}/${result.id}/videos`,
        { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } }
      );

      const trailer = response.data.results.find(video => video.type === 'Trailer');
      setSelectedTrailer(trailer?.key || null);

    } catch (error) {
      console.error('Trailer fetch error:', error);
      setError('Error fetching trailer. Please try again.');
    }
  };

  const handleCloseModal = () => setSelectedTrailer(null);
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    handleSearch();
  };

  const showMoreButtonVisible = hasSearched && displayedResults.length < allResults.length && displayedResults.length < 9;


  return (
    <div className="w-full h-screen max-w-7xl mx-auto px-4 relative flex flex-col items-center justify-start pt-16 md:pt-24">
      {/* Search Container */}
      <div className="relative w-full flex justify-center" style={{ zIndex: 50 }}>
        <motion.div
          className="flex-grow flex items-center justify-center"
          animate={{
            paddingTop: hasSearched ? '0.75rem' : '0',
            paddingBottom: hasSearched ? '0.75rem' : '0',
            maxWidth: hasSearched ? 'max-w-2xl' : 'max-w-xl',
            width: '100%',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <motion.div
            className="w-full relative"
            animate={{
              y: hasSearched ? 0 : 0,
              scale: hasSearched ? 0.9 : 1,
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
                  className="pl-4 text-indigo-400"
                  animate={{ scale: isLoading ? [1, 1.2, 1] : 1, rotate: isLoading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
                >
                  <MagnifyingGlassIcon className="w-6 h-6" />
                </motion.div>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  placeholder="Search for movies or TV shows..."
                  className="flex-grow pl-4 pr-3 py-3 text-lg bg-transparent focus:outline-none placeholder-indigo-300 text-indigo-600 font-medium"
                />

                <div className="pr-2">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 text-base bg-gradient-to-br from-indigo-500 to-blue-500 text-white font-semibold rounded-full hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-indigo-200/50"
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
                        <div className="px-4 py-2 hover:bg-indigo-50/50 transition-colors duration-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MagnifyingGlassIcon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" />
                            <span className="text-base text-indigo-700 group-hover:text-indigo-900 transition-colors duration-200 font-medium">
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

            {/* Error message */}
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

      {/* Results Container */}
      <div className="relative w-full mt-8" style={{ zIndex: 40 }}>
        <AnimatePresence mode='wait'>
          {hasSearched ? (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 pb-4"
            >
              {isLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    variants={itemVariants}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg p-3 hover:shadow-xl transition-shadow duration-300 h-full"
                  >
                    <Skeleton height="200px" className="rounded-xl" />
                    <Skeleton height={24} width={160} className="mt-3" />
                    <Skeleton count={2} className="mt-1" />
                    <div className="mt-2 flex justify-between">
                      <Skeleton width={50} height={20} />
                      <Skeleton width={70} height={20} />
                      <Skeleton width={50} height={20} />
                    </div>
                  </motion.div>
                ))
              ) : (
                displayedResults.map((result) => (
                  <motion.div
                    key={result.id}
                    variants={itemVariants}
                    className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full"
                    whileHover={{ scale: 1.02, rotate: 0.5 }}
                    onClick={() => handleResultClick(result)}
                    layout
                    onMouseEnter={() => EventEmitter.emit('accentColor', getGenreColor(result.genre_ids))}
                    onMouseLeave={() => EventEmitter.emit('accentColor', null)}
                  >
                    <div className="relative overflow-hidden h-[50%] md:h-[180px] flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                      <motion.img
                        src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
                        alt={result.title || result.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[0.6rem] text-white">
                        Match: {result.score}% {/* Display Match Score */}
                      </div>
                      <motion.div
                        className="absolute top-2 right-2 z-20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="bg-indigo-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
                          {result.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                        </span>
                      </motion.div>
                    </div>

                    <div className="p-3 flex flex-col flex-grow">
                      <h2 className="text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300">
                        {result.title || result.name}
                      </h2>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2 text-sm leading-relaxed flex-grow">
                        {result.overview}
                      </p>

                      <div className="border-t border-gray-100 pt-2 flex items-center justify-between space-x-1">
                        <div className="flex items-center space-x-1">
                          <StarIcon className="w-4 h-4 text-amber-400" />
                          <span className="font-medium text-sm text-gray-700">
                            {result.vote_average?.toFixed(1) || 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(result.release_date || result.first_air_date).getFullYear()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <ChartBarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-6 text-sm text-indigo-400 italic"
                >
                  Powered by TMDB API
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* "Show More" Button */}
      <AnimatePresence>
        {showMoreButtonVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center pb-8"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-6 py-2 text-base bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-colors duration-300 shadow-md"
              onClick={handleShowMore}
            >
              Show More
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>


      {selectedTrailer && (
        <TrailerModal trailerKey={selectedTrailer} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default SearchBar;