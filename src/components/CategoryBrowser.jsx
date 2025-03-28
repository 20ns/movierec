import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const GENRE_CATEGORIES = [
  { id: 28, name: 'Action', icon: '🔥' },
  { id: 35, name: 'Comedy', icon: '😂' },
  { id: 18, name: 'Drama', icon: '🎭' },
  { id: 27, name: 'Horror', icon: '👻' },
  { id: 878, name: 'Sci-Fi', icon: '🚀' },
  { id: 10749, name: 'Romance', icon: '❤️' },
  { id: 12, name: 'Adventure', icon: '🌍' },
  { id: 16, name: 'Animation', icon: '🎬' },
];

const CategoryBrowser = ({ onCategorySelect }) => {
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [bgImages, setBgImages] = useState({});
  
  useEffect(() => {
    const fetchCategoryBackgrounds = async () => {
      try {
        const imagePromises = GENRE_CATEGORIES.map(async (genre) => {
          const response = await axios.get(
            'https://api.themoviedb.org/3/discover/movie',
            {
              params: {
                api_key: process.env.REACT_APP_TMDB_API_KEY,
                with_genres: genre.id,
                sort_by: 'popularity.desc'
              }
            }
          );
          
          if (response.data.results.length > 0) {
            const movie = response.data.results[0];
            return { 
              id: genre.id, 
              backdrop: movie.backdrop_path 
            };
          }
          return null;
        });
        
        const results = await Promise.all(imagePromises);
        const imageMap = {};
        results.filter(Boolean).forEach(item => {
          imageMap[item.id] = item.backdrop;
        });
        
        setBgImages(imageMap);
      } catch (error) {
        console.error('Error fetching category backgrounds:', error);
      }
    };
    
    fetchCategoryBackgrounds();
  }, []);

  const handleCategoryClick = (categoryId) => {
    setActiveCategoryId(categoryId);
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };

  return (
    <section className="mb-12 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-white mb-6">Browse Categories</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {GENRE_CATEGORIES.map((category) => (
          <motion.div
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`relative overflow-hidden rounded-lg cursor-pointer h-32 ${
              activeCategoryId === category.id ? 'ring-2 ring-indigo-500' : ''
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {bgImages[category.id] && (
              <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{ 
                  backgroundImage: `url(https://image.tmdb.org/t/p/w500${bgImages[category.id]})`,
                  filter: 'brightness(60%)'
                }}
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl mb-2">{category.icon}</span>
              <h3 className="text-white text-lg font-semibold">{category.name}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CategoryBrowser;
