// src/components/UserProgressRefactored.jsx
// Enhanced version using UserDataContext for synchronized progress tracking

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  StarIcon,
  EyeIcon,
  HeartIcon,
  ClockIcon,
  TrophyIcon,
  CalendarDaysIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

// Context and utilities
import { useUserData } from '../contexts/UserDataContext';
import { ProgressErrorBoundary } from './ContextAwareErrorBoundary';
import { useLogger } from '../utils/centralizedLogger';

// Loading and animation systems
import { useComponentLoadingState, useAsyncOperation } from '../hooks/useLoadingState';
import { LOADING_OPERATIONS } from '../services/loadingStateService';
import { LoadingSpinner, ProgressBar, LoadingCard } from './LoadingComponents';
import { animationCoordinator, ANIMATION_PRESETS } from '../utils/animationCoordinator';

// Helper functions
const getStreakColor = (streak) => {
  if (streak >= 30) return 'text-orange-400 bg-orange-500/20';
  if (streak >= 14) return 'text-purple-400 bg-purple-500/20';
  if (streak >= 7) return 'text-blue-400 bg-blue-500/20';
  if (streak >= 3) return 'text-green-400 bg-green-500/20';
  return 'text-gray-400 bg-gray-500/20';
};

const getLevelColor = (level) => {
  if (level >= 10) return 'from-orange-500 to-red-500';
  if (level >= 7) return 'from-purple-500 to-pink-500';
  if (level >= 5) return 'from-blue-500 to-cyan-500';
  if (level >= 3) return 'from-green-500 to-emerald-500';
  return 'from-gray-500 to-gray-600';
};

const UserProgressRefactored = ({ 
  compact = false 
}) => {
  const logger = useLogger('UserProgress');
  
  // Get unified state from context
  const {
    currentUser,
    userId,
    isAuthenticated,
    questionnaireCompleted,
    completionPercentage,
    userProgress,
    updateUserProgress,
    initialAppLoadComplete
  } = useUserData();

  // Local UI state for immediate responsiveness
  const [localStats, setLocalStats] = useState({
    moviesWatched: 0,
    moviesRated: 0,
    favoritesCount: 0,
    watchlistCount: 0,
    genresExplored: 0,
    dailyStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    joinDate: null,
    totalTimeSpent: 0,
    avgRating: 0,
    hiddenGemsWatched: 0,
    recommendationsFollowed: 0,
    totalXP: 0,
    level: 1
  });

  const [weeklyProgress, setWeeklyProgress] = useState([0, 0, 0, 0, 0, 0, 0]);

  // ===== SYNC WITH CONTEXT =====
  useEffect(() => {
    if (userProgress && Object.keys(userProgress).length > 0) {
      setLocalStats(prev => ({
        ...prev,
        ...userProgress
      }));
      
      logger.debug('Synced with context user progress', {
        level: userProgress.level,
        xp: userProgress.xp,
        streak: userProgress.streak
      });
    }
  }, [userProgress, logger]);

  // ===== INITIALIZATION =====
  useEffect(() => {
    if (!isAuthenticated || !userId || !initialAppLoadComplete) return;

    const initializeProgress = async () => {
      try {
        // Load from localStorage with user-specific keys
        const savedStatsKey = `movieRec_userStats_${userId}`;
        const savedWeeklyKey = `movieRec_weeklyProgress_${userId}`;
        
        const savedStats = JSON.parse(localStorage.getItem(savedStatsKey) || '{}');
        const savedWeekly = JSON.parse(localStorage.getItem(savedWeeklyKey) || '[0, 0, 0, 0, 0, 0, 0]');
        
        // Merge with existing stats
        const initialStats = {
          ...localStats,
          ...savedStats,
          // Add questionnaire completion bonus
          ...(questionnaireCompleted && !savedStats.questionnaireCompletionBonus ? {
            totalXP: (savedStats.totalXP || 0) + 500,
            questionnaireCompletionBonus: true,
            genresExplored: Math.max(savedStats.genresExplored || 0, 5)
          } : {})
        };

        // Calculate level based on XP
        const newLevel = Math.floor(initialStats.totalXP / 1000) + 1;
        initialStats.level = Math.max(newLevel, initialStats.level || 1);

        setLocalStats(initialStats);
        setWeeklyProgress(savedWeekly);

        // Update context
        updateUserProgress({
          ...initialStats,
          stats: savedStats
        });

        // Update activity streak
        const today = new Date().toDateString();
        if (savedStats.lastActiveDate !== today) {
          updateDailyActivity(savedStats.lastActiveDate, initialStats);
        }

        logger.info('User progress initialized', {
          level: initialStats.level,
          xp: initialStats.totalXP,
          streak: initialStats.dailyStreak,
          questionnaireCompleted
        });

      } catch (error) {
        logger.error('Failed to initialize user progress', { error: error.message }, error);
      }
    };

    initializeProgress();
  }, [isAuthenticated, userId, initialAppLoadComplete, questionnaireCompleted]);

  // ===== PROGRESS UPDATE FUNCTIONS =====
  const updateStats = useCallback((newStats) => {
    if (!userId) return;

    const updatedStats = { ...localStats, ...newStats };
    setLocalStats(updatedStats);

    // Persist to localStorage
    try {
      const savedStatsKey = `movieRec_userStats_${userId}`;
      localStorage.setItem(savedStatsKey, JSON.stringify(updatedStats));
      
      // Update context
      updateUserProgress({
        ...updatedStats,
        stats: updatedStats
      });

      logger.debug('Stats updated', newStats);
    } catch (error) {
      logger.error('Failed to save stats', { error: error.message }, error);
    }
  }, [localStats, userId, updateUserProgress, logger]);

  const updateDailyActivity = useCallback((lastActiveDate, currentStats = localStats) => {
    const today = new Date();
    const todayString = today.toDateString();
    
    let newStreak = 1;
    let newXP = currentStats.totalXP || 0;

    if (lastActiveDate) {
      const lastActive = new Date(lastActiveDate);
      const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Consecutive day - increase streak
        newStreak = (currentStats.dailyStreak || 0) + 1;
        newXP += Math.min(newStreak * 10, 100); // Bonus XP for streak, capped at 100
        
        logger.userAction('Daily Streak Continued', { streak: newStreak });
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
        logger.userAction('Daily Streak Reset', { previousStreak: currentStats.dailyStreak });
      } else {
        // Same day - no change
        return;
      }
    }

    const updatedStats = {
      dailyStreak: newStreak,
      longestStreak: Math.max(currentStats.longestStreak || 0, newStreak),
      lastActiveDate: todayString,
      totalXP: newXP,
      level: Math.floor(newXP / 1000) + 1
    };

    updateStats(updatedStats);
    updateWeeklyActivity();
  }, [localStats, updateStats, logger]);

  const updateWeeklyActivity = useCallback(() => {
    if (!userId) return;

    const today = new Date().getDay();
    const newWeekly = [...weeklyProgress];
    newWeekly[today] = (newWeekly[today] || 0) + 1;
    
    setWeeklyProgress(newWeekly);

    try {
      const savedWeeklyKey = `movieRec_weeklyProgress_${userId}`;
      localStorage.setItem(savedWeeklyKey, JSON.stringify(newWeekly));
      logger.debug('Weekly progress updated', { day: today, value: newWeekly[today] });
    } catch (error) {
      logger.error('Failed to save weekly progress', { error: error.message }, error);
    }
  }, [weeklyProgress, userId, logger]);

  // ===== QUESTIONNAIRE COMPLETION EFFECT =====
  useEffect(() => {
    if (questionnaireCompleted && !localStats.questionnaireCompletionBonus) {
      const bonusXP = 500;
      const genreBonus = Math.max(completionPercentage / 10, 5);
      
      updateStats({
        totalXP: (localStats.totalXP || 0) + bonusXP,
        genresExplored: Math.max(localStats.genresExplored || 0, genreBonus),
        questionnaireCompletionBonus: true,
        level: Math.floor(((localStats.totalXP || 0) + bonusXP) / 1000) + 1
      });

      logger.userAction('Questionnaire Completion Bonus', { 
        bonusXP, 
        genreBonus,
        newLevel: Math.floor(((localStats.totalXP || 0) + bonusXP) / 1000) + 1
      });
    }
  }, [questionnaireCompleted, localStats, completionPercentage, updateStats, logger]);

  // ===== COMPUTED VALUES =====
  const xpToNextLevel = (localStats.level * 1000) - (localStats.totalXP % 1000);
  const progressToNextLevel = ((localStats.totalXP % 1000) / 1000) * 100;
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ===== RENDER HELPERS =====
  const renderCompactView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Level {localStats.level}</h3>
          <p className="text-sm text-gray-400">{localStats.totalXP.toLocaleString()} XP</p>
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${getLevelColor(localStats.level)} rounded-lg flex items-center justify-center`}>
          <TrophyIcon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Level Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Next Level</span>
          <span>{xpToNextLevel} XP to go</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressToNextLevel}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-2 rounded-full bg-gradient-to-r ${getLevelColor(localStats.level)}`}
          />
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{localStats.moviesWatched}</div>
          <div className="text-xs text-gray-400">Movies</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${getStreakColor(localStats.dailyStreak).split(' ')[0]}`}>
            {localStats.dailyStreak}
          </div>
          <div className="text-xs text-gray-400">Day Streak</div>
        </div>
      </div>
    </motion.div>
  );

  const renderFullView = () => (
    <div className="space-y-6">
      {/* User Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Level {localStats.level}</h2>
            <p className="text-gray-400">{localStats.totalXP.toLocaleString()} Total XP</p>
          </div>
          <div className={`w-16 h-16 bg-gradient-to-br ${getLevelColor(localStats.level)} rounded-xl flex items-center justify-center`}>
            <TrophyIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progress to Level {localStats.level + 1}</span>
            <span className="text-gray-400">{localStats.totalXP % 1000}/1000 XP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-3 rounded-full bg-gradient-to-r ${getLevelColor(localStats.level)}`}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {xpToNextLevel} XP until next level
          </p>
        </div>
      </motion.div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Movies Watched */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-2">
            <EyeIcon className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">{localStats.moviesWatched}</span>
          </div>
          <p className="text-sm text-gray-400">Movies Watched</p>
        </motion.div>

        {/* Movies Rated */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-2">
            <StarIcon className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold text-white">{localStats.moviesRated}</span>
          </div>
          <p className="text-sm text-gray-400">Movies Rated</p>
          {localStats.avgRating > 0 && (
            <p className="text-xs text-yellow-400">Avg: {localStats.avgRating.toFixed(1)}/10</p>
          )}
        </motion.div>

        {/* Favorites */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-2">
            <HeartIcon className="w-8 h-8 text-red-400" />
            <span className="text-2xl font-bold text-white">{localStats.favoritesCount}</span>
          </div>
          <p className="text-sm text-gray-400">Favorites</p>
        </motion.div>

        {/* Genres Explored */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-2">
            <SparklesIcon className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">{localStats.genresExplored}</span>
          </div>
          <p className="text-sm text-gray-400">Genres Explored</p>
        </motion.div>
      </div>

      {/* Streak Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`rounded-xl p-6 border-2 ${getStreakColor(localStats.dailyStreak)}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Daily Streak</h3>
            <p className="text-gray-400">Keep the momentum going!</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{localStats.dailyStreak}</div>
            <div className="text-sm text-gray-400">days</div>
          </div>
        </div>
        
        {localStats.longestStreak > localStats.dailyStreak && (
          <p className="text-sm text-gray-400">
            Longest streak: {localStats.longestStreak} days
          </p>
        )}
      </motion.div>

      {/* Weekly Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
      >
        <h3 className="text-lg font-semibold text-white mb-4">This Week's Activity</h3>
        <div className="flex items-end justify-between space-x-2">
          {weeklyProgress.map((count, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(count * 8, 4)}px` }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-sm mb-2"
                style={{ maxHeight: '60px' }}
              />
              <span className="text-xs text-gray-400">{weekDays[index]}</span>
              <span className="text-xs text-gray-500">{count}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  // ===== MAIN RENDER =====
  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProgressErrorBoundary>
      {compact ? renderCompactView() : renderFullView()}
    </ProgressErrorBoundary>
  );
};

export default UserProgressRefactored;