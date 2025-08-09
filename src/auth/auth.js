import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';

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
      // In AWS Amplify v6, getCurrentUser() returns a simple user object
      const user = await getCurrentUser();
      
      if (user) {
        // Verify we have a valid session
        try {
          const session = await fetchAuthSession();
          if (session?.tokens?.accessToken) {
            setIsAuthenticated(true);
            setCurrentUser(user);
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } catch (sessionError) {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSigninSuccess = useCallback(async (user, isNew = false) => {
    
    if (user) {
      try {
        // Verify we have a valid session in AWS Amplify v6
        const session = await fetchAuthSession();
        if (session?.tokens?.accessToken) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setIsNewUser(isNew);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsNewUser(false);
        }
      } catch (sessionError) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsNewUser(false);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsNewUser(false);
    }
  }, []);

  const handleSignout = async () => {
    try {
      await signOut();
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