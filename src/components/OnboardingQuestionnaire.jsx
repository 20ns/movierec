import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Enhanced genre options with better organization
const GENRE_OPTIONS = [
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
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' }
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

// New options for language preference
const LANGUAGE_OPTIONS = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Spanish' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'hi', name: 'Hindi' },
  { id: 'ja', name: 'Japanese' },
  { id: 'ko', name: 'Korean' },
  { id: 'zh', name: 'Chinese' },
  { id: 'any', name: 'Any Language (with subtitles)' }
];

// New options for runtime preference
const RUNTIME_OPTIONS = [
  { id: 'short', name: 'Short (under 90 min)' },
  { id: 'medium', name: 'Medium (90-120 min)' },
  { id: 'long', name: 'Long (over 120 min)' },
  { id: 'any', name: 'Any Length' }
];

const OnboardingQuestionnaire = ({ 
  currentUser, 
  onComplete, 
  onSkip, 
  isModal = false,
  existingPreferences = null,
  isUpdate = false
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalSteps, setTotalSteps] = useState(5); // Dynamic total steps based on user type
  
  // Initialize preferences with existing data if available
  const [preferences, setPreferences] = useState({
    favoriteGenres: [],
    contentType: 'both',
    moodPreferences: [],
    eraPreferences: [],
    languagePreferences: [],
    runtimePreference: 'any',
    questionnaireCompleted: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load existing preferences if available
  useEffect(() => {
    if (existingPreferences) {
      setPreferences(prev => ({
        ...prev,
        ...existingPreferences,
        questionnaireCompleted: true
      }));
      
      // Set fewer steps for returning users to reduce friction
      if (isUpdate) {
        setTotalSteps(4);
      }
    }
  }, [existingPreferences, isUpdate]);
  
  const updatePreference = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const toggleArrayItem = (field, item) => {
    setPreferences(prev => {
      const currentArray = prev[field] || [];
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
      // Get the token from the current user session
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      
      // Use the current preferences from state
      const preferencesData = {
        ...preferences,
        questionnaireCompleted: true
      };
      
      console.log('Sending preferences data:', preferencesData);
      
      // Save preferences to localStorage
      localStorage.setItem(`userPrefs_${currentUser.attributes.sub}`, JSON.stringify(preferencesData));
      
      // Send to API
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencesData),
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Mark questionnaire as completed
      localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, 'true');
      
      // Call onComplete to notify parent component
      if (onComplete) onComplete();
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      savePreferences();
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };
  
  const skipOnboarding = () => {
    if (onSkip) onSkip();
  };

  return (
    <div className={`bg-gray-900 text-white rounded-lg shadow-xl ${isModal ? 'p-6' : 'p-8 max-w-3xl mx-auto mt-8 mb-20'}`}>
      {/* Header area with title and close button if it's a modal */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isUpdate ? 'Update Your Preferences' : 'Personalize Your Experience'}
        </h1>
        {isModal && (
          <button 
            onClick={skipOnboarding}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="h-1 w-full bg-gray-700 rounded-full">
          <div 
            className="h-1 bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
        <div className="text-right text-sm text-gray-400 mt-2">
          Step {step} of {totalSteps}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}
      
      {/* Questionnaire steps */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {/* Step 1: Genre preferences */}
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                What genres do you enjoy?
              </h2>
              <p className="text-gray-400 mb-4">Select all that interest you.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {GENRE_OPTIONS.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleArrayItem('favoriteGenres', genre.id)}
                    className={`py-3 px-4 rounded-lg transition-all duration-200 ${
                      preferences.favoriteGenres?.includes(genre.id) 
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
              <p className="text-gray-400 mb-4">We'll focus on what you enjoy most.</p>
              
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
                      preferences.moodPreferences?.includes(mood.id) 
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
                Which time periods do you prefer?
              </h2>
              <p className="text-gray-400 mb-4">Select all that apply.</p>
              
              <div className="flex flex-col gap-3 mb-6">
                {ERA_OPTIONS.map(era => (
                  <button
                    key={era.id}
                    onClick={() => toggleArrayItem('eraPreferences', era.id)}
                    className={`py-3 px-4 rounded-lg transition-all duration-200 text-left ${
                      preferences.eraPreferences?.includes(era.id) 
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
          
          {/* Step 5: Language preferences (new) */}
          {step === 5 && !isUpdate && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Do you have language preferences?
              </h2>
              <p className="text-gray-400 mb-4">Select all that you're comfortable with.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {LANGUAGE_OPTIONS.map(language => (
                  <button
                    key={language.id}
                    onClick={() => toggleArrayItem('languagePreferences', language.id)}
                    className={`py-3 px-4 rounded-lg transition-all duration-200 text-center ${
                      preferences.languagePreferences?.includes(language.id) 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {language.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          ) : isModal && (
            <button
              onClick={skipOnboarding}
              className="px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
        <button
          onClick={nextStep}
          disabled={isLoading}
          className={`px-6 py-2 rounded-full transition-colors ${
            isLoading 
              ? 'bg-indigo-800 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white min-w-[100px]`}
        >
          {isLoading ? (
            <span className="inline-block animate-pulse">Processing...</span>
          ) : step === totalSteps ? (
            isUpdate ? 'Update' : 'Finish'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingQuestionnaire;
