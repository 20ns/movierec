// src/App.js

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuth from './auth/auth';
import Header from './components/Header';
import Bg from './components/Bg';
import AuthPage from './auth/authPage';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import TrendingSection from './components/TrendingSection';
import PersonalizedRecommendations from './components/PersonalizedRecommendations';
import CategoryBrowser from './components/CategoryBrowser';
import GenreResults from './components/GenreResults';
import FavoritesSection from './components/FavoritesSection';
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
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showPreferencesPromptBanner, setShowPreferencesPromptBanner] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [initialAppLoadComplete, setInitialAppLoadComplete] = useState(false);
  // New state for recommendations visibility
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);

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

  // --- Render Logic ---  // Modified to ensure it doesn't stay in loading state forever
  const showPageLoading = !initialAppLoadComplete || (isAuthenticated && preferencesLoading && refreshCycleRef.current < 3);

  const renderMainContent = () => {
    if (!isAuthenticated && initialAppLoadComplete) {
      logApp('Render: Landing Page');
      return <LandingPage onSignInClick={handleSignInClick} />;
    }

    if (showPageLoading) {
      logApp('Render: Page Loading Skeleton');      return (
        <div className="space-y-12 animate-pulse">
          <div className="mb-12 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-4 h-8">
              <div className="bg-gray-700 rounded w-1/3"></div>
              <div className="bg-gray-700 rounded-full w-24"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg h-full">
                  <div className="h-[160px] sm:h-[180px] md:h-[200px] bg-gray-700"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                    <div className="flex justify-between pt-2">
                      <div className="h-4 bg-gray-700 rounded w-16"></div>
                      <div className="h-4 bg-gray-700 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>          <div className="mb-12 max-w-7xl mx-auto px-4">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="flex space-x-4 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl overflow-hidden w-64 flex-shrink-0">
                  <div className="h-[160px] sm:h-[180px] bg-gray-700"></div>
                  <div className="p-2 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Favorites Section Skeleton */}
          <div className="fixed top-16 right-4 sm:right-10 z-50 w-72 sm:w-80">
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
              <div className="p-3 sm:p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 bg-gray-700 rounded w-1/3"></div>
                  <div className="h-5 w-5 bg-gray-700 rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-[50vh]">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-700 rounded-lg overflow-hidden">
                      <div className="aspect-w-2 aspect-h-3 h-24 bg-gray-600"></div>
                      <div className="p-2">
                        <div className="h-4 bg-gray-600 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
          <TrendingSection currentUser={currentUser} isAuthenticated={isAuthenticated} />
          <CategoryBrowser onCategorySelect={setSelectedGenre} />
          {selectedGenre && <GenreResults genreId={selectedGenre} currentUser={currentUser} />}
        </div>
      );
    }

    logApp('Render: Fallback (Null)');
    return null;
  };

  return (
    <>
      <Bg />
      <AnimatePresence>
        {showPreferencesPromptBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-lg z-50 px-4"
            role="alert"
            aria-live="polite"
          >
            <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-xl p-4 border border-indigo-600">
              <div className="flex items-center gap-3">
                <SparklesIcon className="h-8 w-8 text-yellow-300 flex-shrink-0" />
                <div className="flex-grow">
                  <h3 className="text-white font-semibold">Personalize Your Experience!</h3>
                  <p className="text-indigo-200 text-sm mt-1">Complete your preferences to unlock tailored recommendations.</p>
                </div>
                <button
                  onClick={() => setShowQuestionnaireModal(true)}
                  className="bg-white text-indigo-700 px-4 py-1.5 rounded-md text-sm font-bold hover:bg-indigo-100 flex-shrink-0 transition-colors shadow"
                >
                  Start Now
                </button>
              </div>
            </div>
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
                inModal={true}
                onClose={() => setShowQuestionnaireModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      <AnimatePresence>
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

      {location.pathname !== '/onboarding' && location.pathname !== '/auth' && (
        <Header
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onSignout={handleSignout}
          onSearchClick={() => setShowSearch((prev) => !prev)}
          onPreferencesClick={() => setShowQuestionnaireModal(true)}
          onFavoritesClick={() => setShowFavorites((prev) => !prev)}
          onAccountClick={() => setShowAccountDetails(true)}
          showFavorites={showFavorites}
          showSearch={showSearch}
        />
      )}      <AnimatePresence>
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
            
            {/* Search container with improved animation */}
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
              }}              className="fixed inset-x-0 top-0 z-40 pt-24 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                className="max-w-3xl mx-auto"
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