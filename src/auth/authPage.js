import React, { useState } from 'react';
import SignupForm from '../components/SignupForm';
import SigninForm from '../components/SigninForm';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthPage = ({ onSignupSuccess, onSigninSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = searchParams.get('mode') === 'signup';
  const [showSignupForm, setShowSignupForm] = useState(initialMode);

  const handleToggleForm = (mode) => {
    setShowSignupForm(mode === 'signup');
    navigate(`/signin?mode=${mode}`);
  };

  return (
    <div className="min-h-screen pt-20 px-4 flex items-center justify-center"> {/* Added flexbox centering */}
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg"> {/* Added w-full */}
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

        <AnimatePresence mode="wait">
          {showSignupForm ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              key="signup-form"
            >
              <SignupForm onSignupSuccess={onSignupSuccess} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              key="signin-form"
            >
                {/*  No changes to how SigninForm is rendered!  */}
              <SigninForm onSigninSuccess={onSigninSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthPage;