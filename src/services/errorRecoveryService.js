// src/services/errorRecoveryService.js
// Professional error recovery and user-friendly messaging system

import { createComponentLogger, performanceMonitor } from '../utils/centralizedLogger';
import loadingStateManager, { LOADING_STATES } from './loadingStateService';
import backgroundSyncService from './backgroundSyncService';

const logger = createComponentLogger('ErrorRecovery');

// ===== ERROR TYPES AND CLASSIFICATIONS =====
export const ERROR_TYPES = {
  // Network errors
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  CONNECTION_LOST: 'connection_lost',
  
  // Authentication errors
  AUTH_ERROR: 'auth_error',
  TOKEN_EXPIRED: 'token_expired',
  PERMISSION_DENIED: 'permission_denied',
  
  // Data errors
  VALIDATION_ERROR: 'validation_error',
  DATA_CORRUPTION: 'data_corruption',
  SYNC_CONFLICT: 'sync_conflict',
  
  // Server errors
  SERVER_ERROR: 'server_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  RATE_LIMITED: 'rate_limited',
  
  // Client errors
  UNKNOWN_ERROR: 'unknown_error',
  COMPONENT_ERROR: 'component_error',
  RENDERING_ERROR: 'rendering_error'
};

export const ERROR_SEVERITY = {
  LOW: 1,      // User can continue normally
  MEDIUM: 2,   // Functionality is degraded but usable
  HIGH: 3,     // Critical functionality is affected
  CRITICAL: 4  // Application is unusable
};

export const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  FALLBACK: 'fallback',
  LOGOUT: 'logout',
  REDIRECT: 'redirect',
  MANUAL: 'manual'
};

// ===== ERROR CLASSIFICATION RULES =====
const ERROR_CLASSIFICATION = {
  // Network patterns
  'Network Error': { type: ERROR_TYPES.NETWORK_ERROR, severity: ERROR_SEVERITY.MEDIUM },
  'TypeError: NetworkError': { type: ERROR_TYPES.NETWORK_ERROR, severity: ERROR_SEVERITY.MEDIUM },
  'timeout': { type: ERROR_TYPES.TIMEOUT_ERROR, severity: ERROR_SEVERITY.MEDIUM },
  'Connection lost': { type: ERROR_TYPES.CONNECTION_LOST, severity: ERROR_SEVERITY.HIGH },
  
  // Authentication patterns
  '401': { type: ERROR_TYPES.AUTH_ERROR, severity: ERROR_SEVERITY.HIGH },
  '403': { type: ERROR_TYPES.PERMISSION_DENIED, severity: ERROR_SEVERITY.HIGH },
  'Unauthorized': { type: ERROR_TYPES.AUTH_ERROR, severity: ERROR_SEVERITY.HIGH },
  'Token expired': { type: ERROR_TYPES.TOKEN_EXPIRED, severity: ERROR_SEVERITY.HIGH },
  
  // Server patterns
  '500': { type: ERROR_TYPES.SERVER_ERROR, severity: ERROR_SEVERITY.HIGH },
  '502': { type: ERROR_TYPES.SERVICE_UNAVAILABLE, severity: ERROR_SEVERITY.HIGH },
  '503': { type: ERROR_TYPES.SERVICE_UNAVAILABLE, severity: ERROR_SEVERITY.HIGH },
  '429': { type: ERROR_TYPES.RATE_LIMITED, severity: ERROR_SEVERITY.MEDIUM },
  
  // Client patterns
  'ValidationError': { type: ERROR_TYPES.VALIDATION_ERROR, severity: ERROR_SEVERITY.LOW },
  'ChunkLoadError': { type: ERROR_TYPES.COMPONENT_ERROR, severity: ERROR_SEVERITY.MEDIUM }
};

// ===== USER-FRIENDLY MESSAGES =====
const USER_MESSAGES = {
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: 'Connection Issue',
    message: 'Having trouble connecting to our servers. Please check your internet connection.',
    suggestion: 'Try refreshing the page or check your network connection.',
    action: 'Retry'
  },
  
  [ERROR_TYPES.TIMEOUT_ERROR]: {
    title: 'Request Timed Out',
    message: 'The request is taking longer than expected.',
    suggestion: 'This might be due to slow internet or high server load.',
    action: 'Try Again'
  },
  
  [ERROR_TYPES.CONNECTION_LOST]: {
    title: 'Connection Lost',
    message: 'Your connection to the internet has been interrupted.',
    suggestion: 'Please check your network and try again.',
    action: 'Reconnect'
  },
  
  [ERROR_TYPES.AUTH_ERROR]: {
    title: 'Authentication Required',
    message: 'You need to sign in to continue.',
    suggestion: 'Please sign in with your account credentials.',
    action: 'Sign In'
  },
  
  [ERROR_TYPES.TOKEN_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired for security reasons.',
    suggestion: 'Please sign in again to continue.',
    action: 'Sign In Again'
  },
  
  [ERROR_TYPES.PERMISSION_DENIED]: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this feature.',
    suggestion: 'Contact support if you believe this is an error.',
    action: 'Go Back'
  },
  
  [ERROR_TYPES.VALIDATION_ERROR]: {
    title: 'Input Error',
    message: 'Please check your input and try again.',
    suggestion: 'Make sure all required fields are filled correctly.',
    action: 'Review'
  },
  
  [ERROR_TYPES.DATA_CORRUPTION]: {
    title: 'Data Issue',
    message: 'There seems to be an issue with your data.',
    suggestion: 'We\'ll try to restore it from a backup.',
    action: 'Restore'
  },
  
  [ERROR_TYPES.SYNC_CONFLICT]: {
    title: 'Sync Conflict',
    message: 'Your changes conflict with recent updates.',
    suggestion: 'Choose which version to keep.',
    action: 'Resolve'
  },
  
  [ERROR_TYPES.SERVER_ERROR]: {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    suggestion: 'Our team has been notified. Please try again in a moment.',
    action: 'Try Later'
  },
  
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: {
    title: 'Service Unavailable',
    message: 'Our servers are temporarily unavailable.',
    suggestion: 'We\'re working to restore service. Please try again shortly.',
    action: 'Check Status'
  },
  
  [ERROR_TYPES.RATE_LIMITED]: {
    title: 'Too Many Requests',
    message: 'You\'re making requests too quickly.',
    suggestion: 'Please wait a moment before trying again.',
    action: 'Wait'
  },
  
  [ERROR_TYPES.COMPONENT_ERROR]: {
    title: 'Loading Error',
    message: 'Failed to load this part of the application.',
    suggestion: 'Try refreshing the page to reload the component.',
    action: 'Refresh'
  },
  
  [ERROR_TYPES.RENDERING_ERROR]: {
    title: 'Display Error',
    message: 'There was a problem displaying this content.',
    suggestion: 'The page might need to be reloaded.',
    action: 'Reload'
  },
  
  [ERROR_TYPES.UNKNOWN_ERROR]: {
    title: 'Unexpected Error',
    message: 'Something unexpected happened.',
    suggestion: 'Please try again or contact support if the problem persists.',
    action: 'Try Again'
  }
};

// ===== ERROR RECOVERY SERVICE =====
class ErrorRecoveryService {
  constructor() {
    this.errorHistory = [];
    this.recoveryAttempts = new Map();
    this.maxRetryAttempts = 3;
    this.retryDelay = 1000;
    this.listeners = [];
    
    this.setupGlobalErrorHandling();
    
    logger.info('Error recovery service initialized');
  }

  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        component: 'GlobalPromiseRejection',
        context: 'unhandled_promise',
        preventDefault: false
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        component: 'GlobalJavaScript',
        context: 'javascript_error',
        fileName: event.filename,
        lineNumber: event.lineno,
        preventDefault: false
      });
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error(`Resource loading failed: ${event.target.src || event.target.href}`), {
          component: 'ResourceLoader',
          context: 'resource_error',
          resourceType: event.target.tagName,
          preventDefault: false
        });
      }
    }, true);
  }

  // ===== ERROR CLASSIFICATION =====
  
  classifyError(error, context = {}) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorName = error?.name || 'Error';
    
    // Try to match against classification patterns
    for (const [pattern, classification] of Object.entries(ERROR_CLASSIFICATION)) {
      if (errorMessage.includes(pattern) || errorName.includes(pattern)) {
        return {
          ...classification,
          originalError: error,
          context
        };
      }
    }

    // Default classification
    return {
      type: ERROR_TYPES.UNKNOWN_ERROR,
      severity: ERROR_SEVERITY.MEDIUM,
      originalError: error,
      context
    };
  }

  // ===== ERROR HANDLING =====
  
  handleError(error, options = {}) {
    const {
      component = 'Unknown',
      context = {},
      preventDefault = true,
      userFriendly = true,
      autoRecover = true
    } = options;

    const timer = performanceMonitor.startTiming('error_handling');
    
    try {
      // Classify the error
      const classification = this.classifyError(error, { component, ...context });
      
      const errorRecord = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        error,
        classification,
        component,
        context,
        handled: false,
        recoveryAttempted: false,
        userNotified: false
      };

      // Add to error history
      this.errorHistory.push(errorRecord);
      
      // Keep only last 50 errors
      if (this.errorHistory.length > 50) {
        this.errorHistory = this.errorHistory.slice(-50);
      }

      // Log the error
      logger.error('Error handled by recovery service', {
        errorId: errorRecord.id,
        type: classification.type,
        severity: classification.severity,
        component,
        message: error?.message
      }, error);

      // Update loading states if needed
      if (classification.severity >= ERROR_SEVERITY.MEDIUM) {
        loadingStateManager.setGlobalState(LOADING_STATES.ERROR, {
          errorType: classification.type,
          errorId: errorRecord.id
        });
      }

      // Attempt automatic recovery
      if (autoRecover) {
        this.attemptRecovery(errorRecord);
      }

      // Notify listeners
      this.notifyListeners(errorRecord);

      timer.end();
      return errorRecord;
      
    } catch (handlingError) {
      timer.end();
      logger.error('Error in error handling', { error: handlingError.message }, handlingError);
      return null;
    }
  }

  // ===== RECOVERY STRATEGIES =====
  
  async attemptRecovery(errorRecord) {
    const { classification, component, id } = errorRecord;
    
    // Check if we've already tried to recover this type of error too many times
    const recoveryKey = `${classification.type}_${component}`;
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0;
    
    if (attempts >= this.maxRetryAttempts) {
      logger.warn('Max recovery attempts reached', { 
        errorType: classification.type,
        component,
        attempts 
      });
      return false;
    }

    // Increment recovery attempts
    this.recoveryAttempts.set(recoveryKey, attempts + 1);
    
    try {
      const strategy = this.getRecoveryStrategy(classification);
      const success = await this.executeRecoveryStrategy(strategy, errorRecord);
      
      if (success) {
        // Reset recovery attempts on success
        this.recoveryAttempts.delete(recoveryKey);
        errorRecord.handled = true;
        errorRecord.recoveryAttempted = true;
        
        logger.info('Error recovery successful', {
          errorId: id,
          strategy,
          attempts: attempts + 1
        });
      }
      
      return success;
      
    } catch (recoveryError) {
      logger.error('Recovery attempt failed', {
        errorId: id,
        recoveryError: recoveryError.message
      }, recoveryError);
      
      return false;
    }
  }

  getRecoveryStrategy(classification) {
    switch (classification.type) {
      case ERROR_TYPES.NETWORK_ERROR:
      case ERROR_TYPES.TIMEOUT_ERROR:
        return RECOVERY_STRATEGIES.RETRY;
      
      case ERROR_TYPES.CONNECTION_LOST:
        return RECOVERY_STRATEGIES.REFRESH;
      
      case ERROR_TYPES.AUTH_ERROR:
      case ERROR_TYPES.TOKEN_EXPIRED:
        return RECOVERY_STRATEGIES.LOGOUT;
      
      case ERROR_TYPES.COMPONENT_ERROR:
      case ERROR_TYPES.RENDERING_ERROR:
        return RECOVERY_STRATEGIES.REFRESH;
      
      case ERROR_TYPES.DATA_CORRUPTION:
        return RECOVERY_STRATEGIES.FALLBACK;
      
      case ERROR_TYPES.RATE_LIMITED:
        return RECOVERY_STRATEGIES.RETRY;
      
      default:
        return RECOVERY_STRATEGIES.MANUAL;
    }
  }

  async executeRecoveryStrategy(strategy, errorRecord) {
    const { classification, component } = errorRecord;
    
    switch (strategy) {
      case RECOVERY_STRATEGIES.RETRY:
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        // Trigger retry through loading state manager
        return true;
      
      case RECOVERY_STRATEGIES.REFRESH:
        // Queue background sync to restore state
        backgroundSyncService.queueSync('high');
        return true;
      
      case RECOVERY_STRATEGIES.FALLBACK:
        // Use cached data or simplified functionality
        return this.useFallbackData(errorRecord);
      
      case RECOVERY_STRATEGIES.LOGOUT:
        // Clear authentication and redirect
        return this.handleAuthenticationError(errorRecord);
      
      case RECOVERY_STRATEGIES.REDIRECT:
        // Navigate to safe page
        window.location.href = '/';
        return true;
      
      default:
        return false;
    }
  }

  useFallbackData(errorRecord) {
    try {
      // Try to load from localStorage or use default data
      const { component } = errorRecord;
      
      // Component-specific fallback logic
      switch (component) {
        case 'PersonalizedRecommendations':
          // Use cached recommendations
          return this.loadCachedRecommendations();
        
        case 'UserProgress':
          // Use local progress data
          return this.loadLocalProgressData();
        
        default:
          return false;
      }
    } catch (fallbackError) {
      logger.error('Fallback data loading failed', { error: fallbackError.message });
      return false;
    }
  }

  handleAuthenticationError(errorRecord) {
    try {
      // Clear authentication tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Queue user for re-authentication
      this.notifyListeners({
        ...errorRecord,
        requiresUserAction: true,
        actionType: 'REAUTHENTICATION_REQUIRED'
      });
      
      return true;
    } catch (authError) {
      logger.error('Authentication error handling failed', { error: authError.message });
      return false;
    }
  }

  loadCachedRecommendations() {
    try {
      const cached = localStorage.getItem('cached_recommendations');
      return !!cached;
    } catch {
      return false;
    }
  }

  loadLocalProgressData() {
    try {
      const cached = localStorage.getItem('user_progress');
      return !!cached;
    } catch {
      return false;
    }
  }

  // ===== USER-FRIENDLY MESSAGING =====
  
  getUserFriendlyMessage(errorRecord) {
    const { classification } = errorRecord;
    const baseMessage = USER_MESSAGES[classification.type] || USER_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
    
    return {
      ...baseMessage,
      errorId: errorRecord.id,
      severity: classification.severity,
      canRetry: this.canRetry(errorRecord),
      recoveryActions: this.getRecoveryActions(errorRecord)
    };
  }

  canRetry(errorRecord) {
    const { classification, component } = errorRecord;
    const recoveryKey = `${classification.type}_${component}`;
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0;
    
    return attempts < this.maxRetryAttempts;
  }

  getRecoveryActions(errorRecord) {
    const { classification } = errorRecord;
    
    const actions = [];
    
    if (this.canRetry(errorRecord)) {
      actions.push({
        type: 'retry',
        label: 'Try Again',
        primary: true
      });
    }
    
    // Add context-specific actions
    switch (classification.type) {
      case ERROR_TYPES.AUTH_ERROR:
      case ERROR_TYPES.TOKEN_EXPIRED:
        actions.push({
          type: 'login',
          label: 'Sign In',
          primary: true
        });
        break;
      
      case ERROR_TYPES.NETWORK_ERROR:
      case ERROR_TYPES.CONNECTION_LOST:
        actions.push({
          type: 'refresh',
          label: 'Refresh Page',
          primary: false
        });
        break;
      
      case ERROR_TYPES.COMPONENT_ERROR:
        actions.push({
          type: 'reload',
          label: 'Reload Component',
          primary: false
        });
        break;
    }
    
    // Always provide a way to contact support for high-severity errors
    if (classification.severity >= ERROR_SEVERITY.HIGH) {
      actions.push({
        type: 'support',
        label: 'Contact Support',
        primary: false
      });
    }
    
    return actions;
  }

  // ===== LISTENER MANAGEMENT =====
  
  addListener(callback) {
    this.listeners.push(callback);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(errorRecord) {
    const userMessage = this.getUserFriendlyMessage(errorRecord);
    
    this.listeners.forEach(listener => {
      try {
        listener({
          errorRecord,
          userMessage,
          timestamp: Date.now()
        });
      } catch (listenerError) {
        logger.warn('Error listener failed', { error: listenerError.message });
      }
    });
  }

  // ===== PUBLIC API =====
  
  getErrorHistory() {
    return [...this.errorHistory];
  }

  getRecoveryStatistics() {
    const totalErrors = this.errorHistory.length;
    const handledErrors = this.errorHistory.filter(e => e.handled).length;
    const recoveredErrors = this.errorHistory.filter(e => e.recoveryAttempted).length;
    
    return {
      totalErrors,
      handledErrors,
      recoveredErrors,
      recoveryRate: totalErrors > 0 ? (handledErrors / totalErrors) * 100 : 0,
      activeRecoveryAttempts: this.recoveryAttempts.size
    };
  }

  clearErrorHistory() {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    logger.info('Error history cleared');
  }

  // Manual recovery trigger
  async retryError(errorId) {
    const errorRecord = this.errorHistory.find(e => e.id === errorId);
    if (!errorRecord) {
      throw new Error('Error record not found');
    }
    
    return this.attemptRecovery(errorRecord);
  }
}

// ===== SINGLETON INSTANCE =====
const errorRecoveryService = new ErrorRecoveryService();

// ===== EXPORTS =====
export { errorRecoveryService };
export default errorRecoveryService;