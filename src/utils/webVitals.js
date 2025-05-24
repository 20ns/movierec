/**
 * Web Vitals Monitoring Utility
 * Tracks Core Web Vitals and other performance metrics
 * Helps optimize for Google's page experience signals
 */

// Web Vitals thresholds (Google's recommended values)
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }  // Time to First Byte
};

/**
 * Performance monitoring class
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'production';
    
    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  /**
   * Initialize all performance monitoring
   */
  initializeMonitoring() {
    this.monitorWebVitals();
    this.monitorResourceLoading();
    this.monitorNavigationTiming();
    this.monitorUserInteractions();
    
    // Report metrics periodically
    setTimeout(() => this.reportMetrics(), 5000);
    
    // Report on page unload
    window.addEventListener('beforeunload', () => this.reportMetrics());
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observePerformanceEntries('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime);
    });

    // First Input Delay (FID)
    this.observePerformanceEntries('first-input', (entries) => {
      const firstEntry = entries[0];
      this.recordMetric('FID', firstEntry.processingStart - firstEntry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformanceEntries('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });

    // First Contentful Paint (FCP)
    this.observePerformanceEntries('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordMetric('FCP', fcpEntry.startTime);
      }
    });

    // Time to First Byte (TTFB)
    if (performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        this.recordMetric('TTFB', navEntry.responseStart - navEntry.requestStart);
      }
    }
  }

  /**
   * Monitor resource loading performance
   */
  monitorResourceLoading() {
    this.observePerformanceEntries('resource', (entries) => {
      entries.forEach(entry => {
        const resourceType = this.getResourceType(entry.name);
        const duration = entry.responseEnd - entry.startTime;
        
        this.recordMetric(`${resourceType}_load_time`, duration);
        
        // Track slow resources
        if (duration > 3000) { // 3 seconds threshold
          this.recordMetric('slow_resources', {
            name: entry.name,
            duration,
            type: resourceType
          });
        }
      });
    });
  }

  /**
   * Monitor navigation timing
   */
  monitorNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navEntry = performance.getEntriesByType('navigation')[0];
        if (navEntry) {
          this.recordMetric('DOM_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
          this.recordMetric('load_complete', navEntry.loadEventEnd - navEntry.loadEventStart);
          this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.navigationStart);
        }
      }, 0);
    });
  }

  /**
   * Monitor user interactions
   */
  monitorUserInteractions() {
    let interactionCount = 0;
    
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        interactionCount++;
        this.recordMetric('user_interactions', interactionCount);
      }, { passive: true });
    });

    // Track time to first interaction
    let firstInteractionTime = null;
    const recordFirstInteraction = () => {
      if (!firstInteractionTime) {
        firstInteractionTime = performance.now();
        this.recordMetric('time_to_first_interaction', firstInteractionTime);
        
        // Remove listeners after first interaction
        ['click', 'keydown', 'touchstart'].forEach(eventType => {
          document.removeEventListener(eventType, recordFirstInteraction);
        });
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, recordFirstInteraction, { passive: true });
    });
  }

  /**
   * Observe performance entries with a PerformanceObserver
   */
  observePerformanceEntries(entryType, callback) {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value) {
    const timestamp = Date.now();
    
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    
    this.metrics[name].push({ value, timestamp });
    
    // Log significant metrics
    if (['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(name)) {
      const threshold = WEB_VITALS_THRESHOLDS[name];
      const rating = this.getRating(value, threshold);
      
      console.log(`[WebVitals] ${name}: ${value.toFixed(2)} (${rating})`);
      
      // Track in Google Analytics if available
      if (typeof gtag !== 'undefined') {
        gtag('event', name, {
          event_category: 'Web Vitals',
          value: Math.round(value),
          custom_map: { metric_rating: rating }
        });
      }
    }
  }

  /**
   * Get performance rating based on thresholds
   */
  getRating(value, threshold) {
    if (!threshold) return 'unknown';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.includes('.css')) return 'css';
    if (url.includes('.js')) return 'javascript';
    if (/\.(jpg|jpeg|png|gif|svg|webp|avif)/.test(url)) return 'image';
    if (/\.(woff|woff2|ttf|otf)/.test(url)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Report collected metrics
   */
  reportMetrics() {
    if (Object.keys(this.metrics).length === 0) {
      return;
    }

    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.processMetrics()
    };

    // Send to analytics or monitoring service
    this.sendToAnalytics(report);
  }

  /**
   * Process raw metrics for reporting
   */
  processMetrics() {
    const processed = {};
    
    Object.entries(this.metrics).forEach(([name, values]) => {
      if (values.length === 0) return;
      
      const numericValues = values
        .map(v => typeof v.value === 'number' ? v.value : 0)
        .filter(v => v > 0);
      
      if (numericValues.length > 0) {
        processed[name] = {
          latest: numericValues[numericValues.length - 1],
          average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          max: Math.max(...numericValues),
          min: Math.min(...numericValues),
          count: numericValues.length
        };
      }
    });
    
    return processed;
  }

  /**
   * Send metrics to analytics service
   */
  sendToAnalytics(report) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metrics', {
        event_category: 'Performance',
        custom_parameters: report
      });
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Performance Report');
      console.table(report.metrics);
      console.groupEnd();
    }

    // Send to custom analytics endpoint (if available)
    if (process.env.REACT_APP_ANALYTICS_ENDPOINT) {
      fetch(process.env.REACT_APP_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(error => {
        console.warn('Failed to send performance metrics:', error);
      });
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary() {
    return {
      coreWebVitals: {
        LCP: this.getLatestMetric('LCP'),
        FID: this.getLatestMetric('FID'),
        CLS: this.getLatestMetric('CLS')
      },
      additionalMetrics: {
        FCP: this.getLatestMetric('FCP'),
        TTFB: this.getLatestMetric('TTFB'),
        pageLoadTime: this.getLatestMetric('page_load_time'),
        timeToFirstInteraction: this.getLatestMetric('time_to_first_interaction')
      }
    };
  }

  /**
   * Get latest value for a metric
   */
  getLatestMetric(name) {
    const metric = this.metrics[name];
    if (!metric || metric.length === 0) return null;
    
    const latest = metric[metric.length - 1];
    const threshold = WEB_VITALS_THRESHOLDS[name];
    
    return {
      value: latest.value,
      rating: this.getRating(latest.value, threshold),
      timestamp: latest.timestamp
    };
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for accessing performance data
 */
export function usePerformanceMonitoring() {
  const [summary, setSummary] = React.useState(null);

  React.useEffect(() => {
    const updateSummary = () => {
      setSummary(performanceMonitor.getPerformanceSummary());
    };

    // Update initially and then every 5 seconds
    updateSummary();
    const interval = setInterval(updateSummary, 5000);

    return () => clearInterval(interval);
  }, []);

  return summary;
}

/**
 * Mark custom performance measurements
 */
export function markPerformance(name, detail = {}) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
    performanceMonitor.recordMetric(`custom_${name}`, performance.now());
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name, startMark, endMark) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      performanceMonitor.recordMetric(`measure_${name}`, measure.duration);
      return measure.duration;
    } catch (error) {
      console.warn(`Failed to measure ${name}:`, error);
    }
  }
  return null;
}

export default performanceMonitor;
