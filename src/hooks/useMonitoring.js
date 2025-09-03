/**
 * Monitoring Hook
 * Provides easy access to analytics and performance monitoring in React components
 */

import { useEffect, useCallback, useRef } from 'react';
import analyticsService from '../services/analyticsService.js';
import performanceService from '../services/performanceService.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export const useMonitoring = () => {
  const { user } = useAuth();
  const sessionStartTime = useRef(Date.now());

  // Set user for analytics when user changes
  useEffect(() => {
    if (user) {
      analyticsService.setUser(user.uid, {
        email_verified: user.emailVerified,
        provider: user.providerData?.[0]?.providerId || 'unknown',
        creation_time: user.metadata?.creationTime,
        last_sign_in: user.metadata?.lastSignInTime
      });
    }
  }, [user]);

  // Track session duration on unmount
  useEffect(() => {
    analyticsService.trackSessionStart();
    
    return () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      analyticsService.trackSessionEnd(sessionDuration);
    };
  }, []);

  // Analytics methods
  const trackPageView = useCallback((pageName, parameters = {}) => {
    analyticsService.trackPageView(pageName, parameters);
  }, []);

  const trackEvent = useCallback((eventName, parameters = {}) => {
    analyticsService.trackEvent(eventName, parameters);
  }, []);

  const trackError = useCallback((error, context = {}) => {
    analyticsService.trackError(error, context);
  }, []);

  const trackFeatureUsage = useCallback((featureName, action = 'use') => {
    analyticsService.trackFeatureUsage(featureName, action);
  }, []);

  // Medical app specific tracking
  const trackDrugView = useCallback((drugName, drugId) => {
    analyticsService.trackDrugView(drugName, drugId);
  }, []);

  const trackDrugSearch = useCallback((searchTerm, resultsCount) => {
    analyticsService.trackDrugSearch(searchTerm, resultsCount);
  }, []);

  const trackICD10Browse = useCallback((code, description) => {
    analyticsService.trackICD10Browse(code, description);
  }, []);

  const trackICD10Search = useCallback((searchTerm, resultsCount) => {
    analyticsService.trackICD10Search(searchTerm, resultsCount);
  }, []);

  const trackBookmark = useCallback((itemType, itemId) => {
    analyticsService.trackBookmark(itemType, itemId);
  }, []);

  const trackShare = useCallback((itemType, itemId, method) => {
    analyticsService.trackShare(itemType, itemId, method);
  }, []);

  // Performance methods
  const trackPerformance = useCallback(async (operationName, operation) => {
    return await performanceService.trackAPICall(operationName, operation);
  }, []);

  const trackSearchPerformance = useCallback(async (searchTerm, searchOperation) => {
    return await performanceService.trackSearchPerformance(searchTerm, searchOperation);
  }, []);

  const trackComponentRender = useCallback((componentName, renderOperation) => {
    return performanceService.trackComponentRender(componentName, renderOperation);
  }, []);

  const startTiming = useCallback((label) => {
    return performanceService.startTiming(label);
  }, []);

  const getPerformanceSummary = useCallback(() => {
    return performanceService.getPerformanceSummary();
  }, []);

  return {
    // Analytics
    trackPageView,
    trackEvent,
    trackError,
    trackFeatureUsage,
    
    // Medical app specific
    trackDrugView,
    trackDrugSearch,
    trackICD10Browse,
    trackICD10Search,
    trackBookmark,
    trackShare,
    
    // Performance
    trackPerformance,
    trackSearchPerformance,
    trackComponentRender,
    startTiming,
    getPerformanceSummary,
    
    // Status
    isAnalyticsEnabled: analyticsService.isEnabled,
    isPerformanceEnabled: performanceService.isEnabled
  };
};

// Hook for page tracking
export const usePageTracking = (pageName, parameters = {}) => {
  const { trackPageView } = useMonitoring();
  
  useEffect(() => {
    trackPageView(pageName, parameters);
  }, [trackPageView, pageName, parameters]);
};

// Hook for component performance tracking
export const useComponentPerformance = (componentName) => {
  const renderStartTime = useRef(performance.now());
  const { trackComponentRender } = useMonitoring();
  
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    if (renderTime > 100) { // Track slow renders (>100ms)
      trackComponentRender(componentName, () => renderTime);
    }
  });
  
  return {
    trackRender: (operation) => trackComponentRender(componentName, operation)
  };
};

// Hook for error boundary integration
export const useErrorTracking = () => {
  const { trackError } = useMonitoring();
  
  const trackComponentError = useCallback((error, errorInfo) => {
    trackError(error, {
      component_stack: errorInfo.componentStack,
      error_boundary: true
    });
  }, [trackError]);
  
  return { trackComponentError };
};

// Hook for search tracking
export const useSearchTracking = () => {
  const { trackSearchPerformance, trackDrugSearch, trackICD10Search } = useMonitoring();
  
  const trackSearch = useCallback(async (searchTerm, searchType, searchOperation) => {
    const results = await trackSearchPerformance(searchTerm, searchOperation);
    
    // Track specific search types
    switch (searchType) {
      case 'drugs':
        trackDrugSearch(searchTerm, results?.length || 0);
        break;
      case 'icd10':
        trackICD10Search(searchTerm, results?.length || 0);
        break;
      default:
        // Generic search tracking is handled by trackSearchPerformance
        break;
    }
    
    return results;
  }, [trackSearchPerformance, trackDrugSearch, trackICD10Search]);
  
  return { trackSearch };
};

export default useMonitoring;