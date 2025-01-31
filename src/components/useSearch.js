import { useState, useEffect } from 'react';
import { fetchWithRetry, fetchEnhancedRecommendations } from './SearchBarUtils';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState([]);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resultsToShow, setResultsToShow] = useState(3);
  const [filteredResults, setFilteredResults] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    genre: 'diverse',
    time: 'any',
    type: 'all'
  });

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
      if (query.trim() !== '') fetchSuggestions();
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setIsErrorVisible(false);
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
        result && result.media_type && (result.title || result.name) &&
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
      const filteredRecommendations = recommendations.filter(result =>
        result && result.poster_path && result.overview &&
        result.vote_count > 100 && result.vote_average > 5
      );

      setAllResults(filteredRecommendations);
      setDisplayedResults(filteredRecommendations.slice(0, 3));
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please check your connection and try again.');
      setIsErrorVisible(true);
      setTimeout(() => setIsErrorVisible(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!allResults.length) return;

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

    setFilteredResults(filtered);
    setDisplayedResults(filtered.slice(0, resultsToShow));
  }, [allResults, activeFilters, resultsToShow]);

  const handleShowMore = () => {
    const nextResultsToShow = Math.min(resultsToShow + 3, filteredResults.length, 9);
    setDisplayedResults(filteredResults.slice(0, nextResultsToShow));
    setResultsToShow(nextResultsToShow);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title);
    setSuggestions([]);
    handleSearch();
  };

  return {
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
    handleSuggestionHover: async (suggestion) => {
      try {
        const { data } = await axiosInstance.get(
          `https://api.themoviedb.org/3/${suggestion.type}/${suggestion.id}`,
          { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } }
        );
        fetchEnhancedRecommendations(data);
      } catch (error) {
        console.error('Prefetch error:', error);
        setError('Error prefetching data.');
        setIsErrorVisible(true);
        setTimeout(() => setIsErrorVisible(false), 3000);
      }
    },
    handleResultClick: async (result) => {
      if (!result?.media_type) {
        setError('Unable to get details for this title.');
        setIsErrorVisible(true);
        setTimeout(() => setIsErrorVisible(false), 3000);
        return;
      }

      try {
        const externalIdsResponse = await fetchWithRetry(
          `https://api.themoviedb.org/3/${result.media_type}/${result.id}/external_ids`,
          { api_key: process.env.REACT_APP_TMDB_API_KEY }
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
    }
  };
};