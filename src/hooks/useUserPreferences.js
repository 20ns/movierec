// src/hooks/useUserPreferences.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ToastManager';
import ENV_CONFIG from '../config/environment';
import { validateUserPreferences, getUserGuidance } from '../utils/userDataValidator';

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
  const { showToast } = useToast();

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
      // Safely extract access token with proper error handling
      if (!currentUser?.signInUserSession?.accessToken?.jwtToken) {
        throw new Error('No valid access token available');
      }
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const response = await fetch(ENV_CONFIG.getApiUrl('/user/preferences'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        mode: 'cors',
      });

      // Abort if a newer fetch cycle has started
      if (currentRefreshCycle !== refreshCycleRef.current) {
        logHook('Aborting outdated preferences fetch response handling', { cycle: currentRefreshCycle, current: refreshCycleRef.current });
        return null; // Return null when aborted
      }

      let fetchedData = null;
      if (!response.ok) {
        if (response.status === 404) {
          logHook('Preferences fetch returned 404 (No preferences saved yet)');
          setUserPreferences(null);
          setHasCompletedQuestionnaire(false);
          try { localStorage.removeItem(`questionnaire_completed_${currentUserId}`); } catch (e) {}
        } else {
          throw new Error(`Preferences API Error: Status ${response.status}`);
        }
      } else {
        fetchedData = await response.json();
        logHook('Preferences fetched successfully:', fetchedData);
        const apiCompleted = fetchedData?.questionnaireCompleted || false;
        setUserPreferences(fetchedData);
        setHasCompletedQuestionnaire(apiCompleted);
        try { localStorage.setItem(`questionnaire_completed_${currentUserId}`, apiCompleted ? 'true' : 'false'); } catch (e) { logError('Error writing to localStorage:', e); }
      }
      setJustRefreshedPrefs(true);
      
      // Update validation and guidance after successful fetch
      updateValidationAndGuidance(fetchedData);
      
      return fetchedData;

    } catch (error) {
      logError('Error fetching preferences:', error);
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
      setValidationResult(null);
      setUserGuidance(null);
      showToast({ title: 'Error', message: 'Could not load your preferences.', type: 'error' });
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
  }, [isAuthenticated, currentUser, showToast]);

  // Function to update validation and guidance based on preferences
  const updateValidationAndGuidance = useCallback((preferences) => {
    const validation = validateUserPreferences(preferences);
    const guidance = getUserGuidance(validation);
    
    setValidationResult(validation);
    setUserGuidance(guidance);
    
    logHook('Validation updated:', {
      completionLevel: validation.completionLevel,
      confidence: validation.confidence,
      canGenerateRecommendations: validation.canGenerateRecommendations,
      genreRatingCount: validation.genreRatingCount
    });
  }, []);

  // Function to handle questionnaire completion with proper coordination
  const handleQuestionnaireComplete = useCallback((updatedPreferences) => {
    const userId = currentUser?.attributes?.sub;
    if (!userId) {
      logError('No user ID for questionnaire completion.');
      return;
    }

    logHook('Questionnaire completed, updating state');
    
    // Update state immediately for UI responsiveness
    setUserPreferences(updatedPreferences);
    setHasCompletedQuestionnaire(true);
    updateValidationAndGuidance(updatedPreferences);
    
    // Update localStorage with coordination
    try {
      localStorage.setItem(`questionnaire_completed_${userId}`, 'true');
      localStorage.setItem(`userPrefs_${userId}`, JSON.stringify(updatedPreferences));
    } catch (e) {
      logError('Error writing to localStorage:', e);
    }

    // Trigger a fresh fetch to ensure API is in sync (but don't wait for it)
    setTimeout(() => {
      fetchUserPreferences(true); // Force refresh to sync with API
    }, 100);

    return true;
  }, [currentUser, fetchUserPreferences, updateValidationAndGuidance]);

  // Function to safely update preferences with validation
  const updatePreferences = useCallback((newPreferences) => {
    const userId = currentUser?.attributes?.sub;
    if (!userId) return;

    setUserPreferences(newPreferences);
    updateValidationAndGuidance(newPreferences);
    
    // Update localStorage
    try {
      localStorage.setItem(`userPrefs_${userId}`, JSON.stringify(newPreferences));
    } catch (e) {
      logError('Error updating localStorage:', e);
    }
  }, [currentUser, updateValidationAndGuidance]);

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
        fetchUserPreferences();
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
    else if (isAuthenticated && currentUserId && initialAppLoadComplete && !userPreferences && !preferencesLoading && !fetchingPreferencesRef.current) {
       logHook('Triggering initial preference fetch for existing session.');
       fetchUserPreferences();
    }

  }, [currentUser, isAuthenticated, initialAppLoadComplete, fetchUserPreferences, userPreferences, preferencesLoading]);

  // Effect: Update validation when preferences change
  useEffect(() => {
    if (userPreferences) {
      updateValidationAndGuidance(userPreferences);
    }
  }, [userPreferences, updateValidationAndGuidance]);


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
    // Computed properties for convenience
    completionPercentage: validationResult?.confidence || 0,
    canGenerateRecommendations: validationResult?.canGenerateRecommendations || false,
    hasBasicProfile: validationResult?.hasBasicProfile || false,
    genreRatingCount: validationResult?.genreRatingCount || 0,
    completionLevel: validationResult?.completionLevel || 'none'
  };
}