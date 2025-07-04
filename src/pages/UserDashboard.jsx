import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrophyIcon,
  ChartBarIcon,
  StarIcon,
  FireIcon,
  SparklesIcon,
  CalendarDaysIcon,
  CogIcon
} from '@heroicons/react/24/solid';
import UserProgress from '../components/UserProgress';
import AchievementSystem from '../components/AchievementSystem';
import DiscoveryChallenge from '../components/DiscoveryChallenge';

const UserDashboard = ({ currentUser, isAuthenticated }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState({});
  const [totalXP, setTotalXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [showChallenges, setShowChallenges] = useState(true);

  // Load user data
  useEffect(() => {
    if (isAuthenticated) {
      const savedStats = JSON.parse(localStorage.getItem('movieRec_userStats') || '{}');
      const savedXP = parseInt(localStorage.getItem('movieRec_userXP') || '0');
      
      setUserStats(savedStats);
      setTotalXP(savedXP);
      setUserLevel(Math.floor(savedXP / 1000) + 1);
    }
  }, [isAuthenticated]);

  // Handle achievement unlocked
  const handleAchievementUnlocked = (achievement) => {
    // Award XP
    const newXP = totalXP + achievement.xpReward;
    setTotalXP(newXP);
    setUserLevel(Math.floor(newXP / 1000) + 1);
    localStorage.setItem('movieRec_userXP', newXP.toString());
  };

  // Handle challenge completion
  const handleChallengeComplete = (challenge) => {
    // This is handled in the DiscoveryChallenge component
    // But we can add additional logic here if needed
  };

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'achievements', label: 'Achievements', icon: TrophyIcon },
    { id: 'challenges', label: 'Challenges', icon: StarIcon },
    { id: 'stats', label: 'Statistics', icon: ChartBarIcon }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-gray-400">Please sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {currentUser?.username || 'Movie Lover'}!
          </h1>
          <p className="text-gray-400">
            Track your progress and discover new content
          </p>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">{userLevel}</div>
            <div className="text-sm text-gray-400">Level</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">{totalXP.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total XP</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-green-400">{userStats.moviesWatched || 0}</div>
            <div className="text-sm text-gray-400">Movies</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-yellow-400">{userStats.dailyStreak || 0}</div>
            <div className="text-sm text-gray-400">Day Streak</div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex space-x-1 bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 mb-8 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Challenges Section */}
                {showChallenges && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <DiscoveryChallenge
                      onChallengeComplete={handleChallengeComplete}
                      onDismiss={() => setShowChallenges(false)}
                    />
                  </motion.div>
                )}

                {/* User Progress */}
                <UserProgress
                  currentUser={currentUser}
                  userStats={userStats}
                  totalXP={totalXP}
                  userLevel={userLevel}
                />

                {/* Quick Achievements */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-xl font-semibold text-white mb-4">Recent Achievements</h3>
                  <AchievementSystem
                    userStats={userStats}
                    onAchievementUnlocked={handleAchievementUnlocked}
                    compact={true}
                  />
                </motion.div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <AchievementSystem
                userStats={userStats}
                onAchievementUnlocked={handleAchievementUnlocked}
                showNotifications={true}
              />
            )}

            {activeTab === 'challenges' && (
              <div className="space-y-6">
                <DiscoveryChallenge
                  onChallengeComplete={handleChallengeComplete}
                />
                
                {/* Challenge History */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                >
                  <h3 className="text-xl font-semibold text-white mb-4">Challenge History</h3>
                  <p className="text-gray-400">Your completed challenges will appear here.</p>
                </motion.div>
              </div>
            )}

            {activeTab === 'stats' && (
              <UserProgress
                currentUser={currentUser}
                userStats={userStats}
                totalXP={totalXP}
                userLevel={userLevel}
                compact={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating Action Button for Settings */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl z-10"
        >
          <CogIcon className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default UserDashboard;