import React, { useState, useEffect } from 'react';
import SignupForm from '../components/SignupForm';
import SigninForm from '../components/SigninForm';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Auth } from 'aws-amplify';

const AuthPage = ({ onSignupSuccess, onSigninSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode = searchParams.get('mode') === 'signup';
  const [showSignupForm, setShowSignupForm] = useState(initialMode);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleForm = (mode) => {
    setShowSignupForm(mode === 'signup');
    navigate(`/auth?mode=${mode}`);
    setAuthError('');
  };

  // Handle authentication success properly
  const handleAuthSuccess = async (authResult, isSignup = false) => {
    setIsLoading(true);
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      if (isSignup) {
        onSignupSuccess?.(cognitoUser);
      } else {
        onSigninSuccess?.(cognitoUser);
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (error) {
      console.error('Auth confirmation error:', error);
      setAuthError('Authentication verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        <div className="flex justify-around mb-4">
          <button
            onClick={() => handleToggleForm('signup')}
            className={`px-4 py-2 rounded transition-colors ${
              showSignupForm
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => handleToggleForm('signin')}
            className={`px-4 py-2 rounded transition-colors ${
              !showSignupForm
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Sign In
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {authError}
          </div>
        )}

        <AnimatePresence mode="wait">
          {showSignupForm ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              key="signup-form"
            >
              <SignupForm 
                onSignupSuccess={(user) => handleAuthSuccess(user, true)}
                onError={setAuthError}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              key="signin-form"
            >
              <SigninForm 
                onSigninSuccess={handleAuthSuccess}
                onError={setAuthError}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthPage;