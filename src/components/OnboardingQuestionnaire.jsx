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

// Advanced detailed question options
const SUBGENRE_OPTIONS = [
  { id: 'superhero', name: 'Superhero' },
  { id: 'spy', name: 'Spy/Espionage' },
  { id: 'disaster', name: 'Disaster' },
  { id: 'dystopian', name: 'Dystopian' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'biographical', name: 'Biographical' },
  { id: 'psychological', name: 'Psychological' },
  { id: 'satire', name: 'Satire' },
  { id: 'slasher', name: 'Slasher' },
  { id: 'noir', name: 'Film Noir' },
  { id: 'comingofage', name: 'Coming of Age' },
  { id:  'historical', name: 'Historical Fiction' },
];

const AESTHETIC_OPTIONS = [
  { id: 'visuallyStunning', name: 'Visually Stunning' },
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'colorful', name: 'Colorful/Vibrant' },
  { id: 'darkMoody', name: 'Dark & Moody' },
  { id: 'retro', name: 'Retro Style' },
  { id: 'experimental', name: 'Experimental' },
];

const STORY_STRUCTURE_OPTIONS = [
  { id: 'linear', name: 'Linear Storytelling' },
  { id: 'nonlinear', name: 'Non-linear/Time Jumps' },
  { id: 'anthology', name: 'Anthology/Multiple Stories' },
  { id: 'openEnded', name: 'Open-ended' },
  { id: 'twist', name: 'Surprise Endings' },
];

const CHARACTER_OPTIONS = [
  { id: 'complexProtagonist', name: 'Complex Protagonists' },
  { id: 'strongFemale', name: 'Strong Female Characters' },
  { id: 'antiHero', name: 'Anti-heroes' },
  { id: 'ensemble', name: 'Ensemble Casts' },
  { id: 'character-driven', name: 'Character-driven Stories' },
];

const MATURITY_OPTIONS = [
  { id: 'family', name: 'Family-friendly' },
  { id: 'teen', name: 'Teen-oriented' },
  { id: 'mature', name: 'Mature Content' },
  { id: 'graphic', name: 'Graphic/Intense' },
];

const PLOT_COMPLEXITY_OPTIONS = [
  { id: 'simple', name: 'Simple & Straightforward' },
  { id: 'moderate', name: 'Moderately Complex' },
  { id: 'intricate', name: 'Intricate & Layered' },
  { id: 'puzzle', name: 'Puzzle-like/Mystery' },
];

const MUSIC_SOUND_OPTIONS = [
  { id: 'greatScore', name: 'Great Musical Score' },
  { id: 'immersiveSound', name: 'Immersive Sound Design' },
  { id: 'musical', name: 'Musical Elements' },
  { id: 'iconicSoundtrack', name: 'Iconic Soundtrack' },
];

const CULTURAL_SETTING_OPTIONS = [
  { id: 'american', name: 'American' },
  { id: 'european', name: 'European' },
  { id: 'asian', name: 'Asian' },
  { id: 'latinAmerican', name: 'Latin American' },
  { id: 'middleEastern', name: 'Middle Eastern' },
  { id: 'african', name: 'African' },
  { id: 'international', name: 'International/Global' },
];

const ADAPTATION_OPTIONS = [
  { id: 'bookAdaptation', name: 'Book Adaptations' },
  { id: 'comicAdaptation', name: 'Comic/Graphic Novel Adaptations' },
  { id: 'remake', name: 'Remakes/Reboots' },
  { id: 'original', name: 'Original Stories' },
  { id: 'trueStory', name: 'Based on True Stories' },
];

const CRITICAL_ACCLAIM_OPTIONS = [
  { id: 'awardWinning', name: 'Award-winning Films/Shows' },
  { id: 'criticallyAcclaimed', name: 'Critically Acclaimed' },
  { id: 'cultClassic', name: 'Cult Classics' },
  { id: 'underrated', name: 'Underrated Gems' },
  { id: 'blockbuster', name: 'Popular Blockbusters' },
];

const ACTING_STYLE_OPTIONS = [
  { id: 'method', name: 'Method Acting/Intense Performances' },
  { id: 'naturalistic', name: 'Naturalistic/Understated' },
  { id: 'theatrical', name: 'Theatrical/Stylized' },
  { id: 'comedic', name: 'Strong Comedic Performances' },
  { id: 'chemistry', name: 'Great Cast Chemistry' },
];

const PACING_OPTIONS = [
  { id: 'fast', name: 'Fast-paced' },
  { id: 'moderate', name: 'Moderate Pacing' },
  { id: 'slow', name: 'Slow & Deliberate' },
  { id: 'atmospheric', name: 'Atmospheric/Mood-driven' },
];

const PREDICTABILITY_OPTIONS = [
  { id: 'unpredictable', name: 'Unpredictable/Surprising' },
  { id: 'comforting', name: 'Familiar/Comforting' },
  { id: 'clever', name: 'Clever/Thought-provoking' },
  { id: 'twist', name: 'Plot Twists' },
];

const EFFECTS_OPTIONS = [
  { id: 'specialEffects', name: 'Special Effects Heavy' },
  { id: 'practical', name: 'Practical Effects/Stunts' },
  { id: 'visuallyImpressive', name: 'Visually Impressive' },
  { id: 'minimalistEffects', name: 'Minimal Effects/Realistic' },
];

const STORYTELLING_STYLE_OPTIONS = [
  { id: 'dialogue', name: 'Dialogue-driven' },
  { id: 'action', name: 'Action-driven' },
  { id: 'visualStorytelling', name: 'Visual Storytelling' },
  { id: 'narration', name: 'Voiceover/Narration' },
];

const PRODUCTION_SCALE_OPTIONS = [
  { id: 'blockbuster', name: 'Big-budget Studio Films' },
  { id: 'independent', name: 'Independent Films' },
  { id: 'lowBudget', name: 'Low-budget Indie' },
  { id: 'foreign', name: 'Foreign Productions' },
];

const CONTENT_CHALLENGE_OPTIONS = [
  { id: 'comfortWatch', name: 'Comfort Viewing' },
  { id: 'challenging', name: 'Challenging Content' },
  { id: 'thoughtProvoking', name: 'Thought-provoking' },
  { id: 'educational', name: 'Educational/Informative' },
];

const REWATCHABILITY_OPTIONS = [
  { id: 'highRewatch', name: 'High Rewatchability' },
  { id: 'oneTime', name: 'One-time Viewing Experience' },
  { id: 'deeperEachTime', name: 'Gets Better with Rewatches' },
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
  onPreferencesUpdated = null, // Prop to handle preference updates
  skipBasicQuestions = false, // New prop to control whether to skip basic questions
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [initialQuestionsCompleted, setInitialQuestionsCompleted] = useState(false);
  const [showDetailedQuestions, setShowDetailedQuestions] = useState(false);
  const [coreSteps] = useState(5); // First 5 core questions
  const [totalSteps, setTotalSteps] = useState(5); // Will be updated if user chooses to continue
  
  const [preferences, setPreferences] = useState({
    // Core preferences
    favoriteGenres: [],
    contentType: 'both',
    moodPreferences: [],
    eraPreferences: [],
    languagePreferences: [],
    runtimePreference: 'any',
    favoritePeople: { actors: [], directors: [] },
    
    // Detailed preferences
    subgenrePreferences: [],
    aestheticPreferences: [],
    storyStructurePreferences: [],
    characterPreferences: [],
    maturityPreference: [],
    plotComplexityPreference: [],
    musicSoundPreferences: [],
    culturalSettingPreferences: [],
    adaptationPreferences: [],
    criticalAcclaimPreferences: [],
    actingStylePreferences: [],
    pacingPreferences: [],
    predictabilityPreferences: [],
    effectsPreferences: [],
    storytellingStylePreferences: [],
    productionScalePreferences: [],
    contentChallengePreferences: [],
    rewatchabilityPreferences: [],
    
    // Completion flags
    questionnaireCompleted: false, // Changed to false initially
    detailedQuestionsCompleted: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [peopleInput, setPeopleInput] = useState({ actor: '', director: '' });

  // Map step number to the corresponding detailed question field
  const stepToDetailedPreferenceField = (detailedStep) => {
    const fields = [
      'subgenrePreferences',
      'aestheticPreferences', 
      'storyStructurePreferences',
      'characterPreferences',
      'maturityPreference',
      'plotComplexityPreference',
      'musicSoundPreferences',
      'culturalSettingPreferences',
      'adaptationPreferences',
      'criticalAcclaimPreferences',
      'actingStylePreferences',
      'pacingPreferences',
      'predictabilityPreferences',
      'effectsPreferences',
      'storytellingStylePreferences',
      'productionScalePreferences',
      'contentChallengePreferences',
      'rewatchabilityPreferences',
      'favoritePeople', // Keep this last for actors/directors
    ];
    
    return fields[detailedStep - 1];
  };
  useEffect(() => {
    if (existingPreferences) {
      setPreferences((prev) => ({
        ...prev,
        ...existingPreferences,
        favoritePeople: existingPreferences.favoritePeople || { actors: [], directors: [] },
      }));
      
      // If this is a new user (no preferences), start with the first 5 questions
      if (!existingPreferences.questionnaireCompleted && !existingPreferences.detailedQuestionsCompleted) {
        // New user - start with the first question
        setStep(1);
        setInitialQuestionsCompleted(false);
        setShowDetailedQuestions(false);
        setTotalSteps(coreSteps);
      }
      // If user has completed basic questions but not detailed ones, and we want to skip to detailed
      else if (skipBasicQuestions && existingPreferences.questionnaireCompleted && !existingPreferences.detailedQuestionsCompleted) {
        setShowDetailedQuestions(true);
        setTotalSteps(coreSteps + 19);
        setStep(coreSteps + 1); // Skip directly to first detailed question
        setInitialQuestionsCompleted(true);
      } 
      // If user has already completed detailed questions
      else if (existingPreferences.detailedQuestionsCompleted) {
        setShowDetailedQuestions(true);
        setTotalSteps(coreSteps + 19);
        setStep(coreSteps); // Resume at the question asking if they want to continue
        setInitialQuestionsCompleted(true);
      } 
      // If user has completed basic questions but not detailed
      else if (existingPreferences.questionnaireCompleted) {
        setInitialQuestionsCompleted(true);
        setStep(coreSteps); // Show the prompt asking if they want more questions
      }
    } else {
      // Completely new user with no preference data at all
      setStep(1);
      setTotalSteps(coreSteps);
      setInitialQuestionsCompleted(false);
      setShowDetailedQuestions(false);
    }
  }, [existingPreferences, coreSteps, skipBasicQuestions]);

  const updatePreference = (field, value) => {
    setPreferences((prev) => {
      const newPreferences = { ...prev, [field]: value };
      // Auto-save preferences when a question is answered and trigger recalculation
      if (currentUser) {
        savePreferences(true, newPreferences);
      }
      return newPreferences;
    });
  };

  const toggleArrayItem = (field, item) => {
    setPreferences((prev) => {
      const array = prev[field] || [];
      const newPreferences = {
        ...prev,
        [field]: array.includes(item) ? array.filter((i) => i !== item) : [...array, item],
      };
      
      // Auto-save preferences when a question is answered and trigger recalculation
      if (currentUser) {
        savePreferences(true, newPreferences);
      }
      return newPreferences;
    });
  };

  const addPerson = (type) => {
    if (peopleInput[type] && !preferences.favoritePeople[type + 's'].includes(peopleInput[type])) {
      setPreferences((prev) => {
        const newPreferences = {
          ...prev,
          favoritePeople: {
            ...prev.favoritePeople,
            [type + 's']: [...prev.favoritePeople[type + 's'], peopleInput[type]],
          },
        };
        
        // Auto-save preferences when a question is answered and trigger recalculation
        if (currentUser) {
          savePreferences(true, newPreferences);
        }
        return newPreferences;
      });
      setPeopleInput((prev) => ({ ...prev, [type]: '' }));
    }
  };

  const savePreferences = async (isPartial = false, prefsToUpdate = null) => {
    if (!currentUser || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setAuthError(true);
      setError('Please log in to save preferences.');
      return;
    }

    const prefsToSave = prefsToUpdate || {
      ...preferences,
      questionnaireCompleted: !isPartial && step === totalSteps,
      detailedQuestionsCompleted: !isPartial && showDetailedQuestions && step === totalSteps,
    };

    setIsSubmitting(true);    try {
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      
      // Validate API Gateway URL
      if (!process.env.REACT_APP_API_GATEWAY_INVOKE_URL) {
        console.error('API Gateway URL is not defined in environment variables');
        throw new Error('API configuration issue');
      }
      
      console.log('Saving preferences to API:', `${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`);
      
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefsToSave),
      });

      // Improved error handling with status code information
      if (!response.ok) {
        const errorText = await response.text().catch(() => null);
        console.error(`API error (${response.status}):`, errorText || 'No error details available');
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please try signing in again.');
        } else if (response.status === 500) {
          throw new Error('Server error. Our team has been notified.');
        } else {
          throw new Error(`Failed to save preferences (Status: ${response.status})`);
        }
      }

      // Save to localStorage for offline/cache use
      try {
        localStorage.setItem(`userPrefs_${currentUser.attributes.sub}`, JSON.stringify(prefsToSave));
        localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, prefsToSave.questionnaireCompleted.toString());
      } catch (storageError) {
        console.warn('Could not save preferences to localStorage:', storageError);
        // Non-fatal error, continue execution
      }

      // Trigger the callback to recalculate recommendations
      if (onPreferencesUpdated) {
        onPreferencesUpdated(prefsToSave);
      }

      if (!isPartial && step === totalSteps && onComplete) onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      // Provide more specific error messages based on error type
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message.includes('Authentication')) {
        setAuthError(true);
        setError(error.message);
      } else {
        setError(error.message || 'Failed to save preferences. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      savePreferences(false);
    }
    
    if (step === coreSteps && !initialQuestionsCompleted) {
      setInitialQuestionsCompleted(true);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
    
    if (initialQuestionsCompleted && step === coreSteps + 1) {
      setInitialQuestionsCompleted(false);
    }
  };

  const skipOnboarding = () => {
    if (onSkip) onSkip();
  };
  
  const continueToDetailedQuestions = () => {
    setShowDetailedQuestions(true);
    setTotalSteps(coreSteps + 19); // 5 core + 19 detailed
    setStep(coreSteps + 1); // Move directly to the first detailed question
  };
  
  const finishWithBasicQuestions = () => {
    savePreferences(true);
    if (onClose) onClose();
  };

  const renderQuestionOptions = (step) => {
    const optionButtonClass = (isSelected) => 
      `p-3 rounded-lg text-sm font-medium w-full ${
        isSelected 
          ? 'bg-purple-600 text-white' 
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`;

    if (initialQuestionsCompleted && step === coreSteps) {
      return (
        <div className="space-y-6 max-w-lg mx-auto">
          <div className="bg-gray-800/70 p-6 rounded-lg text-center">
            <h4 className="text-lg font-medium text-white mb-4">You've completed the basic questions!</h4>
            <p className="text-gray-300 mb-8">Would you like to answer more detailed questions? This will help us better understand what you really like and tailor recommendations for you.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={continueToDetailedQuestions}
                className="px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium text-center"
              >
                Yes, more questions
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={finishWithBasicQuestions}
                className="px-6 py-3 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-center"
              >
                No, finish now
              </motion.button>
            </div>
          </div>
        </div>
      );
    }

    if (showDetailedQuestions && step > coreSteps) {
      const detailedStep = step - coreSteps;
      
      if (detailedStep === 19) {
        return (
          <div className="space-y-5 max-w-lg mx-auto">
            <div className="bg-gray-800/70 p-4 rounded-lg">
              <label className="text-white mb-3 block text-base font-medium">Favorite Actors</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={peopleInput.actor}
                  onChange={(e) => setPeopleInput((prev) => ({ ...prev, actor: e.target.value }))}
                  className="p-3 rounded-lg bg-gray-700 text-white w-full focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g., Tom Hanks"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addPerson('actor')}
                  className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 min-w-[70px]"
                >
                  Add
                </motion.button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preferences.favoritePeople.actors.map((actor) => (
                  <span key={actor} className="bg-gray-700 text-white px-3 py-1.5 rounded-full text-sm flex items-center">
                    {actor}
                    <button
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          favoritePeople: { 
                            ...prev.favoritePeople, 
                            actors: prev.favoritePeople.actors.filter((a) => a !== actor) 
                          },
                        }))
                      }
                      className="ml-2 text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-gray-800/70 p-4 rounded-lg">
              <label className="text-white mb-3 block text-base font-medium">Favorite Directors</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={peopleInput.director}
                  onChange={(e) => setPeopleInput((prev) => ({ ...prev, director: e.target.value }))}
                  className="p-3 rounded-lg bg-gray-700 text-white w-full focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g., Christopher Nolan"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addPerson('director')}
                  className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 min-w-[70px]"
                >
                  Add
                </motion.button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preferences.favoritePeople.directors.map((director) => (
                  <span key={director} className="bg-gray-700 text-white px-3 py-1.5 rounded-full text-sm flex items-center">
                    {director}
                    <button
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          favoritePeople: { 
                            ...prev.favoritePeople, 
                            directors: prev.favoritePeople.directors.filter((d) => d !== director) 
                          },
                        }))
                      }
                      className="ml-2 text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }
      
      switch (detailedStep) {
        case 1:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SUBGENRE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.subgenrePreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('subgenrePreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 2:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AESTHETIC_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.aestheticPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('aestheticPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 3:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STORY_STRUCTURE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.storyStructurePreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('storyStructurePreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 4:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CHARACTER_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.characterPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('characterPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 5:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {MATURITY_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.maturityPreference.includes(option.id))}
                  onClick={() => toggleArrayItem('maturityPreference', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 6:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {PLOT_COMPLEXITY_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.plotComplexityPreference.includes(option.id))}
                  onClick={() => toggleArrayItem('plotComplexityPreference', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 7:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MUSIC_SOUND_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.musicSoundPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('musicSoundPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 8:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CULTURAL_SETTING_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.culturalSettingPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('culturalSettingPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 9:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ADAPTATION_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.adaptationPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('adaptationPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 10:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CRITICAL_ACCLAIM_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.criticalAcclaimPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('criticalAcclaimPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 11:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACTING_STYLE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.actingStylePreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('actingStylePreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 12:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {PACING_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.pacingPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('pacingPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 13:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {PREDICTABILITY_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.predictabilityPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('predictabilityPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 14:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EFFECTS_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.effectsPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('effectsPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 15:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STORYTELLING_STYLE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.storytellingStylePreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('storytellingStylePreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 16:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRODUCTION_SCALE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.productionScalePreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('productionScalePreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 17:
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {CONTENT_CHALLENGE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.contentChallengePreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('contentChallengePreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        case 18:
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {REWATCHABILITY_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={optionButtonClass(preferences.rewatchabilityPreferences.includes(option.id))}
                  onClick={() => toggleArrayItem('rewatchabilityPreferences', option.id)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          );
        default:
          return null;
      }
    }

    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GENRE_OPTIONS.map((genre) => (
              <motion.button
                key={genre.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={optionButtonClass(preferences.favoriteGenres.includes(genre.id))}
                onClick={() => toggleArrayItem('favoriteGenres', genre.id)}
              >
                {genre.name}
              </motion.button>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={optionButtonClass(preferences.contentType === 'movies')}
              onClick={() => updatePreference('contentType', 'movies')}
            >
              Movies
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={optionButtonClass(preferences.contentType === 'tv')}
              onClick={() => updatePreference('contentType', 'tv')}
            >
              TV Shows
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={optionButtonClass(preferences.contentType === 'both')}
              onClick={() => updatePreference('contentType', 'both')}
            >
              Both
            </motion.button>
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MOOD_OPTIONS.map((mood) => (
              <motion.button
                key={mood.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={optionButtonClass(preferences.moodPreferences.includes(mood.id))}
                onClick={() => toggleArrayItem('moodPreferences', mood.id)}
              >
                {mood.name}
              </motion.button>
            ))}
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            {ERA_OPTIONS.map((era) => (
              <motion.button
                key={era.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={optionButtonClass(preferences.eraPreferences.includes(era.id))}
                onClick={() => toggleArrayItem('eraPreferences', era.id)}
              >
                {era.name}
              </motion.button>
            ))}
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LANGUAGE_OPTIONS.map((language) => (
              <motion.button
                key={language.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={optionButtonClass(preferences.languagePreferences.includes(language.id))}
                onClick={() => toggleArrayItem('languagePreferences', language.id)}
              >
                {language.name}
              </motion.button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const calculateProgressPercentage = () => {
    return (step / totalSteps) * 100;
  };
  
  const getCurrentQuestionTitle = () => {
    if (initialQuestionsCompleted && step === coreSteps) {
      return "You've completed the basic questions!";
    }
    if (showDetailedQuestions && step > coreSteps) {
      const detailedStep = step - coreSteps;
      return getDetailedQuestionTitle(detailedStep);
    }
    return getQuestionTitle(step);
  };
  
  const getCurrentQuestionDescription = () => {
    if (initialQuestionsCompleted && step === coreSteps) {
      return "Would you like to answer more detailed questions? This will help us better understand what you really like and tailor recommendations for you.";
    }
    if (showDetailedQuestions && step > coreSteps) {
      const detailedStep = step - coreSteps;
      return getDetailedQuestionDescription(detailedStep);
    }
    return getQuestionDescription(step);
  };

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="relative bg-gray-900/60 p-6 rounded-xl">
        {/* Header section with close button and title */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-white font-semibold">Your Preferences</h2>
          {isModal && (
            <button
              onClick={() => {
                // When X is clicked, save current progress and close
                const currentPrefs = {
                  ...preferences,
                  questionnaireCompleted: step >= coreSteps,
                  detailedQuestionsCompleted: showDetailedQuestions && step === totalSteps
                };
                savePreferences(true, currentPrefs);
                onClose();
              }}
              className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Progress bar with percentage */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-xs text-gray-400 mr-2">Progress</div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2.5 rounded-full transition-all"
              style={{ width: `${calculateProgressPercentage()}%` }}
            ></div>
          </div>
          <div className="ml-2 text-xs font-medium text-gray-400">
            {Math.round(calculateProgressPercentage())}%
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">
            <p>{error}</p>
            {authError && (
              <button onClick={() => navigate('/login')} className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm">
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
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">{getCurrentQuestionTitle()}</h3>
            <p className="text-sm sm:text-base text-gray-300 mb-8">{getCurrentQuestionDescription()}</p>
            {renderQuestionOptions(step)}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between pt-6 border-t border-gray-700 mt-8">
          <div>
            {step > 1 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={prevStep}
                className="px-5 py-2.5 text-sm sm:text-base text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg"
              >
                Previous
              </motion.button>
            )}
          </div>
          <div className="flex space-x-3 sm:space-x-4">
            {!(initialQuestionsCompleted && step === coreSteps) && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={skipOnboarding}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-300"
              >
                Skip for now
              </motion.button>
            )}
            
            {!(initialQuestionsCompleted && step === coreSteps) && (
              step < totalSteps ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextStep}
                  className="px-5 py-2.5 text-sm sm:text-base text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium"
                >
                  Next
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => savePreferences(false)}
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-sm sm:text-base text-white rounded-lg font-medium ${
                    isSubmitting ? 'bg-gray-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Finish'}
                </motion.button>
              )
            )}
          </div>
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
    default: return "Tell us your preferences";
  }
}

function getQuestionDescription(step) {
  switch (step) {
    case 1: return "Select all the genres that match your taste. You can choose multiple options.";
    case 2: return "Let us know if you're interested in movies, TV shows, or both.";
    case 3: return "What kind of experience do you typically look for? Select all that apply.";
    case 4: return "Choose your preferred time periods for content.";
    case 5: return "Select the languages you're comfortable watching. You can choose multiple options.";
    default: return "";
  }
}

function getDetailedQuestionTitle(detailedStep) {
  switch (detailedStep) {
    case 1: return "Any specific subgenres you like?";
    case 2: return "What visual style do you prefer?";
    case 3: return "How do you like your stories told?";
    case 4: return "What types of characters do you enjoy?";
    case 5: return "What level of maturity do you prefer?";
    case 6: return "How complex do you like your plots?";
    case 7: return "How important is music and sound?";
    case 8: return "Any preferred cultural settings?";
    case 9: return "Original stories or adaptations?";
    case 10: return "Do awards and acclaim matter to you?";
    case 11: return "What acting styles do you appreciate?";
    case 12: return "How fast do you like your pacing?";
    case 13: return "Predictable or surprising stories?";
    case 14: return "What's your take on special effects?";
    case 15: return "How should the story be delivered?";
    case 16: return "Blockbusters or indie films?";
    case 17: return "Comfort or challenging content?";
    case 18: return "Do you enjoy rewatching?";
    case 19: return "Favorite actors or directors?";
    default: return "Tell us more about your preferences";
  }
}

function getDetailedQuestionDescription(detailedStep) {
  switch (detailedStep) {
    case 1: return "Select specific subgenres that interest you.";
    case 2: return "What visual aesthetics do you enjoy?";
    case 3: return "How do you prefer stories to be structured?";
    case 4: return "What character types engage you most?";
    case 5: return "What maturity levels suit you?";
    case 6: return "Do you like simple or intricate plots?";
    case 7: return "How much do soundtracks matter to you?";
    case 8: return "Any cultural settings you love?";
    case 9: return "Prefer adaptations or original content?";
    case 10: return "Does critical acclaim influence you?";
    case 11: return "What acting performances stand out to you?";
    case 12: return "Fast-paced or slow and deliberate?";
    case 13: return "Predictable comfort or surprises?";
    case 14: return "Special effects or practical stunts?";
    case 15: return "How do you like stories communicated?";
    case 16: return "Big studio films or indie projects?";
    case 17: return "Easy watches or thought-provoking?";
    case 18: return "Do you rewatch favorites often?";
    case 19: return "Name actors/directors you love.";
    default: return "";
  }
}

export default OnboardingQuestionnaire;