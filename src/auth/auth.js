import React, { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

// Helper to normalize token keys (supports both capitalized and lowercase keys)
const normalizeTokens = (tokens) => {
  return {
    idToken: tokens.idToken || tokens.IdToken,
    accessToken: tokens.accessToken || tokens.AccessToken,
    refreshToken: tokens.refreshToken || tokens.RefreshToken
  };
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Ensure tokens are normalized when loading from local storage
      if (user?.tokens) {
        user.tokens = normalizeTokens(user.tokens);
      }
      if (user?.tokens?.idToken) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
    }
  }, []);

  // This function handles signin responses (using capitalized token properties)
  const handleSigninSuccess = (tokens, email) => {
    const normalizedTokens = normalizeTokens(tokens);
    const user = {
      email,
      tokens: normalizedTokens
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  // This function handles signup responses (using lowercase token properties)
  const handleSignupSuccess = (tokens, email) => {
    const normalizedTokens = normalizeTokens(tokens);
    const user = {
      email,
      tokens: normalizedTokens
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
