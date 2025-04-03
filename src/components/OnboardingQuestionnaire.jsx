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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-75">
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden transition-all"
        style={MODAL_STYLES}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-800">
          <h2 className="text-xl font-bold text-white">
            {isUpdate ? 'Update Your Preferences' : 'Set Your Preferences'}
          </h2>
          {isModal && (
            <button 
              onClick={onSkip}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-800 h-2">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
        
        {/* Content area with fixed height */}
        <div className="flex-grow p-6 flex flex-col" style={{ minHeight: "400px" }}>
          {/* Question title */}
          <h3 className="text-2xl font-bold mb-6 text-white text-center">
            {getQuestionTitle(step)}
          </h3>
          
          {/* Options container with consistent height */}
          <div className="flex-grow flex flex-col justify-center">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 content-center">
              {/* The options will be rendered here based on the current step */}
              {renderQuestionOptions(step)}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </div>
        
        {/* Footer with navigation buttons */}
        <div className="p-5 border-t border-gray-700 bg-gray-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Skip
            </button>
          )}
          
          <div className="text-sm text-gray-400">
            Step {step} of {totalSteps}
          </div>
          
          <button
            onClick={step === totalSteps ? handleSubmit : () => setStep(step + 1)}
            disabled={isSubmitting}
            className={`px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 
                         hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg
                         disabled:opacity-50 flex items-center`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              step === totalSteps ? 'Finish' : 'Next'
            )}
          </button>
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

export default OnboardingQuestionnaire;
