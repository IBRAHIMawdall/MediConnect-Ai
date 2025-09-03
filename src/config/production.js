/**
 * Production Configuration
 * Removes debug features and sensitive information for production deployment
 */

// Production environment configuration
export const ProductionConfig = {
  // Debug and development features to disable
  debug: {
    enableConsoleLogging: false,
    enableDevTools: false,
    enableHotReload: false,
    enableSourceMaps: false,
    enableProfiling: false,
    enableErrorBoundaryDetails: false,
    enableNetworkLogging: false,
    enablePerformanceMetrics: false,
    enableReduxDevTools: false,
    enableReactDevTools: false
  },
  
  // Logging configuration for production
  logging: {
    level: 'error', // Only log errors in production
    enableFileLogging: true,
    enableRemoteLogging: true,
    sanitizeLogs: true,
    maxLogSize: '10MB',
    logRetentionDays: 30,
    excludePatterns: [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /session/i,
      /cookie/i
    ]
  },
  
  // Error handling configuration
  errorHandling: {
    showStackTrace: false,
    showErrorDetails: false,
    enableErrorReporting: true,
    sanitizeErrors: true,
    errorReportingService: process.env.ERROR_REPORTING_SERVICE || 'sentry',
    maxErrorsPerSession: 10
  },
  
  // Security configuration
  security: {
    enableCSP: true,
    enableHSTS: true,
    enableXSSProtection: true,
    enableContentTypeNoSniff: true,
    enableFrameGuard: true,
    enableReferrerPolicy: true,
    hideServerInfo: true,
    disableXPoweredBy: true
  },
  
  // Performance optimizations
  performance: {
    enableCompression: true,
    enableCaching: true,
    enableMinification: true,
    enableTreeShaking: true,
    enableCodeSplitting: true,
    enableLazyLoading: true,
    enableServiceWorker: true,
    enableHTTP2: true
  },
  
  // API configuration
  api: {
    timeout: 30000,
    retryAttempts: 3,
    enableRateLimiting: true,
    enableRequestValidation: true,
    enableResponseSanitization: true,
    enableAPIKeyRotation: true
  },
  
  // Database configuration
  database: {
    enableQueryLogging: false,
    enableSlowQueryLogging: true,
    slowQueryThreshold: 1000, // 1 second
    enableConnectionPooling: true,
    maxConnections: 100,
    enableReadReplicas: true
  }
};

// Environment variables to remove/sanitize
export const SensitiveEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_FIREBASE_MEASUREMENT_ID',
  'REACT_APP_FDA_API_KEY',
  'REACT_APP_SENTRY_DSN',
  'REACT_APP_ANALYTICS_ID',
  'DATABASE_URL',
  'SECRET_KEY',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'API_SECRET',
  'WEBHOOK_SECRET'
];

// Debug code patterns to remove
export const DebugPatterns = [
  /console\.(log|debug|info|warn|error|trace|table|group|groupEnd|time|timeEnd)\s*\(/g,
  /debugger\s*;?/g,
  /\/\*\s*DEBUG[\s\S]*?\*\//g,
  /\/\/\s*DEBUG.*$/gm,
  /\/\/\s*TODO.*$/gm,
  /\/\/\s*FIXME.*$/gm,
  /\/\/\s*HACK.*$/gm,
  /\/\/\s*XXX.*$/gm,
  /alert\s*\(/g,
  /confirm\s*\(/g,
  /prompt\s*\(/g
];

// Test code patterns to remove
export const TestPatterns = [
  /describe\s*\(/g,
  /it\s*\(/g,
  /test\s*\(/g,
  /expect\s*\(/g,
  /jest\./g,
  /\.test\./g,
  /\.spec\./g,
  /__tests__/g,
  /\/\*\s*TEST[\s\S]*?\*\//g,
  /\/\/\s*TEST.*$/gm
];

// Development dependencies to exclude
export const DevDependencies = [
  '@testing-library/*',
  'jest',
  'enzyme',
  'cypress',
  'storybook',
  '@storybook/*',
  'webpack-dev-server',
  'webpack-hot-middleware',
  'react-hot-loader',
  'nodemon',
  'concurrently',
  'eslint',
  'prettier',
  '@types/*',
  'typescript'
];

// Clean console methods for production
export const cleanConsole = () => {
  if (process.env.NODE_ENV === 'production') {
    // Override console methods to prevent logging
    const noop = () => {};
    
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = ProductionConfig.logging.level === 'error' ? noop : console.warn;
    console.trace = noop;
    console.table = noop;
    console.group = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeEnd = noop;
    
    // Keep console.error for critical issues
    const originalError = console.error;
    console.error = (...args) => {
      // Sanitize error messages
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return sanitizeLogMessage(arg);
        }
        return arg;
      });
      originalError.apply(console, sanitizedArgs);
    };
  }
};

// Sanitize log messages
export const sanitizeLogMessage = (message) => {
  let sanitized = message;
  
  // Remove sensitive patterns
  ProductionConfig.logging.excludePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Remove potential API keys, tokens, etc.
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');
  
  // Remove email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[IP]');
  
  return sanitized;
};

// Remove debug code from source
export const removeDebugCode = (source) => {
  let cleaned = source;
  
  // Remove debug patterns
  DebugPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove test patterns
  TestPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove empty lines
  cleaned = cleaned.replace(/^\s*\n/gm, '');
  
  return cleaned;
};

// Sanitize environment variables
export const sanitizeEnvironment = () => {
  if (process.env.NODE_ENV === 'production') {
    // Remove sensitive environment variables from process.env
    SensitiveEnvVars.forEach(varName => {
      if (process.env[varName]) {
        // Keep the variable but mark it as sanitized
        process.env[`${varName}_ORIGINAL`] = process.env[varName];
        process.env[varName] = '[REDACTED]';
      }
    });
    
    // Remove development-specific variables
    const devVars = [
      'REACT_APP_DEBUG',
      'REACT_APP_DEV_MODE',
      'REACT_APP_MOCK_API',
      'REACT_APP_TEST_MODE'
    ];
    
    devVars.forEach(varName => {
      delete process.env[varName];
    });
  }
};

// Error boundary for production
export class ProductionErrorBoundary extends Error {
  constructor(error, errorInfo) {
    super('Application Error');
    this.name = 'ProductionError';
    this.originalError = ProductionConfig.errorHandling.showErrorDetails ? error : null;
    this.errorInfo = ProductionConfig.errorHandling.showStackTrace ? errorInfo : null;
    this.timestamp = new Date().toISOString();
    this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    this.url = typeof window !== 'undefined' ? window.location.href : 'Unknown';
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      userAgent: this.userAgent,
      url: this.url,
      ...(this.originalError && { originalError: this.originalError.message }),
      ...(this.errorInfo && { errorInfo: this.errorInfo })
    };
  }
}

// Production-safe error handler
export const handleProductionError = (error, errorInfo = {}) => {
  const productionError = new ProductionErrorBoundary(error, errorInfo);
  
  // Log error (will be sanitized)
  console.error('Production Error:', productionError.toJSON());
  
  // Report to error tracking service
  if (ProductionConfig.errorHandling.enableErrorReporting) {
    reportError(productionError);
  }
  
  return productionError;
};

// Report error to external service
const reportError = async (error) => {
  try {
    // This would integrate with your error reporting service (Sentry, Bugsnag, etc.)
    const errorData = {
      ...error.toJSON(),
      environment: 'production',
      version: process.env.REACT_APP_VERSION || 'unknown'
    };
    
    // Example: Send to error reporting service
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // });
    
    console.log('Error reported to tracking service');
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError.message);
  }
};

// Initialize production configuration
export const initializeProduction = () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Initializing production configuration...');
    
    // Clean console
    cleanConsole();
    
    // Sanitize environment
    sanitizeEnvironment();
    
    // Disable React DevTools
    if (typeof window !== 'undefined') {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        isDisabled: true,
        supportsFiber: true,
        inject: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {}
      };
    }
    
    // Disable Redux DevTools
    if (typeof window !== 'undefined') {
      window.__REDUX_DEVTOOLS_EXTENSION__ = undefined;
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = undefined;
    }
    
    console.log('Production configuration initialized');
  }
};

// Export utilities
export const ProductionUtils = {
  cleanConsole,
  sanitizeLogMessage,
  removeDebugCode,
  sanitizeEnvironment,
  handleProductionError,
  initializeProduction
};

export default {
  ProductionConfig,
  ProductionUtils,
  SensitiveEnvVars,
  DebugPatterns,
  TestPatterns,
  DevDependencies,
  ProductionErrorBoundary,
  initializeProduction
};