// src/App.js

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuth from './auth/auth';
import Header from './components/Header';
import Bg from './components/Bg';
import AuthPage from './auth/authPage.jsx';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import TrendingSection from './components/TrendingSection';
import PersonalizedRecommendations from './components/PersonalizedRecommendationsV2';
import CategoryBrowser from './components/CategoryBrowser';
import GenreResults from './components/GenreResults';
import FavoritesSection from './components/FavoritesSection';
import WatchlistSection from './components/WatchlistSection';
import AccountDetailsModal from './components/AccountDetailsModal';
import SearchBar from './components/SearchBar';
import MoodQuickFilters from './components/MoodQuickFilters';
import { MobileBottomNav, MobileDrawerMenu, MobileHeader } from './components/MobileNavigation';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import AdUnit from './components/AdUnit';
import AdScript from './components/AdScript';
import MediaDetailModal from './components/MediaDetailModal';
import BlogIndexPage from './pages/BlogIndexPage'; 
import BlogPostPage from './pages/BlogPostPage';
import ErrorBoundary from './components/ErrorBoundary';
import PerformanceDashboard from './components/PerformanceDashboard';
import UserDashboard from './pages/UserDashboard';

// Helper for logging
const logApp = (message, data) => {
  // console.log(`[App.js] ${message}`, data !== undefined ? data : ''); // Removed log
};

// Helper function for consistent error logging
const logError = (message, error) => {
  // console.error(`[App.js] ${message}`, error); // Removed log
};

// Add this new helper function near the top of the file
const checkContentReadyForAds = () => {
  // At least 3 paragraphs
  const paragraphs = document.querySelectorAll('p');
  // At least 2 headings or content containers
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5');
  const contentContainers = document.querySelectorAll('article, section, .content-container');
  // At least 1 media item
  const mediaItems = document.querySelectorAll('img[src]:not([src=""]), video');
  
  const hasEnoughElements = 
    paragraphs.length >= 3 && 
    (headings.length + contentContainers.length) >= 2;
  
  const mainContent = document.querySelector('#root') || document.body;
  const hasEnoughText = mainContent && mainContent.innerText.trim().length > 1000;
  
  const hasScrollableContent = document.body.scrollHeight > window.innerHeight * 1.5;
  
  return (hasEnoughElements && hasEnoughText) || 
         (hasScrollableContent && hasEnoughText) || 
         (hasEnoughElements && mediaItems.length > 0 && mainContent.innerText.trim().length > 800);
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
  // const { showToast } = useToast(); // Removed useToast hook

  // --- Component State ---
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  
  // Mobile navigation state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  if (showSearch) {
    const scrollY = window.scrollY;
    // Lock body scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overscrollBehavior = 'none';
    // Also lock html overflow
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    return () => {
      // Restore body styles
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overscrollBehavior = '';
      // Restore html styles
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      window.scrollTo(0, scrollY);
    };
  }
}, [showSearch]);
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
  // State for Media Detail Modal
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // State for Performance Dashboard
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  // State for Mood Filters
  const [selectedMoodFilter, setSelectedMoodFilter] = useState(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(null);

  // Calculate if user has only completed basic preferences but not detailed ones
  const hasBasicPreferencesOnly = userPreferences?.questionnaireCompleted && !userPreferences?.detailedQuestionsCompleted;

  // --- Refs ---
  const personalizedRecommendationsRef = useRef(null);
  const prevPreferencesRef = useRef(null);
  const fetchingPreferencesRef = useRef(false);
  const prevUserIdRef = useRef(null);
  const refreshCycleRef = useRef(0); // Track refresh cycles to prevent repeated refreshes
  const processingAuthChangeRef = useRef(false); // Prevent concurrent auth processing
  const searchAreaRef = useRef(null); // Ref for the search container

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

  // --- Effect: Performance Dashboard Keyboard Shortcut ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowPerformanceDashboard(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    // Removed toast call on sign-in
    // setTimeout(() => {
    //   showToast({
    //     title: 'Welcome back!',
    //     message: 'Fetching your personalized recommendations...',
    //     type: 'success',
    //     duration: 4000,
    //   });
    // }, 100);
  }, [handleSigninSuccess]); // Removed showToast from dependencies

  // --- Mobile Detection ---
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Mobile navigation handlers
  const handleMobileMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const handleMobileAuthAction = () => {
    navigate('/auth');
  };

  const handleMobileSearchToggle = () => {
    setShowSearch(!showSearch);
  };

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

      // Safely extract access token with proper error handling
      if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
        throw new Error('No valid access token available');
      }
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const userId = currentUser.attributes.sub;
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/user/preferences`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
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

            // Removed toast notification
            // showToast({
            //   title: 'Welcome back!',
            //   message: 'Your personalized recommendations are ready',
            //   type: 'success',
            //   duration: 4000,
            // });
          }, 300);
        }
      } else {
        logApp('Skipping state updates for outdated fetch cycle',
          { cycle: currentRefreshCycle, current: refreshCycleRef.current });
      }
    }
  }, [isAuthenticated, currentUser, justSignedIn]); // Removed showToast from dependencies

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

      // Removed toast notification
      // showToast({
      //   title: 'Preferences updated!',
      //   message: 'Your recommendations have been refreshed',
      //   type: 'success',
      //   duration: 4000,
      // });
    }, 500);
  }, [currentUser, fetchUserPreferences, location.pathname, navigate]); // Removed showToast from dependencies

  // --- Navigation Handlers ---
  const handleSignInClick = useCallback(() => navigate('/signin'), [navigate]);
  const handleSignUpClick = useCallback(() => navigate('/signup'), [navigate]);

  // --- Media Detail Modal Handler ---
  const handleMediaClick = useCallback((item) => {
    logApp('Media item clicked:', item);
    setSelectedMediaItem(item);
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    // Optional: Delay clearing item to allow modal fade-out animation
    setTimeout(() => setSelectedMediaItem(null), 300);
  }, []);

  // --- Render Logic ---  // Modified to ensure it doesn't stay in loading state forever
  const showPageLoading = !initialAppLoadComplete;

  const renderMainContent = () => {
    if (!isAuthenticated && initialAppLoadComplete) {
      logApp('Render: Landing Page');
      return <LandingPage onSignInClick={handleSignInClick} onSignUpClick={handleSignUpClick} />;
    }

    if (showPageLoading) {
      logApp('Render: Page Loading Skeleton');      return (
        <div className="space-y-12 animate-pulse">
          {/* Personalized Recommendations skeleton */}
          <div className="mb-12 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-gray-700 rounded h-4 sm:h-6 w-1/3"></div>
              <div className="bg-gray-700 rounded-full h-4 sm:h-5 w-16 sm:w-24"></div>
            </div>            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
                  onMediaClick={handleMediaClick}
                  moodFilter={selectedMoodFilter}
                  timeFilter={selectedTimeFilter}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Mood Quick Filters */}
          <MoodQuickFilters
            onMoodSelect={setSelectedMoodFilter}
            onTimeSelect={setSelectedTimeFilter}
            currentUser={currentUser}
            isVisible={isAuthenticated && initialAppLoadComplete}
          />
          
          <TrendingSection
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            initialAppLoadComplete={initialAppLoadComplete}
            onMediaClick={handleMediaClick} // Pass the handler down
          />
          
          {/* Removed second ad unit */}
          
          <CategoryBrowser onCategorySelect={setSelectedGenre} />
          {selectedGenre && <GenreResults genreId={selectedGenre} currentUser={currentUser} onMediaClick={handleMediaClick} />}
          
          {/* Removed third ad unit */}
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
      <Bg />      <AnimatePresence>
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
          >            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}            >
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
      </AnimatePresence><AnimatePresence>
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
            exit={{ opacity: 0, y: -20, transition: { duration: 0 } }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <FavoritesSection
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              isOpen={showFavorites}
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
            exit={{ opacity: 0, y: -20, transition: { duration: 0 } }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <WatchlistSection
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              isOpen={showWatchlist}
              onClose={() => setShowWatchlist(false)}
              inHeader={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {location.pathname !== '/onboarding' && 
       location.pathname !== '/auth' && 
       location.pathname !== '/signup' && 
       location.pathname !== '/signin' && (
        <>
          {/* Desktop Header */}
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
            searchContainerRef={searchAreaRef} // Pass the ref to Header
          />

          {/* Mobile Header */}
          {isMobile && (
            <MobileHeader
              onMenuOpen={handleMobileMenuToggle}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              showSearch={showSearch}
              onSearchToggle={handleMobileSearchToggle}
            />
          )}

          {/* Mobile Drawer Menu */}
          <MobileDrawerMenu
            isOpen={showMobileMenu}
            onClose={() => setShowMobileMenu(false)}
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            onAuthAction={handleMobileAuthAction}
          />

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <MobileBottomNav
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
            />
          )}
        </>
      )}<AnimatePresence>
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
              ref={searchAreaRef} // Assign the ref here
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
            >              {/* Close button positioned for both desktop and mobile */}
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
                  // Pass the main click handler down to SearchBar
                  onMediaClick={(item) => {
                    handleMediaClick(item); // Call App's handler
                    setShowSearch(false); // Close search on click
                  }}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Media Detail Modal */}
      <MediaDetailModal
        item={selectedMediaItem}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        currentUser={currentUser}
      />

      {/* Performance Dashboard */}
      <AnimatePresence>
        {showPerformanceDashboard && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <PerformanceDashboard 
              onClose={() => setShowPerformanceDashboard(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 pt-20 transition-transform duration-300 ease-in-out">
        <Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            path="/signup"
            element={
              !isAuthenticated && initialAppLoadComplete ? (
                <AuthPage onSignupSuccess={handleCustomSigninSuccess} onSigninSuccess={handleCustomSigninSuccess} initialMode="signup" />
              ) : isAuthenticated ? (
                <Navigate to="/" replace />
              ) : null
            }
          />
          <Route
            path="/signin"
            element={
              !isAuthenticated && initialAppLoadComplete ? (
                <AuthPage onSignupSuccess={handleCustomSigninSuccess} onSigninSuccess={handleCustomSigninSuccess} initialMode="signin" />
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
            path="/dashboard"
            element={
              initialAppLoadComplete ? (
                isAuthenticated ? (
                  <UserDashboard currentUser={currentUser} isAuthenticated={isAuthenticated} />
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
          {/* Blog Routes */}
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary minimal>
          <AppContent />
        </ErrorBoundary>
        <AdScript />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;