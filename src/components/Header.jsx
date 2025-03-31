import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  HeartIcon,
  UserCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import FavoritesSection from './FavoritesSection';

const Header = ({ 
  currentUser, 
  setShowSearch, 
  showSearch,
  setShowQuestionnaire,
  showFavorites,
  setShowFavorites,
  onSignout
}) => {
  const [isHovering, setIsHovering] = useState(null);
  
  const navItems = [
    {
      id: 'search',
      label: 'Search',
      icon: <MagnifyingGlassIcon className="w-5 h-5" />,
      onClick: () => setShowSearch(!showSearch),
      isActive: showSearch
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: <SparklesIcon className="w-5 h-5" />,
      onClick: () => setShowQuestionnaire(true),
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: <HeartIcon className="w-5 h-5" />,
      onClick: () => setShowFavorites(!showFavorites),
      isActive: showFavorites
    }
  ];
  
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 backdrop-blur-lg border-b border-gray-800/50 py-4 sticky top-0 z-50 shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          {/* Logo and Title */}
          <motion.div 
            className="flex items-center mb-4 sm:mb-0"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className="mr-3 text-3xl"
              animate={{ rotate: [0, 10, 0], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              🎬
            </motion.div>
            <div>
              <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 text-2xl sm:text-3xl">
                Movie Recommendations
              </h1>
              <motion.p 
                className="text-gray-400 text-sm hidden sm:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Discover your next favorite movie or TV show
              </motion.p>
            </div>
          </motion.div>
          
          {/* Navigation and User Info */}
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0">
            {/* Navigation Pills */}
            <nav className="flex space-x-1 sm:mr-6">
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={item.onClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => setIsHovering(item.id)}
                  onHoverEnd={() => setIsHovering(null)}
                  className={`px-3 py-1.5 rounded-full flex items-center transition-all duration-300 ${
                    item.isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {item.icon}
                  <AnimatedText 
                    isVisible={isHovering === item.id || item.isActive} 
                    text={item.label} 
                  />
                </motion.button>
              ))}
            </nav>
            
            {/* User Profile */}
            {currentUser && (
              <motion.div 
                className="flex items-center bg-gray-800 rounded-full px-3 py-1.5 text-sm text-gray-200"
                whileHover={{ scale: 1.05 }}
              >
                <UserCircleIcon className="w-5 h-5 mr-2 text-indigo-400" />
                <span className="mr-2">
                  {currentUser.attributes?.email?.split('@')[0] || 'User'}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onSignout}
                  className="text-xs bg-gray-700 hover:bg-red-700 px-2 py-1 rounded-full transition-colors"
                >
                  Sign out
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Favorites Panel */}
      {showFavorites && currentUser && (
        <div className="absolute right-0 mt-2 w-96 max-w-full">
          <FavoritesSection 
            currentUser={currentUser} 
            isAuthenticated={true}
            inHeader={true}
          />
        </div>
      )}
    </motion.header>
  );
};

// Helper component for animated text that appears/disappears
const AnimatedText = ({ isVisible, text }) => (
  <motion.span
    initial="hidden"
    animate={isVisible ? "visible" : "hidden"}
    variants={{
      hidden: { width: 0, opacity: 0, marginLeft: 0 },
      visible: { width: "auto", opacity: 1, marginLeft: 8 }
    }}
    transition={{ duration: 0.2 }}
    className="overflow-hidden whitespace-nowrap"
  >
    {text}
  </motion.span>
);

export default Header;
