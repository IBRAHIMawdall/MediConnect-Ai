/**
 * Performance Monitoring Service
 * Provides comprehensive performance tracking and optimization
 */

import { performance } from '../config/firebase.js';
import analyticsService from './analyticsService.js';
import { PERFORMANCE_CONFIG } from '../config/monitoring.js';

class PerformanceService {
  constructor() {
    this.isEnabled = !!performance && PERFORMANCE_CONFIG.enabled;
    this.debugMode = PERFORMANCE_CONFIG.debug;
    this.config = PERFORMANCE_CONFIG;
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = {
      loadTime: 3000, // 3 seconds
      renderTime: 100, // 100ms
      apiResponse: 2000, // 2 seconds
      searchResponse: 1000 // 1 second
    };
    
    this.initializeObservers();
  }

  // Initialize performance observers
  initializeObservers() {
    if (!this.isEnabled || typeof window === 'undefined') return;
    if (!this.config.autoTrack) return;

    // Navigation timing
    if ('PerformanceObserver' in window && this.config.autoTrack.navigation) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleNavigationTiming(entry);
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (error) {
        console.warn('Navigation observer failed:', error);
      }

      // Resource timing
      if (this.config.autoTrack.resources) {
        try {
          const resourceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.handleResourceTiming(entry);
            }
          });
          resourceObserver.observe({ entryTypes: ['resource'] });
          this.observers.set('resource', resourceObserver);
        } catch (error) {
          console.warn('Resource observer failed:', error);
        }
      }

      // Largest Contentful Paint
      if (this.config.autoTrack.largestContentfulPaint) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.handleLCP(entry);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.set('lcp', lcpObserver);
        } catch (error) {
          console.warn('LCP observer failed:', error);
        }
      }

      // First Input Delay
      if (this.config.autoTrack.firstInputDelay) {
        try {
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.handleFID(entry);
            }
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          this.observers.set('fid', fidObserver);
        } catch (error) {
          console.warn('FID observer failed:', error);
        }
      }

      // Layout Shift (CLS)
      if (this.config.autoTrack.layoutShifts) {
        try {
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                this.metrics.set('cumulative_layout_shift', entry.value);
                
                if (this.debugMode) {
                  console.log('CLS:', entry.value);
                }
              }
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.set('cls', clsObserver);
        } catch (error) {
          console.warn('CLS observer failed:', error);
        }
      }
    }
  }

  // Handle navigation timing
  handleNavigationTiming(entry) {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connect: entry.connectEnd - entry.connectStart,
      ssl_handshake: entry.connectEnd - entry.secureConnectionStart,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      dom_parse: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load_complete: entry.loadEventEnd - entry.loadEventStart,
      total_load_time: entry.loadEventEnd - entry.navigationStart
    };

    this.metrics.set('navigation', metrics);
    
    // Track slow page loads
    if (metrics.total_load_time > this.thresholds.loadTime) {
      analyticsService.trackEvent('slow_page_load', {
        load_time: metrics.total_load_time,
        page: window.location.pathname
      });
    }

    analyticsService.trackEvent('page_performance', metrics);
  }

  // Handle resource timing
  handleResourceTiming(entry) {
    const duration = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);
    
    if (duration > this.thresholds.apiResponse && resourceType === 'api') {
      analyticsService.trackEvent('slow_api_response', {
        url: entry.name,
        duration,
        resource_type: resourceType
      });
    }
  }

  // Handle Largest Contentful Paint
  handleLCP(entry) {
    const lcp = entry.startTime;
    this.metrics.set('lcp', lcp);
    
    analyticsService.trackEvent('core_web_vital', {
      metric: 'lcp',
      value: lcp,
      rating: this.getLCPRating(lcp)
    });
  }

  // Handle First Input Delay
  handleFID(entry) {
    const fid = entry.processingStart - entry.startTime;
    this.metrics.set('fid', fid);
    
    analyticsService.trackEvent('core_web_vital', {
      metric: 'fid',
      value: fid,
      rating: this.getFIDRating(fid)
    });
  }

  // Utility methods
  getResourceType(url) {
    if (url.includes('/api/') || url.includes('firebase') || url.includes('fda.gov')) {
      return 'api';
    }
    if (url.match(/\.(js|jsx|ts|tsx)$/)) {
      return 'script';
    }
    if (url.match(/\.(css|scss|sass)$/)) {
      return 'stylesheet';
    }
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      return 'image';
    }
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) {
      return 'font';
    }
    return 'other';
  }

  getLCPRating(value) {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  getFIDRating(value) {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  getCLSRating(value) {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  // Manual performance tracking
  startTiming(label) {
    const startTime = performance.now();
    return {
      label,
      startTime,
      stop: () => {
        const duration = performance.now() - startTime;
        this.recordTiming(label, duration);
        return duration;
      }
    };
  }

  recordTiming(label, duration) {
    this.metrics.set(label, duration);
    
    analyticsService.trackEvent('custom_timing', {
      label,
      duration
    });
  }

  // API performance tracking
  async trackAPICall(url, operation) {
    if (!this.isEnabled) {
      if (this.debugMode) {
        console.log(`Performance: API call ${url} (tracking disabled)`);
      }
      return await operation();
    }

    const timer = this.startTiming(`api_${url}`);
    
    try {
      const result = await operation();
      const duration = timer.stop();
      
      if (duration > (this.config.thresholds?.slowAPI || this.thresholds.apiResponse)) {
        analyticsService.trackEvent('slow_api_call', {
          url,
          duration,
          threshold: this.config.thresholds?.slowAPI || this.thresholds.apiResponse
        });
      }
      
      return result;
    } catch (error) {
      timer.stop();
      analyticsService.trackError(error, { context: 'api_call', url });
      throw error;
    }
  }

  // Search performance tracking
  async trackSearchPerformance(searchTerm, searchOperation) {
    const timer = this.startTiming('search_operation');
    
    try {
      const results = await searchOperation();
      const duration = timer.stop();
      
      analyticsService.trackEvent('search_performance', {
        search_term: searchTerm,
        duration,
        results_count: results?.length || 0
      });
      
      if (duration > this.thresholds.searchResponse) {
        analyticsService.trackEvent('slow_search', {
          search_term: searchTerm,
          duration
        });
      }
      
      return results;
    } catch (error) {
      timer.stop();
      analyticsService.trackError(error, { context: 'search', search_term: searchTerm });
      throw error;
    }
  }

  // Component render tracking
  trackComponentRender(componentName, renderOperation) {
    if (!this.isEnabled) {
      if (this.debugMode) {
        console.log(`Performance: Component render ${componentName} (tracking disabled)`);
      }
      return renderOperation();
    }

    const timer = this.startTiming(`render_${componentName}`);
    
    try {
      const result = renderOperation();
      const duration = timer.stop();
      
      if (duration > (this.config.thresholds?.slowRender || this.thresholds.renderTime)) {
        analyticsService.trackEvent('slow_component_render', {
          component: componentName,
          duration,
          threshold: this.config.thresholds?.slowRender || this.thresholds.renderTime
        });
      }
      
      return result;
    } catch (error) {
      timer.stop();
      analyticsService.trackError(error, { context: 'component_render', component: componentName });
      throw error;
    }
  }

  // Memory usage tracking
  trackMemoryUsage() {
    if (!this.isEnabled || !('memory' in performance)) {
      return null;
    }

    const memInfo = performance.memory;
    const usage = {
      used: memInfo.usedJSHeapSize,
      total: memInfo.totalJSHeapSize,
      limit: memInfo.jsHeapSizeLimit,
      usage_percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
    };
    
    this.metrics.set('memory', usage);
    
    const memoryThreshold = this.config.thresholds?.memoryWarning || 80;
    if (usage.usage_percentage > memoryThreshold) {
      analyticsService.trackEvent('high_memory_usage', {
        ...usage,
        threshold: memoryThreshold
      });
    }
    
    if (this.debugMode) {
      console.log('Memory usage:', {
        used: `${(usage.used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(usage.total / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${usage.usage_percentage.toFixed(2)}%`
      });
    }
    
    return usage;
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      metrics: Object.fromEntries(this.metrics),
      timestamp: Date.now(),
      url: window.location.href
    };
    
    // Add memory info if available
    const memoryUsage = this.trackMemoryUsage();
    if (memoryUsage) {
      summary.memory = memoryUsage;
    }
    
    return summary;
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    });
    this.observers.clear();
    this.metrics.clear();
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

export default performanceService;

// Export convenience methods
export const {
  startTiming,
  recordTiming,
  trackAPICall,
  trackSearchPerformance,
  trackComponentRender,
  trackMemoryUsage,
  getPerformanceSummary
} = performanceService;