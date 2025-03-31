import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { motion } from 'framer-motion';

function OnboardingQuestionnaire({ currentUser, onComplete, onSkip, isModal = false }) {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    genres: [],
    actors: [],
    directors: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        onComplete();
      } else {
        console.error(`HTTP error! Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className={`${isModal ? '' : 'container mx-auto px-4 py-8 max-w-4xl'}`}>
      {!isModal && (
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Let Us Get To Know Your Movie Taste
        </h1>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Form content */}
        {/* ...existing code... */}
        
        {/* Buttons area */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
          {/* Skip button - only visible if onSkip is provided */}
          {onSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Skip for now
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OnboardingQuestionnaire;