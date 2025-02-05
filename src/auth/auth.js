import { useState } from 'react';

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const handleSignupSuccess = () => {
    setShowSignup(false); // After signup, maybe show signin form or redirect
    alert('Signup successful! Please sign in.');
  };

  const handleSigninSuccess = (tokens) => {
    setIsAuthenticated(true); // Set auth state to true
    localStorage.setItem('accessToken', tokens.accessToken); // Store tokens (consider secure storage in production)
    localStorage.setItem('idToken', tokens.idToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    alert('Signin successful!');
  };

  const handleSignout = () => {
    setIsAuthenticated(false);
    localStorage.clear(); // Clear stored tokens
    alert('Signed out.');
  };

  return {
    isAuthenticated,
    setIsAuthenticated, // If you need to set auth state directly from outside
    showSignup,
    setShowSignup, // Allow toggling signup form from outside if needed
    handleSignupSuccess,
    handleSigninSuccess,
    handleSignout,
  };
};

export default useAuth;