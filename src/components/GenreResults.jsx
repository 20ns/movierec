import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import MediaCard from './MediaCard';

const GenreResults = ({ genreId, mediaType = 'movie', currentUser, onMediaClick }) => { // Add onMediaClick prop
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    if (!genreId) return;
    
    const fetchGenreResults = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `https://api.themoviedb.org/3/discover/${mediaType}`,
          {
            params: {
              api_key: process.env.REACT_APP_TMDB_API_KEY,
              with_genres: genreId,
              page: page,
              sort_by: 'popularity.desc'
            }
          }
        );
        
        const formattedResults = response.data.results.map(item => ({
          ...item,
          media_type: mediaType,
          score: Math.round((item.vote_average / 10) * 100)
        }));
        
        setResults(prev => page === 1 ? formattedResults : [...prev, ...formattedResults]);
      } catch (error) {
        console.error('Error fetching genre results:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGenreResults();
  }, [genreId, mediaType, page]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (!genreId) return null;

  // Add loading skeleton for initial load
  if (isLoading && results.length === 0) {
    return (
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl overflow-hidden h-[350px] shadow-lg animate-pulse">
              <div className="h-[180px] bg-gray-700"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="flex justify-between pt-2">
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-700 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (results.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {results.map(item => (
          <MediaCard
            key={`${item.id}-${item.media_type}`}
            result={item}
            currentUser={currentUser}
            onClick={onMediaClick} // Use the passed handler
            promptLogin={() => {}} // Keep promptLogin or pass a real one if needed
          />
        ))}
      </div>
      
      {results.length >= 6 && (
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </motion.button>
        </div>
      )}
    </section>
  );
};

export default GenreResults;
