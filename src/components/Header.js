import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon as SearchIcon, 
  UserIcon, 
  AdjustmentsHorizontalIcon, 
  HeartIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  NewspaperIcon // Add NewspaperIcon
} from '@heroicons/react/24/outline';
import FavoritesSection from './FavoritesSection';

// Animation variants defined outside component to prevent recreation on each render
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

// Memoized component to prevent unnecessary renders
const Header = memo(function Header({
  currentUser,
  isAuthenticated,
  onSearchClick,
  showSearch,
  onPreferencesClick,
  onFavoritesClick,
  showFavorites,
  onWatchlistClick,
  showWatchlist,
  onSignout,
  onAccountClick,
  hasBasicPreferencesOnly = false,
  isQuestionnaireFullyComplete = false,
  searchContainerRef // Added new prop for the search container
}) {
  const navigate = useNavigate(); // Instantiate useNavigate
  const [hoveredButton, setHoveredButton] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const headerRef = useRef(null);

  // Handle panel toggling with useCallback to prevent recreation on each render
  const handlePanelToggle = useCallback((panelName, isVisible) => {
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
          if (typeof isVisible !== 'undefined') {
            if (isVisible) {
              closeOtherPanels('search');
            }
            onSearchClick(isVisible);
          } else {
            if (!showSearch) {
              closeOtherPanels('search');
            }
            onSearchClick(!showSearch);
          }
        }
        break;
      case 'favorites':
        if (onFavoritesClick) {
          if (typeof isVisible !== 'undefined') {
            // Only close other panels when opening
            if (isVisible) closeOtherPanels('favorites');
            onFavoritesClick(isVisible);
          } else {
            // Toggle behavior: close others only when opening
            if (!showFavorites) closeOtherPanels('favorites');
            onFavoritesClick(!showFavorites);
          }
        }
        break;
      case 'watchlist':
        if (onWatchlistClick) {
          if (typeof isVisible !== 'undefined') {
            // Only close other panels when opening
            if (isVisible) closeOtherPanels('watchlist');
            onWatchlistClick(isVisible);
          } else {
            // Toggle behavior: close others only when opening
            if (!showWatchlist) closeOtherPanels('watchlist');
            onWatchlistClick(!showWatchlist);
          }
        }
        break;
      case 'preferences':
        if (onPreferencesClick) {
          closeOtherPanels('preferences');
          onPreferencesClick();
        }
        break;
      case 'account':
        if (onAccountClick) {
          closeOtherPanels('account');
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
  }, [showSearch, showFavorites, showWatchlist, showMobileMenu, onSearchClick, onFavoritesClick, onWatchlistClick, onPreferencesClick, onAccountClick]);

  // Use useCallback for event handlers
  const handleUserDropdownToggle = useCallback(() => {
      if (showSearch) onSearchClick(false);
      if (showFavorites) onFavoritesClick(false);
      if (showWatchlist) onWatchlistClick(false);
      setShowMobileMenu(false);
      setShowUserDropdown(prev => !prev);
  }, [showSearch, showFavorites, showWatchlist, onSearchClick, onFavoritesClick, onWatchlistClick]);

  const handleMobileMenuToggle = useCallback(() => {
    setShowMobileMenu(prev => !prev);
  }, []);

  const handleSignOut = useCallback(() => {
    if (onSignout) {
      onSignout();
      setShowUserDropdown(false);
      setShowMobileMenu(false);
    }
  }, [onSignout]);

  // Handle modal opening (using passive event listener for better performance)
  useEffect(() => {
    const handleModalOpen = () => {
      setShowUserDropdown(false);
      setShowMobileMenu(false);
    };
    
    document.addEventListener('modal-opened', handleModalOpen, { passive: true });
    return () => document.removeEventListener('modal-opened', handleModalOpen);
  }, []);

  // Close dropdowns on window resize (helps with mobile orientation changes)
  useEffect(() => {
    const handleResize = () => {
      setShowUserDropdown(false);
      setShowMobileMenu(false);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close all panels when clicking outside header
  useEffect(() => {
    const handleClickOutside = event => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        // Check if the click is inside the search container (if search is active and ref is provided)
        const isClickInsideSearchContainer =
          showSearch &&
          searchContainerRef &&
          searchContainerRef.current &&
          searchContainerRef.current.contains(event.target);

        if (showSearch && !isClickInsideSearchContainer) {
          onSearchClick(false);
        }
        // Close other panels as before
        if (showFavorites) onFavoritesClick(false);
        if (showWatchlist) onWatchlistClick(false);
        setShowUserDropdown(false);
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch, showFavorites, showWatchlist, onSearchClick, onFavoritesClick, onWatchlistClick, searchContainerRef]);
  
  // Memoize menu items to prevent recreation on each render
  const mobileMenuItems = useMemo(() => [
    {
      name: 'Search',
      icon: <SearchIcon className="w-5 h-5" />,
      onClick: () => handlePanelToggle('search', !showSearch),
      active: showSearch,
      show: true
    },
    // Add Blog item for mobile menu
    {
      name: 'Blog',
      icon: <NewspaperIcon className="w-5 h-5" />,
      onClick: () => {
        if (showSearch) onSearchClick(false);
        if (showFavorites) onFavoritesClick(false);
        if (showWatchlist) onWatchlistClick(false);
        setShowUserDropdown(false);
        setShowMobileMenu(false);
        navigate('/blog');
      },
      active: false, // Could add active state based on location if needed
      show: true // Show for everyone
    },
    {
      name: 'Preferences',
      icon: <AdjustmentsHorizontalIcon className="w-5 h-5" />,
      onClick: () => handlePanelToggle('preferences'),
      active: false,
      show: isAuthenticated && !isQuestionnaireFullyComplete
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
      name: 'Dashboard',
      icon: <UserIcon className="w-5 h-5" />,
      onClick: () => {
        if (showSearch) onSearchClick(false);
        if (showFavorites) onFavoritesClick(false);
        if (showWatchlist) onWatchlistClick(false);
        setShowUserDropdown(false);
        setShowMobileMenu(false);
        navigate('/dashboard');
      },
      active: false,
      show: isAuthenticated
    },
    {
      name: 'Account Settings',
      icon: <UserIcon className="w-5 h-5" />,
      onClick: () => handlePanelToggle('account'),
      active: false,
      show: isAuthenticated
    }
  ], [isAuthenticated, showSearch, showFavorites, showWatchlist, handlePanelToggle]);
  
  return (
    <motion.header ref={headerRef}
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
          <Link
            to="/"
            onClick={() => {
              if (showSearch) onSearchClick(false);
              if (showFavorites) onFavoritesClick(false);
              if (showWatchlist) onWatchlistClick(false);
              setShowUserDropdown(false);
              setShowMobileMenu(false);
            }}
            className="flex items-center"
          >
            <img
              src="/logo.png" 
              alt="MovieRec Logo" 
              className="h-8 mr-2" 
              width="32" 
              height="32" 
              loading="eager" 
            />
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
            onClick={handleMobileMenuToggle}
            className={`p-2.5 rounded-full transition-all duration-300 ${
              showMobileMenu 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30' 
                : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
            }`}
            aria-label="Toggle menu"
            aria-expanded={showMobileMenu}
            aria-controls="mobile-menu"
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
            aria-label="Search movies"
            aria-pressed={showSearch}
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

          {/* Blog button - always visible */}
          <motion.button
            variants={iconButtonVariants}
            initial="initial"
            whileHover="hover"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (showSearch) onSearchClick(false);
              if (showFavorites) onFavoritesClick(false);
              if (showWatchlist) onWatchlistClick(false);
              setShowUserDropdown(false);
              setShowMobileMenu(false);
              navigate('/blog');
            }}
            onMouseEnter={() => setHoveredButton('blog')}
            onMouseLeave={() => setHoveredButton(null)}
            className="relative p-2.5 rounded-full text-gray-300 hover:bg-gray-800/70 hover:text-white transition-colors duration-200"
            title="Blog"
            aria-label="Blog"
          >
            <NewspaperIcon className="w-5 h-5" />
            {hoveredButton === 'blog' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg pointer-events-none"
              >
                Blog
              </motion.div>
            )}
          </motion.button>
          {/* Removed duplicated Blog button block */}
          
          {/* Only show these buttons when the user is authenticated */}
          {isAuthenticated && (
            <>
              {/* Preferences button - hide when questionnaire fully complete */}
              {!isQuestionnaireFullyComplete && (
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
                aria-label={hasBasicPreferencesOnly ? "Continue with more preference questions" : "Set movie preferences"}
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
              )}
              
              {/* Favorites button */}
              <motion.button
                  variants={iconButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handlePanelToggle('favorites', !showFavorites)}
                  onMouseEnter={() => setHoveredButton('favorites')}
                  onMouseLeave={() => setHoveredButton(null)}
                className={`relative p-2.5 rounded-full transition-colors duration-200 ${
                  showFavorites ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
                title="View favorites"
                aria-label="View favorites"
                aria-pressed={showFavorites}
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handlePanelToggle('watchlist', !showWatchlist)}
                  onMouseEnter={() => setHoveredButton('watchlist')}
                  onMouseLeave={() => setHoveredButton(null)}
                className={`relative p-2.5 rounded-full transition-colors duration-200 ${
                  showWatchlist ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                }`}
                title="View watchlist"
                aria-label="View watchlist"
                aria-pressed={showWatchlist}
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
                onClick={handleUserDropdownToggle}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 100)}
                className="p-2.5 text-gray-300 hover:bg-gray-800/70 hover:text-white rounded-full transition-colors duration-200"
                title={currentUser?.attributes?.email || 'Account'}
                aria-label="User account"
                aria-expanded={showUserDropdown}
                aria-controls="user-dropdown"
              >
                <UserIcon className="w-5 h-5" />
              </motion.button>
              
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div 
                    id="user-dropdown"
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
                      role="menuitem"
                    >
                      <div className="font-medium text-white text-sm">
                        {currentUser?.attributes?.email ? 
                          currentUser.attributes.email.split('@')[0].charAt(0).toUpperCase() + 
                          currentUser.attributes.email.split('@')[0].slice(1).replace(/[._-]/g, ' ')
                          : 'Account'
                        }
                      </div>
                      <div className="text-xs text-gray-300 truncate">
                        {currentUser?.attributes?.email}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        if (showSearch) onSearchClick(false);
                        if (showFavorites) onFavoritesClick(false);
                        if (showWatchlist) onWatchlistClick(false);
                        navigate('/dashboard');
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors duration-150 flex items-center"
                      role="menuitem"
                    >
                      <span>Dashboard</span>
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors duration-150 flex items-center"
                      role="menuitem"
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

      {/* Mobile menu overlay - optimized with reduced motion for better performance */}
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
              onClick={handleMobileMenuToggle}
              aria-hidden="true"
            />
            
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.3,
                ease: "easeOut"
              }}
              className="md:hidden absolute left-2 right-2 top-full mt-2 bg-gray-900/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden z-50 border border-gray-800/50"
              role="menu"
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
                
                {/* Menu items with staggered animation - using memoized items array */}
                <motion.div className="space-y-2">
                  {mobileMenuItems.map((item, index) => (
                    item.show && (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: index * 0.05,
                          duration: 0.2
                        }}
                        role="none"
                      >
                        <button 
                          onClick={item.onClick}
                          className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                            item.active 
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                              : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                          }`}
                          role="menuitem"
                          aria-pressed={item.active}
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
                      role="none"
                    >
                      <div className="pt-2 mt-2 border-t border-gray-800/80">
                        <button 
                          onClick={handleSignOut}
                          className="w-full flex items-center px-4 py-3 text-left text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                          role="menuitem"
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
                      role="none"
                    >
                      <Link 
                        to="/auth"
                        onClick={handleMobileMenuToggle}
                        className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-center text-white rounded-lg font-medium shadow-md transition-all duration-200"
                        role="menuitem"
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
    </motion.header>
  );
});

export default Header;
