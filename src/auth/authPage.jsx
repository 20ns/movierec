import React, { useState } from 'react';
import { Auth } from 'aws-amplify';

const AuthPage = ({ onSignupSuccess, onSigninSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignup, setIsSignup] = useState(false);

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Sign up the user
      await Auth.signUp({
        username: email,
        password,
      });
      
      // Auto sign-in after signup
      const user = await Auth.signIn(email, password);
      
      // Pass true as second parameter to indicate this is a new user
      onSignupSuccess(user, true);
      
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleSigninSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const user = await Auth.signIn(email, password);
      onSigninSuccess(user, false); // Existing user
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error.message || 'An error occurred during signin');
    } finally {
      setLoading(false);
    }
  };

  // Existing code for form rendering
  // ...
};

export default AuthPage;
