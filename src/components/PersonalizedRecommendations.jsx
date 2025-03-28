import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { MediaCard } from './MediaCard';

const PersonalizedRecommendations = ({ currentUser, isAuthenticated }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);

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
          if (data) {
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
        if (data && data.items) {
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
    
    // Determine which genres to use - preferences first, then favorites as fallback
    let genresToUse = [];
    
    if (userPreferences?.favoriteGenres?.length > 0) {
      genresToUse = userPreferences.favoriteGenres;
    } else if (favoriteGenres.length > 0) {
      genresToUse = favoriteGenres;
    }
    
    if (genresToUse.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        
        // Determine content type from preferences
        const mediaType = userPreferences?.contentType === 'movies' ? 'movie' : 
                          userPreferences?.contentType === 'tv' ? 'tv' : 
                          Math.random() > 0.5 ? 'movie' : 'tv';
        
        const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
        
        const response = await axios.get(
          `https://api.themoviedb.org/3/discover/${endpoint}`,
          {
            params: {
              api_key: process.env.REACT_APP_TMDB_API_KEY,
              with_genres: genresToUse.join(','),
              sort_by: 'popularity.desc',
              // Add year filtering based on era preferences
              ...(userPreferences?.eraPreferences?.includes('classic') && {
                'release_date.lte': '1980-12-31'
              }),
              ...(userPreferences?.eraPreferences?.includes('modern') && {
                'release_date.gte': '1980-01-01',
                'release_date.lte': '2010-12-31'
              }),
              ...(userPreferences?.eraPreferences?.includes('recent') && {
                'release_date.gte': '2011-01-01'
              })
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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [userPreferences, favoriteGenres, userFavorites, isAuthenticated]);

  if (!isAuthenticated || (!isLoading && recommendations.length === 0)) {
    return null;
  }

  return (
    <section className="mb-12 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-white mb-6">Recommended For You</h2>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-72 animate-pulse"></div>
          ))}
        </div>
      ) : (
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
      )}
    </section>
  );
};

export default PersonalizedRecommendations;
