// src/hooks/useErrorRecovery.js
// React hooks for error recovery and user-friendly error handling

import { useState, useEffect, useCallback, useRef } from 'react';
import errorRecoveryService, { ERROR_TYPES, ERROR_SEVERITY } from '../services/errorRecoveryService';
import { useConnectivity } from './useConnectivity';

/**
 * Hook for global error recovery state
 * @returns {Object} Error recovery state and control functions
 */
export const useErrorRecovery = () => {
  const [errors, setErrors] = useState([]);
  const [activeError, setActiveError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    const unsubscribe = errorRecoveryService.addListener((errorData) => {
      const { errorRecord, userMessage } = errorData;
      
      setErrors(prev => {
        // Remove duplicates and keep only recent errors
        const filtered = prev.filter(e => e.errorId !== userMessage.errorId);
        return [userMessage, ...filtered].slice(0, 10);
      });

      // Set as active error if it's high severity and no other active error
      if (errorRecord.classification.severity >= ERROR_SEVERITY.HIGH && !activeError) {
        setActiveError(userMessage);
      }
    });

    // Initial statistics
    setStatistics(errorRecoveryService.getRecoveryStatistics());

    return unsubscribe;
  }, [activeError]);

  const handleError = useCallback((error, options = {}) => {
    return errorRecoveryService.handleError(error, options);
  }, []);

  const retryError = useCallback(async (errorId) => {
    try {
      const success = await errorRecoveryService.retryError(errorId);
      if (success) {
        // Remove error from active errors
        setErrors(prev => prev.filter(e => e.errorId !== errorId));
        if (activeError?.errorId === errorId) {
          setActiveError(null);
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to retry error:', error);
      return false;
    }
  }, [activeError]);

  const dismissError = useCallback((errorId) => {
    setErrors(prev => prev.filter(e => e.errorId !== errorId));
    if (activeError?.errorId === errorId) {
      setActiveError(null);
    }
  }, [activeError]);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
    setActiveError(null);
    errorRecoveryService.clearErrorHistory();
  }, []);

  const refreshStatistics = useCallback(() => {
    setStatistics(errorRecoveryService.getRecoveryStatistics());
  }, []);

  return {
    errors,
    activeError,
    statistics,
    handleError,
    retryError,
    dismissError,
    clearAllErrors,
    refreshStatistics,
    setActiveError
  };
};

/**
 * Hook for component-specific error handling
 * @param {string} componentName - Name of the component
 * @returns {Object} Component error handling functions
 */
export const useComponentErrorHandler = (componentName) => {
  const [localErrors, setLocalErrors] = useState([]);
  const connectivity = useConnectivity();
  const errorCountRef = useRef(0);

  const handleError = useCallback((error, options = {}) => {
    errorCountRef.current += 1;
    
    const errorRecord = errorRecoveryService.handleError(error, {
      component: componentName,
      userFriendly: true,
      autoRecover: true,
      ...options
    });

    if (errorRecord) {
      const userMessage = errorRecoveryService.getUserFriendlyMessage(errorRecord);
      
      setLocalErrors(prev => {
        const filtered = prev.filter(e => e.errorId !== userMessage.errorId);
        return [userMessage, ...filtered].slice(0, 5);
      });

      return userMessage;
    }

    return null;
  }, [componentName]);

  const retryLastError = useCallback(async () => {
    if (localErrors.length === 0) return false;
    
    const lastError = localErrors[0];
    try {
      const success = await errorRecoveryService.retryError(lastError.errorId);
      if (success) {
        setLocalErrors(prev => prev.filter(e => e.errorId !== lastError.errorId));
      }
      return success;
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      return false;
    }
  }, [localErrors]);

  const clearErrors = useCallback(() => {
    setLocalErrors([]);
  }, []);

  const handleAsyncOperation = useCallback(async (asyncFn, options = {}) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, {
        ...options,
        context: {
          ...options.context,
          isOnline: connectivity.isOnline,
          errorCount: errorCountRef.current
        }
      });
      throw error;
    }
  }, [handleError, connectivity.isOnline]);

  return {
    localErrors,
    errorCount: errorCountRef.current,
    handleError,
    retryLastError,
    clearErrors,
    handleAsyncOperation,
    hasErrors: localErrors.length > 0,
    lastError: localErrors[0] || null
  };
};

/**
 * Hook for async operations with automatic error handling and recovery
 * @param {string} componentName - Name of the component
 * @param {Object} options - Configuration options
 * @returns {Object} Async operation handler
 */
export const useAsyncWithErrorRecovery = (componentName, options = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const errorHandler = useComponentErrorHandler(componentName);
  
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    autoRetry = false
  } = options;

  const execute = useCallback(async (asyncFn, operationOptions = {}) => {
    setIsLoading(true);
    setError(null);
    
    let lastError;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const result = await asyncFn();
        setData(result);
        setIsLoading(false);
        
        // Clear any previous errors on success
        if (error) {
          setError(null);
          errorHandler.clearErrors();
        }
        
        return result;
      } catch (err) {
        lastError = err;
        attempts++;
        
        const userError = errorHandler.handleError(err, {
          ...operationOptions,
          context: {
            ...operationOptions.context,
            attempt: attempts,
            maxRetries
          }
        });

        if (attempts < maxRetries && (autoRetry || shouldAutoRetry(err))) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          continue;
        } else {
          // Final failure
          setError(userError);
          setIsLoading(false);
          break;
        }
      }
    }
    
    throw lastError;
  }, [maxRetries, retryDelay, autoRetry, error, errorHandler]);

  const retry = useCallback(() => {
    if (error) {
      return errorHandler.retryLastError();
    }
    return Promise.resolve(false);
  }, [error, errorHandler]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
    errorHandler.clearErrors();
  }, [errorHandler]);

  return {
    execute,
    retry,
    reset,
    isLoading,
    error,
    data,
    hasError: !!error
  };
};

/**
 * Hook for form validation with error recovery
 * @param {Object} validationRules - Validation rules
 * @param {string} componentName - Component name for error context
 * @returns {Object} Form validation handler
 */
export const useFormValidation = (validationRules, componentName) => {
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(true);
  const errorHandler = useComponentErrorHandler(componentName);

  const validate = useCallback((data) => {
    const newErrors = {};
    let hasErrors = false;

    try {
      for (const [field, rules] of Object.entries(validationRules)) {
        const value = data[field];
        
        for (const rule of rules) {
          if (!rule.test(value)) {
            newErrors[field] = rule.message;
            hasErrors = true;
            break;
          }
        }
      }

      setErrors(newErrors);
      setIsValid(!hasErrors);

      return { isValid: !hasErrors, errors: newErrors };
    } catch (validationError) {
      errorHandler.handleError(validationError, {
        context: { 
          operation: 'form_validation',
          field: 'unknown',
          validationRules: Object.keys(validationRules)
        }
      });
      
      return { isValid: false, errors: { general: 'Validation error occurred' } };
    }
  }, [validationRules, errorHandler]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setIsValid(true);
  }, []);

  const setFieldError = useCallback((field, message) => {
    setErrors(prev => ({ ...prev, [field]: message }));
    setIsValid(false);
  }, []);

  return {
    errors,
    isValid,
    validate,
    clearErrors,
    setFieldError,
    hasErrors: Object.keys(errors).length > 0
  };
};

/**
 * Hook for network-aware error handling
 * @param {string} componentName - Component name
 * @returns {Object} Network-aware error handler
 */
export const useNetworkErrorHandler = (componentName) => {
  const connectivity = useConnectivity();
  const errorHandler = useComponentErrorHandler(componentName);
  const [offlineActions, setOfflineActions] = useState([]);

  const handleNetworkError = useCallback((error, operation) => {
    if (!connectivity.isOnline) {
      // Queue operation for when connection is restored
      const action = {
        id: Date.now(),
        operation,
        timestamp: new Date().toISOString(),
        error: error.message
      };
      
      setOfflineActions(prev => [...prev, action]);
      
      return errorHandler.handleError(new Error('Action queued for when connection is restored'), {
        type: ERROR_TYPES.CONNECTION_LOST,
        context: { queuedAction: action.id }
      });
    } else {
      return errorHandler.handleError(error, {
        context: { networkOperation: true }
      });
    }
  }, [connectivity.isOnline, errorHandler]);

  // Process queued actions when connection is restored
  useEffect(() => {
    if (connectivity.isOnline && offlineActions.length > 0) {
      // Process offline actions
      const processActions = async () => {
        for (const action of offlineActions) {
          try {
            await action.operation();
          } catch (error) {
            errorHandler.handleError(error, {
              context: { 
                retriedOfflineAction: action.id,
                originalTimestamp: action.timestamp
              }
            });
          }
        }
        setOfflineActions([]);
      };

      processActions();
    }
  }, [connectivity.isOnline, offlineActions, errorHandler]);

  return {
    handleNetworkError,
    offlineActions,
    isOnline: connectivity.isOnline,
    clearOfflineActions: () => setOfflineActions([])
  };
};

// ===== UTILITY FUNCTIONS =====

/**
 * Determine if an error should trigger automatic retry
 * @param {Error} error - The error to check
 * @returns {boolean} Whether to auto-retry
 */
const shouldAutoRetry = (error) => {
  const retryableErrors = [
    'NetworkError',
    'TimeoutError',
    'fetch',
    '502',
    '503',
    '504'
  ];

  const errorMessage = error?.message || error?.toString() || '';
  return retryableErrors.some(pattern => errorMessage.includes(pattern));
};

/**
 * Create error boundary hook for React components
 * @param {string} componentName - Component name
 * @returns {Object} Error boundary functions
 */
export const useErrorBoundary = (componentName) => {
  const errorHandler = useComponentErrorHandler(componentName);
  
  const captureError = useCallback((error, errorInfo) => {
    errorHandler.handleError(error, {
      type: ERROR_TYPES.RENDERING_ERROR,
      context: {
        errorInfo,
        componentStack: errorInfo?.componentStack
      }
    });
  }, [errorHandler]);

  return { captureError };
};

// ===== EXPORTS =====
export default {
  useErrorRecovery,
  useComponentErrorHandler,
  useAsyncWithErrorRecovery,
  useFormValidation,
  useNetworkErrorHandler,
  useErrorBoundary
};