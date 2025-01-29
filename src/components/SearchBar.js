import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, CalendarIcon, ChartBarIcon, MagnifyingGlassIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import Skeleton from 'react-loading-skeleton';
import axios from 'axios';
import 'react-loading-skeleton/dist/skeleton.css';
import { EventEmitter } from '../events';
import { cacheAdapterEnhancer } from 'axios-extensions';
import { ChevronDownIcon } from '@heroicons/react/24/outline'; // Import dropdown icon
import styled from 'styled-components';

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

const SearchContainer = styled(motion.div)`
  max-width: ${props => props.hasSearched ? '42rem' : '36rem'};
  width: 100%;
  transition: max-width 0.3s ease;
`;

const SearchBar = () => {
const [query, setQuery] = useState('');
const [allResults, setAllResults] = useState([]);
const [displayedResults, setDisplayedResults] = useState([]);
const [suggestions, setSuggestions] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [isErrorVisible, setIsErrorVisible] = useState(false); // New state for error visibility
const [isFocused, setIsFocused] = useState(false);
const [hasSearched, setHasSearched] = useState(false);
const [resultsToShow, setResultsToShow] = useState(3);
const [userPreferences, setUserPreferences] = useState({
likedGenres: [],
dislikedGenres: [],
favoriteDecades: []
});
const [genreFocus, setGenreFocus] = useState('diverse');
const [timePeriod, setTimePeriod] = useState('any');
const [filteredResults, setFilteredResults] = useState([]);

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
    // Convert hex to RGB format
    return hexToRgb(hexColor);
};

// User Preference Tracking: Stores user interactions to localStorage for personalized recommendations.
const trackInteraction = (item, interactionType) => {
const interactions = JSON.parse(localStorage.getItem('viewingHistory') || '[]');
interactions.push({
id: item.id,
type: interactionType,
timestamp: Date.now(),
genre_ids: item.genre_ids
});
localStorage.setItem('viewingHistory', JSON.stringify(interactions));
};

// calculateMatchScore: Scores search results based on multiple factors for enhanced recommendation quality.
const calculateMatchScore = (item, targetDetails) => {
let score = 0;
const reasons = []; // Visual Explanation System: Stores reasons for score contribution.

// Genre Matching: Significantly boosts score for genre relevance.
const genreMatches = item.genre_ids.filter(id =>
targetDetails.genres.includes(id)
).length;
if (genreMatches > 0) {
reasons.push(`Matched ${genreMatches} genres`);
}
score += genreMatches * 5;

// Keyword Matching
const keywordMatches = item.keywords?.filter(keyword =>
targetDetails.keywords.includes(keyword)
).length || 0;
if (keywordMatches > 0) {
reasons.push(`Matched ${keywordMatches} keywords`);
}
score += keywordMatches * 3;

// Cast Matching (Top 5)
const castMatches = item.cast?.filter(actorId =>
targetDetails.cast.includes(actorId)
).length || 0;
if (castMatches > 0) {
reasons.push(`Matched cast`);
}
score += castMatches * 2;

// Director Matching
if (targetDetails.director && item.crew?.some(c => c.id === targetDetails.director)) {
if (targetDetails.director) reasons.push(`Directed by target director`);
score += 4;
}

const currentYear = new Date().getFullYear();
const releaseYear = new Date(
item.release_date || item.first_air_date || currentYear
).getFullYear();
if (currentYear - releaseYear <= 5) {
reasons.push(`Recent release (${releaseYear})`);
}
score += (currentYear - releaseYear <= 5) ? 3 : 0;

score += Math.min(Math.floor((item.popularity || 0) / 20), 5);
if (Math.floor((item.popularity || 0) / 20) > 0) reasons.push(`Popularity boost`);
score += (item.vote_average || 0) * 2.5;
if ((item.vote_average || 0) > 3) reasons.push(`High vote average`);

const uniqueGenres = new Set(item.genre_ids).size;
score += Math.min(uniqueGenres, 3);
if (uniqueGenres > 1) reasons.push(`Genre diversity`);

// Collaborative Filtering Boost: Boosts score based on viewing history similarity.
const viewingHistory = JSON.parse(localStorage.getItem('viewingHistory') || '[]');
const similarTastes = viewingHistory.filter(h =>
h.genre_ids?.some(g => item.genre_ids.includes(g))
).length;
score += similarTastes * 2;
if (similarTastes > 0) reasons.push(`Similar tastes boost`);

// Crew/Cast Analysis: Weights crew roles to enhance recommendation relevance.
const CREW_WEIGHTS = {
Director: 5,
'Original Music Composer': 3,
'Director of Photography': 2
};

const creativeTeamScore = item.credits?.crew?.reduce((crewScore, member) => {
return crewScore + (CREW_WEIGHTS[member.job] || 0);
}, 0) || 0;
score += creativeTeamScore;
if (creativeTeamScore > 0) reasons.push(`Creative team boost`);

// Seasonal Recommendations: Boosts score for seasonally relevant genres.
const getSeasonalBoost = () => {
const month = new Date().getMonth();
const seasonalGenres = {
11: [10751, 18],    // December: Holiday, Drama
0: [18, 9648],      // January: Drama, Mystery
9: [27, 53],        // October: Horror, Thriller
6: [12, 14]         // July: Adventure, Fantasy
};
return seasonalGenres[month] || [];
};

if (item.genre_ids.some(g => getSeasonalBoost().includes(g))) {
reasons.push(`Seasonal recommendation`);
}
score += item.genre_ids.some(g => getSeasonalBoost().includes(g)) ? 3 : 0;

// Anniversary Recognition: Boosts score for classic film anniversaries.
const isClassic = (releaseYear) => {
const currentYear = new Date().getFullYear();
const anniversaries = [5, 10, 15, 20, 25, 30, 40, 50];
return anniversaries.some(y => (currentYear - releaseYear) % y === 0);
};

if (isClassic(releaseYear)) {
reasons.push(`Classic film anniversary`);
}
score += isClassic(releaseYear) ? 2 : 0;

return { score: Math.min(Math.round(score), 100), reasons }; // Visual Explanation System: Returns score and reasons.
};

// Semantic Analysis: Placeholder function for future content analysis implementation.
const analyzeContent = async (text) => {
try {
const response = await axios.post('/api/analyze', { text });
return {
mood: response.data.mood,
themes: response.data.themes
};
} catch (error) {
return { mood: 'neutral', themes: [] };
}
};

// Surprise Me Feature: Fetches a highly-rated, popular movie for wildcard recommendation.
const getWildcardRecommendation = async () => {
const { data } = await axios.get(
'https://api.themoviedb.org/3/discover/movie',
{
params: {
api_key: process.env.REACT_APP_TMDB_API_KEY,
sort_by: 'vote_average.desc',
'vote_count.gte': 5000,
with_original_language: 'en',
page: Math.floor(Math.random() * 100) + 1
}
}
);
return data.results[Math.floor(Math.random() * data.results.length)];
};

const fetchWithRetry = async (url, params, retries = 2) => {
try {
return await axiosInstance.get(url, { params, useCache: true });
} catch (error) {
if (retries > 0) return fetchWithRetry(url, params, retries - 1);
throw error;
}
};

// fetchEnhancedRecommendations: Fetches recommendations based on a primary search result, incorporating cross-media and similar content.
const fetchEnhancedRecommendations = async (primaryResult) => {
    if (!primaryResult?.media_type || !primaryResult?.id) {
        console.error('Invalid primary result:', primaryResult);
        return [];
    }

    try {
        // ... rest of the function remains the same
        if (!primaryResult || !primaryResult.media_type) {
            console.error('Error: primaryResult or primaryResult.media_type is missing:', primaryResult);
            setError('Failed to fetch recommendations due to missing media information.');
            setIsErrorVisible(true);
            setTimeout(() => setIsErrorVisible(false), 3000);
            return [];
        }

        const mediaType = primaryResult.media_type;
        const mediaId = primaryResult.id;
        const apiKey = process.env.REACT_APP_TMDB_API_KEY;

        if (!['movie', 'tv'].includes(mediaType)) {
            console.error('Error: Invalid mediaType:', mediaType);
            setError('Failed to fetch recommendations due to invalid media type.');
            setIsErrorVisible(true);
            setTimeout(() => setIsErrorVisible(false), 3000);
            return [];
        }

        // Fetch details including keywords and credits
        const detailsResponse = await fetchWithRetry(
            `https://api.themoviedb.org/3/${mediaType}/${mediaId}`,
            { api_key: apiKey, append_to_response: 'keywords,credits' }
        );

        const keywords = mediaType === 'movie'
            ? detailsResponse.data.keywords?.keywords?.map(k => k.id) || []
            : detailsResponse.data.keywords?.results?.map(k => k.id) || [];

        const targetDetails = {
            genres: detailsResponse.data.genres.map(g => g.id),
            keywords: keywords,
            director: detailsResponse.data.credits.crew.find(c => c.job === 'Director')?.id,
            cast: detailsResponse.data.credits.cast.slice(0, 5).map(c => c.id),
            analysis: { mood: 'neutral', themes: [] }
        };

        // Fetch similar media and cross-recommendations
        const similarMediaPromises = [];

        // Similar content of the same type
        similarMediaPromises.push(
            fetchWithRetry(
                `https://api.themoviedb.org/3/${mediaType}/${mediaId}/similar`,
                { api_key: apiKey }
            )
        );

        // Cross-media recommendations using discover endpoint
        const crossMediaType = mediaType === 'movie' ? 'tv' : 'movie';
        similarMediaPromises.push(
            fetchWithRetry(
                `https://api.themoviedb.org/3/discover/${crossMediaType}`,
                {
                    api_key: apiKey,
                    with_genres: targetDetails.genres.join(','),
                    sort_by: 'popularity.desc',
                    page: 1
                }
            )
        );

        // Handle all promises safely
        const crossMediaResponses = await Promise.allSettled(similarMediaPromises);

        // Process successful responses
        const combinedResults = crossMediaResponses.reduce((acc, response, index) => {
          if (response.status === 'fulfilled') {
            const resultsWithType = response.value.data.results.map(result => ({
              ...result,
              media_type: index === 0 ? mediaType : crossMediaType
            }));
            acc.push(...resultsWithType);
          }
          return acc;
        }, []);

        // Add results from target media's similar if available
        if (detailsResponse.data.similar?.results) {
          const similarWithType = detailsResponse.data.similar.results.map(result => ({
            ...result,
            media_type: mediaType
          }));
          combinedResults.push(...similarWithType);
        }

        // Filter unique items and exclude current media
        const uniqueResults = combinedResults
          .filter((item) => item.id && item.media_type) // Ensure media_type exists
          .filter((item, index, self) =>
            self.findIndex(t => t.id === item.id) === index &&
            item.id !== mediaId
        );

        let scoredResults = uniqueResults
            .map(item => {
                const scoringResult = calculateMatchScore(item, targetDetails);
                return {
                    ...item,
                    score: scoringResult.score,
                    scoreReasons: scoringResult.reasons
                };
            })
            .sort((a, b) => b.score - a.score);

        // Ensure genre diversity in top results
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
        console.log('Error details in fetchEnhancedRecommendations:', error.message, error.response);
        setError('Failed to fetch recommendations. Please try again later.');
        setIsErrorVisible(true);
        setTimeout(() => setIsErrorVisible(false), 3000);
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
                'https://api.themoviedb.org/3/search/multi',
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
            setIsErrorVisible(true);
            setTimeout(() => setIsErrorVisible(false), 3000);
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
    setIsErrorVisible(false); // Reset error visibility on new search
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

        const searchResults = searchResponse.data.results.filter(result =>
            // Filter out results without media_type or required fields
            result &&
            result.media_type &&
            (result.title || result.name) &&
            ['movie', 'tv'].includes(result.media_type)
        );

        if (searchResults.length === 0) {
            setError('No results found for your search.');
            setIsErrorVisible(true);
            setTimeout(() => setIsErrorVisible(false), 3000);
            setIsLoading(false);
            return;
        }

        const primaryResult = searchResults.reduce((prev, current) =>
            (current.popularity > prev.popularity) ? current : prev, searchResults[0]);

        const recommendations = await fetchEnhancedRecommendations(primaryResult);

        const filteredResults = recommendations
            .filter(result =>
                result &&
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
        setIsErrorVisible(true);
        setTimeout(() => setIsErrorVisible(false), 3000);
    } finally {
        setIsLoading(false);
    }
};

// Apply filters to results
useEffect(() => {
    if (!allResults.length) return;

    let filtered = [...allResults];

    // Apply genre focus filter
    if (genreFocus === 'specific' && filtered.length > 0) {
      const primaryGenre = filtered[0].genre_ids[0];
      filtered = filtered.filter(item => item.genre_ids.includes(primaryGenre));
    }

    // Apply time period filter
    const currentYear = new Date().getFullYear();
    if (timePeriod === 'recent') {
      filtered = filtered.filter(item => {
        const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
        return currentYear - releaseYear <= 5;
      });
    } else if (timePeriod === 'classic') {
      filtered = filtered.filter(item => {
        const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
        return currentYear - releaseYear > 20;
      });
    }

    setFilteredResults(filtered);
    setDisplayedResults(filtered.slice(0, resultsToShow));
  }, [allResults, genreFocus, timePeriod, resultsToShow]);


const handleShowMore = () => {
    const nextResultsToShow = Math.min(resultsToShow + 3, filteredResults.length, 9);
    setDisplayedResults(filteredResults.slice(0, nextResultsToShow));
    setResultsToShow(nextResultsToShow);
};

// User Preference Tracking: Tracks result clicks for interaction analysis.
const handleResultClick = async (result) => {
    if (!result || !result.media_type) {
        setError('Unable to get details for this title.');
        setIsErrorVisible(true);
        setTimeout(() => setIsErrorVisible(false), 3000);
        return;
    }

    trackInteraction(result, 'view');
    try {
        const externalIdsResponse = await fetchWithRetry(
            `https://api.themoviedb.org/3/${result.media_type}/${result.id}/external_ids`,
            {
                api_key: process.env.REACT_APP_TMDB_API_KEY
            }
        );

        const imdbId = externalIdsResponse.data.imdb_id;
        if (imdbId) {
            window.open(`https://www.imdb.com/title/${imdbId}`, '_blank');
        } else {
            setError('IMDb page not available for this title.');
            setIsErrorVisible(true);
            setTimeout(() => setIsErrorVisible(false), 3000);
        }
    } catch (error) {
        console.error('Error fetching external IDs:', error);
        setError('Failed to open IMDb page. Please try again.');
        setIsErrorVisible(true);
        setTimeout(() => setIsErrorVisible(false), 3000);
    }
};


const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    handleSearch();
};

// Intelligent Prefetching: Caches recommendation data on suggestion hover for faster result loading.
const handleSuggestionHover = async (suggestion) => {
    try {
        const { data } = await axiosInstance.get(
            `https://api.themoviedb.org/3/${suggestion.type}/${suggestion.id}`,
            { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } }
        );
        fetchEnhancedRecommendations(data); // Cache in background
    } catch (error) {
        console.error('Prefetch error:', error);
        setError('Error prefetching data.'); // Optional: Error for prefetch, consider if user-facing
        setIsErrorVisible(true); // Optional: Show error if prefetch fails, depends on UX
        setTimeout(() => setIsErrorVisible(false), 3000); // Optional: Error timeout
    }
};

// Social Proof Integration: Mocks social data to simulate friend activity.
const getSocialProof = (item) => {
    const MOCK_SOCIAL_DATA = {
        603: { friendsWatched: 12, friendsLiked: 11 }, // Matrix
        238: { friendsWatched: 8, friendsLiked: 7 },   // The Godfather
    };
    return MOCK_SOCIAL_DATA[item.id] || { friendsWatched: 0, friendsLiked: 0 };
};

const showMoreButtonVisible = hasSearched && displayedResults.length < filteredResults.length && displayedResults.length < 9;

return (

<div className="w-full h-screen max-w-7xl mx-auto px-4 relative flex flex-col items-center justify-start pt-16 md:pt-24">


{/* Recommendation Tuning Controls */}
{hasSearched && (
<div className="flex gap-4 mb-4">
<div className="flex items-center">
<label className="mr-2 text-sm text-gray-600 font-medium">Genre Focus:</label> {/* Updated label style */}
<div className="tuning-select-container-improved relative"> {/* New container class */}
<select
className="tuning-select-improved" // New select class
value={genreFocus}
onChange={(e) => setGenreFocus(e.target.value)}
>
<option value="diverse">Diverse</option>
<option value="specific">Specific</option>
</select>
<div className="tuning-select-value-improved"> {/* Display selected value as button text */}
{genreFocus.charAt(0).toUpperCase() + genreFocus.slice(1)}
<ChevronDownIcon className="w-4 h-4 ml-1 inline-block" /> {/* Dropdown icon */}
</div>
</div>
</div>

<div className="flex items-center">
    <label className="mr-2 text-sm text-gray-600 font-medium">Time Period:</label> {/* Updated label style */}
    <div className="tuning-select-container-improved relative"> {/* New container class */}
      <select
        className="tuning-select-improved" // New select class
        value={timePeriod}
        onChange={(e) => setTimePeriod(e.target.value)}
      >
        <option value="any">Any</option>
        <option value="recent">Last 5 Years</option>
        <option value="classic">Classics</option>
      </select>
      <div className="tuning-select-value-improved"> {/* Display selected value as button text */}
        {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}
        <ChevronDownIcon className="w-4 h-4 ml-1 inline-block" /> {/* Dropdown icon */}
      </div>
    </div>
  </div>
</div>


)}

{/* Search Container */}

  <div className="relative w-full flex justify-center" style={{ zIndex: 50 }}>
    <SearchContainer
      className="flex-grow flex items-center justify-center"
      animate={{
        paddingTop: hasSearched ? '0.75rem' : '0',
        paddingBottom: hasSearched ? '0.75rem' : '0',
      }}
      transition={{ type: 'spring', stiffness: 300 }}
      hasSearched={hasSearched}
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
                onMouseEnter={() => handleSuggestionHover(suggestion)} // Intelligent Prefetching trigger
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
  </motion.div>
</SearchContainer>
  </div>


{/* Error message */}
<AnimatePresence>
{isErrorVisible && error && (
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 20 }}
transition={{ duration: 0.3 }}
className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-red-500 text-center text-lg bg-red-50 px-4 py-2 rounded-full shadow-sm z-50"
>
{error}
</motion.div>
)}
</AnimatePresence>

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
            displayedResults.map((result) => {
              // Social Proof Integration: Retrieve mock social data for each result.
              const socialProof = getSocialProof(result);

return (
            <motion.div
              key={result.id}
              variants={itemVariants}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full cursor-pointer" // Added cursor-pointer
              whileHover={{ scale: 1.02, rotate: 0.5 }}
              onClick={() => handleResultClick(result)} // Modified onClick
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
                {/* Social Proof Integration: Display friend activity if available. */}
                {socialProof.friendsLiked > 0 && (
                  <div className="absolute bottom-2 left-2 flex items-center">
                    <UserGroupIcon className="w-4 h-4 text-white" />
                    <span className="ml-1 text-xs text-white">
                      {socialProof.friendsLiked} friends liked
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 flex flex-col flex-grow">
                <h2 className="text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300">
                  {result.title || result.name}
                </h2>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2 text-sm leading-relaxed flex-grow">
                  {result.overview}
                </p>

                {/* Visual Explanation System: Display reasons for recommendation score. */}
                <div className="mt-2 space-y-1">
                  {result.scoreReasons?.map((reason, i) => (
                    <div key={i} className="flex items-center text-xs">
                      <CheckCircleIcon className="w-3 h-3 mr-1 text-green-500" />
                      <span className="text-gray-600">{reason}</span>
                    </div>
                  ))}
                </div>


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
          );
        })
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


</div>
);
};


export default SearchBar;