/**
 * Monitoring Hook
 * Provides easy access to analytics and performance monitoring in React components
 */

import { useEffect, useCallback, useRef } from 'react';
import analyticsService from '../services/analyticsService';
// import performanceService from '../services/performanceService';
import { useAuth } from '../contexts/AuthContext';

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

  return {
    // Analytics
    trackPageView,
    trackEvent,
    trackError,
    trackFeatureUsage,
    
    // Status
    isAnalyticsEnabled: analyticsService.isEnabled,
    // isPerformanceEnabled: performanceService.isEnabled
  };
};