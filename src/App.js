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
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import useAuth from './auth/auth';

function AppContent() {
  const {
    isAuthenticated,
    currentUser,
    handleSigninSuccess,
    handleSignout,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        navigate('/');
      } else {
        navigate('/auth');
      }
    }
  }, [isAuthenticated, loading, navigate]);

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

      {isAuthenticated && (
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