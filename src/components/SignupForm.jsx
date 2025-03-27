import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import crypto from 'crypto-browserify';

const SignupModal = ({ isOpen, onClose, onSignupSuccess }) => {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      // Normalize email to ensure consistent format
      const normalizedEmail = email.toLowerCase().trim();
      
      // Removed secretHash references
      const { user } = await Auth.signUp({
        username: normalizedEmail,
        password,
        attributes: {
          email: normalizedEmail
        }
      });
  
      console.log('Signed up user successfully');
      setConfirmPhase(true); // Switch to confirmation code phase
      setIsLoading(false);
    } catch (error) {
      console.error('Sign up error:', error);
      
      // Better error handling with specific messages
      if (error.code === 'UsernameExistsException') {
        setError('This email is already registered. Please sign in instead.');
      } else if (error.code === 'InvalidPasswordException') {
        setError('Password does not meet requirements: ' + error.message);
      } else if (error.code === 'InvalidParameterException') {
        setError('Invalid input: ' + error.message);
      } else {
        setError(error.message || 'Sign up failed. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const handleConfirmation = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Normalize email to ensure consistent format
      const normalizedEmail = email.toLowerCase().trim();
      
      // Removed secretHash references
      await Auth.confirmSignUp(normalizedEmail, confirmationCode);
      console.log('Email verified successfully');
      
      // Automatically sign in after successful confirmation
      try {
        // Removed secretHash references
        const user = await Auth.signIn(normalizedEmail, password);
        
        console.log('Signed in after confirmation');
        
        if (onSignupSuccess) {
          onSignupSuccess(user);
        }
        
        onClose();
      } catch (signInError) {
        console.error('Auto sign-in error:', signInError);
        alert('Account confirmed! Please sign in manually.');
        onClose();
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      
      if (error.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please try again.');
      } else if (error.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const resendConfirmationCode = async () => {
    setError('');
    try {
      const normalizedEmail = email.toLowerCase().trim();
      // Removed secretHash references
      await Auth.resendSignUp(normalizedEmail);
      alert('A new confirmation code has been sent to your email');
    } catch (error) {
      console.error('Error resending code:', error);
      setError('Failed to resend code: ' + error.message);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-80 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <div className="relative bg-gray-900 rounded-2xl shadow-lg w-full max-w-lg p-8 transform transition-all duration-300 scale-100">
        {!confirmPhase ? (
          <form onSubmit={handleSubmit}>
            <h2 className="text-3xl font-bold mb-6 text-white text-center">Sign Up</h2>
            
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
                placeholder="Password (min. 8 characters)"
                required
                minLength="8"
                disabled={isLoading}
              />
              <p className="text-gray-400 text-sm mt-2">
                Password must have at least 8 characters including uppercase, lowercase, number and special character.
              </p>
            </div>

            <div className="flex items-center justify-between space-x-4">
              <button
                type="button"
                onClick={onClose}
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
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmation}>
            <h2 className="text-3xl font-bold mb-6 text-white text-center">Verify Email</h2>
            
            {error && (
              <div className="bg-red-900 border border-red-400 text-red-100 px-4 py-3 rounded-md relative mb-6">
                {error}
              </div>
            )}

            <p className="text-gray-300 mb-6 text-center">
              We've sent a verification code to {email}.
              Please check your inbox and enter the code below.
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="block w-full px-4 py-3 border-b-2 border-gray-700 bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-500"
                placeholder="Verification Code"
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <button
                type="button"
                onClick={resendConfirmationCode}
                className="text-purple-400 hover:text-purple-300 text-sm"
                disabled={isLoading}
              >
                Resend Code
              </button>
              
              <button
                type="submit"
                className={`px-6 py-3 ${
                  isLoading 
                    ? 'bg-purple-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white font-semibold rounded-full transition-colors duration-300 ease-in-out`}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignupModal;