// Authentication Status Indicator Component
// Provides visual feedback about authentication state and troubleshooting

import React, { useState, useEffect } from 'react';
import { validateAuthState } from '../services/authService';
import { validateToken } from '../utils/tokenValidator';

const AuthStatusIndicator = ({ currentUser, isAuthenticated, onAuthIssue }) => {
  const [authStatus, setAuthStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      checkAuthStatus();
    } else {
      setAuthStatus(null);
    }
  }, [isAuthenticated, currentUser]);

  const checkAuthStatus = async () => {
    setIsChecking(true);
    try {
      const result = await validateAuthState(currentUser);
      setAuthStatus(result);
      
      if (!result.valid && onAuthIssue) {
        onAuthIssue(result);
      }
    } catch (error) {
      setAuthStatus({
        valid: false,
        error: error.message,
        code: 'CHECK_ERROR'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-600';
    if (!authStatus) return 'text-gray-500';
    return authStatus.valid ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isChecking) return '⏳';
    if (!authStatus) return '⚪';
    return authStatus.valid ? '✅' : '❌';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking authentication...';
    if (!authStatus) return 'Not authenticated';
    return authStatus.valid ? 'Authentication valid' : 'Authentication issue';
  };

  const getErrorDetails = () => {
    if (!authStatus || authStatus.valid) return null;
    
    const errorMessages = {
      'NO_USER': 'No user session found',
      'NO_TOKEN': 'No authentication token available',
      'INVALID_FORMAT': 'Invalid token format',
      'EXPIRED': 'Authentication token has expired',
      'VALIDATION_ERROR': 'Token validation failed'
    };
    
    return errorMessages[authStatus.code] || authStatus.error;
  };

  const getSuggestions = () => {
    if (!authStatus || authStatus.valid) return null;
    
    const suggestions = {
      'NO_USER': 'Please log in to continue',
      'NO_TOKEN': 'Please log out and log back in',
      'INVALID_FORMAT': 'Please log out and log back in',
      'EXPIRED': 'Your session has expired. Please log in again',
      'VALIDATION_ERROR': 'Please refresh the page and try again'
    };
    
    return suggestions[authStatus.code] || 'Please try logging out and logging back in';
  };

  if (!isAuthenticated) {
    return null; // Don't show anything if user is not supposed to be authenticated
  }

  return (
    <div className="auth-status-indicator">
      <div className="flex items-center space-x-2">
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusIcon()} {getStatusText()}
        </span>
        
        {authStatus && !authStatus.valid && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        )}
        
        <button
          onClick={checkAuthStatus}
          disabled={isChecking}
          className="text-xs text-gray-600 hover:text-gray-800 underline"
        >
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      {showDetails && authStatus && !authStatus.valid && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
          <div className="font-medium text-red-800 mb-1">
            Authentication Issue
          </div>
          <div className="text-red-700 mb-2">
            {getErrorDetails()}
          </div>
          <div className="text-red-600">
            <strong>Suggested action:</strong> {getSuggestions()}
          </div>
          
          {authStatus.userInfo && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <div className="font-medium text-red-800 mb-1">Debug Info:</div>
              <div className="text-xs text-red-600 font-mono">
                User ID: {authStatus.userInfo.userId}<br/>
                Token Use: {authStatus.userInfo.tokenUse}<br/>
                Error Code: {authStatus.code}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthStatusIndicator;