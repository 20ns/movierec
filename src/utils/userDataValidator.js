/**
 * Robust User Data Validation System
 * 
 * This module provides comprehensive validation for user data to ensure
 * a smooth recommendation experience with minimal failure points.
 */

// Minimum thresholds for reliable recommendations
const VALIDATION_THRESHOLDS = {
  // Minimum number of genre ratings (out of 20 available genres)
  MIN_GENRE_RATINGS: 3,
  
  // Minimum completion percentage for questionnaire
  MIN_QUESTIONNAIRE_COMPLETION: 0.3, // 30%
  
  // Essential fields that must be present
  ESSENTIAL_FIELDS: [
    'questionnaireCompleted',
    'contentType',
    'genreRatings'
  ],
  
  // Recommended fields for better recommendations
  RECOMMENDED_FIELDS: [
    'favoriteContent',
    'moodPreferences',
    'dealBreakers',
    'internationalContentPreference'
  ]
};

/**
 * Validates if user preferences are sufficient for recommendations
 * @param {Object} preferences - User preferences object
 * @returns {Object} Validation result with status and details
 */
export function validateUserPreferences(preferences) {
  const result = {
    isValid: false,
    completionLevel: 'none', // none, minimal, good, excellent
    missingEssential: [],
    missingRecommended: [],
    genreRatingCount: 0,
    hasBasicProfile: false,
    canGenerateRecommendations: false,
    userGuidance: '',
    confidence: 0 // 0-100
  };

  // Handle null/undefined preferences
  if (!preferences || typeof preferences !== 'object') {
    result.userGuidance = "Complete your taste profile to get personalized recommendations";
    return result;
  }

  // Flatten nested preferences if they exist (handle the nesting issue)
  let flatPrefs = { ...preferences };
  if (preferences.preferences && typeof preferences.preferences === 'object') {
    flatPrefs = { ...preferences, ...preferences.preferences };
    delete flatPrefs.preferences;
  }

  // Check essential fields
  VALIDATION_THRESHOLDS.ESSENTIAL_FIELDS.forEach(field => {
    if (!flatPrefs[field] || (Array.isArray(flatPrefs[field]) && flatPrefs[field].length === 0)) {
      result.missingEssential.push(field);
    }
  });

  // Check recommended fields
  VALIDATION_THRESHOLDS.RECOMMENDED_FIELDS.forEach(field => {
    if (!flatPrefs[field] || (Array.isArray(flatPrefs[field]) && flatPrefs[field].length === 0)) {
      result.missingRecommended.push(field);
    }
  });

  // Analyze genre ratings
  if (flatPrefs.genreRatings && typeof flatPrefs.genreRatings === 'object') {
    const ratings = Object.values(flatPrefs.genreRatings).filter(rating => 
      typeof rating === 'number' && rating >= 1 && rating <= 10
    );
    result.genreRatingCount = ratings.length;
  }

  // Check if questionnaire is marked as completed
  const questionnaireCompleted = flatPrefs.questionnaireCompleted === true;
  
  // Check if user has basic profile (minimum viable data)
  result.hasBasicProfile = (
    questionnaireCompleted &&
    flatPrefs.contentType &&
    result.genreRatingCount >= VALIDATION_THRESHOLDS.MIN_GENRE_RATINGS
  );

  // Determine completion level and confidence
  if (result.missingEssential.length === 0 && result.genreRatingCount >= VALIDATION_THRESHOLDS.MIN_GENRE_RATINGS) {
    result.canGenerateRecommendations = true;
    
    if (result.missingRecommended.length === 0) {
      result.completionLevel = 'excellent';
      result.confidence = 95;
      result.isValid = true;
      result.userGuidance = "Your profile is complete! Enjoy personalized recommendations.";
    } else if (result.missingRecommended.length <= 2) {
      result.completionLevel = 'good';
      result.confidence = 80;
      result.isValid = true;
      result.userGuidance = "Great profile! Add more details for even better recommendations.";
    } else {
      result.completionLevel = 'minimal';
      result.confidence = 60;
      result.isValid = true;
      result.userGuidance = "Basic profile complete. Consider adding more preferences.";
    }
  } else {
    result.canGenerateRecommendations = false;
    
    if (result.genreRatingCount < VALIDATION_THRESHOLDS.MIN_GENRE_RATINGS) {
      result.userGuidance = `Rate at least ${VALIDATION_THRESHOLDS.MIN_GENRE_RATINGS} genres to get recommendations`;
    } else if (!questionnaireCompleted) {
      result.userGuidance = "Complete the questionnaire to get personalized recommendations";
    } else {
      result.userGuidance = "Complete your profile to unlock personalized recommendations";
    }
  }

  return result;
}

/**
 * Gets user guidance based on validation results
 * @param {Object} validation - Validation result from validateUserPreferences
 * @returns {Object} User guidance with actions and messages
 */
export function getUserGuidance(validation) {
  const guidance = {
    title: '',
    message: '',
    primaryAction: null,
    secondaryAction: null,
    showProgress: false,
    progressPercent: 0
  };

  if (validation.canGenerateRecommendations) {
    guidance.title = "Personalized Recommendations";
    guidance.message = validation.userGuidance;
    guidance.primaryAction = {
      text: "Refresh Recommendations",
      action: "refresh",
      variant: "primary"
    };
    
    if (validation.completionLevel !== 'excellent') {
      guidance.secondaryAction = {
        text: "Improve Profile",
        action: "questionnaire",
        variant: "secondary"
      };
    }
    
    guidance.showProgress = true;
    guidance.progressPercent = validation.confidence;
  } else {
    guidance.title = "Complete Your Profile";
    guidance.message = validation.userGuidance;
    guidance.primaryAction = {
      text: "Complete Questionnaire",
      action: "questionnaire",
      variant: "primary"
    };
    
    guidance.showProgress = true;
    guidance.progressPercent = Math.max(20, (validation.genreRatingCount / VALIDATION_THRESHOLDS.MIN_GENRE_RATINGS) * 100);
  }

  return guidance;
}

/**
 * Determines if recommendations should be attempted based on user data
 * @param {Object} preferences - User preferences
 * @param {Array} favorites - User favorites
 * @param {Array} watchlist - User watchlist
 * @returns {boolean} Whether to attempt recommendation generation
 */
export function shouldAttemptRecommendations(preferences, favorites = [], watchlist = []) {
  const validation = validateUserPreferences(preferences);
  
  // Always attempt if validation passes
  if (validation.canGenerateRecommendations) {
    return true;
  }
  
  // Also attempt if user has significant favorites/watchlist activity
  // This handles cases where questionnaire isn't complete but user has behavioral data
  const hasSignificantActivity = (favorites.length + watchlist.length) >= 5;
  
  return hasSignificantActivity;
}

/**
 * Creates a fallback recommendation strategy when primary recommendations fail
 * @param {Object} preferences - User preferences
 * @param {Array} favorites - User favorites  
 * @param {Array} watchlist - User watchlist
 * @returns {Object} Fallback strategy details
 */
export function createFallbackStrategy(preferences, favorites = [], watchlist = []) {
  const validation = validateUserPreferences(preferences);
  
  return {
    shouldUseTrending: validation.genreRatingCount === 0,
    shouldUseGenreBased: validation.genreRatingCount > 0,
    shouldUseSimilarity: favorites.length > 0,
    priorityGenres: validation.genreRatingCount > 0 ? 
      Object.entries(preferences?.genreRatings || {})
        .filter(([_, rating]) => rating >= 7)
        .map(([genreId, _]) => parseInt(genreId))
        .slice(0, 3) : [],
    fallbackMessage: validation.userGuidance
  };
}