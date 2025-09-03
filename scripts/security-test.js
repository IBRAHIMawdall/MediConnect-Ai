#!/usr/bin/env node

/**
 * Security Testing Script
 * Validates security measures and configurations for production deployment
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { SecurityConfig } from '../src/config/security.js';
import { SSLConfig, validateSSLCertificate } from '../src/config/ssl.js';
import { SensitiveEnvVars, DebugPatterns } from '../src/config/production.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Test configuration
const testConfig = {
  // Security headers to check
  requiredHeaders: [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Strict-Transport-Security'
  ],
  
  // Files to scan for security issues
  scanPatterns: [
    'src/**/*.js',
    'src/**/*.jsx',
    'src/**/*.ts',
    'src/**/*.tsx',
    'public/**/*.html',
    'dist/**/*.js',
    'build/**/*.js'
  ],
  
  // Exclude patterns
  excludePatterns: [
    'node_modules/**',
    '.git/**',
    'coverage/**',
    '**/*.test.*',
    '**/*.spec.*'
  ],
  
  // Security vulnerabilities to check
  vulnerabilityPatterns: {
    hardcodedSecrets: [
      /(?:password|passwd|pwd)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
      /(?:secret|token|key)\s*[=:]\s*['"][^'"]{16,}['"]/gi,
      /(?:api[_-]?key)\s*[=:]\s*['"][^'"]{16,}['"]/gi,
      /(?:private[_-]?key)\s*[=:]\s*['"][^'"]{32,}['"]/gi
    ],
    
    dangerousFunctions: [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(\s*['"][^'"]*['"]/gi,
      /setInterval\s*\(\s*['"][^'"]*['"]/gi,
      /innerHTML\s*=/gi,
      /outerHTML\s*=/gi,
      /document\.write\s*\(/gi
    ],
    
    insecureProtocols: [
      /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
      /ftp:\/\//gi,
      /telnet:\/\//gi
    ],
    
    debugCode: DebugPatterns,
    
    sqlInjection: [
      /['"]\s*\+\s*[^'"]*\s*\+\s*['"]/gi,
      /\$\{[^}]*\}/gi
    ]
  }
};

// Security test results
class SecurityTestResults {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.critical = 0;
  }
  
  addTest(name, status, message, severity = 'info', details = null) {
    const test = {
      name,
      status, // 'pass', 'fail', 'warn'
      message,
      severity, // 'critical', 'high', 'medium', 'low', 'info'
      details,
      timestamp: new Date().toISOString()
    };
    
    this.tests.push(test);
    
    switch (status) {
      case 'pass':
        this.passed++;
        break;
      case 'fail':
        this.failed++;
        if (severity === 'critical') this.critical++;
        break;
      case 'warn':
        this.warnings++;
        break;
    }
    
    // Log to console
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${name}: ${message}`);
    
    if (details && (status === 'fail' || status === 'warn')) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }
  
  getSummary() {
    const total = this.tests.length;
    return {
      total,
      passed: this.passed,
      failed: this.failed,
      warnings: this.warnings,
      critical: this.critical,
      score: total > 0 ? Math.round((this.passed / total) * 100) : 0
    };
  }
  
  hasFailures() {
    return this.failed > 0;
  }
  
  hasCriticalIssues() {
    return this.critical > 0;
  }
}

// Security tester
class SecurityTester {
  constructor() {
    this.results = new SecurityTestResults();
  }
  
  async runAllTests() {
    console.log('🔒 Starting security tests...\n');
    
    // Test SSL/TLS configuration
    await this.testSSLConfiguration();
    
    // Test security headers
    await this.testSecurityHeaders();
    
    // Test environment variables
    await this.testEnvironmentVariables();
    
    // Scan for vulnerabilities
    await this.scanForVulnerabilities();
    
    // Test authentication configuration
    await this.testAuthenticationConfig();
    
    // Test CORS configuration
    await this.testCORSConfiguration();
    
    // Test file permissions
    await this.testFilePermissions();
    
    // Test dependency vulnerabilities
    await this.testDependencyVulnerabilities();
    
    return this.results;
  }
  
  async testSSLConfiguration() {
    console.log('\n📋 Testing SSL/TLS Configuration...');
    
    // Check if SSL certificates exist
    const certPath = SSLConfig.paths.cert;
    const keyPath = SSLConfig.paths.key;
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      this.results.addTest(
        'SSL Certificates',
        'pass',
        'SSL certificate files found'
      );
      
      // Validate certificate
      const certValidation = validateSSLCertificate(certPath);
      if (certValidation.valid) {
        this.results.addTest(
          'SSL Certificate Validity',
          'pass',
          `Certificate valid until ${certValidation.validTo}`
        );
        
        if (certValidation.warning) {
          this.results.addTest(
            'SSL Certificate Expiry',
            'warn',
            certValidation.warning,
            'medium'
          );
        }
      } else {
        this.results.addTest(
          'SSL Certificate Validity',
          'fail',
          certValidation.error,
          'high'
        );
      }
    } else {
      this.results.addTest(
        'SSL Certificates',
        'warn',
        'SSL certificates not found (development mode)',
        'low'
      );
    }
    
    // Check SSL configuration
    const sslConfig = SSLConfig.httpsOptions;
    if (sslConfig.secureProtocol && sslConfig.ciphers) {
      this.results.addTest(
        'SSL Configuration',
        'pass',
        'Secure SSL/TLS configuration found'
      );
    } else {
      this.results.addTest(
        'SSL Configuration',
        'fail',
        'Insecure or missing SSL/TLS configuration',
        'high'
      );
    }
  }
  
  async testSecurityHeaders() {
    console.log('\n📋 Testing Security Headers...');
    
    const headers = SecurityConfig.headers;
    
    // Check HSTS
    if (headers.hsts && headers.hsts.maxAge > 0) {
      this.results.addTest(
        'HSTS Configuration',
        'pass',
        `HSTS configured with max-age: ${headers.hsts.maxAge}`
      );
    } else {
      this.results.addTest(
        'HSTS Configuration',
        'fail',
        'HSTS not properly configured',
        'high'
      );
    }
    
    // Check CSP
    const csp = SecurityConfig.csp.production;
    if (csp && csp.defaultSrc) {
      this.results.addTest(
        'Content Security Policy',
        'pass',
        'CSP configuration found'
      );
      
      // Check for unsafe CSP directives
      const unsafeDirectives = [];
      Object.entries(csp).forEach(([directive, values]) => {
        if (Array.isArray(values) && values.some(v => v.includes('unsafe'))) {
          unsafeDirectives.push(directive);
        }
      });
      
      if (unsafeDirectives.length > 0) {
        this.results.addTest(
          'CSP Safety',
          'warn',
          `Unsafe CSP directives found: ${unsafeDirectives.join(', ')}`,
          'medium',
          unsafeDirectives
        );
      }
    } else {
      this.results.addTest(
        'Content Security Policy',
        'fail',
        'CSP not configured',
        'high'
      );
    }
  }
  
  async testEnvironmentVariables() {
    console.log('\n📋 Testing Environment Variables...');
    
    // Check for sensitive variables in production
    const exposedSecrets = [];
    SensitiveEnvVars.forEach(varName => {
      if (process.env[varName] && process.env[varName] !== '[REDACTED]') {
        exposedSecrets.push(varName);
      }
    });
    
    if (exposedSecrets.length === 0) {
      this.results.addTest(
        'Environment Variable Security',
        'pass',
        'No exposed sensitive environment variables'
      );
    } else {
      this.results.addTest(
        'Environment Variable Security',
        'fail',
        `Exposed sensitive variables: ${exposedSecrets.join(', ')}`,
        'critical',
        exposedSecrets
      );
    }
    
    // Check for required production variables
    const requiredVars = ['NODE_ENV'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      this.results.addTest(
        'Required Environment Variables',
        'pass',
        'All required environment variables present'
      );
    } else {
      this.results.addTest(
        'Required Environment Variables',
        'warn',
        `Missing variables: ${missingVars.join(', ')}`,
        'medium'
      );
    }
  }
  
  async scanForVulnerabilities() {
    console.log('\n📋 Scanning for Security Vulnerabilities...');
    
    const files = await glob(testConfig.scanPatterns, {
      cwd: projectRoot,
      ignore: testConfig.excludePatterns,
      absolute: true
    });
    
    let totalVulnerabilities = 0;
    const vulnerabilityDetails = {};
    
    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        const relativeFile = path.relative(projectRoot, file);
        
        // Check each vulnerability pattern
        Object.entries(testConfig.vulnerabilityPatterns).forEach(([type, patterns]) => {
          patterns.forEach((pattern, index) => {
            const matches = content.match(pattern);
            if (matches) {
              totalVulnerabilities += matches.length;
              
              if (!vulnerabilityDetails[type]) {
                vulnerabilityDetails[type] = [];
              }
              
              vulnerabilityDetails[type].push({
                file: relativeFile,
                matches: matches.length,
                examples: matches.slice(0, 3) // Show first 3 matches
              });
            }
          });
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    if (totalVulnerabilities === 0) {
      this.results.addTest(
        'Vulnerability Scan',
        'pass',
        `Scanned ${files.length} files, no vulnerabilities found`
      );
    } else {
      const severity = totalVulnerabilities > 10 ? 'critical' : totalVulnerabilities > 5 ? 'high' : 'medium';
      this.results.addTest(
        'Vulnerability Scan',
        'fail',
        `Found ${totalVulnerabilities} potential vulnerabilities`,
        severity,
        vulnerabilityDetails
      );
    }
  }
  
  async testAuthenticationConfig() {
    console.log('\n📋 Testing Authentication Configuration...');
    
    // Check if Firebase config exists
    const firebaseConfigPath = path.join(projectRoot, 'src', 'config', 'firebase.js');
    if (fs.existsSync(firebaseConfigPath)) {
      this.results.addTest(
        'Firebase Configuration',
        'pass',
        'Firebase configuration file found'
      );
      
      // Check for hardcoded credentials
      const content = await fs.promises.readFile(firebaseConfigPath, 'utf8');
      if (content.includes('process.env.')) {
        this.results.addTest(
          'Firebase Credentials',
          'pass',
          'Firebase credentials use environment variables'
        );
      } else {
        this.results.addTest(
          'Firebase Credentials',
          'fail',
          'Firebase credentials may be hardcoded',
          'critical'
        );
      }
    } else {
      this.results.addTest(
        'Firebase Configuration',
        'warn',
        'Firebase configuration not found',
        'medium'
      );
    }
  }
  
  async testCORSConfiguration() {
    console.log('\n📋 Testing CORS Configuration...');
    
    const corsConfig = SecurityConfig.cors;
    if (corsConfig && corsConfig.production) {
      this.results.addTest(
        'CORS Configuration',
        'pass',
        'CORS configuration found'
      );
      
      // Check for overly permissive CORS
      const prodCors = corsConfig.production;
      if (prodCors.origin === '*') {
        this.results.addTest(
          'CORS Security',
          'fail',
          'CORS allows all origins (*)',
          'high'
        );
      } else {
        this.results.addTest(
          'CORS Security',
          'pass',
          'CORS origin restrictions configured'
        );
      }
    } else {
      this.results.addTest(
        'CORS Configuration',
        'warn',
        'CORS configuration not found',
        'medium'
      );
    }
  }
  
  async testFilePermissions() {
    console.log('\n📋 Testing File Permissions...');
    
    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'firebase-adminsdk.json',
      'serviceAccountKey.json'
    ];
    
    let hasIssues = false;
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        try {
          const stats = await fs.promises.stat(filePath);
          const mode = stats.mode & parseInt('777', 8);
          
          // Check if file is readable by others
          if (mode & parseInt('044', 8)) {
            this.results.addTest(
              `File Permissions: ${file}`,
              'fail',
              `File ${file} is readable by others`,
              'high'
            );
            hasIssues = true;
          }
        } catch (error) {
          // Skip permission check on Windows or if file can't be accessed
        }
      }
    }
    
    if (!hasIssues) {
      this.results.addTest(
        'File Permissions',
        'pass',
        'No file permission issues found'
      );
    }
  }
  
  async testDependencyVulnerabilities() {
    console.log('\n📋 Testing Dependency Vulnerabilities...');
    
    try {
      const { execSync } = require('child_process');
      const auditResult = execSync('npm audit --json', { 
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
        const vulnCount = Object.keys(audit.vulnerabilities).length;
        const severity = vulnCount > 10 ? 'critical' : vulnCount > 5 ? 'high' : 'medium';
        
        this.results.addTest(
          'Dependency Vulnerabilities',
          'fail',
          `Found ${vulnCount} vulnerable dependencies`,
          severity,
          audit.vulnerabilities
        );
      } else {
        this.results.addTest(
          'Dependency Vulnerabilities',
          'pass',
          'No known vulnerabilities in dependencies'
        );
      }
    } catch (error) {
      this.results.addTest(
        'Dependency Vulnerabilities',
        'warn',
        'Could not run dependency audit',
        'low'
      );
    }
  }
}

// Generate security report
function generateReport(results) {
  const summary = results.getSummary();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔒 SECURITY TEST REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total Tests: ${summary.total}`);
  console.log(`   Passed: ${summary.passed} ✅`);
  console.log(`   Failed: ${summary.failed} ❌`);
  console.log(`   Warnings: ${summary.warnings} ⚠️`);
  console.log(`   Critical Issues: ${summary.critical} 🚨`);
  console.log(`   Security Score: ${summary.score}%`);
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  
  if (summary.critical > 0) {
    console.log('   🚨 CRITICAL: Address critical security issues immediately!');
  }
  
  if (summary.failed > 0) {
    console.log('   ❌ Fix failed security tests before production deployment');
  }
  
  if (summary.warnings > 0) {
    console.log('   ⚠️  Review and address security warnings');
  }
  
  if (summary.score < 80) {
    console.log('   📈 Improve security score to at least 80% before deployment');
  }
  
  if (summary.score >= 90) {
    console.log('   🎉 Excellent security posture!');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return summary;
}

// Main function
async function runSecurityTests() {
  try {
    const tester = new SecurityTester();
    const results = await tester.runAllTests();
    const summary = generateReport(results);
    
    // Save detailed report
    const reportPath = path.join(projectRoot, 'security-report.json');
    await fs.promises.writeFile(
      reportPath,
      JSON.stringify({ summary, tests: results.tests }, null, 2),
      'utf8'
    );
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    if (results.hasCriticalIssues()) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES FOUND - DEPLOYMENT BLOCKED');
      process.exit(2);
    } else if (results.hasFailures()) {
      console.log('\n❌ SECURITY TESTS FAILED - REVIEW REQUIRED');
      process.exit(1);
    } else {
      console.log('\n✅ ALL SECURITY TESTS PASSED');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Security testing failed:', error.message);
    process.exit(3);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests();
}

export { SecurityTester, SecurityTestResults, runSecurityTests };
export default runSecurityTests;