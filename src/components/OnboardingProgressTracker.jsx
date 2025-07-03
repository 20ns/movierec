import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  StarIcon,
  TrophyIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

// Define onboarding stages with progressive unlock
const ONBOARDING_STAGES = [
  {
    id: 'essential',
    name: 'Essential Setup',
    description: 'Get started with basic preferences',
    questions: 8,
    requiredForRecommendations: true,
    icon: StarIcon,
    color: 'from-blue-500 to-indigo-600',
    rewards: ['Basic recommendations', 'Genre filtering'],
    estimatedTime: '2 min'
  },
  {
    id: 'context',
    name: 'Context & Preferences',
    description: 'Fine-tune your viewing experience',
    questions: 6,
    requiredForRecommendations: false,
    icon: ClockIcon,
    color: 'from-purple-500 to-pink-600',
    rewards: ['Mood-based recommendations', 'Time-aware suggestions'],
    estimatedTime: '3 min',
    prerequisite: 'essential'
  },
  {
    id: 'detailed',
    name: 'Detailed Preferences',
    description: 'Advanced customization options',
    questions: 6,
    requiredForRecommendations: false,
    icon: TrophyIcon,
    color: 'from-emerald-500 to-teal-600',
    rewards: ['Highly personalized recommendations', 'Content discovery'],
    estimatedTime: '4 min',
    prerequisite: 'context'
  },
  {
    id: 'personal',
    name: 'Personal Touch',
    description: 'Share your favorites and preferences',
    questions: 3,
    requiredForRecommendations: false,
    icon: SparklesIcon,
    color: 'from-yellow-500 to-orange-600',
    rewards: ['Expert-level matching', 'Similarity-based recommendations'],
    estimatedTime: '2 min',
    prerequisite: 'detailed'
  }
];

const OnboardingProgressTracker = ({
  currentStage,
  completedStages = [],
  onStageSelect,
  totalQuestions = 23,
  answeredQuestions = 0,
  isVisible = true,
  currentUser
}) => {
  const [expandedStage, setExpandedStage] = useState(null);
  const [showProgressDetails, setShowProgressDetails] = useState(false);

  // Calculate overall progress
  const overallProgress = (answeredQuestions / totalQuestions) * 100;
  const completedStagesCount = completedStages.length;
  
  // Determine stage status
  const getStageStatus = (stage) => {
    if (completedStages.includes(stage.id)) return 'completed';
    if (currentStage === stage.id) return 'current';
    if (!stage.prerequisite || completedStages.includes(stage.prerequisite)) return 'available';
    return 'locked';
  };

  // Get stage progress
  const getStageProgress = (stage) => {
    const stageQuestions = ONBOARDING_STAGES.find(s => s.id === stage.id)?.questions || 0;
    if (completedStages.includes(stage.id)) return 100;
    if (currentStage === stage.id) {
      // Calculate based on current progress within stage
      return Math.min((answeredQuestions / stageQuestions) * 100, 100);
    }
    return 0;
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl p-6 mb-6"
    >
      {/* Header with overall progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Your Onboarding Journey</h3>
          <p className="text-sm text-gray-400">Complete stages to unlock better recommendations</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowProgressDetails(!showProgressDetails)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-all"
        >
          <span className="text-sm font-medium">{Math.round(overallProgress)}% Complete</span>
          <ChevronRightIcon className={`w-4 h-4 transition-transform ${showProgressDetails ? 'rotate-90' : ''}`} />
        </motion.button>
      </div>

      {/* Overall progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>{answeredQuestions} of {totalQuestions} questions answered</span>
          <span>{completedStagesCount} of {ONBOARDING_STAGES.length} stages completed</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stage details (expandable) */}
      <AnimatePresence>
        {showProgressDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ONBOARDING_STAGES.map((stage) => {
                const status = getStageStatus(stage);
                const progress = getStageProgress(stage);
                const IconComponent = stage.icon;
                
                return (
                  <motion.div
                    key={stage.id}
                    whileHover={status === 'available' || status === 'current' ? { scale: 1.02 } : {}}
                    onClick={() => {
                      if (status === 'available' || status === 'current') {
                        onStageSelect && onStageSelect(stage.id);
                      }
                    }}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                      status === 'completed' 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : status === 'current'
                        ? `bg-gradient-to-br ${stage.color}/20 border-indigo-500/50`
                        : status === 'available'
                        ? 'bg-gray-800/50 border-gray-600/50 hover:border-gray-500'
                        : 'bg-gray-800/30 border-gray-700/30 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          status === 'completed' ? 'bg-green-600' :
                          status === 'current' ? `bg-gradient-to-br ${stage.color}` :
                          status === 'available' ? 'bg-gray-700' : 'bg-gray-800'
                        }`}>
                          {status === 'completed' ? (
                            <CheckCircleIcon className="w-5 h-5 text-white" />
                          ) : status === 'locked' ? (
                            <LockClosedIcon className="w-5 h-5 text-gray-500" />
                          ) : (
                            <IconComponent className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{stage.name}</h4>
                          <p className="text-xs text-gray-400">{stage.estimatedTime} • {stage.questions} questions</p>
                        </div>
                      </div>
                      {status === 'current' && (
                        <div className="text-xs text-indigo-300 font-medium">Active</div>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 mb-3">{stage.description}</p>

                    {/* Progress bar for current/completed stages */}
                    {(status === 'current' || status === 'completed') && (
                      <div className="mb-3">
                        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className={`h-full ${
                              status === 'completed' ? 'bg-green-500' : `bg-gradient-to-r ${stage.color}`
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Rewards preview */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400">Unlocks:</p>
                      {stage.rewards.map((reward, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                          <span className="text-xs text-gray-300">{reward}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick stage navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {ONBOARDING_STAGES.map((stage) => {
            const status = getStageStatus(stage);
            return (
              <motion.button
                key={stage.id}
                whileHover={status !== 'locked' ? { scale: 1.1 } : {}}
                whileTap={status !== 'locked' ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (status === 'available' || status === 'current') {
                    onStageSelect && onStageSelect(stage.id);
                  }
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'current' ? 'bg-indigo-500' :
                  status === 'available' ? 'bg-gray-500 hover:bg-gray-400' :
                  'bg-gray-700 cursor-not-allowed'
                }`}
                disabled={status === 'locked'}
                title={`${stage.name} - ${status}`}
              />
            );
          })}
        </div>

        {/* Achievement badge for completion */}
        {completedStagesCount === ONBOARDING_STAGES.length && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
          >
            <TrophyIcon className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">Onboarding Master!</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default OnboardingProgressTracker;