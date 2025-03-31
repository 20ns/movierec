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

  const handleGenreChange = (genreId) => {
    setPreferences(prev => {
      const newGenres = prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId];
      return { ...prev, genres: newGenres };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Add questionnaireCompleted flag
      const dataToSubmit = {
        ...preferences,
        questionnaireCompleted: true
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (response.ok) {
        if (onComplete) onComplete();
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

  // Genre options (add more as needed)
  const genreOptions = [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
  ];

  return (
    <div className={`${isModal ? '' : 'container mx-auto px-4 py-8 max-w-4xl'}`}>
      {!isModal && (
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Let Us Get To Know Your Movie Taste
        </h1>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Favorite Genres Section */}
        <div className="mb-8">
          <h3 className="text-xl font-medium text-white mb-4">
            What genres do you enjoy watching?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {genreOptions.map(genre => (
              <div 
                key={genre.id}
                onClick={() => handleGenreChange(genre.id)}
                className={`px-4 py-3 rounded-lg cursor-pointer transition-all text-center ${
                  preferences.genres.includes(genre.id)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {genre.name}
              </div>
            ))}
          </div>
        </div>
        
        {/* Additional sections can be added here */}
        
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