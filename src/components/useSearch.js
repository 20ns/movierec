import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchWithRetry, fetchEnhancedRecommendations, axiosInstance } from './SearchBarUtils';

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

  // Memoized filtered results
  const filteredResults = useMemo(() => {
    if (!allResults.length) return [];
    
    let filtered = [...allResults];
    const currentYear = new Date().getFullYear();

    // Genre Filter
    if (activeFilters.genre === 'specific' && filtered.length > 0) {
      const primaryGenre = filtered[0].genre_ids[0];
      filtered = filtered.filter(item => item.genre_ids.includes(primaryGenre));
    }

    // Time Period Filter
    switch(activeFilters.time) {
      case 'recent':
        filtered = filtered.filter(item => {
          const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
          return currentYear - releaseYear <= 5;
        });
        break;
      case 'classic':
        filtered = filtered.filter(item => {
          const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
          return currentYear - releaseYear > 20;
        });
        break;
      case '90s00s':
        filtered = filtered.filter(item => {
          const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
          return releaseYear >= 1990 && releaseYear <= 2009;
        });
        break;
    }

    // Media Type Filter
    if (activeFilters.type !== 'all') {
      filtered = filtered.filter(item => item.media_type === activeFilters.type);
    }

    return filtered;
  }, [allResults, activeFilters]);

  // Memoized displayed results
  const displayedResults = useMemo(() => 
    filteredResults.slice(0, resultsToShow),
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

      const results = await fetchSuggestions(query, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(results);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(debounceTimer);
    };
  }, [query, fetchSuggestions]);

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

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

      const searchResponse = await fetchWithRetry(
        'https://api.themoviedb.org/3/search/multi',
        {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: query,
          include_adult: false
        },
        { signal: controller.signal }
      );

      const searchResults = searchResponse.data.results.filter(result =>
        result?.media_type && (result.title || result.name) &&
        ['movie', 'tv'].includes(result.media_type)
      );

      if (!searchResults.length) {
        showError('No results found for your search.');
        return;
      }

      const primaryResult = searchResults.reduce((prev, current) => 
        current.popularity > prev.popularity ? current : prev, 
        searchResults[0]
      );

      const recommendations = await fetchEnhancedRecommendations(primaryResult);
      const validRecommendations = recommendations.filter(result =>
        result?.poster_path && result.overview &&
        result.vote_count > 100 && result.vote_average > 5
      );

      setAllResults(validRecommendations);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        showError('Search failed. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [query, showError]);

  const handleShowMore = useCallback(() => {
    setResultsToShow(prev => Math.min(prev + 3, filteredResults.length, 9));
  }, [filteredResults.length]);

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
    handleResultClick
  ]);
};