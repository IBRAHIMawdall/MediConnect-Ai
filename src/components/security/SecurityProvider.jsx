/**
 * Security Provider Component
 * Provides client-side security measures and context
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SecurityUtils } from '../../config/security';

const SecurityContext = createContext({});

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const [isSecureContext, setIsSecureContext] = useState(false);
  const [securityWarnings, setSecurityWarnings] = useState([]);
  const [cspViolations, setCspViolations] = useState([]);

  useEffect(() => {
    // Check if running in secure context
    setIsSecureContext(SecurityUtils.isSecureContext());

    // Add security warnings for non-HTTPS in production
    if (process.env.NODE_ENV === 'production' && !SecurityUtils.isSecureContext()) {
      setSecurityWarnings(prev => [
        ...prev,
        {
          id: 'insecure-context',
          type: 'error',
          message: 'Application is not running in a secure context (HTTPS). Some features may not work properly.',
          timestamp: new Date().toISOString()
        }
      ]);
    }

    // Listen for CSP violations
    const handleCSPViolation = (event) => {
      const violation = {
        id: SecurityUtils.generateSecureRandom(8),
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
        timestamp: new Date().toISOString()
      };

      setCspViolations(prev => [...prev.slice(-9), violation]); // Keep last 10 violations
      
      // Log violation for debugging
      console.warn('CSP Violation:', violation);
    };

    // Add CSP violation listener
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Cleanup
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, []);

  // Security utility functions
  const validateInput = (input, type) => {
    try {
      return SecurityUtils.validateInput(input, type);
    } catch (error) {
      console.error('Input validation error:', error);
      return false;
    }
  };

  const sanitizeHTML = (input) => {
    return SecurityUtils.sanitizeHTML(input);
  };

  const generateSecureRandom = (length) => {
    return SecurityUtils.generateSecureRandom(length);
  };

  const addSecurityWarning = (warning) => {
    const newWarning = {
      id: generateSecureRandom(8),
      timestamp: new Date().toISOString(),
      ...warning
    };
    
    setSecurityWarnings(prev => [...prev, newWarning]);
  };

  const removeSecurityWarning = (id) => {
    setSecurityWarnings(prev => prev.filter(warning => warning.id !== id));
  };

  const clearSecurityWarnings = () => {
    setSecurityWarnings([]);
  };

  // Check for common security issues
  const performSecurityCheck = () => {
    const issues = [];

    // Check for secure context
    if (!isSecureContext) {
      issues.push({
        type: 'error',
        message: 'Not running in secure context (HTTPS)',
        recommendation: 'Enable HTTPS for production deployment'
      });
    }

    // Check for localStorage availability
    try {
      localStorage.setItem('security-test', 'test');
      localStorage.removeItem('security-test');
    } catch (error) {
      issues.push({
        type: 'warning',
        message: 'localStorage not available',
        recommendation: 'Some features may not work in private browsing mode'
      });
    }

    // Check for sessionStorage availability
    try {
      sessionStorage.setItem('security-test', 'test');
      sessionStorage.removeItem('security-test');
    } catch (error) {
      issues.push({
        type: 'warning',
        message: 'sessionStorage not available',
        recommendation: 'Some features may not work in private browsing mode'
      });
    }

    // Check for crypto API availability
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      issues.push({
        type: 'error',
        message: 'Crypto API not available',
        recommendation: 'Update to a modern browser for security features'
      });
    }

    return issues;
  };

  // Monitor for suspicious activity
  const monitorSuspiciousActivity = () => {
    // Monitor for rapid form submissions
    let formSubmissionCount = 0;
    let lastSubmissionTime = 0;

    const handleFormSubmit = () => {
      const now = Date.now();
      if (now - lastSubmissionTime < 1000) { // Less than 1 second
        formSubmissionCount++;
        if (formSubmissionCount > 3) {
          addSecurityWarning({
            type: 'warning',
            message: 'Rapid form submissions detected',
            recommendation: 'Please slow down your interactions'
          });
        }
      } else {
        formSubmissionCount = 0;
      }
      lastSubmissionTime = now;
    };

    // Monitor for console access (potential XSS)
    let consoleWarningShown = false;
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (!consoleWarningShown && process.env.NODE_ENV === 'production') {
        console.warn(
          '%cSecurity Warning!',
          'color: red; font-size: 20px; font-weight: bold;',
          '\nDo not paste or run any code here. This could compromise your account security.'
        );
        consoleWarningShown = true;
      }
      originalConsoleLog.apply(console, args);
    };

    return {
      handleFormSubmit
    };
  };

  const value = {
    // State
    isSecureContext,
    securityWarnings,
    cspViolations,

    // Utility functions
    validateInput,
    sanitizeHTML,
    generateSecureRandom,

    // Warning management
    addSecurityWarning,
    removeSecurityWarning,
    clearSecurityWarnings,

    // Security checks
    performSecurityCheck,
    monitorSuspiciousActivity
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

// Security Warning Component
export const SecurityWarnings = () => {
  const { securityWarnings, removeSecurityWarning } = useSecurity();

  if (securityWarnings.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {securityWarnings.map((warning) => (
        <div
          key={warning.id}
          className={`
            p-4 rounded-lg shadow-lg max-w-sm
            ${
              warning.type === 'error'
                ? 'bg-red-100 border border-red-400 text-red-700'
                : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
            }
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">
                {warning.type === 'error' ? '🔒 Security Error' : '⚠️ Security Warning'}
              </p>
              <p className="text-sm mt-1">{warning.message}</p>
              {warning.recommendation && (
                <p className="text-xs mt-2 opacity-75">
                  Recommendation: {warning.recommendation}
                </p>
              )}
            </div>
            <button
              onClick={() => removeSecurityWarning(warning.id)}
              className="ml-2 text-lg leading-none hover:opacity-75"
              aria-label="Dismiss warning"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Security Status Component
export const SecurityStatus = () => {
  const { isSecureContext, performSecurityCheck } = useSecurity();
  const [securityIssues, setSecurityIssues] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setSecurityIssues(performSecurityCheck());
  }, [isSecureContext]);

  const hasErrors = securityIssues.some(issue => issue.type === 'error');
  const hasWarnings = securityIssues.some(issue => issue.type === 'warning');

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`
              w-3 h-3 rounded-full
              ${
                hasErrors
                  ? 'bg-red-500'
                  : hasWarnings
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }
            `}
          />
          <span className="font-medium">
            Security Status: {
              hasErrors
                ? 'Issues Detected'
                : hasWarnings
                ? 'Warnings'
                : 'Secure'
            }
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {showDetails && securityIssues.length > 0 && (
        <div className="mt-4 space-y-2">
          {securityIssues.map((issue, index) => (
            <div
              key={index}
              className={`
                p-3 rounded border-l-4
                ${
                  issue.type === 'error'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                }
              `}
            >
              <p className="font-medium">{issue.message}</p>
              {issue.recommendation && (
                <p className="text-sm mt-1 opacity-75">{issue.recommendation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecurityProvider;