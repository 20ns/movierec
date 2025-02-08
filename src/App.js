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
                className="group relative px-4 py-2 rounded-full text-white  border-2  border-gray-100/50 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10  transition-all duration-300 overflow-hidden
                hover:border-white
                "
              >

                  <div className="absolute inset-0 rounded-full  bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-md z-[-1] transition-opacity duration-300 group-hover:opacity-30 "></div>
                Sign In

              </Link>
            ) : (
              <button
                onClick={handleSignout}
                className="group relative px-4 py-2 rounded-full  text-white   border-2  border-gray-100/50  bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10   transition-all duration-300  overflow-hidden
                      hover:border-white"
              >

                  <div className="absolute inset-0 rounded-full  bg-gradient-to-r from-red-500 to-orange-600 opacity-20 blur-md z-[-1] transition-opacity duration-300 group-hover:opacity-30"></div>
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