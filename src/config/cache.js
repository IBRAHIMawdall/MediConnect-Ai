/**
 * Caching Configuration
 * Defines caching strategies for different types of content and resources
 */

import { AssetConfig } from './assets.js';

// Cache configuration
export const CacheConfig = {
  // Service Worker configuration
  serviceWorker: {
    enabled: true,
    scope: '/',
    updateViaCache: 'none',
    skipWaiting: true,
    clientsClaim: true,
    offlineAnalytics: true,
    
    // Cache names
    cacheNames: {
      static: 'medical-app-static-v1',
      dynamic: 'medical-app-dynamic-v1',
      api: 'medical-app-api-v1',
      images: 'medical-app-images-v1',
      fonts: 'medical-app-fonts-v1',
      offline: 'medical-app-offline-v1'
    },
    
    // Cache strategies
    strategies: {
      // Static assets (JS, CSS, fonts)
      static: {
        strategy: 'CacheFirst',
        cacheName: 'medical-app-static-v1',
        options: {
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 31536000, // 1 year
            purgeOnQuotaError: true
          },
          cacheKeyWillBeUsed: async ({ request }) => {
            return `${request.url}?v=${Date.now()}`;
          }
        }
      },
      
      // Dynamic content (HTML pages)
      dynamic: {
        strategy: 'StaleWhileRevalidate',
        cacheName: 'medical-app-dynamic-v1',
        options: {
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 86400, // 24 hours
            purgeOnQuotaError: true
          }
        }
      },
      
      // API responses
      api: {
        strategy: 'NetworkFirst',
        cacheName: 'medical-app-api-v1',
        options: {
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 3600, // 1 hour
            purgeOnQuotaError: true
          },
          networkTimeoutSeconds: 5,
          cacheableResponse: {
            statuses: [0, 200, 206, 300, 301, 404]
          }
        }
      },
      
      // Images
      images: {
        strategy: 'CacheFirst',
        cacheName: 'medical-app-images-v1',
        options: {
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 2592000, // 30 days
            purgeOnQuotaError: true
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      
      // Fonts
      fonts: {
        strategy: 'CacheFirst',
        cacheName: 'medical-app-fonts-v1',
        options: {
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 31536000, // 1 year
            purgeOnQuotaError: true
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    }
  },
  
  // Browser cache configuration
  browser: {
    // Static assets
    static: {
      maxAge: 31536000, // 1 year
      immutable: true,
      etag: true,
      lastModified: true
    },
    
    // Dynamic content
    dynamic: {
      maxAge: 3600, // 1 hour
      etag: true,
      lastModified: true,
      staleWhileRevalidate: 86400 // 24 hours
    },
    
    // API responses
    api: {
      maxAge: 300, // 5 minutes
      etag: true,
      staleWhileRevalidate: 3600, // 1 hour
      mustRevalidate: true
    }
  },
  
  // CDN cache configuration
  cdn: {
    // Static assets
    static: {
      maxAge: 31536000, // 1 year
      sMaxAge: 31536000, // 1 year for shared caches
      immutable: true,
      public: true
    },
    
    // Dynamic content
    dynamic: {
      maxAge: 3600, // 1 hour
      sMaxAge: 7200, // 2 hours for shared caches
      public: true,
      staleWhileRevalidate: 86400 // 24 hours
    },
    
    // API responses
    api: {
      maxAge: 300, // 5 minutes
      sMaxAge: 600, // 10 minutes for shared caches
      public: false,
      mustRevalidate: true
    }
  },
  
  // Memory cache configuration
  memory: {
    // Maximum memory usage (in MB)
    maxSize: 50,
    
    // Cache TTL for different content types
    ttl: {
      api: 300000,      // 5 minutes
      static: 3600000,  // 1 hour
      images: 1800000,  // 30 minutes
      fonts: 7200000    // 2 hours
    },
    
    // Maximum entries per cache type
    maxEntries: {
      api: 100,
      static: 50,
      images: 200,
      fonts: 20
    }
  },
  
  // Database cache configuration
  database: {
    // Query result caching
    queries: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxEntries: 1000,
      keyPrefix: 'query:'
    },
    
    // Connection pooling
    connections: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }
  },
  
  // Offline configuration
  offline: {
    enabled: true,
    
    // Pages to cache for offline access
    pages: [
      '/',
      '/search',
      '/drugs',
      '/conditions',
      '/offline'
    ],
    
    // Essential resources for offline functionality
    resources: [
      '/manifest.json',
      '/favicon.ico',
      '/assets/icons/icon-192x192.png',
      '/assets/icons/icon-512x512.png'
    ],
    
    // Fallback pages
    fallbacks: {
      document: '/offline.html',
      image: '/assets/images/offline-image.svg',
      audio: '/assets/audio/offline-audio.mp3',
      video: '/assets/video/offline-video.mp4'
    }
  },
  
  // Cache invalidation rules
  invalidation: {
    // Automatic invalidation triggers
    triggers: {
      // Time-based invalidation
      time: {
        api: 3600000,     // 1 hour
        static: 86400000, // 24 hours
        dynamic: 1800000  // 30 minutes
      },
      
      // Version-based invalidation
      version: {
        enabled: true,
        header: 'X-App-Version',
        storage: 'localStorage'
      },
      
      // Event-based invalidation
      events: {
        userLogin: ['api', 'dynamic'],
        userLogout: ['api', 'dynamic'],
        dataUpdate: ['api'],
        appUpdate: ['static', 'dynamic']
      }
    },
    
    // Manual invalidation patterns
    patterns: {
      api: [
        '/api/user/*',
        '/api/drugs/*',
        '/api/search/*'
      ],
      static: [
        '/assets/js/*',
        '/assets/css/*'
      ]
    }
  }
};

// Cache utilities
export class CacheManager {
  constructor(config = CacheConfig) {
    this.config = config;
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  // Generate cache key
  generateCacheKey(url, params = {}) {
    const urlObj = new URL(url, window.location.origin);
    
    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
    
    return urlObj.toString();
  }
  
  // Get cache headers for response
  getCacheHeaders(type = 'static', customMaxAge = null) {
    const cacheConfig = this.config.browser[type] || this.config.browser.static;
    const maxAge = customMaxAge || cacheConfig.maxAge;
    
    const headers = {
      'Cache-Control': `public, max-age=${maxAge}`
    };
    
    if (cacheConfig.immutable) {
      headers['Cache-Control'] += ', immutable';
    }
    
    if (cacheConfig.staleWhileRevalidate) {
      headers['Cache-Control'] += `, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`;
    }
    
    if (cacheConfig.mustRevalidate) {
      headers['Cache-Control'] += ', must-revalidate';
    }
    
    if (cacheConfig.etag) {
      headers['ETag'] = this.generateETag(type);
    }
    
    if (cacheConfig.lastModified) {
      headers['Last-Modified'] = new Date().toUTCString();
    }
    
    return headers;
  }
  
  // Generate ETag
  generateETag(content) {
    const hash = require('crypto')
      .createHash('md5')
      .update(content.toString())
      .digest('hex');
    return `"${hash.substring(0, 16)}"`;
  }
  
  // Memory cache operations
  setMemoryCache(key, value, ttl = null) {
    const expiry = ttl ? Date.now() + ttl : null;
    this.memoryCache.set(key, { value, expiry });
    this.cacheStats.sets++;
    
    // Clean up expired entries
    this.cleanupMemoryCache();
  }
  
  getMemoryCache(key) {
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }
    
    if (cached.expiry && Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      this.cacheStats.misses++;
      return null;
    }
    
    this.cacheStats.hits++;
    return cached.value;
  }
  
  deleteMemoryCache(key) {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.cacheStats.deletes++;
    }
    return deleted;
  }
  
  clearMemoryCache() {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    this.cacheStats.deletes += size;
  }
  
  cleanupMemoryCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiry && now > cached.expiry) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    this.cacheStats.deletes += cleaned;
    return cleaned;
  }
  
  // Cache statistics
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      total,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size
    };
  }
  
  // Invalidate cache by pattern
  invalidateByPattern(pattern, cacheType = 'memory') {
    if (cacheType === 'memory') {
      const regex = new RegExp(pattern);
      let invalidated = 0;
      
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          invalidated++;
        }
      }
      
      this.cacheStats.deletes += invalidated;
      return invalidated;
    }
    
    // For service worker cache invalidation
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'INVALIDATE_CACHE',
        pattern,
        cacheType
      });
    }
    
    return 0;
  }
  
  // Preload critical resources
  async preloadCriticalResources() {
    const criticalResources = [
      ...this.config.offline.pages,
      ...this.config.offline.resources
    ];
    
    const preloadPromises = criticalResources.map(async (resource) => {
      try {
        const response = await fetch(resource);
        if (response.ok) {
          // Cache the response
          const cacheKey = this.generateCacheKey(resource);
          const data = await response.clone().text();
          this.setMemoryCache(cacheKey, data, this.config.memory.ttl.static);
        }
      } catch (error) {
        console.warn(`Failed to preload resource: ${resource}`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }
  
  // Initialize cache manager
  async initialize() {
    // Register service worker
    if ('serviceWorker' in navigator && this.config.serviceWorker.enabled) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: this.config.serviceWorker.scope,
          updateViaCache: this.config.serviceWorker.updateViaCache
        });
        
        console.log('Service Worker registered:', registration);
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.notifyUpdate();
            }
          });
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
    
    // Preload critical resources
    await this.preloadCriticalResources();
    
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 60000); // Clean up every minute
  }
  
  // Notify about cache updates
  notifyUpdate() {
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('cacheUpdate', {
      detail: { message: 'New version available' }
    }));
  }
}

// Export cache manager instance
export const cacheManager = new CacheManager();

export default CacheConfig;