import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import MediaCard from './MediaCard';

const TrendingSection = ({ currentUser }) => {
  const [trendingContent, setTrendingContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('day'); // 'day' or 'week'

  useEffect(() => {
    const fetchTrendingContent = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `https://api.themoviedb.org/3/trending/all/${timeWindow}`,
          {
            params: {
              api_key: process.env.REACT_APP_TMDB_API_KEY,
            },
          }
        );

        const formattedResults = response.data.results
          .map((item) => ({
            ...item,
            score: Math.round(item.vote_average * 10),
          }))
          .slice(0, 6);

        setTrendingContent(formattedResults);
      } catch (error) {
        console.error('Error fetching trending content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingContent();
  }, [timeWindow]);

  return (
    <section className="mb-12 max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Trending Today</h2>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              timeWindow === 'day'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setTimeWindow('day')}
          >
            Today
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              timeWindow === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setTimeWindow('week')}
          >
            This Week
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-xl overflow-hidden h-[350px] shadow-lg animate-pulse max-w-full"
              >
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
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {trendingContent.map((item) => (
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
      </AnimatePresence>
    </section>
  );
};

export default TrendingSection;