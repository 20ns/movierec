import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

// Convert to forwardRef to accept ref from parent
const PersonalizedRecommendations = forwardRef(({ currentUser, isAuthenticated, preferencesUpdated = 0, userPreferences: propUserPreferences }, ref) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isThinking, setIsThinking] = useState(true); 
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [shownRecommendations, setShownRecommendations] = useState(new Set());
  
  // Add fetch lock to prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const initialFetchCompletedRef = useRef(false);
  
  // Update local state when props change, but prevent triggering unnecessary fetches
  useEffect(() => {
    if (propUserPreferences) {
      setUserPreferences(propUserPreferences);
      
      // Only trigger a fetch if recommendations are empty and we haven't already fetched
      if (propUserPreferences && recommendations.length === 0 && !isLoading && !isRefreshing && !isFetchingRef.current && !initialFetchCompletedRef.current) {
        fetchRecommendations();
      }
    }
  }, [propUserPreferences]);

  // Define the fetchGenericRecommendations function using useCallback before it's used
  const fetchGenericRecommendations = useCallback(async () => {
    try {
      const response = await axios.get(
        'https://api.themoviedb.org/3/trending/all/week',
        {
          params: {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            page: Math.floor(Math.random() * 5) + 1 // Random page between 1-5 for variety
          }
        }
      );
      
      // Filter out any previously shown recommendations
      let formattedResults = response.data.results
        .filter(item => item.poster_path && item.overview && !shownRecommendations.has(item.id))
        .map(item => ({
          ...item,
          score: Math.round((item.vote_average / 10) * 100)
        }))
        .slice(0, 6);
      
      // If we still don't have enough, try another source (top rated)
      if (formattedResults.length < 3) {
        try {
          const topRatedResponse = await axios.get(
            'https://api.themoviedb.org/3/movie/top_rated',
            {
              params: {
                api_key: process.env.REACT_APP_TMDB_API_KEY,
                page: Math.floor(Math.random() * 5) + 1
              }
            }
          );
          
          const existingIds = new Set(formattedResults.map(item => item.id));
          
          const additionalResults = topRatedResponse.data.results
            .filter(item => 
              item.poster_path && 
              item.overview && 
              !existingIds.has(item.id) && 
              !shownRecommendations.has(item.id)
            )
            .map(item => ({
              ...item,
              media_type: 'movie',
              score: Math.round((item.vote_average / 10) * 100)
            }))
            .slice(0, 3 - formattedResults.length);
            
          formattedResults = [...formattedResults, ...additionalResults];
        } catch (err) {
          console.error('Error fetching top rated as fallback:', err);
        }
      }
        
      if (formattedResults.length > 0) {
        setRecommendations(formattedResults);
        // Track these recommendations to avoid repeats
        setShownRecommendations(prev => {
          const newShown = new Set(prev);
          formattedResults.forEach(item => newShown.add(item.id));
          return newShown;
        });
      }
    } catch (error) {
      console.error('Error fetching generic recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [shownRecommendations]);

  // Add this new supplementary recommendations function after fetchGenericRecommendations
  const fetchSupplementaryRecommendations = useCallback(async (currentCount, existingIds = new Set()) => {
    // Only fetch if we need more recommendations to reach minimum count
    const minRecommendationCount = 3;
    const neededCount = Math.max(0, minRecommendationCount - currentCount);
    
    if (neededCount <= 0) return [];
    
    try {
      // Try to get a mix of top-rated and popular content
      const [topRatedResponse, popularResponse] = await Promise.all([
        axios.get('https://api.themoviedb.org/3/movie/top_rated', {
          params: {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            page: Math.floor(Math.random() * 5) + 1
          }
        }),
        axios.get('https://api.themoviedb.org/3/movie/popular', {
          params: {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
            page: Math.floor(Math.random() * 3) + 1
          }
        })
      ]);
  
      // Combine and filter results
      const supplementaryResults = [
        ...topRatedResponse.data.results.map(item => ({ ...item, media_type: 'movie' })),
        ...popularResponse.data.results.map(item => ({ ...item, media_type: 'movie' }))
      ]
      // Filter out items that don't have posters or descriptions
      .filter(item => 
        item.poster_path && 
        item.overview && 
        !existingIds.has(item.id) && 
        !shownRecommendations.has(item.id)
      )
      // Map them to have the same structure as our regular recommendations
      .map(item => ({
        ...item,
        score: Math.round((item.vote_average / 10) * 100)
      }));
  
      // Return just what we need, prioritizing top-rated content
      return supplementaryResults
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, neededCount);
    } catch (error) {
      console.error('Error fetching supplementary recommendations:', error);
      return [];
    }
  }, [shownRecommendations]);

  // Function to fetch user's latest preferences - now only used as a fallback
  const fetchLatestPreferences = useCallback(async () => {
    // This function now serves as a fallback if props don't have preferences
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      return null;
    }
    
    if (propUserPreferences) {
      return propUserPreferences;
    }
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setUserPreferences(data);
          return data;
        }
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
    return null;
  }, [currentUser, isAuthenticated, propUserPreferences]);
  
  // Fetch user preferences - with safeguards against unnecessary fetches
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setIsLoading(false);
      setIsThinking(false);
      return;
    }
    
    // Try to get preferences from localStorage first for immediate display
    const localPrefs = localStorage.getItem('userPrefs');
    if (localPrefs) {
      try {
        const parsedPrefs = JSON.parse(localPrefs);
        setUserPreferences(parsedPrefs);
      } catch (e) {
        console.error('Failed to parse local preferences', e);
      }
    }
    
    // Only fetch preferences if we don't already have them from props
    if (!propUserPreferences) {
      fetchLatestPreferences();
    }
  }, [currentUser?.signInUserSession?.accessToken?.jwtToken, isAuthenticated]);

  // Fetch user favorites - with safeguards
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setIsLoading(false);
      setIsThinking(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );

        if (!response.ok) throw new Error('Failed to fetch favorites');
        
        const data = await response.json();
        if (data && data.items && data.items.length > 0) {
          setUserFavorites(data.items);
          
          // Extract genres from favorites for recommendation
          const genrePromises = data.items.map(item => 
            axios.get(`https://api.themoviedb.org/3/${item.mediaType}/${item.mediaId}`, {
              params: { api_key: process.env.REACT_APP_TMDB_API_KEY }
            })
          );
          
          const genreResults = await Promise.all(genrePromises.map(p => p.catch(e => null)));
          const allGenres = genreResults
            .filter(Boolean)
            .flatMap(res => res.data?.genres?.map(g => g.id) || []);
          
          // Get most common genres
          const genreCount = {};
          allGenres.forEach(g => {
            genreCount[g] = (genreCount[g] || 0) + 1;
          });
          
          const topGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);
            
          setFavoriteGenres(topGenres);
        }
      } catch (error) {
        console.error('Error fetching user favorites:', error);
      }
    };
    
    fetchFavorites();
  }, [currentUser?.signInUserSession?.accessToken?.jwtToken, isAuthenticated]);

  // Enhanced function to fetch recommendations based on preferences first, then favorites
  const fetchRecommendations = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }
    
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsThinking(false);
      return;
    }
    
    try {
      // Set fetch lock
      isFetchingRef.current = true;
      
      // Start the thinking animation
      setIsThinking(true);
      setIsLoading(true);
      
      // Check if we have preferences (from props or state)
      const effectivePreferences = userPreferences || propUserPreferences;
      
      // Immediately use preferences if available, otherwise fetch
      let prefsToUse = effectivePreferences;
      if (!effectivePreferences) {
        prefsToUse = await fetchLatestPreferences();
      }
      
      const hasPreferences = prefsToUse && 
        (prefsToUse.favoriteGenres?.length > 0 || 
         prefsToUse.contentType || 
         prefsToUse.eraPreferences?.length > 0 ||
         prefsToUse.moodPreferences?.length > 0 ||
         prefsToUse.languagePreferences?.length > 0);
         
      const hasFavorites = favoriteGenres.length > 0;
      
      // Exit early if we have neither preferences nor favorites
      if (!hasPreferences && !hasFavorites) {
        console.log('No preferences or favorites, showing generic recommendations');
        setDataSource('none');
        await fetchGenericRecommendations();
        return;
      }

      // Determine which data source to use for recommendations
      // Prioritize preferences over favorites
      if (hasPreferences) {
        setDataSource(hasFavorites ? 'both' : 'preferences');
      } else {
        setDataSource('favorites');
      }
      
      // Determine content type from preferences, favorites, or random if neither specifies
      let mediaType;
      
      if (prefsToUse?.contentType === 'movies') {
        mediaType = 'movie';
      } else if (prefsToUse?.contentType === 'tv') {
        mediaType = 'tv';
      } else if (hasFavorites && userFavorites.length > 0) {
        // Count movie vs TV favorites
        const movieCount = userFavorites.filter(f => f.mediaType === 'movie').length;
        const tvCount = userFavorites.filter(f => f.mediaType === 'tv').length;
        mediaType = movieCount > tvCount ? 'movie' : 'tv';
      } else {
        // Default to movie if no preference is available
        mediaType = 'movie';
      }
      
      const endpoint = mediaType;
      
      // Determine which genres to use - prioritizing preferences
      let genresToUse = [];
      
      if (hasPreferences && prefsToUse.favoriteGenres?.length > 0) {
        // Use preference genres first
        genresToUse = prefsToUse.favoriteGenres;
      } else if (hasFavorites) {
        // Fall back to favorites-derived genres if no preference genres
        genresToUse = favoriteGenres;
      }
      
      // Era preferences from the user's settings
      let yearParams = {};
      if (hasPreferences && prefsToUse.eraPreferences?.length > 0) {
        if (prefsToUse.eraPreferences.includes('classic')) {
          yearParams = { 'release_date.lte': '1980-12-31' };
        } else if (prefsToUse.eraPreferences.includes('modern')) {
          yearParams = { 
            'release_date.gte': '1980-01-01',
            'release_date.lte': '2010-12-31'
          };
        } else if (prefsToUse.eraPreferences.includes('recent')) {
          yearParams = { 'release_date.gte': '2011-01-01' };
        }
      }
      
      // Add mood-based parameters
      let moodParams = {};
      if (hasPreferences && prefsToUse.moodPreferences?.length > 0) {
        if (prefsToUse.moodPreferences.includes('exciting')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',28,12,10752'; // Action, Adventure, War
        }
        if (prefsToUse.moodPreferences.includes('funny')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',35,16'; // Comedy, Animation
        }
        if (prefsToUse.moodPreferences.includes('thoughtful')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',18,99,36'; // Drama, Documentary, History
        }
        if (prefsToUse.moodPreferences.includes('scary')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',27,9648,53'; // Horror, Mystery, Thriller
        }
        if (prefsToUse.moodPreferences.includes('emotional')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',10749,18,10751'; // Romance, Drama, Family
        }
      }
      
      // Add language/region preferences
      let regionParams = {};
      if (hasPreferences && prefsToUse.languagePreferences?.length > 0) {
        // Map language preferences to region and language codes
        const languageMap = {
          'hollywood': { region: 'US', language: 'en' },
          'bollywood': { region: 'IN', language: 'hi' },
          'korean': { region: 'KR', language: 'ko' },
          'japanese': { region: 'JP', language: 'ja' },
          'european': { region: 'GB,FR,DE,IT,ES', language: 'en,fr,de,it,es' },
          'international': {} // No specific region/language for international
        };
        
        // Find the first matching language preference
        for (const pref of prefsToUse.languagePreferences) {
          if (languageMap[pref]) {
            if (languageMap[pref].region) {
              regionParams.region = languageMap[pref].region;
            }
            if (languageMap[pref].language) {
              regionParams.with_original_language = languageMap[pref].language;
            }
            break; // Use the first matching preference
          }
        }

        // Special handling for Bollywood - ensure we get Hindi films from India
        if (prefsToUse.languagePreferences.includes('bollywood')) {
          console.log("Applying Bollywood preference");
          regionParams.region = 'IN';
          regionParams.with_original_language = 'hi';
        }
      }
      
      let initialResults = [];
      
      // Only proceed with API call if we have genres to use or other parameters
      if (genresToUse.length > 0 || Object.keys(regionParams).length > 0) {
        // Add a small random delay to simulate "thinking" - but only the first time
        if (!initialFetchCompletedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Add randomness to results with varying page
        const page = Math.floor(Math.random() * 3) + 1; // Page 1, 2, or 3

        console.log(`Fetching recommendations with region params:`, regionParams);

        const response = await axios.get(
          `https://api.themoviedb.org/3/discover/${endpoint}`,
          {
            params: {
              api_key: process.env.REACT_APP_TMDB_API_KEY,
              with_genres: genresToUse.join(','),
              sort_by: 'popularity.desc',
              page: page,
              ...yearParams,
              ...moodParams,
              ...regionParams, // Add the region/language parameters
              'vote_count.gte': 50, // Lower threshold to get more diverse content
            }
          }
        );
        
        // Format and filter out already favorited items and previously shown recommendations
        const favoriteIds = new Set(userFavorites.map(fav => fav.mediaId));
        initialResults = response.data.results
          .filter(item => !favoriteIds.has(item.id.toString()) && !shownRecommendations.has(item.id))
          .map(item => ({
            ...item,
            media_type: mediaType,
            score: Math.round((item.vote_average / 10) * 100)
          }))
          .slice(0, 6);
      }
      
      // If we don't have enough initial results, try generic recommendations
      if (initialResults.length < 3) {
        if (initialResults.length === 0) {
          await fetchGenericRecommendations();
        } else {
          // Get the IDs of our initial results to avoid duplicates
          const existingIds = new Set(initialResults.map(item => item.id));
          
          // Get supplementary recommendations
          const supplementaryResults = await fetchSupplementaryRecommendations(
            initialResults.length, 
            existingIds
          );
          
          // Combine results
          const combinedResults = [...initialResults, ...supplementaryResults];
          if (combinedResults.length > 0) {
            setRecommendations(combinedResults);
            
            // Track these recommendations to avoid repeats
            setShownRecommendations(prev => {
              const newShown = new Set(prev);
              combinedResults.forEach(item => newShown.add(item.id));
              return newShown;
            });
          } else {
            // Fallback to generic if we still don't have enough
            await fetchGenericRecommendations();
          }
        }
      } else {
        // We have enough results from our initial query
        setRecommendations(initialResults);
        
        // Track these recommendations to avoid repeats
        setShownRecommendations(prev => {
          const newShown = new Set(prev);
          initialResults.forEach(item => newShown.add(item.id));
          return newShown;
        });
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      await fetchGenericRecommendations();
    } finally {
      // Mark initial fetch as completed
      initialFetchCompletedRef.current = true;
      
      // Add a small delay before hiding the thinking state for better UX
      setTimeout(() => {
        setIsThinking(false);
        setIsLoading(false);
        setIsRefreshing(false);
        
        // Release the fetch lock
        isFetchingRef.current = false;
      }, 500);
    }
  }, [
    userPreferences,
    favoriteGenres,
    userFavorites,
    isAuthenticated,
    fetchGenericRecommendations,
    propUserPreferences,
    shownRecommendations
  ]); // Removed unnecessary dependencies to prevent re-running

  // Only fetch recommendations once on initial mount
  useEffect(() => {
    if (isAuthenticated && !initialFetchCompletedRef.current && !isFetchingRef.current) {
      fetchRecommendations();
    }
  }, [isAuthenticated]); // Only depend on authentication status

  // Handle explicit preference updates
  useEffect(() => {
    if (preferencesUpdated > 0 && initialFetchCompletedRef.current) {
      handleRefresh();
    }
  }, [preferencesUpdated]);

  // Handle refresh button click
  const handleRefresh = async () => {
    // Skip if already refreshing
    if (isRefreshing || isFetchingRef.current) return;
    
    setIsRefreshing(true);
    setIsThinking(true);
    setRefreshCounter(prev => prev + 1);
    
    // Create a nice visual delay to show the refresh animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Try to get fresh preferences first
    await fetchLatestPreferences();
    
    // Then get recommendations
    await fetchRecommendations();
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }));

  // Listen for the refresh event from parent component
  useEffect(() => {
    const handleRefreshEvent = async () => {
      console.log("Received refresh recommendations event");
      await handleRefresh();
    };
    
    document.addEventListener('refresh-recommendations', handleRefreshEvent);
    
    return () => {
      document.removeEventListener('refresh-recommendations', handleRefreshEvent);
    };
  }, []);

  if (!isAuthenticated) {
    return null;
  }
  
  // Show recommendations section even if empty, to display the prompt
  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-12 max-w-7xl mx-auto px-4"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          <motion.span
            key={`heading-${refreshCounter}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {dataSource === 'both' ? 'Personalized Recommendations' :
             dataSource === 'preferences' ? 'Based on Your Preferences' :
             dataSource === 'favorites' ? 'Because You Liked' :
             'Popular This Week'}
          </motion.span>
        </h2>
        
        {recommendations.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing || isThinking}
            className="flex items-center space-x-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full transition-colors"
          >
            <motion.div
              animate={isRefreshing || isThinking ? { rotate: 360 } : {}}
              transition={isRefreshing || isThinking ? { 
                repeat: Infinity, 
                duration: 1, 
                ease: "linear"
              } : {}}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
            </motion.div>
            <span>{isRefreshing || isThinking ? 'Refreshing...' : 'Refresh'}</span>
          </motion.button>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        {dataSource === 'none' && recommendations.length === 0 && !isLoading && !isThinking && !isRefreshing && (
          <motion.div 
            key="prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-r from-indigo-900 to-purple-900 bg-opacity-50 rounded-xl p-6 mb-6 flex items-center shadow-lg border border-indigo-800"
          >
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SparklesIcon className="h-10 w-10 text-indigo-300 mr-5" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Get Personalized Recommendations</h3>
              <p className="text-indigo-200 leading-relaxed">
                Complete your preference questionnaire using the sparkles icon in the top left 
                to get recommendations tailored just for you!
              </p>
            </div>
          </motion.div>
        )}
      
        {/* Enhanced thinking animation */}
        {isThinking && (
          <motion.div 
            key={`thinking-${refreshCounter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 mb-6"
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-4xl"
              >
                🧠
              </motion.div>
              <div>
                <h3 className="text-xl font-semibold text-white">Finding perfect recommendations for you...</h3>
                <p className="text-gray-400">Analyzing your preferences and favorites</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="h-2 bg-gray-700 rounded overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                      opacity: [0.3, 0.7, 0.3],
                      y: [0, -5, 0]
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="bg-gray-700 rounded-lg h-[280px] relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent"
                      animate={{
                        y: ["-100%", "100%"]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "linear",
                        delay: i * 0.3
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      
        {isLoading && !isThinking && (
          <motion.div 
            key={`loading-${refreshCounter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[...Array(6)].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: i * 0.1 }
                }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl h-[350px] shadow-md overflow-hidden"
              >
                <div className="h-3/5 bg-gray-700 relative">
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"
                    animate={{ 
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear"
                    }}
                  />
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-700 rounded w-3/4 relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"
                      animate={{ 
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "linear",
                        delay: 0.2
                      }}
                    />
                  </div>
                  <div className="h-4 bg-gray-700 rounded w-1/2 relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"
                      animate={{ 
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "linear",
                        delay: 0.4
                      }}
                    />
                  </div>
                  <div className="h-4 bg-gray-700 rounded w-full relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600/20 to-transparent"
                      animate={{ 
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "linear",
                        delay: 0.6
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {!isLoading && !isThinking && recommendations.length > 0 ? (
          <motion.div 
            key={`recommendations-${refreshCounter}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { 
                  staggerChildren: 0.1
                } 
              },
              exit: {
                opacity: 0,
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {recommendations.map((item, index) => (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: {
                      duration: 0.5,
                      ease: "easeOut"
                    }
                  },
                  exit: {
                    opacity: 0,
                    scale: 0.95,
                    transition: {
                      duration: 0.3,
                      ease: "easeIn"
                    }
                  }
                }}
              >
                <MediaCard
                  result={item}
                  currentUser={currentUser}
                  onClick={() => {}}
                  promptLogin={() => {}}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          !isLoading && !isThinking && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 bg-gray-800/30 rounded-xl p-8"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-4 text-5xl opacity-50"
              >
                🎬
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-3">No Recommendations Yet</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                Try adding some favorites or updating your preferences to get personalized recommendations!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full transition-colors"
              >
                Discover Popular Movies & Shows
              </motion.button>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </motion.section>
  );
});

// Set display name for debugging purposes
PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;
