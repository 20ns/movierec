import React, { useState } from 'react';
import SignupForm from '../components/SignupForm';
import SigninForm from '../components/SigninForm'; // Corrected import path
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthPage = ({ onSignupSuccess, onSigninSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = searchParams.get('mode') === 'signup';
  const [showSignupForm, setShowSignupForm] = useState(initialMode);

  const handleToggleForm = (mode) => {
    setShowSignupForm(mode === 'signup');
    navigate(`/signin?mode=${mode}`); // Update URL to reflect current mode
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg">
        <div className="flex justify-around mb-4">
          <button
            onClick={() => handleToggleForm('signup')}
            className={`px-4 py-2 rounded ${showSignupForm ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Sign Up
          </button>
          <button
            onClick={() => handleToggleForm('signin')}
            className={`px-4 py-2 rounded ${!showSignupForm ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Sign In
          </button>
        </div>

        <AnimatePresence>
          {showSignupForm ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="signup-form"
            >
              <SignupForm onSignupSuccess={onSignupSuccess} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="signin-form"
            >
              <SigninForm onSigninSuccess={onSigninSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthPage;
