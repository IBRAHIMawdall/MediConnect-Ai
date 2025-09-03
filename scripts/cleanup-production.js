#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Removes debug code, sensitive information, and development artifacts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import {
  DebugPatterns,
  TestPatterns,
  SensitiveEnvVars,
  removeDebugCode,
  sanitizeLogMessage
} from '../src/config/production.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const config = {
  // Directories to clean
  cleanDirs: [
    'dist',
    'build',
    'public'
  ],
  
  // File patterns to process
  filePatterns: [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.html',
    '**/*.css',
    '**/*.json'
  ],
  
  // Files to exclude from processing
  excludePatterns: [
    'node_modules/**',
    '.git/**',
    'coverage/**',
    '**/*.min.js',
    '**/*.min.css',
    '**/vendor/**',
    '**/third-party/**'
  ],
  
  // Backup directory
  backupDir: path.join(projectRoot, '.cleanup-backup'),
  
  // Log file
  logFile: path.join(projectRoot, 'cleanup.log')
};

// Logger
class CleanupLogger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logs = [];
  }
  
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  
  info(message, data) {
    this.log('info', message, data);
  }
  
  warn(message, data) {
    this.log('warn', message, data);
  }
  
  error(message, data) {
    this.log('error', message, data);
  }
  
  success(message, data) {
    this.log('success', message, data);
  }
  
  async save() {
    try {
      const logContent = this.logs.map(log => 
        `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
      ).join('\n');
      
      await fs.promises.writeFile(this.logFile, logContent, 'utf8');
      console.log(`Cleanup log saved to: ${this.logFile}`);
    } catch (error) {
      console.error('Failed to save cleanup log:', error.message);
    }
  }
}

// File processor
class FileProcessor {
  constructor(logger) {
    this.logger = logger;
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      debugLinesRemoved: 0,
      testCodeRemoved: 0,
      sensitiveDataSanitized: 0,
      bytesRemoved: 0
    };
  }
  
  async processFile(filePath) {
    try {
      const originalContent = await fs.promises.readFile(filePath, 'utf8');
      const originalSize = originalContent.length;
      let modifiedContent = originalContent;
      let isModified = false;
      
      this.stats.filesProcessed++;
      
      // Remove debug code
      const debugCleaned = this.removeDebugCode(modifiedContent);
      if (debugCleaned !== modifiedContent) {
        modifiedContent = debugCleaned;
        isModified = true;
        this.stats.debugLinesRemoved++;
      }
      
      // Remove test code
      const testCleaned = this.removeTestCode(modifiedContent);
      if (testCleaned !== modifiedContent) {
        modifiedContent = testCleaned;
        isModified = true;
        this.stats.testCodeRemoved++;
      }
      
      // Sanitize sensitive data
      const sanitized = this.sanitizeSensitiveData(modifiedContent, filePath);
      if (sanitized !== modifiedContent) {
        modifiedContent = sanitized;
        isModified = true;
        this.stats.sensitiveDataSanitized++;
      }
      
      // Remove comments in production files
      if (this.shouldRemoveComments(filePath)) {
        const commentsCleaned = this.removeComments(modifiedContent, filePath);
        if (commentsCleaned !== modifiedContent) {
          modifiedContent = commentsCleaned;
          isModified = true;
        }
      }
      
      // Minify whitespace
      const minified = this.minifyWhitespace(modifiedContent, filePath);
      if (minified !== modifiedContent) {
        modifiedContent = minified;
        isModified = true;
      }
      
      if (isModified) {
        await fs.promises.writeFile(filePath, modifiedContent, 'utf8');
        this.stats.filesModified++;
        this.stats.bytesRemoved += originalSize - modifiedContent.length;
        
        this.logger.info(`Processed: ${filePath}`, {
          originalSize,
          newSize: modifiedContent.length,
          bytesRemoved: originalSize - modifiedContent.length
        });
      }
      
    } catch (error) {
      this.logger.error(`Failed to process file: ${filePath}`, error.message);
    }
  }
  
  removeDebugCode(content) {
    let cleaned = content;
    
    // Remove debug patterns
    DebugPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove development-specific imports
    cleaned = cleaned.replace(/import.*['"](react-hot-loader|@hot-loader).*['"]/g, '');
    cleaned = cleaned.replace(/import.*['"](redux-devtools|@redux-devtools).*['"]/g, '');
    
    return cleaned;
  }
  
  removeTestCode(content) {
    let cleaned = content;
    
    // Remove test patterns
    TestPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove test imports
    cleaned = cleaned.replace(/import.*['"](jest|enzyme|@testing-library).*['"]/g, '');
    
    return cleaned;
  }
  
  sanitizeSensitiveData(content, filePath) {
    let sanitized = content;
    
    // Sanitize environment variables
    SensitiveEnvVars.forEach(varName => {
      const pattern = new RegExp(`process\.env\.${varName}`, 'g');
      sanitized = sanitized.replace(pattern, '"[REDACTED]"');
    });
    
    // Remove API keys and tokens
    sanitized = sanitized.replace(/['"][a-zA-Z0-9]{32,}['"]/g, '"[REDACTED]"');
    
    // Remove email addresses
    sanitized = sanitized.replace(/['"][A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}['"]/g, '"[EMAIL]"');
    
    // Remove URLs with sensitive paths
    sanitized = sanitized.replace(/https?:\/\/[^\s'"]+\/(admin|api\/v\d+\/admin|dashboard)/g, '[REDACTED_URL]');
    
    return sanitized;
  }
  
  shouldRemoveComments(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext);
  }
  
  removeComments(content, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // Remove single-line comments (but keep copyright notices)
      content = content.replace(/\/\/(?!.*@license|.*@copyright).*$/gm, '');
      
      // Remove multi-line comments (but keep copyright notices)
      content = content.replace(/\/\*(?![\s\S]*@license|[\s\S]*@copyright)[\s\S]*?\*\//g, '');
    } else if (ext === '.css') {
      // Remove CSS comments
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    
    return content;
  }
  
  minifyWhitespace(content, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      // Remove extra whitespace but preserve necessary spacing
      content = content.replace(/\n\s*\n/g, '\n'); // Remove empty lines
      content = content.replace(/^\s+/gm, ''); // Remove leading whitespace
      content = content.replace(/\s+$/gm, ''); // Remove trailing whitespace
    } else if (ext === '.css') {
      // Minify CSS
      content = content.replace(/\s+/g, ' '); // Replace multiple spaces with single space
      content = content.replace(/;\s*}/g, '}'); // Remove semicolon before closing brace
      content = content.replace(/\s*{\s*/g, '{'); // Remove spaces around opening brace
      content = content.replace(/;\s*/g, ';'); // Remove spaces after semicolon
    }
    
    return content;
  }
}

// Backup manager
class BackupManager {
  constructor(backupDir, logger) {
    this.backupDir = backupDir;
    this.logger = logger;
  }
  
  async createBackup(sourceDir) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
      
      await fs.promises.mkdir(backupPath, { recursive: true });
      
      // Copy files to backup
      await this.copyDirectory(sourceDir, backupPath);
      
      this.logger.success(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error('Failed to create backup', error.message);
      throw error;
    }
  }
  
  async copyDirectory(source, destination) {
    const entries = await fs.promises.readdir(source, { withFileTypes: true });
    
    await fs.promises.mkdir(destination, { recursive: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  }
}

// Main cleanup function
async function cleanup(options = {}) {
  const {
    createBackup = true,
    dryRun = false,
    targetDirs = config.cleanDirs
  } = options;
  
  const logger = new CleanupLogger(config.logFile);
  const processor = new FileProcessor(logger);
  const backupManager = new BackupManager(config.backupDir, logger);
  
  logger.info('Starting production cleanup...');
  
  try {
    // Create backup if requested
    if (createBackup && !dryRun) {
      for (const dir of targetDirs) {
        const dirPath = path.join(projectRoot, dir);
        if (fs.existsSync(dirPath)) {
          await backupManager.createBackup(dirPath);
        }
      }
    }
    
    // Process files in target directories
    for (const dir of targetDirs) {
      const dirPath = path.join(projectRoot, dir);
      
      if (!fs.existsSync(dirPath)) {
        logger.warn(`Directory not found: ${dirPath}`);
        continue;
      }
      
      logger.info(`Processing directory: ${dirPath}`);
      
      // Find files to process
      const files = await glob(config.filePatterns, {
        cwd: dirPath,
        ignore: config.excludePatterns,
        absolute: true
      });
      
      logger.info(`Found ${files.length} files to process`);
      
      // Process each file
      for (const file of files) {
        if (!dryRun) {
          await processor.processFile(file);
        } else {
          logger.info(`[DRY RUN] Would process: ${file}`);
        }
      }
    }
    
    // Log statistics
    logger.success('Cleanup completed successfully', processor.stats);
    
    // Save log
    await logger.save();
    
    return processor.stats;
    
  } catch (error) {
    logger.error('Cleanup failed', error.message);
    await logger.save();
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    createBackup: !args.includes('--no-backup'),
    dryRun: args.includes('--dry-run'),
    targetDirs: args.includes('--dirs') ? 
      args[args.indexOf('--dirs') + 1]?.split(',') || config.cleanDirs :
      config.cleanDirs
  };
  
  cleanup(options)
    .then(stats => {
      console.log('\n=== Cleanup Summary ===');
      console.log(`Files processed: ${stats.filesProcessed}`);
      console.log(`Files modified: ${stats.filesModified}`);
      console.log(`Debug lines removed: ${stats.debugLinesRemoved}`);
      console.log(`Test code removed: ${stats.testCodeRemoved}`);
      console.log(`Sensitive data sanitized: ${stats.sensitiveDataSanitized}`);
      console.log(`Bytes removed: ${stats.bytesRemoved}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error.message);
      process.exit(1);
    });
}

export { cleanup, CleanupLogger, FileProcessor, BackupManager };
export default cleanup;