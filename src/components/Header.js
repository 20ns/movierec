import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon as SearchIcon, 
  UserIcon, 
  AdjustmentsHorizontalIcon, 
  HeartIcon,
  Bars3Icon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import FavoritesSection from './FavoritesSection';

function Header({ 
  currentUser, 
  isAuthenticated, 
  onSearchClick,  // Changed from setShowSearch
  showSearch, 
  onPreferencesClick, // Changed from setShowQuestionnaire
  onFavoritesClick,   // Changed from setShowFavorites
  showFavorites,
  onSignout,
  onAccountClick      // Changed from setShowAccountDetails
}) {
  const [hoveredButton, setHoveredButton] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Animation variants
  const iconButtonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.1, transition: { type: "spring", stiffness: 400, damping: 10 } }
  };
  
  const dropdownVariants = {
    hidden: { opacity: 0, y: -5, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 500, 
        damping: 30 
      } 
    },
    exit: { 
      opacity: 0,
      y: -5,
      scale: 0.95,
      transition: { duration: 0.2 } 
    }
  };

  // Listen for the custom event to close dropdown when a modal opens
  useEffect(() => {
    const handleModalOpen = () => {
      setShowUserDropdown(false);
      setShowMobileMenu(false);
    };
    
    document.addEventListener('modal-opened', handleModalOpen);
    return () => document.removeEventListener('modal-opened', handleModalOpen);
  }, []);
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 py-4 bg-gray-900 border-b border-gray-800/50 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo area */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className="flex-shrink-0"
        >
          <Link to="/" className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">
            MovieRec
          </Link>
        </motion.div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-full text-gray-300 hover:bg-gray-800/70 hover:text-white"
          >
            {showMobileMenu ? 
              <XMarkIcon className="w-6 h-6" /> : 
              <Bars3Icon className="w-6 h-6" />
            }
          </motion.button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-1 sm:space-x-2">
          {/* Search button - always visible */}
          <motion.button 
            variants={iconButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (onSearchClick) onSearchClick(!showSearch);
            }}
            onMouseEnter={() => setHoveredButton('search')}
            onMouseLeave={() => setHoveredButton(null)} 
            className={`relative p-2.5 rounded-full transition-colors duration-200 ${
              showSearch ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
            }`}
            title="Search movies"
          >
            <SearchIcon className="w-5 h-5" />
            {hoveredButton === 'search' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg pointer-events-none"
              >
                Search
              </motion.div>
            )}
          </motion.button>
          
          {/* Only show these buttons when the user is authenticated */}
          {isAuthenticated && (
            <>
              {/* Preferences button */}
              <motion.button 
                variants={iconButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (onPreferencesClick) onPreferencesClick();
                }}
                onMouseEnter={() => setHoveredButton('preferences')}
                onMouseLeave={() => setHoveredButton(null)}
                className="relative p-2.5 text-gray-300 hover:bg-gray-800/70 hover:text-white rounded-full transition-colors duration-200"
                title="Set movie preferences"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                {hoveredButton === 'preferences' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg pointer-events-none"
                  >
                    Preferences
                  </motion.div>
                )}
              </motion.button>
              
              {/* Favorites button */}
              <motion.button 
                variants={iconButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (onFavoritesClick) onFavoritesClick(!showFavorites);
                }}
                onMouseEnter={() => setHoveredButton('favorites')}
                onMouseLeave={() => setHoveredButton(null)}
                className={`relative p-2.5 rounded-full transition-colors duration-200 ${
                  showFavorites ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
                title="View favorites"
              >
                <HeartIcon className="w-5 h-5" />
                {hoveredButton === 'favorites' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg pointer-events-none"
                  >
                    Favorites
                  </motion.div>
                )}
              </motion.button>
            </>
          )}

          {/* User profile button */}
          {isAuthenticated ? (
            <div className="relative">
              <motion.button 
                variants={iconButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 100)}
                className="p-2.5 text-gray-300 hover:bg-gray-800/70 hover:text-white rounded-full transition-colors duration-200"
                title={currentUser?.attributes?.email || 'Account'}
              >
                <UserIcon className="w-5 h-5" />
              </motion.button>
              
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div 
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute right-0 mt-2 w-60 bg-gray-800 rounded-lg shadow-lg border border-gray-700/50 overflow-hidden z-50"
                  >
                    <div 
                      onClick={() => {
                        if (onAccountClick) {
                          onAccountClick();
                          setShowUserDropdown(false);
                        }
                      }}
                      className="px-4 py-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition-colors duration-150"
                    >
                      <div className="font-medium text-white text-sm">Account</div>
                      <div className="text-xs text-gray-300 truncate">
                        {currentUser?.attributes?.email}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (onSignout) {
                          onSignout();
                          setShowUserDropdown(false);
                        }
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors duration-150 flex items-center"
                    >
                      <span>Sign out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link 
                to="/auth"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-md"
              >
                Sign In
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute left-0 right-0 top-full mt-2 bg-gray-900 shadow-lg rounded-b-lg overflow-hidden z-50 border-t border-gray-800"
          >
            <div className="px-4 py-3 space-y-3">
              <button 
                onClick={() => {
                  if (onSearchClick) onSearchClick(!showSearch);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg"
              >
                <SearchIcon className="w-5 h-5 mr-3" />
                <span>Search</span>
              </button>
              
              {isAuthenticated && (
                <>
                  <button 
                    onClick={() => {
                      if (onPreferencesClick) onPreferencesClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg"
                  >
                    <AdjustmentsHorizontalIcon className="w-5 h-5 mr-3" />
                    <span>Preferences</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (onFavoritesClick) onFavoritesClick(!showFavorites);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg"
                  >
                    <HeartIcon className="w-5 h-5 mr-3" />
                    <span>Favorites</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (onAccountClick) onAccountClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg"
                  >
                    <UserIcon className="w-5 h-5 mr-3" />
                    <span>Account</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (onSignout) onSignout();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg"
                  >
                    <span>Sign out</span>
                  </button>
                </>
              )}
                {!isAuthenticated && (
                <Link 
                  to="/auth"
                  onClick={() => setShowMobileMenu(false)}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-center text-white rounded-lg"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Favorites panel is now rendered from App.js */}
    </motion.header>
  );
}

export default Header;
