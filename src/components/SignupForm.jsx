import React, { useState } from 'react';

const SignupModal = ({ isOpen, onClose, onSignupSuccess }) => {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Log the data being sent
    console.log('Sending signup data:', {
        email,
        passwordLength: password.length
    });

    try {
        const response = await fetch(
            `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/signup`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    password,
                    email: email.trim()
                }),
            }
        );

        const data = await response.json();
        console.log('Response data:', data); // Log the response

        if (!response.ok) {
            // Handle specific error codes from the backend
            if (data.code === 'EmailExists') {
                setError('Email is already registered');
            } else if (data.code === 'InvalidEmailLength') {
                setError(data.error);
            } else {
                setError(data.error || 'Signup failed');
            }
            return;
        }

        onSignupSuccess();
        alert('Signup successful! Please check your email.'); // Show this *after* success
        onClose();
    } catch (err) {
        console.error('Signup error details:', {
            message: err.message,
            stack: err.stack
        });
        setError(err.message);
    }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold mb-4">Sign Up</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {/* Removed username input */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                minLength="8"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;