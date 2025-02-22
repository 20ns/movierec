import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  StarIcon, CalendarIcon, ChartBarIcon,
  UserGroupIcon, CheckCircleIcon, HeartIcon
} from '@heroicons/react/24/solid';
import { getSocialProof, getGenreColor, hexToRgb } from './SearchBarUtils';
import { useAuth } from '../auth/auth';
import PropTypes from 'prop-types';
import { ErrorBoundary } from 'react-error-boundary';

// Fallback component for ErrorBoundary
function MediaCardFallback({ error }) {
  return (
    <div className="bg-yellow-100 p-2 rounded mb-2">
      <p className="text-yellow-800 text-sm">Error rendering card: {error.message}</p>
    </div>
  );
}

export const MediaCard = ({ result, onClick, promptLogin }) => {
  // Ensure required fields exist and provide fallbacks
  const safeResult = {
    id: result?.id || '',
    title: result?.title || result?.name || 'Untitled',
    poster_path: result?.poster_path || '',
    media_type: result?.media_type || 'movie',
    overview: result?.overview || 'No overview available.',
    vote_average: result?.vote_average || 0,
    release_date: result?.release_date || result?.first_air_date || '',
    first_air_date: result?.first_air_date || '',
    popularity: result?.popularity || 0,
    genre_ids: result?.genre_ids || [],
    score: result?.score || 0,
    scoreReasons: result?.scoreReasons || []
  };

  const socialProof = getSocialProof(safeResult);
  const [isFavorited, setIsFavorited] = useState(false);
  const { currentUser } = useAuth();

  // **useEffect Hook 1**: Check for access token availability and log its structure
  useEffect(() => {
    if (!currentUser) {
      console.log("currentUser is undefined");
      return;
    }
    if (!currentUser.tokens) {
      console.log("currentUser.tokens is undefined");
      return;
    }
    if (!currentUser.tokens.accessToken) {
      console.log("No access token available");
      return;
    }

    console.log("Access token structure:", 
      currentUser.tokens.accessToken.split('.')[0], 
      currentUser.tokens.accessToken.length
    );
  }, [currentUser]);

  // Fallback genre color function
  const getGenreColorFallback = (genreIds = []) => {
    const genreColors = {
      28: '#7f1d1d', 12: '#14532d', 16: '#713f12',
      35: '#4c1d95', 80: '#1e293b', 18: '#1e3a8a',
      10751: '#134e4a', 14: '#581c87', 27: '#3c1513',
      9648: '#312e81', 10749: '#831843', 878: '#0c4a6e',
      default: '#1e1b4b'
    };
    const firstGenre = genreIds[0] || 'default';
    const hexColor = genreColors[firstGenre] || genreColors.default;
    return hexToRgb(hexColor);
  };

  // Token validation function
  const isTokenValid = () => {
    const token = currentUser?.tokens?.accessToken;
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  // **useEffect Hook 2**: Check favorite status using access token
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!isTokenValid()) {
        alert('Session expired. Please login again.');
        return;
      }
      if (!currentUser?.tokens?.accessToken) return;
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favorite?mediaId=${safeResult.id}`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.tokens.accessToken}`
            }
          }
        );
        if (!response.ok) throw new Error('Failed to check favorite status');
        const data = await response.json();
        setIsFavorited(data.isFavorited);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };

    if (currentUser?.tokens?.accessToken) {
      checkFavoriteStatus();
    }
  }, [currentUser?.tokens?.accessToken, safeResult.id]);

  // Handle favorite/unfavorite action
  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (!currentUser?.tokens?.accessToken) {
      promptLogin?.();
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favorite`,
        {
          method: isFavorited ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.tokens.accessToken}`
          },
          body: JSON.stringify({
            media: {
              id: safeResult.id,
              title: safeResult.title,
              poster_path: safeResult.poster_path,
              media_type: safeResult.media_type
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update favorite');
      }

      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Error updating favorite:", error);
      alert(`Failed to ${isFavorited ? 'remove from' : 'add to'} favorites. Please try again.`);
    }
  };

  return (
    <ErrorBoundary FallbackComponent={MediaCardFallback}>
      <motion.div
        className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full cursor-pointer"
        whileHover={{ scale: 1.02, rotate: 0.5 }}
        onClick={onClick}
        onMouseEnter={() => {
          const color = (getGenreColor || getGenreColorFallback)(safeResult.genre_ids);
          document.documentElement.style.setProperty('--accent-color', color);
        }}
        onMouseLeave={() => {
          document.documentElement.style.removeProperty('--accent-color');
        }}
      >
        <div className="relative overflow-hidden h-[50%] md:h-[180px] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <motion.img
            src={safeResult.poster_path ? `https://image.tmdb.org/t/p/w500${safeResult.poster_path}` : ''}
            alt={safeResult.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[0.6rem] text-white">
            Match: {safeResult.score}%
          </div>
          <motion.div className="absolute top-2 right-2 z-20 flex items-center space-x-2" whileHover={{ scale: 1.05 }}>
            <span className="bg-indigo-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
              {safeResult.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
            </span>
            <button onClick={handleFavorite} className="focus:outline-none">
              <HeartIcon
                className={`w-6 h-6 ${isFavorited ? 'text-red-500 animate-pulse' : 'text-gray-300 hover:text-red-300'}`}
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
        </div>

        <div className="p-3 flex flex-col flex-grow">
          <h2 className="text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300">
            {safeResult.title}
          </h2>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2 leading-relaxed flex-grow">
            {safeResult.overview}
          </p>

          <div className="mt-2 space-y-1">
            {safeResult.scoreReasons?.map((reason, i) => (
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
                {safeResult.vote_average?.toFixed(1) || 'N/A'}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {safeResult.release_date ? new Date(safeResult.release_date).getFullYear() : 'N/A'}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <ChartBarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {Math.round(safeResult.popularity)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </ErrorBoundary>
  );
};

MediaCard.propTypes = {
  result: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    name: PropTypes.string,
    poster_path: PropTypes.string,
    media_type: PropTypes.string,
    overview: PropTypes.string,
    vote_average: PropTypes.number,
    release_date: PropTypes.string,
    first_air_date: PropTypes.string,
    popularity: PropTypes.number,
    genre_ids: PropTypes.arrayOf(PropTypes.number),
    score: PropTypes.number,
    scoreReasons: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  onClick: PropTypes.func,
  promptLogin: PropTypes.func,
};

export default MediaCard;