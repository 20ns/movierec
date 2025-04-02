import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  StarIcon, CalendarIcon, ChartBarIcon,
  UserGroupIcon, CheckCircleIcon, HeartIcon
} from '@heroicons/react/24/solid';
import { getSocialProof, getGenreColor, hexToRgb } from './SearchBarUtils'; // Ensure this path is correct
import { useToast } from './ToastManager'; // Import the useToast hook

// Extract the year from a date string or return empty string if invalid
const extractYear = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getFullYear()) ? '' : date.getFullYear().toString();
};

// Global cache to prevent multiple fetch requests for favorites
let globalFavoritesFetched = false;
let globalFavorites = null;
let lastFetchTime = 0;
const FETCH_COOLDOWN = 30000; // 30 seconds cooldown between fetches

export const MediaCard = ({ 
  result, 
  onClick, 
  promptLogin, 
  currentUser, 
  simplifiedView = false, // New prop for simplified view in favorites
  onFavoriteToggle,  // Add this new prop
  highlightMatch = false // Add this new prop
}) => {
  const socialProof = getSocialProof(result);
  const [isFavorited, setIsFavorited] = useState(false);
  const hasFetchedRef = useRef(false);
  // Get the showToast function from context
  const toast = useToast();
  
  // Check if toast is available
  useEffect(() => {
    console.log("Toast context available:", !!toast);
  }, [toast]);

  // Fallback genre color function (kept for robustness)
  const getGenreColorFallback = (genreIds = []) => {
    const genreColors = {
      28: '#7f1d1d', 12: '#14532d', 16: '#713f12',
      35: '#4c1d95', 80: '#1e3a8a', 18: '#1e3a8a',
      10751: '#134e4a', 14: '#581c87', 27: '#3c1513',
      9648: '#312e81', 10749: '#831843', 878: '#0c4a6e',
      default: '#1e1b4b'
    };
    const firstGenre = genreIds[0] || 'default';
    const hexColor = genreColors[firstGenre] || genreColors.default;
    return hexToRgb(hexColor);
  };

  // Helper function to extract token from various user object structures
  const extractToken = (user) => {
    if (!user) {
      console.log("User object is null in MediaCard");
      return null;
    }
    
    // Only log this in development, not in production
    if (process.env.NODE_ENV === 'development') {
      console.log("Current user object structure:", JSON.stringify({
        hasToken: !!user.token,
        hasSignIn: !!user.signInUserSession,
        hasAccessToken: user.signInUserSession?.accessToken !== undefined,
        userEmail: user.attributes?.email || 'not found',
        keys: Object.keys(user)
      }));
    }
    
    // Case 1: Direct token property
    if (user.token) return user.token;
    
    // Case 2: Cognito user session (most common)
    if (user.signInUserSession?.accessToken?.jwtToken) {
      return user.signInUserSession.accessToken.jwtToken;
    }
    
    // Case 3: Different naming (some versions use idToken instead)
    if (user.signInUserSession?.idToken?.jwtToken) {
      return user.signInUserSession.idToken.jwtToken;
    }
    
    // Case 4: Raw JWT passed directly
    if (typeof user === 'string' && user.split('.').length === 3) {
      return user;
    }
    
    console.log("Could not extract token from user object:", user);
    return null;
  };

  // Check if this media is already in user favorites
  useEffect(() => {
    // Skip if we've already determined favorite status for this media item
    if (hasFetchedRef.current) return;
    
    const checkFavoriteStatus = async () => {
      if (!currentUser) return;
      
      const token = extractToken(currentUser);
      if (!token) return; // No token, no need to check
      
      try {
        // First, check if we've already cached this media's favorite status
        const cacheKey = `favorite_${result.id}`;
        const cachedStatus = sessionStorage.getItem(cacheKey);
        
        if (cachedStatus !== null) {
          setIsFavorited(cachedStatus === 'true');
          hasFetchedRef.current = true;
          return;
        }
        
        // Check if we should use the global favorites cache
        const now = Date.now();
        if (globalFavoritesFetched && now - lastFetchTime < FETCH_COOLDOWN) {
          // Use cached global favorites instead of making a new request
          if (globalFavorites && Array.isArray(globalFavorites)) {
            const isFavorite = globalFavorites.some(item => 
              item.mediaId === result.id.toString() || item.mediaId === result.id
            );
            setIsFavorited(isFavorite);
            sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false');
            hasFetchedRef.current = true;
            return;
          }
        }

        // Avoid duplicate fetches across multiple components
        if (globalFavoritesFetched) return;
        
        // Get all favorites at once
        const response = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            credentials: 'include',
            mode: 'cors'
          }
        ).catch(error => {
          console.warn("Error fetching favorites:", error.message);
          return null;
        });

        if (!response) {
          setIsFavorited(false);
          hasFetchedRef.current = true;
          return;
        }

        if (response.ok) {
          const data = await response.json();
          
          // Only log once in development
          if (process.env.NODE_ENV === 'development' && !globalFavoritesFetched) {
            console.log("Favorites fetch successful");
          }
          
          // Update global cache
          if (data && data.items && Array.isArray(data.items)) {
            globalFavorites = data.items;
            globalFavoritesFetched = true;
            lastFetchTime = Date.now();
            
            const isFavorite = data.items.some(item => 
              item.mediaId === result.id.toString() || item.mediaId === result.id
            );
            
            setIsFavorited(isFavorite);
            sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false');
            
            // Also cache other favorites we learned about
            data.items.forEach(item => {
              const itemCacheKey = `favorite_${item.mediaId}`;
              sessionStorage.setItem(itemCacheKey, 'true');
            });
          } else {
            setIsFavorited(false);
          }
        } else {
          setIsFavorited(false);
        }
        
        hasFetchedRef.current = true;
      } catch (error) {
        console.error("Error checking favorite status:", error);
        hasFetchedRef.current = true;
      }
    };

    // Use a small delay to avoid too many simultaneous requests on page load
    const timeoutId = setTimeout(checkFavoriteStatus, Math.random() * 500);
    
    return () => clearTimeout(timeoutId);
  // Use a stable token string instead of the entire currentUser object
  }, [extractToken(currentUser), result.id]);

  // Handle adding/removing favorites
  const handleFavorite = async (e) => {
    e.stopPropagation();
    
    const token = extractToken(currentUser);
    
    console.log("Favorite button clicked");
    console.log("Favorite button clicked, user token is:", token);
    
    // Check for token
    if (!token) {
      console.error("No authentication token available. User may not be properly signed in.");
      console.error("Current user object:", currentUser);
      alert("Please sign in to save favorites");
      promptLogin?.();
      return;
    }

    const method = isFavorited ? 'DELETE' : 'POST';

    try {
      // Match the structure expected by your Lambda function
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          credentials: 'include',
          mode: 'cors', // Explicitly set CORS mode
          body: JSON.stringify({
            mediaId: result.id.toString(),
            title: result.title || result.name,
            mediaType: result.media_type,
            posterPath: result.poster_path,
            overview: result.overview
          })
        }
      ).catch(error => {
        // Handle CORS or network errors
        console.error("CORS or network error:", error.message);
        throw new Error("Network error. Please try again later.");
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = "Unknown error";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `HTTP error ${response.status}`;
        } catch (e) {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Update local state, session storage, and global cache
      setIsFavorited(!isFavorited);
      sessionStorage.setItem(`favorite_${result.id}`, !isFavorited ? 'true' : 'false');
      
      // Update global favorites cache
      if (globalFavorites) {
        if (isFavorited) {
          // Remove from favorites
          globalFavorites = globalFavorites.filter(
            item => item.mediaId !== result.id.toString() && item.mediaId !== result.id
          );
        } else {
          // Add to favorites
          globalFavorites.push({
            mediaId: result.id.toString(),
            title: result.title || result.name,
            mediaType: result.media_type,
            posterPath: result.poster_path,
            overview: result.overview
          });
          
          // Show toast only when adding to favorites - with better debug info
          console.log("About to show toast:", result.title || result.name);
          if (toast && toast.showToast) {
            toast.showToast(`Added "${result.title || result.name}" to favorites`, 'favorite');
            console.log("Toast function called");
          } else {
            console.error("Toast function not available!", toast);
          }
        }
      }
      
      // Force refresh global cache on next page load
      lastFetchTime = 0;
      
      // Call the callback if provided
      if (onFavoriteToggle) {
        onFavoriteToggle(result.id.toString(), !isFavorited);
      }
      
    } catch (error) {
      console.error("Error updating favorite:", error);
      
      // Show more helpful error message
      if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
        alert("Network error. This might be due to CORS settings in AWS.");
      } else {
        alert(`Failed to ${isFavorited ? 'remove from' : 'add to'} favorites: ${error.message}`);
      }
    }
  };

  // Modified render logic for the content section
  const renderContent = () => {
    const year = extractYear(result.release_date || result.first_air_date);
    const rating = result.vote_average ? Math.round(result.vote_average * 10) / 10 : 0;
    
    if (simplifiedView) {
      // Simplified view for favorites section with WHITE background
      return (
        <div className="p-3">
          <h2 className="font-semibold text-gray-800 truncate">{result.title || result.name}</h2>
          <div className="flex items-center justify-between mt-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">
                {result.media_type === 'movie' ? 'Movie' : 'TV Show'}
              </span>
              {year && (
                <span className="text-gray-600">{year}</span>
              )}
            </div>
            {rating > 0 && (
              <div className="flex items-center">
                <span className="text-amber-500">★</span>
                <span className="text-gray-700 ml-1">{rating}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Regular view (reverting to white background)
    return (
      <div className="p-3 flex flex-col flex-grow">
        <h2 className="text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300">
          {result.title || result.name}
        </h2>
        <p className="text-sm text-gray-600 line-clamp-2 mb-2 leading-relaxed flex-grow">
          {result.overview}
        </p>

        <div className="mt-2 space-y-1">
          {result.scoreReasons?.map((reason, i) => (
            <div key={i} className="flex items-center text-xs">
              <CheckCircleIcon className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-gray-600">{reason}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-2 flex items-center justify-between space-x-1">
          <div className="flex items-center space-x-1">
            <StarIcon className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-sm text-gray-700">
              {rating || 'N/A'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {year || 'N/A'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <ChartBarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {Math.round(result.popularity) || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={`group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full cursor-pointer ${
        highlightMatch ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20' : ''
      }`}
      whileHover={{ scale: 1.02, rotate: 0.5 }}
      onClick={onClick}
      onMouseEnter={() => {
        const color = (getGenreColor || getGenreColorFallback)(result.genre_ids);
        document.documentElement.style.setProperty('--accent-color', color);
      }}
      onMouseLeave={() => {
        document.documentElement.style.removeProperty('--accent-color');
      }}
    >
      <div className={`bg-white rounded-xl overflow-hidden shadow-lg ${
        isFavorited ? 'ring-2 ring-red-500' : ''
      } transition-all duration-300 h-full`}>
        <div className="relative overflow-hidden h-[50%] md:h-[180px] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <motion.img
            src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
            alt={result.title || result.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[0.6rem] text-white">
            Match: {result.score}%
          </div>
          <motion.div className="absolute top-2 right-2 z-20 flex items-center space-x-2" whileHover={{ scale: 1.05 }}>
            <span className="bg-indigo-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
              {result.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
            </span>
            <button onClick={handleFavorite} className="focus:outline-none">
              <HeartIcon
                className={`w-6 h-6 ${
                  isFavorited ? 'text-red-500 animate-pulse' : 'text-gray-300 hover:text-red-300'
                }`}
              />
            </button>
          </motion.div>
          {socialProof.friendsLiked > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center">
              <UserGroupIcon className="w-4 h-4 text-white" />
              <span className="ml-1 text-xs text-white">
                {socialProof.friendsLiked} friends liked
              </span>
            </div>
          )}
          {highlightMatch && (
            <div className="absolute top-2 left-2 z-10 bg-indigo-600 text-white text-xs py-1 px-2 rounded-full shadow-lg">
              Exact Match
            </div>
          )}
        </div>
        
        {/* Content section */}
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default MediaCard;