// App.js
import React from 'react';
import SearchBar from './components/SearchBar';
import Bg from './components/Bg';
import AuthPage from './auth/authPage'; // Import AuthPage
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import useAuth from './auth/auth';

function App() {
  const {
    isAuthenticated,
    handleSignupSuccess,
    handleSigninSuccess,
    handleSignout,
  } = useAuth(); // Use the useAuth hook to get state and functions

  return (
    <BrowserRouter>
      <HelmetProvider>
        <div>
          <Bg />
          <SearchBar />

          <div className="flex justify-end mt-4 space-x-4 p-4"> {/* Added p-4 for padding */}
            {!isAuthenticated && (
              <Link to="/signin?mode=signup" className="px-4 py-2 bg-blue-500 text-white rounded">Sign In</Link>
            )}
            {isAuthenticated && (
              <button onClick={handleSignout} className="px-4 py-2 bg-red-500 text-white rounded">Sign Out</button>
            )}
          </div>

          <Routes>
            <Route path="/signin" element={<AuthPage onSignupSuccess={handleSignupSuccess} onSigninSuccess={handleSigninSuccess} />} />
            <Route path="/" element={
              <div>
                {isAuthenticated && (
                  <div className="text-center mt-8">
                    <p className="text-green-600 font-semibold">Authenticated User Content (Replace with your protected content)</p>
                  </div>
                )}
                {!isAuthenticated && (
                   <div className="text-center mt-8">
                    <p>Welcome to the app! Please Sign In to access content.</p>
                  </div>
                )}
              </div>
            } />
          </Routes>
        </div>
      </HelmetProvider>
    </BrowserRouter>
  );
}

export default App;