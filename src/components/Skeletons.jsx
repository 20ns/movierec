// src/components/Skeletons.jsx
import React from 'react';
import { motion } from 'framer-motion';

// Skeleton for MediaCard (used in Favorites, Watchlist, etc.)
export const MediaCardSkeleton = ({ isMini = false }) => (
  <motion.div
    className={`bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md
                ${isMini ? 'w-32 sm:w-36' : 'w-full'}`} 
    initial={{ opacity: 0.6 }}
    animate={{
      opacity: [0.6, 0.8, 0.6],
      transition: { repeat: Infinity, duration: 1.5, ease: "linear" }
    }}
  >
    {/* Aspect ratio for poster */}
    <div className={`aspect-[2/3] bg-gray-700 ${isMini ? 'h-48 sm:h-54' : 'h-64 sm:h-72 md:h-80'}`} />
    {/* Content below poster */}
    <div className={`p-2 ${isMini ? 'space-y-1' : 'space-y-2'}`}>
      <div className={`h-4 bg-gray-700 rounded ${isMini ? 'w-3/4' : 'w-3/4 mb-1'}`} />
      <div className={`h-3 bg-gray-700 rounded ${isMini ? 'w-1/2' : 'w-1/2'}`} />
      {!isMini && ( // Only show rating/year line in full card skeleton
        <div className="flex justify-between items-center mt-1 pt-1">
          <div className="w-10 h-3 bg-gray-700 rounded" />
          <div className="w-10 h-3 bg-gray-700 rounded" />
        </div>
      )}
    </div>
  </motion.div>
);

// Skeleton for Personalized Recommendations Section
export const RecommendationsSkeleton = () => (
  <div className="mb-12 max-w-7xl mx-auto px-4 animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="bg-gray-700 rounded h-4 sm:h-6 w-1/3"></div>
      <div className="bg-gray-700 rounded-full h-4 sm:h-5 w-16 sm:w-24"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
      {[...Array(3)].map((_, i) => (
         <MediaCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Skeleton for Trending Section
export const TrendingSkeleton = () => (
  <div className="mb-12 max-w-7xl mx-auto px-4 animate-pulse">
    <div className="h-4 sm:h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl overflow-hidden min-w-[140px] sm:min-w-[180px] md:min-w-[220px] flex-shrink-0 flex flex-col">
          <div className="h-[100px] sm:h-[130px] md:h-[150px] bg-gray-700"></div>
          <div className="p-2 sm:p-3 flex-grow flex flex-col">
            <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4 mb-1"></div>
            <div className="h-2 sm:h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
            <div className="mt-auto h-2 sm:h-3 bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Skeleton for Category Browser
export const CategoryBrowserSkeleton = () => (
  <div className="mb-12 max-w-7xl mx-auto px-4 animate-pulse">
    <div className="h-4 sm:h-6 bg-gray-700 rounded w-1/5 mb-4"></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="aspect-[1.5/1] rounded-lg bg-gray-800 overflow-hidden"></div>
      ))}
    </div>
  </div>
);

// Skeleton for the entire Dashboard page
export const DashboardSkeleton = () => (
  <div className="space-y-12">
    <RecommendationsSkeleton />
    <TrendingSkeleton />
    <CategoryBrowserSkeleton />
  </div>
);