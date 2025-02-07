// App.js
import React from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import AuthPage from './auth/authPage';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import useAuth from './auth/auth';

function App() {
  const {
    isAuthenticated,
    handleSignupSuccess,
    handleSigninSuccess,
    handleSignout,
  } = useAuth();

  return (
    <BrowserRouter>
      <HelmetProvider>
        <div className="min-h-screen relative">
          <Bg />

          {/* Fixed positioned navigation */}
          <nav className="fixed top-4 right-4 z-50">
            {!isAuthenticated ? (
              <Link
                to="/signin?mode=signin"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            ) : (
              <button
                onClick={handleSignout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors whitespace-nowrap"
              >
                Sign Out
              </button>
            )}
          </nav>

          <header className="relative z-10 pt-8">
            <div className="w-full max-w-4xl mx-auto">
              <SearchBar />
            </div>
          </header>

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
      </HelmetProvider>
    </BrowserRouter>
  );
}

export default App;