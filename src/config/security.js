/**
 * Security Configuration
 * Centralized security settings for HTTPS, CSP, and other security measures
 * Integrates with environment variables for flexible configuration
 */

// Environment variables with secure defaults
const env = {
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',
  
  // Security Features
  ENABLE_HSTS: import.meta.env.VITE_ENABLE_HSTS !== 'false',
  ENABLE_CSP: import.meta.env.VITE_ENABLE_CSP !== 'false',
  ENABLE_X_FRAME_OPTIONS: import.meta.env.VITE_ENABLE_X_FRAME_OPTIONS !== 'false',
  ENABLE_X_CONTENT_TYPE_OPTIONS: import.meta.env.VITE_ENABLE_X_CONTENT_TYPE_OPTIONS !== 'false',
  ENABLE_REFERRER_POLICY: import.meta.env.VITE_ENABLE_REFERRER_POLICY !== 'false',
  
  // Authentication Configuration
  AUTH_PASSWORD_MIN_LENGTH: parseInt(import.meta.env.VITE_AUTH_PASSWORD_MIN_LENGTH) || 8,
  AUTH_MAX_LOGIN_ATTEMPTS: parseInt(import.meta.env.VITE_AUTH_MAX_LOGIN_ATTEMPTS) || 5,
  AUTH_LOCKOUT_DURATION: parseInt(import.meta.env.VITE_AUTH_LOCKOUT_DURATION) || 900000,
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: parseInt(import.meta.env.VITE_RATE_LIMIT_REQUESTS_PER_MINUTE) || 60,
  RATE_LIMIT_BURST_SIZE: parseInt(import.meta.env.VITE_RATE_LIMIT_BURST_SIZE) || 10,
  
  // File Upload
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 5242880,
  ALLOWED_FILE_TYPES: (import.meta.env.VITE_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
  
  // Debug
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true'
};

// Content Security Policy directives
export const CSP_DIRECTIVES = {
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://api.fda.gov',
      'https://*.googleapis.com',
      'https://*.firebaseapp.com',
      'https://*.firebase.com',
      'wss:',
      'ws:'
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  },
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://api.fda.gov',
      'https://*.googleapis.com',
      'https://*.firebaseapp.com',
      'https://*.firebase.com'
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': []
  }
};

// Security headers configuration
export const SECURITY_HEADERS = {
  // HTTP Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', '),
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// CORS configuration
export const CORS_CONFIG = {
  development: {
    origin: [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ]
  },
  production: {
    origin: [
      'https://your-domain.com',
      'https://www.your-domain.com',
      'https://your-app.firebaseapp.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept'
    ]
  }
};

// SSL/TLS configuration
export const SSL_CONFIG = {
  // Minimum TLS version
  minVersion: 'TLSv1.2',
  
  // Cipher suites (for Node.js servers)
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  
  // Honor cipher order
  honorCipherOrder: true,
  
  // Disable session resumption for security
  sessionIdContext: 'medical-app'
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.RATE_LIMIT_REQUESTS_PER_MINUTE * 15, // Scale to 15-minute window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Authentication rate limiting
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.AUTH_MAX_LOGIN_ATTEMPTS, // Use environment variable
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  },
  
  // Search rate limiting
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: Math.floor(env.RATE_LIMIT_REQUESTS_PER_MINUTE / 2), // Half of general rate for search
    message: 'Too many search requests, please slow down.'
  }
};

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  phone: /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// Security utility functions
export const SecurityUtils = {
  /**
   * Generate Content Security Policy string
   * @param {string} environment - 'development' or 'production'
   * @returns {string} CSP header value
   */
  generateCSP(environment = 'production') {
    const directives = CSP_DIRECTIVES[environment] || CSP_DIRECTIVES.production;
    
    return Object.entries(directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  },
  
  /**
   * Validate input against pattern
   * @param {string} input - Input to validate
   * @param {string} type - Validation type
   * @returns {boolean} Validation result
   */
  validateInput(input, type) {
    const pattern = VALIDATION_PATTERNS[type];
    if (!pattern) {
      throw new Error(`Unknown validation type: ${type}`);
    }
    return pattern.test(input);
  },
  
  /**
   * Sanitize HTML input
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeHTML(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },
  
  /**
   * Generate secure random string
   * @param {number} length - Length of random string
   * @returns {string} Random string
   */
  generateSecureRandom(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Use crypto.getRandomValues if available (browser)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for Node.js
      const crypto = require('crypto');
      const bytes = crypto.randomBytes(length);
      
      for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
      }
    }
    
    return result;
  },
  
  /**
   * Check if running in secure context (HTTPS)
   * @returns {boolean} True if secure context
   */
  isSecureContext() {
    if (typeof window !== 'undefined') {
      return window.isSecureContext || window.location.protocol === 'https:';
    }
    return true; // Assume secure in Node.js environment
  },
  
  /**
   * Get security headers for environment
   * @param {string} environment - 'development' or 'production'
   * @returns {object} Security headers
   */
  getSecurityHeaders(environment = 'production') {
    const headers = { ...SECURITY_HEADERS };
    
    // Add CSP header
    headers['Content-Security-Policy'] = this.generateCSP(environment);
    
    // Remove HSTS in development
    if (environment === 'development') {
      delete headers['Strict-Transport-Security'];
    }
    
    return headers;
  }
};

export default {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  CORS_CONFIG,
  SSL_CONFIG,
  RATE_LIMIT_CONFIG,
  VALIDATION_PATTERNS,
  SecurityUtils
};