import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const GENRE_OPTIONS = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
];

const MOOD_OPTIONS = [
  { id: 'exciting', name: 'Exciting & Action-packed' },
  { id: 'thoughtful', name: 'Thoughtful & Profound' },
  { id: 'funny', name: 'Funny & Light-hearted' },
  { id: 'scary', name: 'Scary & Thrilling' },
  { id: 'emotional', name: 'Emotional & Moving' },
];

const ERA_OPTIONS = [
  { id: 'classic', name: 'Classic (Pre-1980)' },
  { id: 'modern', name: 'Modern (1980-2010)' },
  { id: 'recent', name: 'Recent (2010-Present)' },
];

const OnboardingQuestionnaire = ({ currentUser }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    favoriteGenres: [],
    contentType: 'both', // 'movies', 'tv', or 'both'
    moodPreferences: [],
    eraPreferences: [],
  });
  
  const updatePreference = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const toggleArrayItem = (field, item) => {
    setPreferences(prev => {
      const currentArray = prev[field];
      return {
        ...prev,
        [field]: currentArray.includes(item)
          ? currentArray.filter(i => i !== item)
          : [...currentArray, item]
      };
    });
  };

  const savePreferences = async () => {
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No authentication token available');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.signInUserSession.accessToken.jwtToken}`
          },
          body: JSON.stringify(preferences)
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
      
      // Save to local storage as backup and for immediate use
      localStorage.setItem('userPrefs', JSON.stringify(preferences));
      
      // Redirect to home page
      navigate('/');
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Still redirect to home, but show error notification
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };
  
  const skipOnboarding = () => {
    // Still save any partial preferences
    savePreferences();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full shadow-2xl"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Tell us what you like</h1>
          <p className="text-gray-300">
            Help us personalize your recommendations by answering a few questions
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-2 rounded-full flex-1 mx-1 ${
                i <= step ? 'bg-indigo-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        
        {/* Content based on current step */}
        <div className="min-h-[300px]">
          {/* Step 1: Favorite genres */}
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Which genres do you enjoy the most?
              </h2>
              <p className="text-gray-400 mb-4">Select as many as you like.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {GENRE_OPTIONS.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleArrayItem('favoriteGenres', genre.id)}
                    className={`py-2 px-4 rounded-lg transition-all duration-200 ${
                      preferences.favoriteGenres.includes(genre.id) 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Step 2: Content type preference */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Do you prefer movies or TV shows?
              </h2>
              <p className="text-gray-400 mb-4">We'll focus on what you enjoy.</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { id: 'movies', name: 'Movies' },
                  { id: 'tv', name: 'TV Shows' },
                  { id: 'both', name: 'Both Equally' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => updatePreference('contentType', option.id)}
                    className={`py-3 px-4 rounded-lg transition-all duration-200 ${
                      preferences.contentType === option.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Step 3: Mood preferences */}
          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                What kind of mood do you enjoy in content?
              </h2>
              <p className="text-gray-400 mb-4">Select all that apply.</p>
              
              <div className="flex flex-col gap-3 mb-6">
                {MOOD_OPTIONS.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => toggleArrayItem('moodPreferences', mood.id)}
                    className={`py-3 px-4 rounded-lg transition-all duration-200 text-left ${
                      preferences.moodPreferences.includes(mood.id) 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {mood.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Step 4: Era preferences */}
          {step === 4 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Which time periods do you enjoy?
              </h2>
              <p className="text-gray-400 mb-4">Select all that apply.</p>
              
              <div className="flex flex-col gap-3 mb-6">
                {ERA_OPTIONS.map(era => (
                  <button
                    key={era.id}
                    onClick={() => toggleArrayItem('eraPreferences', era.id)}
                    className={`py-3 px-4 rounded-lg transition-all duration-200 text-left ${
                      preferences.eraPreferences.includes(era.id) 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {era.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <div>
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                onClick={skipOnboarding}
                className="px-6 py-2 bg-transparent text-gray-400 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
          
          <div>
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors shadow-lg"
              >
                Next
              </button>
            ) : (
              <button
                onClick={savePreferences}
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingQuestionnaire;
