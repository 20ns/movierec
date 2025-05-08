import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMediaList from '../hooks/useMediaList';
import { MediaCardSkeleton } from './Skeletons';
import MediaCard from './MediaCard';

export default function MediaListSection({
  title,
  IconEmpty,
  inHeader = false,
  isOpen,
  currentUser,
  isAuthenticated,
  cacheKey,
  endpoint,
  mapItem,
  eventKey,
  cardPropsFactory
}) {
  const {
    items,
    isLoading,
    error,
    sortOption,
    setSortOption,
    showSortMenu,
    setShowSortMenu,
    panelRef,
    sortMenuRef,
    scrollRef,
    fetchList
  } = useMediaList({
    currentUser,
    isAuthenticated,
    inHeader,
    isOpen,
    cacheKeyPrefix: cacheKey,
    fetchEndpoint: endpoint,
    mapItem,
    eventName: eventKey
  });

  if (!isAuthenticated) return null;

  if (inHeader) {
    return (
      <motion.div ref={panelRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" } }}
        className="absolute top-16 right-0 bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 w-72 sm:w-80 md:w-96 max-w-[90vw] z-50"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button onClick={() => setShowSortMenu(!showSortMenu)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Sort"
                >
                  {cardPropsFactory().icons.sort}
                </button>
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div ref={sortMenuRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50"
                    >
                      <div className="py-1">
                        <button onClick={() => { setSortOption('dateAdded'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'dateAdded' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                          Date Added
                        </button>
                        <button onClick={() => { setSortOption('alphabetical'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'alphabetical' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                          A–Z
                        </button>
                        <button onClick={() => { setSortOption('rating'); setShowSortMenu(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'rating' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                          Rating
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={() => fetchList(true)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh" disabled={isLoading}>
                {cardPropsFactory().icons.refresh}
              </button>
              <button onClick={() => cardPropsFactory().onClose()}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Close">
                {cardPropsFactory().icons.close}
              </button>
            </div>
          </div>
          {isLoading && items.length === 0 && (
            <div className="grid grid-cols-2 gap-3 pb-2">
              {[...Array(4)].map((_, i) => <MediaCardSkeleton key={i} isMini />)}
            </div>
          )}
          {error && (
            <div className="text-center py-6">
              <p className="text-red-400 mb-3">{error}</p>
              <button onClick={() => fetchList(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Try Again</button>
            </div>
          )}
          {!isLoading && items.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-2">
                {IconEmpty}
              </div>
              <p className="text-white font-medium mb-1">{`Your ${title.toLowerCase()} is empty`}</p>
              <p className="text-gray-400 text-xs max-w-sm mx-auto">{cardPropsFactory().emptyText}</p>
            </div>
          )}
          {!error && items.length > 0 && (
            <div ref={scrollRef} className="grid grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence initial={false}>
                {items.map(item => (
                  <motion.div key={`${title}-${item.id}`} variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.5 } },
                    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
                  }} initial="hidden" animate="visible" exit="exit" layout>
                  <MediaCard {...cardPropsFactory(item)} />
                </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fullscreen mode not implemented yet
  return null;
}