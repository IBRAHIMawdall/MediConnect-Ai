import { useCallback } from 'react';
import { useMonitoring } from './useMonitoring';

// Hook for search tracking
export const useSearchTracking = () => {
  const { trackSearchPerformance, trackDrugSearch, trackICD10Search } = useMonitoring();
  
  const trackSearch = useCallback(async (searchTerm, searchType, searchOperation) => {
    if (trackSearchPerformance) {
      const results = await trackSearchPerformance(searchTerm, searchOperation);
      
      // Track specific search types
      switch (searchType) {
        case 'drugs':
          if (trackDrugSearch) {
            trackDrugSearch(searchTerm, results?.length || 0);
          }
          break;
        case 'icd10':
          if (trackICD10Search) {
            trackICD10Search(searchTerm, results?.length || 0);
          }
          break;
        default:
          // Generic search tracking is handled by trackSearchPerformance
          break;
      }
      
      return results;
    }
    return Promise.resolve([]);
  }, [trackSearchPerformance, trackDrugSearch, trackICD10Search]);
  
  return { trackSearch };
};