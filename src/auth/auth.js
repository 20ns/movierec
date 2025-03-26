// auth.js
import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Auth } from 'aws-amplify';

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setIsAuthenticated(true);
      setCurrentUser(user);
    } catch (error) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSigninSuccess = async (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleSignout = async () => {
    try {
      await Auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    isAuthenticated,
    currentUser,
    loading,
    handleSigninSuccess,
    handleSignout,
    checkAuthState
  };
};

export default useAuth;