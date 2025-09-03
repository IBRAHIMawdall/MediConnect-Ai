/**
 * Asset Optimization Configuration
 * Handles minification, bundling, and optimization of static assets
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Asset optimization configuration
export const AssetConfig = {
  // Build directories
  paths: {
    src: path.join(projectRoot, 'src'),
    public: path.join(projectRoot, 'public'),
    dist: path.join(projectRoot, 'dist'),
    build: path.join(projectRoot, 'build'),
    assets: path.join(projectRoot, 'src/assets'),
    images: path.join(projectRoot, 'src/assets/images'),
    fonts: path.join(projectRoot, 'src/assets/fonts'),
    styles: path.join(projectRoot, 'src/styles'),
    components: path.join(projectRoot, 'src/components')
  },

  // File patterns for different asset types
  patterns: {
    javascript: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    styles: ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less'],
    images: ['**/*.{png,jpg,jpeg,gif,svg,webp,avif,ico}'],
    fonts: ['**/*.{woff,woff2,eot,ttf,otf}'],
    videos: ['**/*.{mp4,webm,ogg,avi,mov}'],
    audio: ['**/*.{mp3,wav,ogg,aac,flac}'],
    documents: ['**/*.{pdf,doc,docx,txt,md}'],
    data: ['**/*.{json,xml,csv,yaml,yml}']
  },

  // Optimization settings
  optimization: {
    // JavaScript/TypeScript minification
    javascript: {
      minify: true,
      mangle: true,
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      format: {
        comments: false
      },
      sourceMap: false
    },

    // CSS optimization
    css: {
      minify: true,
      autoprefixer: {
        browsers: ['> 1%', 'last 2 versions', 'not dead']
      },
      purgeCSS: {
        enabled: true,
        content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
        safelist: {
          standard: ['body', 'html', 'root'],
          deep: [/^react-/, /^ant-/, /^mui-/],
          greedy: [/^data-/, /^aria-/]
        }
      },
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          mergeLonghand: true,
          mergeRules: true
        }]
      }
    },

    // Image optimization
    images: {
      quality: {
        jpeg: 85,
        png: 90,
        webp: 85,
        avif: 80
      },
      formats: {
        convert: {
          png: 'webp',
          jpg: 'webp',
          jpeg: 'webp'
        },
        fallback: true
      },
      resize: {
        enabled: true,
        sizes: [320, 640, 768, 1024, 1280, 1920],
        format: 'webp'
      },
      compression: {
        png: {
          quality: [0.8, 0.9],
          speed: 4
        },
        jpeg: {
          quality: 85,
          progressive: true
        },
        webp: {
          quality: 85,
          effort: 6
        },
        avif: {
          quality: 80,
          effort: 9
        }
      }
    },

    // Font optimization
    fonts: {
      preload: ['woff2'],
      display: 'swap',
      subset: {
        enabled: true,
        unicode: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
      },
      compression: {
        woff2: true,
        gzip: true
      }
    },

    // Bundle splitting
    bundling: {
      chunks: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20
        },
        firebase: {
          test: /[\\/]node_modules[\\/]firebase[\\/]/,
          name: 'firebase',
          chunks: 'all',
          priority: 15
        }
      },
      maxSize: {
        initial: 244000, // 244KB
        async: 244000
      },
      minSize: {
        initial: 20000, // 20KB
        async: 20000
      }
    },

    // Tree shaking
    treeShaking: {
      enabled: true,
      sideEffects: false,
      usedExports: true,
      providedExports: true
    },

    // Code splitting
    codeSplitting: {
      strategy: 'split-by-route',
      maxInitialRequests: 30,
      maxAsyncRequests: 30,
      minSize: 20000,
      maxSize: 244000
    }
  },

  // Asset loading strategies
  loading: {
    // Critical resources
    critical: {
      inline: {
        css: 14000, // 14KB threshold for inlining CSS
        js: 10000   // 10KB threshold for inlining JS
      },
      preload: ['fonts', 'critical-css', 'hero-images']
    },

    // Lazy loading
    lazy: {
      images: {
        enabled: true,
        threshold: '50px',
        placeholder: 'blur'
      },
      components: {
        enabled: true,
        strategy: 'intersection-observer'
      }
    },

    // Prefetching
    prefetch: {
      enabled: true,
      routes: 'visible-links',
      resources: 'low-priority'
    }
  },

  // Compression settings
  compression: {
    gzip: {
      enabled: true,
      level: 9,
      threshold: 1024,
      filter: /\.(js|css|html|svg|json)$/
    },
    brotli: {
      enabled: true,
      quality: 11,
      threshold: 1024,
      filter: /\.(js|css|html|svg|json)$/
    }
  },

  // Cache strategies
  caching: {
    // Static assets
    static: {
      maxAge: 31536000, // 1 year
      immutable: true,
      etag: true
    },

    // Dynamic content
    dynamic: {
      maxAge: 3600, // 1 hour
      staleWhileRevalidate: 86400, // 24 hours
      etag: true
    },

    // API responses
    api: {
      maxAge: 300, // 5 minutes
      staleWhileRevalidate: 3600, // 1 hour
      etag: true
    }
  },

  // Performance budgets
  budgets: {
    // Bundle size limits
    bundles: {
      initial: 244000,    // 244KB
      async: 244000,      // 244KB
      vendor: 500000,     // 500KB
      total: 2000000      // 2MB
    },

    // Asset size limits
    assets: {
      image: 500000,      // 500KB per image
      font: 100000,       // 100KB per font
      video: 5000000,     // 5MB per video
      audio: 2000000      // 2MB per audio
    },

    // Performance metrics
    metrics: {
      fcp: 1800,          // First Contentful Paint < 1.8s
      lcp: 2500,          // Largest Contentful Paint < 2.5s
      fid: 100,           // First Input Delay < 100ms
      cls: 0.1,           // Cumulative Layout Shift < 0.1
      ttfb: 600           // Time to First Byte < 600ms
    }
  }
};

// Asset optimization utilities
export class AssetOptimizer {
  constructor(config = AssetConfig) {
    this.config = config;
  }

  // Get optimization settings for file type
  getOptimizationSettings(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return this.config.optimization.javascript;
    }
    
    if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
      return this.config.optimization.css;
    }
    
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
      return this.config.optimization.images;
    }
    
    if (['.woff', '.woff2', '.eot', '.ttf', '.otf'].includes(ext)) {
      return this.config.optimization.fonts;
    }
    
    return null;
  }

  // Calculate asset priority
  getAssetPriority(filePath, type = 'default') {
    const priorities = {
      critical: 100,
      high: 80,
      medium: 60,
      low: 40,
      lazy: 20
    };

    // Critical assets
    if (filePath.includes('critical') || filePath.includes('above-fold')) {
      return priorities.critical;
    }

    // High priority assets
    if (type === 'font' || filePath.includes('hero') || filePath.includes('logo')) {
      return priorities.high;
    }

    // Medium priority assets
    if (type === 'css' || filePath.includes('main')) {
      return priorities.medium;
    }

    // Low priority assets
    if (type === 'image' && !filePath.includes('hero')) {
      return priorities.low;
    }

    // Lazy load candidates
    if (filePath.includes('below-fold') || filePath.includes('lazy')) {
      return priorities.lazy;
    }

    return priorities.medium;
  }

  // Generate responsive image sizes
  generateResponsiveImages(imagePath) {
    const sizes = this.config.optimization.images.resize.sizes;
    const format = this.config.optimization.images.resize.format;
    
    return sizes.map(size => ({
      width: size,
      src: this.generateImagePath(imagePath, size, format),
      format
    }));
  }

  // Generate optimized image path
  generateImagePath(originalPath, width, format) {
    const parsed = path.parse(originalPath);
    return path.join(
      parsed.dir,
      `${parsed.name}-${width}w.${format}`
    );
  }

  // Check if asset should be inlined
  shouldInlineAsset(filePath, size) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.css'].includes(ext)) {
      return size <= this.config.loading.critical.inline.css;
    }
    
    if (['.js', '.jsx'].includes(ext)) {
      return size <= this.config.loading.critical.inline.js;
    }
    
    return false;
  }

  // Get cache headers for asset
  getCacheHeaders(filePath, type = 'static') {
    const cacheConfig = this.config.caching[type] || this.config.caching.static;
    
    const headers = {
      'Cache-Control': `public, max-age=${cacheConfig.maxAge}`,
    };

    if (cacheConfig.immutable) {
      headers['Cache-Control'] += ', immutable';
    }

    if (cacheConfig.staleWhileRevalidate) {
      headers['Cache-Control'] += `, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`;
    }

    if (cacheConfig.etag) {
      headers['ETag'] = this.generateETag(filePath);
    }

    return headers;
  }

  // Generate ETag for asset
  generateETag(filePath) {
    // Simple ETag generation based on file path and timestamp
    const hash = require('crypto')
      .createHash('md5')
      .update(filePath + Date.now())
      .digest('hex');
    return `"${hash.substring(0, 16)}"`;
  }

  // Check performance budget
  checkPerformanceBudget(bundleSize, type = 'initial') {
    const budget = this.config.budgets.bundles[type];
    if (!budget) return { passed: true };

    const passed = bundleSize <= budget;
    const percentage = (bundleSize / budget) * 100;

    return {
      passed,
      size: bundleSize,
      budget,
      percentage: Math.round(percentage),
      message: passed 
        ? `Bundle size OK (${percentage.toFixed(1)}% of budget)`
        : `Bundle size exceeds budget by ${(percentage - 100).toFixed(1)}%`
    };
  }

  // Generate asset manifest
  generateAssetManifest(assets) {
    const manifest = {
      version: Date.now(),
      assets: {},
      bundles: {},
      performance: {
        totalSize: 0,
        budgetStatus: {}
      }
    };

    assets.forEach(asset => {
      const priority = this.getAssetPriority(asset.path, asset.type);
      const cacheHeaders = this.getCacheHeaders(asset.path, asset.type);
      
      manifest.assets[asset.path] = {
        size: asset.size,
        type: asset.type,
        priority,
        hash: asset.hash,
        cacheHeaders,
        optimized: asset.optimized || false
      };

      manifest.performance.totalSize += asset.size;
    });

    // Check performance budgets
    Object.keys(this.config.budgets.bundles).forEach(bundleType => {
      const bundleAssets = assets.filter(a => a.bundle === bundleType);
      const bundleSize = bundleAssets.reduce((sum, a) => sum + a.size, 0);
      
      manifest.performance.budgetStatus[bundleType] = 
        this.checkPerformanceBudget(bundleSize, bundleType);
    });

    return manifest;
  }
}

// Export utilities
export const assetOptimizer = new AssetOptimizer();

export default AssetConfig;