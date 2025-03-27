import React, { useState } from 'react';
import SignupModal from './SignupForm';
import awsconfig from '../aws-config.js';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { createHmac } from 'crypto-browserify';
import { Buffer } from 'buffer';

const SignInModal = ({ onSigninSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get the client secret from environment variables
  const CLIENT_SECRET = process.env.REACT_APP_COGNITO_CLIENT_SECRET;
  console.log('Secret:', CLIENT_SECRET);

  // Improved secret hash calculation function
  const calculateSecretHash = (username) => {
    try {
      if (!CLIENT_SECRET) {
        console.error('Client secret is missing');
        return '';
      }
      
      const clientId = awsconfig.Auth.userPoolWebClientId;
      const message = username + clientId;
      
      // Create HMAC with sha256
      const hmac = createHmac('sha256', CLIENT_SECRET);
      hmac.update(message);
      
      // Get base64 encoded hash
      return hmac.digest('base64');
    } catch (error) {
      console.error('Error calculating secret hash:', error);
      return '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const poolData = {
        UserPoolId: awsconfig.Auth.userPoolId,
        ClientId: awsconfig.Auth.userPoolWebClientId,
      };
      const userPool = new CognitoUserPool(poolData);
      
      // Calculate the secret hash
      const secretHash = calculateSecretHash(email);
      console.log('Using client ID:', awsconfig.Auth.userPoolWebClientId);
      console.log('Generated hash for authentication');
      
      const userData = {
        Username: email,
        Pool: userPool,
      };
      
      // Create authentication details with secret hash
      const authenticationData = {
        Username: email,
        Password: password,
      };
      
      // Only add SecretHash if we have one
      if (secretHash) {
        authenticationData.SecretHash = secretHash;
      } else {
        console.warn('No secret hash was generated');
      }
      
      const authDetails = new AuthenticationDetails(authenticationData);
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          console.log('Authentication successful');
          if (onSigninSuccess) onSigninSuccess(result);
          setIsOpen(false);
          setIsLoading(false);
        },
        onFailure: (err) => {
          console.error('Sign-in error:', err);
          setError(err.message || 'Sign-in failed.');
          setIsLoading(false);
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          console.log('New password required');
          setError('You need to change your password. Please contact support.');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Unexpected error during authentication:', error);
      setError('An unexpected error occurred. Please try again.');
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
                    onClick={() => setShowSignUp(true)}
                    disabled={isLoading}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            </div>
          </div>

          {showSignUp && <SignupModal onClose={() => setShowSignUp(false)} />}
        </>
      )}
    </>
  );
};

export default SignInModal;