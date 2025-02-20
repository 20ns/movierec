// auth.js
import { useState, useEffect } from 'react';

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSigninSuccess = (tokens, email) => {
    // Assuming tokens is an object with an accessToken property
    const user = { token: tokens.accessToken, email };
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
    const user = { token: tokens.accessToken, email };
    localStorage.setItem('currentUser', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  return {
    isAuthenticated,
    currentUser,
    handleSignupSuccess,
    handleSigninSuccess,
    handleSignout
  };
};

export default useAuth;
