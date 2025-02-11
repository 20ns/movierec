// auth/auth.js
import { useState, useEffect } from 'react';

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setIsAuthenticated(true);
      setUserEmail(storedEmail);
    }
  }, []);

  const handleSigninSuccess = (tokens, email) => {
    localStorage.setItem('userEmail', email);
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const handleSignout = () => {
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  return {
    isAuthenticated,
    userEmail,
    handleSignupSuccess: (email) => {
      localStorage.setItem('userEmail', email);
      setIsAuthenticated(true);
      setUserEmail(email);
    },
    handleSigninSuccess,
    handleSignout
  };
};

export default useAuth;