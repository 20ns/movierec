import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrophyIcon,
  StarIcon,
  FireIcon,
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  GiftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';

// Challenge types and configurations
const CHALLENGE_TYPES = {
  EXPLORE_GENRE: {
    id: 'explore_genre',
    title: 'Genre Explorer',
    description: 'Watch movies from 3 different genres',
    icon: SparklesIcon,
    color: 'purple',
    maxProgress: 3,
    xpReward: 150,
    badgeReward: 'genre_explorer'
  },
  RATING_STREAK: {
    id: 'rating_streak',
    title: 'Rating Streak',
    description: 'Rate 5 movies in a row',
    icon: StarIcon,
    color: 'yellow',
    maxProgress: 5,
    xpReward: 200,
    badgeReward: 'rating_master'
  },
  DISCOVERY_CHAMPION: {
    id: 'discovery_champion',
    title: 'Discovery Champion',
    description: 'Watch 10 recommended movies',
    icon: TrophyIcon,
    color: 'gold',
    maxProgress: 10,
    xpReward: 500,
    badgeReward: 'discovery_champion'
  },
  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Watch 3 movies this weekend',
    icon: FireIcon,
    color: 'red',
    maxProgress: 3,
    xpReward: 100,
    badgeReward: 'weekend_warrior',
    timeLimit: 72 // hours
  },
  HIDDEN_GEMS: {
    id: 'hidden_gems',
    title: 'Hidden Gem Hunter',
    description: 'Watch 5 movies with less than 10k ratings',
    icon: GiftIcon,
    color: 'green',
    maxProgress: 5,
    xpReward: 300,
    badgeReward: 'gem_hunter'
  }
};

// Achievement badges
const ACHIEVEMENT_BADGES = {
  genre_explorer: {
    name: 'Genre Explorer',
    description: 'Explored multiple genres',
    rarity: 'common',
    icon: '🎭'
  },
  rating_master: {
    name: 'Rating Master',
    description: 'Consistent movie rater',
    rarity: 'uncommon',
    icon: '⭐'
  },
  discovery_champion: {
    name: 'Discovery Champion',
    description: 'Embraced recommendations',
    rarity: 'rare',
    icon: '🏆'
  },
  weekend_warrior: {
    name: 'Weekend Warrior',
    description: 'Weekend movie marathoner',
    rarity: 'common',
    icon: '🔥'
  },
  gem_hunter: {
    name: 'Hidden Gem Hunter',
    description: 'Discovered underrated movies',
    rarity: 'epic',
    icon: '💎'
  }
};

const DiscoveryChallenge = ({ 
  challengeData, 
  onChallengeComplete,
  onDismiss,
  isVisible = true 
}) => {
  const [currentChallenges, setCurrentChallenges] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [showReward, setShowReward] = useState(null);
  const [userLevel, setUserLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);

  // Initialize challenges
  useEffect(() => {
    const initializeChallenges = () => {
      // Get active challenges from localStorage or create new ones
      const savedChallenges = JSON.parse(localStorage.getItem('movieRec_activeChallenges') || '[]');
      const savedProgress = JSON.parse(localStorage.getItem('movieRec_challengeProgress') || '{}');
      const savedXP = parseInt(localStorage.getItem('movieRec_userXP') || '0');
      
      if (savedChallenges.length === 0) {
        // Generate 3 random challenges
        const challengeKeys = Object.keys(CHALLENGE_TYPES);
        const randomChallenges = [];
        
        for (let i = 0; i < 3; i++) {
          const randomIndex = Math.floor(Math.random() * challengeKeys.length);
          const challengeKey = challengeKeys[randomIndex];
          challengeKeys.splice(randomIndex, 1); // Remove to avoid duplicates
          
          randomChallenges.push({
            ...CHALLENGE_TYPES[challengeKey],
            startDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });
        }
        
        setCurrentChallenges(randomChallenges);
        localStorage.setItem('movieRec_activeChallenges', JSON.stringify(randomChallenges));
      } else {
        setCurrentChallenges(savedChallenges);
      }
      
      setUserProgress(savedProgress);
      setTotalXP(savedXP);
      setUserLevel(Math.floor(savedXP / 1000) + 1);
    };

    initializeChallenges();
  }, []);

  // Update progress for a challenge
  const updateChallengeProgress = (challengeId, increment = 1) => {
    setUserProgress(prev => {
      const newProgress = { ...prev };
      newProgress[challengeId] = (newProgress[challengeId] || 0) + increment;
      
      // Save to localStorage
      localStorage.setItem('movieRec_challengeProgress', JSON.stringify(newProgress));
      
      // Check if challenge is completed
      const challenge = currentChallenges.find(c => c.id === challengeId);
      if (challenge && newProgress[challengeId] >= challenge.maxProgress) {
        completeChallenge(challenge);
      }
      
      return newProgress;
    });
  };

  // Complete a challenge
  const completeChallenge = (challenge) => {
    // Award XP and badge
    const newXP = totalXP + challenge.xpReward;
    setTotalXP(newXP);
    setUserLevel(Math.floor(newXP / 1000) + 1);
    
    // Add to completed challenges
    const completedChallenge = {
      ...challenge,
      completedDate: new Date().toISOString(),
      xpAwarded: challenge.xpReward
    };
    
    setCompletedChallenges(prev => [...prev, completedChallenge]);
    
    // Remove from active challenges
    setCurrentChallenges(prev => prev.filter(c => c.id !== challenge.id));
    
    // Show reward popup
    setShowReward(completedChallenge);
    
    // Update localStorage
    localStorage.setItem('movieRec_userXP', newXP.toString());
    localStorage.setItem('movieRec_completedChallenges', JSON.stringify([...completedChallenges, completedChallenge]));
    localStorage.setItem('movieRec_activeChallenges', JSON.stringify(currentChallenges.filter(c => c.id !== challenge.id)));
    
    // Notify parent component
    onChallengeComplete && onChallengeComplete(completedChallenge);
    
    // Auto-hide reward after 5 seconds
    setTimeout(() => setShowReward(null), 5000);
  };

  // Get color classes for challenge
  const getColorClasses = (color) => {
    const colors = {
      purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
      gold: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
      red: 'bg-red-500/20 border-red-500/30 text-red-400',
      green: 'bg-green-500/20 border-green-500/30 text-green-400'
    };
    return colors[color] || colors.purple;
  };

  // Calculate progress percentage
  const getProgressPercentage = (challengeId, maxProgress) => {
    const progress = userProgress[challengeId] || 0;
    return Math.min((progress / maxProgress) * 100, 100);
  };

  if (!isVisible || currentChallenges.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-12 max-w-7xl mx-auto px-4"
      >
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrophyIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Discovery Challenges</h3>
              <p className="text-sm text-gray-400">Level {userLevel} • {totalXP} XP</p>
            </div>
          </div>
          
          {onDismiss && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onDismiss}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* XP Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress to Level {userLevel + 1}</span>
            <span className="text-sm text-gray-400">{totalXP % 1000}/1000 XP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(totalXP % 1000) / 10}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Active Challenges */}
        <div className="space-y-4">
          {currentChallenges.map((challenge) => {
            const IconComponent = challenge.icon;
            const progress = userProgress[challenge.id] || 0;
            const progressPercentage = getProgressPercentage(challenge.id, challenge.maxProgress);
            
            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl border-2 ${getColorClasses(challenge.color)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center">
                      {(() => {
                        if (typeof IconComponent === 'string') {
                          return <span className="text-lg">{IconComponent}</span>;
                        }
                        if (typeof IconComponent === 'function') {
                          return <IconComponent className="w-5 h-5" />;
                        }
                        if (React.isValidElement(IconComponent)) {
                          return IconComponent;
                        }
                        // Fallback for any other type
                        return <div className="w-5 h-5 bg-purple-500 rounded" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{challenge.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">{challenge.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400">
                            {progress}/{challenge.maxProgress}
                          </span>
                          <span className="text-xs text-gray-400">
                            +{challenge.xpReward} XP
                          </span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`h-2 rounded-full bg-gradient-to-r ${
                              challenge.color === 'purple' ? 'from-purple-500 to-purple-400' :
                              challenge.color === 'yellow' ? 'from-yellow-500 to-yellow-400' :
                              challenge.color === 'gold' ? 'from-amber-500 to-amber-400' :
                              challenge.color === 'red' ? 'from-red-500 to-red-400' :
                              'from-green-500 to-green-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {progress >= challenge.maxProgress && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center text-green-400"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reward Popup */}
        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center border border-gray-700"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrophyIcon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">Challenge Complete!</h3>
                <p className="text-gray-400 mb-4">{showReward.title}</p>
                
                <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">+{showReward.xpReward}</div>
                      <div className="text-sm text-gray-400">XP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl">
                        {ACHIEVEMENT_BADGES[showReward.badgeReward]?.icon || '🏆'}
                      </div>
                      <div className="text-sm text-gray-400">Badge</div>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowReward(null)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  Continue
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

export default DiscoveryChallenge;