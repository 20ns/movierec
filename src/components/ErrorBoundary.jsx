import React from 'react';
import { Helmet } from 'react-helmet-async';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Details');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: null 
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      const { fallback: CustomFallback, minimal = false } = this.props;

      // If a custom fallback is provided, use it
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error}
            errorInfo={errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            onGoHome={this.handleGoHome}
          />
        );
      }

      // Minimal error display for small components
      if (minimal) {
        return (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-400 text-sm">Component failed to load</span>
              <button
                onClick={this.handleRetry}
                className="text-xs text-red-300 hover:text-red-200 underline"
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      // Full error page
      return (
        <>
          <Helmet>
            <title>Error - Movie Recommendations</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          
          <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
              {/* Error Icon */}
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

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-400 mb-6">
                We encountered an unexpected error. Don't worry, our team has been notified and is working to fix it.
              </p>

              {/* Error ID for support */}
              <p className="text-xs text-gray-500 mb-6">
                Error ID: {errorId}
              </p>

              {/* Action Buttons */}
              <div className="space-y-3 sm:space-y-0 sm:space-x-3 sm:flex sm:justify-center">
                <button
                  onClick={this.handleRetry}
                  className="w-full sm:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
                >
                  Try Again
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
                  Reload Page
                </button>
              </div>

              {/* Development Error Details */}
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
                      <div>
                        <h3 className="text-yellow-400 font-semibold mb-1">Component Stack:</h3>
                        <pre className="text-yellow-300 whitespace-pre-wrap break-words">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Help Text */}
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

    // No error, render children normally
    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;
