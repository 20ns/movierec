// src/components/LoadingComponents.jsx
// Reusable loading UI components with coordinated animations

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

// ===== LOADING SPINNER COMPONENT =====
export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'indigo', 
  label,
  showLabel = true 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    indigo: 'text-indigo-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    gray: 'text-gray-400'
  };

  return (
    <div className="flex items-center space-x-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
        className={`${sizeClasses[size]} ${colorClasses[color]}`}
      >
        <ArrowPathIcon />
      </motion.div>
      {showLabel && label && (
        <span className="text-sm text-gray-400">{label}</span>
      )}
    </div>
  );
};

// ===== LOADING SKELETON COMPONENT =====
export const LoadingSkeleton = ({ 
  lines = 3, 
  height = 'h-4', 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          className={`bg-gray-700/50 rounded ${height}`}
          style={{
            width: `${Math.random() * 30 + 70}%` // Random width between 70-100%
          }}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.1
          }}
        />
      ))}
    </div>
  );
};

// ===== LOADING OVERLAY COMPONENT =====
export const LoadingOverlay = ({ 
  isVisible, 
  message = 'Loading...', 
  backdrop = true,
  size = 'md'
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex items-center justify-center ${
            backdrop ? 'bg-black/50 backdrop-blur-sm' : ''
          }`}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl"
          >
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner size={size} />
              <p className="text-white font-medium">{message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ===== PROGRESS BAR COMPONENT =====
export const ProgressBar = ({ 
  progress = 0, 
  label,
  color = 'indigo',
  size = 'md',
  showPercentage = true
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    indigo: 'from-indigo-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    purple: 'from-purple-500 to-pink-600'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-white">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-400">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-700 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <motion.div
          className={`${sizeClasses[size]} bg-gradient-to-r ${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ 
            duration: 0.5,
            ease: "easeOut"
          }}
        />
      </div>
    </div>
  );
};

// ===== LOADING STATE INDICATOR =====
export const LoadingStateIndicator = ({ 
  state, 
  size = 'md',
  showLabel = true 
}) => {
  const getStateConfig = (state) => {
    switch (state) {
      case 'loading':
        return {
          icon: ArrowPathIcon,
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-500/20',
          label: 'Loading...',
          animated: true
        };
      case 'success':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          label: 'Success',
          animated: false
        };
      case 'error':
        return {
          icon: XCircleIcon,
          color: 'text-red-500',
          bgColor: 'bg-red-500/20',
          label: 'Error',
          animated: false
        };
      case 'timeout':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/20',
          label: 'Timeout',
          animated: false
        };
      default:
        return {
          icon: Cog6ToothIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/20',
          label: 'Idle',
          animated: false
        };
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const config = getStateConfig(state);
  const IconComponent = config.icon;

  return (
    <div className="flex items-center space-x-2">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <motion.div
          className={`${sizeClasses[size]} ${config.color}`}
          animate={config.animated ? { rotate: 360 } : {}}
          transition={config.animated ? {
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          } : {}}
        >
          <IconComponent />
        </motion.div>
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

// ===== OPERATION LIST COMPONENT =====
export const OperationList = ({ 
  operations = [], 
  maxVisible = 3,
  compact = false 
}) => {
  const visibleOps = operations.slice(0, maxVisible);
  const hiddenCount = Math.max(0, operations.length - maxVisible);

  if (operations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visibleOps.map((operation) => (
          <motion.div
            key={operation.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 ${
              compact ? 'p-2' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <LoadingStateIndicator 
                state={operation.state} 
                size={compact ? 'sm' : 'md'}
                showLabel={false}
              />
              <div>
                <p className={`font-medium text-white ${compact ? 'text-sm' : ''}`}>
                  {operation.type.replace(/_/g, ' ').toLowerCase()}
                </p>
                {!compact && operation.component && (
                  <p className="text-xs text-gray-400">{operation.component}</p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                {Math.round(operation.duration / 1000)}s
              </p>
              {operation.error && (
                <p className="text-xs text-red-400 truncate max-w-32">
                  {operation.error}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {hiddenCount > 0 && (
        <p className="text-xs text-gray-500 text-center">
          +{hiddenCount} more operation{hiddenCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

// ===== CONNECTIVITY INDICATOR =====
export const ConnectivityIndicator = ({ 
  isOnline, 
  showLabel = true,
  size = 'sm' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center space-x-2">
      <motion.div
        className={`${sizeClasses[size]} ${
          isOnline ? 'text-green-500' : 'text-red-500'
        }`}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {isOnline ? <SignalIcon /> : <CloudIcon />}
      </motion.div>
      {showLabel && (
        <span className={`text-xs font-medium ${
          isOnline ? 'text-green-400' : 'text-red-400'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

// ===== LOADING CARD WRAPPER =====
export const LoadingCard = ({ 
  isLoading, 
  error, 
  children, 
  fallback,
  retryFn,
  className = ''
}) => {
  if (error) {
    return (
      <div className={`p-6 bg-red-900/20 border border-red-500/30 rounded-xl ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <XCircleIcon className="w-5 h-5 text-red-500" />
            <span className="text-red-400 font-medium">Error</span>
          </div>
          {retryFn && (
            <button
              onClick={retryFn}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>
        <p className="text-sm text-red-300">
          {typeof error === 'string' ? error : error?.message || 'An error occurred'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl ${className}`}>
        {fallback || (
          <div className="space-y-4">
            <LoadingSpinner label="Loading..." />
            <LoadingSkeleton lines={3} />
          </div>
        )}
      </div>
    );
  }

  return children;
};

// ===== EXPORT ALL COMPONENTS =====
export default {
  LoadingSpinner,
  LoadingSkeleton,
  LoadingOverlay,
  ProgressBar,
  LoadingStateIndicator,
  OperationList,
  ConnectivityIndicator,
  LoadingCard
};