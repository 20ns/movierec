import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';

/**
 * User Statistics Service
 * Handles all dashboard-related data operations
 */

/**
 * Get user dashboard statistics
 */
export const getUserStats = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/stats/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get user stats');
    }
  } catch (error) {
    console.error('Error getting user stats:', error);
    
    // Return default stats on error to maintain functionality
    return {
      totalXP: 0,
      userLevel: 1,
      moviesWatched: 0,
      showsWatched: 0,
      dailyStreak: 0,
      lastActiveDate: new Date().toISOString(),
      challengeProgress: {},
      completedChallenges: [],
      activeChallenges: [],
      achievements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
};

/**
 * Update user dashboard statistics
 */
export const updateUserStats = async (token, statsUpdate) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/stats/update`, statsUpdate, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update user stats');
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
};

/**
 * Award XP to user
 */
export const awardXP = async (token, xpAmount, reason = 'General activity') => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/stats/award-xp`, {
      xpAmount,
      reason
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to award XP');
    }
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
};

/**
 * Update challenge progress
 */
export const updateChallengeProgress = async (token, challengeId, increment = 1) => {
  try {
    // Get current stats
    const currentStats = await getUserStats(token);
    
    // Update challenge progress
    const newProgress = {
      ...currentStats.challengeProgress,
      [challengeId]: (currentStats.challengeProgress[challengeId] || 0) + increment
    };

    // Update stats with new progress
    return await updateUserStats(token, {
      challengeProgress: newProgress
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    throw error;
  }
};

/**
 * Complete a challenge
 */
export const completeChallenge = async (token, challenge) => {
  try {
    // Get current stats
    const currentStats = await getUserStats(token);
    
    // Create completed challenge object
    const completedChallenge = {
      ...challenge,
      completedDate: new Date().toISOString(),
      xpAwarded: challenge.xpReward
    };

    // Update stats with completed challenge
    const updatedStats = await updateUserStats(token, {
      totalXP: currentStats.totalXP + challenge.xpReward,
      completedChallenges: [...currentStats.completedChallenges, completedChallenge],
      // Remove from active challenges if it exists
      activeChallenges: currentStats.activeChallenges.filter(c => c.id !== challenge.id)
    });

    return {
      ...updatedStats,
      completedChallenge
    };
  } catch (error) {
    console.error('Error completing challenge:', error);
    throw error;
  }
};

/**
 * Initialize active challenges for user
 */
export const initializeActiveChallenges = async (token, challenges) => {
  try {
    const currentStats = await getUserStats(token);
    
    // Only set if user doesn't have active challenges
    if (currentStats.activeChallenges.length === 0) {
      return await updateUserStats(token, {
        activeChallenges: challenges
      });
    }
    
    return currentStats;
  } catch (error) {
    console.error('Error initializing active challenges:', error);
    throw error;
  }
};

/**
 * Sync localStorage data to backend (migration helper)
 */
export const syncLocalStorageToBackend = async (token, userId) => {
  try {
    // Get data from localStorage
    const localStats = JSON.parse(localStorage.getItem('movieRec_userStats') || '{}');
    const localXP = parseInt(localStorage.getItem('movieRec_userXP') || '0');
    const localChallengeProgress = JSON.parse(localStorage.getItem('movieRec_challengeProgress') || '{}');
    const localCompletedChallenges = JSON.parse(localStorage.getItem('movieRec_completedChallenges') || '[]');
    const localActiveChallenges = JSON.parse(localStorage.getItem('movieRec_activeChallenges') || '[]');

    // Get current backend data
    const backendStats = await getUserStats(token);
    
    // Merge data (prefer backend if it has more recent data)
    const mergedStats = {
      totalXP: Math.max(backendStats.totalXP, localXP),
      moviesWatched: Math.max(backendStats.moviesWatched, localStats.moviesWatched || 0),
      showsWatched: Math.max(backendStats.showsWatched, localStats.showsWatched || 0),
      dailyStreak: Math.max(backendStats.dailyStreak, localStats.dailyStreak || 0),
      challengeProgress: { ...localChallengeProgress, ...backendStats.challengeProgress },
      completedChallenges: [
        ...backendStats.completedChallenges,
        ...localCompletedChallenges.filter(lc => 
          !backendStats.completedChallenges.find(bc => bc.id === lc.id)
        )
      ],
      activeChallenges: localActiveChallenges.length > 0 ? localActiveChallenges : backendStats.activeChallenges
    };

    // Update backend with merged data
    const updatedStats = await updateUserStats(token, mergedStats);

    // Clear localStorage after successful sync
    localStorage.removeItem('movieRec_userStats');
    localStorage.removeItem('movieRec_userXP');
    localStorage.removeItem('movieRec_challengeProgress');
    localStorage.removeItem('movieRec_completedChallenges');
    localStorage.removeItem('movieRec_activeChallenges');

    console.log('Successfully synced localStorage data to backend');
    return updatedStats;
  } catch (error) {
    console.error('Error syncing localStorage to backend:', error);
    // Don't throw error to maintain functionality
    return null;
  }
};