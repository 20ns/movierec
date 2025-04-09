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
  isAuthenticated, 
  currentUser, 
  onSignout, 
  onSigninClick, 
  onAccountClick, 
  onSearchClick, 
  onFavoritesClick,
  showSearch,
  showFavorites
}) => {
  // Add console logging to debug auth state
  console.log('Header rendering with auth state:', { isAuthenticated, hasUser: !!currentUser });

  // Ensure we're actually checking isAuthenticated prop
  return (
    <motion.header 
      className="bg-black bg-opacity-80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 shadow-lg"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Logo />
          
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Search Button - Available to everyone */}
            <motion.button
              onClick={onSearchClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full flex items-center transition-all duration-300 ${
                showSearch 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              <AnimatedText 
                isVisible={showSearch} 
                text="Search" 
              />
            </motion.button>
            
            {/* Show either sign in or user menu based on auth state */}
            {!isAuthenticated ? (
              <motion.button
                className="flex items-center bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                onClick={onSigninClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserCircleIcon className="w-5 h-5 mr-2" />
                Sign In
              </motion.button>
            ) : (
              <motion.div
                className="flex items-center bg-gray-800 px-3 py-1.5 rounded-full text-sm text-white"
                whileHover={{ scale: 1.05 }}
              >
                <UserCircleIcon className="w-5 h-5 mr-2 text-indigo-400" />
                <span className="mr-2">
                  {currentUser?.attributes?.email?.split('@')[0] || 'User'}
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
            
            {/* Additional user actions for authenticated users */}
            <motion.button
              onClick={onFavoritesClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full flex items-center transition-all duration-300 ${
                showFavorites 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <HeartIcon className="w-5 h-5" />
              <AnimatedText 
                isVisible={showFavorites} 
                text="Favorites" 
              />
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Favorites Panel */}
      {showFavorites && isAuthenticated && (
        <div className="absolute right-0 mt-2 w-96 max-w-full">
          <FavoritesSection 
            currentUser={currentUser} 
            isAuthenticated={isAuthenticated}
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
