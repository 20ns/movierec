import React, { useState } from 'react';

const SignupModal = ({ isOpen, onClose, onSignupSuccess }) => {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!process.env.REACT_APP_API_GATEWAY_INVOKE_URL) {
        setError("API endpoint is not configured. Check your .env file.");
        return;
      }

      const endpoint = `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/signup`;
      
      console.log('Sending request to:', endpoint);
      console.log('Request payload:', {
        email: email.trim(),
        passwordLength: password.length
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (!response.ok) {
        // Handle specific error cases
        if (data.code === 'UsernameExistsException') {
          setError('This email is already registered');
        } else if (data.code === 'InvalidPasswordException') {
          setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
        } else if (data.code === 'InvalidParameterException') {
          setError('Please provide a valid email address');
        } else if (data.error) {
          setError(data.error);
        } else {
          setError('Signup failed. Please try again.');
        }
        return;
      }

      // Handle successful signup
      if (data.message && data.message.includes('verification')) {
        onSignupSuccess();
        alert('Please check your email for a verification code!');
        onClose();
      } else {
        onSignupSuccess();
        alert('Signup successful!');
        onClose();
      }

    } catch (err) {
      console.error('Signup error:', err);
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-opacity duration-500 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`fixed inset-0 bg-black bg-opacity-80 transition-opacity duration-500 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <div
        className={`relative bg-gray-900 rounded-2xl shadow-lg w-full max-w-lg p-8 transform transition-all duration-500 ease-in-out ${
          isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'
        }`}
      >
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
              placeholder="Password"
              required
              minLength="8"
              disabled={isLoading}
            />
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
      </div>
    </div>
  );
};

export default SignupModal;