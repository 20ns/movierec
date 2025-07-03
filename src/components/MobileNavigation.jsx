import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  BookmarkIcon,
  UserIcon,
  SparklesIcon,
  FilmIcon,
  TvIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import {
  HomeIcon as HomeOutlineIcon,
  MagnifyingGlassIcon as SearchOutlineIcon,
  HeartIcon as HeartOutlineIcon,
  BookmarkIcon as BookmarkOutlineIcon,
  UserIcon as UserOutlineIcon
} from '@heroicons/react/24/outline';

// Mobile navigation tabs
const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: HomeOutlineIcon,
    activeIcon: HomeIcon,
    color: 'text-blue-500'
  },
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: SearchOutlineIcon,
    activeIcon: MagnifyingGlassIcon,
    color: 'text-purple-500'
  },
  {
    id: 'recommendations',
    label: 'For You',
    path: '/recommendations',
    icon: SparklesIcon,
    activeIcon: SparklesIcon,
    color: 'text-indigo-500'
  },
  {
    id: 'favorites',
    label: 'Favorites',
    path: '/favorites',
    icon: HeartOutlineIcon,
    activeIcon: HeartIcon,
    color: 'text-red-500'
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    path: '/watchlist',
    icon: BookmarkOutlineIcon,
    activeIcon: BookmarkIcon,
    color: 'text-green-500'
  }
];

// Mobile bottom navigation
const MobileBottomNav = ({ currentUser, isAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const currentPath = location.pathname;
    const activeItem = NAV_ITEMS.find(item => 
      item.path === currentPath || 
      (item.path !== '/' && currentPath.startsWith(item.path))
    );
    if (activeItem) {
      setActiveTab(activeItem.id);
    }
  }, [location.pathname]);

  const handleTabPress = (item) => {
    if (!isAuthenticated && ['favorites', 'watchlist'].includes(item.id)) {
      // Show login prompt for authenticated features
      navigate('/auth');
      return;
    }
    
    setActiveTab(item.id);
    navigate(item.path);
    
    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50 safe-area-bottom md:hidden"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = isActive ? item.activeIcon : item.icon;
          const needsAuth = ['favorites', 'watchlist'].includes(item.id) && !isAuthenticated;
          
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabPress(item)}
              className={`relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'
              }`}
            >
              <div className="relative">
                <IconComponent 
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive ? item.color : 'text-gray-400'
                  }`} 
                />
                {needsAuth && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-gray-900" />
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  />
                )}
              </div>
              
              <span className={`text-xs font-medium mt-1 transition-colors duration-200 ${
                isActive ? item.color : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom" />
    </motion.div>
  );
};

// Mobile drawer menu
const MobileDrawerMenu = ({ isOpen, onClose, currentUser, isAuthenticated, onAuthAction }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { 
      label: 'Browse Movies', 
      icon: FilmIcon, 
      action: () => navigate('/browse/movies'),
      description: 'Explore movie collection'
    },
    { 
      label: 'Browse TV Shows', 
      icon: TvIcon, 
      action: () => navigate('/browse/tv'),
      description: 'Discover TV series'
    },
    { 
      label: 'Account Settings', 
      icon: UserIcon, 
      action: () => navigate('/account'),
      description: 'Manage your profile',
      requiresAuth: true
    }
  ];

  const handleMenuAction = (item) => {
    if (item.requiresAuth && !isAuthenticated) {
      onAuthAction();
      onClose();
      return;
    }
    
    item.action();
    onClose();
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-gray-900/95 backdrop-blur-lg border-r border-gray-700/50 z-50 md:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">MovieRec</h2>
                    <p className="text-xs text-gray-400">Discover amazing content</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>

              {/* User section */}
              {isAuthenticated && currentUser && (
                <div className="p-6 border-b border-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {currentUser.attributes?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-400">Premium Member</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu items */}
              <div className="flex-1 py-4">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMenuAction(item)}
                    className="w-full flex items-center space-x-4 px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </div>
                    {item.requiresAuth && !isAuthenticated && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-700/50">
                {!isAuthenticated ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onAuthAction();
                      onClose();
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-medium"
                  >
                    Sign In / Sign Up
                  </motion.button>
                ) : (
                  <p className="text-center text-xs text-gray-500">
                    Swipe left to close menu
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Mobile header with hamburger menu
const MobileHeader = ({ onMenuOpen, currentUser, isAuthenticated, showSearch, onSearchToggle }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700/50 md:hidden">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onMenuOpen}
        className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
      >
        <Bars3Icon className="w-6 h-6" />
      </motion.button>
      
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-md flex items-center justify-center">
          <SparklesIcon className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-bold text-white">MovieRec</h1>
      </div>
      
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSearchToggle}
        className={`p-2 rounded-lg transition-colors ${
          showSearch ? 'text-purple-400 bg-purple-900/30' : 'text-gray-400 hover:text-white'
        }`}
      >
        <MagnifyingGlassIcon className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export {
  MobileBottomNav,
  MobileDrawerMenu,
  MobileHeader
};

export default {
  MobileBottomNav,
  MobileDrawerMenu,
  MobileHeader
};