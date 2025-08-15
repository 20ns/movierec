// src/hooks/usePerformance.js
// React hooks for performance optimization and monitoring

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import performanceOptimizationService, { METRICS_CONFIG } from '../services/performanceOptimizationService';

/**
 * Hook for monitoring Core Web Vitals
 * @returns {Object} Core Web Vitals metrics and scores
 */
export const useCoreWebVitals = () => {
  const [metrics, setMetrics] = useState({
    LCP: null,
    FID: null,
    CLS: null,
    loading: true
  });

  useEffect(() => {
    const updateMetrics = () => {
      const report = performanceOptimizationService.getPerformanceReport();
      setMetrics({
        ...report.coreWebVitals,
        loading: false
      });
    };

    // Initial metrics
    updateMetrics();
    
    // Update metrics every 30 seconds
    const interval = setInterval(updateMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getOverallScore = useCallback(() => {
    const { LCP, FID, CLS } = metrics;
    if (!LCP || !FID || !CLS) return null;

    const scores = [LCP.grade, FID.grade, CLS.grade];
    const goodCount = scores.filter(score => score === 'good').length;
    const needsImprovementCount = scores.filter(score => score === 'needs-improvement').length;

    if (goodCount === 3) return 'good';
    if (goodCount >= 2) return 'needs-improvement';
    return 'poor';
  }, [metrics]);

  return {
    ...metrics,
    overallScore: getOverallScore()
  };
};

/**
 * Hook for component-level performance monitoring
 * @param {string} componentName - Name of the component
 * @param {Object} options - Monitoring options
 * @returns {Object} Component performance utilities
 */
export const useComponentPerformance = (componentName, options = {}) => {
  const {
    trackRenders = true,
    trackEffects = true,
    trackStateUpdates = true,
    cacheState = false
  } = options;

  const renderCount = useRef(0);
  const effectCount = useRef(0);
  const stateUpdateCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const componentStartTime = useRef(Date.now());

  // Track renders
  if (trackRenders) {
    renderCount.current++;
    const renderTime = Date.now() - lastRenderTime.current;
    lastRenderTime.current = Date.now();

    // Log slow renders
    if (renderTime > 16.67) { // > 60fps threshold
      console.warn(`Slow render in ${componentName}: ${renderTime}ms`);
    }
  }

  // Track effects
  const trackEffect = useCallback((effectName, dependencies = []) => {
    if (!trackEffects) return;

    effectCount.current++;
    
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      if (duration > 5) { // > 5ms threshold
        console.warn(`Slow effect in ${componentName}.${effectName}: ${duration}ms`);
      }
    };
  }, [componentName, trackEffects]);

  // Track state updates
  const trackStateUpdate = useCallback((stateName, oldValue, newValue) => {
    if (!trackStateUpdates) return;

    stateUpdateCount.current++;
    
    // Check for unnecessary re-renders (same value)
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      console.warn(`Unnecessary state update in ${componentName}.${stateName}`);
    }
  }, [componentName, trackStateUpdates]);

  // Component state caching
  const getCachedState = useCallback((key) => {
    if (!cacheState) return null;
    return performanceOptimizationService.getCachedComponentState(`${componentName}_${key}`);
  }, [componentName, cacheState]);

  const setCachedState = useCallback((key, value) => {
    if (!cacheState) return;
    performanceOptimizationService.setCachedComponentState(`${componentName}_${key}`, value);
  }, [componentName, cacheState]);

  // Performance report for this component
  const getPerformanceReport = useCallback(() => {
    const totalTime = Date.now() - componentStartTime.current;
    
    return {
      componentName,
      renderCount: renderCount.current,
      effectCount: effectCount.current,
      stateUpdateCount: stateUpdateCount.current,
      totalTime,
      averageRenderTime: totalTime / renderCount.current,
      timestamp: Date.now()
    };
  }, [componentName]);

  return {
    renderCount: renderCount.current,
    effectCount: effectCount.current,
    stateUpdateCount: stateUpdateCount.current,
    trackEffect,
    trackStateUpdate,
    getCachedState,
    setCachedState,
    getPerformanceReport
  };
};

/**
 * Hook for memory usage monitoring
 * @returns {Object} Memory usage information
 */
export const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState({
    used: 0,
    total: 0,
    limit: 0,
    supported: false
  });

  useEffect(() => {
    if (!('memory' in performance)) {
      setMemoryInfo(prev => ({ ...prev, supported: false }));
      return;
    }

    const updateMemoryInfo = () => {
      const memory = performance.memory;
      setMemoryInfo({
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        supported: true
      });
    };

    updateMemoryInfo();
    
    // Update every 10 seconds
    const interval = setInterval(updateMemoryInfo, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getMemoryStatus = useCallback(() => {
    if (!memoryInfo.supported) return 'unknown';
    
    const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
    
    if (usagePercent > 80) return 'critical';
    if (usagePercent > 60) return 'warning';
    return 'good';
  }, [memoryInfo]);

  const triggerCleanup = useCallback(() => {
    performanceOptimizationService.optimizeNow();
  }, []);

  return {
    ...memoryInfo,
    usagePercent: memoryInfo.limit > 0 ? (memoryInfo.used / memoryInfo.limit) * 100 : 0,
    status: getMemoryStatus(),
    triggerCleanup
  };
};

/**
 * Hook for optimized state management with automatic caching
 * @param {*} initialState - Initial state value
 * @param {string} cacheKey - Cache key for persistence
 * @param {Object} options - Caching options
 * @returns {Array} [state, setState] similar to useState
 */
export const useOptimizedState = (initialState, cacheKey, options = {}) => {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    shouldCache = () => true,
    cacheTTL = 30 * 60 * 1000 // 30 minutes
  } = options;

  // Try to load from cache first
  const cachedValue = useMemo(() => {
    try {
      const cached = performanceOptimizationService.getCachedComponentState(cacheKey);
      if (cached && shouldCache(cached)) {
        return deserialize(cached);
      }
    } catch (error) {
      console.warn('Failed to load cached state:', error);
    }
    return initialState;
  }, [cacheKey, initialState, deserialize, shouldCache]);

  const [state, setState] = useState(cachedValue);

  // Cache state changes
  useEffect(() => {
    if (shouldCache(state)) {
      try {
        const serialized = serialize(state);
        performanceOptimizationService.setCachedComponentState(cacheKey, serialized);
      } catch (error) {
        console.warn('Failed to cache state:', error);
      }
    }
  }, [state, cacheKey, serialize, shouldCache]);

  return [state, setState];
};

/**
 * Hook for debounced values with performance optimization
 * @param {*} value - Value to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {*} Debounced value
 */
export const useOptimizedDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Use requestIdleCallback if available for better performance
    const scheduleUpdate = () => {
      setDebouncedValue(value);
    };

    if ('requestIdleCallback' in window) {
      timeoutRef.current = setTimeout(() => {
        requestIdleCallback(scheduleUpdate);
      }, delay);
    } else {
      timeoutRef.current = setTimeout(scheduleUpdate, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttled callbacks with performance optimization
 * @param {Function} callback - Callback to throttle
 * @param {number} delay - Throttle delay in milliseconds
 * @returns {Function} Throttled callback
 */
export const useOptimizedThrottle = (callback, delay) => {
  const lastRunRef = useRef(0);
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= delay) {
      lastRunRef.current = now;
      callback(...args);
    } else {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule the callback
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]);
};

/**
 * Hook for image optimization and lazy loading
 * @param {string} src - Image source URL
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized image properties
 */
export const useOptimizedImage = (src, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    lazy = true,
    placeholder = true
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [error, setError] = useState(null);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Optimize image URL
  const optimizedSrc = useMemo(() => {
    if (!src || !isInView) return '';

    let optimized = src;

    // Add optimization parameters for supported services
    if (src.includes('tmdb.org')) {
      // TMDB optimization
      if (width) {
        const sizes = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'];
        const sizeIndex = Math.min(Math.floor(width / 100), sizes.length - 1);
        optimized = src.replace(/w\d+/, sizes[sizeIndex]);
      }
    }

    return optimized;
  }, [src, width, isInView]);

  // Placeholder data URL
  const placeholderSrc = useMemo(() => {
    if (!placeholder) return '';
    
    const w = width || 300;
    const h = height || 200;
    
    // Generate a simple SVG placeholder
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect x="40%" y="40%" width="20%" height="20%" fill="#d1d5db" rx="4"/>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, [width, height, placeholder]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setError(null);
  }, []);

  const handleError = useCallback((e) => {
    setError(e);
    setIsLoaded(false);
  }, []);

  return {
    ref: imgRef,
    src: isInView ? optimizedSrc : placeholderSrc,
    isLoaded,
    isInView,
    error,
    onLoad: handleLoad,
    onError: handleError,
    loading: lazy ? 'lazy' : 'eager'
  };
};

/**
 * Hook for bundle size monitoring
 * @returns {Object} Bundle size information
 */
export const useBundleMonitoring = () => {
  const [bundleInfo, setBundleInfo] = useState({
    jsSize: 0,
    cssSize: 0,
    totalSize: 0,
    chunkCount: 0
  });

  useEffect(() => {
    const updateBundleInfo = () => {
      const report = performanceOptimizationService.getPerformanceReport();
      const jsKB = Math.round(report.bundle.jsSize / 1024);
      const cssKB = Math.round(report.bundle.cssSize / 1024);
      
      setBundleInfo({
        jsSize: jsKB,
        cssSize: cssKB,
        totalSize: jsKB + cssKB,
        chunkCount: performance.getEntriesByType('resource')
          .filter(r => r.name.endsWith('.js')).length
      });
    };

    updateBundleInfo();
    
    // Update every minute
    const interval = setInterval(updateBundleInfo, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getBundleStatus = useCallback(() => {
    if (bundleInfo.totalSize > METRICS_CONFIG.BUNDLE_CRITICAL / 1024) return 'critical';
    if (bundleInfo.totalSize > METRICS_CONFIG.BUNDLE_WARNING / 1024) return 'warning';
    return 'good';
  }, [bundleInfo.totalSize]);

  return {
    ...bundleInfo,
    status: getBundleStatus()
  };
};

/**
 * Hook for performance-optimized async operations
 * @param {Function} asyncFn - Async function to execute
 * @param {Array} dependencies - Dependencies for the async function
 * @param {Object} options - Options for optimization
 * @returns {Object} Async operation state and controls
 */
export const useOptimizedAsync = (asyncFn, dependencies = [], options = {}) => {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  });

  const abortControllerRef = useRef(null);

  const execute = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = performanceOptimizationService.getCachedComponentState(cacheKey);
      if (cached) {
        setState({ data: cached, loading: false, error: null });
        return cached;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    let lastError;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const data = await asyncFn(abortControllerRef.current.signal);
        
        // Cache successful result
        if (cacheKey) {
          performanceOptimizationService.setCachedComponentState(cacheKey, data);
        }
        
        setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          return; // Request was cancelled
        }
        
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    setState({ data: null, loading: false, error: lastError });
    throw lastError;
  }, [asyncFn, cacheKey, retryCount, retryDelay]);

  useEffect(() => {
    execute();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  return {
    ...state,
    refetch: execute
  };
};

// ===== EXPORTS =====
export default {
  useCoreWebVitals,
  useComponentPerformance,
  useMemoryMonitoring,
  useOptimizedState,
  useOptimizedDebounce,
  useOptimizedThrottle,
  useOptimizedImage,
  useBundleMonitoring,
  useOptimizedAsync
};