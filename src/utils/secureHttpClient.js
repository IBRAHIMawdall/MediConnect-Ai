/**
 * Secure HTTP Client
 * Enforces HTTPS and implements security best practices for API calls
 */

import axios from 'axios';
import { SecurityUtils } from '../config/security';

// Create secure axios instance
const createSecureClient = (baseURL, options = {}) => {
  // Ensure HTTPS in production
  if (process.env.NODE_ENV === 'production' && baseURL && !baseURL.startsWith('https://')) {
    console.warn('Insecure HTTP URL detected in production:', baseURL);
    baseURL = baseURL.replace('http://', 'https://');
  }

  const client = axios.create({
    baseURL,
    timeout: options.timeout || 30000, // 30 second timeout
    withCredentials: options.withCredentials || false,
    
    // Security headers
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...options.headers
    },
    
    // Validate status codes
    validateStatus: (status) => {
      return status >= 200 && status < 300;
    },
    
    ...options
  });

  // Request interceptor for security
  client.interceptors.request.use(
    (config) => {
      // Add request timestamp
      config.metadata = { startTime: new Date() };
      
      // Add CSRF token if available
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      
      // Add request ID for tracking
      config.headers['X-Request-ID'] = SecurityUtils.generateSecureRandom(16);
      
      // Validate URL is HTTPS in production
      if (process.env.NODE_ENV === 'production' && config.url && !config.url.startsWith('https://') && !config.url.startsWith('/')) {
        console.warn('Insecure URL in production request:', config.url);
      }
      
      // Sanitize request data
      if (config.data && typeof config.data === 'object') {
        config.data = sanitizeRequestData(config.data);
      }
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for security
  client.interceptors.response.use(
    (response) => {
      // Calculate request duration
      const endTime = new Date();
      const duration = endTime - response.config.metadata.startTime;
      
      // Log slow requests
      if (duration > 5000) {
        console.warn(`Slow request detected: ${response.config.url} took ${duration}ms`);
      }
      
      // Validate response headers
      validateResponseHeaders(response.headers);
      
      // Sanitize response data
      if (response.data) {
        response.data = sanitizeResponseData(response.data);
      }
      
      return response;
    },
    (error) => {
      // Enhanced error handling
      const enhancedError = enhanceError(error);
      
      // Log security-related errors
      if (isSecurityError(error)) {
        console.error('Security-related HTTP error:', enhancedError);
      }
      
      return Promise.reject(enhancedError);
    }
  );

  return client;
};

// Get CSRF token from meta tag or cookie
const getCSRFToken = () => {
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  
  // Try to get from cookie
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' || name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
};

// Sanitize request data
const sanitizeRequestData = (data) => {
  if (Array.isArray(data)) {
    return data.map(sanitizeRequestData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        sanitized[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else {
        sanitized[key] = sanitizeRequestData(value);
      }
    }
    return sanitized;
  }
  
  return data;
};

// Sanitize response data
const sanitizeResponseData = (data) => {
  if (Array.isArray(data)) {
    return data.map(sanitizeResponseData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Basic XSS protection
        sanitized[key] = SecurityUtils.sanitizeHTML(value);
      } else {
        sanitized[key] = sanitizeResponseData(value);
      }
    }
    return sanitized;
  }
  
  return data;
};

// Validate response headers for security
const validateResponseHeaders = (headers) => {
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection'
  ];
  
  const missingHeaders = securityHeaders.filter(header => !headers[header]);
  
  if (missingHeaders.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('Missing security headers in response:', missingHeaders);
  }
};

// Enhance error with additional security context
const enhanceError = (error) => {
  const enhanced = {
    ...error,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Add security context
  if (error.response) {
    enhanced.securityContext = {
      status: error.response.status,
      headers: error.response.headers,
      isSecureContext: SecurityUtils.isSecureContext(),
      protocol: window.location.protocol
    };
  }
  
  return enhanced;
};

// Check if error is security-related
const isSecurityError = (error) => {
  if (!error.response) return false;
  
  const securityStatusCodes = [401, 403, 429, 451];
  return securityStatusCodes.includes(error.response.status);
};

// Rate limiting utility
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Clean old requests
    if (this.requests.has(key)) {
      this.requests.set(
        key,
        this.requests.get(key).filter(time => time > windowStart)
      );
    } else {
      this.requests.set(key, []);
    }
    
    const requestCount = this.requests.get(key).length;
    
    if (requestCount >= this.maxRequests) {
      return false;
    }
    
    this.requests.get(key).push(now);
    return true;
  }
  
  getRemainingRequests(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      return this.maxRequests;
    }
    
    const validRequests = this.requests.get(key).filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Create rate limiter instance
const rateLimiter = new RateLimiter();

// Secure HTTP client instances
export const secureApiClient = createSecureClient(process.env.REACT_APP_API_BASE_URL || '/api', {
  timeout: 30000,
  withCredentials: true
});

export const fdaApiClient = createSecureClient('https://api.fda.gov', {
  timeout: 15000,
  withCredentials: false
});

export const firebaseApiClient = createSecureClient('', {
  timeout: 20000,
  withCredentials: true
});

// Utility functions
export const secureRequest = async (client, config) => {
  // Check rate limiting
  const requestKey = `${config.method || 'GET'}_${config.url || ''}`;
  if (!rateLimiter.isAllowed(requestKey)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  try {
    const response = await client(config);
    return response;
  } catch (error) {
    // Log security errors
    if (isSecurityError(error)) {
      console.error('Security error in request:', {
        url: config.url,
        method: config.method,
        status: error.response?.status,
        message: error.message
      });
    }
    
    throw error;
  }
};

export const createSecureFormData = (data) => {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof File) {
      // Validate file type and size
      if (!isValidFile(value)) {
        throw new Error(`Invalid file: ${value.name}`);
      }
      formData.append(key, value);
    } else if (typeof value === 'string') {
      formData.append(key, SecurityUtils.sanitizeHTML(value));
    } else {
      formData.append(key, JSON.stringify(value));
    }
  }
  
  return formData;
};

const isValidFile = (file) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv'
  ];
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

export {
  createSecureClient,
  RateLimiter,
  rateLimiter,
  SecurityUtils
};

export default {
  secureApiClient,
  fdaApiClient,
  firebaseApiClient,
  secureRequest,
  createSecureFormData,
  createSecureClient,
  RateLimiter
};