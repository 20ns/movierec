// src/hooks/useLoadingState.js
// React hooks for loading state management

import { useState, useEffect, useCallback, useRef } from 'react';
import loadingStateManager, { LOADING_OPERATIONS, LOADING_PRIORITIES } from '../services/loadingStateService';

/**
 * Hook for global loading state
 * @returns {Object} Global loading state and control functions
 */
export const useGlobalLoadingState = () => {
  const [globalState, setGlobalState] = useState(() => 
    loadingStateManager.getGlobalState()
  );

  useEffect(() => {
    const unsubscribe = loadingStateManager.addListener(setGlobalState);
    return unsubscribe;
  }, []);

  return globalState;
};

/**
 * Hook for component-specific loading state
 * @param {string} componentName - Name of the component
 * @returns {Object} Component loading state and control functions
 */
export const useComponentLoadingState = (componentName) => {
  const [componentState, setComponentState] = useState(() =>
    loadingStateManager.getComponentState(componentName)
  );

  const activeOperations = useRef(new Set());

  useEffect(() => {
    const unsubscribe = loadingStateManager.addListener(() => {
      setComponentState(loadingStateManager.getComponentState(componentName));
    });

    return unsubscribe;
  }, [componentName]);

  // Cleanup operations when component unmounts
  useEffect(() => {
    return () => {
      loadingStateManager.clearComponentOperations(componentName);
    };
  }, [componentName]);

  const startLoading = useCallback((operationType, options = {}) => {
    const operationId = loadingStateManager.startLoading(operationType, {
      ...options,
      component: componentName
    });
    
    activeOperations.current.add(operationId);
    return operationId;
  }, [componentName]);

  const completeLoading = useCallback((operationId, result) => {
    loadingStateManager.completeLoading(operationId, result);
    activeOperations.current.delete(operationId);
  }, []);

  const failLoading = useCallback((operationId, error) => {
    loadingStateManager.failLoading(operationId, error);
    activeOperations.current.delete(operationId);
  }, []);

  const clearOperations = useCallback(() => {
    loadingStateManager.clearComponentOperations(componentName);
    activeOperations.current.clear();
  }, [componentName]);

  return {
    ...componentState,
    startLoading,
    completeLoading,
    failLoading,
    clearOperations
  };
};

/**
 * Hook for managing a single loading operation
 * @param {string} componentName - Name of the component
 * @param {string} operationType - Type of operation
 * @returns {Object} Loading operation state and control functions
 */
export const useLoadingOperation = (componentName, operationType) => {
  const [operationId, setOperationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const { startLoading, completeLoading, failLoading } = useComponentLoadingState(componentName);

  const start = useCallback(async (options = {}) => {
    if (isLoading) return operationId;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const id = startLoading(operationType, {
      priority: LOADING_PRIORITIES.NORMAL,
      ...options
    });

    setOperationId(id);
    return id;
  }, [isLoading, operationId, startLoading, operationType]);

  const complete = useCallback((operationResult = null) => {
    if (!operationId || !isLoading) return;

    completeLoading(operationId, operationResult);
    setIsLoading(false);
    setResult(operationResult);
    setOperationId(null);
  }, [operationId, isLoading, completeLoading]);

  const fail = useCallback((operationError) => {
    if (!operationId || !isLoading) return;

    failLoading(operationId, operationError);
    setIsLoading(false);
    setError(operationError);
    setOperationId(null);
  }, [operationId, isLoading, failLoading]);

  const reset = useCallback(() => {
    if (operationId && isLoading) {
      failLoading(operationId, 'Operation cancelled');
    }
    
    setOperationId(null);
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, [operationId, isLoading, failLoading]);

  return {
    operationId,
    isLoading,
    error,
    result,
    start,
    complete,
    fail,
    reset
  };
};

/**
 * Hook for coordinated animations
 * @param {string} componentName - Name of the component
 * @returns {Function} Queue animation function
 */
export const useLoadingAnimations = (componentName) => {
  const queueAnimation = useCallback((animationId, animationFunction, options = {}) => {
    return loadingStateManager.queueAnimation(animationId, animationFunction, {
      ...options,
      component: componentName
    });
  }, [componentName]);

  return { queueAnimation };
};

/**
 * Hook for async operations with automatic loading state management
 * @param {string} componentName - Name of the component
 * @param {string} operationType - Type of operation
 * @returns {Object} Async operation handler
 */
export const useAsyncOperation = (componentName, operationType) => {
  const { start, complete, fail, isLoading, error, result, reset } = useLoadingOperation(
    componentName, 
    operationType
  );

  const execute = useCallback(async (asyncFunction, options = {}) => {
    try {
      const operationId = await start(options);
      const operationResult = await asyncFunction();
      complete(operationResult);
      return operationResult;
    } catch (error) {
      fail(error);
      throw error;
    }
  }, [start, complete, fail]);

  const executeWithRetry = useCallback(async (asyncFunction, options = {}) => {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await execute(asyncFunction, {
          ...options,
          metadata: { ...options.metadata, attempt, maxRetries }
        });
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          reset();
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    throw lastError;
  }, [execute, reset]);

  return {
    execute,
    executeWithRetry,
    isLoading,
    error,
    result,
    reset
  };
};

/**
 * Hook for debounced loading operations
 * @param {string} componentName - Name of the component
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced operation function
 */
export const useDebouncedLoading = (componentName, delay = 300) => {
  const timeoutRef = useRef(null);
  const { startLoading, completeLoading, failLoading } = useComponentLoadingState(componentName);

  const debouncedOperation = useCallback((operationType, asyncFunction, options = {}) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      let operationId;
      
      try {
        operationId = startLoading(operationType, options);
        const result = await asyncFunction();
        completeLoading(operationId, result);
        return result;
      } catch (error) {
        if (operationId) {
          failLoading(operationId, error);
        }
        throw error;
      }
    }, delay);
  }, [delay, startLoading, completeLoading, failLoading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedOperation;
};

// ===== EXPORTS =====
export default {
  useGlobalLoadingState,
  useComponentLoadingState,
  useLoadingOperation,
  useLoadingAnimations,
  useAsyncOperation,
  useDebouncedLoading
};