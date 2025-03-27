import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import SignupModal from './SignupForm';

const SignInModal = ({ onSigninSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle sign up button click
  const handleSignUpClick = () => {
    setShowSignUp(true);
    setIsOpen(false); // Close the sign in modal when opening sign up
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Normalize email to ensure consistent format
      const normalizedEmail = email.toLowerCase().trim();
      
      // Use Amplify Auth which handles SECRET_HASH automatically when configured
      const user = await Auth.signIn(normalizedEmail, password);
      console.log('Authentication successful');
      
      if (onSigninSuccess) {
        onSigninSuccess(user);
      }
      
      setIsOpen(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Sign-in error:', error);
      
      // Handle specific error cases
      if (error.code === 'UserNotConfirmedException') {
        setError('Please confirm your account by clicking the link in your email.');
      } else if (error.code === 'PasswordResetRequiredException') {
        setError('You need to reset your password.');
      } else if (error.code === 'NotAuthorizedException') {
        setError('Incorrect username or password.');
      } else if (error.code === 'UserNotFoundException') {
        setError('Account not found. Please sign up first.');
      } else {
        setError(error.message || 'An error occurred during sign in.');
      }
      
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-full"
      >
        Sign In
      </button>

      {isOpen && (
        <>
          <div
            className={`fixed inset-0 bg-black bg-opacity-80 transition-opacity duration-500 ease-in-out ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          ></div>

          <div
            className={`fixed inset-0 flex items-center justify-center transform transition-all duration-500 ease-in-out`}
          >
            <div
              className={`relative bg-gray-900 rounded-2xl shadow-lg w-full max-w-lg p-8 ${
                isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'
              }`}
            >
              <form onSubmit={handleSubmit}>
                <h2 className="text-3xl font-bold mb-6 text-white text-center">Sign In</h2>
                {error && (
                  <div className="bg-red-900 border border-red-400 text-red-100 px-4 py-3 rounded-md relative mb-6 transition-all duration-300 ease-in-out">
                    {error}
                  </div>
                )}

                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 border-b-2 border-gray-700 bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300 ease-in-out"
                    placeholder="Email"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="mb-8">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border-b-2 border-gray-700 bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300 ease-in-out"
                    placeholder="Password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-colors duration-300 ease-in-out"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 px-6 py-3 ${
                      isLoading 
                        ? 'bg-purple-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white font-semibold rounded-full transition-colors duration-300 ease-in-out`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>

                <div className="text-center mt-4 text-gray-300">
                  <span>Don't have an account?</span>{' '}
                  <button
                    type="button"
                    className="text-purple-400 hover:text-purple-300"
                    onClick={handleSignUpClick}
                    disabled={isLoading}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Render the SignupModal with the correct props */}
      <SignupModal 
        isOpen={showSignUp} 
        onClose={() => setShowSignUp(false)} 
        onSignupSuccess={onSigninSuccess}
      />
    </>
  );
};

export default SignInModal;