// src/components/OnboardingQuestionnaireRefactored.jsx
// This is the enhanced version that uses UserDataContext

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/solid';

// Import context and error boundaries
import { useUserData } from '../contexts/UserDataContext';
import { QuestionnaireErrorBoundary } from './ContextAwareErrorBoundary';
import { useLogger, performanceMonitor } from '../utils/centralizedLogger';

// Import new loading and animation systems
import { useComponentLoadingState, useAsyncOperation } from '../hooks/useLoadingState';
import { LOADING_OPERATIONS } from '../services/loadingStateService';
import { LoadingSpinner, LoadingOverlay, ProgressBar } from './LoadingComponents';
import { animationCoordinator, ANIMATION_PRESETS, createEntranceAnimation } from '../utils/animationCoordinator';

// Import existing components and data
import OnboardingProgressTracker from './OnboardingProgressTracker';
import { savePreferences } from '../services/preferenceService';
import { QUESTIONS } from './OnboardingQuestionnaire'; // Import questions data

const OnboardingQuestionnaireRefactored = ({
  onComplete = () => {},
  onSkip = () => {},
  onClose = () => {},
  isModal = false,
  skipBasicQuestions = false,
  existingPreferences = null,
  onPreferencesUpdated = () => {}
}) => {
  const navigate = useNavigate();
  const logger = useLogger('OnboardingQuestionnaire');
  
  // Loading state management
  const loadingState = useComponentLoadingState('OnboardingQuestionnaire');
  const saveOperation = useAsyncOperation('OnboardingQuestionnaire', LOADING_OPERATIONS.QUESTIONNAIRE_SAVE);
  const submitOperation = useAsyncOperation('OnboardingQuestionnaire', LOADING_OPERATIONS.QUESTIONNAIRE_SUBMIT);
  
  // Get context state and actions
  const {
    currentUser,
    isAuthenticated,
    userPreferences,
    questionnaireCompleted,
    currentStage,
    completedStages,
    updatePreferences,
    completeQuestionnaire,
    setUIState,
    initialAppLoadComplete
  } = useUserData();

  // ===== LOCAL STATE =====
  const [localPreferences, setLocalPreferences] = useState(() => {
    return existingPreferences || userPreferences || {
      favoriteGenres: [],
      genreRatings: {},
      contentTypes: [],
      dealBreakers: [],
      moodPreferences: [],
      viewingBehavior: {},
      internationalContent: '',
      favoriteDirectors: [],
      favoriteActors: [],
      languagePreferences: [],
      runtimePreferences: ''
    };
  });

  const [uiState, setLocalUIState] = useState({
    step: 1,
    showModeSelector: !skipBasicQuestions,
    isQuickMode: skipBasicQuestions,
    progressiveMode: false,
    showProgressTracker: false,
    isSubmitting: false,
    saveProgress: 0, // 0: none, 1: saving, 2: saved
    error: null,
    authError: false
  });

  const [textInputs, setTextInputs] = useState({
    favoriteDirector: '',
    favoriteActor: ''
  });

  // ===== DERIVED STATE =====
  const getQuestionsForMode = useCallback(() => {
    if (!QUESTIONS) return [];
    
    if (uiState.isQuickMode) {
      return QUESTIONS.filter(q => q.category === 'essential');
    }
    
    if (uiState.progressiveMode) {
      return QUESTIONS.filter(q => q.category === currentStage);
    }
    
    return QUESTIONS;
  }, [uiState.isQuickMode, uiState.progressiveMode, currentStage]);

  const questions = getQuestionsForMode();
  const totalSteps = questions.length;
  const currentQuestion = questions[uiState.step - 1];

  // ===== EFFECTS =====

  // Initialize from context preferences
  useEffect(() => {
    if (userPreferences && Object.keys(userPreferences).length > 0) {
      setLocalPreferences(prev => ({
        ...prev,
        ...userPreferences
      }));
      logger.debug('Initialized from context preferences', {
        hasPreferences: !!userPreferences,
        questionnaireCompleted: userPreferences.questionnaireCompleted
      });
    }
  }, [userPreferences, logger]);

  // Auto-hide save indicator
  useEffect(() => {
    if (uiState.saveProgress === 2) {
      const timer = setTimeout(() => {
        setLocalUIState(prev => ({ ...prev, saveProgress: 0 }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uiState.saveProgress]);

  // Update step when questions change
  useEffect(() => {
    if (questions.length > 0 && uiState.step > questions.length) {
      setLocalUIState(prev => ({ ...prev, step: questions.length }));
    }
  }, [questions.length, uiState.step]);

  // ===== HANDLERS =====

  const handleModeSelection = useCallback((mode) => {
    logger.userAction('Mode Selection', { mode });
    
    const newUIState = {
      showModeSelector: false,
      step: 1,
      isQuickMode: mode === 'quick',
      progressiveMode: mode === 'progressive',
      showProgressTracker: mode === 'progressive'
    };

    setLocalUIState(prev => ({ ...prev, ...newUIState }));

    // Update context with progressive mode info
    if (mode === 'progressive') {
      setUIState({
        currentStage: 'essential',
        showProgressTracker: true
      });
    }
  }, [logger, setUIState]);

  const handleStageSelect = useCallback((stageId) => {
    if (!uiState.progressiveMode) return;
    
    logger.userAction('Stage Selection', { stageId });
    
    setUIState({ currentStage: stageId });
    setLocalUIState(prev => ({ ...prev, step: 1 }));
  }, [uiState.progressiveMode, logger, setUIState]);

  const savePreferencesToContext = useCallback(async (isPartial = false, prefsToSave = null, triggerCallback = false) => {
    if (!currentUser || !isAuthenticated) {
      setLocalUIState(prev => ({
        ...prev,
        authError: true,
        error: 'Please log in to save preferences.'
      }));
      logger.error('Save failed - not authenticated');
      return false;
    }

    // Use new loading state management
    const operation = isPartial ? saveOperation : submitOperation;
    
    try {
      // Start loading operation with animation coordination
      await operation.execute(async () => {
        setLocalUIState(prev => ({ ...prev, saveProgress: 1, isSubmitting: !isPartial }));
        
        // Coordinate save animation
        await animationCoordinator.startAnimation(
          `save_${isPartial ? 'partial' : 'complete'}_${Date.now()}`,
          ANIMATION_PRESETS.loadingPulse,
          {
            component: 'OnboardingQuestionnaire',
            priority: isPartial ? 1 : 3,
            coordinateWithLoading: true
          }
        );
      
      const finalPreferences = prefsToSave || {
        ...localPreferences,
        questionnaireCompleted: !isPartial || uiState.step === totalSteps,
        userId: currentUser?.attributes?.sub,
        updatedAt: new Date().toISOString()
      };

      // Save via context for immediate state update
      if (!isPartial) {
        const success = completeQuestionnaire(finalPreferences, {
          forceRefresh: true,
          source: 'questionnaire_completion'
        });

        if (!success) {
          throw new Error('Questionnaire completion validation failed');
        }

        logger.info('Questionnaire completed via context', {
          questionnaireCompleted: true,
          genreCount: Object.keys(finalPreferences.genreRatings || {}).length
        });

        // Trigger external completion callback
        onComplete({
          preferences: finalPreferences,
          forceRefresh: true,
          source: 'questionnaire_completion'
        });

      } else {
        // Partial save - update context and trigger auto-save
        updatePreferences(finalPreferences);
        
        if (triggerCallback) {
          onPreferencesUpdated(finalPreferences);
        }

        logger.debug('Preferences auto-saved', {
          isPartial: true,
          step: uiState.step,
          totalSteps
        });
      }

      setLocalUIState(prev => ({ 
        ...prev, 
        saveProgress: 2, 
        error: null, 
        authError: false 
      }));

      return finalPreferences;
      }, {
        metadata: {
          isPartial,
          step: uiState.step,
          totalSteps,
          genreCount: Object.keys(prefsToSave?.genreRatings || localPreferences.genreRatings || {}).length
        }
      });

      return true;

    } catch (error) {
      logger.error('Save preferences failed', { error: error.message }, error);
      
      setLocalUIState(prev => ({
        ...prev,
        saveProgress: 0,
        isSubmitting: false,
        error: error.message || 'Failed to save preferences. Please try again.',
        authError: error.message.includes('Authentication') || error.message.includes('login')
      }));

      return false;
    }
  }, [
    currentUser,
    isAuthenticated,
    localPreferences,
    uiState.step,
    totalSteps,
    updatePreferences,
    completeQuestionnaire,
    onComplete,
    onPreferencesUpdated,
    logger,
    saveOperation,
    submitOperation
  ]);

  const updatePreference = useCallback((field, value) => {
    setLocalPreferences(prev => {
      const newPreferences = { ...prev, [field]: value };
      
      // Auto-save if user is authenticated
      if (currentUser && isAuthenticated) {
        // Debounce auto-save to prevent excessive calls
        setTimeout(() => {
          savePreferencesToContext(true, newPreferences, false);
        }, 500);
      }
      
      return newPreferences;
    });

    logger.userAction('Preference Update', { field, hasValue: !!value });
  }, [currentUser, isAuthenticated, savePreferencesToContext, logger]);

  const updateTextInput = useCallback((field, value) => {
    setTextInputs(prev => ({ ...prev, [field]: value }));
    
    // Update preferences for certain fields immediately
    if (field === 'favoriteDirector' && value.trim()) {
      updatePreference('favoriteDirectors', [
        ...new Set([...localPreferences.favoriteDirectors || [], value.trim()])
      ]);
    }
    
    if (field === 'favoriteActor' && value.trim()) {
      updatePreference('favoriteActors', [
        ...new Set([...localPreferences.favoriteActors || [], value.trim()])
      ]);
    }
  }, [updatePreference, localPreferences.favoriteDirectors, localPreferences.favoriteActors]);

  const updateRatingSlider = useCallback((questionId, optionId, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [optionId]: value
      }
    }));

    // Auto-save with debounce
    if (currentUser && isAuthenticated) {
      setTimeout(() => {
        savePreferencesToContext(true, null, false);
      }, 300);
    }

    logger.userAction('Rating Update', { questionId, optionId, value });
  }, [currentUser, isAuthenticated, savePreferencesToContext, logger]);

  const nextStep = useCallback(async () => {
    if (uiState.step < totalSteps) {
      setLocalUIState(prev => ({ ...prev, step: prev.step + 1 }));
      logger.userAction('Next Step', { step: uiState.step + 1, totalSteps });
    } else {
      // Final step - complete questionnaire
      logger.info('Questionnaire completion initiated', {
        isQuickMode: uiState.isQuickMode,
        progressiveMode: uiState.progressiveMode,
        totalSteps
      });

      const success = await savePreferencesToContext(false, null, true);
      
      if (success) {
        if (isModal) {
          onClose();
        }
        
        // Navigate if not in modal
        if (!isModal) {
          navigate('/');
        }
      }
    }
  }, [
    uiState.step,
    totalSteps,
    uiState.isQuickMode,
    uiState.progressiveMode,
    savePreferencesToContext,
    isModal,
    onClose,
    navigate,
    logger
  ]);

  const prevStep = useCallback(() => {
    if (uiState.step > 1) {
      setLocalUIState(prev => ({ ...prev, step: prev.step - 1 }));
      logger.userAction('Previous Step', { step: uiState.step - 1 });
    }
  }, [uiState.step, logger]);

  const skipOnboarding = useCallback(async () => {
    logger.userAction('Skip Onboarding');
    
    // Save current progress as completed
    const finalPreferences = {
      ...localPreferences,
      questionnaireCompleted: true,
      skippedOnboarding: true
    };

    await savePreferencesToContext(false, finalPreferences, true);
    
    if (onSkip) onSkip();
  }, [localPreferences, savePreferencesToContext, onSkip, logger]);

  // ===== RENDER HELPERS =====
  
  const renderModeSelector = () => {
    if (!uiState.showModeSelector) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Choose Your Setup Style
        </h2>
        
        <div className="grid gap-4 max-w-2xl mx-auto">
          {/* Quick Mode */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelection('quick')}
            className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-left transition-all"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Start</h3>
                <p className="text-green-100 text-sm">Essential preferences only (2-3 min)</p>
              </div>
            </div>
          </motion.button>

          {/* Progressive Mode */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelection('progressive')}
            className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl text-left transition-all"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Progressive Journey</h3>
                <p className="text-purple-100 text-sm">Build your profile gradually (5-10 min)</p>
              </div>
            </div>
          </motion.button>

          {/* Complete Mode */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelection('complete')}
            className="p-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-xl text-left transition-all"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Complete Setup</h3>
                <p className="text-orange-100 text-sm">Full personalization experience (10-15 min)</p>
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>
    );
  };

  const calculateProgressPercentage = () => {
    return (uiState.step / totalSteps) * 100;
  };

  // ===== MAIN RENDER =====

  if (!isAuthenticated || !initialAppLoadComplete) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4"></div>
          </div>
          <p className="text-gray-400">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <QuestionnaireErrorBoundary>
      <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="relative bg-gray-900/60 p-6 rounded-xl">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl text-white font-bold tracking-tight">
              Your Preferences
            </h2>
            {isModal && (
              <div className="flex items-center space-x-2">
                {/* Save indicator */}
                {uiState.saveProgress > 0 && (
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    uiState.saveProgress === 1 ? 'text-gray-400' : 'text-green-400'
                  }`}>
                    {uiState.saveProgress === 1 ? 'Saving...' : 'Saved!'}
                  </span>
                )}
                
                <button
                  onClick={() => {
                    // Save current progress on close
                    savePreferencesToContext(true, {
                      ...localPreferences,
                      questionnaireCompleted: uiState.step >= totalSteps
                    }, true);
                    onClose();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          {renderModeSelector()}

          {/* Progress Tracker for Progressive Mode */}
          {uiState.progressiveMode && uiState.showProgressTracker && (
            <div className="mb-6">
              <OnboardingProgressTracker
                currentStage={currentStage}
                completedStages={completedStages}
                onStageSelect={handleStageSelect}
                totalQuestions={totalSteps}
                answeredQuestions={uiState.step - 1}
                isVisible={true}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* Progress Bar */}
          {!uiState.showModeSelector && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Question {uiState.step} of {totalSteps}</span>
                <span>{Math.round(calculateProgressPercentage())}% complete</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProgressPercentage()}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {uiState.error && (
            <div className="mb-6 p-4 bg-red-800/60 border border-red-600 text-red-100 rounded-lg shadow-md">
              <p className="font-medium">Error:</p>
              <p>{uiState.error}</p>
              {uiState.authError && (
                <button
                  onClick={() => navigate('/auth')}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Go to Login
                </button>
              )}
            </div>
          )}

          {/* Question Content */}
          {!uiState.showModeSelector && currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={uiState.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800/50 p-6 rounded-xl shadow-xl mb-8"
              >
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                  {currentQuestion.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300 mb-6">
                  {currentQuestion.description}
                </p>
                
                {/* Question options would be rendered here */}
                {/* This would include the complex renderQuestionOptions logic */}
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Question options will be rendered here based on question type
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Navigation Buttons */}
          {!uiState.showModeSelector && (
            <div className="flex justify-between items-center pt-6 border-t border-gray-700 mt-10">
              <div>
                {uiState.step > 1 && (
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
                  {uiState.step === totalSteps ? "Skip & Save Progress" : "Skip for now"}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextStep}
                  disabled={loadingState.isLoading || uiState.isSubmitting}
                  className={`px-6 py-3 text-sm sm:text-base text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-150 ease-in-out flex items-center space-x-2 ${
                    loadingState.isLoading || uiState.isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 
                    uiState.step === totalSteps ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' :
                    'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                  }`}
                >
                  {(loadingState.isLoading || uiState.isSubmitting) && (
                    <LoadingSpinner size="sm" color="white" showLabel={false} />
                  )}
                  <span>
                    {loadingState.isLoading ? 'Processing...' :
                     uiState.isSubmitting ? 'Saving...' : 
                     uiState.step === totalSteps ? 'Complete' : 'Next'}
                  </span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
        
        {/* Loading Overlay for complex operations */}
        <LoadingOverlay 
          isVisible={submitOperation.isLoading || (loadingState.isLoading && loadingState.activeOperations > 1)}
          message={submitOperation.isLoading ? 'Completing questionnaire...' : 'Processing your preferences...'}
          size="lg"
        />
      </div>
    </QuestionnaireErrorBoundary>
  );
};

export default OnboardingQuestionnaireRefactored;