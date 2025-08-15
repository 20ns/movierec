// src/utils/centralizedLogger.js

// ===== LOG LEVELS =====
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

const LogLevelNames = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
  4: 'TRACE'
};

// ===== CONFIGURATION =====
class LoggerConfig {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
    this.enableConsole = true;
    this.enableRemote = process.env.NODE_ENV === 'production';
    this.enableMetrics = true;
    this.maxBufferSize = 100;
    this.flushInterval = 30000; // 30 seconds
    this.remoteEndpoint = process.env.REACT_APP_LOG_ENDPOINT || null;
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.contextInfo = {};
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  setContext(contextInfo) {
    this.contextInfo = { ...this.contextInfo, ...contextInfo };
  }
}

// ===== LOGGER CLASS =====
class CentralizedLogger {
  constructor() {
    this.config = new LoggerConfig();
    this.buffer = [];
    this.metrics = {
      errors: 0,
      warnings: 0,
      apiCalls: 0,
      userActions: 0,
      performanceIssues: 0
    };
    this.startTime = Date.now();
    
    // Initialize periodic flush
    this.initializeFlush();
    
    // Capture unhandled errors
    this.setupGlobalErrorHandling();
  }

  // ===== CONFIGURATION METHODS =====
  setLogLevel(level) {
    this.config.level = level;
  }

  setUserId(userId) {
    this.config.setUserId(userId);
  }

  setContextInfo(contextInfo) {
    this.config.setContext(contextInfo);
  }

  // ===== CORE LOGGING METHODS =====
  error(component, message, data = null, error = null) {
    this.log(LogLevel.ERROR, component, message, data, error);
    this.metrics.errors++;
  }

  warn(component, message, data = null) {
    this.log(LogLevel.WARN, component, message, data);
    this.metrics.warnings++;
  }

  info(component, message, data = null) {
    this.log(LogLevel.INFO, component, message, data);
  }

  debug(component, message, data = null) {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  trace(component, message, data = null) {
    this.log(LogLevel.TRACE, component, message, data);
  }

  // ===== SPECIALIZED LOGGING METHODS =====
  apiCall(component, endpoint, method, duration, status, error = null) {
    this.metrics.apiCalls++;
    const logData = {
      endpoint,
      method,
      duration: `${duration}ms`,
      status,
      error: error ? error.message : null
    };
    
    if (error || status >= 400) {
      this.error(component, `API call failed: ${method} ${endpoint}`, logData, error);
    } else if (duration > 5000) {
      this.warn(component, `Slow API call: ${method} ${endpoint}`, logData);
    } else {
      this.debug(component, `API call: ${method} ${endpoint}`, logData);
    }
  }

  userAction(component, action, data = null) {
    this.metrics.userActions++;
    this.info(component, `User action: ${action}`, data);
  }

  performance(component, metric, value, threshold = null) {
    const logData = { metric, value, threshold };
    
    if (threshold && value > threshold) {
      this.metrics.performanceIssues++;
      this.warn(component, `Performance issue: ${metric}`, logData);
    } else {
      this.debug(component, `Performance metric: ${metric}`, logData);
    }
  }

  contextStateChange(component, oldState, newState, action) {
    this.debug(component, 'Context state change', {
      action,
      oldState: this.sanitizeState(oldState),
      newState: this.sanitizeState(newState)
    });
  }

  // ===== PRIVATE METHODS =====
  log(level, component, message, data = null, error = null) {
    if (level > this.config.level) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: LogLevelNames[level],
      component,
      message,
      data: this.sanitizeData(data),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      context: this.config.contextInfo,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Buffer for remote logging
    if (this.config.enableRemote) {
      this.buffer.push(logEntry);
      if (this.buffer.length >= this.config.maxBufferSize) {
        this.flush();
      }
    }
  }

  outputToConsole(entry) {
    const { level, component, message, data, error } = entry;
    const prefix = `[${entry.timestamp.substr(11, 8)}] [${level}] [${component}]`;
    
    switch (entry.level) {
      case 'ERROR':
        console.group(`🚨 ${prefix} ${message}`);
        if (data) console.error('Data:', data);
        if (error) console.error('Error:', error);
        console.groupEnd();
        break;
      case 'WARN':
        console.group(`⚠️ ${prefix} ${message}`);
        if (data) console.warn('Data:', data);
        console.groupEnd();
        break;
      case 'INFO':
        console.group(`ℹ️ ${prefix} ${message}`);
        if (data) console.info('Data:', data);
        console.groupEnd();
        break;
      case 'DEBUG':
        console.group(`🔍 ${prefix} ${message}`);
        if (data) console.debug('Data:', data);
        console.groupEnd();
        break;
      case 'TRACE':
        console.group(`🔬 ${prefix} ${message}`);
        if (data) console.trace('Data:', data);
        console.groupEnd();
        break;
    }
  }

  sanitizeData(data) {
    if (!data) return null;
    
    // Remove sensitive information
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret'];
    
    const sanitize = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    };

    return sanitize(data);
  }

  sanitizeState(state) {
    if (!state || typeof state !== 'object') return state;
    
    // Only include non-sensitive state properties for logging
    const {
      isAuthenticated,
      userId,
      questionnaireCompleted,
      preferencesLoading,
      recommendationsState,
      initialAppLoadComplete,
      completionPercentage,
      canGenerateRecommendations
    } = state;

    return {
      isAuthenticated,
      userId: userId ? '[USER_ID]' : null,
      questionnaireCompleted,
      preferencesLoading,
      recommendationsState,
      initialAppLoadComplete,
      completionPercentage,
      canGenerateRecommendations
    };
  }

  // ===== REMOTE LOGGING =====
  initializeFlush() {
    setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  async flush() {
    if (this.buffer.length === 0 || !this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs,
          metrics: this.getMetrics(),
          session: {
            id: this.config.sessionId,
            userId: this.config.userId,
            startTime: this.startTime,
            duration: Date.now() - this.startTime
          }
        })
      });
    } catch (error) {
      // Fail silently in production, log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send logs to remote endpoint:', error);
      }
      
      // Put logs back in buffer for next attempt
      this.buffer.unshift(...logs);
      
      // Limit buffer size to prevent memory issues
      if (this.buffer.length > this.config.maxBufferSize * 2) {
        this.buffer = this.buffer.slice(-this.config.maxBufferSize);
      }
    }
  }

  // ===== GLOBAL ERROR HANDLING =====
  setupGlobalErrorHandling() {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('GlobalErrorHandler', 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise.toString()
      }, event.reason instanceof Error ? event.reason : null);
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('GlobalErrorHandler', 'Uncaught error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      }, event.error);
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.error('ResourceLoader', 'Resource failed to load', {
          tagName: event.target.tagName,
          src: event.target.src || event.target.href,
          type: event.target.type
        });
      }
    }, true);
  }

  // ===== METRICS =====
  getMetrics() {
    return {
      ...this.metrics,
      sessionDuration: Date.now() - this.startTime,
      bufferSize: this.buffer.length,
      timestamp: Date.now()
    };
  }

  resetMetrics() {
    this.metrics = {
      errors: 0,
      warnings: 0,
      apiCalls: 0,
      userActions: 0,
      performanceIssues: 0
    };
  }
}

// ===== SINGLETON INSTANCE =====
const logger = new CentralizedLogger();

// ===== COMPONENT-SPECIFIC LOGGERS =====
export const createComponentLogger = (componentName) => ({
  error: (message, data, error) => logger.error(componentName, message, data, error),
  warn: (message, data) => logger.warn(componentName, message, data),
  info: (message, data) => logger.info(componentName, message, data),
  debug: (message, data) => logger.debug(componentName, message, data),
  trace: (message, data) => logger.trace(componentName, message, data),
  apiCall: (endpoint, method, duration, status, error) => 
    logger.apiCall(componentName, endpoint, method, duration, status, error),
  userAction: (action, data) => logger.userAction(componentName, action, data),
  performance: (metric, value, threshold) => logger.performance(componentName, metric, value, threshold),
  contextStateChange: (oldState, newState, action) => 
    logger.contextStateChange(componentName, oldState, newState, action)
});

// ===== HOOKS FOR REACT COMPONENTS =====
export const useLogger = (componentName) => {
  return createComponentLogger(componentName);
};

// ===== PERFORMANCE MONITORING =====
export const performanceMonitor = {
  startTiming: (label) => {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        logger.performance('PerformanceMonitor', label, duration);
        return duration;
      }
    };
  },

  measureRender: (componentName, renderFn) => {
    const timer = performanceMonitor.startTiming(`${componentName} render`);
    try {
      const result = renderFn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      logger.error(componentName, 'Render error', null, error);
      throw error;
    }
  },

  measureAsync: async (label, asyncFn) => {
    const timer = performanceMonitor.startTiming(label);
    try {
      const result = await asyncFn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      logger.error('AsyncOperation', `${label} failed`, null, error);
      throw error;
    }
  }
};

// ===== EXPORTS =====
export {
  LogLevel,
  logger
};

export default logger;