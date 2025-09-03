/**
 * Monitoring Configuration
 * Centralized configuration for analytics and performance monitoring
 */

// Environment variables for monitoring
const env = {
  // Firebase Analytics
  FIREBASE_ANALYTICS_ENABLED: process.env.VITE_FIREBASE_ANALYTICS_ENABLED === 'true',
  FIREBASE_PERFORMANCE_ENABLED: process.env.VITE_FIREBASE_PERFORMANCE_ENABLED === 'true',
  
  // Debug and development
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEBUG_ANALYTICS: process.env.VITE_DEBUG_ANALYTICS === 'true',
  DEBUG_PERFORMANCE: process.env.VITE_DEBUG_PERFORMANCE === 'true',
  
  // Sampling rates
  ANALYTICS_SAMPLE_RATE: parseFloat(process.env.VITE_ANALYTICS_SAMPLE_RATE) || 1.0,
  PERFORMANCE_SAMPLE_RATE: parseFloat(process.env.VITE_PERFORMANCE_SAMPLE_RATE) || 0.1,
  
  // Feature flags
  TRACK_USER_ENGAGEMENT: process.env.VITE_TRACK_USER_ENGAGEMENT !== 'false',
  TRACK_SEARCH_ANALYTICS: process.env.VITE_TRACK_SEARCH_ANALYTICS !== 'false',
  TRACK_ERROR_ANALYTICS: process.env.VITE_TRACK_ERROR_ANALYTICS !== 'false',
  TRACK_PERFORMANCE_METRICS: process.env.VITE_TRACK_PERFORMANCE_METRICS !== 'false',
  
  // Thresholds
  SLOW_RENDER_THRESHOLD: parseInt(process.env.VITE_SLOW_RENDER_THRESHOLD) || 100,
  SLOW_API_THRESHOLD: parseInt(process.env.VITE_SLOW_API_THRESHOLD) || 1000,
  MEMORY_WARNING_THRESHOLD: parseInt(process.env.VITE_MEMORY_WARNING_THRESHOLD) || 50 * 1024 * 1024, // 50MB
};

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  enabled: env.FIREBASE_ANALYTICS_ENABLED && env.NODE_ENV === 'production',
  debug: env.DEBUG_ANALYTICS || env.NODE_ENV === 'development',
  sampleRate: env.ANALYTICS_SAMPLE_RATE,
  
  // Event tracking settings
  trackPageViews: true,
  trackUserEngagement: env.TRACK_USER_ENGAGEMENT,
  trackSearchAnalytics: env.TRACK_SEARCH_ANALYTICS,
  trackErrorAnalytics: env.TRACK_ERROR_ANALYTICS,
  
  // Custom dimensions and metrics
  customDimensions: {
    user_type: 'custom_dimension_1',
    feature_flags: 'custom_dimension_2',
    app_version: 'custom_dimension_3'
  },
  
  // Event names
  events: {
    // Page events
    PAGE_VIEW: 'page_view',
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    
    // User events
    USER_ENGAGEMENT: 'user_engagement',
    FEATURE_USAGE: 'feature_usage',
    
    // Medical app specific events
    DRUG_VIEW: 'drug_view',
    DRUG_SEARCH: 'drug_search',
    ICD10_BROWSE: 'icd10_browse',
    ICD10_SEARCH: 'icd10_search',
    BOOKMARK_ADD: 'bookmark_add',
    CONTENT_SHARE: 'content_share',
    
    // Authentication events
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    SIGNUP_SUCCESS: 'signup_success',
    SIGNUP_FAILURE: 'signup_failure',
    
    // Error events
    ERROR_OCCURRED: 'error_occurred',
    ERROR_BOUNDARY: 'error_boundary_triggered',
    
    // Performance events
    PERFORMANCE_METRIC: 'performance_metric',
    SLOW_OPERATION: 'slow_operation'
  }
};

// Performance Monitoring Configuration
export const PERFORMANCE_CONFIG = {
  enabled: env.FIREBASE_PERFORMANCE_ENABLED,
  debug: env.DEBUG_PERFORMANCE || env.NODE_ENV === 'development',
  sampleRate: env.PERFORMANCE_SAMPLE_RATE,
  
  // Performance tracking settings
  trackPerformanceMetrics: env.TRACK_PERFORMANCE_METRICS,
  trackAPICallsAutomatically: true,
  trackUserTimings: true,
  trackResourceTimings: true,
  
  // Thresholds
  thresholds: {
    slowRender: env.SLOW_RENDER_THRESHOLD, // ms
    slowAPI: env.SLOW_API_THRESHOLD, // ms
    memoryWarning: env.MEMORY_WARNING_THRESHOLD, // bytes
    largeBundle: 1024 * 1024, // 1MB
    slowPageLoad: 3000 // ms
  },
  
  // Custom metrics
  customMetrics: {
    COMPONENT_RENDER_TIME: 'component_render_time',
    API_RESPONSE_TIME: 'api_response_time',
    SEARCH_PERFORMANCE: 'search_performance',
    DATABASE_QUERY_TIME: 'database_query_time',
    IMAGE_LOAD_TIME: 'image_load_time'
  },
  
  // Automatic tracking
  autoTrack: {
    navigationTiming: true,
    resourceTiming: true,
    userTiming: true,
    longTasks: true,
    layoutShifts: true,
    largestContentfulPaint: true,
    firstInputDelay: true
  }
};

// Error Tracking Configuration
export const ERROR_CONFIG = {
  enabled: env.TRACK_ERROR_ANALYTICS,
  debug: env.NODE_ENV === 'development',
  
  // Error categories
  categories: {
    JAVASCRIPT_ERROR: 'javascript_error',
    NETWORK_ERROR: 'network_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    VALIDATION_ERROR: 'validation_error',
    PERMISSION_ERROR: 'permission_error',
    COMPONENT_ERROR: 'component_error'
  },
  
  // Error severity levels
  severity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  
  // Ignore patterns
  ignorePatterns: [
    /Script error/,
    /Non-Error promise rejection captured/,
    /ResizeObserver loop limit exceeded/,
    /ChunkLoadError/
  ],
  
  // Context to capture
  captureContext: {
    userAgent: true,
    url: true,
    timestamp: true,
    userId: true,
    sessionId: true,
    componentStack: true,
    breadcrumbs: true
  }
};

// User Tracking Configuration
export const USER_CONFIG = {
  enabled: env.TRACK_USER_ENGAGEMENT,
  
  // User properties to track
  properties: {
    USER_TYPE: 'user_type',
    SUBSCRIPTION_STATUS: 'subscription_status',
    FEATURE_FLAGS: 'feature_flags',
    LAST_ACTIVE: 'last_active',
    TOTAL_SESSIONS: 'total_sessions'
  },
  
  // Engagement events
  engagement: {
    SESSION_DURATION_THRESHOLD: 30000, // 30 seconds
    SCROLL_THRESHOLD: 0.8, // 80% of page
    TIME_ON_PAGE_THRESHOLD: 10000, // 10 seconds
    INTERACTION_THRESHOLD: 5 // 5 interactions
  }
};

// Development and Debug Configuration
export const DEBUG_CONFIG = {
  enabled: env.NODE_ENV === 'development',
  
  // Console logging
  logAnalytics: env.DEBUG_ANALYTICS,
  logPerformance: env.DEBUG_PERFORMANCE,
  logErrors: true,
  
  // Mock data in development
  useMockData: env.NODE_ENV === 'development',
  
  // Performance monitoring in development
  showPerformanceOverlay: env.NODE_ENV === 'development',
  
  // Analytics validation
  validateEvents: env.NODE_ENV === 'development'
};

// Export all configurations
export const MONITORING_CONFIG = {
  analytics: ANALYTICS_CONFIG,
  performance: PERFORMANCE_CONFIG,
  error: ERROR_CONFIG,
  user: USER_CONFIG,
  debug: DEBUG_CONFIG,
  
  // Global settings
  global: {
    enabled: env.NODE_ENV === 'production' || env.DEBUG_ANALYTICS || env.DEBUG_PERFORMANCE,
    environment: env.NODE_ENV,
    version: process.env.VITE_APP_VERSION || '1.0.0'
  }
};

export default MONITORING_CONFIG;