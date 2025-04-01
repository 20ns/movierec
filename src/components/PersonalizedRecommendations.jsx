import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

// Convert to forwardRef to accept ref from parent
const PersonalizedRecommendations = forwardRef(({ currentUser, isAuthenticated, preferencesUpdated, userPreferences: propUserPreferences }, ref) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [shownRecommendations, setShownRecommendations] = useState(new Set());
  
  // Update local state when props change
  useEffect(() => {
    if (propUserPreferences) {
      setUserPreferences(propUserPreferences);
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
  
  // Fetch user preferences
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setIsLoading(false);
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
    
    // Then fetch the most up-to-date preferences
    fetchLatestPreferences();
  }, [currentUser, isAuthenticated, fetchLatestPreferences]);

  // Fetch user favorites
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setIsLoading(false);
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
  }, [currentUser, isAuthenticated]);

  // Enhanced function to fetch recommendations based on preferences first, then favorites
  const fetchRecommendations = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    // Check if we have preferences (from props or state)
    const effectivePreferences = userPreferences || propUserPreferences;
    
    const hasPreferences = effectivePreferences && 
      (effectivePreferences.favoriteGenres?.length > 0 || 
       effectivePreferences.contentType || 
       effectivePreferences.eraPreferences?.length > 0 ||
       effectivePreferences.moodPreferences?.length > 0 ||
       effectivePreferences.languagePreferences?.length > 0);
       
    const hasFavorites = favoriteGenres.length > 0;
    
    // Exit early if we have neither preferences nor favorites
    if (!hasPreferences && !hasFavorites) {
      setIsLoading(false);
      setDataSource('none');
      fetchGenericRecommendations();
      return;
    }

    try {
      setIsLoading(true);
      
      // Determine which data source to use for recommendations
      // Prioritize preferences over favorites
      if (hasPreferences) {
        setDataSource(hasFavorites ? 'both' : 'preferences');
      } else {
        setDataSource('favorites');
      }
      
      // Determine content type from preferences, favorites, or random if neither specifies
      let mediaType;
      
      if (effectivePreferences?.contentType === 'movies') {
        mediaType = 'movie';
      } else if (effectivePreferences?.contentType === 'tv') {
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
      
      if (hasPreferences && effectivePreferences.favoriteGenres?.length > 0) {
        // Use preference genres first
        genresToUse = effectivePreferences.favoriteGenres;
      } else if (hasFavorites) {
        // Fall back to favorites-derived genres if no preference genres
        genresToUse = favoriteGenres;
      }
      
      // Era preferences from the user's settings
      let yearParams = {};
      if (hasPreferences && effectivePreferences.eraPreferences?.length > 0) {
        if (effectivePreferences.eraPreferences.includes('classic')) {
          yearParams = { 'release_date.lte': '1980-12-31' };
        } else if (effectivePreferences.eraPreferences.includes('modern')) {
          yearParams = { 
            'release_date.gte': '1980-01-01',
            'release_date.lte': '2010-12-31'
          };
        } else if (effectivePreferences.eraPreferences.includes('recent')) {
          yearParams = { 'release_date.gte': '2011-01-01' };
        }
      }
      
      // Add mood-based parameters
      let moodParams = {};
      if (hasPreferences && effectivePreferences.moodPreferences?.length > 0) {
        if (effectivePreferences.moodPreferences.includes('exciting')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',28,12,10752'; // Action, Adventure, War
        }
        if (effectivePreferences.moodPreferences.includes('funny')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',35,16'; // Comedy, Animation
        }
        if (effectivePreferences.moodPreferences.includes('thoughtful')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',18,99,36'; // Drama, Documentary, History
        }
        if (effectivePreferences.moodPreferences.includes('scary')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',27,9648,53'; // Horror, Mystery, Thriller
        }
        if (effectivePreferences.moodPreferences.includes('emotional')) {
          moodParams.with_genres = (moodParams.with_genres || '') + ',10749,18,10751'; // Romance, Drama, Family
        }
      }
      
      let initialResults = [];
      
      // Only proceed with API call if we have genres to use
      if (genresToUse.length > 0) {
        // Add randomness to results with varying page
        const page = Math.floor(Math.random() * 3) + 1; // Page 1, 2, or 3

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
              'vote_count.gte': 100, // Ensure some quality threshold
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
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userPreferences, favoriteGenres, userFavorites, isAuthenticated, fetchGenericRecommendations, propUserPreferences, shownRecommendations, fetchSupplementaryRecommendations]);

  // Main effect to fetch recommendations when dependencies change
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations, preferencesUpdated]);

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
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

  // Show animation when preferences updated
  useEffect(() => {
    if (preferencesUpdated) {
      handleRefresh();
    }
  }, [preferencesUpdated]);

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
            disabled={isLoading || isRefreshing}
            className="flex items-center space-x-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full transition-colors"
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing ? { 
                repeat: Infinity, 
                duration: 1, 
                ease: "linear"
              } : {}}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
            </motion.div>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </motion.button>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        {dataSource === 'none' && recommendations.length === 0 && !isLoading && !isRefreshing && (
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
      
        {isLoading || isRefreshing ? (
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
        ) : recommendations.length > 0 ? (
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
        )}
      </AnimatePresence>
    </motion.section>
  );
});

// Set display name for debugging purposes
PersonalizedRecommendations.displayName = 'PersonalizedRecommendations';

export default PersonalizedRecommendations;
