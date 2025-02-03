import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchWithRetry, fetchEnhancedRecommendations, axiosInstance } from './SearchBarUtils';

// Log the API key at the start to verify it's being read
console.log("API Key from environment:", process.env.REACT_APP_TMDB_API_KEY);

// Genre mapping for better categorization
const GENRE_MAP = {
  movie: {
    12: 'Adventure', 14: 'Fantasy', 16: 'Animation', 18: 'Drama', 27: 'Horror',
    28: 'Action', 35: 'Comedy', 36: 'History', 37: 'Western', 53: 'Thriller',
    80: 'Crime', 99: 'Documentary', 878: 'Science Fiction', 9648: 'Mystery',
    10402: 'Music', 10749: 'Romance', 10751: 'Family', 10752: 'War'
  },
  tv: {
    16: 'Animation', 18: 'Drama', 35: 'Comedy', 37: 'Western', 80: 'Crime',
    99: 'Documentary', 9648: 'Mystery', 10751: 'Family', 10759: 'Action & Adventure',
    10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
    10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
  }
};

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resultsToShow, setResultsToShow] = useState(3);
  const [activeFilters, setActiveFilters] = useState({
    genre: 'diverse',
    time: 'any',
    type: 'all'
  });

  const abortControllerRef = useRef(new AbortController());
  const errorTimeoutRef = useRef(null);
  const searchCache = useRef(new Map());

  // Enhanced query intent analysis
  const analyzeQueryIntent = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    return {
      genre: Object.values(GENRE_MAP.movie).concat(Object.values(GENRE_MAP.tv))
        .find(genre => lowerQuery.includes(genre.toLowerCase())),
      year: lowerQuery.match(/\b(19|20)\d{2}\b/)?.[0],
      person: lowerQuery.match(/(starring|with|directed by|by)\s+([a-z]+\s[a-z]+)/i)?.[2],
      explicitType: lowerQuery.match(/(movie|movies|show|tv show|series)/i)?.[0]
    };
  }, []);

  // Advanced scoring system
  const calculateScore = useCallback((item, query, queryIntent) => {
    const title = (item.title || item.name).toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    const queryTerms = query.toLowerCase().split(' ');

    // Base scores
    const titleMatch = queryTerms.filter(term => title.includes(term)).length / queryTerms.length;
    const overviewMatch = queryTerms.filter(term => overview.includes(term)).length * 0.2;
    const popularityScore = Math.log10(item.popularity + 1) * 0.4;
    const voteScore = (item.vote_average / 10) * 2;
    const recencyScore = (new Date().getFullYear() -
      new Date(item.release_date || item.first_air_date).getFullYear()) * -0.3;

    // Intent bonuses
    let intentBonus = 0;
    const genreIds = item.genre_ids || []; // Handle missing genre_ids
    const mediaType = item.media_type || 'movie'; // Default to movie if media_type is missing
    if (queryIntent.genre && genreIds.some(id => {
      const genreMapForType = GENRE_MAP[mediaType];
      return genreMapForType && Object.values(genreMapForType).includes(queryIntent.genre);
    })) {
      intentBonus += 2;
    }

    if (queryIntent.year && (item.release_date || item.first_air_date)?.includes(queryIntent.year)) {
      intentBonus += 1.5;
    }
    if (queryIntent.explicitType && item.media_type ===
      (queryIntent.explicitType.includes('movie') ? 'movie' : 'tv')) {
      intentBonus += 1;
    }

    let rawScore = titleMatch + overviewMatch + popularityScore + voteScore + recencyScore + intentBonus;

    // Heuristic scaling to percentage (adjust factor as needed)
    let percentageScore = Math.min(Math.max(rawScore * 15, 0), 100); // Scale and clamp between 0 and 100
    return percentageScore; // Return percentage score directly now
  }, []);

  // Helper method to process results from Promise.allSettled
  const processResult = useCallback((result) => {
    return result.status === 'fulfilled' ? result.value : [];
  }, []);

  // Helper method to validate recommendation items
  const isValidRecommendation = useCallback((item) => {
    // More lenient validation
    return item &&
      (item.title || item.name) &&
      (item.poster_path || item.backdrop_path) &&
      item.overview &&
      item.overview.length > 20;
  }, []);


  // Hybrid recommendation fetcher
  const getHybridRecommendations = useCallback(async (primaryResult, searchResults, queryIntent) => {
    try {
      const [
        directorRecs,
        castRecs,
        keywordRecs,
        similarRecs,
        searchRecs
      ] = await Promise.allSettled([
        fetchDirectorRecommendations(primaryResult),
        fetchCastRecommendations(primaryResult),
        fetchKeywordRecommendations(primaryResult),
        fetchSimilarContent(primaryResult),
        fetchTopSearchResults(searchResults)
      ]);

      // Process results with proper error handling
      const allRecs = [
        ...processResult(directorRecs),
        ...processResult(castRecs).flat(),
        ...processResult(keywordRecs),
        ...processResult(similarRecs),
        ...processResult(searchRecs),
        ...searchResults // Include original search results as fallback
      ].filter(Boolean);

      // Remove duplicates and primary result
      const uniqueRecs = allRecs.reduce((acc, current) => {
        if (current.id !== primaryResult?.id &&
          !acc.some(item => item.id === current.id) &&
          isValidRecommendation(current)) {
          acc.push(current);
        }
        return acc;
      }, []);

      return uniqueRecs.length > 0 ? uniqueRecs : searchResults.slice(0, 10);
    } catch (error) {
      console.error('Hybrid recommendations error:', error);
      return searchResults.slice(0, 10); // Fallback to original results
    }
  }, [fetchDirectorRecommendations, fetchCastRecommendations, fetchKeywordRecommendations, fetchSimilarContent, fetchTopSearchResults, processResult, isValidRecommendation]);

  // Memoized filtered results with enhanced logic
  const filteredResults = useMemo(() => {
    if (!allResults.length) return [];

    const currentYear = new Date().getFullYear();

    return allResults.filter(item => {
      // Basic validation
      if (!item.media_type || (!item.title && !item.name)) return false;

      // Get valid release year
      const releaseDate = item.release_date || item.first_air_date || ''; // Handle TV shows
      if (!releaseDate) return false;
      const releaseYear = new Date(releaseDate).getFullYear();
      if (isNaN(releaseYear)) return false;

      // Time period filter
      switch (activeFilters.time) {
        case 'recent':
          if (currentYear - releaseYear > 5) return false;
          break;
        case 'classic':
          if (currentYear - releaseYear <= 20) return false;
          break;
        case '90s00s':
          if (releaseYear < 1990 || releaseYear > 2009) return false;
          break;
      }

      // Media type filter
      if (activeFilters.type !== 'all' && item.media_type !== activeFilters.type) return false;

      return true;
    }).sort((a, b) => {
      // Fallback sorting if primary genres missing
      const primaryGenres = allResults[0]?.genre_ids || [];
      const aMatch = activeFilters.genre === 'diverse'
        ? a.genre_ids?.filter(g => primaryGenres.includes(g)).length || 0
        : 0;
      const bMatch = activeFilters.genre === 'diverse'
        ? b.genre_ids?.filter(g => primaryGenres.includes(g)).length || 0
        : 0;
      return bMatch - aMatch || b.popularity - a.popularity;
    });
  }, [allResults, activeFilters]);

  const displayedResults = useMemo(() => {
    console.log("Displayed Results with matchPercentage:", filteredResults.slice(0, resultsToShow).map(item => ({title: item.title || item.name, matchPercentage: item.matchPercentage}))); // ADDED CONSOLE LOG HERE
    return filteredResults.slice(0, resultsToShow);
  },
    [filteredResults, resultsToShow]
  );

  const showError = useCallback((message, duration = 3000) => {
    setError(message);
    setIsErrorVisible(true);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() =>
      setIsErrorVisible(false), duration
    );
  }, []);

  const fetchSuggestions = useCallback(async (query, signal) => {
    try {
      const response = await fetchWithRetry(
        'https://api.themoviedb.org/3/search/multi',
        {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: query,
          include_adult: false,
          language: 'en-US',
          page: 1
        },
        { signal }
      );

      return response.data.results
        .filter(item => item.title || item.name)
        .slice(0, 3)
        .map(item => ({
          id: item.id,
          title: item.title || item.name,
          type: item.media_type
        }));
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching suggestions:', error);
        showError('Error fetching suggestions. Please try again.');
      }
      return [];
    }
  }, [showError]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const debounceTimer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await fetchSuggestions(query, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching suggestions:', error);
          showError('Error fetching suggestions. Please try again.');
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(debounceTimer);
    };
  }, [query, fetchSuggestions, showError]);

  // Enhanced search handler
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    if (!process.env.REACT_APP_TMDB_API_KEY) {
      console.error("TMDB API Key is missing! Search will not work.");
      showError("API Key missing. Search unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      setIsErrorVisible(false);
      setHasSearched(true);
      setAllResults([]);
      setResultsToShow(3);

      // Check cache first
      const cacheKey = query.toLowerCase() + JSON.stringify(activeFilters);
      if (searchCache.current.has(cacheKey)) {
        const cachedData = searchCache.current.get(cacheKey);
        setAllResults(cachedData.results);
        return;
      }

      // Fetch search results
      console.log("Fetching search results for query:", query);
      const searchResponse = await fetchWithRetry(
        'https://api.themoviedb.org/3/search/multi',
        {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: query,
          include_adult: false,
          language: 'en-US',
          page: 1
        },
        { signal: controller.signal }
      );
      console.log("Raw search API response:", searchResponse);

      const searchResults = searchResponse.data.results
        .filter(result =>
          result &&
          (result.title || result.name) &&
          result.media_type !== 'person' // Exclude person results
        );
      console.log("Filtered search results:", searchResults);

      if (!searchResults.length) {
        showError('No results found for your search.');
        return;
      }

      // Analyze query intent
      const queryIntent = analyzeQueryIntent(query);

      // Select primary result with scoring
      const primaryResult = searchResults.reduce((prev, current) =>
        calculateScore(current, query, queryIntent) > calculateScore(prev, query, queryIntent)
          ? current : prev, searchResults[0]
      );

      // Validation for Primary Result
      if (!primaryResult?.id || !primaryResult.media_type) {
        console.error('Invalid primary result:', primaryResult);
        showError('Unable to find valid results for this search.');
        return;
      }

      // Get hybrid recommendations
      const rawRecommendations = await getHybridRecommendations(
        primaryResult,
        searchResults,
        queryIntent
      );

      // Process recommendations
      const validRecommendations = rawRecommendations
        .filter(item => item.poster_path && item.overview)
        .map(item => ({ // Add score to each item in validRecommendations
          ...item,
          matchPercentage: calculateScore(item, query, queryIntent)
        }))
        .sort((a, b) => b.matchPercentage - a.matchPercentage) // Sort by percentage
        .slice(0, 50);

      // Add Results Validation Before State Update
      if (validRecommendations.length === 0) {
        console.warn('No recommendations, using search results', searchResults);
        const scoredSearchResults = searchResults.slice(0, 10).map(item => ({
          ...item,
          matchPercentage: calculateScore(item, query, queryIntent) // Add score here as well
        }));
        setAllResults(scoredSearchResults);
        return;
      }

      setAllResults(validRecommendations.map(item => ({ // Ensure percentage is also added when setting valid recommendations to state.
        ...item,
        matchPercentage: item.matchPercentage // Percentage is already calculated above, just pass it along.
      })));
      searchCache.current.set(cacheKey, {
        results: validRecommendations,
        timestamp: Date.now()
      });

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        showError('Search failed. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [query, activeFilters, showError, calculateScore, analyzeQueryIntent, getHybridRecommendations, processResult, isValidRecommendation]);

  // Additional recommendation sources
  const fetchDirectorRecommendations = useCallback(async (item) => {
    try {
      const credits = await fetchWithRetry(
        `https://api.themoviedb.org/3/${item.media_type}/${item.id}/credits`,
        { api_key: process.env.REACT_APP_TMDB_API_KEY }
      );

      // Handle TV shows by looking for creators
      const directors = item.media_type === 'tv'
        ? credits.data.crew.filter(c => c.job === 'Executive Producer' || c.department === 'Creator')
        : credits.data.crew.filter(c => c.job === 'Director');

      return directors.length > 0
        ? await fetchPersonWorks(directors[0].id)
        : [];
    } catch (error) {
      console.error('Director recommendations error:', error);
      return [];
    }
  }, [fetchWithRetry, fetchPersonWorks]);

  const fetchCastRecommendations = useCallback(async (item) => {
    console.log("fetchCastRecommendations item:", item); // Log item at start
    try {
      const credits = await fetchWithRetry(
        `https://api.themoviedb.org/3/${item.media_type}/${item.id}/credits`,
         { api_key: process.env.REACT_APP_TMDB_API_KEY }
      );
      console.log('Credits response:', credits); // Log credits response
      if (!credits?.data?.cast || !Array.isArray(credits.data.cast)) { // Enhanced error checks
        return [];
      }
      const topCast = credits.data.cast.slice(0, 3);
      return Promise.all(topCast.map(actor =>
        actor.id ? fetchPersonWorks(actor.id) : [] // Check if actor.id exists
      ));
    } catch (error) {
      console.error('Cast recommendations error:', error);
      return []; // Return empty array on error
    }
  }, [fetchWithRetry, fetchPersonWorks]);


  const fetchKeywordRecommendations = useCallback(async (item) => {
    const keywords = await fetchWithRetry(
      `https://api.themoviedb.org/3/${item.media_type}/${item.id}/keywords`,
       { api_key: process.env.REACT_APP_TMDB_API_KEY }
    );
    const keywordIds = keywords.data.keywords.map(k => k.id).join(',');
    return keywordIds ? fetchWithRetry(
      `https://api.themoviedb.org/3/discover/${item.media_type}`,
      { with_keywords: keywordIds, api_key: process.env.REACT_APP_TMDB_API_KEY }
    ).then(res => res.data.results) : [];
  }, [fetchWithRetry]);

  const fetchSimilarContent = useCallback(async (item) => {
    try {
      const endpoint = item.media_type === 'tv'
        ? `https://api.themoviedb.org/3/tv/${item.id}/recommendations`
        : `https://api.themoviedb.org/3/movie/${item.id}/similar`;

      const response = await fetchWithRetry(
        endpoint,
        { api_key: process.env.REACT_APP_TMDB_API_KEY }
      );
      return response.data.results || [];
    } catch (error) {
      console.error('Similar content error:', error);
      return [];
    }
  }, [fetchWithRetry]);

  const fetchTopSearchResults = useCallback((searchResults) => {
    return Promise.all(
      searchResults.slice(0, 3).map(item =>
        fetchWithRetry(
          `https://api.themoviedb.org/3/${item.media_type}/${item.id}`,
           { api_key: process.env.REACT_APP_TMDB_API_KEY }
        ).catch(error => {
          console.error('Error fetching item details:', error);
          return null;
        })
      )
    ).then(results => results.filter(Boolean).map(res => res.data));
  }, [fetchWithRetry]);

  const fetchPersonWorks = useCallback(async (personId) => {
    return fetchWithRetry(
      `https://api.themoviedb.org/3/person/${personId}/combined_credits`,
       { api_key: process.env.REACT_APP_TMDB_API_KEY }
    ).then(res => res.data.cast);
  }, [fetchWithRetry]);

  const handleShowMore = useCallback(() => {
    setResultsToShow(prev => Math.min(prev + 3, 9));
  }, []);


  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    handleSearch();
  }, [handleSearch]);

  const handleSuggestionHover = useCallback(async (suggestion) => {
    try {
      const { data } = await axiosInstance.get(
        `https://api.themoviedb.org/3/${suggestion.type}/${suggestion.id}`,
        {
          params: { api_key: process.env.REACT_APP_TMDB_API_KEY },
          signal: abortControllerRef.current.signal
        }
      );
      fetchEnhancedRecommendations(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Prefetch error:', error);
        showError('Error prefetching data.');
      }
    }
  }, [showError]);

  const handleResultClick = useCallback(async (result) => {
    if (!result?.media_type) {
      showError('Unable to get details for this title.');
      return;
    }

    try {
      const externalIdsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/${result.media_type}/${result.id}/external_ids`,
        { api_key: process.env.REACT_APP_TMDB_API_KEY },
        { signal: abortControllerRef.current.signal }
      );

      const imdbId = externalIdsResponse.data.imdb_id;
      if (imdbId) {
        window.open(`https://www.imdb.com/title/${imdbId}`, '_blank');
      } else {
        showError('IMDb page not available for this title.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching external IDs:', error);
        showError('Failed to open IMDb page. Please try again.');
      }
    }
  }, [showError]);

  useEffect(() => () => {
    abortControllerRef.current.abort();
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  }, []);


  return useMemo(() => ({
    query,
    setQuery,
    activeFilters,
    setActiveFilters,
    hasSearched,
    isLoading,
    displayedResults,
    filteredResults,
    resultsToShow,
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
  }), [
    query,
    activeFilters,
    hasSearched,
    isLoading,
    displayedResults,
    filteredResults,
    resultsToShow,
    error,
    isErrorVisible,
    isFocused,
    suggestions,
    handleSearch,
    handleShowMore,
    handleSuggestionClick,
    handleSuggestionHover,
    handleResultClick,
    processResult,
    isValidRecommendation
  ]);
};