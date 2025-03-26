import React, { useEffect } from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import AuthPage from './auth/authPage';
import SignInModal from './components/SigninForm';
import UserMenu from './account/UserMenu';
import FavoritesSection from './components/FavoritesSection';
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
        <div className="w-full max-w-4xl mx-auto">
          <SearchBar />
        </div>
      </header>

      {isAuthenticated && (
        <FavoritesSection 
          currentUser={currentUser} 
          isAuthenticated={isAuthenticated} 
        />
      )}

      <main className="relative z-10">
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
              <div className="container mx-auto px-4 mt-20">
                {isAuthenticated ? (
                  <div className="text-center">
                    <p className="text-green-600 font-semibold text-xl">
                      Welcome {currentUser?.attributes?.email}
                    </p>
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