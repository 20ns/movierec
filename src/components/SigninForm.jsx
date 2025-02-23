import React, { useState } from 'react';
import SignupModal from './SignupForm';

const SignInModal = ({ onSigninSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('Attempting to sign in with:', {
      emailLength: email.length,
      passwordLength: password.length,
      apiUrl: process.env.REACT_APP_API_GATEWAY_INVOKE_URL + '/signin',
    });

    try {
      const apiEndpoint = process.env.REACT_APP_API_GATEWAY_INVOKE_URL + '/signin';
      console.log('Making request to:', apiEndpoint);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Signin failed');
        return;
      }

      const responseData = await response.json();
      onSigninSuccess(responseData.tokens, responseData.email);
      setIsOpen(false);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
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