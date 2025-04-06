import { useState, useEffect, useCallback } from 'react';
import { Auth } from 'aws-amplify';  // Import full Auth

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

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

  
  const handleSigninSuccess = useCallback((user, isNew = false) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsNewUser(isNew);
  }, []);

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
    isNewUser,
    handleSigninSuccess,
    handleSignout,
    checkAuthState
  };
};

export default useAuth;