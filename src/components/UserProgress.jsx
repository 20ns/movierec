import React, { useState, useEffect } from 'react';
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

// Helper function to get streak color
const getStreakColor = (streak) => {
  if (streak >= 30) return 'text-orange-400 bg-orange-500/20';
  if (streak >= 14) return 'text-purple-400 bg-purple-500/20';
  if (streak >= 7) return 'text-blue-400 bg-blue-500/20';
  if (streak >= 3) return 'text-green-400 bg-green-500/20';
  return 'text-gray-400 bg-gray-500/20';
};

// Helper function to get level color
const getLevelColor = (level) => {
  if (level >= 10) return 'from-orange-500 to-red-500';
  if (level >= 7) return 'from-purple-500 to-pink-500';
  if (level >= 5) return 'from-blue-500 to-cyan-500';
  if (level >= 3) return 'from-green-500 to-emerald-500';
  return 'from-gray-500 to-gray-600';
};

const UserProgress = ({ 
  currentUser,
  userStats = {},
  totalXP = 0,
  userLevel = 1,
  compact = false 
}) => {
  const [stats, setStats] = useState({
    moviesWatched: 0,
    moviesRated: 0,
    favoritesCount: 0,
    watchlistCount: 0,
    genresExplored: 0,
    dailyStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    joinDate: null,
    totalTimeSpent: 0, // in minutes
    avgRating: 0,
    hiddenGemsWatched: 0,
    recommendationsFollowed: 0,
    ...userStats
  });

  const [weeklyProgress, setWeeklyProgress] = useState([0, 0, 0, 0, 0, 0, 0]);

  // Initialize stats from localStorage
  useEffect(() => {
    const savedStats = JSON.parse(localStorage.getItem('movieRec_userStats') || '{}');
    const savedWeekly = JSON.parse(localStorage.getItem('movieRec_weeklyProgress') || '[0, 0, 0, 0, 0, 0, 0]');
    
    setStats(prev => ({ ...prev, ...savedStats }));
    setWeeklyProgress(savedWeekly);
    
    // Update last active date
    const today = new Date().toDateString();
    if (savedStats.lastActiveDate !== today) {
      updateStats({ lastActiveDate: today });
      updateDailyStreak(savedStats.lastActiveDate);
    }
  }, []);

  // Update user stats
  const updateStats = (newStats) => {
    setStats(prev => {
      const updated = { ...prev, ...newStats };
      localStorage.setItem('movieRec_userStats', JSON.stringify(updated));
      return updated;
    });
  };

  // Update daily streak
  const updateDailyStreak = (lastActiveDate) => {
    if (!lastActiveDate) {
      updateStats({ dailyStreak: 1 });
      return;
    }

    const today = new Date();
    const lastActive = new Date(lastActiveDate);
    const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      const newStreak = stats.dailyStreak + 1;
      updateStats({ 
        dailyStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak)
      });
    } else if (daysDiff > 1) {
      // Streak broken
      updateStats({ dailyStreak: 1 });
    }
  };

  // Update weekly progress
  const updateWeeklyProgress = () => {
    const today = new Date().getDay();
    const newWeekly = [...weeklyProgress];
    newWeekly[today] += 1;
    setWeeklyProgress(newWeekly);
    localStorage.setItem('movieRec_weeklyProgress', JSON.stringify(newWeekly));
  };

  // Calculate XP to next level
  const xpToNextLevel = (userLevel * 1000) - (totalXP % 1000);
  const progressToNextLevel = ((totalXP % 1000) / 1000) * 100;

  // Get week day names
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Level {userLevel}</h3>
            <p className="text-sm text-gray-400">{totalXP.toLocaleString()} XP</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
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
              className={`h-2 rounded-full bg-gradient-to-r ${getLevelColor(userLevel)}`}
            />
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{stats.moviesWatched}</div>
            <div className="text-xs text-gray-400">Movies</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getStreakColor(stats.dailyStreak).split(' ')[0]}`}>
              {stats.dailyStreak}
            </div>
            <div className="text-xs text-gray-400">Day Streak</div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Level {userLevel}</h2>
            <p className="text-gray-400">{totalXP.toLocaleString()} Total XP</p>
          </div>
          <div className={`w-16 h-16 bg-gradient-to-br ${getLevelColor(userLevel)} rounded-xl flex items-center justify-center`}>
            <TrophyIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progress to Level {userLevel + 1}</span>
            <span className="text-gray-400">{totalXP % 1000}/1000 XP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-3 rounded-full bg-gradient-to-r ${getLevelColor(userLevel)}`}
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
            <span className="text-2xl font-bold text-white">{stats.moviesWatched}</span>
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
            <span className="text-2xl font-bold text-white">{stats.moviesRated}</span>
          </div>
          <p className="text-sm text-gray-400">Movies Rated</p>
          {stats.avgRating > 0 && (
            <p className="text-xs text-yellow-400">Avg: {stats.avgRating.toFixed(1)}/10</p>
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
            <span className="text-2xl font-bold text-white">{stats.favoritesCount}</span>
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
            <span className="text-2xl font-bold text-white">{stats.genresExplored}</span>
          </div>
          <p className="text-sm text-gray-400">Genres Explored</p>
        </motion.div>
      </div>

      {/* Streak Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`rounded-xl p-6 border-2 ${getStreakColor(stats.dailyStreak)}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Daily Streak</h3>
            <p className="text-gray-400">Keep the momentum going!</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{stats.dailyStreak}</div>
            <div className="text-sm text-gray-400">days</div>
          </div>
        </div>
        
        {stats.longestStreak > stats.dailyStreak && (
          <p className="text-sm text-gray-400">
            Longest streak: {stats.longestStreak} days
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

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hidden Gems */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center"
        >
          <div className="text-2xl mb-2">💎</div>
          <div className="text-xl font-bold text-white">{stats.hiddenGemsWatched}</div>
          <p className="text-sm text-gray-400">Hidden Gems Found</p>
        </motion.div>

        {/* Recommendations Followed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center"
        >
          <ChartBarIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-white">{stats.recommendationsFollowed}</div>
          <p className="text-sm text-gray-400">Recommendations Followed</p>
        </motion.div>

        {/* Time Spent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center"
        >
          <ClockIcon className="w-8 h-8 text-orange-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-white">
            {Math.floor(stats.totalTimeSpent / 60)}h
          </div>
          <p className="text-sm text-gray-400">Time Spent</p>
        </motion.div>
      </div>
    </div>
  );
};

export default UserProgress;