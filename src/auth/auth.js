import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';

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
      const user = await getCurrentUser();
      
      // Verify that the user has a valid access token before setting authenticated
      if (user?.signInUserSession?.accessToken?.jwtToken) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      } else {
        console.warn('[Auth] User exists but no valid access token found');
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

  
  const handleSigninSuccess = useCallback((user, isNew = false) => {
    console.log('[Auth] handleSigninSuccess called:', {
      userExists: !!user,
      sessionExists: !!user?.signInUserSession,
      accessTokenExists: !!user?.signInUserSession?.accessToken,
      jwtTokenExists: !!user?.signInUserSession?.accessToken?.jwtToken,
      isNew
    });
    
    // Verify user has valid access token before setting authenticated
    if (user?.signInUserSession?.accessToken?.jwtToken) {
      console.log('[Auth] handleSigninSuccess: Setting authenticated to true');
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsNewUser(isNew);
    } else {
      console.warn('[Auth] Sign-in success but no valid access token found');
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