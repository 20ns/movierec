// src/components/MainLayout.js
import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

import Bg from './Bg';
import Header from './Header';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import AccountDetailsModal from './AccountDetailsModal';
import FavoritesDropdown from './FavoritesDropdown'; 
import WatchlistSection from './WatchlistSection'; 
import SearchBar from './SearchBar';
import AppRoutes from '../AppRoutes'; 

// Helper for logging (optional, but can be useful for debugging layout renders)
const logLayout = (message, data) => {
  console.log(`[MainLayout] ${message}`, data !== undefined ? data : '');
};

function MainLayout({
  // Auth related
  isAuthenticated,
  currentUser,
  handleSignout,
  handleCustomSigninSuccess, 

  // Preference related
  userPreferences,
  hasCompletedQuestionnaire,
  hasBasicPreferencesOnly,
  showPreferencesPromptBanner,
  setShowPreferencesPromptBanner,
  handleQuestionnaireComplete,
  handlePreferencesUpdated, 

  // Modal related
  modalState,
  openModal,
  closeModal,
  toggleModal,

  // Navigation related
  handleSignInClick,
  handleSignUpClick,

  // Content rendering
  renderMainContent,
  initialAppLoadComplete,

  // Refs
  personalizedRecommendationsRef,
}) {
  const location = useLocation();

  logLayout('Rendering MainLayout', { isAuthenticated, path: location.pathname });

  return (
    <>
      <Bg />

      {/* --- Preference Prompt Banner --- */}
      <AnimatePresence>
        {showPreferencesPromptBanner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed bottom-6 right-6 z-50"
            role="alert"
            aria-live="polite"
          >
            <motion.div
              className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-purple-700/50 overflow-hidden"
              whileHover={{ scale: 1.03 }}
              animate={{ boxShadow: ["0px 0px 0px rgba(124, 58, 237, 0)", "0px 0px 15px rgba(124, 58, 237, 0.3)", "0px 0px 0px rgba(124, 58, 237, 0)"] }}
              transition={{ boxShadow: { repeat: Infinity, duration: 2, repeatDelay: 1 } }}
            >
              <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-900/80 to-indigo-900/80">
                <h3 className="text-xs font-medium text-white flex items-center">
                  <SparklesIcon className="h-3.5 w-3.5 text-purple-300 mr-1.5" />
                  Personalize Your Experience
                </h3>
                <button
                  onClick={() => {
                    setShowPreferencesPromptBanner(false);
                    // Remember dismissal in localStorage
                    try {
                      const userId = currentUser?.attributes?.sub;
                      if (userId) {
                        localStorage.setItem(`preferences_prompt_dismissed_${userId}`, 'true');
                      }
                    } catch (e) {
                      console.warn('Could not save preference prompt state:', e);
                    }
                  }}
                  className="text-gray-400 hover:text-white -mr-1"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={() => openModal('questionnaire')}
                  className="w-full text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1.5 rounded text-xs font-medium text-white transition-colors"
                >
                  Set Preferences
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Modals --- */}
      <AnimatePresence>
        {modalState.questionnaire && (
          <motion.div
            key="questionnaire-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal('questionnaire'); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-4xl bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <OnboardingQuestionnaire
                currentUser={currentUser}
                onComplete={handleQuestionnaireComplete}
                onSkip={() => closeModal('questionnaire')}
                isModal={true}
                onClose={() => {
                  if (personalizedRecommendationsRef?.current && userPreferences) {
                     personalizedRecommendationsRef.current.refreshRecommendations(userPreferences);
                  }
                  closeModal('questionnaire');
                }}
                existingPreferences={userPreferences}
                onPreferencesUpdated={handlePreferencesUpdated}
                skipBasicQuestions={hasBasicPreferencesOnly}
              />
            </motion.div>
          </motion.div>
        )}

        {modalState.accountDetails && isAuthenticated && (
           <AccountDetailsModal
             key="account-details-modal"
             currentUser={currentUser}
             onClose={() => closeModal('accountDetails')}
           />
        )}

        {/* Replace FavoritesSection with FavoritesDropdown */}
        {/* Only render the component when its state is true */}
        {isAuthenticated && modalState.favorites && (
           <FavoritesDropdown
             currentUser={currentUser}
             isAuthenticated={isAuthenticated}
             isOpen={true} // If rendered, it's open
             onClose={() => closeModal('favorites')} // Pass close handler
           />
        )}
        {/* Note: The positioning is now handled inside FavoritesDropdown */}


        {modalState.watchlist && isAuthenticated && ( // Keep WatchlistSection for now
          <motion.div
            key="watchlist-section"
            className="fixed top-16 right-4 sm:right-10 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0 } }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <WatchlistSection
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              isOpen={modalState.watchlist}
              onClose={() => closeModal('watchlist')}
              inHeader={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- End Modals --- */}

      {/* --- Header (conditionally rendered based on route) --- */}
      {location.pathname !== '/onboarding' &&
       location.pathname !== '/auth' &&
       location.pathname !== '/signup' &&
       location.pathname !== '/signin' && (
        <Header
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onSignout={handleSignout}
          onSearchClick={() => openModal('search')}
          onPreferencesClick={() => openModal('questionnaire')}
          onFavoritesClick={() => toggleModal('favorites')}
          onWatchlistClick={() => toggleModal('watchlist')}
          onAccountClick={() => openModal('accountDetails')}
          showFavorites={modalState.favorites}
          showWatchlist={modalState.watchlist}
          showSearch={modalState.search}
          hasBasicPreferencesOnly={hasBasicPreferencesOnly}
        />
      )}

      {/* --- Search Modal --- */}
      <AnimatePresence>
        {modalState.search && (
          <>
            <motion.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-gradient-to-b from-gray-900/95 to-black/90 backdrop-blur-md"
              onClick={() => closeModal('search')}
            />
            <motion.div
              key="search-container"
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 30, delay: 0.05 }}
              className="fixed inset-x-0 top-16 z-30 pt-4 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end max-w-3xl mx-auto mb-3">
                <button
                  onClick={() => closeModal('search')}
                  className="p-2 rounded-full bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shadow-lg"
                  aria-label="Close search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <motion.div
                className="max-w-3xl mx-auto relative"
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <SearchBar
                  currentUser={currentUser}
                  onResultClick={() => closeModal('search')}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Main Content Area (Routes) --- */}
      <main className="relative z-10 pt-20 transition-transform duration-300 ease-in-out">
        <AppRoutes
          isAuthenticated={isAuthenticated}
          initialAppLoadComplete={initialAppLoadComplete}
          currentUser={currentUser}
          handleCustomSigninSuccess={handleCustomSigninSuccess}
          handleQuestionnaireComplete={handleQuestionnaireComplete}
          handleSignInClick={handleSignInClick}
          handleSignUpClick={handleSignUpClick}
          renderMainContent={renderMainContent} // Pass the received renderMainContent down
          userPreferences={userPreferences}
          handlePreferencesUpdated={handlePreferencesUpdated}
          hasBasicPreferencesOnly={hasBasicPreferencesOnly}
        />
      </main>
      <footer className="relative z-10 mt-auto py-6 text-center text-gray-500 text-xs">
        <p>&copy; {new Date().getFullYear()} MovieRec. All rights reserved.</p>
        <p>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
            Terms and Conditions
          </a>
          <span className="mx-2">|</span>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
            Privacy Policy
          </a>
        </p>
      </footer>
    </>
  );
}

export default MainLayout;