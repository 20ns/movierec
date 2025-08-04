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
            console.log('[Auth] Valid authenticated user found:', user.username || user.userId);
            setIsAuthenticated(true);
            setCurrentUser(user);
          } else {
            console.warn('[Auth] User exists but no valid session found');
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } catch (sessionError) {
          console.warn('[Auth] Error fetching session:', sessionError);
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        console.log('[Auth] No user found');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.log('[Auth] No authenticated user:', error.message);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSigninSuccess = useCallback(async (user, isNew = false) => {
    console.log('[Auth] handleSigninSuccess called:', {
      userExists: !!user,
      username: user?.username || user?.userId,
      isNew
    });
    
    if (user) {
      try {
        // Verify we have a valid session in AWS Amplify v6
        const session = await fetchAuthSession();
        if (session?.tokens?.accessToken) {
          console.log('[Auth] handleSigninSuccess: Setting authenticated to true');
          setCurrentUser(user);
          setIsAuthenticated(true);
          setIsNewUser(isNew);
        } else {
          console.warn('[Auth] Sign-in success but no valid session found');
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsNewUser(false);
        }
      } catch (sessionError) {
        console.warn('[Auth] Error fetching session after sign-in:', sessionError);
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsNewUser(false);
      }
    } else {
      console.warn('[Auth] handleSigninSuccess called with no user');
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