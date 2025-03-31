import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';
import { SparklesIcon } from '@heroicons/react/24/solid';

const PersonalizedRecommendations = ({ currentUser, isAuthenticated }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [dataSource, setDataSource] = useState(null); // Track what data is being used for recommendations
  
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
            .flatMap(res => res.data.genres?.map(g => g.id) || []);
          
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
        const mediaType = userPreferences?.contentType === 'movies' ? 'movie' : 
                         userPreferences?.contentType === 'tv' ? 'tv' : 
                         // Check if favorites has a preferred media type
                         hasFavorites && userFavorites.filter(f => f.mediaType === 'movie').length > 
                                        userFavorites.filter(f => f.mediaType === 'tv').length ?
                                        'movie' : 'tv';
        
        const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
        
        // Determine which genres to use
        let genresToUse = [];
        
        if (hasPreferences && userPreferences.favoriteGenres?.length > 0) {
          // If has both, combine some from each source, prioritizing preferences
          if (hasFavorites) {
            // Get unique genres from both sources, prioritizing preferences
            const preferenceGenres = userPreferences.favoriteGenres.slice(0, 2);
            const uniqueFavoriteGenres = favoriteGenres.filter(g => !preferenceGenres.includes(g)).slice(0, 1);
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
          
        setRecommendations(formattedResults);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        fetchGenericRecommendations();
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fallback to generic trending content
    const fetchGenericRecommendations = async () => {
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
    };
    
    fetchRecommendations();
  }, [userPreferences, favoriteGenres, userFavorites, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }
  
  // Show recommendations section even if empty, to display the prompt
  return (
    <section className="mb-12 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-white mb-6">
        {dataSource === 'both' ? 'Personalized Recommendations' :
         dataSource === 'preferences' ? 'Based on Your Preferences' :
         dataSource === 'favorites' ? 'Because You Liked' :
         'Popular This Week'}
      </h2>
      
      {dataSource === 'none' && recommendations.length === 0 && !isLoading && (
        <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-6 mb-6 flex items-center">
          <SparklesIcon className="h-8 w-8 text-indigo-300 mr-4" />
          <div>
            <h3 className="text-lg font-semibold text-white">Get Personalized Recommendations</h3>
            <p className="text-indigo-200">
              Complete your preference questionnaire using the sparkles icon in the top left 
              to get recommendations tailored just for you!
            </p>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-72 animate-pulse"></div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {recommendations.map(item => (
            <MediaCard
              key={item.id}
              result={item}
              currentUser={currentUser}
              onClick={() => {}}
              promptLogin={() => {}}
            />
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-400">No recommendations available. Try adding some favorites!</p>
        </div>
      )}
    </section>
  );
};

export default PersonalizedRecommendations;
