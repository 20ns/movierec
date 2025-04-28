import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon as SearchIcon, 
  UserIcon, 
  AdjustmentsHorizontalIcon, 
  HeartIcon,
  ClockIcon,
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
  onWatchlistClick,   // Added for watchlist feature
  showWatchlist,      // Added for watchlist feature
  onSignout,
  onAccountClick,     // Changed from setShowAccountDetails
  hasBasicPreferencesOnly = false // New prop to indicate if user has only completed basic questions
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
  };  // Handler function to ensure only one panel is open at a time
  const handlePanelToggle = (panelName, isVisible) => {
    // Close user dropdown whenever a panel is opened
    setShowUserDropdown(false);
    
    // Helper function to close all open panels except the one being toggled
    const closeOtherPanels = (currentPanel) => {
      if (currentPanel !== 'search' && showSearch) onSearchClick(false);
      if (currentPanel !== 'favorites' && showFavorites) onFavoritesClick(false);
      if (currentPanel !== 'watchlist' && showWatchlist) onWatchlistClick(false);
    };
    
    switch(panelName) {
      case 'search':
        if (onSearchClick) {
          // If isVisible is explicitly provided, use it
          if (typeof isVisible !== 'undefined') {
            // Close other panels first if opening
            if (isVisible) {
              closeOtherPanels('search');
            }
            onSearchClick(isVisible);
          } else {
            // Toggle based on current state
            // Close other panels first if opening
            if (!showSearch) {
              closeOtherPanels('search');
            }
            onSearchClick(!showSearch);
          }
        }
        break;
      case 'favorites':
        if (onFavoritesClick) {
          // Close other panels first
          closeOtherPanels('favorites');
          // Toggle favorites panel
          onFavoritesClick(!showFavorites);
        }
        break;
      case 'watchlist':
        if (onWatchlistClick) {
          // Close other panels first
          closeOtherPanels('watchlist');
          // Toggle watchlist panel
          onWatchlistClick(!showWatchlist);        }
        break;
      case 'preferences':
        if (onPreferencesClick) {
          // Close other panels before opening preferences
          closeOtherPanels('preferences');
          // Open preferences
          onPreferencesClick();
        }
        break;
      case 'account':
        if (onAccountClick) {
          // Close other panels before opening account
          closeOtherPanels('account');
          // Open account
          onAccountClick();
        }
        break;
      default:
        break;
    }
    
    // Close mobile menu if it's open
    if (showMobileMenu) {
      setShowMobileMenu(false);
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
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="MovieRec Logo" className="h-8 mr-2" />
            <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">
              MovieRec
            </span>
          </Link>
        </motion.div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`p-2.5 rounded-full transition-all duration-300 ${
              showMobileMenu 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30' 
                : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
            }`}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <AnimatePresence initial={false} mode="wait">
                {showMobileMenu ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Bars3Icon className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
            onClick={() => handlePanelToggle('search', !showSearch)}
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
            <>              {/* Preferences button */}
              <motion.button 
                variants={iconButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePanelToggle('preferences')}
                onMouseEnter={() => setHoveredButton('preferences')}
                onMouseLeave={() => setHoveredButton(null)}
                className={`relative p-2.5 rounded-full transition-colors duration-200 ${
                  hasBasicPreferencesOnly 
                    ? 'text-white bg-gradient-to-r from-purple-600/80 to-indigo-600/80 shadow-lg shadow-purple-500/30 animate-pulse-subtle' 
                    : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
                title={hasBasicPreferencesOnly ? "Continue with more preference questions" : "Set movie preferences"}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                {hoveredButton === 'preferences' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg pointer-events-none"
                  >
                    {hasBasicPreferencesOnly ? "Continue with more questions" : "Preferences"}
                  </motion.div>
                )}
              </motion.button>
              
              {/* Favorites button */}
              <motion.button 
                variants={iconButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePanelToggle('favorites', !showFavorites)}
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
              
              {/* Watchlist button */}
              <motion.button 
                variants={iconButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePanelToggle('watchlist', !showWatchlist)}
                onMouseEnter={() => setHoveredButton('watchlist')}
                onMouseLeave={() => setHoveredButton(null)}
                className={`relative p-2.5 rounded-full transition-colors duration-200 ${
                  showWatchlist ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
                title="View watchlist"
              >
                <ClockIcon className="w-5 h-5" />
                {hoveredButton === 'watchlist' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg pointer-events-none"
                  >
                    Watchlist
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
                        setShowUserDropdown(false);
                        handlePanelToggle('account');
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
          <>
            {/* Backdrop with blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setShowMobileMenu(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.3,
                ease: "easeOut"
              }}
              className="md:hidden absolute left-2 right-2 top-full mt-2 bg-gray-900/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden z-50 border border-gray-800/50"
            >
              <div className="p-4">
                {/* User info section - show when authenticated */}
                {isAuthenticated && (
                  <div className="mb-4 pb-4 border-b border-gray-800/80">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-full">
                        <UserIcon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {currentUser?.attributes?.email || 'User'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Logged in
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Menu items with staggered animation */}
                <motion.div className="space-y-2">
                  {[
                    {
                      name: 'Search',
                      icon: <SearchIcon className="w-5 h-5" />,
                      onClick: () => handlePanelToggle('search', !showSearch),
                      active: showSearch,
                      show: true
                    },
                    {
                      name: 'Preferences',
                      icon: <AdjustmentsHorizontalIcon className="w-5 h-5" />,
                      onClick: () => handlePanelToggle('preferences'),
                      active: false,
                      show: isAuthenticated
                    },
                    {
                      name: 'Favorites',
                      icon: <HeartIcon className="w-5 h-5" />,
                      onClick: () => handlePanelToggle('favorites', !showFavorites),
                      active: showFavorites,
                      show: isAuthenticated
                    },
                    {
                      name: 'Watchlist',
                      icon: <ClockIcon className="w-5 h-5" />,
                      onClick: () => handlePanelToggle('watchlist', !showWatchlist),
                      active: showWatchlist,
                      show: isAuthenticated
                    },
                    {
                      name: 'Account Settings',
                      icon: <UserIcon className="w-5 h-5" />,
                      onClick: () => handlePanelToggle('account'),
                      active: false,
                      show: isAuthenticated
                    }
                  ].map((item, index) => (
                    item.show && (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: index * 0.05,
                          duration: 0.2
                        }}
                      >
                        <button 
                          onClick={item.onClick}
                          className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                            item.active 
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                              : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                          }`}
                        >
                          <div className="mr-3">
                            {item.icon}
                          </div>
                          <span>{item.name}</span>
                        </button>
                      </motion.div>
                    )
                  ))}
                  
                  {/* Sign out button for authenticated users */}
                  {isAuthenticated && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: 0.25,
                        duration: 0.2
                      }}
                    >
                      <div className="pt-2 mt-2 border-t border-gray-800/80">
                        <button 
                          onClick={() => {
                            if (onSignout) onSignout();
                            setShowMobileMenu(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-left text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                        >
                          <span>Sign out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Sign in button for non-authenticated users */}
                  {!isAuthenticated && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: 0.1,
                        duration: 0.2
                      }}
                    >
                      <Link 
                        to="/auth"
                        onClick={() => setShowMobileMenu(false)}
                        className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-center text-white rounded-lg font-medium shadow-md transition-all duration-200"
                      >
                        Sign In
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Favorites panel is now rendered from App.js */}
    </motion.header>
  );
}

export default Header;
