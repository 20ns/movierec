// src/services/loadingStateService.js
// Centralized loading state management for coordinated UI experiences

import { createComponentLogger, performanceMonitor } from '../utils/centralizedLogger';

const logger = createComponentLogger('LoadingState');

// ===== CONSTANTS =====
const DEFAULT_ANIMATION_DURATION = 300;
const LOADING_TIMEOUT = 30000; // 30 seconds max loading time
const DEBOUNCE_DELAY = 100; // Debounce rapid state changes

// ===== LOADING STATE TYPES =====
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

export const LOADING_PRIORITIES = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4
};

// ===== LOADING OPERATION TYPES =====
export const LOADING_OPERATIONS = {
  // Authentication
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_REFRESH: 'auth_refresh',
  
  // User Data
  USER_PREFERENCES_LOAD: 'user_preferences_load',
  USER_PREFERENCES_SAVE: 'user_preferences_save',
  USER_PROGRESS_LOAD: 'user_progress_load',
  
  // Questionnaire
  QUESTIONNAIRE_LOAD: 'questionnaire_load',
  QUESTIONNAIRE_SAVE: 'questionnaire_save',
  QUESTIONNAIRE_SUBMIT: 'questionnaire_submit',
  
  // Recommendations
  RECOMMENDATIONS_LOAD: 'recommendations_load',
  RECOMMENDATIONS_REFRESH: 'recommendations_refresh',
  
  // Data Sync
  SYNC_PREFERENCES: 'sync_preferences',
  SYNC_BACKGROUND: 'sync_background',
  
  // General
  PAGE_LOAD: 'page_load',
  COMPONENT_INIT: 'component_init'
};

// ===== LOADING STATE MANAGER =====
class LoadingStateManager {
  constructor() {
    this.operations = new Map();
    this.listeners = [];
    this.globalState = LOADING_STATES.IDLE;
    this.debugMode = process.env.NODE_ENV === 'development';
    this.animationQueue = [];
    this.debounceTimers = new Map();
    
    this.initializeGlobalErrorHandling();
    
    logger.info('Loading state manager initialized', {
      debugMode: this.debugMode
    });
  }

  initializeGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection detected', {
        reason: event.reason?.message || 'Unknown error'
      });
      
      this.setGlobalState(LOADING_STATES.ERROR, {
        error: 'An unexpected error occurred',
        source: 'unhandled_rejection'
      });
    });
  }

  // ===== OPERATION MANAGEMENT =====
  
  /**
   * Start a loading operation
   * @param {string} operationType - Type of operation from LOADING_OPERATIONS
   * @param {Object} options - Loading options
   * @returns {string} Operation ID
   */
  startLoading(operationType, options = {}) {
    const operationId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = performanceMonitor.startTiming(`loading_${operationType}`);
    
    const operation = {
      id: operationId,
      type: operationType,
      state: LOADING_STATES.LOADING,
      startTime: Date.now(),
      priority: options.priority || LOADING_PRIORITIES.NORMAL,
      timeout: options.timeout || LOADING_TIMEOUT,
      component: options.component || 'unknown',
      metadata: options.metadata || {},
      timer,
      timeoutHandle: null
    };

    // Set timeout for operation
    operation.timeoutHandle = setTimeout(() => {
      this.timeoutOperation(operationId);
    }, operation.timeout);

    this.operations.set(operationId, operation);
    this.updateGlobalState();
    this.notifyListeners();

    logger.debug('Loading operation started', {
      operationId,
      type: operationType,
      component: operation.component,
      priority: operation.priority
    });

    return operationId;
  }

  /**
   * Complete a loading operation successfully
   * @param {string} operationId - Operation ID
   * @param {Object} result - Operation result data
   */
  completeLoading(operationId, result = {}) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      logger.warn('Attempted to complete unknown operation', { operationId });
      return;
    }

    this.clearOperationTimeout(operation);
    operation.timer.end();
    operation.state = LOADING_STATES.SUCCESS;
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.result = result;

    this.operations.set(operationId, operation);
    this.updateGlobalState();
    
    // Schedule operation cleanup
    this.scheduleOperationCleanup(operationId);
    
    this.notifyListeners();

    logger.debug('Loading operation completed', {
      operationId,
      type: operation.type,
      duration: operation.duration,
      component: operation.component
    });
  }

  /**
   * Fail a loading operation
   * @param {string} operationId - Operation ID
   * @param {Error|string} error - Error information
   */
  failLoading(operationId, error) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      logger.warn('Attempted to fail unknown operation', { operationId });
      return;
    }

    this.clearOperationTimeout(operation);
    operation.timer.end();
    operation.state = LOADING_STATES.ERROR;
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.error = typeof error === 'string' ? error : error?.message || 'Unknown error';

    this.operations.set(operationId, operation);
    this.updateGlobalState();
    
    this.scheduleOperationCleanup(operationId);
    this.notifyListeners();

    logger.error('Loading operation failed', {
      operationId,
      type: operation.type,
      duration: operation.duration,
      error: operation.error,
      component: operation.component
    }, error);
  }

  /**
   * Timeout a loading operation
   * @param {string} operationId - Operation ID
   */
  timeoutOperation(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation || operation.state !== LOADING_STATES.LOADING) {
      return;
    }

    operation.timer.end();
    operation.state = LOADING_STATES.TIMEOUT;
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.error = 'Operation timed out';

    this.operations.set(operationId, operation);
    this.updateGlobalState();
    
    this.scheduleOperationCleanup(operationId);
    this.notifyListeners();

    logger.warn('Loading operation timed out', {
      operationId,
      type: operation.type,
      duration: operation.duration,
      timeout: operation.timeout,
      component: operation.component
    });
  }

  clearOperationTimeout(operation) {
    if (operation.timeoutHandle) {
      clearTimeout(operation.timeoutHandle);
      operation.timeoutHandle = null;
    }
  }

  scheduleOperationCleanup(operationId, delay = 5000) {
    setTimeout(() => {
      this.operations.delete(operationId);
      this.updateGlobalState();
      this.notifyListeners();
    }, delay);
  }

  // ===== STATE MANAGEMENT =====
  
  updateGlobalState() {
    const activeOperations = Array.from(this.operations.values())
      .filter(op => op.state === LOADING_STATES.LOADING);

    if (activeOperations.length === 0) {
      this.setGlobalState(LOADING_STATES.IDLE);
      return;
    }

    // Check for high priority or critical operations
    const highPriorityOps = activeOperations.filter(
      op => op.priority >= LOADING_PRIORITIES.HIGH
    );

    if (highPriorityOps.length > 0) {
      this.setGlobalState(LOADING_STATES.LOADING, {
        priority: 'high',
        activeOperations: highPriorityOps.length,
        operations: highPriorityOps.map(op => ({
          type: op.type,
          component: op.component,
          duration: Date.now() - op.startTime
        }))
      });
    } else {
      this.setGlobalState(LOADING_STATES.LOADING, {
        priority: 'normal',
        activeOperations: activeOperations.length,
        operations: activeOperations.map(op => ({
          type: op.type,
          component: op.component,
          duration: Date.now() - op.startTime
        }))
      });
    }
  }

  setGlobalState(state, metadata = {}) {
    const previousState = this.globalState;
    this.globalState = state;

    if (this.debugMode && previousState !== state) {
      logger.debug('Global loading state changed', {
        from: previousState,
        to: state,
        metadata
      });
    }
  }

  // ===== COMPONENT-SPECIFIC HELPERS =====

  /**
   * Get loading state for a specific component
   * @param {string} componentName - Component name
   * @returns {Object} Component loading state
   */
  getComponentState(componentName) {
    const componentOps = Array.from(this.operations.values())
      .filter(op => op.component === componentName);

    const loadingOps = componentOps.filter(op => op.state === LOADING_STATES.LOADING);
    const hasErrors = componentOps.some(op => op.state === LOADING_STATES.ERROR);
    const hasTimeouts = componentOps.some(op => op.state === LOADING_STATES.TIMEOUT);

    return {
      isLoading: loadingOps.length > 0,
      hasErrors,
      hasTimeouts,
      activeOperations: loadingOps.length,
      operations: componentOps.map(op => ({
        id: op.id,
        type: op.type,
        state: op.state,
        duration: op.endTime ? op.duration : Date.now() - op.startTime,
        error: op.error
      }))
    };
  }

  /**
   * Clear all operations for a component
   * @param {string} componentName - Component name
   */
  clearComponentOperations(componentName) {
    const opsToRemove = [];
    
    for (const [id, operation] of this.operations.entries()) {
      if (operation.component === componentName) {
        this.clearOperationTimeout(operation);
        operation.timer.end();
        opsToRemove.push(id);
      }
    }

    opsToRemove.forEach(id => this.operations.delete(id));
    this.updateGlobalState();
    this.notifyListeners();

    logger.debug('Cleared operations for component', {
      component: componentName,
      operationsCleared: opsToRemove.length
    });
  }

  // ===== ANIMATION COORDINATION =====

  /**
   * Queue an animation to coordinate with loading states
   * @param {string} animationId - Unique animation identifier
   * @param {Function} animation - Animation function
   * @param {Object} options - Animation options
   */
  queueAnimation(animationId, animation, options = {}) {
    const animationItem = {
      id: animationId,
      animation,
      priority: options.priority || LOADING_PRIORITIES.NORMAL,
      delay: options.delay || 0,
      component: options.component || 'unknown',
      timestamp: Date.now()
    };

    this.animationQueue.push(animationItem);
    
    // Sort by priority
    this.animationQueue.sort((a, b) => b.priority - a.priority);

    logger.debug('Animation queued', {
      animationId,
      component: animationItem.component,
      priority: animationItem.priority
    });

    this.processAnimationQueue();
  }

  async processAnimationQueue() {
    if (this.animationQueue.length === 0) return;

    const animation = this.animationQueue.shift();
    
    try {
      await new Promise(resolve => setTimeout(resolve, animation.delay));
      await animation.animation();
      
      logger.debug('Animation completed', {
        animationId: animation.id,
        component: animation.component
      });
    } catch (error) {
      logger.error('Animation failed', {
        animationId: animation.id,
        error: error.message
      }, error);
    }

    // Process next animation
    if (this.animationQueue.length > 0) {
      setTimeout(() => this.processAnimationQueue(), 50);
    }
  }

  // ===== LISTENER MANAGEMENT =====

  addListener(callback) {
    this.listeners.push(callback);
    
    // Immediately notify with current state
    callback(this.getGlobalState());
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    const state = this.getGlobalState();
    
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.warn('Listener error', { error: error.message });
      }
    });
  }

  // ===== PUBLIC API =====

  getGlobalState() {
    const activeOperations = Array.from(this.operations.values())
      .filter(op => op.state === LOADING_STATES.LOADING);

    const recentErrors = Array.from(this.operations.values())
      .filter(op => op.state === LOADING_STATES.ERROR)
      .slice(-5); // Last 5 errors

    return {
      state: this.globalState,
      isLoading: this.globalState === LOADING_STATES.LOADING,
      hasErrors: recentErrors.length > 0,
      activeOperations: activeOperations.length,
      recentErrors,
      operations: Array.from(this.operations.values()),
      timestamp: Date.now()
    };
  }

  /**
   * Debounced state update for components
   * @param {string} key - Debounce key
   * @param {Function} updateFunction - Function to execute
   * @param {number} delay - Debounce delay
   */
  debounceUpdate(key, updateFunction, delay = DEBOUNCE_DELAY) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      updateFunction();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Get statistics about loading operations
   */
  getStatistics() {
    const allOps = Array.from(this.operations.values());
    const completedOps = allOps.filter(op => op.state === LOADING_STATES.SUCCESS);
    const failedOps = allOps.filter(op => op.state === LOADING_STATES.ERROR);
    
    return {
      totalOperations: allOps.length,
      completed: completedOps.length,
      failed: failedOps.length,
      active: allOps.filter(op => op.state === LOADING_STATES.LOADING).length,
      averageCompletionTime: completedOps.length > 0 
        ? completedOps.reduce((sum, op) => sum + op.duration, 0) / completedOps.length 
        : 0,
      operationTypes: [...new Set(allOps.map(op => op.type))],
      components: [...new Set(allOps.map(op => op.component))]
    };
  }

  /**
   * Reset all state (useful for testing or cleanup)
   */
  reset() {
    // Clear all timeouts
    this.operations.forEach(op => this.clearOperationTimeout(op));
    
    this.operations.clear();
    this.animationQueue = [];
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    this.setGlobalState(LOADING_STATES.IDLE);
    this.notifyListeners();
    
    logger.info('Loading state manager reset');
  }
}

// ===== SINGLETON INSTANCE =====
const loadingStateManager = new LoadingStateManager();

// ===== EXPORTS =====
export { loadingStateManager };
export default loadingStateManager;