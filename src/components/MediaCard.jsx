import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  StarIcon, CalendarIcon, ChartBarIcon,
  UserGroupIcon, CheckCircleIcon, HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline'; // Add outline version
import { getSocialProof, getGenreColor, hexToRgb } from './SearchBarUtils';
import { useToast } from './ToastManager';

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

// Simplified token extractor
const extractToken = (user) => {
  if (!user) return null;
  
  // Primary check for Cognito structure
  if (user.signInUserSession?.accessToken?.jwtToken) {
    return user.signInUserSession.accessToken.jwtToken;
  }
  // Fallbacks
  if (user.token) return user.token;
  if (user.signInUserSession?.idToken?.jwtToken) {
    return user.signInUserSession.idToken.jwtToken;
  }
  // Raw JWT
  if (typeof user === 'string' && user.split('.').length === 3) {
    return user;
  }
  
  console.log("Could not extract token from user object:", user);
  return null;
};

export const MediaCard = ({ 
  result, 
  onClick, 
  promptLogin, 
  currentUser, 
  isAuthenticated = !!currentUser, // Default to currentUser presence if not provided
  simplifiedView = false,
  onFavoriteToggle,
  highlightMatch = false,
  initialIsFavorited = null // Allow parent to specify favorite status
}) => {
  const toast = useToast();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited ?? false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const hasFetchedRef = useRef(initialIsFavorited !== null); // Skip API check if initial value provided
  
  // Safely extract properties from result
  const {
    id, title, name, poster_path, overview, vote_average,
    release_date, first_air_date, media_type, genre_ids,
    score, scoreReasons, popularity
  } = result || {};
  
  // Derived/computed values
  const mediaId = id?.toString();
  const displayTitle = title || name || 'Untitled';
  const year = extractYear(release_date || first_air_date);
  const rating = vote_average ? Math.round(vote_average * 10) / 10 : 0;
  const displayScore = score ?? (vote_average ? Math.round(vote_average * 10) : null);
  const displayPopularity = Math.round(popularity) || 'N/A';
  const determinedMediaType = media_type || (release_date ? 'movie' : 'tv');
  const posterUrl = poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : '/placeholder.png';
  const socialProof = getSocialProof(result);

  // Check if this media is already in user favorites - optimized
  useEffect(() => {
    // Skip if we've already determined favorite status or have initial value
    if (hasFetchedRef.current || initialIsFavorited !== null) {
      if (initialIsFavorited !== null) setIsFavorited(initialIsFavorited);
      return;
    }
    
    const checkFavoriteStatus = async () => {
      if (!isAuthenticated || !currentUser) return;
      
      const token = extractToken(currentUser);
      if (!token) return;
      
      try {
        // First, check if we've already cached this media's favorite status
        const cacheKey = `favorite_${mediaId}`;
        const cachedStatus = sessionStorage.getItem(cacheKey);
        
        if (cachedStatus !== null) {
          setIsFavorited(cachedStatus === 'true');
          hasFetchedRef.current = true;
          return;
        }
        
        // Check global cache if recent
        const now = Date.now();
        if (globalFavoritesFetched && now - lastFetchTime < FETCH_COOLDOWN) {
          if (globalFavorites && Array.isArray(globalFavorites)) {
            const isFavorite = globalFavorites.some(item => 
              item.mediaId === mediaId || item.mediaId === id
            );
            setIsFavorited(isFavorite);
            sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false');
            hasFetchedRef.current = true;
            return;
          }
        }

        // Skip duplicate API calls if global fetch is in progress
        if (globalFavoritesFetched) return;
        
        // Fetch all favorites at once
        setIsLoadingFavorite(true);
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
          setIsLoadingFavorite(false);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          
          // Update global cache
          if (data?.items && Array.isArray(data.items)) {
            globalFavorites = data.items;
            globalFavoritesFetched = true;
            lastFetchTime = Date.now();
            
            const isFavorite = data.items.some(item => 
              item.mediaId === mediaId || item.mediaId === id
            );
            
            setIsFavorited(isFavorite);
            sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false');
            
            // Cache other favorites we learned about
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
        setIsLoadingFavorite(false);
      } catch (error) {
        console.error("Error checking favorite status:", error);
        hasFetchedRef.current = true;
        setIsLoadingFavorite(false);
      }
    };

    // Use a small delay to avoid too many simultaneous requests on page load
    const timeoutId = setTimeout(checkFavoriteStatus, Math.random() * 500);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, currentUser, mediaId, id, initialIsFavorited]);

  // Listen for global favorite updates from other components
  useEffect(() => {
    const handleFavoriteUpdate = (event) => {
      const { mediaId: updatedId, isFavorited: newStatus } = event.detail || {};
      if (updatedId === mediaId || updatedId === id?.toString()) {
        setIsFavorited(newStatus);
        sessionStorage.setItem(`favorite_${mediaId}`, newStatus ? 'true' : 'false');
      }
    };
    
    document.addEventListener('favorites-updated', handleFavoriteUpdate);
    return () => {
      document.removeEventListener('favorites-updated', handleFavoriteUpdate);
    };
  }, [mediaId, id]);

  // Handle adding/removing favorites with improved UX
  const handleFavoriteToggle = useCallback(async (e) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();

    if (!isAuthenticated) {
      console.log("MediaCard: User not authenticated for favorite toggle");
      if (toast?.showToast) {
        toast.showToast("Please sign in to save favorites", "warning");
      }
      promptLogin?.(); // Show login modal if provided
      return;
    }

    const token = extractToken(currentUser);
    if (!token) {
      console.error("MediaCard: No authentication token found");
      if (toast?.showToast) {
        toast.showToast("Authentication error. Please try signing in again.", "error");
      }
      return;
    }

    setIsLoadingFavorite(true);
    const previousState = isFavorited;
    const method = previousState ? 'DELETE' : 'POST';
    
    // Optimistic update for better UX
    setIsFavorited(!previousState);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          credentials: 'include',
          mode: 'cors',
          body: JSON.stringify({
            mediaId: mediaId,
            title: displayTitle,
            mediaType: determinedMediaType,
            posterPath: poster_path,
            overview: overview
          })
        }
      );

      if (!response.ok) {
        // Revert optimistic update on error
        setIsFavorited(previousState);
        throw new Error(`Server error: ${response.status}`);
      }

      // Success - update session storage
      sessionStorage.setItem(`favorite_${mediaId}`, (!previousState).toString());
      
      // Update global cache
      if (globalFavorites) {
        if (previousState) {
          // Remove from favorites
          globalFavorites = globalFavorites.filter(
            item => item.mediaId !== mediaId && item.mediaId !== id
          );
        } else {
          // Add to favorites
          globalFavorites.push({
            mediaId: mediaId,
            title: displayTitle,
            mediaType: determinedMediaType,
            posterPath: poster_path,
            overview: overview
          });
        }
      }
      
      // Show toast notification
      if (toast?.showToast) {
        toast.showToast(
          previousState 
            ? `Removed "${displayTitle}" from favorites` 
            : `Added "${displayTitle}" to favorites!`,
          previousState ? 'info' : 'favorite'
        );
      }
      
      // Call the callback if provided
      if (onFavoriteToggle) {
        onFavoriteToggle(mediaId, !previousState);
      }
      
      // Emit global event for other components
      document.dispatchEvent(new CustomEvent('favorites-updated', { 
        detail: { mediaId: mediaId, isFavorited: !previousState } 
      }));
      
      // Force refresh global cache on next page load
      lastFetchTime = 0;
    } catch (error) {
      console.error("Error updating favorite:", error);
      // Show error toast
      if (toast?.showToast) {
        toast.showToast(
          `Failed to ${previousState ? 'remove from' : 'add to'} favorites`,
          'error'
        );
      }
    } finally {
      setIsLoadingFavorite(false);
    }
  }, [isAuthenticated, currentUser, mediaId, id, isFavorited, displayTitle, determinedMediaType, poster_path, overview, toast, promptLogin, onFavoriteToggle]);

  // Generate appropriate heart icon based on state
  const HeartIcon = isFavorited ? HeartSolidIcon : HeartOutlineIcon;
  const heartIconClasses = isFavorited 
    ? 'text-red-500 animate-pulse' 
    : 'text-white hover:text-red-300';

  // Handle card click (prevent if favorite button was clicked)
  const handleCardClick = (e) => {
    if (e.target.closest('button[aria-label*="avorite"]')) {
      return;
    }
    onClick?.(result);
  };

  // Render content based on view type
  const renderContent = () => {
    if (simplifiedView) {
      // Simplified view for favorites section with WHITE background
      return (
        <div className="p-2 sm:p-3">
          <h2 className="font-semibold text-gray-800 truncate text-sm sm:text-base" title={displayTitle}>
            {displayTitle}
          </h2>
          <div className="flex items-center justify-between mt-1 sm:mt-2 text-xs sm:text-sm">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="bg-indigo-100 text-indigo-800 px-1.5 sm:px-2 py-0.5 rounded text-xs">
                {determinedMediaType === 'movie' ? 'Movie' : 'TV Show'}
              </span>
              {year && (<span className="text-gray-600">{year}</span>)}
            </div>
            {rating > 0 && (
              <div className="flex items-center">
                <StarIcon className="w-3 h-3 text-amber-500 mr-0.5"/>
                <span className="text-gray-700">{rating}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Regular view with more details
    return (
      <div className="p-2 sm:p-3 flex flex-col flex-grow bg-white rounded-b-xl">
        <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300" title={displayTitle}>
          {displayTitle}
        </h2>
        {overview && (
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 leading-relaxed flex-grow">
            {overview}
          </p>
        )}

        {/* Optional: Score Reasons */}
        {scoreReasons && scoreReasons.length > 0 && (
          <div className="mt-auto mb-2 space-y-1">
            {scoreReasons.map((reason, i) => (
              <div key={i} className="flex items-center text-[10px] sm:text-xs">
                <CheckCircleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 text-green-500 flex-shrink-0" />
                <span className="text-gray-600 truncate">{reason}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 flex items-center justify-between space-x-1">
          <div className="flex items-center space-x-1">
            <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
            <span className="font-medium text-xs sm:text-sm text-gray-700">
              {rating || 'N/A'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-600">
              {year || 'N/A'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <ChartBarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-600">
              {displayPopularity}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={`group bg-transparent rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-out relative flex flex-col h-full cursor-pointer ${
        highlightMatch ? 'ring-2 ring-offset-1 ring-offset-gray-900 ring-indigo-500 shadow-lg shadow-indigo-500/20' : ''
      }`}
      whileHover={{ y: -3 }} // Subtle lift on hover
      layout // Enable layout animations if card position changes
    >
      <div 
        className={`bg-white rounded-xl overflow-hidden shadow-lg ${
          isFavorited ? 'ring-1 ring-red-300/50' : ''
        } transition-all duration-300 h-full`}
        onClick={handleCardClick}
      >
        {/* Image Section */}
        <div className="relative overflow-hidden h-[160px] sm:h-[180px] md:h-[200px] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <motion.img
            src={posterUrl}
            alt={`Poster for ${displayTitle}`}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            loading="lazy"
          />
          
          {/* Score Badge */}
          {displayScore !== null && (
            <div className={`absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-md ${
              displayScore >= 70 ? 'bg-green-600/90' : displayScore >= 50 ? 'bg-yellow-600/90' : 'bg-red-600/90'
            }`}>
              {displayScore}% Match
            </div>
          )}
          
          {/* Media Type Badge */}
          <span className="absolute top-2 left-2 z-10 bg-black/60 text-white px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-medium backdrop-blur-sm shadow">
            {determinedMediaType === 'movie' ? 'Movie' : 'TV'}
          </span>

          {/* Favorite Button - More visible */}
          {isAuthenticated && (
            <motion.button
              onClick={handleFavoriteToggle}
              disabled={isLoadingFavorite}
              className={`absolute top-2 right-2 z-20 p-1.5 rounded-full transition-all duration-200 ease-in-out backdrop-blur-sm focus:outline-none ${
                isLoadingFavorite
                  ? 'bg-gray-500/70 cursor-not-allowed'
                  : isFavorited
                  ? 'bg-red-600/70 hover:bg-red-500/80'
                  : 'bg-black/50 hover:bg-black/70'
              }`}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {isLoadingFavorite ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <HeartIcon className={`w-5 h-5 ${heartIconClasses}`} />
              )}
            </motion.button>
          )}

          {/* Social Proof */}
          {socialProof.friendsLiked > 0 && !simplifiedView && (
            <div className="absolute bottom-2 right-2 z-10 flex items-center bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
              <UserGroupIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-300" />
              <span className="ml-1 text-[10px] sm:text-xs text-white font-medium">
                {socialProof.friendsLiked} liked
              </span>
            </div>
          )}

          {/* Highlight Match Badge */}
          {highlightMatch && (
            <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-[10px] sm:text-xs py-0.5 px-2 rounded-br-lg rounded-tl-xl shadow font-semibold">
              Matched! ✨
            </div>
          )}
        </div>

        {/* Content Section */}
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default MediaCard;