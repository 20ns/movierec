// src/components/ContextAwareErrorBoundary.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useUserData } from '../contexts/UserDataContext';

// Enhanced ErrorBoundary that can interact with UserDataContext
class ContextAwareErrorBoundaryComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ContextAwareErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Enhanced error reporting with context information
    this.reportError(error, errorInfo);

    // Attempt to recover context state if error is context-related
    this.attemptContextRecovery(error);
  }

  reportError = (error, errorInfo) => {
    const { contextInfo } = this.props;
    
    // Create comprehensive error report
    const errorReport = {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      contextState: contextInfo || {},
      retryCount: this.state.retryCount
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Context-Aware Error Report');
      console.error('Error Report:', errorReport);
      console.groupEnd();
    }

    // Report to error tracking service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `${error.toString()} | Context: ${JSON.stringify(contextInfo || {})}`,
        fatal: false,
        custom_map: {
          error_id: this.state.errorId,
          context_state: JSON.stringify(contextInfo || {})
        }
      });
    }

    // TODO: Send to external error monitoring service (Sentry, LogRocket, etc.)
    // this.sendToErrorService(errorReport);
  };

  attemptContextRecovery = (error) => {
    const { onContextError } = this.props;
    
    // If this is likely a context-related error, try to recover
    if (error.message.includes('useUserData') || error.message.includes('Context')) {
      console.warn('Attempting context recovery...');
      if (onContextError && typeof onContextError === 'function') {
        try {
          onContextError(error);
        } catch (recoveryError) {
          console.error('Context recovery failed:', recoveryError);
        }
      }
    }
  };

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Limit retry attempts to prevent infinite loops
    if (newRetryCount > 3) {
      console.warn('Max retry attempts reached, forcing page reload');
      window.location.reload();
      return;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: null,
      retryCount: newRetryCount
    });

    // Call recovery callback if provided
    if (this.props.onRetry) {
      this.props.onRetry(newRetryCount);
    }
  };

  handleReload = () => {
    // Clear any corrupted localStorage data before reload
    try {
      const keys = Object.keys(localStorage);
      const userKeys = keys.filter(key => 
        key.startsWith('userPrefs_') || 
        key.startsWith('questionnaire_completed_') ||
        key.startsWith('movieRec_')
      );
      
      if (userKeys.length > 0 && confirm('Clear cached data and reload? This might fix the issue.')) {
        userKeys.forEach(key => localStorage.removeItem(key));
      }
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, retryCount } = this.state;
      const { fallback: CustomFallback, minimal = false, componentName = 'Component' } = this.props;

      // Custom fallback
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error}
            errorInfo={errorInfo}
            errorId={errorId}
            retryCount={retryCount}
            componentName={componentName}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            onGoHome={this.handleGoHome}
          />
        );
      }

      // Minimal error display
      if (minimal) {
        return (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-400 text-sm">{componentName} failed to load</span>
              <button
                onClick={this.handleRetry}
                className="text-xs text-red-300 hover:text-red-200 underline"
              >
                Retry {retryCount > 0 && `(${retryCount})`}
              </button>
            </div>
          </div>
        );
      }

      // Full error page with context awareness
      return (
        <>
          <Helmet>
            <title>Error - Movie Recommendations</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          
          <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <svg 
                  className="w-8 h-8 text-red-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                {componentName} Encountered an Error
              </h1>
              
              <p className="text-gray-400 mb-6">
                We encountered an unexpected error while loading your preferences. 
                {retryCount > 0 && ` (Attempt ${retryCount + 1}/4)`}
              </p>

              <p className="text-xs text-gray-500 mb-6">
                Error ID: {errorId}
              </p>

              <div className="space-y-3 sm:space-y-0 sm:space-x-3 sm:flex sm:justify-center">
                <button
                  onClick={this.handleRetry}
                  disabled={retryCount >= 3}
                  className={`w-full sm:w-auto px-6 py-2 rounded-lg transition-colors duration-200 ${
                    retryCount >= 3 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {retryCount >= 3 ? 'Max Retries Reached' : `Try Again ${retryCount > 0 ? `(${retryCount})` : ''}`}
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full sm:w-auto px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                >
                  Go Home
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors duration-200"
                >
                  Clear Data & Reload
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-8 text-left">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 mb-2">
                    🔧 Developer Details
                  </summary>
                  
                  <div className="bg-gray-800 p-4 rounded-lg text-xs">
                    <div className="mb-4">
                      <h3 className="text-red-400 font-semibold mb-1">Error:</h3>
                      <pre className="text-red-300 whitespace-pre-wrap break-words">
                        {error.toString()}
                      </pre>
                    </div>
                    
                    {errorInfo && (
                      <div className="mb-4">
                        <h3 className="text-yellow-400 font-semibold mb-1">Component Stack:</h3>
                        <pre className="text-yellow-300 whitespace-pre-wrap break-words">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {this.props.contextInfo && (
                      <div>
                        <h3 className="text-blue-400 font-semibold mb-1">Context State:</h3>
                        <pre className="text-blue-300 whitespace-pre-wrap break-words">
                          {JSON.stringify(this.props.contextInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="mt-8 text-xs text-gray-500">
                <p>
                  If the problem persists, please{' '}
                  <a 
                    href="mailto:support@movierec.net" 
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    contact support
                  </a>
                  {' '}and include the error ID above.
                </p>
              </div>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that provides context information
export const ContextAwareErrorBoundary = (props) => {
  // Safely access context - handle case where provider is not available
  let contextInfo = null;
  let onContextError = null;

  try {
    const context = useUserData();
    contextInfo = {
      isAuthenticated: context.isAuthenticated,
      userId: context.userId,
      hasPreferences: !!context.userPreferences,
      questionnaireCompleted: context.questionnaireCompleted,
      recommendationsVisible: context.recommendationsVisible,
      initialAppLoadComplete: context.initialAppLoadComplete,
      preferencesLoading: context.preferencesLoading
    };
    
    // Provide context error recovery
    onContextError = (error) => {
      console.warn('Attempting to recover from context error:', error.message);
      // Reset problematic state
      if (context.setUIState) {
        context.setUIState({
          showQuestionnaireModal: false,
          showPreferencesPrompt: false,
          syncInProgress: false
        });
      }
    };
  } catch (e) {
    // Context not available - this is fine for top-level boundaries
    console.warn('UserDataContext not available in ErrorBoundary:', e.message);
  }

  return (
    <ContextAwareErrorBoundaryComponent
      {...props}
      contextInfo={contextInfo}
      onContextError={onContextError}
    />
  );
};

// Specialized error boundaries for different component types
export const QuestionnaireErrorBoundary = ({ children }) => (
  <ContextAwareErrorBoundary
    componentName="Questionnaire"
    fallback={({ error, onRetry, componentName }) => (
      <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            {componentName} Error
          </h3>
          <p className="text-gray-300 mb-4">
            There was an issue loading your questionnaire. This might be due to corrupted preference data.
          </p>
          <div className="space-x-3">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                // Clear questionnaire data and retry
                try {
                  const keys = Object.keys(localStorage);
                  keys.filter(key => key.includes('questionnaire') || key.includes('userPrefs')).forEach(key => {
                    localStorage.removeItem(key);
                  });
                  onRetry();
                } catch (e) {
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Reset & Retry
            </button>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ContextAwareErrorBoundary>
);

export const RecommendationsErrorBoundary = ({ children }) => (
  <ContextAwareErrorBoundary
    componentName="Recommendations"
    fallback={({ error, onRetry, componentName }) => (
      <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            Recommendations Unavailable
          </h3>
          <p className="text-gray-300 mb-4">
            We couldn't load your personalized recommendations. This might be a temporary issue.
          </p>
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Retry Loading
          </button>
        </div>
      </div>
    )}
    minimal
  >
    {children}
  </ContextAwareErrorBoundary>
);

export const ProgressErrorBoundary = ({ children }) => (
  <ContextAwareErrorBoundary
    componentName="Progress Tracker"
    minimal
  >
    {children}
  </ContextAwareErrorBoundary>
);

export default ContextAwareErrorBoundary;