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
import { ToastProvider, useToast } from './components/ToastManager'; // Import useToast if needed for notifications
import LandingPage from './components/LandingPage';

// Helper for logging
const logApp = (message, data) => {
    console.log(`[App.js] ${message}`, data !== undefined ? data : '');
};

// Helper function for consistent error logging (if not already defined)
const logError = (message, error) => {
    console.error(`[App.js] ${message}`, error);
};


function AppContent() {
  const {
    isAuthenticated,
    currentUser,
    handleSigninSuccess, // Renamed for clarity if it handles both signin/signup success
    handleSignout,
    loading: authLoading,
    // isNewUser // Removed if not directly used in this component's logic
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location
  const { addToast } = useToast(); // Example if you want toasts

  // --- Component State ---
  // UI Control States
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showPreferencesPromptBanner, setShowPreferencesPromptBanner] = useState(false);

  // Data & Loading States
  const [userPreferences, setUserPreferences] = useState(null); // Stores the fetched preference object
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false); // API is source of truth after load
  const [preferencesLoading, setPreferencesLoading] = useState(false); // Tracks ONLY the preference API call
  const [initialAppLoadComplete, setInitialAppLoadComplete] = useState(false); // Tracks if auth check is done

  // --- Refs ---
  const personalizedRecommendationsRef = useRef(null);
  // Use ref to track previous stringified preferences for comparison in effect
  const prevPreferencesRef = useRef(null);
  // Ref to prevent fetchPreferences running multiple times on quick changes
  const fetchingPreferencesRef = useRef(false);
  // *** NEW Ref: Tracks if preferences have been loaded for the first time this session ***
  const isInitialPreferenceLoadRef = useRef(true);
  // *** NEW Ref: Tracks the previous user ID to detect changes ***
  const prevUserIdRef = useRef(null);


  // --- Effect: Mark Initial App Load Complete ---
  // This effect runs once authLoading transitions from true to false.
  useEffect(() => {
    if (!authLoading) {
      logApp('Initial App Load Complete (Auth check finished)');
      setInitialAppLoadComplete(true);
      // Reset preference loading state if user is no longer authenticated
      if (!isAuthenticated) {
          setPreferencesLoading(false);
          setHasCompletedQuestionnaire(false);
          setUserPreferences(null);
          prevPreferencesRef.current = null;
          // Reset the initial load flag if user logs out
          isInitialPreferenceLoadRef.current = true;
          logApp('User logged out, resetting preference state and initial load flag.');
      }
    }
  }, [authLoading, isAuthenticated]); // Run when authLoading or isAuthenticated changes


  // --- Effect: Detect User Change & Reset Initial Load Flag ---
  // *** NEW Effect ***
  useEffect(() => {
    const currentUserId = currentUser?.attributes?.sub;

    // Reset preference loading tracker and initial load flag when user changes/logs out/in
    if (prevUserIdRef.current !== currentUserId) {
        logApp(`User changed (or logged in/out), resetting initial preference load flag. Prev: ${prevUserIdRef.current}, Curr: ${currentUserId}`);
        isInitialPreferenceLoadRef.current = true; // Reset flag for the new user/session
        prevUserIdRef.current = currentUserId; // Update the ref
        // Also reset previous preferences comparison ref to ensure comparison works correctly for new user
        prevPreferencesRef.current = null;
        // Reset other related states if necessary (e.g., force re-fetch)
        // setUserPreferences(null); // Could cause flicker, fetchUserPreferences effect handles this better
        // setHasCompletedQuestionnaire(false);
    }
  }, [currentUser]); // Run when currentUser object changes


  // --- Fetch User Preferences Function ---
  // Fetches preferences if authenticated and not already fetching.
  const fetchUserPreferences = useCallback(async () => {
    // Ensure we run this only once at a time and only if authenticated
    if (!isAuthenticated || !currentUser || fetchingPreferencesRef.current) {
        logApp('Fetch Preferences skipped:', { isAuthenticated, hasUser: !!currentUser, isFetching: fetchingPreferencesRef.current });
        // Ensure loading is false if skipped
        if (!isAuthenticated || !currentUser) {
           setPreferencesLoading(false);
           // Don't set initialAppLoadComplete here, let the dedicated effect handle it
           setHasCompletedQuestionnaire(false);
           setUserPreferences(null);
           prevPreferencesRef.current = null;
        }
        return;
    }

    logApp('Attempting to fetch user preferences...');
    fetchingPreferencesRef.current = true;
    setPreferencesLoading(true);
    // Reset questionnaire status before fetch, API is truth
    // setHasCompletedQuestionnaire(false); // Let API determine status

    try {
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const userId = currentUser.attributes.sub; // Get userId for local storage keys
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        mode: 'cors', // Ensure CORS is configured correctly on the backend
      });

      if (!response.ok) {
        // Handle non-2xx responses (e.g., 404 Not Found might mean no prefs yet)
        if (response.status === 404) {
            logApp('Preferences fetch returned 404 (No preferences saved yet)');
            setUserPreferences(null);
            setHasCompletedQuestionnaire(false);
             if (userId) {
                 try { localStorage.removeItem(`questionnaire_completed_${userId}`); } catch(e) {} // Clean up local storage if API says no
             }
        } else {
            throw new Error(`Preferences API Error: Status ${response.status}`);
        }
      } else {
        // Handle successful response
        const data = await response.json();
        logApp('Preferences fetched successfully:', data);
        const apiCompleted = data?.questionnaireCompleted || false; // Default to false if field missing

        // Update state based on API response
        setUserPreferences(data);
        setHasCompletedQuestionnaire(apiCompleted);

        // Update localStorage based on API truth
        if (userId) {
            try {
               // localStorage.setItem(`userPrefs_${userId}`, JSON.stringify(data)); // Optionally cache prefs
               localStorage.setItem(`questionnaire_completed_${userId}`, apiCompleted ? 'true' : 'false');
            } catch (e) {
                console.error("Error writing to localStorage:", e);
            }
        }
      }
    } catch (error) {
      logError('Error fetching preferences:', error);
      // Don't assume questionnaire is incomplete on error, retain previous state or default to false
      // setHasCompletedQuestionnaire(false); // Or keep existing state? Decide based on desired UX on error
      setUserPreferences(null); // Clear possibly stale prefs on error
      // Maybe add a toast message here
      // addToast("Could not load your preferences.", { appearance: 'error' });
    } finally {
      // Ensure loading states are reset regardless of success/error
      setPreferencesLoading(false);
      fetchingPreferencesRef.current = false;
      logApp('Preferences fetch finished.');
    }
  }, [isAuthenticated, currentUser]); // Dependencies: Re-run if auth state changes


  // --- Effect: Trigger Initial Preference Fetch ---
  // Runs when app load is complete AND user is authenticated
  useEffect(() => {
    if (initialAppLoadComplete && isAuthenticated) {
        logApp('App loaded and authenticated, triggering initial preference fetch.');
        fetchUserPreferences();
    }
     // If app load completes but user is not authenticated, ensure loading is false.
     else if (initialAppLoadComplete && !isAuthenticated) {
         setPreferencesLoading(false);
         setHasCompletedQuestionnaire(false);
         setUserPreferences(null);
         prevPreferencesRef.current = null;
         // Ensure initial load flag is reset if user was somehow logged out after app load
         isInitialPreferenceLoadRef.current = true;
     }
  }, [initialAppLoadComplete, isAuthenticated, fetchUserPreferences]); // Dependencies


  // --- Effect: Show Preference Prompt Banner ---
  // Determines if the prompt banner should be shown
  useEffect(() => {
    // Conditions to show prompt:
    // 1. App initial load is complete (auth checked)
    // 2. User is authenticated
    // 3. Preference fetch is NOT loading
    // 4. Questionnaire is confirmed NOT complete
    // 5. Current route is not the onboarding page itself
    const shouldShow = initialAppLoadComplete &&
                       isAuthenticated &&
                       !preferencesLoading &&
                       !hasCompletedQuestionnaire &&
                       location.pathname !== '/onboarding';

    setShowPreferencesPromptBanner(shouldShow);
    logApp('Preference prompt banner visibility check:', { shouldShow, initialAppLoadComplete, isAuthenticated, preferencesLoading, hasCompletedQuestionnaire, pathname: location.pathname });

  }, [initialAppLoadComplete, isAuthenticated, preferencesLoading, hasCompletedQuestionnaire, location.pathname]);


  // --- Effect: Detect Preference Changes and Trigger Refresh ---
  // *** MODIFIED Effect ***
  useEffect(() => {
    // Conditions to check for refresh:
    // 1. App initial load complete
    // 2. Questionnaire IS complete
    // 3. Preference fetch is NOT currently loading
    if (initialAppLoadComplete && hasCompletedQuestionnaire && !preferencesLoading) {
        const currentPrefsString = JSON.stringify(userPreferences || null);
        const previousPrefsString = prevPreferencesRef.current;

        logApp('Running preference change check:', { initialLoadFlag: isInitialPreferenceLoadRef.current, currentPrefsNotNull: userPreferences !== null, hasCompletedQuestionnaire });

        // Check if preferences actually changed since the last check
        // Also check if userPreferences is not null to ensure we have data
        if (currentPrefsString !== previousPrefsString && userPreferences !== null) {

            if (isInitialPreferenceLoadRef.current) {
                // This is the *first* time non-null preferences are loaded for this user session
                logApp('Initial preferences detected (non-null). Setting flag, skipping automatic refresh.');
                isInitialPreferenceLoadRef.current = false; // Mark initial load as done *after* first non-null load
            } else {
                // This is a subsequent change (e.g., user updated prefs in questionnaire)
                logApp('User preferences changed subsequently, triggering recommendations refresh.');
                if (personalizedRecommendationsRef.current?.refresh) {
                   personalizedRecommendationsRef.current.refresh(true); // Force refresh
                } else {
                    logApp('Warning: PersonalizedRecommendations refresh ref not available.');
                }
            }

            // Update the ref *after* the comparison for the next render cycle
            prevPreferencesRef.current = currentPrefsString;

        } else if (currentPrefsString === previousPrefsString && userPreferences !== null && isInitialPreferenceLoadRef.current) {
            // Handle edge case: Initial load completed, but prefs happened to be same as last time (e.g., quick refresh)
            // Still need to mark initial load as done.
            logApp('Initial preferences loaded (same as previous ref), setting flag.');
            isInitialPreferenceLoadRef.current = false;
             // Update ref just in case it was null before
             prevPreferencesRef.current = currentPrefsString;
        } else if (userPreferences === null && !isInitialPreferenceLoadRef.current) {
            // Handle case where preferences become null after being loaded (e.g., error state, though fetchUserPreferences should handle this)
             logApp('Preferences became null after initial load.');
             // Optionally reset the flag if prefs become null again?
             // isInitialPreferenceLoadRef.current = true;
             prevPreferencesRef.current = currentPrefsString; // Update ref to null
        }
        else {
            logApp('Preference check: No change detected or preferences still null.');
             // Update ref if it's the first render and prefs are null
             if (previousPrefsString === null && currentPrefsString === 'null') {
                 prevPreferencesRef.current = currentPrefsString;
             }
        }
    } else {
        logApp('Preference change check skipped (conditions not met):', { initialAppLoadComplete, hasCompletedQuestionnaire, preferencesLoading });
    }
    // Dependencies: Rerun when these change.
  }, [userPreferences, initialAppLoadComplete, hasCompletedQuestionnaire, preferencesLoading]);


  // --- Questionnaire Completion Handler ---
  const handleQuestionnaireComplete = useCallback(() => {
    logApp('Questionnaire reported as complete.');
    if (!currentUser?.attributes?.sub) {
        logError('Cannot handle questionnaire complete: No user ID.');
        return;
    }
    const userId = currentUser.attributes.sub;

    // 1. Optimistically update UI state
    setHasCompletedQuestionnaire(true);
    setShowQuestionnaireModal(false); // Close the modal
    setShowPreferencesPromptBanner(false); // Hide the prompt banner

    // 2. Update localStorage immediately (optional, but good for quick UI feedback on reload)
    try {
      localStorage.setItem(`questionnaire_completed_${userId}`, 'true');
    } catch (e) {
      console.error("Error writing completion status to localStorage:", e);
    }

    // 3. Re-fetch preferences to get the latest data saved by the questionnaire
    //    The preference change effect (now fixed) should NOT trigger a refresh here,
    //    as it will be marked as the 'initial load' after completion.
    //    PersonalizedRecommendations internal logic should fetch on propHasCompletedQuestionnaire change.
    logApp('Fetching preferences after questionnaire completion...');
    fetchUserPreferences(); // This updates userPreferences state

    // 4. Navigate home if currently on the dedicated onboarding page
    if (location.pathname === '/onboarding') {
        navigate('/');
    }

  }, [currentUser, fetchUserPreferences, location.pathname, navigate]); // Dependencies


  // --- Navigation Handlers ---
  const handleSignInClick = useCallback(() => navigate('/auth'), [navigate]);

  // --- Render Logic ---

  // Loading state for the entire page content area
  // Show loading if auth check isn't done OR if user is authenticated but initial preferences haven't loaded yet.
  const showPageLoading = !initialAppLoadComplete || (isAuthenticated && preferencesLoading && userPreferences === null);


  const renderMainContent = () => {
    // If not authenticated, show landing page (only after auth check is complete)
    if (!isAuthenticated && initialAppLoadComplete) {
      logApp('Render: Landing Page');
      return <LandingPage onSignInClick={handleSignInClick} />;
    }

    // Show loading skeleton if initial app load isn't complete OR initial pref fetch is happening
    if (showPageLoading) {
       logApp('Render: Page Loading Skeleton');
      return (
        <div className="space-y-12 animate-pulse">
          {/* Skeleton for Personalized Recs */}
          <div className="mb-12 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-4 h-8">
              <div className="bg-gray-700 rounded w-1/3"></div>
              <div className="bg-gray-700 rounded-full w-24"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => ( <div key={i} className="bg-gray-800 rounded-xl h-[350px]"></div> ))}
            </div>
          </div>
           {/* Skeleton for Trending */}
           <div className="mb-12 max-w-7xl mx-auto px-4">
             <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
             <div className="flex space-x-4 overflow-hidden">
                 {[...Array(5)].map((_, i) => ( <div key={i} className="bg-gray-800 rounded-xl h-[250px] w-1/5 flex-shrink-0"></div> ))}
             </div>
           </div>
           {/* Add more skeletons if needed */}
        </div>
      );
    }

    // If authenticated and initial load is complete, render the main dashboard
    if (isAuthenticated && initialAppLoadComplete) {
        logApp('Render: Main Authenticated Content');
        return (
            <div className="space-y-12">
            {/* PersonalizedRecommendations relies on its own internal logic now, controlled by props */}
            {/* It should only render content if propHasCompletedQuestionnaire is true */}
            <PersonalizedRecommendations
                ref={personalizedRecommendationsRef}
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
                // Pass the state values as props
                propUserPreferences={userPreferences}
                propHasCompletedQuestionnaire={hasCompletedQuestionnaire}
                initialAppLoadComplete={initialAppLoadComplete} // Let it know App is ready
            />
            <TrendingSection currentUser={currentUser} isAuthenticated={isAuthenticated} />
            <CategoryBrowser onCategorySelect={setSelectedGenre} />
            {selectedGenre && <GenreResults genreId={selectedGenre} currentUser={currentUser} />}
            </div>
        );
    }

    // Fallback (shouldn't normally be reached if logic is correct)
    logApp('Render: Fallback (Null)');
    return null;
  };

  // --- JSX Return ---
  return (
    <>
      <Bg /> {/* Background Component */}

      {/* === Modals and Overlays === */}

      {/* Preferences Prompt Banner */}
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

      {/* Questionnaire Modal */}
      <AnimatePresence>
        {showQuestionnaireModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
             // Close modal on background click
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowQuestionnaireModal(false);}}
          >
             <motion.div
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.9, opacity: 0 }}
                 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                 className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl overflow-hidden" // Added background and styling
                 onMouseDown={(e) => e.stopPropagation()} // Prevent background click closing when clicking inside modal content
             >
                 <OnboardingQuestionnaire
                    currentUser={currentUser}
                    onComplete={handleQuestionnaireComplete}
                    inModal={true} // Pass prop if styling/behavior differs in modal
                    onClose={() => setShowQuestionnaireModal(false)} // Add explicit close button inside if needed
                />
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

       {/* Account Details Modal */}
      <AnimatePresence>
        {showAccountDetails && isAuthenticated && (
          <AccountDetailsModal
            currentUser={currentUser}
            onClose={() => setShowAccountDetails(false)}
          />
        )}
      </AnimatePresence>

      {/* Favorites Sidebar */}
       <AnimatePresence>
            {showFavorites && isAuthenticated && (
              <motion.div
                key="favorites-sidebar"
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md z-40 pt-16 shadow-lg bg-gray-900/90 backdrop-blur-md" // Adjusted background and z-index
              >
                <FavoritesSection
                  currentUser={currentUser}
                  isAuthenticated={isAuthenticated}
                  onClose={() => setShowFavorites(false)}
                  // inHeader={true} // Remove if not needed, handle styling internally
                />
              </motion.div>
            )}
        </AnimatePresence>


      {/* === Static UI Elements === */}

       {/* Header - Conditionally render based on route */}
       {location.pathname !== '/onboarding' && location.pathname !== '/auth' && (
        <Header
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onSignout={handleSignout}
          onSigninClick={handleSignInClick}
          onAccountClick={() => setShowAccountDetails(true)}
          onSearchClick={() => setShowSearch(prev => !prev)}
          onFavoritesClick={() => setShowFavorites(prev => !prev)}
          // Pass state for icon highlighting if needed
          showFavorites={showFavorites}
          showSearch={showSearch}
        />
       )}

        {/* Search Overlay - Rendered conditionally but positioned fixed */}
       <AnimatePresence>
        {showSearch && isAuthenticated && (
            <motion.div
              key="search-overlay"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
              // Ensure it's above header content if needed, but below modals
              className="fixed inset-x-0 top-0 z-30 pt-16 bg-black/70 backdrop-blur-sm" // Adjusted z-index and background
            >
              {/* Added padding to SearchBar container */}
              <div className="max-w-3xl mx-auto p-4">
                 <SearchBar currentUser={currentUser} onResultClick={() => setShowSearch(false)}/> {/* Close search on selecting result */}
              </div>
            </motion.div>
        )}
        </AnimatePresence>


      {/* === Main Content Area and Routing === */}
      {/* Adjust padding-top based on header height */}
      <main className={`relative z-10 pt-20 transition-transform duration-300 ease-in-out`}>
        <Routes>
          {/* Auth Route */}
          <Route
            path="/auth"
            element={
                !isAuthenticated && initialAppLoadComplete ? // Render only after auth check
                <AuthPage onSignupSuccess={handleSigninSuccess} onSigninSuccess={handleSigninSuccess} /> :
                (isAuthenticated ? <Navigate to="/" replace /> : null) // Redirect if logged in, render null during auth check
            }
          />

          {/* Onboarding Route */}
          <Route
            path="/onboarding"
            element={
              initialAppLoadComplete ? ( // Ensure auth state is known
                isAuthenticated ? (
                  <div className="min-h-screen flex items-center justify-center p-4">
                      <OnboardingQuestionnaire
                          currentUser={currentUser}
                          onComplete={handleQuestionnaireComplete} // Uses the same handler
                      />
                  </div>
                ) : (
                  <Navigate to="/auth" replace state={{ from: location }} /> // Redirect to auth if not logged in
                )
              ) : null // Render nothing while auth is loading
            }
          />

          {/* Main Dashboard Route */}
          <Route path="/" element={
            <div className="container mx-auto px-4 pb-16"> {/* Add padding bottom */}
              {renderMainContent()}
            </div>
          }/>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

// Main App component providing Context and Router
function App() {
  return (
    <ToastProvider> {/* Provides Toast context */}
      <BrowserRouter>
         {/* useAuth hook likely provides Auth context implicitly or AppContent uses it */}
         <AppContent />
      </BrowserRouter>
    </ToastProvider>
  );
}


export default App;