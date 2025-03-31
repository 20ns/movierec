import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const PersonalizedRecommendations = ({ currentUser, isAuthenticated }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Define the fetchGenericRecommendations function using useCallback before it's used
  const fetchGenericRecommendations = useCallback(async () => {
    try {
      const response = await axios.get(
        'https://api.themoviedb.org/3/trending/all/week',
        {
          params: {
            api_key: process.env.REACT_APP_TMDB_API_KEY,
          }
        }
      );
      
      const formattedResults = response.data.results
        .filter(item => item.poster_path && item.overview)
        .map(item => ({
          ...item,
          score: Math.round((item.vote_average / 10) * 100)
        }))
        .slice(0, 6);
        
      setRecommendations(formattedResults);
    } catch (error) {
      console.error('Error fetching generic recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
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
    
    // Then fetch the most up-to-date preferences from the server
    const fetchPreferences = async () => {
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
          if (data && Object.keys(data).length > 0 && 
              (data.favoriteGenres?.length > 0 || data.contentType || data.eraPreferences?.length > 0)) {
            setUserPreferences(data);
            localStorage.setItem('userPrefs', JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };
    
    fetchPreferences();
  }, [currentUser, isAuthenticated]);

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

  // Fetch recommendations based on preferences and favorites
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    const hasPreferences = userPreferences && 
      (userPreferences.favoriteGenres?.length > 0 || 
       userPreferences.contentType || 
       userPreferences.eraPreferences?.length > 0);
       
    const hasFavorites = favoriteGenres.length > 0;
    
    // Exit early if we have neither preferences nor favorites
    if (!hasPreferences && !hasFavorites) {
      setIsLoading(false);
      setDataSource('none');
      fetchGenericRecommendations();
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        
        // Determine which data source to use for recommendations
        if (hasPreferences && hasFavorites) {
          setDataSource('both');
        } else if (hasPreferences) {
          setDataSource('preferences');
        } else {
          setDataSource('favorites');
        }
        
        // Determine content type from preferences, favorites, or random if neither specifies
        let mediaType;
        
        if (userPreferences?.contentType === 'movies') {
          mediaType = 'movie';
        } else if (userPreferences?.contentType === 'tv') {
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
        
        // Determine which genres to use
        let genresToUse = [];
        
        if (hasPreferences && userPreferences.favoriteGenres?.length > 0) {
          // If has both, combine some from each source, prioritizing preferences
          if (hasFavorites) {
            // Get unique genres from both sources, prioritizing preferences
            const preferenceGenres = userPreferences.favoriteGenres.slice(0, 2);
            const uniqueFavoriteGenres = favoriteGenres
              .filter(g => !preferenceGenres.includes(String(g)))
              .slice(0, 1);
            genresToUse = [...preferenceGenres, ...uniqueFavoriteGenres];
          } else {
            genresToUse = userPreferences.favoriteGenres;
          }
        } else if (hasFavorites) {
          genresToUse = favoriteGenres;
        }
        
        // Era preferences from the user's settings
        let yearParams = {};
        if (hasPreferences && userPreferences.eraPreferences?.length > 0) {
          if (userPreferences.eraPreferences.includes('classic')) {
            yearParams = { 'release_date.lte': '1980-12-31' };
          } else if (userPreferences.eraPreferences.includes('modern')) {
            yearParams = { 
              'release_date.gte': '1980-01-01',
              'release_date.lte': '2010-12-31'
            };
          } else if (userPreferences.eraPreferences.includes('recent')) {
            yearParams = { 'release_date.gte': '2011-01-01' };
          }
        }
        
        // Only proceed with API call if we have genres to use
        if (genresToUse.length > 0) {
          const response = await axios.get(
            `https://api.themoviedb.org/3/discover/${endpoint}`,
            {
              params: {
                api_key: process.env.REACT_APP_TMDB_API_KEY,
                with_genres: genresToUse.join(','),
                sort_by: 'popularity.desc',
                ...yearParams,
                'vote_count.gte': 100, // Ensure some quality threshold
              }
            }
          );
          
          // Format and filter out already favorited items
          const favoriteIds = new Set(userFavorites.map(fav => fav.mediaId));
          const formattedResults = response.data.results
            .filter(item => !favoriteIds.has(item.id.toString()))
            .map(item => ({
              ...item,
              media_type: mediaType,
              score: Math.round((item.vote_average / 10) * 100)
            }))
            .slice(0, 6);
          
          if (formattedResults.length > 0) {
            setRecommendations(formattedResults);
          } else {
            // If no results after filtering, get generic recommendations
            await fetchGenericRecommendations();
          }
        } else {
          // If no genres to use, get generic recommendations
          await fetchGenericRecommendations();
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        await fetchGenericRecommendations();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [userPreferences, favoriteGenres, userFavorites, isAuthenticated, fetchGenericRecommendations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGenericRecommendations();
    setIsRefreshing(false);
  };

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
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
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </motion.button>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        {dataSource === 'none' && recommendations.length === 0 && !isLoading && (
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
      
        {isLoading ? (
          <motion.div 
            key="loading"
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
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl h-[350px] animate-pulse shadow-md overflow-hidden"
              >
                <div className="h-3/5 bg-gray-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : recommendations.length > 0 ? (
          <motion.div 
            key="recommendations"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { 
                  staggerChildren: 0.1
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
};

export default PersonalizedRecommendations;
