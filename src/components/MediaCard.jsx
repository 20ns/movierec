import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  StarIcon, CalendarIcon, ChartBarIcon,
  UserGroupIcon, CheckCircleIcon, HeartIcon
} from '@heroicons/react/24/solid';
import { getSocialProof, getGenreColor, hexToRgb } from './SearchBarUtils'; // Ensure this path is correct
import { useToast } from './ToastManager'; // Import the useToast hookimport Toast from './Toast'; // Import the Toast component

// Extract the year from a date string or return empty string if invalidg or return empty string if invalid
const extractYear = (dateString) => {ng) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getFullYear()) ? '' : date.getFullYear().toString();return isNaN(date.getFullYear()) ? '' : date.getFullYear().toString();
};};

// Global cache to prevent multiple fetch requests for favorites fetch requests for favorites
let globalFavoritesFetched = false;= false;
let globalFavorites = null;null;
let lastFetchTime = 0;
const FETCH_COOLDOWN = 30000; // 30 seconds cooldown between fetchesconst FETCH_COOLDOWN = 30000; // 30 seconds cooldown between fetches

export const MediaCard = ({ st MediaCard = ({ 
  result, 
  onClick, 
  promptLogin, 
  currentUser, 
  simplifiedView = false, // New prop for simplified view in favoritesr simplified view in favorites
  onFavoriteToggle  // Add this new proporiteToggle  // Add this new prop
}) => {
  const socialProof = getSocialProof(result);
  const [isFavorited, setIsFavorited] = useState(false);= useState(false);
  const hasFetchedRef = useRef(false);  const hasFetchedRef = useRef(false);
  // Get the showToast function from context
  const { showToast } = useToast();alse);
tToastMessage] = useState('');
  // Fallback genre color function (kept for robustness)
  const getGenreColorFallback = (genreIds = []) => {tness)
    const genreColors = {
      28: '#7f1d1d', 12: '#14532d', 16: '#713f12',
      35: '#4c1d95', 80: '#1e3a8a', 18: '#1e3a8a', '#14532d', 16: '#713f12',
      10751: '#134e4a', 14: '#581c87', 27: '#3c1513',35: '#4c1d95', 80: '#1e3a8a', 18: '#1e3a8a',
      9648: '#312e81', 10749: '#831843', 878: '#0c4a6e',513',
      default: '#1e1b4b'
    };
    const firstGenre = genreIds[0] || 'default';};
    const hexColor = genreColors[firstGenre] || genreColors.default;    const firstGenre = genreIds[0] || 'default';
    return hexToRgb(hexColor);
  };

  // Helper function to extract token from various user object structures
  const extractToken = (user) => {on to extract token from various user object structures
    if (!user) {st extractToken = (user) => {
      console.log("User object is null in MediaCard");if (!user) {
      return null;
    }
    
    // Only log this in development, not in production
    if (process.env.NODE_ENV === 'development') {production
      console.log("Current user object structure:", JSON.stringify({
        hasToken: !!user.token,stringify({
        hasSignIn: !!user.signInUserSession,
        hasAccessToken: user.signInUserSession?.accessToken !== undefined,sSignIn: !!user.signInUserSession,
        userEmail: user.attributes?.email || 'not found',   hasAccessToken: user.signInUserSession?.accessToken !== undefined,
        keys: Object.keys(user)    userEmail: user.attributes?.email || 'not found',
      }));
    }
    }
    // Case 1: Direct token property
    if (user.token) return user.token;
    
    // Case 2: Cognito user session (most common)
    if (user.signInUserSession?.accessToken?.jwtToken) {// Case 2: Cognito user session (most common)
      return user.signInUserSession.accessToken.jwtToken;
    }oken;
    
    // Case 3: Different naming (some versions use idToken instead)
    if (user.signInUserSession?.idToken?.jwtToken) {// Case 3: Different naming (some versions use idToken instead)
      return user.signInUserSession.idToken.jwtToken;n?.jwtToken) {
    }
    
    // Case 4: Raw JWT passed directly
    if (typeof user === 'string' && user.split('.').length === 3) {// Case 4: Raw JWT passed directly
      return user;
    }r;
    }
    console.log("Could not extract token from user object:", user);    
    return null;ject:", user);
  };

  // Check if this media is already in user favorites
  useEffect(() => { Check if this media is already in user favorites
    // Skip if we've already determined favorite status for this media item
    if (hasFetchedRef.current) return;termined favorite status for this media item
     (hasFetchedRef.current) return;
    const checkFavoriteStatus = async () => {
      if (!currentUser) return;
      if (!currentUser) return;
      const token = extractToken(currentUser);
      if (!token) return; // No token, no need to check
       check
      try {
        // First, check if we've already cached this media's favorite statusy {
        const cacheKey = `favorite_${result.id}`;eady cached this media's favorite status
        const cachedStatus = sessionStorage.getItem(cacheKey);
        rage.getItem(cacheKey);
        if (cachedStatus !== null) {
          setIsFavorited(cachedStatus === 'true');f (cachedStatus !== null) {
          hasFetchedRef.current = true;  setIsFavorited(cachedStatus === 'true');
          return;
        }
        
        // Check if we should use the global favorites cache
        const now = Date.now();
        if (globalFavoritesFetched && now - lastFetchTime < FETCH_COOLDOWN) {
          // Use cached global favorites instead of making a new request
          if (globalFavorites && Array.isArray(globalFavorites)) {se cached global favorites instead of making a new request
            const isFavorite = globalFavorites.some(item => isArray(globalFavorites)) {
              item.mediaId === result.id.toString() || item.mediaId === result.id
            );toString() || item.mediaId === result.id
            setIsFavorited(isFavorite);
            sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false'); setIsFavorited(isFavorite);
            hasFetchedRef.current = true;   sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false');
            return;            hasFetchedRef.current = true;
          }
        }
}
        // Avoid duplicate fetches across multiple components
        if (globalFavoritesFetched) return;ross multiple components
        
        // Get all favorites at once
        const response = await fetch(orites at once
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
          {rocess.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`,
            headers: {
              Authorization: `Bearer ${token}`
            },   Authorization: `Bearer ${token}`
            credentials: 'include',
            mode: 'cors'
          }s'
        ).catch(error => {
          console.warn("Error fetching favorites:", error.message);        ).catch(error => {
          return null;Error fetching favorites:", error.message);
        });

        if (!response) {
          setIsFavorited(false);f (!response) {
          hasFetchedRef.current = true;          setIsFavorited(false);
          return;rrent = true;
        }

        if (response.ok) {
          const data = await response.json();
          
          // Only log once in development
          if (process.env.NODE_ENV === 'development' && !globalFavoritesFetched) {// Only log once in development
            console.log("Favorites fetch successful");NV === 'development' && !globalFavoritesFetched) {
          }
          
          // Update global cache
          if (data && data.items && Array.isArray(data.items)) {
            globalFavorites = data.items; (data && data.items && Array.isArray(data.items)) {
            globalFavoritesFetched = true;
            lastFetchTime = Date.now();
            stFetchTime = Date.now();
            const isFavorite = data.items.some(item => 
              item.mediaId === result.id.toString() || item.mediaId === result.idms.some(item => 
            );lt.id
            );
            setIsFavorited(isFavorite);
            sessionStorage.setItem(cacheKey, isFavorite ? 'true' : 'false');
            e' : 'false');
            // Also cache other favorites we learned about
            data.items.forEach(item => {Also cache other favorites we learned about
              const itemCacheKey = `favorite_${item.mediaId}`;tems.forEach(item => {
              sessionStorage.setItem(itemCacheKey, 'true'); `favorite_${item.mediaId}`;
            });   sessionStorage.setItem(itemCacheKey, 'true');
          } else {
            setIsFavorited(false);
          }   setIsFavorited(false);
        } else {  }
          setIsFavorited(false);
        }d(false);
        
        hasFetchedRef.current = true;
      } catch (error) { hasFetchedRef.current = true;
        console.error("Error checking favorite status:", error);} catch (error) {
        hasFetchedRef.current = true;        console.error("Error checking favorite status:", error);
      }
    };
};
    // Use a small delay to avoid too many simultaneous requests on page load
    const timeoutId = setTimeout(checkFavoriteStatus, Math.random() * 500);e load
    eStatus, Math.random() * 500);
    return () => clearTimeout(timeoutId);    
  // Use a stable token string instead of the entire currentUser objectId);
  }, [extractToken(currentUser), result.id]);of the entire currentUser object
ntUser), result.id]);
  // Handle adding/removing favorites
  const handleFavorite = async (e) => {
    e.stopPropagation();nst handleFavorite = async (e) => {
    
    const token = extractToken(currentUser);
    const token = extractToken(currentUser);
    console.log("Favorite button clicked");
    console.log("Favorite button clicked, user token is:", token);Favorite button clicked");
    
    // Check for token
    if (!token) {
      console.error("No authentication token available. User may not be properly signed in.");
      console.error("Current user object:", currentUser);.error("No authentication token available. User may not be properly signed in.");
      alert("Please sign in to save favorites"); console.error("Current user object:", currentUser);
      promptLogin?.();      alert("Please sign in to save favorites");
      return;
    }      return;

    const method = isFavorited ? 'DELETE' : 'POST';
ELETE' : 'POST';
    try {
      // Match the structure expected by your Lambda function
      const response = await fetch(e structure expected by your Lambda function
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite`, = await fetch(
        {VOKE_URL}/favourite`,
          method,
          headers: {thod,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },er ${token}` 
          credentials: 'include',
          mode: 'cors', // Explicitly set CORS mode
          body: JSON.stringify({ CORS mode
            mediaId: result.id.toString(),
            title: result.title || result.name,ng(),
            mediaType: result.media_type,title: result.title || result.name,
            posterPath: result.poster_path,   mediaType: result.media_type,
            overview: result.overviewresult.poster_path,
          })
        }
      ).catch(error => {
        // Handle CORS or network errorsatch(error => {
        console.error("CORS or network error:", error.message);        // Handle CORS or network errors
        throw new Error("Network error. Please try again later.");RS or network error:", error.message);
      });y again later.");

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = "Unknown error";
        try {age = "Unknown error";
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `HTTP error ${response.status}`; const errorData = await response.json();
        } catch (e) {sage || errorData.error || `HTTP error ${response.status}`;
          errorMessage = `Server error (${response.status})`; } catch (e) {
        }          errorMessage = `Server error (${response.status})`;
        throw new Error(errorMessage);
      }e);

      // Update local state, session storage, and global cache
      setIsFavorited(!isFavorited);torage, and global cache
      sessionStorage.setItem(`favorite_${result.id}`, !isFavorited ? 'true' : 'false');rited);
      em(`favorite_${result.id}`, !isFavorited ? 'true' : 'false');
      // Update global favorites cache
      if (globalFavorites) {
        if (isFavorited) {
          // Remove from favoritesisFavorited) {
          globalFavorites = globalFavorites.filter(ove from favorites
            item => item.mediaId !== result.id.toString() && item.mediaId !== result.idlobalFavorites.filter(
          ); !== result.id.toString() && item.mediaId !== result.id
        } else {
          // Add to favorites
          globalFavorites.push({
            mediaId: result.id.toString(),
            title: result.title || result.name,ng(),
            mediaType: result.media_type,itle: result.title || result.name,
            posterPath: result.poster_path,   mediaType: result.media_type,
            overview: result.overview     posterPath: result.poster_path,
          });      overview: result.overview
          
          // Show toast only when adding to favorites
          showToast(`Added "${result.title || result.name}" to favorites`, 'favorite');    // Show toast only when adding to favorites
        }sult.name}" to favorites`);
      }e);
      
      // Force refresh global cache on next page load
      lastFetchTime = 0;
      h global cache on next page load
      // Call the callback instead of showing an alert
      if (onFavoriteToggle) {
        onFavoriteToggle(result.id.toString(), !isFavorited);owing an alert
      }
      
    } catch (error) {
      console.error("Error updating favorite:", error);
      atch (error) {
      // Show more helpful error message console.error("Error updating favorite:", error);
      if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {  
        alert("Network error. This might be due to CORS settings in AWS.");      // Show more helpful error message
      } else {| error.message.includes("Failed to fetch")) {
        alert(`Failed to ${isFavorited ? 'remove from' : 'add to'} favorites: ${error.message}`);his might be due to CORS settings in AWS.");
      }
    }essage}`);
  };  }

  // Modified render logic for the content section
  const renderContent = () => {
    const year = extractYear(result.release_date || result.first_air_date);r the content section
    const rating = result.vote_average ? Math.round(result.vote_average * 10) / 10 : 0;
    ;
    if (simplifiedView) {t.vote_average * 10) / 10 : 0;
      // Simplified view for favorites section with WHITE background
      return (
        <div className="p-3">iew for favorites section with WHITE background
          <h2 className="font-semibold text-gray-800 truncate">{result.title || result.name}</h2>
          <div className="flex items-center justify-between mt-2 text-sm">
            <div className="flex items-center space-x-2">assName="font-semibold text-gray-800 truncate">{result.title || result.name}</h2>
              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">ssName="flex items-center justify-between mt-2 text-sm">
                {result.media_type === 'movie' ? 'Movie' : 'TV Show'}flex items-center space-x-2">
              </span>-indigo-800 px-2 py-0.5 rounded text-xs">
              {year && (: 'TV Show'}
                <span className="text-gray-600">{year}</span>
              )}&& (
            </div>  <span className="text-gray-600">{year}</span>
            {rating > 0 && (
              <div className="flex items-center">div>
                <span className="text-amber-500">★</span>    {rating > 0 && (
                <span className="text-gray-700 ml-1">{rating}</span>         <div className="flex items-center">
              </div>                <span className="text-amber-500">★</span>
            )}">{rating}</span>
          </div>  </div>
        </div>
      );
    }

    // Regular view (reverting to white background)
    return (
      <div className="p-3 flex flex-col flex-grow">ar view (reverting to white background)
        <h2 className="text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300">    return (
          {result.title || result.name}flex-grow">
        </h2>-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300">
        <p className="text-sm text-gray-600 line-clamp-2 mb-2 leading-relaxed flex-grow">
          {result.overview}
        </p> leading-relaxed flex-grow">
overview}
        <div className="mt-2 space-y-1">
          {result.scoreReasons?.map((reason, i) => (
            <div key={i} className="flex items-center text-xs">        <div className="mt-2 space-y-1">
              <CheckCircleIcon className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-gray-600">{reason}</span>ext-xs">
            </div>-green-500" />
          ))}
        </div>

        <div className="border-t border-gray-100 pt-2 flex items-center justify-between space-x-1">
          <div className="flex items-center space-x-1">
            <StarIcon className="w-4 h-4 text-amber-400" />lex items-center justify-between space-x-1">
            <span className="font-medium text-sm text-gray-700">
              {rating || 'N/A'}400" />
            </span>font-medium text-sm text-gray-700">
          </div>ng || 'N/A'}
an>
          <div className="flex items-center space-x-1">          </div>
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {year || 'N/A'}ay-400" />
            </span>
          </div> || 'N/A'}
an>
          <div className="flex items-center space-x-1">v>
            <ChartBarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">    <div className="flex items-center space-x-1">
              {Math.round(result.popularity) || 'N/A'}        <ChartBarIcon className="w-4 h-4 text-gray-400" />
            </span>            <span className="text-sm text-gray-600">
          </div>    {Math.round(result.popularity) || 'N/A'}
        </div>pan>
      </div>
    );
  };

  return (
    <motion.div
      className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full cursor-pointer" (
      whileHover={{ scale: 1.02, rotate: 0.5 }}
      onClick={onClick}
      onMouseEnter={() => {className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full cursor-pointer"
        const color = (getGenreColor || getGenreColorFallback)(result.genre_ids);   whileHover={{ scale: 1.02, rotate: 0.5 }}
        document.documentElement.style.setProperty('--accent-color', color);
      }}
      onMouseLeave={() => {GenreColorFallback)(result.genre_ids);
        document.documentElement.style.removeProperty('--accent-color');
      }}
    >{() => {
      <div className={`bg-white rounded-xl overflow-hidden shadow-lg ${);
        isFavorited ? 'ring-2 ring-red-500' : ''
      } transition-all duration-300 h-full`}>
        <div className="relative overflow-hidden h-[50%] md:h-[180px] flex-shrink-0">unded-xl overflow-hidden shadow-lg ${
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />-red-500' : ''
          <motion.imgll`}>
            src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}iv className="relative overflow-hidden h-[50%] md:h-[180px] flex-shrink-0">
            alt={result.title || result.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            initial={{ opacity: 0 }}c={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[0.6rem] text-white">te={{ opacity: 1 }}
            Match: {result.score}%
          </div>
          <motion.div className="absolute top-2 right-2 z-20 flex items-center space-x-2" whileHover={{ scale: 1.05 }}>ottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[0.6rem] text-white">
            <span className="bg-indigo-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
              {result.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
            </span>ion.div className="absolute top-2 right-2 z-20 flex items-center space-x-2" whileHover={{ scale: 1.05 }}>
            <button onClick={handleFavorite} className="focus:outline-none">lassName="bg-indigo-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
              <HeartIcon.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                className={`w-6 h-6 ${
                  isFavorited ? 'text-red-500 animate-pulse' : 'text-gray-300 hover:text-red-300'none">
                }`}
              />
            </button>pulse' : 'text-gray-300 hover:text-red-300'
          </motion.div>
          {socialProof.friendsLiked > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center">  </button>
              <UserGroupIcon className="w-4 h-4 text-white" />motion.div>
              <span className="ml-1 text-xs text-white">    {socialProof.friendsLiked > 0 && (
                {socialProof.friendsLiked} friends likedbsolute bottom-2 left-2 flex items-center">
              </span>pIcon className="w-4 h-4 text-white" />
            </div>    <span className="ml-1 text-xs text-white">
          )} {socialProof.friendsLiked} friends liked
        </div>            </span>
                    </div>
        {/* Content section */}            )}
        {renderContent()}






export default MediaCard;};  );    </motion.div>      </div>          
          {/* Content section */}
          {renderContent()}
        </div>
      </motion.div>
      
      {/* Render the Toast component */}
      <Toast 
        message={toastMessage} 
        isVisible={toastVisible}
        type="favorite"
        onClose={() => setToastVisible(false)}
      />
    </>
  );
};

export default MediaCard;