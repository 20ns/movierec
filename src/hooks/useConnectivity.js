// src/hooks/useConnectivity.js
// React hook for connectivity monitoring

import { useState, useEffect } from 'react';
import backgroundSyncService from '../services/backgroundSyncService';

/**
 * Hook for monitoring network connectivity and sync status
 * @returns {Object} Connectivity status and sync information
 */
export const useConnectivity = () => {
  const [connectivity, setConnectivity] = useState(() => 
    backgroundSyncService.getConnectivityStatus()
  );

  useEffect(() => {
    const unsubscribe = backgroundSyncService.addConnectivityListener(() => {
      setConnectivity(backgroundSyncService.getConnectivityStatus());
    });

    // Update status immediately
    setConnectivity(backgroundSyncService.getConnectivityStatus());

    return unsubscribe;
  }, []);

  return {
    ...connectivity,
    // Convenience methods
    queuePreferenceSave: (preferences, isPartial, priority) => 
      backgroundSyncService.queuePreferenceSave(preferences, isPartial, priority),
    queueSync: (priority) => 
      backgroundSyncService.queueSync(priority),
    forceSync: () => 
      backgroundSyncService.forceSync()
  };
};

export default useConnectivity;