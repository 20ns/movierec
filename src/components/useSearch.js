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
    contentType: 'any',      // New filter for more specific content types
    searchMode: 'smart' // New filter: 'smart' (default) or 'direct'
  });

  const abortControllerRef = useRef(new AbortController());
  const errorTimeoutRef = useRef(null);
  const searchCache = useRef(new Map());

  // Enhanced query intent analyzer to handle complex patterns
  const analyzeQueryIntent = useCallback((query) => {
    const lowerQuery = query.toLowerCase().trim();
    const allGenres = [...GENRE_MAP.movie.values(), ...GENRE_MAP.tv.values()];
    
    // Define mood keywords and their mappings
    const moodKeywords = {
      'funny': 'exciting', 'comedy': 'exciting', 'laugh': 'exciting', 'lighthearted': 'exciting',
      'happy': 'exciting', 'upbeat': 'exciting', 'hilarious': 'exciting', 'humorous': 'exciting',
      
      'thoughtful': 'thoughtful', 'deep': 'thoughtful', 'meaningful': 'thoughtful', 
      'profound': 'thoughtful', 'philosophical': 'thoughtful', 'thinking': 'thoughtful',
      
      'sad': 'emotional', 'emotional': 'emotional', 'moving': 'emotional', 'touching': 'emotional',
      'heartwarming': 'emotional', 'cry': 'emotional', 'tearjerker': 'emotional',
      
      'scary': 'scary', 'horror': 'scary', 'terrifying': 'scary', 'frightening': 'scary', 
      'spooky': 'scary', 'thriller': 'scary', 'suspense': 'scary', 'creepy': 'scary',
      
      'action': 'exciting', 'exciting': 'exciting', 'thrill': 'exciting', 'adventure': 'exciting',
      'epic': 'exciting', 'action-packed': 'exciting', 'fast-paced': 'exciting'
    };
    
    // Define context keywords for special searches
    const contextKeywords = {
      'date night': 'date', 'date': 'date', 'romantic evening': 'date', 'couples': 'date',
      'family': 'family', 'kids': 'family', 'children': 'family', 'all ages': 'family',
      'alone': 'solo', 'by myself': 'solo', 'solo': 'solo',
      'friends': 'friends', 'group': 'friends', 'party': 'friends',
      'educational': 'learning', 'learn': 'learning', 'informative': 'learning'
    };
    
    // Check if query is a direct title lookup
    const isLikelyTitle = query.length > 2 && 
                         query.split(' ').length <= 6 && 
                         !/(show me|find|looking for|suggest|recommend|watch when|movies like|shows like)/i.test(query);
    
    // Extract imperative command patterns
    const imperative = lowerQuery.match(/^(show me|find|get|give me)/i)?.[0];
    
    // Check for subject/theme keywords
    const extractSubjects = () => {
      // Common subjects people search for
      const subjects = [
        'dragons', 'space', 'zombies', 'vampires', 'superheroes', 'magic', 'time travel', 
        'robots', 'aliens', 'dinosaurs', 'war', 'history', 'fantasy', 'future', 'dystopian',
        'post-apocalyptic', 'medieval', 'western', 'crime', 'heist', 'spy', 'mystery',
        'politics', 'sports', 'music', 'art', 'food', 'travel', 'nature', 'animals',
        'ocean', 'adventure', 'romance', 'coming of age', 'high school', 'college',
        'workplace', 'family', 'friendship'
      ];
      
      return subjects.filter(subject => lowerQuery.includes(subject));
    };
    
    // Extract decade from patterns like "2020s", "80s", "90s"
    const decade = lowerQuery.match(/\b(20[0-9]0s|19[0-9]0s|[0-9]0s)\b/)?.[0];
    // Extract specific year
    const year = lowerQuery.match(/\b(19|20)\d{2}\b/)?.[0];
    // Extract decade from patterns like "2020s", "80s", "90s"
    let timeRange = null;
    if (decade) {
      const decadeMatch = decade.match(/\b(20|19)?([0-9])0s\b/);
      if (decadeMatch) {
        const century = decadeMatch[1] || '19';
        const decadeNumber = decadeMatch[2];
        const startYear = parseInt(`${century}${decadeNumber}0`);
        timeRange = {
          start: startYear,
          end: startYear + 9
        };
      }
    }
    
    // Extract multiple genres
    const genreMatches = allGenres.filter(genre => 
      lowerQuery.includes(genre.toLowerCase())
    );

    // Check for "movies like X" or "shows like X" patterns
    const similarityMatch = lowerQuery.match(/(movies|shows|films|series)\s+like\s+([a-z0-9 ']+)(\s+but\s+([a-z0-9 ]+))?/i);
    let similarTo = null;
    let modifierType = null;
    
    if (similarityMatch) {
      similarTo = similarityMatch[2].trim();
      
      // Extract modifier relationship if exists (e.g., "but more family-friendly")
      if (similarityMatch[4]) {
        const modifier = similarityMatch[4].trim();
        
        // Detect common modifier patterns
        if (/more|less|better|worse|darker|lighter/i.test(modifier)) {
          if (/family|kid/i.test(modifier)) modifierType = 'family-friendly';
          else if (/dark|serious|gritty/i.test(modifier)) modifierType = 'darker';
          else if (/fun|light|happy/i.test(modifier)) modifierType = 'lighter';
          else if (/scar(y|ier)|horror|terrifying/i.test(modifier)) modifierType = 'scarier';
          else if (/action|exciting|thrill/i.test(modifier)) modifierType = 'more-action';
          else if (/drama|emotional|moving/i.test(modifier)) modifierType = 'more-dramatic';
          else if (/comedy|funny|humor/i.test(modifier)) modifierType = 'funnier';
          else modifierType = 'general-modifier';
        }
      }
    }
    
    // Find mood in the query
    const foundMoodWords = Object.keys(moodKeywords).filter(word => 
      lowerQuery.includes(word)
    );
    const mood = foundMoodWords.length > 0 ? 
      moodKeywords[foundMoodWords[0]] : null;
    
    // Find context in the query
    const foundContextWords = Object.keys(contextKeywords).filter(word => 
      lowerQuery.includes(word)
    );
    const context = foundContextWords.length > 0 ?
      contextKeywords[foundContextWords[0]] : null;
    
    // Check for "when feeling X" pattern for emotional state queries
    const emotionalState = lowerQuery.match(/when\s+(feeling|i'?m|im|i am)\s+([a-z]+)/i)?.[2];
    
    return {
      genres: genreMatches,
      year: year,
      decade: decade,
      timeRange: timeRange,
      person: lowerQuery.match(/(?:starring|with|directed by|by)\s+([a-z]+\s[a-z]+)/i)?.[1],
      explicitType: lowerQuery.match(/(movie|film|show|series)/i)?.[0],
      isLikelyTitle: isLikelyTitle,
      imperative: imperative,
      subjects: extractSubjects(),
      similarTo: similarTo,
      modifierType: modifierType,
      mood: mood,
      context: context,
      emotionalState: emotionalState
    };
  }, []);

  // Enhanced score calculator for intent-based matching
  const calculateScore = useCallback((item, query, queryIntent) => {
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(' ').filter(term => term.length > 1);

    // Direct title match gives a huge boost
    const exactTitleMatch = title === queryLower ? 50 : 0;
    const titleStartMatch = title.startsWith(queryLower) ? 30 : 0;
    const titleContainsQuery = title.includes(queryLower) ? 20 : 0;
    
    // Improved term matching for partial titles
    const titleMatches = queryTerms.filter(term => title.includes(term)).length;
    const titleMatchRatio = queryTerms.length > 0 ? titleMatches / queryTerms.length : 0;
    const titleMatchScore = titleMatchRatio * 15 * queryTerms.length;

    // Overview matching with special handling for subject matches
    const overviewMatches = queryTerms.filter(term => overview.includes(term)).length;
    
    // Subject matching (dragons, space, etc.)
    let subjectBoost = 0;
    if (queryIntent.subjects.length > 0) {
      const subjectMatches = queryIntent.subjects.filter(subject => 
        overview.includes(subject.toLowerCase()) || title.includes(subject.toLowerCase())
      );
      subjectBoost = subjectMatches.length * 15;
    }
    
    // Handle time range matches
    let timeRangeBoost = 0;
    if (queryIntent.timeRange) {
      const releaseYear = new Date(item.release_date || item.first_air_date || Date.now()).getFullYear();
      if (releaseYear >= queryIntent.timeRange.start && releaseYear <= queryIntent.timeRange.end) {
        timeRangeBoost = 10;
      }
    }
    
    // Mood and context boosting
    let moodBoost = 0;
    if (queryIntent.mood) {
      // Map genres to moods for scoring
      const moodGenreMappings = {
        'exciting': [28, 12, 35, 10751, 10752], // Action, Adventure, Comedy, Family, War
        'thoughtful': [18, 99, 36, 9648],       // Drama, Documentary, History, Mystery
        'emotional': [10749, 18, 10751],        // Romance, Drama, Family
        'scary': [27, 9648, 53]                 // Horror, Mystery, Thriller
      };
      
      if (moodGenreMappings[queryIntent.mood] && 
          item.genre_ids.some(id => moodGenreMappings[queryIntent.mood].includes(id))) {
        moodBoost = 20;
      }
    }
    
    // Context-based scoring
    let contextBoost = 0;
    if (queryIntent.context) {
      const contextGenreMappings = {
        'date': [10749, 35, 18],        // Romance, Comedy, Drama
        'family': [10751, 16, 12, 35],  // Family, Animation, Adventure, Comedy
        'friends': [35, 28, 12],        // Comedy, Action, Adventure
        'solo': [18, 9648, 53, 878],    // Drama, Mystery, Thriller, Sci-Fi
        'learning': [99, 36]            // Documentary, History
      };
      
      if (contextGenreMappings[queryIntent.context] &&
          item.genre_ids.some(id => contextGenreMappings[queryIntent.context].includes(id))) {
        contextBoost = 15;
      }
    }
    
    // Emotional state matching
    let emotionalStateBoost = 0;
    if (queryIntent.emotionalState) {
      const emotionGenreMappings = {
        'sad': [35, 12, 10751, 16],      // Comedy, Adventure, Family, Animation (uplifting content)
        'happy': [35, 10749, 10751],     // Comedy, Romance, Family
        'bored': [28, 12, 878, 53],      // Action, Adventure, Sci-Fi, Thriller
        'stressed': [35, 10751, 14],     // Comedy, Family, Fantasy
        'lonely': [10749, 18, 35],       // Romance, Drama, Comedy
        'tired': [35, 16, 10751],        // Comedy, Animation, Family
        'angry': [35, 10751, 14, 16]     // Comedy, Family, Fantasy, Animation
      };
      
      const emotion = queryIntent.emotionalState.toLowerCase();
      if (emotionGenreMappings[emotion] &&
          item.genre_ids.some(id => emotionGenreMappings[emotion].includes(id))) {
        emotionalStateBoost = 25;
      }
    }
    
    // Handle similarity search scoring
    let similarityBoost = 0;
    if (queryIntent.similarTo && item.similarityScore) {
      similarityBoost = item.similarityScore * 0.5;
    }
    
    // Pre-calculate reusable values
    const popularity = Math.log10(item.popularity + 1);
    const releaseYear = new Date(item.release_date || item.first_air_date || Date.now()).getFullYear();
    const currentYear = new Date().getFullYear();

    // For likely title searches, prioritize title matches much more highly
    const titleBoost = queryIntent.isLikelyTitle ? 2 : 1;

    // Enhanced score calculation
    return Math.min(
      exactTitleMatch +
      titleStartMatch +
      titleContainsQuery +
      (titleMatchScore * titleBoost) +
      (overviewMatches * 0.2) +
      subjectBoost +
      timeRangeBoost +
      moodBoost +
      contextBoost + 
      emotionalStateBoost +
      similarityBoost +
      (popularity * 0.3) +
      ((item.vote_average / 10) * 2) +
      ((currentYear - releaseYear) * -0.1) +
      getIntentBonus(item, queryIntent),
      100
    );
  }, [getIntentBonus]);

  // Modify getIntentBonus to handle multiple genres
  const getIntentBonus = useCallback((item, queryIntent) => {
    let bonus = 0;
    const itemType = item.media_type || 'movie';
    
    // Handle multiple genres
    if (queryIntent.genres && queryIntent.genres.length > 0) {
      // Check how many of the requested genres match
      const matchCount = queryIntent.genres.filter(genre => {
        const genreId = [...GENRE_MAP[itemType]].find(([id, name]) => name === genre)?.[0];
        return genreId && item.genre_ids?.includes(genreId);
      }).length;
      
      if (matchCount > 0) {
        bonus += matchCount * 5; // 5 points per matched genre
      }
    }
    
    if (queryIntent.year && (item.release_date || item.first_air_date)?.includes(queryIntent.year)) {
      bonus += 10;
    }
    
    if (queryIntent.timeRange) {
      const releaseYear = new Date(item.release_date || item.first_air_date || Date.now()).getFullYear();
      if (releaseYear >= queryIntent.timeRange.start && releaseYear <= queryIntent.timeRange.end) {
        bonus += 8;
      }
    }
    
    if (queryIntent.explicitType) {
      const requestedType = queryIntent.explicitType.toLowerCase();
      const isMovie = requestedType.includes('movie') || requestedType.includes('film');
      const isShow = requestedType.includes('show') || requestedType.includes('series') || requestedType.includes('tv');
      
      if ((isMovie && itemType === 'movie') || (isShow && itemType === 'tv')) {
        bonus += 12;
      }
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

    // Check for API key
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

      // Check if this is a direct search
      if (activeFilters.searchMode === 'direct') {
        await handleDirectSearch(query, controller.signal);
        return;
      }

      // Parse query intent first
      const queryIntent = analyzeQueryIntent(query);
      console.log("Detected query intent:", queryIntent);

      // Handle similarity searches differently
      if (queryIntent.similarTo) {
        await handleSimilaritySearch(query, queryIntent, controller.signal);
        return;
      }

      // Enhanced cache key that includes all filter parameters and intent
      const cacheKey = query.toLowerCase() + JSON.stringify(activeFilters) + JSON.stringify(queryIntent);
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

      // Build search parameters based on intent
      let searchParams = {
        api_key: process.env.REACT_APP_TMDB_API_KEY,
        query: queryIntent.isLikelyTitle ? query : query.replace(/^(show me|find|get|give me)\s+/i, ''),
        include_adult: false,
        language: 'en-US',
        page: 1
      };

      console.log("Fetching search results for query:", query);
      
      // If we have detected a mood but no direct title, use discover endpoint instead
      let endpointType = 'search/multi';
      if ((queryIntent.mood || queryIntent.emotionalState || queryIntent.context) && 
          !queryIntent.isLikelyTitle && queryIntent.genres.length > 0) {
        
        endpointType = 'discover/movie'; // Default to movies for mood searches
        
        // Map detected mood to genre IDs
        const moodGenreMappings = {
          'exciting': [28, 12, 35],      // Action, Adventure, Comedy
          'thoughtful': [18, 99, 36],    // Drama, Documentary, History
          'emotional': [10749, 18],      // Romance, Drama
          'scary': [27, 9648, 53]        // Horror, Mystery, Thriller
        };
        
        // Convert genre names to IDs
        const genreIds = queryIntent.genres.map(genreName => {
          return [...GENRE_MAP.movie].find(([id, name]) => name === genreName)?.[0];
        }).filter(Boolean);

        // Add mood genres if available
        if (queryIntent.mood && moodGenreMappings[queryIntent.mood]) {
          genreIds.push(...moodGenreMappings[queryIntent.mood]);
        }
        
        // Use discover API with genre parameters
        searchParams = {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          with_genres: [...new Set(genreIds)].join(','), // Deduplicate genres
          sort_by: 'popularity.desc',
          include_adult: false,
          language: 'en-US',
          page: 1
        };
        
        // Add year filter if present
        if (queryIntent.year) {
          if (endpointType === 'discover/movie') {
            searchParams.primary_release_year = queryIntent.year;
          } else {
            searchParams.first_air_date_year = queryIntent.year;
          }
        }
        
        // Add decade range filter if present
        if (queryIntent.timeRange) {
          if (endpointType === 'discover/movie') {
            searchParams['primary_release_date.gte'] = `${queryIntent.timeRange.start}-01-01`;
            searchParams['primary_release_date.lte'] = `${queryIntent.timeRange.end}-12-31`;
          } else {
            searchParams['first_air_date.gte'] = `${queryIntent.timeRange.start}-01-01`;
            searchParams['first_air_date.lte'] = `${queryIntent.timeRange.end}-12-31`;
          }
        }
      }

      const searchResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/${endpointType}`,
        searchParams,
        { signal: controller.signal }
      );
      
      console.log("Raw search API response:", searchResponse);

      // Process search results
      let searchResults = [];
      if (endpointType === 'search/multi') {
        searchResults = searchResponse.data.results
          .filter(result =>
            result &&
            (result.title || result.name) &&
            result.media_type !== 'person' && // Exclude person results
            (
              result.poster_path || 
              (result.title && query.toLowerCase() === result.title.toLowerCase()) ||
              (result.name && query.toLowerCase() === result.name.toLowerCase())
            )
          );
      } else {
        // For discover endpoint, we need to add media_type
        searchResults = searchResponse.data.results
          .filter(result => result && (result.title || result.name))
          .map(result => ({
            ...result,
            media_type: endpointType.includes('movie') ? 'movie' : 'tv'
          }));
      }
      
      console.log("Filtered search results:", searchResults);

      if (!searchResults.length) {
        showError('No results found for your search.');
        setIsLoading(false);
        return;
      }

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
        setIsLoading(false);
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
        .map(item => ({ 
          ...item,
          matchPercentage: calculateScore(item, query, queryIntent),
          queryIntent: queryIntent // Store the intent that generated these results
        }))
        .sort((a, b) => b.matchPercentage - a.matchPercentage)
        .slice(0, 50);

      // Add Results Validation Before State Update
      if (validRecommendations.length === 0) {
        console.warn('No recommendations, using search results', searchResults);
        const scoredSearchResults = searchResults.slice(0, 10).map(item => ({
          ...item,
          matchPercentage: calculateScore(item, query, queryIntent),
          queryIntent: queryIntent
        }));
        setAllResults(scoredSearchResults);
        return;
      }

      setAllResults(validRecommendations);
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
  }, [query, activeFilters, showError, calculateScore, analyzeQueryIntent, getHybridRecommendations, handleDirectSearch, handleSimilaritySearch]);

  // New function to handle "movies like X" searches with better title matching
  const handleSimilaritySearch = useCallback(async (query, queryIntent, signal) => {
    try {
      console.log("Handling similarity search for:", queryIntent.similarTo);
      
      // First, search for the reference media
      const referenceSearch = await fetchWithRetry(
        'https://api.themoviedb.org/3/search/multi',
        {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          query: queryIntent.similarTo,
          include_adult: false,
          language: 'en-US',
          page: 1
        },
        { signal }
      );
      
      // Check if we have any results at all
      if (!referenceSearch.data.results || referenceSearch.data.results.length === 0) {
        // Try searching for the title directly with a relaxed filter
        console.log(`No results for "${queryIntent.similarTo}", trying direct search`);
        const directSearch = await fetchWithRetry(
          'https://api.themoviedb.org/3/search/multi',
          {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            query: queryIntent.similarTo,
            include_adult: true, // Allow more results
            language: 'en-US',
            page: 1
          },
          { signal }
        );
        
        if (!directSearch.data.results || directSearch.data.results.length === 0) {
          showError(`Couldn't find anything related to "${queryIntent.similarTo}". Try another title.`);
          setIsLoading(false);
          return;
        }
        
        // Return the direct search results as a fallback
        setAllResults(directSearch.data.results
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .map(item => ({
            ...item,
            matchPercentage: 50, // Default match percentage
            queryIntent: {
              ...queryIntent,
              directSearch: true
            }
          }))
        );
        setIsLoading(false);
        return;
      }
      
      // Get the most relevant result as our reference
      const referenceMedia = referenceSearch.data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .sort((a, b) => b.popularity - a.popularity)[0];
        
      if (!referenceMedia) {
        showError(`Couldn't find "${queryIntent.similarTo}". Try another title.`);
        setIsLoading(false);
        return;
      }
      
      console.log("Reference media found:", referenceMedia.title || referenceMedia.name);
      
      // Get details of the reference media to understand its characteristics
      const detailsResponse = await fetchWithRetry(
        `https://api.themoviedb.org/3/${referenceMedia.media_type}/${referenceMedia.id}`,
        { 
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          append_to_response: 'keywords,credits'
        },
        { signal }
      );
      
      const referenceDetails = detailsResponse.data;
      
      // Try to get similar content
      let similarResults = [];
      
      try {
        // First, try the /similar endpoint
        const similarResponse = await fetchWithRetry(
          `https://api.themoviedb.org/3/${referenceMedia.media_type}/${referenceMedia.id}/similar`,
          { api_key: process.env.REACT_APP_TMDB_API_KEY },
          { signal }
        );
        
        similarResults = similarResponse.data.results.map(item => ({
          ...item,
          media_type: referenceMedia.media_type
        }));
        
        // If we don't have enough results, try recommendations
        if (similarResults.length < 5) {
          const recommendationsResponse = await fetchWithRetry(
            `https://api.themoviedb.org/3/${referenceMedia.media_type}/${referenceMedia.id}/recommendations`,
            { api_key: process.env.REACT_APP_TMDB_API_KEY },
            { signal }
          );
          
          const recommendationResults = recommendationsResponse.data.results.map(item => ({
            ...item,
            media_type: referenceMedia.media_type
          }));
          
          // Combine with existing results, ensuring no duplicates
          const existingIds = new Set(similarResults.map(item => item.id));
          for (const item of recommendationResults) {
            if (!existingIds.has(item.id)) {
              similarResults.push(item);
              existingIds.add(item.id);
            }
          }
        }
        
        // If still not enough results, use the genre-based discover endpoint
        if (similarResults.length < 8 && referenceDetails.genres && referenceDetails.genres.length > 0) {
          const genreIds = referenceDetails.genres.map(g => g.id).join(',');
          
          const discoverResponse = await fetchWithRetry(
            `https://api.themoviedb.org/3/discover/${referenceMedia.media_type}`,
            { 
              api_key: process.env.REACT_APP_TMDB_API_KEY,
              with_genres: genreIds,
              sort_by: 'popularity.desc'
            },
            { signal }
          );
          
          const discoverResults = discoverResponse.data.results.map(item => ({
            ...item,
            media_type: referenceMedia.media_type
          }));
          
          // Add unique discover results
          const existingIds = new Set(similarResults.map(item => item.id));
          for (const item of discoverResults) {
            if (!existingIds.has(item.id) && item.id !== referenceMedia.id) {
              similarResults.push(item);
              existingIds.add(item.id);
            }
          }
        }
      } catch (error) {
        console.warn('Error getting similar content, falling back to direct search:', error);
        // If we can't get similar content, fall back to returning the reference media and
        // potentially other search results
        similarResults = [
          { ...referenceMedia },
          ...referenceSearch.data.results
            .filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && 
                            item.id !== referenceMedia.id)
            .slice(0, 10)
        ];
      }
      
      // If we have a modifier, adjust the results
      if (queryIntent.modifierType && similarResults.length > 0) {
        console.log("Applying modifier:", queryIntent.modifierType);
          
        // Apply the modifier to filter/modify results
        switch(queryIntent.modifierType) {
          case 'family-friendly':
            // Filtering for family-friendly: lower violence, no adult content
            similarResults = similarResults.filter(item => 
              item.adult === false && 
              (item.genre_ids.includes(10751) || // Family genre
               item.genre_ids.includes(16) || // Animation
               !item.genre_ids.includes(27)) // Not horror
            );
            break;
            
          // ...existing modifier cases...
        }
      }
      
      // Always include the reference media at the top of the results
      const formattedResults = [
        {
          ...referenceMedia,
          matchPercentage: 100,
          queryIntent: {
            ...queryIntent,
            referenceName: referenceMedia.title || referenceMedia.name
          },
          referenceName: referenceMedia.title || referenceMedia.name,
          isReferenceMedia: true // Mark this as the reference media
        },
        ...similarResults
          .filter(item => item.id !== referenceMedia.id)
          .map(item => {
            // Calculate base similarity score
            const genreSimilarity = item.genre_ids && referenceDetails.genres ? 
              item.genre_ids.filter(
                g => referenceDetails.genres.map(rg => rg.id).includes(g)
              ).length / Math.max(item.genre_ids.length, 1) : 0.5;
            
            const similarityScore = Math.round(genreSimilarity * 70);
            
            return {
              ...item,
              similarityScore,
              matchPercentage: calculateScore(item, query, queryIntent),
              queryIntent: {
                ...queryIntent,
                referenceName: referenceMedia.title || referenceMedia.name
              },
              referenceName: referenceMedia.title || referenceMedia.name
            };
          })
          .sort((a, b) => b.similarityScore - a.similarityScore)
      ];
      
      setAllResults(formattedResults);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Similarity search error:', error);
        showError('Search failed. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [showError, fetchWithRetry, calculateScore]);

  // Add direct search function
  const handleDirectSearch = useCallback(async (query, signal) => {
    try {
      setIsLoading(true);
      console.log("Performing direct title search for:", query);
      
      const searchResponse = await fetchWithRetry(
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
      
      const results = searchResponse.data.results
        .filter(result => 
          result &&
          (result.media_type === 'movie' || result.media_type === 'tv') &&
          (result.title || result.name)
        )
        .map(item => ({
          ...item,
          matchPercentage: 100,
          directSearch: true
        }));
        
      if (results.length === 0) {
        showError('No results found. Try a different search term.');
      } else {
        setAllResults(results);
        setHasSearched(true);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Direct search error:', error);
        showError('Search failed. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithRetry, showError]);

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