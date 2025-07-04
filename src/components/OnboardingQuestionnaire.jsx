import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import OnboardingProgressTracker from './OnboardingProgressTracker';

import { API } from 'aws-amplify';
import axios from 'axios';
// Enhanced genre options with better organization
const GENRE_OPTIONS = [
  { id: 28, name: 'Action', description: 'High-energy, fast-paced content' },
  { id: 12, name: 'Adventure', description: 'Epic journeys and exploration' },
  { id: 16, name: 'Animation', description: 'Animated films and series' },
  { id: 35, name: 'Comedy', description: 'Humorous and light-hearted content' },
  { id: 80, name: 'Crime', description: 'Criminal stories and investigations' },
  { id: 99, name: 'Documentary', description: 'Real-world educational content' },
  { id: 18, name: 'Drama', description: 'Serious, character-driven stories' },
  { id: 10751, name: 'Family', description: 'Content suitable for all ages' },
  { id: 14, name: 'Fantasy', description: 'Magical and supernatural worlds' },
  { id: 36, name: 'History', description: 'Historical events and periods' },
  { id: 27, name: 'Horror', description: 'Scary and suspenseful content' },
  { id: 10402, name: 'Music', description: 'Music-focused content' },
  { id: 9648, name: 'Mystery', description: 'Puzzles and whodunits' },
  { id: 10749, name: 'Romance', description: 'Love stories and relationships' },
  { id: 878, name: 'Science Fiction', description: 'Futuristic and technological themes' },
  { id: 10770, name: 'TV Movie', description: 'Made-for-television films' },
  { id: 53, name: 'Thriller', description: 'Suspenseful and intense content' },
  { id: 10752, name: 'War', description: 'Military and war-themed content' },
  { id: 37, name: 'Western', description: 'American frontier stories' },
];

// Content discovery preferences
const CONTENT_DISCOVERY_OPTIONS = [
  { id: 'trending', name: 'Latest Trending Content', description: 'What everyone is talking about' },
  { id: 'hiddenGems', name: 'Hidden Gems & Underrated', description: 'Lesser-known quality content' },
  { id: 'awardWinning', name: 'Award Winners & Critics\' Picks', description: 'Critically acclaimed content' },
  { id: 'classics', name: 'Timeless Classics', description: 'Enduring favorites from any era' },
  { id: 'newReleases', name: 'Brand New Releases', description: 'Just released content' },
];

// Viewing behavior options
const VIEWING_BEHAVIOR_OPTIONS = [
  { id: 'bingePerfect', name: 'Binge-Worthy Series', description: 'Content perfect for marathon watching' },
  { id: 'episodic', name: 'Standalone Episodes', description: 'Easy to watch one episode at a time' },
  { id: 'quickWatch', name: 'Quick Entertainment', description: 'Short episodes or films under 90 min' },
  { id: 'deepDive', name: 'Complex Narratives', description: 'Multi-layered stories requiring attention' },
  { id: 'background', name: 'Background Friendly', description: 'Easy to follow while multitasking' },
];

// Deal breaker options
const DEAL_BREAKER_OPTIONS = [
  { id: 'violence', name: 'Excessive Violence' },
  { id: 'sexualContent', name: 'Sexual Content' },
  { id: 'profanity', name: 'Strong Language' },
  { id: 'slowPace', name: 'Very Slow Pacing' },
  { id: 'cliffhangers', name: 'Major Cliffhangers' },
  { id: 'openEndings', name: 'Ambiguous Endings' },
  { id: 'animalHarm', name: 'Animal Harm' },
  { id: 'jumpScares', name: 'Jump Scares' },
  { id: 'subtitles', name: 'Subtitles Required' },
  { id: 'blackAndWhite', name: 'Black & White Content' },
];

// International content preferences
const INTERNATIONAL_CONTENT_OPTIONS = [
  { id: 'veryOpen', name: 'Love International Content', description: 'Actively seek diverse global content' },
  { id: 'someOpen', name: 'Open to Subtitles', description: 'Don\'t mind reading subtitles for good content' },
  { id: 'dubbedOnly', name: 'Dubbed Versions Only', description: 'Prefer dubbed over subtitled content' },
  { id: 'englishPreferred', name: 'English Preferred', description: 'Mainly stick to English-language content' },
  { id: 'noPreference', name: 'No Strong Preference', description: 'Language doesn\'t influence my choices' },
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

// Curated subgenre options
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
  { id: 'historical', name: 'Historical Fiction' },
];

// Visual style preferences
const AESTHETIC_OPTIONS = [
  { id: 'visuallyStunning', name: 'Visually Stunning' },
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'colorful', name: 'Colorful/Vibrant' },
  { id: 'darkMoody', name: 'Dark & Moody' },
  { id: 'retro', name: 'Retro Style' },
  { id: 'experimental', name: 'Experimental' },
];

// Narrative structure preferences
const STORY_STRUCTURE_OPTIONS = [
  { id: 'linear', name: 'Linear Storytelling' },
  { id: 'nonlinear', name: 'Non-linear/Time Jumps' },
  { id: 'anthology', name: 'Anthology/Multiple Stories' },
  { id: 'openEnded', name: 'Open-ended' },
  { id: 'twist', name: 'Surprise Endings' },
  { id: 'notSure', name: 'Not sure/Don\'t care' },
];

// Character preferences
const CHARACTER_OPTIONS = [
  { id: 'complexProtagonist', name: 'Complex Protagonists' },
  { id: 'strongFemale', name: 'Strong Female Characters' },
  { id: 'antiHero', name: 'Anti-heroes' },
  { id: 'ensemble', name: 'Ensemble Casts' },
  { id: 'character-driven', name: 'Character-driven Stories' },
];

// Content maturity preferences
const MATURITY_OPTIONS = [
  { id: 'family', name: 'Family-friendly' },
  { id: 'teen', name: 'Teen-oriented' },
  { id: 'mature', name: 'Mature Content' },
  { id: 'graphic', name: 'Graphic/Intense' },
];

// Critical reception preferences
const CRITICAL_ACCLAIM_OPTIONS = [
  { id: 'awardWinning', name: 'Award-winning Films/Shows' },
  { id: 'criticallyAcclaimed', name: 'Critically Acclaimed' },
  { id: 'cultClassic', name: 'Cult Classics' },
  { id: 'underrated', name: 'Underrated Gems' },
  { id: 'blockbuster', name: 'Popular Blockbusters' },
];

// Watching context options (NEW)
const WATCHING_CONTEXT_OPTIONS = [
  { id: 'alone', name: 'Watching Alone' },
  { id: 'partner', name: 'With Partner/Spouse' },
  { id: 'family', name: 'With Family (Including Kids)' },
  { id: 'friends', name: 'With Friends' },
];

// Streaming platform options (NEW)
const STREAMING_PLATFORM_OPTIONS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Amazon Prime' },
  { id: 'hulu', name: 'Hulu' },
  { id: 'disney', name: 'Disney+' },
  { id: 'hbo', name: 'HBO Max/Max' },
  { id: 'apple', name: 'Apple TV+' },
  { id: 'paramount', name: 'Paramount+' },
  { id: 'peacock', name: 'Peacock' },
  { id: 'other', name: 'Others/Local Services' },
];

// When do you typically watch? (NEW)
const WATCHING_TIME_OPTIONS = [
  { id: 'mornings', name: 'Mornings' },
  { id: 'afternoons', name: 'Afternoons' },
  { id: 'evenings', name: 'Evenings' },
  { id: 'latenight', name: 'Late Night' },
  { id: 'weekends', name: 'Primarily Weekends' },
];

// Define all questions in a centralized array for better maintenance
const QUESTIONS = [
  // Core questions - highest impact for recommendations
  {
    id: 'favoriteGenres',
    title: "What genres do you enjoy?",
    description: "Select all the genres that match your taste. You can choose multiple options.",
    options: GENRE_OPTIONS,
    type: 'multiSelect',
    category: 'essential'
  },
  {
    id: 'dislikedGenres',
    title: "Are there any genres you dislike?",
    description: "Select any genres you'd prefer to avoid. This helps us filter out content you won't like.",
    options: GENRE_OPTIONS,
    type: 'multiSelect',
    category: 'essential'
  },
  {
    id: 'contentType',
    title: "What type of content do you prefer?",
    description: "Let us know if you're interested in movies, TV shows, or both.",
    options: [
      { id: 'movies', name: 'Movies' },
      { id: 'tv', name: 'TV Shows' },
      { id: 'both', name: 'Both' },
    ],
    type: 'singleSelect',
    category: 'essential'
  },
  {
    id: 'favoriteContent',
    title: "Name some movies or shows you love",
    description: "Enter titles that represent your taste perfectly (this helps us understand your preferences better)",
    type: 'textInput',
    category: 'essential'
  },
  {
    id: 'moodPreferences',
    title: "What mood are you usually in when watching?",
    description: "What kind of experience do you typically look for? Select all that apply.",
    options: MOOD_OPTIONS,
    type: 'multiSelect',
    category: 'essential'
  },
  // Secondary questions - still important but can come after essentials
  {
    id: 'watchingContext',
    title: "Who do you usually watch with?",
    description: "This helps us recommend content appropriate for your viewing situation.",
    options: WATCHING_CONTEXT_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'streamingPlatforms',
    title: "Which streaming services do you use?",
    description: "We'll prioritize recommendations available on these platforms.",
    options: STREAMING_PLATFORM_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'watchingTime',
    title: "When do you typically watch?",
    description: "Knowing your viewing schedule helps us recommend appropriate content.",
    options: WATCHING_TIME_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'eraPreferences',
    title: "Do you have a preferred era?",
    description: "Choose your preferred time periods for content.",
    options: ERA_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'languagePreferences',
    title: "Any language preferences?",
    description: "Select the languages you're comfortable watching. You can choose multiple options.",
    options: LANGUAGE_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'runtimePreference',
    title: "Do you have a preferred runtime?",
    description: "Select your preferred length for movies and TV episodes.",
    options: RUNTIME_OPTIONS,
    type: 'singleSelect',
    category: 'context'
  },
  // Detailed preferences - for fine-tuning recommendations
  {
    id: 'subgenrePreferences',
    title: "Any specific subgenres you like?",
    description: "Select specific subgenres that interest you.",
    options: SUBGENRE_OPTIONS,
    type: 'multiSelect',
    category: 'detailed'
  },
  {
    id: 'aestheticPreferences',
    title: "What visual style do you prefer?",
    description: "What visual aesthetics do you enjoy?",
    options: AESTHETIC_OPTIONS,
    type: 'multiSelect',
    category: 'detailed'
  },
  {
    id: 'storyStructurePreferences',
    title: "How do you like your stories told?",
    description: "How do you prefer stories to be structured?",
    options: STORY_STRUCTURE_OPTIONS,
    type: 'multiSelect',
    category: 'detailed'
  },
  {
    id: 'characterPreferences',
    title: "What types of characters do you enjoy?",
    description: "What character types engage you most?",
    options: CHARACTER_OPTIONS,
    type: 'multiSelect',
    category: 'detailed'
  },
  {
    id: 'maturityPreference',
    title: "What level of maturity do you prefer?",
    description: "What maturity levels suit you?",
    options: MATURITY_OPTIONS,
    type: 'multiSelect',
    category: 'detailed'
  },
  {
    id: 'criticalAcclaimPreferences',
    title: "Do awards and acclaim matter to you?",
    description: "Does critical acclaim influence your choices?",
    options: CRITICAL_ACCLAIM_OPTIONS,
    type: 'multiSelect',
    category: 'detailed'
  },
  // Personal preferences - actors and directors
  {
    id: 'favoritePeople',
    title: "Favorite actors or directors?",
    description: "Tell us which actors and directors you particularly enjoy.",
    type: 'peopleInput',
    category: 'personal'
  },
  // New strategic questions for better recommendations
  {
    id: 'contentDiscoveryPreference',
    title: "How do you prefer to discover new content?",
    description: "What type of content discovery appeals to you most?",
    options: CONTENT_DISCOVERY_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'viewingBehaviorPreference',
    title: "What's your ideal viewing experience?",
    description: "How do you typically like to consume content?",
    options: VIEWING_BEHAVIOR_OPTIONS,
    type: 'multiSelect',
    category: 'context'
  },
  {
    id: 'dealBreakers',
    title: "What are your content deal-breakers?",
    description: "Select anything that would make you immediately stop watching or avoid content entirely.",
    options: DEAL_BREAKER_OPTIONS,
    type: 'multiSelect',
    category: 'essential'
  },
  {
    id: 'internationalContentPreference',
    title: "How do you feel about international content?",
    description: "What's your comfort level with non-English content?",
    options: INTERNATIONAL_CONTENT_OPTIONS,
    type: 'singleSelect',
    category: 'context'
  },
  {
    id: 'genreRatings',
    title: "Rate your interest in these genres",
    description: "Use the sliders to show how much you enjoy each genre (1 = not interested, 10 = absolutely love it)",
    options: GENRE_OPTIONS.slice(0, 10), // Top 10 genres for rating
    type: 'ratingSliders',
    category: 'essential'
  },
];

const OnboardingQuestionnaire = ({
  currentUser,
  onComplete,
  onSkip,
  isModal = false,
  onClose = () => {},
  existingPreferences = null,
  isUpdate = false,
  onPreferencesUpdated = null,
  skipBasicQuestions = false,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isQuickMode, setIsQuickMode] = useState(true); // New: Quick mode toggle
  const [showModeSelector, setShowModeSelector] = useState(true); // Show mode selection initially
  const [quickModeCompleted, setQuickModeCompleted] = useState(false); // Track if quick mode is done
  
  // Progressive onboarding state
  const [progressiveMode, setProgressiveMode] = useState(false); // Enable progressive onboarding
  const [currentStage, setCurrentStage] = useState('essential'); // Current stage in progressive mode
  const [completedStages, setCompletedStages] = useState([]); // Completed stages
  const [showProgressTracker, setShowProgressTracker] = useState(false); // Show progress tracker
  
  // Filter questions based on mode
  const getQuestionsForMode = () => {
    if (isQuickMode && !progressiveMode) {
      return QUESTIONS.filter(q => q.category === 'essential').slice(0, 8); // First 8 essential questions
    }
    if (progressiveMode) {
      return QUESTIONS.filter(q => q.category === currentStage); // Progressive mode: filter by current stage
    }
    return QUESTIONS;
  };
  
  const activeQuestions = getQuestionsForMode();
  const [totalSteps, setTotalSteps] = useState(activeQuestions.length);
  const [currentCategory, setCurrentCategory] = useState('essential');

  // Update totalSteps when mode changes
  useEffect(() => {
    const questions = getQuestionsForMode();
    setTotalSteps(questions.length);
  }, [isQuickMode, progressiveMode, currentStage]);
  
  // State for text inputs and people inputs
  const [textInputs, setTextInputs] = useState({
    favoriteContent: '',
  });
  const [peopleInput, setPeopleInput] = useState({ actor: '', director: '' });
  
  // Initialize preferences with empty values for all questions
  const [preferences, setPreferences] = useState({
    // Initialize all preference fields based on QUESTIONS
    ...QUESTIONS.reduce((acc, question) => {
      if (question.type === 'multiSelect') {
        acc[question.id] = [];
      } else if (question.type === 'singleSelect') {
        acc[question.id] = question.id === 'contentType' ? 'both' : 
                          question.id === 'runtimePreference' ? 'any' :
                          question.id === 'internationalContentPreference' ? 'noPreference' : '';
      } else if (question.type === 'textInput') {
        acc[question.id] = '';
      } else if (question.type === 'peopleInput') {
        acc['favoritePeople'] = { actors: [], directors: [] };
      } else if (question.type === 'ratingSliders') {
        acc[question.id] = {};
      }
      return acc;
    }, {}),
    
    // Track completion status
    questionnaireCompleted: false,
  });

  const [currentQuestion, setCurrentQuestion] = useState(activeQuestions[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0); // 0: not saving, 1: saving, 2: saved

  // Load existing preferences if available
  useEffect(() => {
    if (existingPreferences) {
      // Merge existing preferences with default state to handle any new questions
      setPreferences(prev => ({
        ...prev,
        ...existingPreferences,
        favoritePeople: existingPreferences.favoritePeople || { actors: [], directors: [] },
      }));

      // Set text inputs
      if (existingPreferences.favoriteContent) {
        setTextInputs(prev => ({
          ...prev,
          favoriteContent: existingPreferences.favoriteContent
        }));
      }

      // If skipping basic questions is enabled and user has preferences,
      // find the first unanswered detailed question
      if (skipBasicQuestions) {
        const essentialComplete = QUESTIONS
          .filter(q => q.category === 'essential')
          .every(q => {
            if (q.type === 'multiSelect') return existingPreferences[q.id]?.length > 0;
            if (q.type === 'singleSelect') return !!existingPreferences[q.id];
            if (q.type === 'textInput') return !!existingPreferences[q.id];
            return true;
          });

        if (essentialComplete) {
          // Find first unanswered non-essential question
          const firstUnansweredIndex = QUESTIONS.findIndex((q, index) => {
            if (q.category === 'essential') return false;
            
            if (q.type === 'multiSelect') return !existingPreferences[q.id] || existingPreferences[q.id].length === 0;
            if (q.type === 'singleSelect') return !existingPreferences[q.id];
            if (q.type === 'textInput') return !existingPreferences[q.id];
            if (q.type === 'peopleInput') {
              return !existingPreferences.favoritePeople?.actors?.length && !existingPreferences.favoritePeople?.directors?.length;
            }
            if (q.type === 'ratingSliders') {
              return !existingPreferences[q.id] || Object.keys(existingPreferences[q.id]).length === 0;
            }
            return true;
          });

          if (firstUnansweredIndex !== -1) {
            setStep(firstUnansweredIndex + 1);
            setCurrentQuestion(QUESTIONS[firstUnansweredIndex]);
            setCurrentCategory(QUESTIONS[firstUnansweredIndex].category);
          }
        }
      }
    }
  }, [existingPreferences, skipBasicQuestions]);

  // Update current question when step changes
  useEffect(() => {
    const questions = getQuestionsForMode();
    setCurrentQuestion(questions[step - 1]);
    setCurrentCategory(questions[step - 1]?.category || 'essential');
  }, [step, isQuickMode]);
  
  // Handle mode changes
  const handleModeSelection = (mode) => {
    if (mode === 'progressive') {
      setProgressiveMode(true);
      setIsQuickMode(false);
      setShowProgressTracker(true);
      setCurrentStage('essential');
    } else {
      setIsQuickMode(mode === 'quick');
      setProgressiveMode(false);
      setShowProgressTracker(false);
    }
    setShowModeSelector(false);
    setStep(1);
    const questions = getQuestionsForMode();
    setCurrentQuestion(questions[0]);
  };

  // Handle stage changes in progressive mode
  const handleStageSelect = (stageId) => {
    if (progressiveMode) {
      setCurrentStage(stageId);
      setStep(1);
      const stageQuestions = QUESTIONS.filter(q => q.category === stageId);
      if (stageQuestions.length > 0) {
        setCurrentQuestion(stageQuestions[0]);
      }
    }
  };

  // Handle stage completion in progressive mode
  const handleStageComplete = (stageId) => {
    if (!completedStages.includes(stageId)) {
      const newCompletedStages = [...completedStages, stageId];
      setCompletedStages(newCompletedStages);
      
      // Auto-save stage completion
      savePreferencesToDB(false, {
        ...preferences,
        completedOnboardingStages: newCompletedStages
      });

      // Determine next stage
      const stageOrder = ['essential', 'context', 'detailed', 'personal'];
      const currentIndex = stageOrder.indexOf(stageId);
      if (currentIndex < stageOrder.length - 1) {
        const nextStage = stageOrder[currentIndex + 1];
        setCurrentStage(nextStage);
        setStep(1);
        const nextQuestions = QUESTIONS.filter(q => q.category === nextStage);
        if (nextQuestions.length > 0) {
          setCurrentQuestion(nextQuestions[0]);
        }
      } else {
        // All stages completed
        handleQuickModeComplete();
      }
    }
  };
  
  // Handle quick mode completion
  const handleQuickModeComplete = () => {
    setQuickModeCompleted(true);
    if (isQuickMode) {
      // Auto-save quick mode preferences
      savePreferencesToDB(false, {
        ...preferences,
        questionnaireCompleted: true,
        quickModeCompleted: true
      }, true);
    }
  };

  // Auto-hide save indicator after 2 seconds
  useEffect(() => {
    if (saveProgress === 2) {
      const timer = setTimeout(() => {
        setSaveProgress(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveProgress]);

  const updatePreference = (field, value) => {
    setPreferences((prev) => {
      const newPreferences = { ...prev, [field]: value };
      // Auto-save preferences when a question is answered
      if (currentUser) {
        savePreferencesToDB(true, newPreferences, false);
      }
      return newPreferences;
    });
  };

  const updateTextInput = (field, value) => {
    setTextInputs(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Also update preferences
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        [field]: value
      };
      
      // Auto-save
      if (currentUser) {
        savePreferencesToDB(true, newPrefs, false);
      }
      
      return newPrefs;
    });
  };

  const toggleArrayItem = (field, item) => {
    setPreferences((prev) => {
      const array = prev[field] || [];
      const newPreferences = {
        ...prev,
        [field]: array.includes(item) ? array.filter((i) => i !== item) : [...array, item],
      };
      
      // Auto-save preferences when a question is answered
      if (currentUser) {
        savePreferencesToDB(true, newPreferences, false);
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
        
        // Auto-save preferences when a question is answered
        if (currentUser) {
          savePreferencesToDB(true, newPreferences, false);
        }
        return newPreferences;
      });
      setPeopleInput((prev) => ({ ...prev, [type]: '' }));
    }
  };

  const updateRatingSlider = (field, optionId, value) => {
    setPreferences((prev) => {
      const newPreferences = {
        ...prev,
        [field]: {
          ...prev[field],
          [optionId]: value
        }
      };
      
      // Auto-save preferences when a rating is changed
      if (currentUser) {
        savePreferencesToDB(true, newPreferences, false);
      }
      return newPreferences;
    });
  };

  const savePreferencesToDB = async (isPartial = false, prefsToUpdate = null, triggerUpdateCallback = false) => {
    if (!currentUser || !currentUser?.signInUserSession?.accessToken?.jwtToken) {
      setAuthError(true);
      setError('Please log in to save preferences.');
      return;
    }

    // Mark as saving
    setSaveProgress(1);

    const prefsToSave = prefsToUpdate || {
      ...preferences,
      questionnaireCompleted: !isPartial || step === totalSteps,
    };

    // If this is a final save, make sure it's marked as completed
    if (!isPartial || step === totalSteps) {
      prefsToSave.questionnaireCompleted = true;
    }

    setIsSubmitting(true);
    try {
      if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
        throw new Error('No valid access token available');
      }
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      
      // Use axios to save preferences (consistent with other components)
      const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
      
      const response = await axios.post(
        `${API_GATEWAY_URL}/user/preferences`,
        prefsToSave,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('Preferences saved successfully:', response.data);

      // Save to localStorage for offline/cache use
      try {
        localStorage.setItem(`userPrefs_${currentUser.attributes.sub}`, JSON.stringify(prefsToSave));
        localStorage.setItem(`questionnaire_completed_${currentUser.attributes.sub}`, prefsToSave.questionnaireCompleted.toString());
      } catch (storageError) {
        console.warn('Could not save preferences to localStorage:', storageError);
      }

      // Mark as saved
      setSaveProgress(2);

      // Trigger the callback to recalculate recommendations if requested
      if (triggerUpdateCallback && onPreferencesUpdated) {
        onPreferencesUpdated(prefsToSave);
      }

      // If this is the final step and save, call onComplete
      if (!isPartial && step === totalSteps && onComplete) {
        if (onPreferencesUpdated && !triggerUpdateCallback) {
          onPreferencesUpdated(prefsToSave);
        }
        
        // Small delay to ensure localStorage and callbacks have time to complete
        setTimeout(() => {
          onComplete();
        }, 100);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      // Reset save progress indicator
      setSaveProgress(0);
      
      // Provide more specific error messages
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
      // Handle progressive mode stage completion
      if (progressiveMode) {
        handleStageComplete(currentStage);
        return;
      }
      
      // Handle quick mode completion
      if (isQuickMode) {
        handleQuickModeComplete();
        return;
      }
      
      // Save as complete and trigger update on final "Next"
      savePreferencesToDB(false, null, true);
      
      // If in modal mode, close it
      if (isModal && onClose) {
        onClose();
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const skipOnboarding = () => {
    // Save current progress before skipping
    const currentPrefs = {
      ...preferences,
      questionnaireCompleted: true, // Mark as completed even when skipping
    };
    
    savePreferencesToDB(false, currentPrefs, true);
    
    // Call skip handler
    if (onSkip) onSkip();
  };

  const getCategoryProgress = () => {
    const questions = getQuestionsForMode();
    // Count questions by category for current mode
    const categories = {
      essential: questions.filter(q => q.category === 'essential').length,
      context: questions.filter(q => q.category === 'context').length,
      detailed: questions.filter(q => q.category === 'detailed').length,
      personal: questions.filter(q => q.category === 'personal').length,
    };
    
    // Count current position within category
    const currentCategoryQuestions = questions.filter(q => q.category === currentCategory);
    const currentCategoryIndex = currentCategoryQuestions.findIndex(q => q.id === currentQuestion.id) + 1;
    
    return {
      current: currentCategoryIndex,
      total: currentCategoryQuestions.length,
      name: getCategoryName(currentCategory),
    };
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'essential': return 'Essential Preferences';
      case 'context': return 'Viewing Context';
      case 'detailed': return 'Detailed Preferences';
      case 'personal': return 'Personal Favorites';
      default: return 'Preferences';
    }
  };

  const renderQuestionOptions = () => {
    const optionButtonClass = (isSelected) =>
      `p-3 rounded-lg text-sm font-medium w-full flex items-center justify-center transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 ${
        isSelected
          ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
      }`;

    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'multiSelect':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {currentQuestion.options.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={optionButtonClass(preferences[currentQuestion.id]?.includes(option.id))}
                onClick={() => toggleArrayItem(currentQuestion.id, option.id)}
              >
                {preferences[currentQuestion.id]?.includes(option.id) && <CheckIcon className="w-4 h-4 mr-2" />}
                {option.name}
              </motion.button>
            ))}
          </div>
        );
        
      case 'singleSelect':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            {currentQuestion.options.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={optionButtonClass(preferences[currentQuestion.id] === option.id)}
                onClick={() => updatePreference(currentQuestion.id, option.id)}
              >
                {preferences[currentQuestion.id] === option.id && <CheckIcon className="w-4 h-4 mr-2" />}
                {option.name}
              </motion.button>
            ))}
          </div>
        );
        
      case 'textInput':
        return (
          <div className="w-full max-w-lg mx-auto">
            <textarea
              value={textInputs[currentQuestion.id] || ''}
              onChange={(e) => updateTextInput(currentQuestion.id, e.target.value)}
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Enter titles separated by commas (e.g., The Godfather, Breaking Bad, etc.)"
              rows={3}
            />
          </div>
        );
        
      case 'peopleInput':
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
                {preferences.favoritePeople?.actors?.map((actor) => (
                  <span key={actor} className="bg-purple-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow">
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
                      className="ml-2 text-purple-200 hover:text-white transition-colors"
                      aria-label={`Remove ${actor}`}
                    >
                      <XMarkIcon className="w-3 h-3" />
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
                {preferences.favoritePeople?.directors?.map((director) => (
                  <span key={director} className="bg-purple-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow">
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
                      className="ml-2 text-purple-200 hover:text-white transition-colors"
                      aria-label={`Remove ${director}`}
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ratingSliders':
        return (
          <div className="space-y-4 max-w-2xl mx-auto">
            {currentQuestion.options.map((option) => (
              <div key={option.id} className="bg-gray-800/70 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-white font-medium text-base">{option.name}</label>
                  <span className="text-purple-300 font-bold text-lg">
                    {preferences[currentQuestion.id]?.[option.id] || 5}
                  </span>
                </div>
                {option.description && (
                  <p className="text-gray-400 text-sm mb-3">{option.description}</p>
                )}
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400 text-sm">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={preferences[currentQuestion.id]?.[option.id] || 5}
                    onChange={(e) => updateRatingSlider(currentQuestion.id, option.id, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((preferences[currentQuestion.id]?.[option.id] || 5) - 1) * 11.11}%, #374151 ${((preferences[currentQuestion.id]?.[option.id] || 5) - 1) * 11.11}%, #374151 100%)`
                    }}
                  />
                  <span className="text-gray-400 text-sm">10</span>
                </div>
              </div>
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

  // Get category progress
  const categoryProgress = getCategoryProgress();

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="relative bg-gray-900/60 p-6 rounded-xl">
        {/* Header section with close button and title */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl text-white font-bold tracking-tight">Your Preferences</h2>
          {isModal && (
            <div className="flex items-center space-x-2">
              {/* Save indicator */}
              {saveProgress > 0 && (
                <span className={`text-sm font-medium ${saveProgress === 1 ? 'text-gray-400' : 'text-green-400'} transition-colors duration-300`}>
                  {saveProgress === 1 ? 'Saving...' : 'Saved!'}
                </span>
              )}
              
              <button
                onClick={() => {
                  // When X is clicked, save current progress and close
                  const currentPrefs = {
                    ...preferences,
                    questionnaireCompleted: step >= totalSteps
                  };
                  savePreferencesToDB(true, currentPrefs, true);
                  onClose();
                }}
                className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Mode Selection - Show at the beginning */}
        {showModeSelector && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Choose Your Experience</h3>
            <p className="text-gray-400 mb-8">How would you like to complete your preferences?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {/* Quick Mode */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelection('quick')}
                className="p-6 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-xl text-left hover:border-blue-400/50 transition-all"
              >
                <div className="text-blue-400 mb-3">
                  <StarIcon className="w-8 h-8" />
                </div>
                <h4 className="text-white font-semibold mb-2">Quick Start</h4>
                <p className="text-gray-300 text-sm mb-3">8 essential questions • 2 minutes</p>
                <p className="text-gray-400 text-xs">Get basic recommendations right away</p>
              </motion.button>

              {/* Progressive Mode */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelection('progressive')}
                className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl text-left hover:border-purple-400/50 transition-all"
              >
                <div className="text-purple-400 mb-3">
                  <SparklesIcon className="w-8 h-8" />
                </div>
                <h4 className="text-white font-semibold mb-2">Progressive Journey</h4>
                <p className="text-gray-300 text-sm mb-3">Staged completion • Your pace</p>
                <p className="text-gray-400 text-xs">Complete sections as you have time, unlock rewards</p>
              </motion.button>

              {/* Complete Mode */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelection('complete')}
                className="p-6 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl text-left hover:border-emerald-400/50 transition-all"
              >
                <div className="text-emerald-400 mb-3">
                  <CheckIcon className="w-8 h-8" />
                </div>
                <h4 className="text-white font-semibold mb-2">Complete Setup</h4>
                <p className="text-gray-300 text-sm mb-3">All 23 questions • 10 minutes</p>
                <p className="text-gray-400 text-xs">Maximum personalization from the start</p>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Progressive Onboarding Tracker */}
        {progressiveMode && showProgressTracker && (
          <OnboardingProgressTracker
            currentStage={currentStage}
            completedStages={completedStages}
            onStageSelect={handleStageSelect}
            totalQuestions={QUESTIONS.length}
            answeredQuestions={Object.values(preferences).filter(Boolean).length}
            currentUser={currentUser}
          />
        )}
        
        {/* Main Questionnaire Content - Only show when not in mode selection or completion */}
        {!showModeSelector && !quickModeCompleted && (
          <>
            {/* Progress section */}
            <div className="mb-8 space-y-2">
              {/* Category indicator */}
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-purple-300">
                  {categoryProgress.name} ({categoryProgress.current}/{categoryProgress.total})
                </span>
                <span className="text-sm font-medium text-purple-300">
                  Question {step} of {totalSteps}
                </span>
              </div>
              
              {/* Overall progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${calculateProgressPercentage()}%` }}
                ></div>
              </div>
              
              {/* Category indicators */}
              <div className="flex w-full">
                {['essential', 'context', 'detailed', 'personal'].map((cat) => {
                  // Calculate width based on number of questions in this category
                  const width = (getQuestionsForMode().filter(q => q.category === cat).length / totalSteps) * 100;
                  const isActive = currentCategory === cat;
                  
                  return (
                    <div 
                      key={cat}
                      className={`h-1 ${isActive ? 'bg-purple-500' : 'bg-gray-600'} transition-all`}
                      style={{ width: `${width}%` }}
                      title={getCategoryName(cat)}
                    ></div>
                  );
                })}
              </div>
            </div>

            {/* Error message display */}
            {error && (
              <div className="mb-6 p-4 bg-red-800/60 border border-red-600 text-red-100 rounded-lg shadow-md">
                <p className="font-medium">Error:</p>
                <p>{error}</p>
                {authError && (
                  <button
                    onClick={() => navigate('/login')}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Go to Login
                  </button>
                )}
              </div>
            )}

            {/* Question and options */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800/50 p-6 rounded-xl shadow-xl mb-8"
              >
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">{currentQuestion?.title}</h3>
                <p className="text-sm sm:text-base text-gray-300 mb-6">{currentQuestion?.description}</p>
                <div className="space-y-4">
                  {renderQuestionOptions()}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-700 mt-10">
              <div>
                {step > 1 && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={prevStep}
                    className="px-6 py-3 text-sm sm:text-base text-gray-200 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-150 ease-in-out"
                  >
                    Previous
                  </motion.button>
                )}
              </div>
              
              <div className="flex space-x-3 sm:space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={skipOnboarding}
                  className="px-5 py-3 text-sm text-gray-400 hover:text-gray-200 rounded-lg transition-colors duration-150 ease-in-out"
                >
                  {step === totalSteps ? "Skip & Save Progress" : "Skip for now"}
                </motion.button>
                
                {step < totalSteps ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextStep}
                    className="px-6 py-3 text-sm sm:text-base text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-150 ease-in-out"
                  >
                    Next
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={nextStep}
                    disabled={isSubmitting}
                    className={`px-6 py-3 text-sm sm:text-base text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-150 ease-in-out ${
                      isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 
                      isQuickMode ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' :
                      'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : isQuickMode ? 'Complete Quick Setup' : 'Finish & Save'}
                  </motion.button>
                )}
              </div>
            </div>
        
            {/* Auto-save indicator at bottom */}
            <div className="mt-4 text-center">
              <span className="text-xs text-gray-400">
                Your answers are automatically saved as you go
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingQuestionnaire;