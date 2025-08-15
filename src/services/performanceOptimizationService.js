// src/services/performanceOptimizationService.js
// Comprehensive performance optimization and monitoring service

import { createComponentLogger, performanceMonitor } from '../utils/centralizedLogger';

const logger = createComponentLogger('PerformanceOptimization');

// ===== PERFORMANCE METRICS CONSTANTS =====
const METRICS_CONFIG = {
  // Core Web Vitals thresholds
  LCP_GOOD: 2500,      // Largest Contentful Paint (ms)
  LCP_NEEDS_IMPROVEMENT: 4000,
  FID_GOOD: 100,       // First Input Delay (ms) 
  FID_NEEDS_IMPROVEMENT: 300,
  CLS_GOOD: 0.1,       // Cumulative Layout Shift
  CLS_NEEDS_IMPROVEMENT: 0.25,
  
  // Custom thresholds
  TTI_GOOD: 3800,      // Time to Interactive (ms)
  FCP_GOOD: 1800,      // First Contentful Paint (ms)
  
  // Memory thresholds (MB)
  MEMORY_WARNING: 50,
  MEMORY_CRITICAL: 100,
  
  // Bundle size thresholds (KB)
  BUNDLE_WARNING: 1024,
  BUNDLE_CRITICAL: 2048
};

const CACHE_STRATEGIES = {
  IMMEDIATE: 'immediate',
  LAZY: 'lazy',
  PREFETCH: 'prefetch',
  MEMORY_ONLY: 'memory_only',
  PERSISTENT: 'persistent'
};

// ===== PERFORMANCE OPTIMIZATION SERVICE =====
class PerformanceOptimizationService {
  constructor() {
    this.metrics = new Map();
    this.cacheStrategies = new Map();
    this.observers = [];
    this.memoryMonitor = null;
    this.bundleAnalytics = new Map();
    this.optimizations = new Set();
    this.isMonitoring = false;
    
    this.initialize();
    
    logger.info('Performance optimization service initialized');
  }

  initialize() {
    this.setupPerformanceObservers();
    this.initializeMemoryMonitoring();
    this.setupBundleAnalytics();
    this.implementCachingStrategies();
    this.startPerformanceMonitoring();
  }

  // ===== CORE WEB VITALS MONITORING =====
  
  setupPerformanceObservers() {
    if (!('PerformanceObserver' in window)) {
      logger.warn('PerformanceObserver not supported');
      return;
    }

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url
      });
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entries) => {
      entries.forEach(entry => {
        this.recordMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          target: entry.target?.tagName
        });
      });
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      if (clsValue > 0) {
        this.recordMetric('CLS', clsValue);
      }
    });

    // Long Tasks
    this.observeMetric('longtask', (entries) => {
      entries.forEach(entry => {
        this.recordMetric('LongTask', entry.duration, {
          startTime: entry.startTime,
          attribution: entry.attribution?.map(attr => ({
            name: attr.name,
            containerType: attr.containerType
          }))
        });
      });
    });

    // Navigation Timing
    this.observeNavigationTiming();
  }

  observeMetric(type, callback) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
      
    } catch (error) {
      logger.warn(`Failed to observe ${type}`, { error: error.message });
    }
  }

  observeNavigationTiming() {
    const navigationObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'navigation') {
          this.processNavigationTiming(entry);
        }
      });
    });
    
    navigationObserver.observe({ type: 'navigation', buffered: true });
    this.observers.push(navigationObserver);
  }

  processNavigationTiming(entry) {
    const metrics = {
      DNS: entry.domainLookupEnd - entry.domainLookupStart,
      TCP: entry.connectEnd - entry.connectStart,
      TLS: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      TTFB: entry.responseStart - entry.requestStart,
      Response: entry.responseEnd - entry.responseStart,
      DOM: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      Load: entry.loadEventEnd - entry.loadEventStart,
      FCP: this.getFCP(),
      TTI: this.getTTI()
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(name, value);
      }
    });
  }

  getFCP() {
    const entries = performance.getEntriesByType('paint');
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  getTTI() {
    // Simplified TTI calculation - can be enhanced with proper implementation
    const navEntry = performance.getEntriesByType('navigation')[0];
    return navEntry ? navEntry.domInteractive : 0;
  }

  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      metadata,
      grade: this.gradeMetric(name, value)
    };

    this.metrics.set(`${name}_${Date.now()}`, metric);
    
    // Keep only recent metrics (last 100)
    if (this.metrics.size > 100) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }

    logger.debug(`Performance metric recorded`, {
      name,
      value: Math.round(value * 100) / 100,
      grade: metric.grade
    });

    // Trigger optimizations for poor metrics
    if (metric.grade === 'poor') {
      this.triggerOptimization(name, metric);
    }
  }

  gradeMetric(name, value) {
    const thresholds = {
      LCP: [METRICS_CONFIG.LCP_GOOD, METRICS_CONFIG.LCP_NEEDS_IMPROVEMENT],
      FID: [METRICS_CONFIG.FID_GOOD, METRICS_CONFIG.FID_NEEDS_IMPROVEMENT],
      CLS: [METRICS_CONFIG.CLS_GOOD, METRICS_CONFIG.CLS_NEEDS_IMPROVEMENT],
      TTI: [METRICS_CONFIG.TTI_GOOD, METRICS_CONFIG.TTI_GOOD * 1.5],
      FCP: [METRICS_CONFIG.FCP_GOOD, METRICS_CONFIG.FCP_GOOD * 1.5]
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold[0]) return 'good';
    if (value <= threshold[1]) return 'needs-improvement';
    return 'poor';
  }

  // ===== MEMORY MONITORING =====
  
  initializeMemoryMonitoring() {
    if (!('memory' in performance)) {
      logger.warn('Memory API not supported');
      return;
    }

    this.monitorMemoryUsage();
    
    // Monitor every 30 seconds
    this.memoryMonitor = setInterval(() => {
      this.monitorMemoryUsage();
    }, 30000);
  }

  monitorMemoryUsage() {
    const memory = performance.memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    const totalMB = memory.totalJSHeapSize / 1024 / 1024;
    const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

    this.recordMetric('MemoryUsed', usedMB);
    this.recordMetric('MemoryTotal', totalMB);
    
    const memoryUsagePercent = (usedMB / limitMB) * 100;

    if (usedMB > METRICS_CONFIG.MEMORY_CRITICAL) {
      this.triggerMemoryCleanup('critical');
    } else if (usedMB > METRICS_CONFIG.MEMORY_WARNING) {
      this.triggerMemoryCleanup('warning');
    }

    logger.debug('Memory usage', {
      used: Math.round(usedMB),
      total: Math.round(totalMB),
      limit: Math.round(limitMB),
      percentage: Math.round(memoryUsagePercent)
    });
  }

  triggerMemoryCleanup(severity) {
    logger.warn(`Memory cleanup triggered`, { severity });

    // Clear old metrics
    if (this.metrics.size > 50) {
      const keysToDelete = Array.from(this.metrics.keys()).slice(0, 25);
      keysToDelete.forEach(key => this.metrics.delete(key));
    }

    // Clear old cache entries
    this.cleanupCache(severity);

    // Trigger garbage collection if available (Chrome DevTools)
    if (window.gc && severity === 'critical') {
      window.gc();
    }

    this.optimizations.add(`memory_cleanup_${severity}`);
  }

  // ===== INTELLIGENT CACHING =====
  
  implementCachingStrategies() {
    this.setupResourceCaching();
    this.setupAPIResponseCaching();
    this.setupComponentStateCaching();
    this.setupImageOptimization();
  }

  setupResourceCaching() {
    // Cache static resources with different strategies
    this.cacheStrategies.set('images', {
      strategy: CACHE_STRATEGIES.LAZY,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 50 * 1024 * 1024     // 50MB
    });

    this.cacheStrategies.set('api_responses', {
      strategy: CACHE_STRATEGIES.IMMEDIATE,
      maxAge: 5 * 60 * 1000,        // 5 minutes
      maxSize: 10 * 1024 * 1024     // 10MB
    });

    this.cacheStrategies.set('component_state', {
      strategy: CACHE_STRATEGIES.MEMORY_ONLY,
      maxAge: 30 * 60 * 1000,       // 30 minutes
      maxSize: 5 * 1024 * 1024      // 5MB
    });
  }

  setupAPIResponseCaching() {
    // Intelligent API response caching
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      const cacheKey = this.generateCacheKey(url, options);
      const cached = this.getCachedResponse(cacheKey);
      
      if (cached && !this.isCacheExpired(cached)) {
        logger.debug('Using cached API response', { url });
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const response = await originalFetch(url, options);
        
        if (response.ok && this.shouldCacheResponse(url, options)) {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          this.cacheAPIResponse(cacheKey, data, url);
        }
        
        return response;
      } catch (error) {
        // Return cached response if available during network failure
        if (cached) {
          logger.warn('Using stale cache due to network error', { url });
          return new Response(JSON.stringify(cached.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    };
  }

  setupComponentStateCaching() {
    // Component state caching for expensive computations
    this.componentStateCache = new Map();
    
    // Cleanup expired state cache every 10 minutes
    setInterval(() => {
      this.cleanupComponentStateCache();
    }, 10 * 60 * 1000);
  }

  setupImageOptimization() {
    // Lazy load images with intersection observer
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.optimizeImageLoading(img);
          this.imageObserver.unobserve(img);
        }
      });
    }, { threshold: 0.1 });

    // Observe all images
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.imageObserver.observe(img);
    });
  }

  optimizeImageLoading(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Load appropriate size based on device
    const devicePixelRatio = window.devicePixelRatio || 1;
    const containerWidth = img.parentElement?.offsetWidth || 300;
    const optimalWidth = Math.round(containerWidth * devicePixelRatio);

    // Add size parameters if it's a dynamic image service
    const optimizedSrc = this.addImageOptimizationParams(src, optimalWidth);
    
    img.src = optimizedSrc;
    img.removeAttribute('data-src');
  }

  addImageOptimizationParams(src, width) {
    if (src.includes('tmdb.org')) {
      // TMDB has different image sizes - choose appropriate one
      const sizes = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'];
      const sizeIndex = Math.min(Math.floor(width / 100), sizes.length - 1);
      return src.replace(/w\d+/, sizes[sizeIndex]);
    }
    
    return src;
  }

  // ===== BUNDLE SIZE MONITORING =====
  
  setupBundleAnalytics() {
    // Monitor chunk loading performance
    this.monitorChunkLoading();
    this.trackBundleSize();
    this.implementCodeSplitting();
  }

  monitorChunkLoading() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.initiatorType === 'script') {
          this.recordMetric('ChunkLoad', entry.duration, {
            name: entry.name,
            size: entry.transferSize,
            compressed: entry.encodedBodySize,
            uncompressed: entry.decodedBodySize
          });
        }
      });
    });

    observer.observe({ type: 'resource', buffered: true });
    this.observers.push(observer);
  }

  trackBundleSize() {
    // Estimate bundle size from loaded resources
    const resources = performance.getEntriesByType('resource');
    let totalJS = 0;
    let totalCSS = 0;

    resources.forEach(resource => {
      if (resource.name.endsWith('.js')) {
        totalJS += resource.transferSize || 0;
      } else if (resource.name.endsWith('.css')) {
        totalCSS += resource.transferSize || 0;
      }
    });

    this.bundleAnalytics.set('totalJS', totalJS);
    this.bundleAnalytics.set('totalCSS', totalCSS);

    const totalKB = (totalJS + totalCSS) / 1024;
    
    if (totalKB > METRICS_CONFIG.BUNDLE_CRITICAL) {
      this.triggerBundleOptimization('critical');
    } else if (totalKB > METRICS_CONFIG.BUNDLE_WARNING) {
      this.triggerBundleOptimization('warning');
    }

    logger.debug('Bundle size analysis', {
      jsKB: Math.round(totalJS / 1024),
      cssKB: Math.round(totalCSS / 1024),
      totalKB: Math.round(totalKB)
    });
  }

  implementCodeSplitting() {
    // Dynamic import tracking
    const originalImport = window.__import || window.import;
    
    if (originalImport) {
      window.__import = (specifier) => {
        const startTime = performance.now();
        
        return originalImport(specifier).then(module => {
          const loadTime = performance.now() - startTime;
          this.recordMetric('DynamicImport', loadTime, { specifier });
          return module;
        });
      };
    }
  }

  triggerBundleOptimization(severity) {
    logger.warn(`Bundle optimization triggered`, { severity });

    if (severity === 'critical') {
      // Suggest splitting large chunks
      this.suggestCodeSplitting();
      
      // Remove unused polyfills/features
      this.removeUnusedFeatures();
    }

    this.optimizations.add(`bundle_optimization_${severity}`);
  }

  suggestCodeSplitting() {
    // Analyze which parts of the app could be split
    const largeDependencies = this.identifyLargeDependencies();
    
    logger.info('Code splitting suggestions', {
      largeDependencies: largeDependencies.slice(0, 5)
    });
  }

  identifyLargeDependencies() {
    const resources = performance.getEntriesByType('resource');
    return resources
      .filter(r => r.name.endsWith('.js') && r.transferSize > 100 * 1024)
      .sort((a, b) => b.transferSize - a.transferSize)
      .map(r => ({
        name: r.name.split('/').pop(),
        size: Math.round(r.transferSize / 1024) + 'KB'
      }));
  }

  removeUnusedFeatures() {
    // Remove or lazy-load unused polyfills and features
    const unusedFeatures = this.detectUnusedFeatures();
    
    unusedFeatures.forEach(feature => {
      logger.info(`Removing unused feature: ${feature}`);
      // Implementation would depend on build system
    });
  }

  detectUnusedFeatures() {
    // Simple heuristics for detecting unused features
    const features = [];
    
    // Check if certain APIs are used
    if (!document.querySelector('[data-touch]')) {
      features.push('touch-gestures');
    }
    
    if (!document.querySelector('video')) {
      features.push('video-player');
    }
    
    return features;
  }

  // ===== CACHE MANAGEMENT =====
  
  generateCacheKey(url, options) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${btoa(body).slice(0, 10)}`;
  }

  getCachedResponse(key) {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  isCacheExpired(cached) {
    return Date.now() - cached.timestamp > cached.maxAge;
  }

  shouldCacheResponse(url, options) {
    // Only cache GET requests to API endpoints
    return (options.method || 'GET') === 'GET' && 
           url.includes('/api/') && 
           !url.includes('auth');
  }

  cacheAPIResponse(key, data, url) {
    const strategy = this.cacheStrategies.get('api_responses');
    
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        maxAge: strategy.maxAge,
        url
      };
      
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      // Storage full - cleanup old entries
      this.cleanupCache('warning');
    }
  }

  cleanupCache(severity) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
    
    if (severity === 'critical') {
      // Remove all cache
      keys.forEach(key => localStorage.removeItem(key));
    } else {
      // Remove oldest 50%
      const toRemove = keys.slice(0, Math.floor(keys.length / 2));
      toRemove.forEach(key => localStorage.removeItem(key));
    }
    
    logger.info(`Cache cleanup completed`, { 
      severity, 
      removedEntries: severity === 'critical' ? keys.length : Math.floor(keys.length / 2)
    });
  }

  cleanupComponentStateCache() {
    const now = Date.now();
    const strategy = this.cacheStrategies.get('component_state');
    
    for (const [key, entry] of this.componentStateCache.entries()) {
      if (now - entry.timestamp > strategy.maxAge) {
        this.componentStateCache.delete(key);
      }
    }
  }

  // ===== OPTIMIZATION TRIGGERS =====
  
  triggerOptimization(metricName, metric) {
    const optimizationKey = `${metricName}_${Date.now()}`;
    
    switch (metricName) {
      case 'LCP':
        this.optimizeLCP(metric);
        break;
      case 'FID':
        this.optimizeFID(metric);
        break;
      case 'CLS':
        this.optimizeCLS(metric);
        break;
      case 'LongTask':
        this.optimizeLongTasks(metric);
        break;
    }
    
    this.optimizations.add(optimizationKey);
  }

  optimizeLCP(metric) {
    logger.info('Optimizing LCP', { value: metric.value });
    
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Optimize images above the fold
    this.optimizeAboveFoldImages();
  }

  optimizeFID(metric) {
    logger.info('Optimizing FID', { value: metric.value });
    
    // Break up long tasks
    this.breakUpLongTasks();
    
    // Use web workers for heavy computation
    this.offloadToWebWorkers();
  }

  optimizeCLS(metric) {
    logger.info('Optimizing CLS', { value: metric.value });
    
    // Add size attributes to images
    this.stabilizeLayout();
    
    // Reserve space for dynamic content
    this.reserveDynamicSpace();
  }

  optimizeLongTasks(metric) {
    logger.info('Optimizing long tasks', { duration: metric.value });
    
    // Split large tasks
    this.splitLargeTasks();
    
    // Use requestIdleCallback
    this.scheduleNonCriticalWork();
  }

  preloadCriticalResources() {
    // Preload critical CSS and fonts
    const criticalResources = [
      { href: '/fonts/main.woff2', as: 'font', type: 'font/woff2' },
      { href: '/styles/critical.css', as: 'style' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      if (resource.as === 'font') link.crossOrigin = 'anonymous';
      
      document.head.appendChild(link);
    });
  }

  optimizeAboveFoldImages() {
    // Find images above the fold and optimize them
    const aboveFoldImages = Array.from(document.querySelectorAll('img'))
      .filter(img => img.getBoundingClientRect().top < window.innerHeight);

    aboveFoldImages.forEach(img => {
      if (!img.loading) {
        img.loading = 'eager';
      }
      
      if (!img.fetchpriority) {
        img.fetchpriority = 'high';
      }
    });
  }

  breakUpLongTasks() {
    // This would be implemented at the application level
    // Suggesting to use scheduler.postTask or MessageChannel
    logger.info('Suggestion: Break up long tasks using scheduler.postTask');
  }

  offloadToWebWorkers() {
    // Suggest moving heavy computations to web workers
    logger.info('Suggestion: Move heavy computations to Web Workers');
  }

  stabilizeLayout() {
    // Add size attributes to images without them
    const imagesWithoutSize = document.querySelectorAll('img:not([width]):not([height])');
    
    imagesWithoutSize.forEach(img => {
      // Add placeholder dimensions based on common aspect ratios
      if (!img.width && !img.height) {
        img.style.aspectRatio = '16/9';
        img.style.width = '100%';
        img.style.height = 'auto';
      }
    });
  }

  reserveDynamicSpace() {
    // Add min-height to containers that will have dynamic content
    const dynamicContainers = document.querySelectorAll('[data-dynamic]');
    
    dynamicContainers.forEach(container => {
      if (!container.style.minHeight) {
        container.style.minHeight = '200px';
      }
    });
  }

  splitLargeTasks() {
    // Implementation would depend on specific long-running tasks
    logger.info('Suggestion: Split large synchronous tasks');
  }

  scheduleNonCriticalWork() {
    // Use requestIdleCallback for non-critical work
    if ('requestIdleCallback' in window) {
      logger.info('Using requestIdleCallback for non-critical work');
    }
  }

  // ===== PERFORMANCE MONITORING =====
  
  startPerformanceMonitoring() {
    this.isMonitoring = true;
    
    // Report metrics every minute
    this.reportingInterval = setInterval(() => {
      this.reportPerformanceMetrics();
    }, 60000);
  }

  stopPerformanceMonitoring() {
    this.isMonitoring = false;
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  reportPerformanceMetrics() {
    const metrics = this.getPerformanceReport();
    
    logger.info('Performance report', {
      coreWebVitals: metrics.coreWebVitals,
      memory: metrics.memory,
      bundle: metrics.bundle,
      optimizations: metrics.optimizations.length
    });
  }

  // ===== PUBLIC API =====
  
  getPerformanceReport() {
    const coreWebVitals = {};
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => Date.now() - m.timestamp < 60000); // Last minute

    // Aggregate Core Web Vitals
    ['LCP', 'FID', 'CLS'].forEach(metric => {
      const values = recentMetrics.filter(m => m.name === metric);
      if (values.length > 0) {
        const latest = values[values.length - 1];
        coreWebVitals[metric] = {
          value: latest.value,
          grade: latest.grade,
          timestamp: latest.timestamp
        };
      }
    });

    return {
      coreWebVitals,
      memory: {
        used: this.metrics.get('MemoryUsed')?.value || 0,
        total: this.metrics.get('MemoryTotal')?.value || 0
      },
      bundle: {
        jsSize: this.bundleAnalytics.get('totalJS') || 0,
        cssSize: this.bundleAnalytics.get('totalCSS') || 0
      },
      optimizations: Array.from(this.optimizations),
      timestamp: Date.now()
    };
  }

  // Component state caching helpers
  getCachedComponentState(key) {
    const entry = this.componentStateCache.get(key);
    if (entry && !this.isCacheExpired(entry)) {
      return entry.data;
    }
    return null;
  }

  setCachedComponentState(key, data) {
    const strategy = this.cacheStrategies.get('component_state');
    this.componentStateCache.set(key, {
      data,
      timestamp: Date.now(),
      maxAge: strategy.maxAge
    });
  }

  // Manual optimization triggers
  optimizeNow() {
    this.triggerMemoryCleanup('warning');
    this.cleanupCache('warning');
    this.cleanupComponentStateCache();
    
    logger.info('Manual optimization completed');
  }

  // Cleanup
  destroy() {
    this.stopPerformanceMonitoring();
    this.componentStateCache.clear();
    this.metrics.clear();
    this.bundleAnalytics.clear();
    this.optimizations.clear();
    
    if (this.imageObserver) {
      this.imageObserver.disconnect();
    }
    
    logger.info('Performance optimization service destroyed');
  }
}

// ===== SINGLETON INSTANCE =====
const performanceOptimizationService = new PerformanceOptimizationService();

// ===== EXPORTS =====
export { performanceOptimizationService, METRICS_CONFIG, CACHE_STRATEGIES };
export default performanceOptimizationService;