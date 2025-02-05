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
          
          <header className="relative z-10">
            <SearchBar />
            <nav className="absolute top-0 right-0 mt-4 mr-4">
              {!isAuthenticated ? (
                <Link 
                  to="/signin?mode=signin" 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Sign In
                </Link>
              ) : (
                <button 
                  onClick={handleSignout} 
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              )}
            </nav>
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
                          Authenticated User Content (Replace with your protected content)
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