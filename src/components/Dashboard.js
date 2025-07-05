// src/components/Dashboard.js
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import PersonalizedRecommendations from './PersonalizedRecommendations';
import TrendingSection from './TrendingSection';
import CategoryBrowser from './CategoryBrowser';
import GenreResults from './GenreResults';
import AdUnit from './AdUnit';

// Helper for logging (optional)
const logDashboard = (message, data) => {
  console.log(`[Dashboard] ${message}`, data !== undefined ? data : '');
};

// This component renders the main content for an authenticated user.
function Dashboard({
  // State/Props needed for rendering content
  currentUser,
  isAuthenticated,
  initialAppLoadComplete,
  userPreferences,
  hasCompletedQuestionnaire,
  showPageLoading, // Determines if skeleton or content is shown
  showRecommendations, // Determines if recommendations section is visible
  selectedGenre,
  setSelectedGenre,

  // Refs
  personalizedRecommendationsRef,
}) {
  logDashboard('Rendering Dashboard', { showPageLoading, showRecommendations, selectedGenre });

  // --- Loading Skeleton ---
  if (showPageLoading) {
    logDashboard('Render: Page Loading Skeleton');
    return (
      <div className="space-y-12 animate-pulse">
        {/* Personalized Recommendations skeleton */}
        <div className="mb-12 max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-gray-700 rounded h-4 sm:h-6 w-1/3"></div>
            <div className="bg-gray-700 rounded-full h-4 sm:h-5 w-16 sm:w-24"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg h-[350px]">
                <div className="h-3/5 bg-gray-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Section skeleton */}
        <div className="mb-12 max-w-7xl mx-auto px-4">
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

        {/* Category Browser skeleton */}
        <div className="mb-12 max-w-7xl mx-auto px-4">
          <div className="h-4 sm:h-6 bg-gray-700 rounded w-1/5 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[1.5/1] rounded-lg bg-gray-800 overflow-hidden"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Actual Content ---
  // This part assumes isAuthenticated and initialAppLoadComplete are true,
  // as AppRoutes should only render this via renderAuthenticatedContent when appropriate.
  logDashboard('Render: Authenticated Content Sections');
  return (
    <div className="space-y-12">
      <AnimatePresence>
        {showRecommendations && (
          <motion.div
            key="personalized-recommendations"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <PersonalizedRecommendations
              ref={personalizedRecommendationsRef}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              propUserPreferences={userPreferences}
              propHasCompletedQuestionnaire={hasCompletedQuestionnaire}
              initialAppLoadComplete={initialAppLoadComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad unit 1 */}
      {showRecommendations && isAuthenticated && !showPageLoading && (
        <div className="pt-2 pb-2">
          <AdUnit
            className="max-w-6xl mx-auto rounded-xl overflow-hidden"
            contentBefore={<div className="text-sm text-gray-400 text-center mb-2">Recommendations sponsored by our partners</div>}
          />
        </div>
      )}

      <TrendingSection
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        initialAppLoadComplete={initialAppLoadComplete}
      />

      {/* Ad unit 2 */}
      {isAuthenticated && !showPageLoading && (
        <div className="pb-4 pt-2">
          <AdUnit
            className="max-w-6xl mx-auto rounded-xl overflow-hidden"
            contentBefore={<div className="text-sm text-gray-400 text-center mb-2">Discover more content</div>}
          />
        </div>
      )}

      <CategoryBrowser onCategorySelect={setSelectedGenre} />
      {selectedGenre && <GenreResults genreId={selectedGenre} currentUser={currentUser} />}

      {/* Ad unit 3 */}
      {selectedGenre && isAuthenticated && !showPageLoading && (
        <div className="pt-6 pb-8">
          <AdUnit
            className="max-w-6xl mx-auto rounded-xl overflow-hidden"
            contentBefore={
              <div className="text-sm text-gray-300 font-medium px-1 mb-3">
                <h3 className="text-base md:text-lg mb-1 text-white">Similar Content You Might Enjoy</h3>
                <p>Based on your interest in this genre, here are some additional recommendations.</p>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;