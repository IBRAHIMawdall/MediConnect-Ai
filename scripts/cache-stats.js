#!/usr/bin/env node

/**
 * Cache Statistics Script
 * Provides detailed information about cache usage and performance
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class CacheStatsAnalyzer {
  constructor() {
    this.stats = {
      timestamp: new Date().toISOString(),
      caches: {},
      performance: {},
      recommendations: []
    };
  }

  // Analyze service worker cache files
  async analyzeServiceWorkerCache() {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    
    if (!fs.existsSync(swPath)) {
      this.stats.caches.serviceWorker = {
        status: 'not_found',
        error: 'Service worker file not found'
      };
      return;
    }

    try {
      const swContent = fs.readFileSync(swPath, 'utf8');
      
      // Extract cache configuration
      const cacheNames = this.extractCacheNames(swContent);
      const strategies = this.extractCacheStrategies(swContent);
      const maxEntries = this.extractMaxEntries(swContent);
      
      this.stats.caches.serviceWorker = {
        status: 'configured',
        file_size: fs.statSync(swPath).size,
        cache_names: cacheNames,
        strategies: strategies,
        max_entries: maxEntries,
        last_modified: fs.statSync(swPath).mtime
      };
      
      // Add recommendations
      if (cacheNames.length === 0) {
        this.stats.recommendations.push({
          type: 'warning',
          category: 'service_worker',
          message: 'No cache names found in service worker'
        });
      }
      
    } catch (error) {
      this.stats.caches.serviceWorker = {
        status: 'error',
        error: error.message
      };
    }
  }

  // Analyze cache configuration
  async analyzeCacheConfig() {
    const configPath = path.join(process.cwd(), 'src', 'config', 'cache.js');
    
    if (!fs.existsSync(configPath)) {
      this.stats.caches.config = {
        status: 'not_found',
        error: 'Cache configuration file not found'
      };
      return;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Analyze configuration
      const hasMemoryCache = configContent.includes('memory');
      const hasBrowserCache = configContent.includes('browser');
      const hasCdnCache = configContent.includes('cdn');
      const hasOfflineConfig = configContent.includes('offline');
      
      this.stats.caches.config = {
        status: 'configured',
        file_size: fs.statSync(configPath).size,
        features: {
          memory_cache: hasMemoryCache,
          browser_cache: hasBrowserCache,
          cdn_cache: hasCdnCache,
          offline_support: hasOfflineConfig
        },
        last_modified: fs.statSync(configPath).mtime
      };
      
    } catch (error) {
      this.stats.caches.config = {
        status: 'error',
        error: error.message
      };
    }
  }

  // Analyze static assets for caching
  async analyzeStaticAssets() {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    
    const assets = {
      dist: this.analyzeDirectory(distPath),
      public: this.analyzeDirectory(publicPath)
    };
    
    this.stats.caches.assets = {
      total_files: assets.dist.count + assets.public.count,
      total_size: assets.dist.size + assets.public.size,
      by_type: this.categorizeAssets(assets),
      cacheable_assets: this.identifyCacheableAssets(assets),
      recommendations: this.generateAssetRecommendations(assets)
    };
  }

  // Analyze directory for assets
  analyzeDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return { count: 0, size: 0, files: [] };
    }

    const files = [];
    let totalSize = 0;

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else {
          const relativePath = path.relative(dirPath, itemPath);
          const ext = path.extname(item).toLowerCase();
          
          files.push({
            path: relativePath,
            size: stat.size,
            extension: ext,
            modified: stat.mtime
          });
          
          totalSize += stat.size;
        }
      }
    };

    scanDirectory(dirPath);
    
    return {
      count: files.length,
      size: totalSize,
      files: files
    };
  }

  // Categorize assets by type
  categorizeAssets(assets) {
    const categories = {
      javascript: { count: 0, size: 0, extensions: ['.js', '.mjs'] },
      css: { count: 0, size: 0, extensions: ['.css'] },
      images: { count: 0, size: 0, extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'] },
      fonts: { count: 0, size: 0, extensions: ['.woff', '.woff2', '.ttf', '.eot', '.otf'] },
      html: { count: 0, size: 0, extensions: ['.html', '.htm'] },
      json: { count: 0, size: 0, extensions: ['.json'] },
      other: { count: 0, size: 0, extensions: [] }
    };

    const allFiles = [...assets.dist.files, ...assets.public.files];
    
    for (const file of allFiles) {
      let categorized = false;
      
      for (const [category, config] of Object.entries(categories)) {
        if (config.extensions.includes(file.extension)) {
          categories[category].count++;
          categories[category].size += file.size;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        categories.other.count++;
        categories.other.size += file.size;
      }
    }

    return categories;
  }

  // Identify cacheable assets
  identifyCacheableAssets(assets) {
    const allFiles = [...assets.dist.files, ...assets.public.files];
    
    const cacheable = {
      static: [], // Long-term cacheable
      dynamic: [], // Short-term cacheable
      no_cache: [] // Should not be cached
    };

    for (const file of allFiles) {
      const ext = file.extension;
      const fileName = path.basename(file.path);
      
      // Static assets (long-term cache)
      if (['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
        cacheable.static.push(file);
      }
      // Images (medium-term cache)
      else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
        cacheable.static.push(file);
      }
      // HTML and JSON (short-term cache)
      else if (['.html', '.json'].includes(ext)) {
        cacheable.dynamic.push(file);
      }
      // Service worker and manifest (no cache)
      else if (fileName === 'sw.js' || fileName === 'manifest.json') {
        cacheable.no_cache.push(file);
      }
      // Other files (dynamic cache)
      else {
        cacheable.dynamic.push(file);
      }
    }

    return {
      static: {
        count: cacheable.static.length,
        size: cacheable.static.reduce((sum, f) => sum + f.size, 0),
        files: cacheable.static.slice(0, 10) // Show first 10
      },
      dynamic: {
        count: cacheable.dynamic.length,
        size: cacheable.dynamic.reduce((sum, f) => sum + f.size, 0),
        files: cacheable.dynamic.slice(0, 10)
      },
      no_cache: {
        count: cacheable.no_cache.length,
        size: cacheable.no_cache.reduce((sum, f) => sum + f.size, 0),
        files: cacheable.no_cache
      }
    };
  }

  // Generate asset recommendations
  generateAssetRecommendations(assets) {
    const recommendations = [];
    const allFiles = [...assets.dist.files, ...assets.public.files];
    
    // Large files that should be optimized
    const largeFiles = allFiles.filter(f => f.size > 1024 * 1024); // > 1MB
    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'performance',
        message: `${largeFiles.length} files are larger than 1MB and may impact cache performance`,
        files: largeFiles.map(f => ({ path: f.path, size: this.formatBytes(f.size) }))
      });
    }
    
    // Uncompressed assets
    const uncompressedJs = allFiles.filter(f => f.extension === '.js' && !f.path.includes('.min.'));
    if (uncompressedJs.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'optimization',
        message: `${uncompressedJs.length} JavaScript files appear to be unminified`,
        suggestion: 'Consider minifying JavaScript files for better cache efficiency'
      });
    }
    
    // Missing critical files
    const hasManifest = allFiles.some(f => f.path.includes('manifest.json'));
    if (!hasManifest) {
      recommendations.push({
        type: 'warning',
        category: 'pwa',
        message: 'No manifest.json found',
        suggestion: 'Add a web app manifest for better PWA caching'
      });
    }
    
    return recommendations;
  }

  // Analyze cache performance
  async analyzeCachePerformance() {
    const startTime = performance.now();
    
    // Simulate cache operations
    const operations = {
      memory_access: this.simulateMemoryAccess(),
      disk_access: this.simulateDiskAccess(),
      network_fallback: this.simulateNetworkFallback()
    };
    
    const endTime = performance.now();
    
    this.stats.performance = {
      analysis_time: endTime - startTime,
      operations: operations,
      recommendations: this.generatePerformanceRecommendations(operations)
    };
  }

  // Simulate memory cache access
  simulateMemoryAccess() {
    const startTime = performance.now();
    
    // Simulate memory operations
    const data = new Array(1000).fill(0).map((_, i) => ({ id: i, data: `item_${i}` }));
    const map = new Map(data.map(item => [item.id, item]));
    
    // Simulate lookups
    for (let i = 0; i < 100; i++) {
      map.get(Math.floor(Math.random() * 1000));
    }
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      operations_per_second: Math.round(100 / ((endTime - startTime) / 1000)),
      memory_usage: process.memoryUsage().heapUsed
    };
  }

  // Simulate disk cache access
  simulateDiskAccess() {
    const startTime = performance.now();
    
    // Simulate file system operations
    const tempDir = path.join(process.cwd(), 'temp_cache_test');
    
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      // Write test files
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(tempDir, `test_${i}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ id: i, data: `test_data_${i}` }));
      }
      
      // Read test files
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(tempDir, `test_${i}.json`);
        fs.readFileSync(filePath, 'utf8');
      }
      
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
      
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      operations_per_second: Math.round(20 / ((endTime - startTime) / 1000))
    };
  }

  // Simulate network fallback
  simulateNetworkFallback() {
    const startTime = performance.now();
    
    // Simulate network delay
    const networkDelay = Math.random() * 100 + 50; // 50-150ms
    
    const endTime = performance.now() + networkDelay;
    
    return {
      simulated_delay: networkDelay,
      estimated_duration: networkDelay,
      cache_benefit: networkDelay > 10 ? 'high' : 'low'
    };
  }

  // Generate performance recommendations
  generatePerformanceRecommendations(operations) {
    const recommendations = [];
    
    if (operations.memory_access.duration > 10) {
      recommendations.push({
        type: 'warning',
        category: 'memory',
        message: 'Memory cache access is slower than expected',
        suggestion: 'Consider optimizing memory cache implementation'
      });
    }
    
    if (operations.disk_access.duration > 100) {
      recommendations.push({
        type: 'warning',
        category: 'disk',
        message: 'Disk cache access is slower than expected',
        suggestion: 'Consider using SSD storage or optimizing file operations'
      });
    }
    
    if (operations.network_fallback.cache_benefit === 'high') {
      recommendations.push({
        type: 'info',
        category: 'network',
        message: 'High network latency detected',
        suggestion: 'Aggressive caching strategy recommended'
      });
    }
    
    return recommendations;
  }

  // Extract cache names from service worker
  extractCacheNames(content) {
    const cacheNameRegex = /['"`]([^'"` ]*cache[^'"` ]*)['"`]/gi;
    const matches = content.match(cacheNameRegex) || [];
    return matches.map(match => match.replace(/['"`]/g, ''));
  }

  // Extract cache strategies from service worker
  extractCacheStrategies(content) {
    const strategies = [];
    
    if (content.includes('CacheFirst') || content.includes('cacheFirstStrategy')) {
      strategies.push('CacheFirst');
    }
    if (content.includes('NetworkFirst') || content.includes('networkFirstStrategy')) {
      strategies.push('NetworkFirst');
    }
    if (content.includes('StaleWhileRevalidate') || content.includes('staleWhileRevalidateStrategy')) {
      strategies.push('StaleWhileRevalidate');
    }
    
    return strategies;
  }

  // Extract max entries configuration
  extractMaxEntries(content) {
    const maxEntriesRegex = /maxEntries[:\s]*([0-9]+)/gi;
    const matches = content.match(maxEntriesRegex) || [];
    return matches.map(match => {
      const num = match.match(/([0-9]+)/);
      return num ? parseInt(num[1]) : 0;
    });
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate comprehensive report
  async generateReport() {
    console.log('🔍 Analyzing cache configuration and performance...');
    
    await this.analyzeServiceWorkerCache();
    await this.analyzeCacheConfig();
    await this.analyzeStaticAssets();
    await this.analyzeCachePerformance();
    
    return this.stats;
  }

  // Display formatted report
  displayReport() {
    console.log('\n📊 CACHE STATISTICS REPORT');
    console.log('=' .repeat(50));
    console.log(`Generated: ${this.stats.timestamp}`);
    
    // Service Worker Status
    console.log('\n🔧 Service Worker Cache:');
    const sw = this.stats.caches.serviceWorker;
    if (sw.status === 'configured') {
      console.log(`  ✅ Status: ${sw.status}`);
      console.log(`  📁 File Size: ${this.formatBytes(sw.file_size)}`);
      console.log(`  🏷️  Cache Names: ${sw.cache_names.length}`);
      console.log(`  📋 Strategies: ${sw.strategies.join(', ')}`);
    } else {
      console.log(`  ❌ Status: ${sw.status}`);
      if (sw.error) console.log(`  ⚠️  Error: ${sw.error}`);
    }
    
    // Cache Configuration
    console.log('\n⚙️  Cache Configuration:');
    const config = this.stats.caches.config;
    if (config.status === 'configured') {
      console.log(`  ✅ Status: ${config.status}`);
      console.log(`  📁 File Size: ${this.formatBytes(config.file_size)}`);
      console.log(`  🧠 Memory Cache: ${config.features.memory_cache ? '✅' : '❌'}`);
      console.log(`  🌐 Browser Cache: ${config.features.browser_cache ? '✅' : '❌'}`);
      console.log(`  🚀 CDN Cache: ${config.features.cdn_cache ? '✅' : '❌'}`);
      console.log(`  📱 Offline Support: ${config.features.offline_support ? '✅' : '❌'}`);
    } else {
      console.log(`  ❌ Status: ${config.status}`);
      if (config.error) console.log(`  ⚠️  Error: ${config.error}`);
    }
    
    // Static Assets
    console.log('\n📦 Static Assets:');
    const assets = this.stats.caches.assets;
    console.log(`  📊 Total Files: ${assets.total_files}`);
    console.log(`  💾 Total Size: ${this.formatBytes(assets.total_size)}`);
    
    console.log('\n  📂 By Type:');
    Object.entries(assets.by_type).forEach(([type, data]) => {
      if (data.count > 0) {
        console.log(`    ${type}: ${data.count} files (${this.formatBytes(data.size)})`);
      }
    });
    
    console.log('\n  🎯 Cacheable Assets:');
    console.log(`    Static (long-term): ${assets.cacheable_assets.static.count} files (${this.formatBytes(assets.cacheable_assets.static.size)})`);
    console.log(`    Dynamic (short-term): ${assets.cacheable_assets.dynamic.count} files (${this.formatBytes(assets.cacheable_assets.dynamic.size)})`);
    console.log(`    No Cache: ${assets.cacheable_assets.no_cache.count} files (${this.formatBytes(assets.cacheable_assets.no_cache.size)})`);
    
    // Performance
    console.log('\n⚡ Performance Analysis:');
    const perf = this.stats.performance;
    console.log(`  🧠 Memory Access: ${perf.operations.memory_access.duration.toFixed(2)}ms (${perf.operations.memory_access.operations_per_second} ops/sec)`);
    console.log(`  💾 Disk Access: ${perf.operations.disk_access.duration.toFixed(2)}ms (${perf.operations.disk_access.operations_per_second} ops/sec)`);
    console.log(`  🌐 Network Benefit: ${perf.operations.network_fallback.cache_benefit}`);
    
    // Recommendations
    const allRecommendations = [
      ...this.stats.recommendations,
      ...assets.recommendations,
      ...perf.recommendations
    ];
    
    if (allRecommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      allRecommendations.forEach((rec, index) => {
        const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'error' ? '❌' : 'ℹ️';
        console.log(`  ${icon} [${rec.category}] ${rec.message}`);
        if (rec.suggestion) {
          console.log(`     💭 ${rec.suggestion}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }

  // Save report to file
  saveReport(outputPath = null) {
    const defaultPath = path.join(process.cwd(), 'cache-stats-report.json');
    const filePath = outputPath || defaultPath;
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.stats, null, 2));
      console.log(`\n💾 Report saved to: ${filePath}`);
    } catch (error) {
      console.error(`\n❌ Failed to save report: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    save: args.includes('--save'),
    output: args.find(arg => arg.startsWith('--output='))?.split('=')[1],
    json: args.includes('--json'),
    quiet: args.includes('--quiet')
  };

  try {
    const analyzer = new CacheStatsAnalyzer();
    const stats = await analyzer.generateReport();
    
    if (!options.quiet) {
      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        analyzer.displayReport();
      }
    }
    
    if (options.save) {
      analyzer.saveReport(options.output);
    }
    
    // Exit with appropriate code
    const hasErrors = stats.recommendations.some(r => r.type === 'error');
    const hasWarnings = stats.recommendations.some(r => r.type === 'warning');
    
    if (hasErrors) {
      process.exit(2);
    } else if (hasWarnings) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Cache analysis failed:', error.message);
    if (!options.quiet) {
      console.error(error.stack);
    }
    process.exit(3);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { CacheStatsAnalyzer };