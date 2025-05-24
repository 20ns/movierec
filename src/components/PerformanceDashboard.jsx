import React from 'react';
import { usePerformanceMonitoring } from '../utils/webVitals';

/**
 * Performance Dashboard Component
 * Displays real-time Web Vitals and performance metrics
 */
const PerformanceDashboard = ({ isVisible = false }) => {
  const performanceData = usePerformanceMonitoring();

  if (!isVisible || !performanceData) {
    return null;
  }

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatValue = (metric, unit = 'ms') => {
    if (!metric || metric.value === null) return 'N/A';
    
    if (unit === 'ms') {
      return `${Math.round(metric.value)}ms`;
    } else if (unit === 'score') {
      return metric.value.toFixed(3);
    }
    return metric.value;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md z-50 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Performance Metrics</h3>
        <div className="text-xs text-gray-500">Real-time</div>
      </div>

      {/* Core Web Vitals */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Core Web Vitals</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">LCP (Largest Contentful Paint)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(performanceData.coreWebVitals.LCP?.rating)}`}>
              {formatValue(performanceData.coreWebVitals.LCP)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">FID (First Input Delay)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(performanceData.coreWebVitals.FID?.rating)}`}>
              {formatValue(performanceData.coreWebVitals.FID)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">CLS (Cumulative Layout Shift)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(performanceData.coreWebVitals.CLS?.rating)}`}>
              {formatValue(performanceData.coreWebVitals.CLS, 'score')}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Metrics</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">FCP (First Contentful Paint)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(performanceData.additionalMetrics.FCP?.rating)}`}>
              {formatValue(performanceData.additionalMetrics.FCP)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">TTFB (Time to First Byte)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(performanceData.additionalMetrics.TTFB?.rating)}`}>
              {formatValue(performanceData.additionalMetrics.TTFB)}
            </span>
          </div>
          
          {performanceData.additionalMetrics.pageLoadTime && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Page Load Time</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600">
                {formatValue(performanceData.additionalMetrics.pageLoadTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <div className="text-xs text-gray-500">
          Press Ctrl+Shift+P to toggle this dashboard
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
