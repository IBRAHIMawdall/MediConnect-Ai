/**
 * Analytics Service
 * Provides comprehensive analytics and performance monitoring
 */

import { analytics, performance } from '../config/firebase.js';
import { logEvent, setUserProperties as firebaseSetUserProperties, setUserId } from 'firebase/analytics';
import { trace } from 'firebase/performance';
import { ANALYTICS_CONFIG, ERROR_CONFIG, USER_CONFIG, DEBUG_CONFIG } from '../config/monitoring.js';

class AnalyticsService {
  constructor() {
    this.isEnabled = !!analytics && ANALYTICS_CONFIG.enabled;
    this.performanceEnabled = !!performance;
    this.userProperties = {};
    this.debugMode = ANALYTICS_CONFIG.debug;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.config = ANALYTICS_CONFIG;
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // User tracking
  setUser(userId, properties = {}) {
    if (!this.isEnabled) return;
    
    try {
      setUserId(analytics, userId);
      this.setUserProperties(properties);
    } catch (error) {
      console.warn('Failed to set user:', error);
    }
  }

  setUserProperties(properties) {
    if (!this.isEnabled) return;
    
    try {
      this.userProperties = { ...this.userProperties, ...properties };
      firebaseSetUserProperties(analytics, properties);
    } catch (error) {
      console.warn('Failed to set user properties:', error);
    }
  }

  // Event tracking
  trackEvent(eventName, parameters = {}) {
    if (!this.isEnabled) {
      if (this.debugMode) {
        console.log('Analytics: Event', { eventName, parameters });
      }
      return;
    }
    
    // Apply sampling rate
    if (Math.random() > this.config.sampleRate) return;
    
    try {
      logEvent(analytics, eventName, {
        session_id: this.sessionId,
        timestamp: Date.now(),
        ...parameters
      });
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  }

  // Page tracking
  trackPageView(pageName, parameters = {}) {
    if (!this.config.trackPageViews) return;
    
    this.trackEvent(this.config.events.PAGE_VIEW, {
      page_title: pageName,
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...parameters
    });
  }

  // Authentication events
  trackLogin(method, success = true) {
    const eventName = success ? this.config.events.LOGIN_SUCCESS : this.config.events.LOGIN_FAILURE;
    this.trackEvent(eventName, {
      method,
      timestamp: Date.now()
    });
  }

  trackSignUp(method, success = true) {
    const eventName = success ? this.config.events.SIGNUP_SUCCESS : this.config.events.SIGNUP_FAILURE;
    this.trackEvent(eventName, {
      method,
      timestamp: Date.now()
    });
  }

  trackLogout() {
    this.trackEvent(this.config.events.LOGOUT, {
      session_duration: Date.now() - this.startTime
    });
  }

  // Search events
  trackSearch(searchTerm, category = 'general', resultsCount = 0) {
    this.trackEvent('search', {
      search_term: searchTerm,
      category,
      results_count: resultsCount
    });
  }

  // Drug database events
  trackDrugView(drugName, drugId) {
    this.trackEvent(this.config.events.DRUG_VIEW, {
      drug_name: drugName,
      drug_id: drugId,
      content_type: 'drug'
    });
  }

  trackDrugSearch(searchTerm, resultsCount) {
    if (!this.config.trackSearchAnalytics) return;
    
    this.trackEvent(this.config.events.DRUG_SEARCH, {
      search_term: searchTerm,
      results_count: resultsCount,
      search_type: 'drugs'
    });
  }

  // ICD-10 events
  trackICD10Browse(code, description) {
    this.trackEvent(this.config.events.ICD10_BROWSE, {
      icd10_code: code,
      description: description,
      content_type: 'icd10'
    });
  }

  trackICD10Search(searchTerm, resultsCount) {
    if (!this.config.trackSearchAnalytics) return;
    
    this.trackEvent(this.config.events.ICD10_SEARCH, {
      search_term: searchTerm,
      results_count: resultsCount,
      search_type: 'icd10'
    });
  }

  // User engagement
  trackUserEngagement(action, target = null) {
    if (!this.config.trackUserEngagement) return;
    
    this.trackEvent(this.config.events.USER_ENGAGEMENT, {
      engagement_type: action,
      target: target,
      timestamp: Date.now()
    });
  }

  trackBookmark(itemType, itemId) {
    this.trackEvent(this.config.events.BOOKMARK_ADD, {
      item_type: itemType,
      item_id: itemId
    });
  }

  trackShare(itemType, itemId, method) {
    this.trackEvent(this.config.events.CONTENT_SHARE, {
      item_type: itemType,
      item_id: itemId,
      share_method: method
    });
  }

  // Error tracking
  trackError(error, context = {}) {
    if (!this.config.trackErrorAnalytics) return;
    
    // Check if error should be ignored
    const errorMessage = error.message || 'Unknown error';
    if (ERROR_CONFIG.ignorePatterns.some(pattern => pattern.test(errorMessage))) {
      return;
    }
    
    this.trackEvent(this.config.events.ERROR_OCCURRED, {
      error_message: errorMessage,
      error_stack: error.stack || 'No stack trace',
      error_type: error.constructor.name || 'Error',
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: Date.now(),
      ...context
    });
  }

  // Performance monitoring
  startTrace(traceName) {
    if (!this.performanceEnabled) return null;
    
    try {
      return trace(performance, traceName);
    } catch (error) {
      console.warn('Failed to start trace:', error);
      return null;
    }
  }

  stopTrace(traceInstance) {
    if (!traceInstance) return;
    
    try {
      traceInstance.stop();
    } catch (error) {
      console.warn('Failed to stop trace:', error);
    }
  }

  // Custom performance tracking
  async trackPerformance(operationName, operation) {
    const traceInstance = this.startTrace(operationName);
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.trackEvent('performance_metric', {
        operation: operationName,
        duration,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.trackEvent('performance_metric', {
        operation: operationName,
        duration,
        success: false,
        error: error.message
      });
      
      this.trackError(error, { operation: operationName });
      throw error;
    } finally {
      this.stopTrace(traceInstance);
    }
  }

  // Conversion tracking
  trackConversion(conversionType, value = null) {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      value
    });
  }

  // Feature usage
  trackFeatureUsage(featureName, action = 'use') {
    this.trackEvent(this.config.events.FEATURE_USAGE, {
      feature_name: featureName,
      action: action,
      timestamp: Date.now()
    });
  }

  // Session tracking
  trackSessionStart() {
    this.trackEvent(this.config.events.SESSION_START, {
      session_id: this.sessionId,
      timestamp: this.startTime
    });
  }

  trackSessionEnd(duration) {
    this.trackEvent(this.config.events.SESSION_END, {
      session_id: this.sessionId,
      session_duration: duration,
      timestamp: Date.now()
    });
  }

  // Debug methods
  getStatus() {
    return {
      analyticsEnabled: this.isEnabled,
      performanceEnabled: this.performanceEnabled,
      userProperties: this.userProperties
    };
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;