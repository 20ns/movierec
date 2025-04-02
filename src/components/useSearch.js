import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchWithRetry, fetchEnhancedRecommendations, axiosInstance } from './SearchBarUtils';

// Log the API key at the start to verify it's being read
console.log("API Key from environment:", process.env.REACT_APP_TMDB_API_KEY);

// Updated genre maps for better tree-shaking
const GENRE_MAP = {
  movie: new Map([
    [12, 'Adventure'], [14, 'Fantasy'], [16, 'Animation'],
    [18, 'Drama'], [27, 'Horror'], [28, 'Action'],
    [35, 'Comedy'], [36, 'History'], [37, 'Western'],
    [53, 'Thriller'], [80, 'Crime'], [99, 'Documentary'],
    [878, 'Science Fiction'], [9648, 'Mystery'],
    [10402, 'Music'], [10749, 'Romance'], [10751, 'Family'],
    [10752, 'War']
  ]),
  tv: new Map([
    [16, 'Animation'], [18, 'Drama'], [35, 'Comedy'],
    [37, 'Western'], [80, 'Crime'], [99, 'Documentary'],
    [9648, 'Mystery'], [10751, 'Family'], [10759, 'Action & Adventure'],
    [10762, 'Kids'], [10763, 'News'], [10764, 'Reality'],
    [10765, 'Sci-Fi & Fantasy'], [10766, 'Soap'], [10767, 'Talk'],
    [10768, 'War & Politics']
  ])
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
    type: 'all',
    releaseYear: 'any',     // New filter for specific years
    popularity: 'any',      // New filter for popularity level
    contentType: 'any'      // New filter for more specific content types
  });

  const abortControllerRef = useRef(new AbortController());
  const errorTimeoutRef = useRef(null);
  const searchCache = useRef(new Map());

  // Enhanced query intent analyzer to better detect specific title searches
  const analyzeQueryIntent = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    const allGenres = [...GENRE_MAP.movie.values(), ...GENRE_MAP.tv.values()];
  
    // Check if query is likely a specific title (short, no special keywords)
    const isLikelyTitle = query.length > 2 && 
                         query.split(' ').length <= 6 && 
                         !/(starring|with|directed by|genre|year)/i.test(query);
  
    return {
      genre: allGenres.find(genre => lowerQuery.includes(genre.toLowerCase())),
      year: lowerQuery.match(/\b(19|20)\d{2}\b/)?.[0],
      person: lowerQuery.match(/(?:starring|with|directed by|by)\s+([a-z]+\s[a-z]+)/i)?.[1],
      explicitType: lowerQuery.match(/(movie|show|series)/i)?.[0],
      isLikelyTitle: isLikelyTitle
    };
  }, []);

  // Enhanced score calculator that boosts exact or partial title matches
  const calculateScore = useCallback((item, query, queryIntent) => {
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(' ').filter(term => term.length > 1);

    // Direct title match gives a huge boost (for single titles like "Inception")
    const exactTitleMatch = title === queryLower ? 50 : 0;
    
    // Check if the title starts with the query (like "Star" matching "Star Wars")
    const titleStartMatch = title.startsWith(queryLower) ? 30 : 0;
    
    // Check if query is fully contained in the title
    const titleContainsQuery = title.includes(queryLower) ? 20 : 0;
    
    // Improved term matching for partial titles
    const titleMatches = queryTerms.filter(term => title.includes(term)).length;
    const titleMatchRatio = queryTerms.length > 0 ? titleMatches / queryTerms.length : 0;
    const titleMatchScore = titleMatchRatio * 15 * queryTerms.length;

    // Overview matching (less important for title searches)
    const overviewMatches = queryTerms.filter(term => overview.includes(term)).length;
    
    // Pre-calculate reusable values
    const popularity = Math.log10(item.popularity + 1);
    const releaseYear = new Date(item.release_date || item.first_air_date || Date.now()).getFullYear();
    const currentYear = new Date().getFullYear();

    // For likely title searches, prioritize title matches much more highly
    const titleBoost = queryIntent.isLikelyTitle ? 2 : 1;

    // Score calculation with priority on title matches
    return Math.min(
      exactTitleMatch +
      titleStartMatch +
      titleContainsQuery +
      (titleMatchScore * titleBoost) +
      (overviewMatches * 0.2) +
      (popularity * 0.3) +
      ((item.vote_average / 10) * 2) +
      ((currentYear - releaseYear) * -0.1) +
      getIntentBonus(item, queryIntent),
      100
    );
  }, [getIntentBonus]);

  // Memoized intent bonus calculator
  const getIntentBonus = useCallback((item, { genre, year, explicitType }) => {
    let bonus = 0;
    const itemType = item.media_type;
    
    if (genre && item.genre_ids?.some(id => GENRE_MAP[itemType].has(id))) {
      bonus += 2;
    }
    
    if (year && (item.release_date || item.first_air_date).includes(year)) {
      bonus += 1.5;
    }
    
    if (explicitType && itemType === (explicitType.includes('movie') ? 'movie' : 'tv')) {
      bonus += 1;
    }
    
    return bonus;
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

  // Optimized hybrid recommendations with parallel fetching
  const getHybridRecommendations = useCallback(async (primaryResult, searchResults, queryIntent) => {
    try {
      const recommendationSources = [
        fetchDirectorRecommendations(primaryResult),
        fetchCastRecommendations(primaryResult),
        fetchKeywordRecommendations(primaryResult),
        fetchSimilarContent(primaryResult),
        fetchTopSearchResults(searchResults)
      ];

      const results = await Promise.allSettled(recommendationSources);
      
      // Efficient result processing using flatMap
      const allRecs = results.flatMap(({ value = [] }) => value)
        .concat(searchResults)
        .filter(item => item?.id && isValidRecommendation(item));

      // Efficient deduplication using Map
      const uniqueRecs = [...new Map(allRecs.map(item => [item.id, item])).values()]
        .filter(item => item.id !== primaryResult?.id);

      return uniqueRecs.slice(0, 10);
    } catch (error) {
      console.error('Recommendations error:', error);
      return searchResults.slice(0, 10);
    }
  }, [fetchDirectorRecommendations, fetchCastRecommendations, fetchKeywordRecommendations, fetchSimilarContent, fetchTopSearchResults, isValidRecommendation]); // Removed processResult as it's not used directly in getHybridRecommendations

  // Optimized filtered results with memoized genre mapping
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
      
      // New filter: Specific release year filter
      if (activeFilters.releaseYear !== 'any') {
        const targetYear = parseInt(activeFilters.releaseYear, 10);
        if (!isNaN(targetYear) && releaseYear !== targetYear) return false;
      }
      
      // New filter: Popularity filter
      if (activeFilters.popularity !== 'any') {
        const popularity = item.popularity || 0;
        switch (activeFilters.popularity) {
          case 'high':
            if (popularity < 50) return false;
            break;
          case 'medium':
            if (popularity < 20 || popularity >= 50) return false;
            break;
          case 'low':
            if (popularity >= 20) return false;
            break;
        }
      }
      
      // New filter: Content type filter (more specific than just movie/tv)
      if (activeFilters.contentType !== 'any') {
        // Movie content types
        if (item.media_type === 'movie') {
          if (activeFilters.contentType === 'documentary' && !item.genre_ids?.includes(99)) return false;
          if (activeFilters.contentType === 'animation' && !item.genre_ids?.includes(16)) return false;
        }
        
        // TV content types
        if (item.media_type === 'tv') {
          if (activeFilters.contentType === 'reality' && !item.genre_ids?.includes(10764)) return false;
          if (activeFilters.contentType === 'animation' && !item.genre_ids?.includes(16)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Enhanced sorting based on active filters
      if (activeFilters.popularity === 'high') {
        return b.popularity - a.popularity;
      } else if (activeFilters.releaseYear !== 'any') {
        // For year filtering, prioritize exact matches to the selected year
        const aYear = new Date(a.release_date || a.first_air_date).getFullYear();
        const bYear = new Date(b.release_date || b.first_air_date).getFullYear();
        const targetYear = parseInt(activeFilters.releaseYear, 10);
        
        if (aYear === targetYear && bYear !== targetYear) return -1;
        if (bYear === targetYear && aYear !== targetYear) return 1;
      }
      
      // Default sorting by popularity and rating
      return b.popularity - a.popularity || (b.vote_average - a.vote_average);
    });
  }, [allResults, activeFilters]);

  const displayedResults = useMemo(() => {
    const results = filteredResults.slice(0, resultsToShow);
    console.log("Displayed Results:", results); // Debugging log
    return results;
  }, [filteredResults, resultsToShow]);

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

      // Enhanced cache key that includes all filter parameters
      const cacheKey = query.toLowerCase() + JSON.stringify(activeFilters);
      if (searchCache.current.has(cacheKey)) {
        const cachedData = searchCache.current.get(cacheKey);
        // Check if cache is still valid (less than 30 minutes old)
        if (Date.now() - cachedData.timestamp < 30 * 60 * 1000) {
          setAllResults(cachedData.results);
          setIsLoading(false);
          return;
        } else {
          // Remove expired cache
          searchCache.current.delete(cacheKey);
        }
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

      // Enhanced filter to ensure we get quality results with titles
      const searchResults = searchResponse.data.results
        .filter(result =>
          result &&
          (result.title || result.name) &&
          result.media_type !== 'person' && // Exclude person results
          (
            // Include items with posters preferentially for better display
            result.poster_path || 
            // But don't exclude potential exact title matches just because they're missing posters
            (result.title && query.toLowerCase() === result.title.toLowerCase()) ||
            (result.name && query.toLowerCase() === result.name.toLowerCase())
          )
        );
      console.log("Filtered search results:", searchResults);

      if (!searchResults.length) {
        showError('No results found for your search.');
        return;
      }

      // Analyze query intent with improved title detection
      const queryIntent = analyzeQueryIntent(query);

      // Enhanced primary result selection that prefers exact title matches
      const primaryResult = queryIntent.isLikelyTitle
        ? searchResults.find(r => 
            (r.title && r.title.toLowerCase() === query.toLowerCase()) || 
            (r.name && r.name.toLowerCase() === query.toLowerCase())
          ) || searchResults[0]
        : searchResults.reduce((prev, current) =>
            calculateScore(current, query, queryIntent) > calculateScore(prev, query, queryIntent)
              ? current : prev, searchResults[0]);

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
  }, [query, activeFilters, showError, calculateScore, analyzeQueryIntent, getHybridRecommendations]); // Removed processResult and isValidRecommendation, already dependencies of getHybridRecommendations

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
    query, activeFilters, hasSearched, isLoading,
    displayedResults, resultsToShow, error,
    isErrorVisible, isFocused, suggestions,
    handleSearch, handleShowMore, handleSuggestionClick,
    handleSuggestionHover, handleResultClick
  ]);
};