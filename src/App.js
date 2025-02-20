// App.js
import React from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import AuthPage from './auth/authPage';
import SignInModal from './components/SigninForm';
import UserMenu from './account/UserMenu'; 
import FavoritesSection from './components/FavoritesSection';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import useAuth from './auth/auth';

function App() {
  const {
    isAuthenticated,
    currentUser,
    handleSignupSuccess,
    handleSigninSuccess,
    handleSignout,
  } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen relative">
        <Bg />

        {/* Fixed positioned navigation */}
        <nav className="fixed top-4 right-4 z-50">
          {!isAuthenticated ? (
            <SignInModal onSigninSuccess={handleSigninSuccess} />
          ) : (
            <UserMenu userEmail={currentUser.email} onSignout={handleSignout} />
          )}
        </nav>

        <header className="relative z-10 pt-8">
          <div className="w-full max-w-4xl mx-auto">
            <SearchBar />
          </div>
        </header>

        {/* Favorites section only shows for authenticated users */}
        {isAuthenticated && (
          <FavoritesSection currentUser={currentUser} isAuthenticated={isAuthenticated} />
        )}

        <main className="relative z-10">
          <Routes>
            <Route
              path="/signin"
              element={
                <AuthPage
                  onSignupSuccess={handleSignupSuccess}
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
                        Authenticated User Content
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-lg">
                        Welcome to the app! Please Sign In to access content.
                      </p>
                    </div>
                  )}
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
