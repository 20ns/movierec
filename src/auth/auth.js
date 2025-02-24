import React, { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

// Helper to normalize token keys
const normalizeTokens = (tokens) => ({
  idToken: tokens.idToken || tokens.IdToken,
  accessToken: tokens.accessToken || tokens.AccessToken,
  refreshToken: tokens.refreshToken || tokens.RefreshToken
});

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) return;

      try {
        const user = JSON.parse(storedUser);
        if (user?.tokens) {
          user.tokens = normalizeTokens(user.tokens);
          
          // Verify token validity on initial load
          if (await verifyTokenExpiration(user.tokens.accessToken)) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('currentUser');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('currentUser');
      }
    };

    initializeAuth();
  }, []);

  // Token verification helper
  const verifyTokenExpiration = (token) => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  // Token refresh handler
  const refreshAuthToken = async () => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) return null;

    try {
      const user = JSON.parse(storedUser);
      if (!user?.tokens?.refreshToken) throw new Error('No refresh token available');

      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: user.tokens.refreshToken })
        }
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const newTokens = normalizeTokens(await response.json());
      const updatedUser = {
        ...user,
        tokens: { ...user.tokens, ...newTokens }
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      return newTokens.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      handleSignout();
      return null;
    }
  };

  // Auth event handlers
  const handleSigninSuccess = (tokens, email) => {
    const normalizedTokens = normalizeTokens(tokens);
    const user = { email, tokens: normalizedTokens };
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleSignupSuccess = (tokens, email) => {
    handleSigninSuccess(tokens, email); // Reuse signin logic
  };

  const handleSignout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.location.reload(); // Ensure full state clearance
  };

  // Context value
  const authContextValue = {
    isAuthenticated,
    currentUser,
    onSigninSuccess: handleSigninSuccess,
    onSignupSuccess: handleSignupSuccess,
    onSignout: handleSignout,
    refreshAuthToken
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