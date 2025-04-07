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

const MODAL_STYLES = {
  width: "100%",
  maxWidth: "800px",
  minHeight: "600px",
  display: "flex",
  flexDirection: "column"
};

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
  const [authError, setAuthError] = useState(false);
  
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
    setError(null);
    setAuthError(false);
    
    // Enhanced authentication check
    if (!currentUser) {
      console.error('User not authenticated');
      setAuthError(true);
      setError('You need to be logged in to save preferences.');
      return;
    }
    
    if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
      console.error('No authentication token available');
      setAuthError(true);
      setError('Authentication token not available. Please try logging in again.');
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

  const handleSubmit = () => {
    savePreferences();
  };
  
  // Function to render the appropriate options based on the current step
  const renderQuestionOptions = (step) => {
    switch (step) {
      case 1:
        // Genre selection
        return GENRE_OPTIONS.map(genre => (
          <motion.button
            key={genre.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              preferences.favoriteGenres.includes(genre.id)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('favoriteGenres', genre.id)}
          >
            {genre.name}
          </motion.button>
        ));
        
      case 2:
        // Content type preference
        return (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg text-sm font-medium transition-colors col-span-2 md:col-span-1 ${
                preferences.contentType === 'movies'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => updatePreference('contentType', 'movies')}
            >
              Movies
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg text-sm font-medium transition-colors col-span-2 md:col-span-1 ${
                preferences.contentType === 'tv'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => updatePreference('contentType', 'tv')}
            >
              TV Shows
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg text-sm font-medium transition-colors col-span-2 md:col-span-1 ${
                preferences.contentType === 'both'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => updatePreference('contentType', 'both')}
            >
              Both
            </motion.button>
          </>
        );
        
      case 3:
        // Mood preferences
        return MOOD_OPTIONS.map(mood => (
          <motion.button
            key={mood.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              preferences.moodPreferences.includes(mood.id)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('moodPreferences', mood.id)}
          >
            {mood.name}
          </motion.button>
        ));
        
      case 4:
        // Era preferences
        return ERA_OPTIONS.map(era => (
          <motion.button
            key={era.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              preferences.eraPreferences.includes(era.id)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('eraPreferences', era.id)}
          >
            {era.name}
          </motion.button>
        ));
        
      case 5:
        // Language preferences
        return LANGUAGE_OPTIONS.map(language => (
          <motion.button
            key={language.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              preferences.languagePreferences.includes(language.id)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('languagePreferences', language.id)}
          >
            {language.name}
          </motion.button>
        ));
        
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="relative">
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-6">
          <div 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 h-1.5 rounded-full transition-all"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-md">
            <p>{error}</p>
            {authError && (
              <button 
                onClick={() => navigate('/login')} 
                className="mt-2 px-4 py-1 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm"
              >
                Go to Login
              </button>
            )}
          </div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mb-8"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">{getQuestionTitle(step)}</h3>
            <p className="text-sm sm:text-base text-gray-300 mb-6">{getQuestionDescription(step)}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {renderQuestionOptions(step)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between pt-6 border-t border-gray-700 mt-6">
        <div>
          {step > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={prevStep}
              className="px-4 py-2 text-sm sm:text-base text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back
            </motion.button>
          )}
        </div>
        
        <div className="flex space-x-2 sm:space-x-4">
          {step < totalSteps ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextStep}
              className={`px-4 py-2 text-sm sm:text-base text-white rounded-lg ${
                'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
              } transition-colors shadow-md`}
            >
              Next
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              className="px-5 py-2 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-md"
            >
              Finish
            </motion.button>
          )}
          
          {step > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={skipOnboarding}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
            >
              Skip for now
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

function getQuestionTitle(step) {
  switch (step) {
    case 1:
      return "What genres do you enjoy?";
    case 2:
      return "What type of content do you prefer?";
    case 3:
      return "What mood are you usually in for movies?";
    case 4:
      return "Do you have a preferred era?";
    case 5:
      return "Any language preferences?";
    default:
      return "Tell us your preferences";
  }
}

function getQuestionDescription(step) {
  switch (step) {
    case 1:
      return "Select your favorite genres.";
    case 2:
      return "Choose the type of content you prefer.";
    case 3:
      return "Pick the moods that match your movie preferences.";
    case 4:
      return "Select the eras you enjoy the most.";
    case 5:
      return "Choose your preferred languages.";
    default:
      return "";
  }
}

export default OnboardingQuestionnaire;
