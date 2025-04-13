// WatchlistSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import MediaCard from './MediaCard';

// Cache utilities for watchlist
const WATCHLIST_CACHE_KEY = 'user_watchlist_cache';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

const getWatchlistFromCache = (userId) => {
  try {
    const cacheData = localStorage.getItem(`${WATCHLIST_CACHE_KEY}_${userId}`);
    if (!cacheData) return null;
    
    const { data, timestamp } = JSON.parse(cacheData);
    
    if (Date.now() - timestamp < CACHE_EXPIRY_TIME) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving from watchlist cache:', error);
    return null;
  }
};

const cacheWatchlist = (userId, watchlist) => {
  try {
    const cacheData = {
      data: watchlist,
      timestamp: Date.now()
    };
    localStorage.setItem(`${WATCHLIST_CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to watchlist cache:', error);
  }
};

// Loading skeleton for media cards
const MediaCardSkeleton = () => (
  <motion.div 
    className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md"
    initial={{ opacity: 0.6 }}
    animate={{ 
      opacity: [0.6, 0.8, 0.6],
      transition: { 
        repeat: Infinity, 
        duration: 1.5 
      }
    }}
  >
    <div className="h-[140px] bg-gray-700" />
    <div className="p-3 space-y-2">
      <div className="w-3/4 h-5 bg-gray-700 rounded mb-2" />
      <div className="w-1/2 h-4 bg-gray-700 rounded" />
      <div className="flex justify-between">
        <div className="w-10 h-4 bg-gray-700 rounded" />
        <div className="w-10 h-4 bg-gray-700 rounded" />
      </div>
    </div>
  </motion.div>
);

const WatchlistSection = ({ currentUser, isAuthenticated, onClose, inHeader = false }) => {
  const [isOpen, setIsOpen] = useState(inHeader ? true : false);
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);
  const watchlistScrollRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!isOpen || !inHeader) return;
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, inHeader]);

  const fetchWatchlist = async () => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No access token available');
      setError('Authentication token missing');
      return;
    }
  
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = currentUser.username || currentUser.attributes?.sub;
      const cachedWatchlist = getWatchlistFromCache(userId);
      
      if (cachedWatchlist) {
        console.log('Using cached watchlist data');
        setUserWatchlist(cachedWatchlist);
        setIsLoading(false);
        return;
      }
      
      console.log('Fetching watchlist from API...');
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/watchlist`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch watchlist: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const watchlist = data && data.items ? data.items : (Array.isArray(data) ? data : []);
      
      cacheWatchlist(userId, watchlist);
      setUserWatchlist(watchlist);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError('Failed to load watchlist. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated && currentUser?.signInUserSession) {
      fetchWatchlist();
    }
  }, [isOpen, isAuthenticated, currentUser?.signInUserSession]);

  const handleClose = () => {
    if (onClose) onClose();
    setIsOpen(false);
  };

  const handleWatchlistToggle = async (mediaId, isInWatchlist) => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No access token available');
      return;
    }
    
    const userId = currentUser.username || currentUser.attributes?.sub;
    
    if (!isInWatchlist) {
      const updatedWatchlist = userWatchlist.filter(item => item.mediaId !== mediaId);
      setUserWatchlist(updatedWatchlist);
      cacheWatchlist(userId, updatedWatchlist);
      
      try {
        await fetch(
          `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/watchlist/${mediaId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );
      } catch (error) {
        console.error('Error removing from watchlist:', error);
      }
    } else {
      fetchWatchlist();
    }
  };

  if (!isAuthenticated) return null;

  // Header mode render
  if (inHeader) {
    return (
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" } }}
        className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 w-full"
      >
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">Your Watchlist</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchWatchlist}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Refresh watchlist"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Close watchlist"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 gap-3 pb-2">
              {[...Array(4)].map((_, i) => (
                <MediaCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-6">
              <p className="text-red-400 mb-3">{error}</p>
              <button
                onClick={fetchWatchlist}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && userWatchlist.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-2">
                <ClockIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-white font-medium mb-2">Your watchlist is empty</p>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Browse movies and shows and click the clock icon to add them to your watchlist
              </p>
            </div>
          )}

          {!isLoading && userWatchlist.length > 0 && (
            <div 
              ref={watchlistScrollRef}
              className="grid grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar"
            >
              {userWatchlist.map((item) => (
                <MediaCard
                  key={`watchlist-${item.mediaId}-${item.mediaType}`}
                  result={{
                    id: item.mediaId,
                    media_type: item.mediaType,
                    title: item.title,
                    name: item.title,
                    poster_path: item.posterPath,
                    backdrop_path: item.backdropPath,
                    vote_average: item.voteAverage || 0,
                    release_date: item.releaseDate,
                    first_air_date: item.releaseDate,
                  }}
                  currentUser={currentUser}
                  isMiniCard={true}
                  fromWatchlist={true}
                  onWatchlistToggle={(mediaId) => handleWatchlistToggle(mediaId, false)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fullscreen mode render
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl overflow-hidden relative"
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Your Watchlist</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchWatchlist}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Refresh watchlist"
                  >
                    <ArrowPathIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Close watchlist"
                  >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <MediaCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={fetchWatchlist}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!isLoading && userWatchlist.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 mb-4">
                    <ClockIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-white font-medium mb-2">Your watchlist is empty</p>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    Browse movies and shows and click the clock icon to add them to your watchlist
                  </p>
                </div>
              )}

              {!isLoading && userWatchlist.length > 0 && (
                <div 
                  ref={watchlistScrollRef}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 custom-scrollbar"
                >
                  {userWatchlist.map((item) => (
                    <MediaCard
                      key={`watchlist-${item.mediaId}-${item.mediaType}`}
                      result={{
                        id: item.mediaId,
                        media_type: item.mediaType,
                        title: item.title,
                        name: item.title,
                        poster_path: item.posterPath,
                        backdrop_path: item.backdropPath,
                        vote_average: item.voteAverage || 0,
                        release_date: item.releaseDate,
                        first_air_date: item.releaseDate,
                      }}
                      currentUser={currentUser}
                      isMiniCard={false}
                      fromWatchlist={true}
                      onWatchlistToggle={(mediaId) => handleWatchlistToggle(mediaId, false)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WatchlistSection;
