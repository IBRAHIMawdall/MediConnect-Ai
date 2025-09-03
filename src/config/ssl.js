/**
 * SSL/TLS Configuration
 * Comprehensive SSL/TLS settings for production deployment
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SSL/TLS Configuration
export const SSLConfig = {
  // Certificate paths
  paths: {
    cert: process.env.SSL_CERT_PATH || path.join(__dirname, '../../certs/server.crt'),
    key: process.env.SSL_KEY_PATH || path.join(__dirname, '../../certs/server.key'),
    ca: process.env.SSL_CA_PATH || path.join(__dirname, '../../certs/ca.crt'),
    dhparam: process.env.SSL_DHPARAM_PATH || path.join(__dirname, '../../certs/dhparam.pem')
  },
  
  // SSL/TLS options for Node.js HTTPS server
  httpsOptions: {
    // Security protocols
    secureProtocol: 'TLSv1_2_method',
    secureOptions: (
      // Disable weak protocols
      require('constants').SSL_OP_NO_SSLv2 |
      require('constants').SSL_OP_NO_SSLv3 |
      require('constants').SSL_OP_NO_TLSv1 |
      require('constants').SSL_OP_NO_TLSv1_1 |
      // Disable compression to prevent CRIME attacks
      require('constants').SSL_OP_NO_COMPRESSION |
      // Use server cipher order
      require('constants').SSL_OP_CIPHER_SERVER_PREFERENCE
    ),
    
    // Cipher suites (strong ciphers only)
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA',
      'ECDHE-RSA-AES256-SHA',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA256',
      'AES256-SHA256',
      'AES128-SHA',
      'AES256-SHA',
      '!aNULL',
      '!eNULL',
      '!EXPORT',
      '!DES',
      '!RC4',
      '!MD5',
      '!PSK',
      '!SRP',
      '!CAMELLIA'
    ].join(':'),
    
    // Honor cipher order
    honorCipherOrder: true,
    
    // Session settings
    sessionIdContext: 'medical-info-app',
    sessionTimeout: 300, // 5 minutes
    
    // Request certificate from client (for mutual TLS if needed)
    requestCert: false,
    rejectUnauthorized: true,
    
    // Enable OCSP stapling
    enableOCSPStapling: true
  },
  
  // Certificate validation settings
  validation: {
    // Check certificate expiration
    checkExpiration: true,
    // Days before expiration to warn
    expirationWarningDays: 30,
    // Validate certificate chain
    validateChain: true,
    // Check certificate revocation
    checkRevocation: false // Set to true if OCSP/CRL checking is available
  },
  
  // HSTS (HTTP Strict Transport Security) settings
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  
  // Certificate transparency settings
  ct: {
    enforce: false, // Set to true in production with proper CT logs
    maxAge: 86400 // 24 hours
  }
};

// Load SSL certificates
export const loadSSLCertificates = () => {
  const certificates = {};
  
  try {
    // Load certificate files
    if (fs.existsSync(SSLConfig.paths.cert)) {
      certificates.cert = fs.readFileSync(SSLConfig.paths.cert, 'utf8');
    }
    
    if (fs.existsSync(SSLConfig.paths.key)) {
      certificates.key = fs.readFileSync(SSLConfig.paths.key, 'utf8');
    }
    
    if (fs.existsSync(SSLConfig.paths.ca)) {
      certificates.ca = fs.readFileSync(SSLConfig.paths.ca, 'utf8');
    }
    
    if (fs.existsSync(SSLConfig.paths.dhparam)) {
      certificates.dhparam = fs.readFileSync(SSLConfig.paths.dhparam, 'utf8');
    }
    
    // Validate required certificates
    if (!certificates.cert || !certificates.key) {
      throw new Error('SSL certificate or private key not found');
    }
    
    console.log('SSL certificates loaded successfully');
    return certificates;
    
  } catch (error) {
    console.error('Failed to load SSL certificates:', error.message);
    
    // In development, return null to allow HTTP
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode without SSL');
      return null;
    }
    
    throw error;
  }
};

// Create HTTPS server options
export const createHTTPSOptions = () => {
  const certificates = loadSSLCertificates();
  
  if (!certificates) {
    return null;
  }
  
  return {
    ...SSLConfig.httpsOptions,
    cert: certificates.cert,
    key: certificates.key,
    ca: certificates.ca,
    dhparam: certificates.dhparam
  };
};

// Validate SSL certificate
export const validateSSLCertificate = (certPath) => {
  try {
    if (!fs.existsSync(certPath)) {
      return { valid: false, error: 'Certificate file not found' };
    }
    
    const cert = fs.readFileSync(certPath, 'utf8');
    const crypto = require('crypto');
    
    // Parse certificate
    const x509 = new crypto.X509Certificate(cert);
    
    // Check expiration
    const now = new Date();
    const validFrom = new Date(x509.validFrom);
    const validTo = new Date(x509.validTo);
    
    if (now < validFrom) {
      return { valid: false, error: 'Certificate not yet valid' };
    }
    
    if (now > validTo) {
      return { valid: false, error: 'Certificate has expired' };
    }
    
    // Check if expiring soon
    const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
    const warningDays = SSLConfig.validation.expirationWarningDays;
    
    const result = {
      valid: true,
      subject: x509.subject,
      issuer: x509.issuer,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      daysUntilExpiry,
      fingerprint: x509.fingerprint,
      serialNumber: x509.serialNumber
    };
    
    if (daysUntilExpiry <= warningDays) {
      result.warning = `Certificate expires in ${daysUntilExpiry} days`;
    }
    
    return result;
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Generate self-signed certificate for development
export const generateSelfSignedCert = async (options = {}) => {
  const {
    commonName = 'localhost',
    organization = 'Medical Info App',
    country = 'US',
    validityDays = 365,
    keySize = 2048
  } = options;
  
  try {
    const { execSync } = require('child_process');
    const certsDir = path.dirname(SSLConfig.paths.cert);
    
    // Create certificates directory
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    
    // Generate private key
    execSync(`openssl genrsa -out "${SSLConfig.paths.key}" ${keySize}`, { stdio: 'inherit' });
    
    // Generate certificate
    const subject = `/C=${country}/O=${organization}/CN=${commonName}`;
    execSync(
      `openssl req -new -x509 -key "${SSLConfig.paths.key}" -out "${SSLConfig.paths.cert}" -days ${validityDays} -subj "${subject}"`,
      { stdio: 'inherit' }
    );
    
    // Generate DH parameters
    execSync(`openssl dhparam -out "${SSLConfig.paths.dhparam}" 2048`, { stdio: 'inherit' });
    
    console.log('Self-signed certificate generated successfully');
    return true;
    
  } catch (error) {
    console.error('Failed to generate self-signed certificate:', error.message);
    return false;
  }
};

// SSL health check
export const sslHealthCheck = () => {
  const results = {
    timestamp: new Date().toISOString(),
    certificates: {},
    overall: true
  };
  
  // Check each certificate
  const certFiles = {
    server: SSLConfig.paths.cert,
    ca: SSLConfig.paths.ca
  };
  
  for (const [name, path] of Object.entries(certFiles)) {
    if (fs.existsSync(path)) {
      results.certificates[name] = validateSSLCertificate(path);
      if (!results.certificates[name].valid) {
        results.overall = false;
      }
    } else {
      results.certificates[name] = { valid: false, error: 'File not found' };
      results.overall = false;
    }
  }
  
  return results;
};

// SSL middleware for Express
export const sslRedirectMiddleware = (req, res, next) => {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    const httpsUrl = `https://${req.get('Host')}${req.url}`;
    return res.redirect(301, httpsUrl);
  }
  
  // Add security headers
  res.set({
    'Strict-Transport-Security': `max-age=${SSLConfig.hsts.maxAge}; includeSubDomains${SSLConfig.hsts.preload ? '; preload' : ''}`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  next();
};

// Certificate monitoring
export const startCertificateMonitoring = (intervalHours = 24) => {
  const checkCertificates = () => {
    const healthCheck = sslHealthCheck();
    
    for (const [name, cert] of Object.entries(healthCheck.certificates)) {
      if (!cert.valid) {
        console.error(`SSL Certificate Error (${name}):`, cert.error);
      } else if (cert.warning) {
        console.warn(`SSL Certificate Warning (${name}):`, cert.warning);
      }
    }
  };
  
  // Initial check
  checkCertificates();
  
  // Schedule periodic checks
  const interval = intervalHours * 60 * 60 * 1000;
  return setInterval(checkCertificates, interval);
};

// Export utilities
export const SSLUtils = {
  loadSSLCertificates,
  createHTTPSOptions,
  validateSSLCertificate,
  generateSelfSignedCert,
  sslHealthCheck,
  startCertificateMonitoring
};

export default {
  SSLConfig,
  SSLUtils,
  loadSSLCertificates,
  createHTTPSOptions,
  validateSSLCertificate,
  generateSelfSignedCert,
  sslHealthCheck,
  sslRedirectMiddleware,
  startCertificateMonitoring
};