import React, { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user?.tokens?.idToken) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
    }
  }, []);

// Updated handleSigninSuccess in AuthProvider
// In your AuthProvider.js, update the success handlers:
const handleSigninSuccess = (tokens, email) => {
  const user = { 
    email,
    tokens: {
      idToken: tokens.IdToken,    // Capital I
      accessToken: tokens.AccessToken,  // Capital A
      refreshToken: tokens.RefreshToken // Capital R
    }
  };
  localStorage.setItem('currentUser', JSON.stringify(user));
  setIsAuthenticated(true);
  setCurrentUser(user);
};

  const handleSignout = () => {
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleSignupSuccess = (tokens, email) => {
    const user = {
      email,
      tokens: {
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const authContextValue = {
    isAuthenticated,
    currentUser,
    onSigninSuccess: handleSigninSuccess,
    onSignout: handleSignout,
    onSignupSuccess: handleSignupSuccess,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};