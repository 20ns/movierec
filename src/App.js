import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import useAuth from './auth/auth'; // Assuming path is correct
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
import SearchBar from './components/SearchBar'; // Assuming path is correct
import SignInModal from './components/SigninForm'; // Assuming path is correct
import { SparklesIcon, ArrowRightIcon, FilmIcon, UserIcon } from '@heroicons/react/24/solid'; // Use solid for consistency if needed
import { MagnifyingGlassIcon as SearchIcon } from '@heroicons/react/24/outline'; // Keep outline for search
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/ToastManager';
import ScrollContainer from './components/ScrollContainer';

// Landing page component - unchanged
const LandingPage = ({ onSignInClick }) => {
    return (
        <div className="container mx-auto px-4 py-12 flex flex-col items-center">
          {/* Hero section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">
              Discover Your Next Favorite Movie
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Get personalized movie recommendations based on your preferences and viewing history.
              Sign in to unlock your custom movie experience.
            </p>
            <button
              onClick={onSignInClick}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xl font-medium transition-all shadow-lg flex items-center mx-auto"
            >
              Get Started <ArrowRightIcon className="w-5 h-5 ml-2" />
            </button>
          </motion.div>

          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto mb-16">
            {[
              { icon: <FilmIcon className="w-12 h-12 text-purple-500" />, title: "Personalized Recommendations", description: "Our algorithm learns your preferences and suggests movies you'll love." },
              { icon: <SparklesIcon className="w-12 h-12 text-indigo-500" />, title: "Trending Movies", description: "Stay updated with what's popular and trending in the movie world." },
              { icon: <UserIcon className="w-12 h-12 text-blue-500" />, title: "Save Your Favorites", description: "Build your collection and keep track of movies you want to watch." }
            ].map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }} className="bg-gray-800 bg-opacity-70 p-6 rounded-xl text-center">
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Preview section */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="w-full max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-white text-center">Popular Right Now</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg group">
                  <div className="aspect-[2/3] bg-gradient-to-br from-purple-900/40 to-indigo-900/40 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <button onClick={onSignInClick} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all shadow-md border border-purple-500">
                Sign in to see more
              </button>
            </div>
          </motion.div>
        </div>
      );
};


function AppContent() {
  const {
    isAuthenticated,
    currentUser,
    handleSigninSuccess,
    handleSignout,
    loading: authLoading, // Renamed to avoid conflict
    isNewUser
  } = useAuth();
  const navigate = useNavigate();

  // Component State
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false); // Source of truth
  const [preferencesLoading, setPreferencesLoading] = useState(true); // Loading state for preferences fetch
  const [initialAppLoadComplete, setInitialAppLoadComplete] = useState(false); // Overall app ready flag

  // Refs
  const preferenceModalRef = useRef(null);
  const accountModalRef = useRef(null); // Assuming used within AccountDetailsModal
  const personalizedRecommendationsRef = useRef(null); // Ref to PersonalizedRecommendations

  // Function to fetch user preferences and determine questionnaire status
  const fetchUserPreferences = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setPreferencesLoading(false);
      setInitialAppLoadComplete(true); // Mark load complete even if not logged in
      return;
    }

    const userId = currentUser.attributes.sub;
    const token = currentUser.signInUserSession.accessToken.jwtToken;
    console.log("AppContent: Fetching user preferences...");
    setPreferencesLoading(true);

    // Attempt to load from local storage first for speed
    let completedFromStorage = false;
    try {
      const localPrefsString = localStorage.getItem(`userPrefs_${userId}`);
      if (localPrefsString) {
        const localPrefs = JSON.parse(localPrefsString);
        setUserPreferences(localPrefs);
        // Determine completion from stored data (check for actual preference keys)
        completedFromStorage = localPrefs.questionnaireCompleted === true ||
                                (!!localPrefs && Object.keys(localPrefs).filter(k => !['userId', 'updatedAt', 'questionnaireCompleted'].includes(k)).length > 0);
        setHasCompletedQuestionnaire(completedFromStorage);
        console.log("AppContent: Loaded initial preferences/completion status from localStorage:", completedFromStorage);
      }
       // Also check explicit completion flag from storage
      const completionStatus = localStorage.getItem(`questionnaire_completed_${userId}`);
      if (completionStatus === 'true') {
           completedFromStorage = true; // Explicit flag overrides pref check
           setHasCompletedQuestionnaire(true);
      }


    } catch (e) {
      console.error("AppContent: Error reading preferences from localStorage", e);
      localStorage.removeItem(`userPrefs_${userId}`); // Clear potentially corrupt data
    }

    // Fetch from API to get the latest
    try {
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        mode: 'cors', // Ensure CORS is handled server-side
      });

      if (response.ok) {
        const data = await response.json();
        const hasMeaningfulPrefs = !!data && Object.keys(data).filter(key => !['userId', 'updatedAt', 'questionnaireCompleted'].includes(key)).length > 0;
        const isCompleted = data.questionnaireCompleted === true || hasMeaningfulPrefs;

        console.log("AppContent: Fetched preferences from API. Completed:", isCompleted, "Data:", data);

        setUserPreferences(data); // Update state with fresh data
        setHasCompletedQuestionnaire(isCompleted); // Update completion status definitively

        // Update localStorage
        localStorage.setItem(`userPrefs_${userId}`, JSON.stringify(data));
        localStorage.setItem(`questionnaire_completed_${userId}`, isCompleted ? 'true' : 'false');

        // If questionnaire just got completed via this fetch, trigger recommendation refresh
        if (isCompleted && !completedFromStorage) {
           console.log("AppContent: Questionnaire completion detected via API fetch, triggering recommendation refresh.");
           refreshRecommendations();
        }

      } else {
        console.error(`AppContent: Failed to fetch preferences, status: ${response.status}`);
        // If API fails but we had storage data, keep using it. If not, mark as incomplete.
        if (!completedFromStorage) {
           setHasCompletedQuestionnaire(false);
           localStorage.setItem(`questionnaire_completed_${userId}`, 'false');
        }
      }
    } catch (error) {
      console.error('AppContent: Error fetching user preferences API:', error);
       // Keep using storage data if available, otherwise mark incomplete
       if (!completedFromStorage) {
           setHasCompletedQuestionnaire(false);
           localStorage.setItem(`questionnaire_completed_${userId}`, 'false');
        }
    } finally {
      setPreferencesLoading(false);
      setInitialAppLoadComplete(true); // Mark initial load complete *after* preferences attempt
      console.log("AppContent: Preferences fetch cycle complete. InitialLoadComplete:", true);
    }
  }, [isAuthenticated, currentUser]); // Dependencies for fetching

  // --- Effects ---

  // Fetch preferences when authentication state changes
  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]); // Runs when fetchUserPreferences definition changes (i.e., auth state changes)

  // Handle navigation and preference prompt based on auth state and questionnaire status
  useEffect(() => {
    if (!authLoading) { // Only run after auth check is complete
        if (isAuthenticated && currentUser) {
            // Navigate new users to onboarding
            if (isNewUser) {
                navigate('/onboarding');
            } else {
                // Check for prompt only after preferences have been loaded/attempted
                if (!preferencesLoading) {
                    const userId = currentUser.attributes.sub;
                    const hasShownPrompt = localStorage.getItem(`preference_prompt_shown_${userId}`);
                    if (!hasCompletedQuestionnaire && !hasShownPrompt && window.location.pathname !== '/onboarding') {
                        setShowPreferencesPrompt(true);
                        localStorage.setItem(`preference_prompt_shown_${userId}`, 'true');
                        const timer = setTimeout(() => setShowPreferencesPrompt(false), 10000);
                        return () => clearTimeout(timer);
                    }
                }
                // Keep existing users on their current page or '/'
                if (window.location.pathname === '/auth' || window.location.pathname === '/onboarding') {
                   navigate('/');
                }
            }
        } else {
            // Non-authenticated users stay on landing or auth page
            if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
               // Optionally redirect other paths to landing for logged-out users
               // navigate('/');
            }
        }
    }
  }, [isAuthenticated, currentUser, authLoading, isNewUser, hasCompletedQuestionnaire, preferencesLoading, navigate]);


  // --- Event Handlers ---

  // Function to trigger recommendation refresh via ref
  const refreshRecommendations = useCallback(() => {
    console.log("AppContent: Attempting to refresh recommendations via ref...");
    if (personalizedRecommendationsRef.current?.refresh) {
        personalizedRecommendationsRef.current.refresh();
    } else {
        console.warn("AppContent: personalizedRecommendationsRef or refresh method not available.");
    }
  }, []); // No dependencies, relies on ref

  // Sign-in success: Update auth state, then fetch preferences (which triggers downstream effects)
  const handleAuthSuccess = useCallback((user) => {
    handleSigninSuccess(user);
    // No timeout needed, let the useEffect watching isAuthenticated trigger fetchUserPreferences
  }, [handleSigninSuccess]);

  // Questionnaire completed: Update state, fetch prefs, refresh recs
  const handleQuestionnaireComplete = useCallback(() => {
    console.log("AppContent: Questionnaire complete handler triggered.");
    setHasCompletedQuestionnaire(true);
    setShowQuestionnaire(false);
    if (currentUser) {
      localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, 'true');
    }
    // Fetch latest preferences to ensure consistency
    fetchUserPreferences().then(() => {
        // Refresh recommendations *after* preferences have been fetched/updated
        // Add a small delay to ensure state propagation if needed
        setTimeout(refreshRecommendations, 100);
    });
  }, [currentUser, fetchUserPreferences, refreshRecommendations]);

  // Skip questionnaire
  const handleSkipQuestionnaire = useCallback(() => {
    setShowQuestionnaire(false);
    if (currentUser) {
      localStorage.setItem(`questionnaire_skipped_${currentUser.attributes.sub}`, 'true');
    }
    // Don't mark as completed
  }, [currentUser]);

  // Navigate to auth page
  const handleSignInClick = () => {
    navigate('/auth');
  };

  // Listen for custom event to open questionnaire modal
  useEffect(() => {
    const handleOpenQuestionnaire = () => setShowQuestionnaire(true);
    document.addEventListener('open-questionnaire', handleOpenQuestionnaire);
    return () => document.removeEventListener('open-questionnaire', handleOpenQuestionnaire);
  }, []);

  // Handle modal backdrop clicks
  const handleModalBackdropClick = (e, ref, closeAction) => {
    if (ref.current && !ref.current.contains(e.target)) {
      closeAction();
    }
  };

  // --- Render Logic ---

  if (authLoading) {
    return ( // Consistent Loading Screen
      <>
        <Bg />
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-white text-sm font-medium">Loading...</p>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Bg />

      {/* Dynamic preferences prompt */}
      {isAuthenticated && !hasCompletedQuestionnaire && showPreferencesPrompt && (
         <motion.div /* ... unchanged prompt JSX ... */ >
             {/* ... */}
         </motion.div>
      )}

      {/* Questionnaire diamond icon */}
      {isAuthenticated && !hasCompletedQuestionnaire && !authLoading && !preferencesLoading && window.location.pathname !== '/onboarding' && (
         <div className="fixed top-4 left-4 z-50 animate-pulse"> {/* ... unchanged icon JSX ... */}
             {/* ... */}
         </div>
      )}

      {/* Questionnaire Modal */}
      {showQuestionnaire && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm" onClick={(e) => handleModalBackdropClick(e, preferenceModalRef, () => setShowQuestionnaire(false))}>
          <motion.div ref={preferenceModalRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-hidden bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">Your Movie Preferences</h2>
              <button onClick={() => setShowQuestionnaire(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors">
                 <span className="sr-only">Close</span>
                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow"> {/* Make content scrollable */}
              <p className="text-gray-300 mb-6">Help us understand what kinds of movies you enjoy so we can provide better recommendations.</p>
              <OnboardingQuestionnaire
                currentUser={currentUser}
                onComplete={handleQuestionnaireComplete}
                onSkip={handleSkipQuestionnaire}
                isModal={true}
                existingPreferences={userPreferences} // Pass current prefs
                // Let Onboarding determine if it's an update based on existingPreferences
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Account Details Modal */}
      <AnimatePresence>
        {showAccountDetails && isAuthenticated && (
          <AccountDetailsModal currentUser={currentUser} onClose={() => setShowAccountDetails(false)} />
        )}
      </AnimatePresence>

      {/* Header (conditionally rendered) */}
      {window.location.pathname !== '/onboarding' && (
        <>
          <Header
            currentUser={currentUser} isAuthenticated={isAuthenticated}
            setShowSearch={setShowSearch} showSearch={showSearch}
            setShowQuestionnaire={setShowQuestionnaire}
            setShowFavorites={setShowFavorites} showFavorites={showFavorites}
            onSignout={handleSignout} setShowAccountDetails={setShowAccountDetails}
          />
          {/* Search and Favorites Modals/Popovers (unchanged logic) */}
          {showSearch && isAuthenticated && ( <motion.div /* ... */ ><SearchBar currentUser={currentUser} /></motion.div>)}
          <AnimatePresence>{showFavorites && isAuthenticated && ( <motion.div /* ... */ ><FavoritesSection currentUser={currentUser} isAuthenticated={isAuthenticated} onClose={() => setShowFavorites(false)} inHeader={true} /></motion.div> )}</AnimatePresence>
        </>
      )}

      {/* Main Content Area */}
      <ScrollContainer className="relative z-10 pt-8 w-full" maxHeight="none" showShadows={false} style={{ height: 'calc(100vh - 80px)' }}>
        <main className="relative z-10 pt-8">
          <Routes>
            <Route path="/auth" element={<AuthPage onSignupSuccess={handleAuthSuccess} onSigninSuccess={handleAuthSuccess} />} />
            <Route path="/onboarding" element={ isAuthenticated ? <OnboardingQuestionnaire currentUser={currentUser} onComplete={() => { handleQuestionnaireComplete(); navigate('/'); }} /> : <Navigate to="/auth" replace />} />

            {/* Main Application Route */}
            <Route path="/" element={
              <div className="container mx-auto px-4 mt-12">
                {isAuthenticated ? (
                  <div className="space-y-12">
                    {/* Personalized Recommendations Section */}
                    {/* Render placeholder/prompt if prefs are loading or questionnaire not done */}
                    {preferencesLoading && (
                        <div className="mb-12 max-w-7xl mx-auto px-4">
                           <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold text-white h-8 bg-gray-700 rounded w-1/3 animate-pulse"></h2>
                             <div className="h-8 w-24 bg-gray-700 rounded-full animate-pulse"></div>
                           </div>
                           <div className="h-6 bg-gray-700 rounded w-1/2 animate-pulse mb-6"></div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                             {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-gray-800 rounded-xl h-[350px] shadow-md overflow-hidden animate-pulse">
                                   <div className="h-3/5 bg-gray-700"></div><div className="p-4 space-y-3"><div className="h-5 bg-gray-700 rounded w-3/4"></div><div className="h-4 bg-gray-700 rounded w-1/2"></div></div>
                                </div>
                             ))}
                           </div>
                        </div>
                    )}

                    {!preferencesLoading && !hasCompletedQuestionnaire && initialAppLoadComplete && (
                        // Show prompt to complete questionnaire if loading is finished but not complete
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="recommendation-prompt" className="mb-12 max-w-7xl mx-auto px-4">
                           <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Personalize Your Experience</h2></div>
                           <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 shadow-lg border border-indigo-800">
                             <div className="flex items-center">
                               <div className="mr-5 flex-shrink-0"><SparklesIcon className="h-10 w-10 text-purple-300" /></div>
                               <div>
                                 <h3 className="text-xl font-semibold text-white mb-2">Unlock Personalized Recommendations</h3>
                                 <p className="text-purple-200 leading-relaxed mb-4">Complete your quick preference profile to discover movies and shows tailored just for you!</p>
                                 <button className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-100 transition-colors" onClick={() => setShowQuestionnaire(true)}>Start Questionnaire</button>
                               </div>
                             </div>
                           </div>
                        </motion.div>
                    )}

                    {!preferencesLoading && hasCompletedQuestionnaire && initialAppLoadComplete && (
                         // Render the actual recommendations component when ready
                         <PersonalizedRecommendations
                            ref={personalizedRecommendationsRef}
                            currentUser={currentUser}
                            isAuthenticated={isAuthenticated}
                            propUserPreferences={userPreferences} // Pass fetched preferences
                            propHasCompletedQuestionnaire={hasCompletedQuestionnaire} // Pass completion status
                            initialAppLoadComplete={initialAppLoadComplete} // Pass app ready flag
                         />
                    )}

                    {/* Other Sections */}
                    <TrendingSection currentUser={currentUser} />
                    <CategoryBrowser onCategorySelect={setSelectedGenre} />
                    {selectedGenre && <GenreResults genreId={selectedGenre} currentUser={currentUser} />}
                  </div>
                ) : (
                  <LandingPage onSignInClick={handleSignInClick} /> // Show landing page if not authenticated
                )}
              </div>
            }/>

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ScrollContainer>
    </>
  );
}

// Main App component with ToastProvider and Router
function App() {
  console.log("App rendering with ToastProvider");
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;