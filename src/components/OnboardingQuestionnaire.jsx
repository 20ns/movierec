import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Enhanced genre options
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
  { id: 37, name: 'Western' },
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

const LANGUAGE_OPTIONS = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Spanish' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'hi', name: 'Hindi' },
  { id: 'ja', name: 'Japanese' },
  { id: 'ko', name: 'Korean' },
  { id: 'zh', name: 'Chinese' },
  { id: 'any', name: 'Any Language' },
];

const RUNTIME_OPTIONS = [
  { id: 'short', name: 'Short (under 90 min)' },
  { id: 'medium', name: 'Medium (90-120 min)' },
  { id: 'long', name: 'Long (over 120 min)' },
  { id: 'any', name: 'Any Length' },
];

const ACTOR_DIRECTOR_OPTIONS = [
  { id: 'actor', name: 'Favorite Actor(s)' },
  { id: 'director', name: 'Favorite Director(s)' },
];

const OnboardingQuestionnaire = ({
  currentUser,
  onComplete,
  onSkip,
  isModal = false,
  onClose = () => {},
  existingPreferences = null,
  isUpdate = false,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(6); // Added actor/director step
  const [preferences, setPreferences] = useState({
    favoriteGenres: [],
    contentType: 'both',
    moodPreferences: [],
    eraPreferences: [],
    languagePreferences: [],
    runtimePreference: 'any',
    favoritePeople: { actors: [], directors: [] }, // New field
    questionnaireCompleted: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [peopleInput, setPeopleInput] = useState({ actor: '', director: '' });

  useEffect(() => {
    if (existingPreferences) {
      setPreferences((prev) => ({
        ...prev,
        ...existingPreferences,
        favoritePeople: existingPreferences.favoritePeople || { actors: [], directors: [] },
      }));
    }
  }, [existingPreferences]);

  const updatePreference = (field, value) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setPreferences((prev) => {
      const array = prev[field] || [];
      return {
        ...prev,
        [field]: array.includes(item) ? array.filter((i) => i !== item) : [...array, item],
      };
    });
  };

  const addPerson = (type) => {
    if (peopleInput[type] && !preferences.favoritePeople[type + 's'].includes(peopleInput[type])) {
      setPreferences((prev) => ({
        ...prev,
        favoritePeople: {
          ...prev.favoritePeople,
          [type + 's']: [...prev.favoritePeople[type + 's'], peopleInput[type]],
        },
      }));
      setPeopleInput((prev) => ({ ...prev, [type]: '' }));
    }
  };

  const savePreferences = async () => {
    if (!currentUser || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setAuthError(true);
      setError('Please log in to save preferences.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) throw new Error('Failed to save preferences');
      localStorage.setItem(`userPrefs_${currentUser.attributes.sub}`, JSON.stringify(preferences));
      localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, 'true');

      if (onComplete) onComplete();
    } catch (error) {
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < totalSteps) setStep((prev) => prev + 1);
    else savePreferences();
  };

  const prevStep = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  const skipOnboarding = () => {
    if (onSkip) onSkip();
  };

  const renderQuestionOptions = (step) => {
    switch (step) {
      case 1:
        return GENRE_OPTIONS.map((genre) => (
          <motion.button
            key={genre.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              preferences.favoriteGenres.includes(genre.id) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('favoriteGenres', genre.id)}
          >
            {genre.name}
          </motion.button>
        ));
      case 2:
        return (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg text-sm font-medium ${preferences.contentType === 'movies' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => updatePreference('contentType', 'movies')}
            >
              Movies
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg text-sm font-medium ${preferences.contentType === 'tv' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => updatePreference('contentType', 'tv')}
            >
              TV Shows
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-lg text-sm font-medium ${preferences.contentType === 'both' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => updatePreference('contentType', 'both')}
            >
              Both
            </motion.button>
          </>
        );
      case 3:
        return MOOD_OPTIONS.map((mood) => (
          <motion.button
            key={mood.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              preferences.moodPreferences.includes(mood.id) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('moodPreferences', mood.id)}
          >
            {mood.name}
          </motion.button>
        ));
      case 4:
        return ERA_OPTIONS.map((era) => (
          <motion.button
            key={era.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              preferences.eraPreferences.includes(era.id) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('eraPreferences', era.id)}
          >
            {era.name}
          </motion.button>
        ));
      case 5:
        return LANGUAGE_OPTIONS.map((language) => (
          <motion.button
            key={language.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              preferences.languagePreferences.includes(language.id) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => toggleArrayItem('languagePreferences', language.id)}
          >
            {language.name}
          </motion.button>
        ));
      case 6:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-white mb-2 block">Favorite Actors</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={peopleInput.actor}
                  onChange={(e) => setPeopleInput((prev) => ({ ...prev, actor: e.target.value }))}
                  className="p-2 rounded-lg bg-gray-800 text-white w-full"
                  placeholder="e.g., Tom Hanks"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addPerson('actor')}
                  className="p-2 bg-purple-600 text-white rounded-lg"
                >
                  Add
                </motion.button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preferences.favoritePeople.actors.map((actor) => (
                  <span key={actor} className="bg-gray-700 text-white px-2 py-1 rounded-full text-sm">
                    {actor}
                    <button
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          favoritePeople: { ...prev.favoritePeople, actors: prev.favoritePeople.actors.filter((a) => a !== actor) },
                        }))
                      }
                      className="ml-1 text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white mb-2 block">Favorite Directors</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={peopleInput.director}
                  onChange={(e) => setPeopleInput((prev) => ({ ...prev, director: e.target.value }))}
                  className="p-2 rounded-lg bg-gray-800 text-white w-full"
                  placeholder="e.g., Christopher Nolan"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addPerson('director')}
                  className="p-2 bg-purple-600 text-white rounded-lg"
                >
                  Add
                </motion.button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preferences.favoritePeople.directors.map((director) => (
                  <span key={director} className="bg-gray-700 text-white px-2 py-1 rounded-full text-sm">
                    {director}
                    <button
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          favoritePeople: { ...prev.favoritePeople, directors: prev.favoritePeople.directors.filter((d) => d !== director) },
                        }))
                      }
                      className="ml-1 text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="relative">
        {/* Add close button when in modal mode */}
        {isModal && (
          <button
            onClick={onClose}
            className="absolute right-0 top-0 p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}

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
              <button onClick={() => navigate('/login')} className="mt-2 px-4 py-1 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm">
                Go to Login
              </button>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">{getQuestionTitle(step)}</h3>
            <p className="text-sm sm:text-base text-gray-300 mb-6">{getQuestionDescription(step)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">{renderQuestionOptions(step)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-700 mt-6">
        <div>
          {step > 1 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={prevStep}
              className="px-4 py-2 text-sm sm:text-base text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg"
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
              className="px-4 py-2 text-sm sm:text-base text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg"
            >
              Next
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={savePreferences}
              disabled={isSubmitting}
              className={`px-5 py-2 text-sm sm:text-base text-white rounded-lg ${isSubmitting ? 'bg-gray-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'}`}
            >
              {isSubmitting ? 'Saving...' : 'Finish'}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={skipOnboarding}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
          >
            Skip for now
          </motion.button>
        </div>
      </div>
    </div>
  );
};

function getQuestionTitle(step) {
  switch (step) {
    case 1: return "What genres do you enjoy?";
    case 2: return "What type of content do you prefer?";
    case 3: return "What mood are you usually in?";
    case 4: return "Do you have a preferred era?";
    case 5: return "Any language preferences?";
    case 6: return "Who are your favorite actors or directors?";
    default: return "Tell us your preferences";
  }
}

function getQuestionDescription(step) {
  switch (step) {
    case 1: return "Select all genres you love.";
    case 2: return "Choose movies, TV shows, or both.";
    case 3: return "Pick moods that match your taste.";
    case 4: return "Select eras you enjoy.";
    case 5: return "Choose languages you prefer.";
    case 6: return "Add your favorite actors and directors.";
    default: return "";
  }
}

export default OnboardingQuestionnaire;