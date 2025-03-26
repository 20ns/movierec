import React, { useState } from 'react';
import SignupModal from './SignupForm';
import { Auth } from '@aws-amplify/auth';
import { createHmac } from 'crypto-browserify';
import { Buffer } from 'buffer';

const SignInModal = ({ onSigninSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  // Add these constants at the top (replace with your actual values)
  const generateSecretHash = async (username) => {
    const message = username + CLIENT_ID;
    const messageBuffer = Buffer.from(message);
    const keyBuffer = Buffer.from(CLIENT_SECRET);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(messageBuffer);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyBuffer),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    return Buffer.from(signature).toString('base64');
  };
  const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const CLIENT_SECRET = process.env.REACT_APP_COGNITO_CLIENT_SECRET;
  

  
  const calculateSecretHash = (username) => {
    const message = username + CLIENT_ID;
    const hmac = createHmac('sha256', CLIENT_SECRET);
    hmac.update(message);
    return hmac.digest('base64');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const user = await Auth.signIn(email, password); // Change this line
      console.log('Sign in successful:', user);
      onSigninSuccess(user);
      setIsOpen(false);
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message || 'Authentication failed');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative px-6 py-3 rounded-full text-white border-2 border-purple-500 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 transition-all duration-500 ease-in-out overflow-hidden hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/50"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 opacity-30 blur-lg z-[-1] transition-opacity duration-500 ease-in-out group-hover:opacity-50"></div>
        Sign In
      </button>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-opacity duration-500 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Modal Overlay */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-80 transition-opacity duration-500 ease-in-out ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        ></div>

        {/* Modal Content */}
        <div
          className={`relative bg-gray-900 rounded-2xl shadow-lg w-full max-w-lg p-8 transform transition-all duration-500 ease-in-out ${
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
                />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full transition-colors duration-300 ease-in-out"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors duration-300 ease-in-out"
              >
                Sign In
              </button>
            </div>

            <p className="mt-8 text-center text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowSignUp(true);
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-300 ease-in-out"
              >
                Sign Up
              </button>
            </p>
          </form>
        </div>
      </div>

      <SignupModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSignupSuccess={() => {
          setShowSignUp(false);
          setIsOpen(true);
        }}
      />
    </>
  );
};

export default SignInModal;