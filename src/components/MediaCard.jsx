import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  StarIcon, CalendarIcon, ChartBarIcon,
  UserGroupIcon, CheckCircleIcon, HeartIcon
} from '@heroicons/react/24/solid';
import { getSocialProof, getGenreColor, hexToRgb } from './SearchBarUtils'; // Ensure this path is correct

export const MediaCard = ({ result, onClick, currentUser, promptLogin }) => {
  const socialProof = getSocialProof(result);
  const [isFavorited, setIsFavorited] = useState(false);

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

  // Check favorite status on component mount and when user/result changes
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      // Skip if no token available
      if (!currentUser?.token) return;

      try {
        // Note: Using the British spelling 'favourite' to match your API
        const response = await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/favourite?mediaId=${result.id}`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.token}`
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

    checkFavoriteStatus();
  }, [currentUser?.token, result.id]);

  // Handle adding/removing favorites
  const handleFavorite = async (e) => {
    e.stopPropagation();
    console.log("Favorite button clicked");
    console.log("Favorite button clicked, user token is:", currentUser?.token);
    
    // Check for token
    if (!currentUser?.token) {
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
            Authorization: `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({
            mediaId: result.id.toString(),
            title: result.title || result.name,
            mediaType: result.media_type,
            posterPath: result.poster_path,
            overview: result.overview
          })
        }
      );

      if (!response.ok) throw new Error(`Failed to ${method} favorite`);

      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Error updating favorite:", error);
      alert(`Failed to ${isFavorited ? 'remove from' : 'add to'} favorites. Please try again.`);
    }
  };

  return (
    <motion.div
      className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full cursor-pointer"
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
      </div>

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
              {result.vote_average?.toFixed(1) || 'N/A'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {new Date(result.release_date || result.first_air_date).getFullYear()}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <ChartBarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {Math.round(result.popularity)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaCard;