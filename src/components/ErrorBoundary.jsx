/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and provides fallback UI
 * Integrates with monitoring system for error tracking
 */

import React from 'react';
import { useErrorTracking } from '../hooks/useMonitoring.js';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

class ErrorBoundaryClass extends React.Component {
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
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Track error with monitoring service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    // Create error report
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with support.');
      })
      .catch(() => {
        console.log('Error Report:', errorReport);
        alert('Error details logged to console. Please check browser console.');
      });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, showDetails = false } = this.props;
      const { error, errorInfo, errorId } = this.state;

      // Use custom fallback if provided
      if (Fallback) {
        return (
          <Fallback
            error={error}
            errorInfo={errorInfo}
            errorId={errorId}
            onRetry={this.handleRetry}
            onReport={this.handleReportError}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              
              {showDetails && (
                <details className="text-left mb-6 p-3 bg-gray-50 rounded border">
                  <summary className="cursor-pointer font-medium text-sm text-gray-700 mb-2">
                    Error Details
                  </summary>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div>
                      <strong>Error ID:</strong> {errorId}
                    </div>
                    <div>
                      <strong>Message:</strong> {error?.message}
                    </div>
                    {error?.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>
                
                <button
                  onClick={this.handleReportError}
                  className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to use hooks
const ErrorBoundary = ({ children, ...props }) => {
  const { trackComponentError } = useErrorTracking();

  const handleError = (error, errorInfo) => {
    trackComponentError(error, errorInfo);
  };

  return (
    <ErrorBoundaryClass {...props} onError={handleError}>
      {children}
    </ErrorBoundaryClass>
  );
};

// Specialized error boundaries for different parts of the app
export const RouteErrorBoundary = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={({ error, onRetry }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Page Error
            </h1>
            <p className="text-gray-600 mb-6">
              This page encountered an error. Please try navigating to a different page or refresh.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export const ComponentErrorBoundary = ({ children, componentName }) => {
  return (
    <ErrorBoundary
      fallback={({ error, onRetry }) => (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              {componentName} Error
            </h3>
          </div>
          <p className="text-sm text-red-700 mb-3">
            This component encountered an error and couldn't render properly.
          </p>
          <button
            onClick={onRetry}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export const AsyncErrorBoundary = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={({ error, onRetry }) => (
        <div className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading Error
          </h3>
          <p className="text-gray-600 mb-4">
            Failed to load content. Please check your connection and try again.
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;