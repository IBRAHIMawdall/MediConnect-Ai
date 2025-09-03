import { useEffect, useRef } from 'react';
import { useMonitoring } from './useMonitoring';

// Hook for component performance tracking
export const useComponentPerformance = (componentName) => {
  const renderStartTime = useRef(performance.now());
  const { trackComponentRender } = useMonitoring();
  
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    if (renderTime > 100) { // Track slow renders (>100ms)
      if (trackComponentRender) {
        trackComponentRender(componentName, () => renderTime);
      }
    }
  }, [componentName, trackComponentRender]);
  
  return {
    trackRender: (operation) => {
      if (trackComponentRender) {
        trackComponentRender(componentName, operation);
      }
    }
  };
};