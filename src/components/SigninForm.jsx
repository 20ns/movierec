import React, { useState } from 'react';
import SignupModal from './SignupForm';

const SignInModal = ({ onSigninSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const apiEndpoint = process.env.REACT_APP_API_GATEWAY_INVOKE_URL + '/signin';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signin failed');
      }

      const responseData = await response.json();
      onSigninSuccess(responseData.tokens);
      setIsOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative px-4 py-2 rounded-full text-white border-2 border-gray-100/50 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 transition-all duration-300 overflow-hidden hover:border-white"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-md z-[-1] transition-opacity duration-300 group-hover:opacity-30"></div>
        Sign In
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsOpen(false)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-semibold mb-4">Sign In</h2>
              {error && <div className="text-red-500 mb-4">{error}</div>}
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Username
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                >
                  Sign In
                </button>
              </div>

              <p className="mt-4 text-center">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowSignUp(true);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Sign Up
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      <SignupModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSignupSuccess={() => setShowSignUp(false)}
      />
    </>
  );
};

export default SignInModal;