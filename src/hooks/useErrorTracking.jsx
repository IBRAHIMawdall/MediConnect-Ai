import { useCallback } from 'react';
import { useMonitoring } from './useMonitoring';

// Hook for error boundary integration
export const useErrorTracking = () => {
  const { trackError } = useMonitoring();
  
  const trackComponentError = useCallback((error, errorInfo) => {
    if (trackError) {
      trackError(error, {
        component_stack: errorInfo.componentStack,
        error_boundary: true
      });
    }
  }, [trackError]);
  
  return { trackComponentError };
};