import React, { useEffect, useState } from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import AuthPage from './auth/authPage';
import SignInModal from './components/SigninForm';
import UserMenu from './account/UserMenu';
import FavoritesSection from './components/FavoritesSection';
import TrendingSection from './components/TrendingSection';
import PersonalizedRecommendations from './components/PersonalizedRecommendations';
import CategoryBrowser from './components/CategoryBrowser';
import GenreResults from './components/GenreResults';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import useAuth from './auth/auth';
import { SparklesIcon } from '@heroicons/react/24/solid';

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
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // If user is a new user, direct to onboarding
        if (isNewUser) {
          navigate('/onboarding');
        } else {
          navigate('/');
        }
      } else {
        navigate('/auth');
      }
    }
  }, [isAuthenticated, loading, navigate, isNewUser]);

  // Handler for questionnaire completion
  const handleQuestionnaireComplete = () => {
    setHasCompletedQuestionnaire(true);
    setShowQuestionnaire(false);
    localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, 'true');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <Bg />

      {/* Questionnaire diamond icon */}
      {isAuthenticated && !hasCompletedQuestionnaire && window.location.pathname !== '/onboarding' && (
        <div className="fixed top-4 left-4 z-50 animate-pulse">
          <button 
            onClick={() => setShowQuestionnaire(true)}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg flex items-center justify-center"
            title="Complete your preference questionnaire"
          >
            <SparklesIcon className="w-6 h-6" />
          </button>
          <div className="mt-2 text-xs text-white bg-purple-700 p-1 rounded text-center">
            Set Preferences
          </div>
        </div>
      )}

      {/* Only show nav on non-onboarding pages */}
      {window.location.pathname !== '/onboarding' && (
        <nav className="fixed top-4 right-4 z-50">
          {!isAuthenticated ? (
            <SignInModal onSigninSuccess={handleSigninSuccess} />
          ) : (
            <UserMenu 
              userEmail={currentUser?.attributes?.email} 
              onSignout={handleSignout} 
            />
          )}
        </nav>
      )}

      {/* Questionnaire Modal */}
      {showQuestionnaire && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75">
          <div className="w-full max-w-4xl bg-gray-900 p-6 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Your Preferences</h2>
              <button 
                onClick={() => setShowQuestionnaire(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <OnboardingQuestionnaire 
              currentUser={currentUser} 
              onComplete={handleQuestionnaireComplete}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Only show header on non-onboarding pages */}
      {window.location.pathname !== '/onboarding' && (
        <header className="relative z-10 pt-8">
          <div className="w-full max-w-4xl mx-auto px-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Movie Recommendations</h1>
            <button 
              onClick={() => setShowSearch(!showSearch)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-colors"
            >
              {showSearch ? 'Hide Search' : 'Search Movies & TV'}
            </button>
          </div>
          {showSearch && (
            <div className="w-full max-w-4xl mx-auto mt-4">
              <SearchBar currentUser={currentUser} />
            </div>
          )}
        </header>
      )}

      {isAuthenticated && window.location.pathname !== '/onboarding' && (
        <FavoritesSection 
          currentUser={currentUser} 
          isAuthenticated={isAuthenticated} 
        />
      )}

      <main className="relative z-10 pt-8">
        <Routes>
          <Route
            path="/auth/*"
            element={
              <AuthPage
                onSignupSuccess={handleSigninSuccess}
                onSigninSuccess={handleSigninSuccess}
              />
            }
          />
          <Route
            path="/onboarding"
            element={
              isAuthenticated ? (
                <OnboardingQuestionnaire currentUser={currentUser} />
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
                    {/* Greeting message */}
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-white mb-2">
                        Welcome, {currentUser?.attributes?.email?.split('@')[0]}
                      </h2>
                      <p className="text-gray-300">
                        Discover your next favorite movie or TV show
                      </p>
                    </div>
                    
                    {/* Personalized recommendations based on user's favorites */}
                    <PersonalizedRecommendations 
                      currentUser={currentUser}
                      isAuthenticated={isAuthenticated}
                    />
                    
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
                  <div className="text-center">
                    <p className="text-lg text-white">
                      Redirecting to authentication...
                    </p>
                  </div>
                )}
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;