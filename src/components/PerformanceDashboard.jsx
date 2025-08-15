// src/components/PerformanceDashboard.jsx
// Performance monitoring dashboard for development and optimization

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeSlashIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

import {
  useCoreWebVitals,
  useMemoryMonitoring,
  useBundleMonitoring
} from '../hooks/usePerformance';

// ===== PERFORMANCE METRIC CARD =====
const MetricCard = ({ 
  title, 
  value, 
  unit, 
  grade, 
  threshold,
  icon: Icon,
  description 
}) => {
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGradeIcon = (grade) => {
    switch (grade) {
      case 'good': return CheckCircleIcon;
      case 'needs-improvement': return ExclamationTriangleIcon;
      case 'poor': return XCircleIcon;
      default: return ClockIcon;
    }
  };

  const GradeIcon = getGradeIcon(grade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${getGradeColor(grade)} transition-colors`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {Icon && <Icon className="w-5 h-5 mr-2" />}
          <h3 className="font-medium">{title}</h3>
        </div>
        <GradeIcon className="w-4 h-4" />
      </div>
      
      <div className="mb-1">
        <span className="text-2xl font-bold">
          {value !== null ? Math.round(value * 100) / 100 : '--'}
        </span>
        <span className="text-sm ml-1">{unit}</span>
      </div>
      
      {threshold && (
        <div className="text-xs opacity-75 mb-2">
          Threshold: {threshold}
        </div>
      )}
      
      {description && (
        <p className="text-xs opacity-75">{description}</p>
      )}
    </motion.div>
  );
};

// ===== MEMORY USAGE CHART =====
const MemoryChart = ({ memoryInfo }) => {
  const { used, total, limit, usagePercent } = memoryInfo;

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center">
          <CpuChipIcon className="w-5 h-5 mr-2" />
          Memory Usage
        </h3>
        <span className={`text-sm px-2 py-1 rounded ${
          usagePercent > 80 ? 'bg-red-100 text-red-700' :
          usagePercent > 60 ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {Math.round(usagePercent)}%
        </span>
      </div>
      
      {/* Memory Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            className={`h-3 rounded-full transition-colors ${
              usagePercent > 80 ? 'bg-red-500' :
              usagePercent > 60 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
          />
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>{used}MB used</span>
          <span>{limit}MB limit</span>
        </div>
      </div>
      
      {/* Memory Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-500">Used</div>
          <div className="font-semibold">{used}MB</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total</div>
          <div className="font-semibold">{total}MB</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Limit</div>
          <div className="font-semibold">{limit}MB</div>
        </div>
      </div>
    </div>
  );
};

// ===== MAIN PERFORMANCE DASHBOARD =====
const PerformanceDashboard = ({ 
  isVisible = false, 
  onToggle,
  position = 'bottom-right',
  minimized = false 
}) => {
  const [isMinimized, setIsMinimized] = useState(minimized);
  
  const coreWebVitals = useCoreWebVitals();
  const memoryInfo = useMemoryMonitoring();
  const bundleInfo = useBundleMonitoring();

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed ${positionClasses[position]} z-50 max-w-lg`}
    >
      {isMinimized ? (
        // Minimized View
        <motion.div
          onClick={() => setIsMinimized(false)}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 cursor-pointer hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="w-5 h-5 text-gray-600" />
            <div className="flex space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                coreWebVitals.overallScore === 'good' ? 'bg-green-500' :
                coreWebVitals.overallScore === 'needs-improvement' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-gray-700">
                Performance
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        // Full Dashboard
        <motion.div
          className="bg-white rounded-lg shadow-lg border border-gray-200 w-96 max-h-[70vh] overflow-hidden"
          layout
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ChartBarIcon className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="font-semibold text-gray-900">Performance</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <EyeSlashIcon className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <XCircleIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-96">
            <div className="space-y-4">
              {/* Core Web Vitals */}
              <div className="grid gap-3">
                <MetricCard
                  title="Largest Contentful Paint"
                  value={coreWebVitals.LCP?.value}
                  unit="ms"
                  grade={coreWebVitals.LCP?.grade}
                  threshold="< 2.5s"
                  icon={ClockIcon}
                  description="Time to render the largest content element"
                />
                
                <MetricCard
                  title="First Input Delay"
                  value={coreWebVitals.FID?.value}
                  unit="ms"
                  grade={coreWebVitals.FID?.grade}
                  threshold="< 100ms"
                  icon={CpuChipIcon}
                  description="Time from first interaction to browser response"
                />
                
                <MetricCard
                  title="Cumulative Layout Shift"
                  value={coreWebVitals.CLS?.value}
                  unit=""
                  grade={coreWebVitals.CLS?.grade}
                  threshold="< 0.1"
                  icon={ChartBarIcon}
                  description="Visual stability during page load"
                />
              </div>

              {/* Memory Usage */}
              <MemoryChart memoryInfo={memoryInfo} />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ===== PERFORMANCE TOGGLE BUTTON =====
export const PerformanceToggle = ({ onToggle, isVisible }) => {
  const coreWebVitals = useCoreWebVitals();

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-4 left-4 z-40 p-3 rounded-full shadow-lg transition-all ${
        isVisible ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
      title="Toggle Performance Dashboard"
    >
      <ChartBarIcon className="w-5 h-5" />
      
      {/* Status Indicator */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
        coreWebVitals.overallScore === 'good' ? 'bg-green-500' :
        coreWebVitals.overallScore === 'needs-improvement' ? 'bg-yellow-500' :
        'bg-red-500'
      }`} />
    </button>
  );
};

// ===== EXPORTS =====
export default PerformanceDashboard;