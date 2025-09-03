#!/usr/bin/env node

/**
 * Asset Optimization Script
 * Minifies and optimizes static assets for production builds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { AssetConfig, AssetOptimizer } from '../src/config/assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Asset optimization implementation
class AssetProcessor {
  constructor(config = AssetConfig) {
    this.config = config;
    this.optimizer = new AssetOptimizer(config);
    this.stats = {
      processed: 0,
      optimized: 0,
      errors: 0,
      totalSizeBefore: 0,
      totalSizeAfter: 0,
      savings: 0
    };
  }

  // Process all assets
  async processAssets(options = {}) {
    const {
      dryRun = false,
      verbose = false,
      skipImages = false,
      skipFonts = false
    } = options;

    console.log('🚀 Starting asset optimization...');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log('=' .repeat(50));

    try {
      // Process JavaScript/TypeScript files
      await this.processJavaScriptFiles(dryRun, verbose);

      // Process CSS files
      await this.processCSSFiles(dryRun, verbose);

      // Process images
      if (!skipImages) {
        await this.processImages(dryRun, verbose);
      }

      // Process fonts
      if (!skipFonts) {
        await this.processFonts(dryRun, verbose);
      }

      // Generate asset manifest
      await this.generateManifest(dryRun);

      // Generate performance report
      this.generateReport();

    } catch (error) {
      console.error('❌ Asset optimization failed:', error.message);
      throw error;
    }
  }

  // Process JavaScript/TypeScript files
  async processJavaScriptFiles(dryRun, verbose) {
    console.log('\n📦 Processing JavaScript/TypeScript files...');

    const jsFiles = await glob(this.config.patterns.javascript, {
      cwd: this.config.paths.src,
      absolute: true,
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
    });

    for (const file of jsFiles) {
      await this.processJavaScriptFile(file, dryRun, verbose);
    }
  }

  // Process individual JavaScript file
  async processJavaScriptFile(filePath, dryRun, verbose) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const originalSize = Buffer.byteLength(content, 'utf8');
      
      this.stats.totalSizeBefore += originalSize;
      this.stats.processed++;

      // Apply optimizations
      let optimizedContent = content;

      // Remove console.log statements in production
      if (this.config.optimization.javascript.compress.drop_console) {
        optimizedContent = this.removeConsoleStatements(optimizedContent);
      }

      // Remove debugger statements
      if (this.config.optimization.javascript.compress.drop_debugger) {
        optimizedContent = optimizedContent.replace(/debugger;?/g, '');
      }

      // Minify whitespace (basic)
      optimizedContent = this.minifyJavaScript(optimizedContent);

      const optimizedSize = Buffer.byteLength(optimizedContent, 'utf8');
      const savings = originalSize - optimizedSize;
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

      this.stats.totalSizeAfter += optimizedSize;
      this.stats.savings += savings;

      if (savings > 0) {
        this.stats.optimized++;
      }

      if (verbose || savings > 1000) {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`  ✅ ${relativePath}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savingsPercent}% saved)`);
      }

      // Write optimized file
      if (!dryRun && savings > 0) {
        await fs.promises.writeFile(filePath, optimizedContent, 'utf8');
      }

    } catch (error) {
      this.stats.errors++;
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Process CSS files
  async processCSSFiles(dryRun, verbose) {
    console.log('\n🎨 Processing CSS files...');

    const cssFiles = await glob(this.config.patterns.styles, {
      cwd: this.config.paths.src,
      absolute: true,
      ignore: ['**/node_modules/**']
    });

    for (const file of cssFiles) {
      await this.processCSSFile(file, dryRun, verbose);
    }
  }

  // Process individual CSS file
  async processCSSFile(filePath, dryRun, verbose) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const originalSize = Buffer.byteLength(content, 'utf8');
      
      this.stats.totalSizeBefore += originalSize;
      this.stats.processed++;

      // Apply CSS optimizations
      let optimizedContent = content;

      // Remove comments
      optimizedContent = optimizedContent.replace(/\/\*[\s\S]*?\*\//g, '');

      // Minify whitespace
      optimizedContent = this.minifyCSS(optimizedContent);

      // Remove unused CSS (basic implementation)
      optimizedContent = this.removeUnusedCSS(optimizedContent);

      const optimizedSize = Buffer.byteLength(optimizedContent, 'utf8');
      const savings = originalSize - optimizedSize;
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

      this.stats.totalSizeAfter += optimizedSize;
      this.stats.savings += savings;

      if (savings > 0) {
        this.stats.optimized++;
      }

      if (verbose || savings > 1000) {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`  ✅ ${relativePath}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savingsPercent}% saved)`);
      }

      // Write optimized file
      if (!dryRun && savings > 0) {
        await fs.promises.writeFile(filePath, optimizedContent, 'utf8');
      }

    } catch (error) {
      this.stats.errors++;
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Process images
  async processImages(dryRun, verbose) {
    console.log('\n🖼️  Processing images...');

    const imageFiles = await glob(this.config.patterns.images, {
      cwd: this.config.paths.assets,
      absolute: true,
      ignore: ['**/node_modules/**']
    });

    for (const file of imageFiles) {
      await this.processImage(file, dryRun, verbose);
    }
  }

  // Process individual image
  async processImage(filePath, dryRun, verbose) {
    try {
      const stats = await fs.promises.stat(filePath);
      const originalSize = stats.size;
      
      this.stats.totalSizeBefore += originalSize;
      this.stats.processed++;

      // For now, just track the image without actual optimization
      // In a real implementation, you would use libraries like:
      // - sharp for image processing
      // - imagemin for compression
      // - squoosh for web-based optimization
      
      const relativePath = path.relative(projectRoot, filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if image exceeds size budget
      const budget = this.config.budgets.assets.image;
      if (originalSize > budget) {
        console.log(`  ⚠️  ${relativePath}: ${this.formatBytes(originalSize)} exceeds budget (${this.formatBytes(budget)})`);
      } else if (verbose) {
        console.log(`  ✅ ${relativePath}: ${this.formatBytes(originalSize)}`);
      }

      // Generate responsive image variants (placeholder)
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const variants = this.optimizer.generateResponsiveImages(filePath);
        if (verbose) {
          console.log(`    📱 Generated ${variants.length} responsive variants`);
        }
      }

      this.stats.totalSizeAfter += originalSize; // No actual optimization yet

    } catch (error) {
      this.stats.errors++;
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Process fonts
  async processFonts(dryRun, verbose) {
    console.log('\n🔤 Processing fonts...');

    const fontFiles = await glob(this.config.patterns.fonts, {
      cwd: this.config.paths.assets,
      absolute: true,
      ignore: ['**/node_modules/**']
    });

    for (const file of fontFiles) {
      await this.processFont(file, dryRun, verbose);
    }
  }

  // Process individual font
  async processFont(filePath, dryRun, verbose) {
    try {
      const stats = await fs.promises.stat(filePath);
      const originalSize = stats.size;
      
      this.stats.totalSizeBefore += originalSize;
      this.stats.processed++;

      const relativePath = path.relative(projectRoot, filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if font exceeds size budget
      const budget = this.config.budgets.assets.font;
      if (originalSize > budget) {
        console.log(`  ⚠️  ${relativePath}: ${this.formatBytes(originalSize)} exceeds budget (${this.formatBytes(budget)})`);
      } else if (verbose) {
        console.log(`  ✅ ${relativePath}: ${this.formatBytes(originalSize)}`);
      }

      // Check font format recommendations
      if (ext === '.woff2') {
        if (verbose) console.log(`    ✅ Using recommended WOFF2 format`);
      } else if (ext === '.woff') {
        console.log(`    💡 Consider converting to WOFF2 for better compression`);
      } else {
        console.log(`    ⚠️  Consider using WOFF2 format for better performance`);
      }

      this.stats.totalSizeAfter += originalSize; // No actual optimization yet

    } catch (error) {
      this.stats.errors++;
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Generate asset manifest
  async generateManifest(dryRun) {
    console.log('\n📋 Generating asset manifest...');

    const manifestPath = path.join(this.config.paths.dist, 'asset-manifest.json');
    
    // Collect all processed assets
    const assets = [];
    
    // This would be populated during actual processing
    // For now, create a basic manifest structure
    const manifest = {
      version: Date.now(),
      buildTime: new Date().toISOString(),
      optimization: {
        enabled: true,
        stats: this.stats
      },
      performance: {
        budgets: this.config.budgets,
        metrics: {
          totalFiles: this.stats.processed,
          optimizedFiles: this.stats.optimized,
          totalSavings: this.stats.savings,
          compressionRatio: this.stats.totalSizeBefore > 0 
            ? ((this.stats.savings / this.stats.totalSizeBefore) * 100).toFixed(2)
            : 0
        }
      }
    };

    if (!dryRun) {
      // Ensure dist directory exists
      await fs.promises.mkdir(this.config.paths.dist, { recursive: true });
      
      await fs.promises.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2),
        'utf8'
      );
      
      console.log(`  ✅ Manifest saved to: ${path.relative(projectRoot, manifestPath)}`);
    } else {
      console.log(`  📄 Manifest would be saved to: ${path.relative(projectRoot, manifestPath)}`);
    }
  }

  // Generate optimization report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ASSET OPTIMIZATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Files Processed: ${this.stats.processed}`);
    console.log(`   Files Optimized: ${this.stats.optimized}`);
    console.log(`   Errors: ${this.stats.errors}`);
    
    console.log(`\n💾 Size Reduction:`);
    console.log(`   Before: ${this.formatBytes(this.stats.totalSizeBefore)}`);
    console.log(`   After:  ${this.formatBytes(this.stats.totalSizeAfter)}`);
    console.log(`   Saved:  ${this.formatBytes(this.stats.savings)} (${this.getCompressionRatio()}%)`);
    
    console.log(`\n🎯 Performance:`);
    const compressionRatio = this.getCompressionRatio();
    if (compressionRatio > 20) {
      console.log(`   ✅ Excellent compression ratio: ${compressionRatio}%`);
    } else if (compressionRatio > 10) {
      console.log(`   ✅ Good compression ratio: ${compressionRatio}%`);
    } else if (compressionRatio > 5) {
      console.log(`   ⚠️  Moderate compression ratio: ${compressionRatio}%`);
    } else {
      console.log(`   ❌ Low compression ratio: ${compressionRatio}%`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  // Utility methods
  removeConsoleStatements(content) {
    // Remove console.log, console.info, console.debug
    return content
      .replace(/console\.(log|info|debug)\s*\([^)]*\);?/g, '')
      .replace(/console\.(log|info|debug)\s*\([^)]*\)\s*;?/g, '');
  }

  minifyJavaScript(content) {
    // Basic JavaScript minification
    return content
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around operators
      .replace(/\s*([{}();,])\s*/g, '$1')
      .trim();
  }

  minifyCSS(content) {
    // Basic CSS minification
    return content
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around CSS syntax
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      // Remove trailing semicolons
      .replace(/;}/g, '}')
      .trim();
  }

  removeUnusedCSS(content) {
    // Basic unused CSS removal (placeholder)
    // In a real implementation, you would analyze the HTML/JS files
    // to determine which CSS rules are actually used
    return content;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getCompressionRatio() {
    if (this.stats.totalSizeBefore === 0) return 0;
    return ((this.stats.savings / this.stats.totalSizeBefore) * 100).toFixed(1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipImages: args.includes('--skip-images'),
    skipFonts: args.includes('--skip-fonts')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Asset Optimization Script

Usage: node optimize-assets.js [options]

Options:
  --dry-run        Run without making changes
  --verbose, -v    Show detailed output
  --skip-images    Skip image optimization
  --skip-fonts     Skip font optimization
  --help, -h       Show this help message
`);
    process.exit(0);
  }

  try {
    const processor = new AssetProcessor();
    await processor.processAssets(options);
    
    console.log('\n✅ Asset optimization completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Asset optimization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AssetProcessor };
export default main;