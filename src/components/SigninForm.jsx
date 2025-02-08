import React, { useState } from 'react';

const SigninForm = ({ onSigninSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const apiEndpoint = process.env.REACT_APP_API_GATEWAY_INVOKE_URL + '/signin';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signin failed');
      }

      const responseData = await response.json();
      onSigninSuccess(responseData.tokens);
      // alert('Signin successful!');  <-- REMOVE THIS
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen bg-black"> {/* KEY CHANGE: Add dark background, consistent with main app */}
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-8 border border-gray-700 rounded mt-20 bg-gray-900">  {/*Added margin top, dark background, border */}
        <h2 className="text-2xl font-semibold mb-6 text-white">Sign In</h2> {/* Larger font, white text */}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="mb-6">
          <label htmlFor="username" className="block text-gray-300 text-sm font-bold mb-2">Username:</label> {/* Lighter text */}
          <input
            type="text"
            id="username"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800 bg-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"  //Added Focuse
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder='Enter Username'
          />
        </div>
        <div className="mb-8"> {/* Increased bottom margin */}
          <label htmlFor="password" className="block text-gray-300 text-sm font-bold mb-2">Password:</label> {/* Lighter text */}
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800 bg-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" //Added Focuse
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder='Enter Password'
          />
        </div>
        <div className="flex items-center justify-center">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"  //Correct style applied here
          >
            Submit
          </button>
        </div>
      </form>
      {/* REMOVE THIS DUPLICATE BUTTON */}
      {/* <button
        type="button"
        onClick={handleSubmit}
        className="absolute top-4 right-4 bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Sign In
      </button> */}
    </div>
  );
};

export default SigninForm;