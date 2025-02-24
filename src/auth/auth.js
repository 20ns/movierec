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

const refreshAuthToken = async () => {
  const storedUser = localStorage.getItem('currentUser');
  if (!storedUser) return null;

  const user = JSON.parse(storedUser);
  if (!user?.tokens?.refreshToken) return null;

  try {
    const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/refresh`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ refreshToken: user.tokens.refreshToken })
    });

    const newTokens = await response.json();
    const updatedUser = {
      ...user,
      tokens: normalizeTokens({ ...user.tokens, ...newTokens })
    };
    
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    return newTokens.accessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);
    handleSignout();
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user?.tokens) {
        user.tokens = normalizeTokens(user.tokens);
      }
      if (user?.tokens?.idToken) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
    }
  }, []);

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
    refreshAuthToken
  };
  refreshAuthToken: async () => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) return null;
    
    const user = JSON.parse(storedUser);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/refresh`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ refreshToken: user.tokens.refreshToken })
        }
      );
      const newTokens = await response.json();
      // Update user context
      handleSigninSuccess(newTokens, user.email);
      return newTokens.accessToken;
    } catch (error) {
      handleSignout();
      return null;
    }
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
