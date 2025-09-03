/**
 * Security Middleware
 * Express.js middleware for implementing security best practices
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import cors from 'cors';
import compression from 'compression';
import { SecurityConfig, SecurityUtils } from '../config/security.js';

// Rate limiting configurations
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000) || 900
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    },
    keyGenerator: (req) => {
      // Use IP address and user agent for more accurate rate limiting
      return `${req.ip}_${req.get('User-Agent') || 'unknown'}`;
    },
    ...options
  });
};

// Speed limiting (slow down responses)
const createSpeedLimiter = (options = {}) => {
  return slowDown({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    delayAfter: options.delayAfter || 50, // allow 50 requests per windowMs without delay
    delayMs: options.delayMs || 500, // add 500ms of delay per request after delayAfter
    maxDelayMs: options.maxDelayMs || 20000, // max delay of 20 seconds
    skipFailedRequests: true,
    skipSuccessfulRequests: false,
    ...options
  });
};

// CORS configuration
const createCorsMiddleware = (environment = 'development') => {
  const corsOptions = SecurityConfig.cors[environment] || SecurityConfig.cors.development;
  
  return cors({
    ...corsOptions,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: corsOptions.credentials || false,
    preflightContinue: false,
    methods: corsOptions.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: corsOptions.allowedHeaders || [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID'
    ]
  });
};

// Helmet security headers
const createHelmetMiddleware = (environment = 'development') => {
  const isDevelopment = environment === 'development';
  
  return helmet({
    contentSecurityPolicy: {
      directives: {
        ...SecurityConfig.csp[environment],
        // Add report-uri for CSP violations
        reportUri: ['/api/csp-report']
      },
      reportOnly: isDevelopment // Only report in development, enforce in production
    },
    hsts: {
      maxAge: SecurityConfig.headers.hsts.maxAge,
      includeSubDomains: SecurityConfig.headers.hsts.includeSubDomains,
      preload: SecurityConfig.headers.hsts.preload
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    xssFilter: true, // X-XSS-Protection: 1; mode=block
    referrerPolicy: { policy: SecurityConfig.headers.referrerPolicy },
    permissionsPolicy: {
      features: SecurityConfig.headers.permissionsPolicy
    },
    crossOriginEmbedderPolicy: !isDevelopment, // Only in production
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    expectCt: {
      maxAge: 86400,
      enforce: !isDevelopment
    },
    hidePoweredBy: true,
    ieNoOpen: true,
    originAgentCluster: true
  });
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = SecurityUtils.sanitizeHTML(value);
        }
      }
    }
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string') {
          req.params[key] = SecurityUtils.sanitizeHTML(value);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Request sanitization error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = SecurityUtils.sanitizeHTML(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for required headers
  const requiredHeaders = ['user-agent'];
  const missingHeaders = requiredHeaders.filter(header => !req.get(header));
  
  if (missingHeaders.length > 0) {
    return res.status(400).json({
      error: 'Missing required headers',
      missing: missingHeaders
    });
  }
  
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ];
    
    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        allowed: allowedTypes
      });
    }
  }
  
  // Check request size
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      maxSize: `${maxSize / 1024 / 1024}MB`
    });
  }
  
  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant information
  const securityInfo = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    requestId: SecurityUtils.generateSecureRandom(16)
  };
  
  // Add request ID to response headers
  res.set('X-Request-ID', securityInfo.requestId);
  
  // Override res.end to log response information
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log completed request
    console.log('Security Log:', {
      ...securityInfo,
      statusCode: res.statusCode,
      duration,
      responseSize: res.get('Content-Length') || 0
    });
    
    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn('Suspicious activity detected:', {
        ...securityInfo,
        statusCode: res.statusCode,
        error: res.statusMessage
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// CSP violation reporting endpoint
const cspReportHandler = (req, res) => {
  try {
    const report = req.body;
    console.warn('CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      report,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // In production, you might want to store these reports in a database
    // or send them to a monitoring service
    
    res.status(204).end();
  } catch (error) {
    console.error('CSP report handling error:', error);
    res.status(400).json({ error: 'Invalid CSP report' });
  }
};

// Compression middleware with security considerations
const createCompressionMiddleware = () => {
  return compression({
    filter: (req, res) => {
      // Don't compress responses with sensitive data
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Don't compress already compressed content
      const contentType = res.get('Content-Type');
      if (contentType && (
        contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('application/zip') ||
        contentType.includes('application/gzip')
      )) {
        return false;
      }
      
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses larger than 1KB
    level: 6, // Compression level (1-9, 6 is default)
    memLevel: 8 // Memory usage level (1-9, 8 is default)
  });
};

// Main security middleware factory
export const createSecurityMiddleware = (options = {}) => {
  const {
    environment = process.env.NODE_ENV || 'development',
    enableRateLimit = true,
    enableSpeedLimit = true,
    enableCors = true,
    enableHelmet = true,
    enableSanitization = true,
    enableValidation = true,
    enableLogging = true,
    enableCompression = true,
    rateLimitOptions = {},
    speedLimitOptions = {},
    corsOptions = {}
  } = options;
  
  const middlewares = [];
  
  // Add compression first
  if (enableCompression) {
    middlewares.push(createCompressionMiddleware());
  }
  
  // Add security headers
  if (enableHelmet) {
    middlewares.push(createHelmetMiddleware(environment));
  }
  
  // Add CORS
  if (enableCors) {
    middlewares.push(createCorsMiddleware(environment));
  }
  
  // Add rate limiting
  if (enableRateLimit) {
    middlewares.push(createRateLimiter(rateLimitOptions));
  }
  
  // Add speed limiting
  if (enableSpeedLimit) {
    middlewares.push(createSpeedLimiter(speedLimitOptions));
  }
  
  // Add request validation
  if (enableValidation) {
    middlewares.push(validateRequest);
  }
  
  // Add request sanitization
  if (enableSanitization) {
    middlewares.push(sanitizeRequest);
  }
  
  // Add security logging
  if (enableLogging) {
    middlewares.push(securityLogger);
  }
  
  return middlewares;
};

// Export individual middleware functions
export {
  createRateLimiter,
  createSpeedLimiter,
  createCorsMiddleware,
  createHelmetMiddleware,
  sanitizeRequest,
  validateRequest,
  securityLogger,
  cspReportHandler,
  createCompressionMiddleware
};

// Export default configuration
export default {
  createSecurityMiddleware,
  createRateLimiter,
  createSpeedLimiter,
  createCorsMiddleware,
  createHelmetMiddleware,
  sanitizeRequest,
  validateRequest,
  securityLogger,
  cspReportHandler,
  createCompressionMiddleware
};