// src/hooks/useUserPreferences.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ToastManager'; // Assuming ToastManager provides this

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
  const [justRefreshedPrefs, setJustRefreshedPrefs] = useState(false); // Flag for post-refresh actions

  const fetchingPreferencesRef = useRef(false);
  const refreshCycleRef = useRef(0); // Track refresh cycles
  const prevUserIdRef = useRef(null);
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
      const token = currentUser.signInUserSession.accessToken.jwtToken;
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_INVOKE_URL}/user/preferences`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      setJustRefreshedPrefs(true); // Set flag after successful fetch/handling
      return fetchedData; // Return the fetched data

    } catch (error) {
      logError('Error fetching preferences:', error);
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
      showToast({ title: 'Error', message: 'Could not load your preferences.', type: 'error' });
      return null; // Return null on error
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
  }, [isAuthenticated, currentUser, showToast]); // Dependencies for the fetch function itself

  // Effect: Initial Fetch and User Change Detection
  useEffect(() => {
    const currentUserId = currentUser?.attributes?.sub;

    // User changed or logged in
    if (prevUserIdRef.current !== currentUserId) {
      logHook(`User changed from ${prevUserIdRef.current} to ${currentUserId}. Resetting state and fetching.`);
      setUserPreferences(null);
      setHasCompletedQuestionnaire(false);
      setPreferencesLoading(false); // Reset loading state
      fetchingPreferencesRef.current = false; // Reset fetching flag
      refreshCycleRef.current = 0; // Reset cycle count
      prevUserIdRef.current = currentUserId;

      if (isAuthenticated && currentUserId && initialAppLoadComplete) {
        fetchUserPreferences();
      } else if (!isAuthenticated) {
         // Explicitly clear state on logout
         setUserPreferences(null);
         setHasCompletedQuestionnaire(false);
         setPreferencesLoading(false);
      }
    }
    // Initial load fetch for already authenticated user
    else if (isAuthenticated && currentUserId && initialAppLoadComplete && !userPreferences && !preferencesLoading && !fetchingPreferencesRef.current) {
       logHook('Triggering initial preference fetch for existing session.');
       fetchUserPreferences();
    }

  }, [currentUser, isAuthenticated, initialAppLoadComplete, fetchUserPreferences, userPreferences, preferencesLoading]); // Added userPreferences, preferencesLoading to dependencies


  return {
    userPreferences,
    hasCompletedQuestionnaire,
    preferencesLoading,
    fetchUserPreferences, // Expose the function to allow manual refresh
    justRefreshedPrefs,
    setHasCompletedQuestionnaire, // Allow manual setting after questionnaire completion
    setUserPreferences, // Allow manual setting if needed elsewhere
  };
}