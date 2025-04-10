import React, { useEffect, useState, useRef, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import AuthPage from './auth/authPage';
import SignInModal from './components/SigninForm';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import TrendingSection from './components/TrendingSection';
import PersonalizedRecommendations from './components/PersonalizedRecommendations';
import CategoryBrowser from './components/CategoryBrowser';
import GenreResults from './components/GenreResults';
import FavoritesSection from './components/FavoritesSection'; // Import FavoritesSection
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import useAuth from './auth/auth';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { FilmIcon, UserIcon, ArrowRightIcon, MagnifyingGlassIcon as SearchIcon } from '@heroicons/react/24/outline';
import Header from './components/Header';
import AccountDetailsModal from './components/AccountDetailsModal'; // Import the new component
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/ToastManager'; // Import ToastProvider
import ScrollContainer from './components/ScrollContainer'; // Import ScrollContainer

// Landing page component for non-authenticated users
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
          {
            icon: <FilmIcon className="w-12 h-12 text-purple-500" />,
            title: "Personalized Recommendations",
            description: "Our algorithm learns your preferences and suggests movies you'll love."
          },
          {
            icon: <SparklesIcon className="w-12 h-12 text-indigo-500" />,
            title: "Trending Movies",
            description: "Stay updated with what's popular and trending in the movie world."
          },
          {
            icon: <UserIcon className="w-12 h-12 text-blue-500" />,
            title: "Save Your Favorites",
            description: "Build your collection and keep track of movies you want to watch."
          }
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            className="bg-gray-800 bg-opacity-70 p-6 rounded-xl text-center"
          >
            <div className="flex justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
            <p className="text-gray-300">{feature.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Preview section - sample trending movies */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="w-full max-w-6xl mx-auto"
      >
        <h2 className="text-3xl font-bold mb-6 text-white text-center">
          Popular Right Now
        </h2>
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
          <button 
            onClick={onSignInClick} 
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all shadow-md border border-purple-500"
          >
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
    loading,
    isNewUser
  } = useAuth();
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false); // New state for account details modal
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);
  const [recommendationsKey, setRecommendationsKey] = useState(0); // Add this state for forcing re-render
  const preferenceModalRef = useRef(null);
  const accountModalRef = useRef(null);
  const personalizedRecommendationsRef = useRef(null); // Add reference to the recommendations component
  const [userPreferences, setUserPreferences] = useState(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [prefUpdateCounter, setPrefUpdateCounter] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  // Enhanced function to fetch user preferences
  const fetchUserPreferences = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;
    
    try {
      setPreferencesLoaded(false); // Reset loading state
      // First set from localStorage for quick UI response
      const localPrefs = localStorage.getItem(`userPrefs_${currentUser.attributes.sub}`);
      if (localPrefs) {
        const parsedPrefs = JSON.parse(localPrefs);
        setUserPreferences(parsedPrefs);
      }
      
      // Check if questionnaire is completed (from localStorage first for speed)
      const completionStatus = localStorage.getItem(`questionnaire_completed_${currentUser.attributes.sub}`);
      const hasCompletedFromStorage = completionStatus === 'true';
      setHasCompletedQuestionnaire(hasCompletedFromStorage);
      
      // Immediately determine if we should show recommendations based on local storage
      setShowRecommendations(hasCompletedFromStorage);
      
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        headers: {
          Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
        
      if (response.ok) {
        const data = await response.json();
        // Check if data has the questionnaireCompleted field or properties
        const hasCompleted = data.questionnaireCompleted === true || 
          (!!data && Object.keys(data).filter(key => key !== 'userId' && key !== 'updatedAt').length > 0);
        
        setHasCompletedQuestionnaire(hasCompleted);
        localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, hasCompleted ? 'true' : 'false');
        
        // Update our decision to show recommendations based on server data
        setShowRecommendations(hasCompleted);
        
        // Store the full preference data for recommendations
        setUserPreferences(data);
        localStorage.setItem(`userPrefs_${currentUser.attributes.sub}`, JSON.stringify(data));
        
        // Refresh recommendations when preferences are loaded from API
        refreshRecommendations();
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    } finally {
      setPreferencesLoaded(true);
      setInitialLoadComplete(true);
    }
  }, [isAuthenticated, currentUser]);

  // Check if user has completed questionnaire
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Check local storage first for quick UI response
      const completionStatus = localStorage.getItem(`questionnaire_completed_${currentUser.attributes.sub}`);
      
      // Set initial state from localStorage
      if (completionStatus === 'true') {
        setHasCompletedQuestionnaire(true);
      } else {
        setHasCompletedQuestionnaire(false);
        
        // Fetch from API regardless of local storage to ensure we have the latest status
        const fetchPreferences = async () => {
          try {
            const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
              headers: {
                Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
                'Content-Type': 'application/json',
              },
              mode: 'cors',
            });
            
            if (response.ok) {
              const data = await response.json();
              // Check if data has the questionnaireCompleted field or fallback to checking properties
              const hasCompleted = data.questionnaireCompleted === true || 
                (!!data && Object.keys(data).filter(key => key !== 'userId' && key !== 'updatedAt').length > 0);
              
              setHasCompletedQuestionnaire(hasCompleted);
              localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, hasCompleted ? 'true' : 'false');
            } else {
              console.error(`HTTP error! Status: ${response.status}`);
              // Keep current state from localStorage if API fails
            }
          } catch (error) {
            console.error('Error checking questionnaire status:', error);
            // Keep the state from localStorage if there's an error
          }
        };
        
        fetchPreferences();
      }
      
      // Handle the preferences prompt - only show once
      const hasShownPrompt = localStorage.getItem(`preference_prompt_shown_${currentUser.attributes.sub}`);
      if (!hasShownPrompt && !hasCompletedQuestionnaire) {
        setShowPreferencesPrompt(true);
        // Mark as shown
        localStorage.setItem(`preference_prompt_shown_${currentUser.attributes.sub}`, 'true');
        
        // Auto-hide after 10 seconds
        const timer = setTimeout(() => {
          setShowPreferencesPrompt(false);
        }, 10000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, currentUser, hasCompletedQuestionnaire]);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // If user is a new user, direct to onboarding
        if (isNewUser) {
          navigate('/onboarding');
        } else {
          navigate('/');
        }
      }
      // Remove the automatic redirect to /auth for non-authenticated users
      // This allows them to see the landing page
    }
  }, [isAuthenticated, loading, navigate, isNewUser]);

  // Use effect to fetch preferences on login
  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  // Check for completed questionnaire on initial load
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Check local storage immediately to prevent layout shifts
      const completionStatus = localStorage.getItem(`questionnaire_completed_${currentUser.attributes.sub}`);
      
      if (completionStatus === 'true') {
        setHasCompletedQuestionnaire(true);
        setShowRecommendations(true);
      } else {
        setHasCompletedQuestionnaire(false);
        setShowRecommendations(false);
      }
      
      // Mark initial load as complete after a brief delay
      setTimeout(() => {
        setInitialLoadComplete(true);
      }, 200);

      // ...existing code for fetchPreferences...
    }
  }, [isAuthenticated, currentUser]);

  // Function to fetch latest recommendations - with debouncing
  const refreshRecommendations = useCallback(() => {
    // Don't refresh if we haven't completed initial load
    if (!initialLoadComplete) return;
    
    // Force re-render of the recommendations component
    setRecommendationsKey(prevKey => prevKey + 1);
    
    // Dispatch a custom event that the PersonalizedRecommendations component can listen for
    const refreshEvent = new CustomEvent('refresh-recommendations');
    document.dispatchEvent(refreshEvent);
  }, [initialLoadComplete]);

  // Enhanced sign-in success handler to fetch preferences
  const handleAuthSuccess = useCallback(async (user) => {
    handleSigninSuccess(user);
    
    // Wait for auth state to be updated
    setTimeout(() => {
      // Just fetch preferences - don't force a recommendation refresh yet
      fetchUserPreferences();
    }, 500);
  }, [handleSigninSuccess, fetchUserPreferences]);

  // Handler for questionnaire completion
  const handleQuestionnaireComplete = () => {
    setHasCompletedQuestionnaire(true);
    setShowQuestionnaire(false);
    localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, 'true');
    
    // Fetch the latest preferences
    fetchUserPreferences();
    
    // Refresh recommendations with updated preferences - with a slight delay
    setTimeout(() => {
      refreshRecommendations();
    }, 500);
  };

  // New handler for skipping the questionnaire
  const handleSkipQuestionnaire = () => {
    setShowQuestionnaire(false);
    // Set a temporary flag to remind the user later
    localStorage.setItem(`questionnaire_skipped_${currentUser.attributes.sub}`, 'true');
    // Don't mark as completed, so the user will be prompted again later
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };

  // Listen for custom event to open preferences
  useEffect(() => {
    const handleOpenPreferences = () => setShowQuestionnaire(true);
    document.addEventListener('open-preferences', handleOpenPreferences);
    return () => document.removeEventListener('open-preferences', handleOpenPreferences);
  }, []);

  // Add this event listener in the AppContent component

  // Listen for the open-questionnaire event
  useEffect(() => {
    const handleOpenQuestionnaire = () => {
      setShowQuestionnaire(true);
    };
    
    document.addEventListener('open-questionnaire', handleOpenQuestionnaire);
    
    return () => {
      document.removeEventListener('open-questionnaire', handleOpenQuestionnaire);
    };
  }, []);

  // Handle backdrop clicks for modals
  const handleModalBackdropClick = (e, ref, closeAction) => {
    if (ref.current && !ref.current.contains(e.target)) {
      closeAction();
    }
  };

  if (loading) {
    return (
      <>
        <Bg /> {/* Add background component to loading state */}
        <div className="fixed inset-0 z-10 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-white text-sm font-medium">Loading your experience...</p>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Bg />

      {/* Dynamic preferences prompt - only shows once */}
      {isAuthenticated && !hasCompletedQuestionnaire && showPreferencesPrompt && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 px-4 py-3 rounded-lg shadow-lg border border-purple-500/30 flex items-center gap-3 max-w-md"
        >
          <SparklesIcon className="w-6 h-6 text-purple-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-white">Set your movie preferences to get personalized recommendations</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setShowPreferencesPrompt(false);
                setShowQuestionnaire(true);
              }}
              className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded"
            >
              Set Now
            </button>
            <button 
              onClick={() => setShowPreferencesPrompt(false)}
              className="text-sm px-2 py-1 text-gray-300 hover:text-white"
            >
              Later
            </button>
          </div>
        </motion.div>
      )}

      {/* Questionnaire diamond icon - highlight more prominently for new users */}
      {isAuthenticated && !hasCompletedQuestionnaire && window.location.pathname !== '/onboarding' && (
        <div className="fixed top-4 left-4 z-50 animate-pulse">
          <button 
            onClick={() => setShowQuestionnaire(true)}
            className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg flex items-center justify-center"
            title="Complete your preference questionnaire"
          >
            <SparklesIcon className="w-6 h-6" />
          </button>
          <div className="mt-2 text-xs text-white bg-purple-700 p-1 rounded text-center">
            Set Preferences
          </div>
        </div>
      )}

      {/* Improved Questionnaire Modal with backdrop click handling */}
      {showQuestionnaire && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75"
          onClick={(e) => handleModalBackdropClick(e, preferenceModalRef, () => setShowQuestionnaire(false))}
        >
          <motion.div 
            ref={preferenceModalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-400">
                Your Movie Preferences
              </h2>
              <button 
                onClick={() => setShowQuestionnaire(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-[600px] overflow-y-auto">
              <p className="text-gray-300 mb-6">
                Help us understand what kinds of movies you enjoy so we can provide better recommendations.
              </p>
              <OnboardingQuestionnaire 
                currentUser={currentUser} 
                onComplete={handleQuestionnaireComplete}
                onSkip={handleSkipQuestionnaire}
                isModal={true}
                existingPreferences={userPreferences}
                isUpdate={false} // Force full questionnaire when opened from preferences button
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Account Details Modal */}
      {showAccountDetails && isAuthenticated && (
        <AnimatePresence>
          <AccountDetailsModal 
            currentUser={currentUser} 
            onClose={() => setShowAccountDetails(false)}
          />
        </AnimatePresence>
      )}

      {/* Only show header on non-onboarding pages */}
      {window.location.pathname !== '/onboarding' && (
        <>
          <Header 
            currentUser={currentUser}
            isAuthenticated={isAuthenticated} // Pass authentication status
            setShowSearch={setShowSearch}
            showSearch={showSearch}
            setShowQuestionnaire={setShowQuestionnaire}
            setShowFavorites={setShowFavorites}
            showFavorites={showFavorites}
            onSignout={handleSignout}
            setShowAccountDetails={setShowAccountDetails} // Pass the new state setter
          />
          
          {showSearch && isAuthenticated && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl mx-auto mt-6 px-4"
            >
              <SearchBar currentUser={currentUser} />
            </motion.div>
          )}

          {/* Add the favorites section with proper animation */}
          <AnimatePresence>
            {showFavorites && isAuthenticated && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed right-4 top-16 z-50 w-full max-w-md"
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
        </>
      )}

      {/* Wrap the main content in our ScrollContainer */}
      <ScrollContainer
        className="relative z-10 pt-8 w-full"
        maxHeight="none" // Allow full height
        showShadows={false} // Don't show shadows on main content
        style={{ height: 'calc(100vh - 80px)' }}
      >
        <main className="relative z-10 pt-8">
          <Routes>
            <Route
              path="/auth"
              element={
                <AuthPage
                  onSignupSuccess={handleAuthSuccess}
                  onSigninSuccess={handleAuthSuccess}
                />
              }
            />
            {/* Change the auth/* route to just /auth to fix 404 issues */}
            
            <Route
              path="/onboarding"
              element={
                isAuthenticated ? (
                  <OnboardingQuestionnaire 
                    currentUser={currentUser} 
                    onComplete={() => {
                      setHasCompletedQuestionnaire(true);
                      navigate('/');
                    }}
                  />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            
            <Route
              path="/"
              element={
                <div className="container mx-auto px-4 mt-12">
                  {isAuthenticated ? (
                    <div className="space-y-12">
                      {/* Personalized recommendations with improved loading */}
                      <AnimatePresence mode="wait">
                        {/* Show recommendations section or placeholder based on questionnaire status */}
                        {showRecommendations && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key="recommendations"
                          >
                            <PersonalizedRecommendations 
                              key={recommendationsKey}
                              ref={personalizedRecommendationsRef}
                              currentUser={currentUser}
                              isAuthenticated={isAuthenticated}
                              preferencesUpdated={prefUpdateCounter}
                              userPreferences={userPreferences}
                              initialLoadComplete={initialLoadComplete}
                            />
                          </motion.div>
                        )}
                        
                        {/* Show recommendation placeholder for users without completed questionnaire */}
                        {!showRecommendations && initialLoadComplete && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key="recommendation-prompt"
                            className="mb-12"
                          >
                            <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-bold text-white">Personalize Your Experience</h2>
                            </div>
                            
                            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 mb-6 shadow-lg border border-indigo-800">
                              <div className="flex items-center">
                                <div className="mr-5">
                                  <SparklesIcon className="h-10 w-10 text-purple-300" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold text-white mb-2">Complete Your Preference Profile</h3>
                                  <p className="text-purple-200 leading-relaxed mb-4">
                                    Take our quick questionnaire to get personalized movie and TV show recommendations
                                    that match your unique taste!
                                  </p>
                                  <button
                                    className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                                    onClick={() => setShowQuestionnaire(true)}
                                  >
                                    Get Started
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Trending content section */}
                      <TrendingSection currentUser={currentUser} />
                      
                      {/* Category browser section */}
                      <CategoryBrowser onCategorySelect={setSelectedGenre} />
                      
                      {/* Genre-specific results */}
                      {selectedGenre && (
                        <div className="mt-8">
                          <GenreResults 
                            genreId={selectedGenre}
                            currentUser={currentUser}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <LandingPage onSignInClick={handleSignInClick} />
                  )}
                </div>
              }
            />
            
            {/* Add a catch-all redirect to handle any 404s */}
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </ScrollContainer>
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