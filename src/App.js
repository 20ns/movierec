import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuth from './auth/auth';
import Header from './components/Header';
import Bg from './components/Bg';
import AuthPage from './auth/authPage.jsx';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import TrendingSection from './components/TrendingSection';
import PersonalizedRecommendations from './components/PersonalizedRecommendations';
import CategoryBrowser from './components/CategoryBrowser';
import GenreResults from './components/GenreResults';
import FavoritesSection from './components/FavoritesSection';
import WatchlistSection from './components/WatchlistSection';
import AccountDetailsModal from './components/AccountDetailsModal';
import SearchBar from './components/SearchBar';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider, useToast } from './components/ToastManager';
import LandingPage from './components/LandingPage';

// Helper for logging
const logApp = (message, data) => {
  console.log(`[App.js] ${message}`, data !== undefined ? data : '');
};

// Helper function for consistent error logging
const logError = (message, error) => {
  console.error(`[App.js] ${message}`, error);
};

function AppContent() {
  const {
    isAuthenticated,
    currentUser,
    handleSigninSuccess,
    handleSignout,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast(); // Changed from addToast to showToast to match ToastManager.jsx

  // --- Component State ---
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showPreferencesPromptBanner, setShowPreferencesPromptBanner] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [initialAppLoadComplete, setInitialAppLoadComplete] = useState(false);
  // New state for recommendations visibility
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);

  // Calculate if user has only completed basic preferences but not detailed ones
  const hasBasicPreferencesOnly = userPreferences?.questionnaireCompleted && !userPreferences?.detailedQuestionsCompleted;

  // --- Refs ---
  const personalizedRecommendationsRef = useRef(null);
  const prevPreferencesRef = useRef(null);
  const fetchingPreferencesRef = useRef(false);
  const prevUserIdRef = useRef(null);
  const refreshCycleRef = useRef(0); // Track refresh cycles to prevent repeated refreshes
  const processingAuthChangeRef = useRef(false); // Prevent concurrent auth processing

  // --- Effect: Mark Initial App Load Complete ---
  useEffect(() => {
    if (!authLoading) {
      logApp('Initial App Load Complete (Auth check finished)');
      setInitialAppLoadComplete(true);
      if (!isAuthenticated) {
        setPreferencesLoading(false);
        setHasCompletedQuestionnaire(false);
        setUserPreferences(null);
        prevPreferencesRef.current = null;
        setShowRecommendations(false);
        logApp('User logged out, resetting preference state.');
      }
    }
  }, [authLoading, isAuthenticated]);

  // --- Effect: Detect User Change ---
  useEffect(() => {
    const currentUserId = currentUser?.attributes?.sub;
    if (prevUserIdRef.current !== currentUserId && currentUserId && !processingAuthChangeRef.current) {
      // Set processing flag to prevent concurrent processing
      processingAuthChangeRef.current = true;
      
      logApp(`User changed from ${prevUserIdRef.current} to ${currentUserId}. Resetting state.`);
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
      setPreferencesLoading(false);
      prevPreferencesRef.current = null;
      prevUserIdRef.current = currentUserId;
      
      // Set justSignedIn to true when user signs in
      if (!prevUserIdRef.current && currentUserId) {
        setJustSignedIn(true);
        setShowRecommendations(false);
      }
      
      // Reset processing flag after a short delay
      setTimeout(() => {
        processingAuthChangeRef.current = false;
      }, 500);
    }
  }, [currentUser]);

  // --- Modified handleSigninSuccess ---
  const handleCustomSigninSuccess = useCallback((user, isNew = false) => {
    logApp('User signed in successfully', { userId: user.attributes?.sub });
    handleSigninSuccess(user, isNew);
    
    // Force reset all recommendation-related state
    setJustSignedIn(true);
    setShowRecommendations(false);
    
    // Force immediately start preference loading
    fetchingPreferencesRef.current = false;
    refreshCycleRef.current = 0;
    
    // Force a new toast even if it's a re-render
    setTimeout(() => {
      showToast({
        title: 'Welcome back!',
        message: 'Fetching your personalized recommendations...',
        type: 'success',
        duration: 4000,
      });
    }, 100);
  }, [handleSigninSuccess, showToast]);

  // --- Fetch User Preferences ---
  const fetchUserPreferences = useCallback(async () => {
    // Track refresh cycles to prevent repeated refreshes
    refreshCycleRef.current++;
    const currentRefreshCycle = refreshCycleRef.current;
    
    if (!isAuthenticated || !currentUser || fetchingPreferencesRef.current) {
      logApp('Fetch Preferences skipped:', {
        isAuthenticated,
        hasUser: !!currentUser,
        isFetching: fetchingPreferencesRef.current,
      });
      if (!isAuthenticated || !currentUser) {
        setPreferencesLoading(false);
        setHasCompletedQuestionnaire(false);
        setUserPreferences(null);
        prevPreferencesRef.current = null;
        setShowRecommendations(false);
      }
      return;
    }

    logApp('Fetching user preferences...', { refreshCycle: currentRefreshCycle });
    fetchingPreferencesRef.current = true;
    setPreferencesLoading(true);

    try {
      // If this is no longer the current refresh cycle, abort
      if (currentRefreshCycle !== refreshCycleRef.current) {
        logApp('Aborting outdated preferences fetch', { cycle: currentRefreshCycle, current: refreshCycleRef.current });
        return;
      }

      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const userId = currentUser.attributes.sub;
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        mode: 'cors',
      });

      // Check if this is still the current refresh cycle
      if (currentRefreshCycle !== refreshCycleRef.current) {
        logApp('Aborting outdated preferences fetch response handling', { cycle: currentRefreshCycle, current: refreshCycleRef.current });
        return;
      }

      if (!response.ok) {
        if (response.status === 404) {
          logApp('Preferences fetch returned 404 (No preferences saved yet)');
          setUserPreferences(null);
          setHasCompletedQuestionnaire(false);
          if (userId) {
            try {
              localStorage.removeItem(`questionnaire_completed_${userId}`);
            } catch (e) {}
          }
        } else {
          throw new Error(`Preferences API Error: Status ${response.status}`);
        }
      } else {
        const data = await response.json();
        logApp('Preferences fetched successfully:', data);
        const apiCompleted = data?.questionnaireCompleted || false;
        setUserPreferences(data);
        setHasCompletedQuestionnaire(apiCompleted);
        if (userId) {
          try {
            localStorage.setItem(`questionnaire_completed_${userId}`, apiCompleted ? 'true' : 'false');
          } catch (e) {
            logError('Error writing to localStorage:', e);
          }
        }
      }
    } catch (error) {
      logError('Error fetching preferences:', error);
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
    } finally {
      // Check if this is still the current refresh cycle
      if (currentRefreshCycle === refreshCycleRef.current) {
        setPreferencesLoading(false);
        fetchingPreferencesRef.current = false;
        logApp('Preferences fetch finished.', { cycle: currentRefreshCycle });
        
        // After preferences fetch is complete, determine whether to show recommendations
        if (justSignedIn) {
          // Short timeout to ensure DOM is ready 
          setTimeout(() => {
            setShowRecommendations(true);
            setJustSignedIn(false);
            logApp('Showing recommendations after sign-in and preferences fetch');
            
            // Add toast notification
            showToast({
              title: 'Welcome back!',
              message: 'Your personalized recommendations are ready',
              type: 'success',
              duration: 4000,
            });
          }, 300);
        }
      } else {
        logApp('Skipping state updates for outdated fetch cycle', 
          { cycle: currentRefreshCycle, current: refreshCycleRef.current });
      }
    }
  }, [isAuthenticated, currentUser, justSignedIn, showToast]);

  // --- Effect: Initial Preference Fetch ---
  useEffect(() => {
    if (initialAppLoadComplete && isAuthenticated) {
      logApp('Triggering initial preference fetch.');
      fetchUserPreferences();
    } else if (initialAppLoadComplete && !isAuthenticated) {
      setPreferencesLoading(false);
      setHasCompletedQuestionnaire(false);
      setUserPreferences(null);
      prevPreferencesRef.current = null;
      setShowRecommendations(false);
    }
  }, [initialAppLoadComplete, isAuthenticated, fetchUserPreferences]);

  // --- Effect: Show Preference Prompt Banner ---
  useEffect(() => {
    const shouldShow =
      initialAppLoadComplete &&
      isAuthenticated &&
      !preferencesLoading &&
      !hasCompletedQuestionnaire &&
      location.pathname !== '/onboarding';
    
    setShowPreferencesPromptBanner(shouldShow);
    
    // When user has no preferences, we still want to show the recommendations section
    if (shouldShow && justSignedIn) {
      setShowRecommendations(true);
      setJustSignedIn(false);
    }
    
    logApp('Preference prompt banner check:', { shouldShow });
  }, [initialAppLoadComplete, isAuthenticated, preferencesLoading, hasCompletedQuestionnaire, location.pathname, justSignedIn]);

  // --- Effect: Show recommendations after app load ---
  useEffect(() => {
    // Prevent this effect from triggering multiple times for the same state
    if (initialAppLoadComplete && isAuthenticated && !preferencesLoading && !justSignedIn && !showRecommendations) {
      logApp('Showing recommendations after app initialization');
      setShowRecommendations(true);
    }
  }, [initialAppLoadComplete, isAuthenticated, preferencesLoading, justSignedIn, showRecommendations]);

  // --- Questionnaire Completion Handler ---
  const handleQuestionnaireComplete = useCallback(() => {
    logApp('Questionnaire completed.');
    const userId = currentUser?.attributes?.sub;
    if (!userId) {
      logError('No user ID for questionnaire completion.');
      return;
    }

    setHasCompletedQuestionnaire(true);
    setShowQuestionnaireModal(false);
    setShowPreferencesPromptBanner(false);

    try {
      localStorage.setItem(`questionnaire_completed_${userId}`, 'true');
    } catch (e) {
      logError('Error writing to localStorage:', e);
    }

    fetchUserPreferences();
    if (location.pathname === '/onboarding') {
      navigate('/');
    }
    
    // Add a small delay before showing recommendations after questionnaire completion
    setTimeout(() => {
      setShowRecommendations(true);
      
      // Add toast notification
      showToast({
        title: 'Preferences updated!',
        message: 'Your recommendations have been refreshed',
        type: 'success',
        duration: 4000,
      });
    }, 500);
  }, [currentUser, fetchUserPreferences, location.pathname, navigate, showToast]);

  // --- Navigation Handlers ---
  const handleSignInClick = useCallback(() => navigate('/auth'), [navigate]);
  // --- Render Logic ---  // Modified to ensure smooth transitions especially on mobile
  const [minLoadTimeComplete, setMinLoadTimeComplete] = useState(false);
  
  // Effect to enforce minimum loading time to prevent flickering on mobile
  useEffect(() => {
    if (!initialAppLoadComplete) return;
    
    // Enforce a minimum loading time of 600ms to prevent layout flashing
    const timer = setTimeout(() => {
      setMinLoadTimeComplete(true);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [initialAppLoadComplete]);
  
  const showPageLoading = !initialAppLoadComplete || !minLoadTimeComplete || (isAuthenticated && preferencesLoading && refreshCycleRef.current < 3);

  const renderMainContent = () => {
    if (!isAuthenticated && initialAppLoadComplete) {
      logApp('Render: Landing Page');
      return <LandingPage onSignInClick={handleSignInClick} />;
    }

    if (showPageLoading) {
      logApp('Render: Page Loading Skeleton');      
      return (
        <div className="space-y-12 animate-pulse">
          {/* Personalized Recommendations skeleton */}          
          <div className="mb-12 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-gray-700 rounded h-4 sm:h-6 w-1/3"></div>
              <div className="bg-gray-700 rounded-full h-4 sm:h-5 w-16 sm:w-24"></div>
            </div>            
            <div className="w-full grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="group bg-transparent rounded-2xl overflow-hidden shadow-md relative flex flex-col h-full animate-pulse max-w-full"
                >
                  <div className="bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 h-full">
                    <div className="relative overflow-hidden h-[140px] sm:h-[160px] md:h-[200px] flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                      <div className="w-full h-full bg-gray-700"></div>
                      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-md bg-green-600/90 w-16"></div>
                      <div className="absolute top-2 left-2 z-10 bg-black/60 text-white px-1.5 py-0.5 rounded-md text-xs font-medium backdrop-blur-sm shadow w-10"></div>
                      <div className="absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-sm bg-black/50 w-8 h-8"></div>
                      <div className="absolute top-2 right-10 z-20 p-1.5 rounded-full backdrop-blur-sm bg-black/50 w-8 h-8"></div>
                    </div>
                    <div className="p-2 sm:p-3 flex flex-col flex-grow bg-white rounded-b-xl">
                      <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-1"></div>
                      <div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-amber-400 mr-1"></div>
                          <div className="h-3 sm:h-4 bg-gray-200 rounded w-5"></div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-300 mr-1"></div>
                          <div className="h-3 sm:h-4 bg-gray-200 rounded w-8"></div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-300 mr-1"></div>
                          <div className="h-3 sm:h-4 bg-gray-200 rounded w-6"></div>
                        </div>
                      </div>
                    </div>
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

    if (isAuthenticated && initialAppLoadComplete) {
      logApp('Render: Main Authenticated Content');
      return (
        <div className="space-y-12">
          <AnimatePresence>            
            {showRecommendations && (
              <motion.div
                key="personalized-recommendations"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
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
          <TrendingSection currentUser={currentUser} isAuthenticated={isAuthenticated} />
          <CategoryBrowser onCategorySelect={setSelectedGenre} />
          {selectedGenre && <GenreResults genreId={selectedGenre} currentUser={currentUser} />}
        </div>
      );
    }

    logApp('Render: Fallback (Null)');
    return null;
  };

  // Function to handle preference updates from onboarding questionnaire
  const handlePreferencesUpdated = useCallback((updatedPreferences) => {
    logApp('Preferences updated from questionnaire', updatedPreferences);
    setUserPreferences(updatedPreferences);
    
    // Trigger recommendation refresh if reference is available
    if (personalizedRecommendationsRef.current) {
      logApp('Triggering recommendation refresh with updated preferences');
      personalizedRecommendationsRef.current.refreshRecommendations(updatedPreferences);
    }
  }, []);

  return (
    <>
      <Bg />      
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
                    // Remember that user has dismissed this prompt
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
                  onClick={() => setShowQuestionnaireModal(true)}
                  className="w-full text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1.5 rounded text-xs font-medium text-white transition-colors"
                >
                  Set Preferences
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuestionnaireModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowQuestionnaireModal(false);
            }}
          >            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}            
            >
              <OnboardingQuestionnaire
                currentUser={currentUser}
                onComplete={handleQuestionnaireComplete}
                onSkip={() => setShowQuestionnaireModal(false)}
                isModal={true}
                onClose={() => {
                  // When modal is closed with X button, save preferences and trigger recalculation
                  if (personalizedRecommendationsRef.current && userPreferences) {
                    personalizedRecommendationsRef.current.refreshRecommendations(userPreferences);
                  }
                  setShowQuestionnaireModal(false);
                }}
                existingPreferences={userPreferences}
                onPreferencesUpdated={handlePreferencesUpdated}
                // Skip basic questions when user has already completed them
                skipBasicQuestions={hasBasicPreferencesOnly}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showAccountDetails && isAuthenticated && (
          <AccountDetailsModal currentUser={currentUser} onClose={() => setShowAccountDetails(false)} />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showFavorites && isAuthenticated && (
          <motion.div
            className="fixed top-16 right-4 sm:right-10 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FavoritesSection
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              onClose={() => setShowFavorites(false)}
              inHeader={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWatchlist && isAuthenticated && (
          <motion.div
            className="fixed top-16 right-4 sm:right-10 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <WatchlistSection
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              onClose={() => setShowWatchlist(false)}
              inHeader={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {location.pathname !== '/onboarding' && location.pathname !== '/auth' && (        
        <Header
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onSignout={handleSignout}
          onSearchClick={(isVisible) => setShowSearch(isVisible === undefined ? true : isVisible)}
          onPreferencesClick={(isVisible) => setShowQuestionnaireModal(isVisible === undefined ? true : isVisible)}
          onFavoritesClick={(isVisible) => setShowFavorites(isVisible === undefined ? true : isVisible)}
          onWatchlistClick={(isVisible) => setShowWatchlist(isVisible === undefined ? true : isVisible)}
          onAccountClick={(isVisible) => setShowAccountDetails(isVisible === undefined ? true : isVisible)}
          showFavorites={showFavorites}
          showWatchlist={showWatchlist}
          showSearch={showSearch}
          hasBasicPreferencesOnly={userPreferences?.questionnaireCompleted && !userPreferences?.detailedQuestionsCompleted}
        />
      )}
      
      <AnimatePresence>
        {showSearch && (
          <>
            {/* Backdrop overlay with click-away functionality */}
            <motion.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-gradient-to-b from-gray-900/95 to-black/90 backdrop-blur-md"
              onClick={() => setShowSearch(false)}
            />
            {/* Search container with improved animation - positioned below header */}
            <motion.div
              key="search-container"
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ 
                type: "spring", 
                stiffness: 350, 
                damping: 30,
                delay: 0.05
              }}              
              className="fixed inset-x-0 top-16 z-30 pt-4 px-4"
              onClick={(e) => e.stopPropagation()}
            >              
              {/* Close button positioned for both desktop and mobile */}
              <div className="flex justify-end max-w-3xl mx-auto mb-3">
                <button 
                  onClick={() => setShowSearch(false)}
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
                  onResultClick={() => setShowSearch(false)} 
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="relative z-10 pt-20 transition-transform duration-300 ease-in-out">
        <Routes>
          <Route
            path="/auth"
            element={
              !isAuthenticated && initialAppLoadComplete ? (
                <AuthPage onSignupSuccess={handleCustomSigninSuccess} onSigninSuccess={handleCustomSigninSuccess} />
              ) : isAuthenticated ? (
                <Navigate to="/" replace />
              ) : null
            }
          />
          <Route
            path="/onboarding"
            element={
              initialAppLoadComplete ? (
                isAuthenticated ? (
                  <div className="min-h-screen flex items-center justify-center p-4">
                    <OnboardingQuestionnaire currentUser={currentUser} onComplete={handleQuestionnaireComplete} />
                  </div>
                ) : (
                  <Navigate to="/auth" replace state={{ from: location }} />
                )
              ) : null
            }
          />
          <Route
            path="/"
            element={
              <div className="container mx-auto px-4 pb-16">{renderMainContent()}</div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;