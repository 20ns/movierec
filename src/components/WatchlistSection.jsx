// WatchlistSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, ArrowPathIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import MediaCard from './MediaCard';
import { EventEmitter } from '../events';

// Cache utilities (assuming these are correct)
const WATCHLIST_CACHE_KEY = 'user_watchlist_cache';
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

const clearWatchlistCache = (userId) => {
  try {
    localStorage.removeItem(`${WATCHLIST_CACHE_KEY}_${userId}`);
    console.log(`Watchlist cache cleared for user ${userId}`);
  } catch (error) {
    console.error('Error clearing watchlist cache:', error);
  }
};

const getWatchlistFromCache = (userId) => {
  try {
    const cacheData = localStorage.getItem(`${WATCHLIST_CACHE_KEY}_${userId}`);
    if (!cacheData) return null;
    const { data, timestamp } = JSON.parse(cacheData);
    
    if (Date.now() - timestamp < CACHE_EXPIRY_TIME) {
        console.log(`Using cached watchlist for user ${userId}`);
        return data;
    }
    console.log(`Watchlist cache expired for user ${userId}`);
    clearWatchlistCache(userId); // Clear expired cache
    return null;
  } catch (error) {
    console.error('Error retrieving from watchlist cache:', error);
    clearWatchlistCache(userId); // Clear potentially corrupted cache
    return null;
  }
};

const cacheWatchlist = (userId, watchlist) => {
  try {
    if (!Array.isArray(watchlist)) {
      console.warn('Attempted to cache non-array watchlist data:', watchlist);
      return;
    }
    const cacheData = { data: watchlist, timestamp: Date.now() };
    localStorage.setItem(`${WATCHLIST_CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
    console.log(`Watchlist cached for user ${userId}, items: ${watchlist.length}`);
  } catch (error) {
    console.error('Error saving to watchlist cache:', error);
  }
};

// Loading Skeleton
const MediaCardSkeleton = ({ isMini = false }) => (
    <motion.div
      className={`bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md 
                ${isMini ? 'w-32' : 'w-full'}`}
      initial={{ opacity: 0.6 }}
      animate={{
        opacity: [0.6, 0.8, 0.6],
        transition: { repeat: Infinity, duration: 1.5 }
      }}
    >
      <div className="aspect-[2/3] bg-gray-700" />
      <div className="p-3 space-y-2">
        <div className="w-3/4 h-5 bg-gray-700 rounded mb-2" />
        <div className="w-1/2 h-4 bg-gray-700 rounded" />
        <div className="flex justify-between items-center mt-1">
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
  const [sortOption, setSortOption] = useState('dateAdded'); // Default sort
  const [showSortMenu, setShowSortMenu] = useState(false);
  const panelRef = useRef(null);
  const sortMenuRef = useRef(null);
  const watchlistScrollRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Utility: Map API Item to MediaCard Result
  const mapApiItemToMediaCardResult = (item) => {
    if (!item || !item.mediaId) {
      console.warn('Skipping invalid raw watchlist item:', item);
      return null; // Skip invalid items
    }
    
    const defaultTitle = 'Unknown Title';
    const defaultMediaType = 'movie';
    
    let mediaType = item.mediaType || defaultMediaType;
    
    const result = {
      id: item.mediaId,
      media_type: mediaType,
      title: item.title || item.name || defaultTitle,
      name: item.name || item.title || defaultTitle,
      poster_path: item.posterPath || item.poster_path || null,
      backdrop_path: item.backdropPath || item.backdrop_path || null,
      release_date: item.releaseDate || item.firstAirDate || item.release_date || item.first_air_date || null,
      first_air_date: item.firstAirDate || item.releaseDate || item.first_air_date || item.release_date || null,
      vote_average: typeof item.voteAverage === 'number' ? parseFloat(item.voteAverage) : 
                 (typeof item.vote_average === 'number' ? parseFloat(item.vote_average) : 0),
      popularity: typeof item.popularity === 'number' ? item.popularity : 0,
      genre_ids: Array.isArray(item.genreIds) ? item.genreIds :
                 (item.genres && Array.isArray(item.genres) ? item.genres.map(g => g?.id).filter(id => id != null) :
                 (Array.isArray(item.genre_ids) ? item.genre_ids : [])),
      ...item
    };

    return result;
  };

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

  // Close sort menu when clicking outside
  useEffect(() => {
    function handleClickOutsideSort(event) {
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSort);
    return () => document.removeEventListener('mousedown', handleClickOutsideSort);
  }, [showSortMenu]);

  const fetchWatchlist = async (forceRefresh = false) => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('Watchlist Fetch: No access token available');
      setError('Authentication token missing');
      setIsLoading(false);
      return;
    }

    const userId = currentUser.username || currentUser.attributes?.sub;
    if (!userId) {
      console.error('Watchlist Fetch: User ID missing');
      setError('User identifier missing');
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      console.log('Watchlist Fetch: Skipped (recently fetched)');
      if (userWatchlist.length > 0) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`Watchlist Fetch: Starting ${forceRefresh ? '(Forced Refresh)' : ''} for user ${userId}`);

    try {
      const cachedWatchlist = !forceRefresh ? getWatchlistFromCache(userId) : null;

      if (cachedWatchlist) {
        console.log('Watchlist Fetch: Using cached data.');
        const mappedCachedWatchlist = cachedWatchlist.map(mapApiItemToMediaCardResult).filter(Boolean);
        setUserWatchlist(mappedCachedWatchlist);
        setIsLoading(false);
        lastFetchTimeRef.current = now;
        return;
      }

      console.log('Watchlist Fetch: Fetching from API...');
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

      const responseText = await response.text();
      console.log(`Watchlist Fetch: API Response Status: ${response.status}`);
      console.log('Watchlist Fetch: Raw API Response Body:', responseText);

      if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${response.statusText}. Body: ${responseText}`);
      }

      let rawData;
      try {
        rawData = JSON.parse(responseText);
      } catch (parseError) {
          console.error("Watchlist Fetch: Failed to parse API response JSON:", parseError);
          throw new Error(`Invalid JSON received from API. Body: ${responseText}`);
      }

      console.log('Watchlist Fetch: Parsed API Data:', rawData);

      const rawItems = rawData?.items && Array.isArray(rawData.items) ? rawData.items
                     : Array.isArray(rawData) ? rawData
                     : [];

      console.log(`Watchlist Fetch: Found ${rawItems.length} raw items in response.`);

      const processedWatchlist = rawItems.map(mapApiItemToMediaCardResult).filter(Boolean);

      console.log('Watchlist Fetch: Processed Watchlist (passed to state):', processedWatchlist);

      lastFetchTimeRef.current = now;
      cacheWatchlist(userId, processedWatchlist);
      setUserWatchlist(processedWatchlist);

    } catch (err) {
      console.error('Watchlist Fetch: Error during fetch or processing:', err);
      setError(`Failed to load watchlist. ${err.message}`);
      if (userId) clearWatchlistCache(userId);
    } finally {
      setIsLoading(false);
      console.log("Watchlist Fetch: Finished.");
    }
  };

  // Sort watchlist based on current sort option
  const sortedWatchlist = React.useMemo(() => {
    if (!userWatchlist.length) return [];
    
    const watchlist = [...userWatchlist]; // Create a copy to avoid mutating original
    
    switch (sortOption) {
      case 'alphabetical':
        return watchlist.sort((a, b) => a.title.localeCompare(b.title));
      case 'rating':
        return watchlist.sort((a, b) => b.vote_average - a.vote_average);
      case 'dateAdded':
      default:
        // Assuming most recently added is first in the array from API
        return watchlist;
    }
  }, [userWatchlist, sortOption]);

  // Animation variants for micro-interactions
  const itemAnimationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.5 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated && currentUser?.signInUserSession) {
      fetchWatchlist();
      if (inHeader) {
        EventEmitter.emit('header-panel-opened', { panel: 'watchlist' });
      }
    }
  }, [isOpen, isAuthenticated, currentUser?.signInUserSession, inHeader]);

  useEffect(() => {
    const handleHeaderPanelOpened = (data) => {
      if (inHeader && isOpen && data?.panel !== 'watchlist') {
        handleClose();
      }
    };
    EventEmitter.on('header-panel-opened', handleHeaderPanelOpened);
    return () => EventEmitter.off('header-panel-opened', handleHeaderPanelOpened);
  }, [inHeader, isOpen]);

  useEffect(() => {
    const handleWatchlistUpdate = (event) => {
        console.log('WatchlistSection received watchlist-updated event:', event.detail);
        if (!currentUser) return;
        const userId = currentUser.username || currentUser.attributes?.sub;
        if (!userId) return;

        const detail = event.detail;
        if (!detail || typeof detail.mediaId === 'undefined' || typeof detail.isInWatchlist === 'undefined') {
            console.warn('Received watchlist-updated event with missing/invalid detail:', detail);
            fetchWatchlist(true);
            return;
        }

        const { mediaId: updatedId, isInWatchlist: newStatus } = detail;

        if (newStatus) {
            console.log(`Watchlist Update: Item ${updatedId} added externally, forcing refresh.`);
            setTimeout(() => fetchWatchlist(true), 300);
        } else {
            console.log(`Watchlist Update: Item ${updatedId} removed externally, updating local state.`);
            const updatedList = userWatchlist.filter(item => String(item.id) !== String(updatedId));
            setUserWatchlist(updatedList);
            cacheWatchlist(userId, updatedList);
        }
    };

    const eventTarget = EventEmitter.on ? EventEmitter : document;
    const addListener = eventTarget.on?.bind(eventTarget) || eventTarget.addEventListener?.bind(eventTarget);
    const removeListener = eventTarget.off?.bind(eventTarget) || eventTarget.removeEventListener?.bind(eventTarget);

    if (addListener && removeListener) {
        addListener('watchlist-updated', handleWatchlistUpdate);
        return () => removeListener('watchlist-updated', handleWatchlistUpdate);
    } else {
        console.error("Could not add/remove event listener for watchlist-updated");
        return () => {};
    }
  }, [currentUser, userWatchlist]);

  const handleClose = () => {
    if (onClose) onClose();
    setIsOpen(false);
  };

  const handleWatchlistToggle = async (mediaIdToRemove, _isInWatchlist) => {
     console.log(`Watchlist Toggle: Request to remove ${mediaIdToRemove}`);

    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('Watchlist Toggle: No access token.');
      setError("Authentication needed to modify watchlist.");
      return;
    }
    const userId = currentUser.username || currentUser.attributes?.sub;
    if (!userId) {
         console.error('Watchlist Toggle: User ID missing.');
         setError("User identifier missing.");
         return;
    }

    // Optimistic UI Update
    const originalWatchlist = [...userWatchlist];
    const updatedWatchlist = userWatchlist.filter(item => String(item.id) !== String(mediaIdToRemove));
    setUserWatchlist(updatedWatchlist);
    cacheWatchlist(userId, updatedWatchlist);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/watchlist/${mediaIdToRemove}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      const responseText = await response.text();
      if (!response.ok) {
        console.error(`Watchlist Toggle: API DELETE failed (${response.status})`, responseText);
        throw new Error(`Failed to remove item (${response.status})`);
      }

      console.log(`Watchlist Toggle: Successfully removed ${mediaIdToRemove} via API`);
      clearWatchlistCache(userId);

      const eventDetail = { detail: { mediaId: mediaIdToRemove, isInWatchlist: false } };
      EventEmitter.emit('watchlist-updated', eventDetail);
      document.dispatchEvent(new CustomEvent('watchlist-updated', eventDetail));

    } catch (error) {
      console.error('Watchlist Toggle: Error removing item:', error);
      setError('Failed to remove item. Please try refreshing.');
      setUserWatchlist(originalWatchlist);
      cacheWatchlist(userId, originalWatchlist);
    }
  };

  if (!isAuthenticated) return null;

  // Header Dropdown Mode
  if (inHeader) {
    return (
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" } }}
        className="absolute top-16 right-0 bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 w-72 sm:w-80 md:w-96 max-w-[90vw] z-50"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-3 sm:p-4">
          {/* Header Bar */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">Your Watchlist</h2>
            <div className="flex items-center space-x-2">
              {/* Sort button */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Sort watchlist"
                >
                  <ArrowsUpDownIcon className="h-5 w-5" />
                </button>
                
                {/* Sort dropdown menu */}
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      ref={sortMenuRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => { setSortOption('dateAdded'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'dateAdded' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          Date Added (Default)
                        </button>
                        <button
                          onClick={() => { setSortOption('alphabetical'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'alphabetical' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          Alphabetical (A-Z)
                        </button>
                        <button
                          onClick={() => { setSortOption('rating'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'rating' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          Rating (High to Low)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button
                onClick={() => fetchWatchlist(true)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh watchlist"
                disabled={isLoading}
              >
                <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Close watchlist"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Loading State (Skeletons) */}
          {isLoading && userWatchlist.length === 0 && (
            <div className="grid grid-cols-2 gap-3 pb-2">
              {[...Array(4)].map((_, i) => <MediaCardSkeleton key={`skel-header-${i}`} isMini />)}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-6">
              <p className="text-red-400 mb-3 text-sm">{error}</p>
              <button onClick={() => fetchWatchlist(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Try Again</button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && userWatchlist.length === 0 && (
             <div className="text-center py-6 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-2"><ClockIcon className="h-8 w-8 text-gray-400" /></div>
              <p className="text-white font-medium mb-1">Your watchlist is empty</p>
              <p className="text-gray-400 text-xs max-w-sm mx-auto">Add movies and shows using the clock icon.</p>
            </div>
          )}

          {/* Content List */}
           {!error && userWatchlist.length > 0 && (
            <div ref={watchlistScrollRef} className="grid grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence initial={false}>
                {sortedWatchlist.map((mappedResultItem) => (
                  <motion.div 
                    key={`watchlist-header-${mappedResultItem.id}-${mappedResultItem.media_type}`}
                    variants={itemAnimationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >                    <MediaCard
                        result={mappedResultItem}
                        currentUser={currentUser}
                        isMiniCard={true}
                        fromWatchlist={true}
                        initialIsInWatchlist={true}
                        onWatchlistToggle={() => handleWatchlistToggle(mappedResultItem.id, false)}
                    />
                    {/* Debug logging */}
                    {console.log('WatchlistSection Debug (Header):', { 
                      id: mappedResultItem.id, 
                      title: mappedResultItem.title || mappedResultItem.name, 
                      vote_average: mappedResultItem.vote_average
                    })}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fullscreen Modal Mode
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl lg:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Your Watchlist</h2>
                <div className="flex items-center space-x-2">
                  {/* Sort control for fullscreen mode */}
                  <div className="relative mr-2">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                    >
                      <ArrowsUpDownIcon className="h-4 w-4" />
                      <span className="text-sm">
                        {sortOption === 'dateAdded' && 'Date Added'}
                        {sortOption === 'alphabetical' && 'A-Z'}
                        {sortOption === 'rating' && 'Rating'}
                      </span>
                    </button>
                    
                    <AnimatePresence>
                      {showSortMenu && (
                        <motion.div
                          ref={sortMenuRef}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50"
                        >
                          <div className="py-1">
                            <button
                              onClick={() => { setSortOption('dateAdded'); setShowSortMenu(false); }}
                              className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'dateAdded' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                              Date Added (Default)
                            </button>
                            <button
                              onClick={() => { setSortOption('alphabetical'); setShowSortMenu(false); }}
                              className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'alphabetical' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                              Alphabetical (A-Z)
                            </button>
                            <button
                              onClick={() => { setSortOption('rating'); setShowSortMenu(false); }}
                              className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'rating' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                              Rating (High to Low)
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <button
                    onClick={() => fetchWatchlist(true)}
                    className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Refresh watchlist"
                    disabled={isLoading}
                  >
                    <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Close watchlist"
                  >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 flex-grow overflow-y-auto custom-scrollbar">
              {/* Loading State */}
              {isLoading && userWatchlist.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => <MediaCardSkeleton key={`skel-full-${i}`} />)}
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button onClick={() => fetchWatchlist(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Try Again</button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && userWatchlist.length === 0 && (
                <div className="text-center py-16 space-y-4 flex flex-col items-center justify-center h-full">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 mb-4"><ClockIcon className="h-10 w-10 text-gray-400" /></div>
                  <p className="text-white text-lg font-medium mb-2">Your watchlist is empty</p>
                  <p className="text-gray-400 text-base max-w-md mx-auto">Browse movies and shows, then click the <ClockIcon className="inline h-5 w-5 text-gray-400 mx-1" /> icon to add them here.</p>
                </div>
              )}

              {/* Content List */}
              {!error && userWatchlist.length > 0 && (
                <div ref={watchlistScrollRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence initial={false}>
                    {sortedWatchlist.map((mappedResultItem) => (
                      <motion.div
                        key={`watchlist-full-${mappedResultItem.id}-${mappedResultItem.media_type}`}
                        variants={itemAnimationVariants}
                        initial="hidden"
                        animate="visible" 
                        exit="exit"
                        layout
                      >
                        <MediaCard
                          result={mappedResultItem}
                          currentUser={currentUser}
                          isMiniCard={false}
                          fromWatchlist={true}
                          initialIsInWatchlist={true}
                          onWatchlistToggle={() => handleWatchlistToggle(mappedResultItem.id, false)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
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