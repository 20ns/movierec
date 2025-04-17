// WatchlistSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import MediaCard from './MediaCard'; // Assuming MediaCard expects TMDB-like structure
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

// Loading Skeleton (assuming it's okay)
const MediaCardSkeleton = () => (
    <motion.div
      className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md"
      initial={{ opacity: 0.6 }}
      animate={{
        opacity: [0.6, 0.8, 0.6],
        transition: { repeat: Infinity, duration: 1.5 }
      }}
    >
      <div className="aspect-[2/3] bg-gray-700" /> {/* Aspect ratio for poster */}
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
  const panelRef = useRef(null);
  const watchlistScrollRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // --- Utility: Map API Item to MediaCard Result ---
  // This function ensures the object passed to MediaCard has the expected fields.
  const mapApiItemToMediaCardResult = (item) => {
    if (!item || !item.mediaId) {
      console.warn('Skipping invalid raw watchlist item:', item);
      return null; // Skip invalid items
    }
    // Define defaults
    const defaultTitle = 'Unknown Title';
    const defaultMediaType = 'movie'; // Or determine based on item if possible

    // Try to determine media type more reliably if possible from item structure
    let mediaType = item.mediaType || defaultMediaType;
    // Example: if your API includes a field like 'type' or similar
    // if (item.type === 'tvshow' || item.type === 'series') mediaType = 'tv';

    const result = {
      // Essential TMDB-like fields
      id: item.mediaId, // Use mediaId as the primary ID for MediaCard
      media_type: mediaType,

      // Title / Name (provide both, MediaCard might use one or the other)
      title: item.title || item.name || defaultTitle,
      name: item.name || item.title || defaultTitle,

      // Image Paths
      poster_path: item.posterPath || item.poster_path || null,
      backdrop_path: item.backdropPath || item.backdrop_path || null,

      // Dates (provide both, MediaCard might use one or the other)
      release_date: item.releaseDate || item.firstAirDate || item.release_date || item.first_air_date || null,
      first_air_date: item.firstAirDate || item.releaseDate || item.first_air_date || item.release_date || null,

      // Ratings / Popularity
      vote_average: typeof item.voteAverage === 'number' ? item.voteAverage : (typeof item.vote_average === 'number' ? item.vote_average : 0),
      popularity: typeof item.popularity === 'number' ? item.popularity : 0,

      // Genres (handle different possible structures)
      genre_ids: Array.isArray(item.genreIds) ? item.genreIds :
                 (item.genres && Array.isArray(item.genres) ? item.genres.map(g => g?.id).filter(id => id != null) :
                 (Array.isArray(item.genre_ids) ? item.genre_ids : [])), // Fallback to genre_ids

      // --- Include ALL original fields from the API item ---
      // This allows MediaCard to potentially access other fields if needed,
      // but ensures the core fields above are correctly named and present.
      ...item // Spread the original item last, it won't overwrite the mapped fields above
    };

    // Final check for null poster path (optional, depends on MediaCard)
    // if (!result.poster_path) {
    //   console.warn(`Item ${result.id} (${result.title}) missing poster_path.`);
    //   // return null; // Optionally filter out items without posters
    // }

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
        // Map cached data just in case it was stored before mapping logic improved
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

      // --- DETAILED LOGGING ---
      const responseText = await response.text(); // Read response body once
      console.log(`Watchlist Fetch: API Response Status: ${response.status}`);
      console.log('Watchlist Fetch: Raw API Response Body:', responseText);
      // --- END LOGGING ---

      if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${response.statusText}. Body: ${responseText}`);
      }

      let rawData;
      try {
        rawData = JSON.parse(responseText); // Parse the text we already read
      } catch (parseError) {
          console.error("Watchlist Fetch: Failed to parse API response JSON:", parseError);
          throw new Error(`Invalid JSON received from API. Body: ${responseText}`);
      }

      // --- MORE LOGGING ---
      console.log('Watchlist Fetch: Parsed API Data:', rawData);
      // --- END LOGGING ---

      // Determine the actual array of items (handle different possible response structures)
      const rawItems = rawData?.items && Array.isArray(rawData.items) ? rawData.items
                     : Array.isArray(rawData) ? rawData
                     : []; // Default to empty array if structure is unknown

      console.log(`Watchlist Fetch: Found ${rawItems.length} raw items in response.`);

      // Process items using the mapping function
      const processedWatchlist = rawItems.map(mapApiItemToMediaCardResult).filter(Boolean); // filter(Boolean) removes nulls

      // --- FINAL LOGGING ---
      console.log('Watchlist Fetch: Processed Watchlist (passed to state):', processedWatchlist);
      // --- END LOGGING ---


      lastFetchTimeRef.current = now;
      cacheWatchlist(userId, processedWatchlist); // Cache the processed data
      setUserWatchlist(processedWatchlist);

    } catch (err) {
      console.error('Watchlist Fetch: Error during fetch or processing:', err);
      setError(`Failed to load watchlist. ${err.message}`);
      // Attempt to clear cache on error
       if (userId) clearWatchlistCache(userId);
    } finally {
      setIsLoading(false);
      console.log("Watchlist Fetch: Finished.");
    }
  };

  // Fetch on initial mount/open if authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated && currentUser?.signInUserSession) {
      fetchWatchlist();
      if (inHeader) {
        EventEmitter.emit('header-panel-opened', { panel: 'watchlist' });
      }
    }
     // If it closes, reset error state? Optional.
     // if (!isOpen) {
     //   setError(null);
     // }
  }, [isOpen, isAuthenticated, currentUser?.signInUserSession, inHeader]);

  // Listen for header panel opened events
  useEffect(() => {
    const handleHeaderPanelOpened = (data) => {
      if (inHeader && isOpen && data?.panel !== 'watchlist') {
        handleClose();
      }
    };
    EventEmitter.on('header-panel-opened', handleHeaderPanelOpened);
    return () => EventEmitter.off('header-panel-opened', handleHeaderPanelOpened);
  }, [inHeader, isOpen]);

  // Listen for external watchlist updates
  useEffect(() => {
    const handleWatchlistUpdate = (event) => {
        console.log('WatchlistSection received watchlist-updated event:', event.detail);
        if (!currentUser) return;
        const userId = currentUser.username || currentUser.attributes?.sub;
        if (!userId) return;

        const detail = event.detail;
        if (!detail || typeof detail.mediaId === 'undefined' || typeof detail.isInWatchlist === 'undefined') {
            console.warn('Received watchlist-updated event with missing/invalid detail:', detail);
            // Force refresh might be safest here
            fetchWatchlist(true);
            return;
        }

        const { mediaId: updatedId, isInWatchlist: newStatus } = detail;

        if (newStatus) {
             // Item added externally. Refresh needed to get full data.
            console.log(`Watchlist Update: Item ${updatedId} added externally, forcing refresh.`);
            // Add a small delay maybe? To ensure backend is consistent.
            setTimeout(() => fetchWatchlist(true), 300);
        } else {
            // Item removed externally. Optimistically remove from local state.
            console.log(`Watchlist Update: Item ${updatedId} removed externally, updating local state.`);
            const updatedList = userWatchlist.filter(item => String(item.id) !== String(updatedId)); // Use 'id' now from mapped result
            setUserWatchlist(updatedList);
            // Update cache optimistically
            cacheWatchlist(userId, updatedList);
        }
    };

    // Use EventEmitter if available, else document
    const eventTarget = EventEmitter.on ? EventEmitter : document;
    const addListener = eventTarget.on?.bind(eventTarget) || eventTarget.addEventListener?.bind(eventTarget);
    const removeListener = eventTarget.off?.bind(eventTarget) || eventTarget.removeEventListener?.bind(eventTarget);

    if (addListener && removeListener) {
        addListener('watchlist-updated', handleWatchlistUpdate);
        return () => removeListener('watchlist-updated', handleWatchlistUpdate);
    } else {
        console.error("Could not add/remove event listener for watchlist-updated");
        return () => {}; // No-op cleanup
    }

  }, [currentUser, userWatchlist]); // userWatchlist needed for removal logic

  const handleClose = () => {
    if (onClose) onClose();
    setIsOpen(false);
  };

  // Handles removal from watchlist *initiated from within this component*
  const handleWatchlistToggle = async (mediaIdToRemove, _isInWatchlist) => {
     // _isInWatchlist is always false when called from here
     console.log(`Watchlist Toggle: Request to remove ${mediaIdToRemove}`);

    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('Watchlist Toggle: No access token.');
      setError("Authentication needed to modify watchlist."); // Show user-facing error
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
    const updatedWatchlist = userWatchlist.filter(item => String(item.id) !== String(mediaIdToRemove)); // Use 'id'
    setUserWatchlist(updatedWatchlist);
    cacheWatchlist(userId, updatedWatchlist); // Update cache optimistically

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

      const responseText = await response.text(); // Read body for context
      if (!response.ok) {
        console.error(`Watchlist Toggle: API DELETE failed (${response.status})`, responseText);
        throw new Error(`Failed to remove item (${response.status})`);
      }

      console.log(`Watchlist Toggle: Successfully removed ${mediaIdToRemove} via API`);
      clearWatchlistCache(userId); // Invalidate cache after successful API call

      // Emit event for other components
       const eventDetail = { detail: { mediaId: mediaIdToRemove, isInWatchlist: false } };
       EventEmitter.emit('watchlist-updated', eventDetail);
       document.dispatchEvent(new CustomEvent('watchlist-updated', eventDetail));

    } catch (error) {
      console.error('Watchlist Toggle: Error removing item:', error);
      setError('Failed to remove item. Please try refreshing.'); // User-facing error
      // Rollback UI changes
      setUserWatchlist(originalWatchlist);
      cacheWatchlist(userId, originalWatchlist); // Rollback cache
    }
  };


  if (!isAuthenticated) return null;

  // ----- RENDER LOGIC -----
  // (Keeping the render logic largely the same as before, but ensuring
  // the 'result' prop passed to MediaCard uses the mapped object)

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
              <button /* Refresh */
                onClick={() => fetchWatchlist(true)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh watchlist"
                disabled={isLoading}
              >
                <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button /* Close */
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
              {[...Array(4)].map((_, i) => <MediaCardSkeleton key={`skel-header-${i}`} />)}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && ( // Show error only when not loading
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
           {/* Render list if we have items, even if loading is true (shows existing items while refreshing) */}
          {!error && userWatchlist.length > 0 && (
            <div ref={watchlistScrollRef} className="grid grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {userWatchlist.map((mappedResultItem) => {
                 // --- LOGGING per card ---
                 // console.log(`Rendering Header MediaCard for ID: ${mappedResultItem.id}`, mappedResultItem);
                 // --- END LOGGING ---
                 return (
                    <MediaCard
                        key={`watchlist-header-${mappedResultItem.id}-${mappedResultItem.media_type}`}
                        result={mappedResultItem} // Pass the fully mapped object
                        currentUser={currentUser}
                        isMiniCard={true}
                        fromWatchlist={true}
                        initialIsInWatchlist={true}
                        onWatchlistToggle={() => handleWatchlistToggle(mappedResultItem.id, false)} // Use mapped 'id'
                    />
                 );
               })}
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
        <motion.div /* Backdrop */
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div /* Modal Content */
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl lg:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Your Watchlist</h2>
                 <div className="flex items-center space-x-2">
                    <button /* Refresh */
                        onClick={() => fetchWatchlist(true)}
                        className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Refresh watchlist"
                        disabled={isLoading}
                    >
                        <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button /* Close */
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
                   {userWatchlist.map((mappedResultItem) => {
                      // --- LOGGING per card ---
                      // console.log(`Rendering Full MediaCard for ID: ${mappedResultItem.id}`, mappedResultItem);
                      // --- END LOGGING ---
                      return (
                         <MediaCard
                            key={`watchlist-full-${mappedResultItem.id}-${mappedResultItem.media_type}`}
                            result={mappedResultItem} // Pass the fully mapped object
                            currentUser={currentUser}
                            isMiniCard={false}
                            fromWatchlist={true}
                            initialIsInWatchlist={true}
                            onWatchlistToggle={() => handleWatchlistToggle(mappedResultItem.id, false)} // Use mapped 'id'
                         />
                      );
                    })}
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