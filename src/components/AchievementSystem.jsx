import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrophyIcon,
  StarIcon,
  SparklesIcon,
  LockClosedIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  HeartIcon,
  EyeIcon,
  FireIcon
} from '@heroicons/react/24/solid';

// Achievement definitions
const ACHIEVEMENTS = {
  // Viewing Achievements
  first_watch: {
    id: 'first_watch',
    name: 'First Watch',
    description: 'Watch your first movie',
    icon: EyeIcon,
    rarity: 'common',
    xpReward: 50,
    category: 'viewing',
    requirement: 1
  },
  movie_marathon: {
    id: 'movie_marathon',
    name: 'Movie Marathon',
    description: 'Watch 10 movies',
    icon: FireIcon,
    rarity: 'uncommon',
    xpReward: 200,
    category: 'viewing',
    requirement: 10
  },
  cinephile: {
    id: 'cinephile',
    name: 'Cinephile',
    description: 'Watch 50 movies',
    icon: TrophyIcon,
    rarity: 'rare',
    xpReward: 500,
    category: 'viewing',
    requirement: 50
  },
  
  // Rating Achievements
  first_rating: {
    id: 'first_rating',
    name: 'First Rating',
    description: 'Rate your first movie',
    icon: StarIcon,
    rarity: 'common',
    xpReward: 25,
    category: 'rating',
    requirement: 1
  },
  rating_enthusiast: {
    id: 'rating_enthusiast',
    name: 'Rating Enthusiast',
    description: 'Rate 25 movies',
    icon: ChartBarIcon,
    rarity: 'uncommon',
    xpReward: 150,
    category: 'rating',
    requirement: 25
  },
  
  // Discovery Achievements
  genre_explorer: {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Watch movies from 5 different genres',
    icon: SparklesIcon,
    rarity: 'uncommon',
    xpReward: 150,
    category: 'discovery',
    requirement: 5
  },
  hidden_gem_hunter: {
    id: 'hidden_gem_hunter',
    name: 'Hidden Gem Hunter',
    description: 'Watch 10 movies with less than 1000 ratings',
    icon: '💎',
    rarity: 'rare',
    xpReward: 300,
    category: 'discovery',
    requirement: 10
  },
  
  // Social Achievements
  first_favorite: {
    id: 'first_favorite',
    name: 'First Favorite',
    description: 'Add your first movie to favorites',
    icon: HeartIcon,
    rarity: 'common',
    xpReward: 25,
    category: 'social',
    requirement: 1
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Have 20 movies in your favorites',
    icon: '📚',
    rarity: 'rare',
    xpReward: 250,
    category: 'social',
    requirement: 20
  },
  
  // Streak Achievements
  daily_streak_7: {
    id: 'daily_streak_7',
    name: 'Week Warrior',
    description: 'Use MovieRec 7 days in a row',
    icon: CalendarDaysIcon,
    rarity: 'uncommon',
    xpReward: 100,
    category: 'streak',
    requirement: 7
  },
  daily_streak_30: {
    id: 'daily_streak_30',
    name: 'Monthly Master',
    description: 'Use MovieRec 30 days in a row',
    icon: '🔥',
    rarity: 'epic',
    xpReward: 500,
    category: 'streak',
    requirement: 30
  }
};

// Rarity colors and styles
const RARITY_STYLES = {
  common: {
    bg: 'bg-gray-600/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    glow: 'shadow-gray-500/20'
  },
  uncommon: {
    bg: 'bg-green-600/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    glow: 'shadow-green-500/20'
  },
  rare: {
    bg: 'bg-blue-600/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20'
  },
  epic: {
    bg: 'bg-purple-600/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20'
  },
  legendary: {
    bg: 'bg-orange-600/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/20'
  }
};

const AchievementSystem = ({ 
  userStats = {},
  onAchievementUnlocked,
  showNotifications = true,
  compact = false 
}) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
  const [recentlyUnlocked, setRecentlyUnlocked] = useState([]);
  const [showToast, setShowToast] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Initialize achievements from localStorage
  useEffect(() => {
    const savedAchievements = JSON.parse(localStorage.getItem('movieRec_achievements') || '[]');
    setUnlockedAchievements(new Set(savedAchievements));
  }, []);

  // Check for newly unlocked achievements
  useEffect(() => {
    const checkAchievements = () => {
      const newlyUnlocked = [];
      
      Object.values(ACHIEVEMENTS).forEach(achievement => {
        if (!unlockedAchievements.has(achievement.id)) {
          let isUnlocked = false;
          
          // Check different types of achievements
          switch (achievement.category) {
            case 'viewing':
              isUnlocked = (userStats.moviesWatched || 0) >= achievement.requirement;
              break;
            case 'rating':
              isUnlocked = (userStats.moviesRated || 0) >= achievement.requirement;
              break;
            case 'discovery':
              if (achievement.id === 'genre_explorer') {
                isUnlocked = (userStats.genresExplored || 0) >= achievement.requirement;
              } else if (achievement.id === 'hidden_gem_hunter') {
                isUnlocked = (userStats.hiddenGemsWatched || 0) >= achievement.requirement;
              }
              break;
            case 'social':
              if (achievement.id === 'first_favorite' || achievement.id === 'collector') {
                isUnlocked = (userStats.favoritesCount || 0) >= achievement.requirement;
              }
              break;
            case 'streak':
              isUnlocked = (userStats.dailyStreak || 0) >= achievement.requirement;
              break;
          }
          
          if (isUnlocked) {
            newlyUnlocked.push(achievement);
          }
        }
      });
      
      // Update unlocked achievements
      if (newlyUnlocked.length > 0) {
        const newUnlockedSet = new Set([...unlockedAchievements, ...newlyUnlocked.map(a => a.id)]);
        setUnlockedAchievements(newUnlockedSet);
        setRecentlyUnlocked(prev => [...prev, ...newlyUnlocked]);
        
        // Save to localStorage
        localStorage.setItem('movieRec_achievements', JSON.stringify([...newUnlockedSet]));
        
        // Show toast notification for first achievement
        if (showNotifications && newlyUnlocked.length > 0) {
          setShowToast(newlyUnlocked[0]);
          setTimeout(() => setShowToast(null), 5000);
        }
        
        // Notify parent component
        newlyUnlocked.forEach(achievement => {
          onAchievementUnlocked && onAchievementUnlocked(achievement);
        });
      }
    };
    
    checkAchievements();
  }, [userStats, unlockedAchievements, onAchievementUnlocked, showNotifications]);

  // Get progress for an achievement
  const getAchievementProgress = (achievement) => {
    switch (achievement.category) {
      case 'viewing':
        return Math.min(userStats.moviesWatched || 0, achievement.requirement);
      case 'rating':
        return Math.min(userStats.moviesRated || 0, achievement.requirement);
      case 'discovery':
        if (achievement.id === 'genre_explorer') {
          return Math.min(userStats.genresExplored || 0, achievement.requirement);
        } else if (achievement.id === 'hidden_gem_hunter') {
          return Math.min(userStats.hiddenGemsWatched || 0, achievement.requirement);
        }
        return 0;
      case 'social':
        return Math.min(userStats.favoritesCount || 0, achievement.requirement);
      case 'streak':
        return Math.min(userStats.dailyStreak || 0, achievement.requirement);
      default:
        return 0;
    }
  };

  // Filter achievements by category
  const categories = ['all', 'viewing', 'rating', 'discovery', 'social', 'streak'];
  const filteredAchievements = Object.values(ACHIEVEMENTS).filter(achievement => 
    selectedCategory === 'all' || achievement.category === selectedCategory
  );

  // Get rarity styles
  const getRarityStyles = (rarity) => RARITY_STYLES[rarity] || RARITY_STYLES.common;

  if (compact) {
    // Compact view for mobile or sidebar
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Achievements</h3>
          <div className="text-sm text-gray-400">
            {unlockedAchievements.size}/{Object.keys(ACHIEVEMENTS).length}
          </div>
        </div>
        
        <div className="grid grid-cols-6 gap-2">
          {Object.values(ACHIEVEMENTS).slice(0, 6).map(achievement => {
            const isUnlocked = unlockedAchievements.has(achievement.id);
            const styles = getRarityStyles(achievement.rarity);
            const IconComponent = achievement.icon;
            
            return (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: 1.05 }}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center ${
                  isUnlocked ? styles.bg + ' ' + styles.border : 'bg-gray-800 border-gray-700'
                }`}
              >
                {isUnlocked ? (
                  typeof IconComponent === 'string' ? (
                    <span className="text-lg">{IconComponent}</span>
                  ) : (
                    <IconComponent className="w-4 h-4 text-white" />
                  )
                ) : (
                  <LockClosedIcon className="w-4 h-4 text-gray-600" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Achievements</h2>
          <p className="text-gray-400 mt-1">
            {unlockedAchievements.size} of {Object.keys(ACHIEVEMENTS).length} unlocked
          </p>
        </div>
        
        {/* Progress Ring */}
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-gray-700"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={175.93}
              strokeDashoffset={175.93 - (175.93 * unlockedAchievements.size) / Object.keys(ACHIEVEMENTS).length}
              className="text-purple-500"
              initial={{ strokeDashoffset: 175.93 }}
              animate={{ strokeDashoffset: 175.93 - (175.93 * unlockedAchievements.size) / Object.keys(ACHIEVEMENTS).length }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {Math.round((unlockedAchievements.size / Object.keys(ACHIEVEMENTS).length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
        {categories.map(category => (
          <motion.button
            key={category}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </motion.button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(achievement => {
          const isUnlocked = unlockedAchievements.has(achievement.id);
          const progress = getAchievementProgress(achievement);
          const progressPercentage = Math.min((progress / achievement.requirement) * 100, 100);
          const styles = getRarityStyles(achievement.rarity);
          const IconComponent = achievement.icon;
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                isUnlocked 
                  ? styles.bg + ' ' + styles.border + ' shadow-lg ' + styles.glow
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isUnlocked ? styles.bg : 'bg-gray-700'
                }`}>
                  {isUnlocked ? (
                    typeof IconComponent === 'string' ? (
                      <span className="text-xl">{IconComponent}</span>
                    ) : (
                      <IconComponent className="w-6 h-6 text-white" />
                    )
                  ) : (
                    <LockClosedIcon className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                
                {isUnlocked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-400"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </motion.div>
                )}
              </div>
              
              <h3 className={`font-semibold mb-1 ${
                isUnlocked ? 'text-white' : 'text-gray-400'
              }`}>
                {achievement.name}
              </h3>
              
              <p className={`text-sm mb-3 ${
                isUnlocked ? 'text-gray-300' : 'text-gray-500'
              }`}>
                {achievement.description}
              </p>
              
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  isUnlocked ? styles.bg + ' ' + styles.text : 'bg-gray-700 text-gray-400'
                }`}>
                  {achievement.rarity.toUpperCase()}
                </span>
                <span className={`text-xs ${
                  isUnlocked ? 'text-green-400' : 'text-gray-500'
                }`}>
                  +{achievement.xpReward} XP
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-gray-400">{progress}/{achievement.requirement}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-2 rounded-full ${
                      isUnlocked 
                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                        : 'bg-gradient-to-r from-gray-600 to-gray-500'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className="fixed bottom-4 right-4 z-50 bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-2xl max-w-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Achievement Unlocked!</h4>
                <p className="text-sm text-gray-400">{showToast.name}</p>
                <p className="text-xs text-green-400">+{showToast.xpReward} XP</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementSystem;