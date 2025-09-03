/**
 * Cache Manager Component
 * Provides cache management functionality and UI for the React application
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cacheManager } from '../../config/cache.js';

// Cache status hook
export const useCacheStatus = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState('unknown');

  const updateCacheStats = useCallback(async () => {
    try {
      const stats = cacheManager.getCacheStats();
      setCacheStats(stats);

      // Get service worker cache stats
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_STATS' },
          [channel.port2]
        );

        channel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_STATS') {
            setCacheStats(prev => ({
              ...prev,
              serviceWorker: event.data.data
            }));
          }
        };
      }
    } catch (error) {
      console.error('Failed to update cache stats:', error);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('ready');
      }).catch(() => {
        setServiceWorkerStatus('error');
      });

      if (navigator.serviceWorker.controller) {
        setServiceWorkerStatus('active');
      }
    } else {
      setServiceWorkerStatus('unsupported');
    }

    // Initial stats update
    updateCacheStats();

    // Periodic stats update
    const interval = setInterval(updateCacheStats, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [updateCacheStats]);

  return {
    cacheStats,
    isOnline,
    serviceWorkerStatus,
    updateCacheStats
  };
};

// Cache control component
export const CacheControl = ({ className = '' }) => {
  const { cacheStats, isOnline, serviceWorkerStatus, updateCacheStats } = useCacheStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = async (cacheType = 'all') => {
    setIsClearing(true);
    try {
      if (cacheType === 'all' || cacheType === 'memory') {
        cacheManager.clearMemoryCache();
      }

      if (cacheType === 'all' || cacheType === 'serviceWorker') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'INVALIDATE_CACHE',
            pattern: '.*',
            cacheType: null
          });
        }
      }

      if (cacheType === 'all' || cacheType === 'browser') {
        // Clear browser cache (limited to same-origin)
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
        }
      }

      await updateCacheStats();
      
      // Show success message
      const event = new CustomEvent('cacheCleared', {
        detail: { type: cacheType }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      
      // Show error message
      const event = new CustomEvent('cacheError', {
        detail: { error: error.message }
      });
      window.dispatchEvent(event);
    } finally {
      setIsClearing(false);
    }
  };

  const preloadResources = async () => {
    try {
      await cacheManager.preloadCriticalResources();
      await updateCacheStats();
      
      const event = new CustomEvent('resourcesPreloaded');
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to preload resources:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'ready':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'unsupported':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'ready':
        return '🟢';
      case 'error':
        return '🔴';
      case 'unsupported':
        return '🟡';
      default:
        return '⚪';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {isOnline ? '🌐' : '📡'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Cache Manager</h3>
            <p className="text-sm text-gray-600">
              {isOnline ? 'Online' : 'Offline'} • 
              SW: {getStatusIcon(serviceWorkerStatus)} {serviceWorkerStatus}
            </p>
          </div>
        </div>
        <div className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {/* Cache Statistics */}
          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2">Memory Cache</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span className="font-mono">{cacheStats.hitRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entries:</span>
                    <span className="font-mono">{cacheStats.memorySize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hits:</span>
                    <span className="font-mono">{cacheStats.hits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misses:</span>
                    <span className="font-mono">{cacheStats.misses}</span>
                  </div>
                </div>
              </div>

              {cacheStats.serviceWorker && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Service Worker Cache</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(cacheStats.serviceWorker).map(([type, data]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type}:</span>
                        <span className="font-mono">
                          {data.entries}/{data.maxEntries}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cache Controls */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Cache Controls</h4>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => clearCache('memory')}
                disabled={isClearing}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? 'Clearing...' : 'Clear Memory'}
              </button>
              
              <button
                onClick={() => clearCache('serviceWorker')}
                disabled={isClearing || serviceWorkerStatus !== 'active'}
                className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear SW Cache
              </button>
              
              <button
                onClick={() => clearCache('all')}
                disabled={isClearing}
                className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
              
              <button
                onClick={preloadResources}
                disabled={!isOnline}
                className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preload Resources
              </button>
              
              <button
                onClick={updateCacheStats}
                className="px-3 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
              >
                Refresh Stats
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2">Connection Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Network:</span>
                <span className={`font-medium ${
                  isOnline ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Service Worker:</span>
                <span className={`font-medium ${getStatusColor(serviceWorkerStatus)}`}>
                  {getStatusIcon(serviceWorkerStatus)} {serviceWorkerStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cache API:</span>
                <span className={`font-medium ${
                  'caches' in window ? 'text-green-600' : 'text-red-600'
                }`}>
                  {'caches' in window ? '🟢 Supported' : '🔴 Unsupported'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Cache notification component
export const CacheNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleCacheUpdate = () => {
      addNotification('New version available! Refresh to update.', 'info');
    };

    const handleCacheCleared = (event) => {
      addNotification(`${event.detail.type} cache cleared successfully.`, 'success');
    };

    const handleCacheError = (event) => {
      addNotification(`Cache error: ${event.detail.error}`, 'error');
    };

    const handleResourcesPreloaded = () => {
      addNotification('Critical resources preloaded for offline use.', 'success');
    };

    window.addEventListener('cacheUpdate', handleCacheUpdate);
    window.addEventListener('cacheCleared', handleCacheCleared);
    window.addEventListener('cacheError', handleCacheError);
    window.addEventListener('resourcesPreloaded', handleResourcesPreloaded);

    return () => {
      window.removeEventListener('cacheUpdate', handleCacheUpdate);
      window.removeEventListener('cacheCleared', handleCacheCleared);
      window.removeEventListener('cacheError', handleCacheError);
      window.removeEventListener('resourcesPreloaded', handleResourcesPreloaded);
    };
  }, []);

  const addNotification = (message, type) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`border-l-4 p-4 rounded-md shadow-lg max-w-sm ${
            getNotificationStyles(notification.type)
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-lg leading-none hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Cache provider component
export const CacheProvider = ({ children }) => {
  useEffect(() => {
    // Initialize cache manager
    cacheManager.initialize().catch(error => {
      console.error('Failed to initialize cache manager:', error);
    });
  }, []);

  return (
    <>
      {children}
      <CacheNotifications />
    </>
  );
};

export default CacheControl;