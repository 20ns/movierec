// src/components/ErrorComponents.jsx
// Professional error UI components with user-friendly messaging and recovery actions

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  WifiIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  XMarkIcon,
  HomeIcon,
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from '@heroicons/react/24/solid';

import { ERROR_SEVERITY, ERROR_TYPES } from '../services/errorRecoveryService';

// ===== ERROR SEVERITY CONFIGS =====
const SEVERITY_CONFIGS = {
  [ERROR_SEVERITY.LOW]: {
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700/50',
    textColor: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-500',
    icon: InformationCircleIcon
  },
  [ERROR_SEVERITY.MEDIUM]: {
    color: 'yellow',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-700/50',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    iconColor: 'text-yellow-500',
    icon: ExclamationTriangleIcon
  },
  [ERROR_SEVERITY.HIGH]: {
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700/50',
    textColor: 'text-orange-800 dark:text-orange-200',
    iconColor: 'text-orange-500',
    icon: ExclamationCircleIcon
  },
  [ERROR_SEVERITY.CRITICAL]: {
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700/50',
    textColor: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-500',
    icon: XCircleIcon
  }
};

// ===== ERROR BANNER COMPONENT =====
export const ErrorBanner = ({ 
  error, 
  onDismiss, 
  onAction,
  autoHide = false,
  autoHideDelay = 5000,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && error.severity <= ERROR_SEVERITY.MEDIUM) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, error.severity, onDismiss]);

  if (!isVisible) return null;

  const config = SEVERITY_CONFIGS[error.severity] || SEVERITY_CONFIGS[ERROR_SEVERITY.MEDIUM];
  const IconComponent = config.icon;

  const handleAction = (action) => {
    onAction?.(action);
    if (action.type === 'dismiss') {
      setIsVisible(false);
      onDismiss?.();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          ${config.bgColor} ${config.borderColor} ${config.textColor}
          border rounded-lg p-4 shadow-sm
          ${className}
        `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold">{error.title}</h3>
            <p className="mt-1 text-sm">{error.message}</p>
            
            {error.suggestion && (
              <p className="mt-2 text-sm opacity-75">{error.suggestion}</p>
            )}
            
            {error.recoveryActions && error.recoveryActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {error.recoveryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    className={`
                      text-xs px-3 py-1 rounded-md font-medium transition-colors
                      ${action.primary 
                        ? `bg-${config.color}-600 hover:bg-${config.color}-700 text-white`
                        : `bg-transparent hover:bg-${config.color}-100 dark:hover:bg-${config.color}-800 border border-current`
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {onDismiss && (
            <div className="ml-auto pl-3">
              <button
                onClick={() => handleAction({ type: 'dismiss' })}
                className={`
                  inline-flex rounded-md p-1.5 ${config.textColor} 
                  hover:bg-${config.color}-100 dark:hover:bg-${config.color}-800 
                  transition-colors
                `}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ===== ERROR MODAL COMPONENT =====
export const ErrorModal = ({ 
  error, 
  isOpen, 
  onClose, 
  onAction,
  showDetails = false,
  canClose = true 
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!isOpen) return null;

  const config = SEVERITY_CONFIGS[error.severity] || SEVERITY_CONFIGS[ERROR_SEVERITY.MEDIUM];
  const IconComponent = config.icon;

  const handleAction = (action) => {
    onAction?.(action);
    if (action.type === 'close' && canClose) {
      onClose?.();
    }
  };

  const copyErrorDetails = () => {
    const details = `
Error: ${error.title}
Message: ${error.message}
Error ID: ${error.errorId}
Timestamp: ${new Date().toISOString()}
Type: ${error.errorRecord?.classification?.type}
Component: ${error.errorRecord?.component}
    `.trim();

    navigator.clipboard?.writeText(details);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={canClose ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="
              inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle 
              bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700
              transform transition-all
            "
          >
            {/* Header */}
            <div className="flex items-start">
              <div className={`
                flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full
                ${config.bgColor}
              `}>
                <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
              </div>
              
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {error.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {error.message}
                </p>
                
                {error.suggestion && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    💡 {error.suggestion}
                  </p>
                )}
              </div>
              
              {canClose && (
                <button
                  onClick={onClose}
                  className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Technical Details Toggle */}
            {showDetails && error.errorRecord && (
              <div className="mt-4">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <ChevronRightIcon 
                    className={`w-4 h-4 mr-1 transition-transform ${showTechnicalDetails ? 'rotate-90' : ''}`} 
                  />
                  Technical Details
                </button>
                
                <AnimatePresence>
                  {showTechnicalDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs font-mono"
                    >
                      <div className="space-y-1 text-gray-600 dark:text-gray-300">
                        <div><strong>Error ID:</strong> {error.errorId}</div>
                        <div><strong>Type:</strong> {error.errorRecord.classification.type}</div>
                        <div><strong>Component:</strong> {error.errorRecord.component}</div>
                        <div><strong>Timestamp:</strong> {error.errorRecord.timestamp}</div>
                        {error.errorRecord.context && Object.keys(error.errorRecord.context).length > 0 && (
                          <div><strong>Context:</strong> {JSON.stringify(error.errorRecord.context, null, 2)}</div>
                        )}
                      </div>
                      
                      <button
                        onClick={copyErrorDetails}
                        className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <ClipboardDocumentIcon className="w-3 h-3 mr-1" />
                        Copy Details
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions */}
            {error.recoveryActions && error.recoveryActions.length > 0 && (
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                {error.recoveryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${action.primary
                        ? `bg-${config.color}-600 hover:bg-${config.color}-700 text-white focus:ring-${config.color}-500`
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 focus:ring-gray-500'
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

// ===== ERROR CARD COMPONENT =====
export const ErrorCard = ({ 
  error, 
  onAction, 
  showActions = true,
  compact = false,
  className = '' 
}) => {
  const config = SEVERITY_CONFIGS[error.severity] || SEVERITY_CONFIGS[ERROR_SEVERITY.MEDIUM];
  const IconComponent = config.icon;

  return (
    <div className={`
      ${config.bgColor} ${config.borderColor} 
      border rounded-lg p-4 shadow-sm
      ${className}
    `}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${config.textColor}`}>
            {error.title}
          </h3>
          <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>
            {error.message}
          </p>
          
          {!compact && error.suggestion && (
            <p className={`mt-2 text-sm ${config.textColor} opacity-75`}>
              {error.suggestion}
            </p>
          )}
          
          {showActions && error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {error.recoveryActions.slice(0, compact ? 1 : 3).map((action, index) => (
                <button
                  key={index}
                  onClick={() => onAction?.(action)}
                  className={`
                    text-xs px-3 py-1 rounded-md font-medium transition-colors
                    ${action.primary 
                      ? `bg-${config.color}-600 hover:bg-${config.color}-700 text-white`
                      : `bg-transparent hover:bg-${config.color}-100 dark:hover:bg-${config.color}-800 border border-current`
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== ERROR TOAST COMPONENT =====
export const ErrorToast = ({ 
  error, 
  onDismiss, 
  position = 'top-right',
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (error.severity <= ERROR_SEVERITY.MEDIUM) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, error.severity, onDismiss]);

  if (!isVisible) return null;

  const config = SEVERITY_CONFIGS[error.severity] || SEVERITY_CONFIGS[ERROR_SEVERITY.MEDIUM];
  const IconComponent = config.icon;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      <motion.div
        initial={{ opacity: 0, x: position.includes('right') ? 300 : -300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: position.includes('right') ? 300 : -300 }}
        className={`
          max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700
          ${config.borderColor}
        `}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {error.title}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {error.message}
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss?.();
              }}
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ===== CONNECTIVITY STATUS COMPONENT =====
export const ConnectivityStatus = ({ 
  isOnline, 
  onRetry,
  compact = false 
}) => {
  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-3"
    >
      <div className="flex items-center">
        <WifiIcon className="h-5 w-5 text-yellow-500 mr-3" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {compact ? 'Offline' : 'No internet connection'}
          </p>
          {!compact && (
            <p className="text-sm text-yellow-600 dark:text-yellow-300">
              You're working offline. Changes will sync when connection is restored.
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-3 text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ===== ERROR FALLBACK PAGE =====
export const ErrorFallbackPage = ({ 
  error, 
  onAction,
  showHomeButton = true 
}) => {
  const config = SEVERITY_CONFIGS[error?.severity || ERROR_SEVERITY.CRITICAL];
  const IconComponent = config.icon;

  const handleHomeClick = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className={`
          flex items-center justify-center w-16 h-16 mx-auto rounded-full mb-6
          ${config.bgColor}
        `}>
          <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {error?.title || 'Something went wrong'}
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {error?.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
        </p>
        
        {error?.suggestion && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 {error.suggestion}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          {error?.recoveryActions?.map((action, index) => (
            <button
              key={index}
              onClick={() => onAction?.(action)}
              className={`
                w-full px-4 py-3 rounded-lg font-medium transition-colors
                ${action.primary
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }
              `}
            >
              {action.label}
            </button>
          ))}
          
          {showHomeButton && (
            <button
              onClick={handleHomeClick}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Go Home
            </button>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? {' '}
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center">
              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1" />
              Contact Support
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ===== EXPORT ALL COMPONENTS =====
export default {
  ErrorBanner,
  ErrorModal,
  ErrorCard,
  ErrorToast,
  ConnectivityStatus,
  ErrorFallbackPage
};