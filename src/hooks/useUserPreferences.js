// src/hooks/useUserPreferences.js
import { useState, useEffect, useCallback, useRef } from 'react';
import ENV_CONFIG from '../config/environment';
import { validateUserPreferences, getUserGuidance } from '../utils/userDataValidator';
import { loadPreferences, hasCompletedQuestionnaire as checkQuestionnaire } from '../services/preferenceService';
import { validateAuthState } from '../services/authService';

// Helper for logging
const logHook = (message, data) => {
  console.log(`[useUserPreferences] ${message}`, data !== undefined ? data : '');
};

// Helper function for consistent error logging
const logError = (message, error) => {
  console.error(`[useUserPreferences] ${message}`, error);
};

export default function useUserPreferences(currentUser, isAuthenticated, initialAppLoadComplete) {
  const [userPreferences, setUserPreferences] = useState(null);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [justRefreshedPrefs, setJustRefreshedPrefs] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [userGuidance, setUserGuidance] = useState(null);

  const fetchingPreferencesRef = useRef(false);
  const refreshCycleRef = useRef(0);
  const prevUserIdRef = useRef(null);
  const processingAuthChangeRef = useRef(false); // Prevent concurrent auth processing
  const fetchUserPreferencesRef = useRef(null); // Store function ref

  const fetchUserPreferences = useCallback(async (forceRefresh = false) => {
    const currentUserId = currentUser?.attributes?.sub;
    if (!isAuthenticated || !currentUserId || fetchingPreferencesRef.current) {
      logHook('Fetch Preferences skipped:', {
        isAuthenticated,
        hasUser: !!currentUser,
        isFetching: fetchingPreferencesRef.current,
      });
      if (!isAuthenticated || !currentUserId) {
        setUserPreferences(null);
        setHasCompletedQuestionnaire(false);
        setPreferencesLoading(false);
      }
      return null; // Return null when skipped
    }

    // Increment and capture the current cycle
    refreshCycleRef.current++;
    const currentRefreshCycle = refreshCycleRef.current;
    logHook('Fetching user preferences...', { userId: currentUserId, cycle: currentRefreshCycle, forceRefresh });
    fetchingPreferencesRef.current = true;
    setPreferencesLoading(true);
    setJustRefreshedPrefs(false); // Reset flag

    try {
      // Validate authentication state first
      const authState = await validateAuthState(currentUser);
      if (!authState.valid) {
        throw new Error(`Authentication validation failed: ${authState.error}`);
      }

      // Use the robust preference service
      const result = await loadPreferences(currentUser, forceRefresh);
      
      // Abort if a newer fetch cycle has started
      if (currentRefreshCycle !== refreshCycleRef.current) {
        logHook('Aborting outdated preferences fetch response handling', { cycle: currentRefreshCycle, current: refreshCycleRef.current });
        return null; // Return null when aborted
      }

      let fetchedData = null;
      if (result.success) {
        fetchedData = result.data;
        if (fetchedData) {
          logHook('Preferences loaded successfully:', {
            source: result.source,
            hasData: !!fetchedData,
            questionnaireCompleted: fetchedData.questionnaireCompleted,
            userId: currentUserId
          });
          
          const apiCompleted = fetchedData?.questionnaireCompleted || false;
          setUserPreferences(fetchedData);
          setHasCompletedQuestionnaire(apiCompleted);
          
          // Show warning if using local data
          if (result.source === 'local' && result.warning) {
            logHook('Warning: Using local data -', result.warning);
          }
          
          // Update localStorage to ensure consistency
          if (result.source === 'cloud') {
            try {
              localStorage.setItem(`questionnaire_completed_${currentUserId}`, apiCompleted ? 'true' : 'false');
            } catch (e) { logError('Error updating localStorage:', e); }
          }
        } else {
          logHook('No preferences found, user needs to complete questionnaire');
          setUserPreferences(null);
          setHasCompletedQuestionnaire(false);
          
          // Clear any stale localStorage data
          try {
            localStorage.removeItem(`questionnaire_completed_${currentUserId}`);
            localStorage.removeItem(`userPrefs_${currentUserId}`);
          } catch (e) { logError('Error clearing localStorage:', e); }
        }
      } else {
        if (result.code === 'NO_DATA_FOUND') {
          logHook('No preferences found anywhere, user needs to complete questionnaire');
          setUserPreferences(null);
          setHasCompletedQuestionnaire(false);
          
          // Clear any stale localStorage data
          try {
            localStorage.removeItem(`questionnaire_completed_${currentUserId}`);
            localStorage.removeItem(`userPrefs_${currentUserId}`);
          } catch (e) { logError('Error clearing localStorage:', e); }
        } else {
          throw new Error(result.error || 'Failed to load preferences');
        }
      }
      
      setJustRefreshedPrefs(true);
      
      // Update validation and guidance after successful fetch
      updateValidationAndGuidance(fetchedData);
      
      // Force a state update to ensure parent components are notified
      if (fetchedData && fetchedData.questionnaireCompleted) {
        logHook('Preferences loaded with completed questionnaire - triggering state update');
        // Small delay to ensure all state is updated
        setTimeout(() => {
          setJustRefreshedPrefs(true);
        }, 50);
      }
      
      return fetchedData;

    } catch (error) {
      logError('Error fetching preferences:', error);
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
      setValidationResult(null);
      setUserGuidance(null);
      // Log error but don't break the app - user can still use the application
      console.error('[useUserPreferences] Could not load preferences:', error);
      return null;
    } finally {
      // Only update loading state if this is the latest fetch cycle
      if (currentRefreshCycle === refreshCycleRef.current) {
        setPreferencesLoading(false);
        fetchingPreferencesRef.current = false;
        logHook('Preferences fetch finished.', { cycle: currentRefreshCycle });
      } else {
         logHook('Skipping final state updates for outdated fetch cycle', { cycle: currentRefreshCycle, current: refreshCycleRef.current });
      }
    }
  }, [isAuthenticated, currentUser?.attributes?.sub]);

  // Update the ref whenever the function changes
  fetchUserPreferencesRef.current = fetchUserPreferences;

  // Function to update validation and guidance based on preferences
  const updateValidationAndGuidance = useCallback((preferences) => {
    if (!preferences) return;
    
    const validation = validateUserPreferences(preferences);
    const guidance = getUserGuidance(validation);
    
    // Only update if validation result has actually changed to prevent loops
    setValidationResult(prev => {
      if (prev?.confidence !== validation.confidence || prev?.completionLevel !== validation.completionLevel) {
        return validation;
      }
      return prev;
    });
    
    setUserGuidance(prev => {
      if (prev?.progressPercent !== guidance.progressPercent || prev?.message !== guidance.message) {
        return guidance;
      }
      return prev;
    });
    
    logHook('Validation updated:', {
      completionLevel: validation.completionLevel,
      confidence: validation.confidence,
      canGenerateRecommendations: validation.canGenerateRecommendations,
      genreRatingCount: validation.genreRatingCount
    });
  }, []);

  // Function to handle questionnaire completion with proper coordination
  const handleQuestionnaireComplete = useCallback((updatedPreferences, completionData = {}) => {
    const userId = currentUser?.attributes?.sub;
    if (!userId) {
      logError('No user ID for questionnaire completion.');
      return;
    }

    logHook('Questionnaire completed, updating state', {
      hasPreferences: !!updatedPreferences,
      forceRefresh: completionData.forceRefresh,
      source: completionData.source
    });
    
    // Update state immediately for UI responsiveness
    setUserPreferences(updatedPreferences);
    setHasCompletedQuestionnaire(true);
    setJustRefreshedPrefs(true); // Mark as just refreshed for immediate UI updates
    
    // Update validation without triggering dependency
    if (updatedPreferences) {
      const validation = validateUserPreferences(updatedPreferences);
      const guidance = getUserGuidance(validation);
      setValidationResult(validation);
      setUserGuidance(guidance);
    }
    
    // Update localStorage with coordination
    try {
      localStorage.setItem(`questionnaire_completed_${userId}`, 'true');
      localStorage.setItem(`userPrefs_${userId}`, JSON.stringify(updatedPreferences));
    } catch (e) {
      logError('Error writing to localStorage:', e);
    }

    // Force refresh preferences from cloud to ensure consistency
    if (completionData.forceRefresh || completionData.source === 'questionnaire_completion') {
      logHook('Forcing preference refresh after questionnaire completion');
      setTimeout(() => {
        fetchUserPreferencesRef.current?.(true); // Force refresh to sync with API
      }, 200); // Reduced delay for faster UI response
    }

    return true;
  }, [currentUser?.attributes?.sub]);

  // Function to safely update preferences with validation
  const updatePreferences = useCallback((newPreferences) => {
    const userId = currentUser?.attributes?.sub;
    if (!userId) return;

    setUserPreferences(newPreferences);
    
    // Update validation inline to avoid circular dependency
    if (newPreferences) {
      const validation = validateUserPreferences(newPreferences);
      const guidance = getUserGuidance(validation);
      setValidationResult(validation);
      setUserGuidance(guidance);
    }
    
    // Update localStorage
    try {
      localStorage.setItem(`userPrefs_${userId}`, JSON.stringify(newPreferences));
    } catch (e) {
      logError('Error updating localStorage:', e);
    }
  }, [currentUser?.attributes?.sub]);

  // Effect: Initial Fetch and User Change Detection with coordination
  useEffect(() => {
    const currentUserId = currentUser?.attributes?.sub;

    // User changed or logged in (with race condition protection)
    if (prevUserIdRef.current !== currentUserId && !processingAuthChangeRef.current) {
      // Set processing flag to prevent concurrent processing
      processingAuthChangeRef.current = true;
      
      logHook(`User changed from ${prevUserIdRef.current} to ${currentUserId}. Resetting state and fetching.`);
      
      // Reset all state
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
      setValidationResult(null);
      setUserGuidance(null);
      setPreferencesLoading(false);
      fetchingPreferencesRef.current = false;
      refreshCycleRef.current = 0;
      prevUserIdRef.current = currentUserId;

      if (isAuthenticated && currentUserId && initialAppLoadComplete) {
        fetchUserPreferencesRef.current?.();
      } else if (!isAuthenticated) {
         // Explicitly clear state on logout
         setUserPreferences(null);
         setHasCompletedQuestionnaire(false);
         setValidationResult(null);
         setUserGuidance(null);
         setPreferencesLoading(false);
      }
      
      // Reset processing flag after a short delay
      setTimeout(() => {
        processingAuthChangeRef.current = false;
      }, 500);
    }
    // Initial load fetch for already authenticated user
    else if (isAuthenticated && currentUserId && initialAppLoadComplete && !fetchingPreferencesRef.current) {
       // Only fetch if we don't have preferences loaded yet
       if (!userPreferences) {
         logHook('Triggering initial preference fetch for existing session.');
         fetchUserPreferencesRef.current?.();
       }
    }

  }, [currentUser, isAuthenticated, initialAppLoadComplete]);

  // Effect: Update validation when preferences change
  useEffect(() => {
    if (userPreferences) {
      updateValidationAndGuidance(userPreferences);
    }
  }, [userPreferences, updateValidationAndGuidance]);


  // Add a force refresh function for external use
  const forceRefreshPreferences = useCallback(() => {
    logHook('Force refresh triggered externally');
    fetchUserPreferencesRef.current?.(true);
  }, []);

  return {
    userPreferences,
    hasCompletedQuestionnaire,
    preferencesLoading,
    validationResult,
    userGuidance,
    fetchUserPreferences,
    justRefreshedPrefs,
    handleQuestionnaireComplete,
    updatePreferences,
    setHasCompletedQuestionnaire,
    setUserPreferences,
    forceRefreshPreferences,
    // Computed properties for convenience
    completionPercentage: validationResult?.confidence || 0,
    canGenerateRecommendations: validationResult?.canGenerateRecommendations || false,
    hasBasicProfile: validationResult?.hasBasicProfile || false,
    genreRatingCount: validationResult?.genreRatingCount || 0,
    completionLevel: validationResult?.completionLevel || 'none'
  };
}