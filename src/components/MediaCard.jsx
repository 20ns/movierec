import React from 'react';
import { motion } from 'framer-motion';
import { StarIcon, CalendarIcon, ChartBarIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { getSocialProof, getGenreColor, hexToRgb } from './SearchBarUtils';

export const MediaCard = ({ result, onClick }) => {
  const socialProof = getSocialProof(result);
  const title = result.title || result.name; // Extract title for reuse
  const overview = result.overview; // Extract overview
  const posterURL = `https://image.tmdb.org/t/p/w500${result.poster_path}`; // Poster URL
  const releaseYear = new Date(result.release_date || result.first_air_date).getFullYear(); // Release Year

  // Fallback genre color function (as before)
  const getGenreColorFallback = (genreIds = []) => {
    const genreColors = { /* ... genreColors ... */ };
    const firstGenre = genreIds[0] || 'default';
    const hexColor = genreColors[firstGenre] || genreColors.default;
    return hexToRgb(hexColor);
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
      itemScope // Schema.org context - for the whole card
      itemType={result.media_type === 'movie' ? "http://schema.org/Movie" : "http://schema.org/TVSeries"} // Dynamic schema type
    >
      <div className="relative overflow-hidden h-[50%] md:h-[180px] flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <motion.img
          src={posterURL}
          alt={`Poster for ${title}`} // Descriptive alt text using title
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          itemProp="image" // Schema property: image
        />
        <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[0.6rem] text-white">
          Match: {result.matchPercentage !== undefined ? `${result.matchPercentage.toFixed(0)}%` : 'N/A'}
        </div>
        <motion.div className="absolute top-2 right-2 z-20" whileHover={{ scale: 1.05 }}>
          <span className="bg-indigo-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm">
            {result.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'}
          </span>
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
        <h2 className="text-base font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors duration-300" itemProp="name">
          {title} {/* Title in H2, Schema property: name */}
        </h2>
        <p className="text-sm text-gray-600 line-clamp-2 mb-2 text-sm leading-relaxed flex-grow" itemProp="description">
          {overview} {/* Overview in P, Schema property: description */}
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
            <span className="font-medium text-sm text-gray-700" itemProp="ratingValue" itemScope itemType="http://schema.org/Rating"> {/* Rating Schema */}
              <meta itemProp="bestRating" content="10" /> {/* Best rating is 10 */}
              <meta itemProp="worstRating" content="0" /> {/* Worst rating is 0 */}
              {result.vote_average?.toFixed(1) || 'N/A'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600" itemProp="datePublished">{releaseYear}</span> {/* Release Year, Schema property: datePublished */}
          </div>

          <div className="flex items-center space-x-1">
            <ChartBarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{Math.round(result.popularity)}</span>
          </div>
        </div>
      </div>
       <meta itemProp="genre" content={result.genre_names?.join(', ') || ''} /> {/* Genre as meta, Schema property: genre */}
    </motion.div>
  );
};