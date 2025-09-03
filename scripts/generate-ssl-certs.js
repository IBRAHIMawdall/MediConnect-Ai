#!/usr/bin/env node

/**
 * SSL Certificate Generation Script
 * Generates self-signed SSL certificates for local HTTPS development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CERTS_DIR = path.join(__dirname, '..', 'certs');
const KEY_FILE = path.join(CERTS_DIR, 'localhost-key.pem');
const CERT_FILE = path.join(CERTS_DIR, 'localhost.pem');

/**
 * Check if OpenSSL is available
 */
function checkOpenSSL() {
  try {
    execSync('openssl version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create certificates directory
 */
function createCertsDirectory() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
    console.log('✓ Created certificates directory');
  }
}

/**
 * Generate SSL certificates using OpenSSL
 */
function generateCertificates() {
  try {
    console.log('Generating SSL certificates...');
    
    // Generate private key
    execSync(`openssl genrsa -out "${KEY_FILE}" 2048`, { stdio: 'ignore' });
    console.log('✓ Generated private key');
    
    // Generate certificate
    const opensslCommand = [
      'openssl req -new -x509',
      `-key "${KEY_FILE}"`,
      `-out "${CERT_FILE}"`,
      '-days 365',
      '-subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"',
      '-addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"'
    ].join(' ');
    
    execSync(opensslCommand, { stdio: 'ignore' });
    console.log('✓ Generated SSL certificate');
    
    return true;
  } catch (error) {
    console.error('✗ Failed to generate certificates:', error.message);
    return false;
  }
}

/**
 * Generate certificates using mkcert (if available)
 */
function generateWithMkcert() {
  try {
    console.log('Generating SSL certificates with mkcert...');
    
    // Check if mkcert is installed
    execSync('mkcert -version', { stdio: 'ignore' });
    
    // Generate certificates
    execSync(`mkcert -key-file "${KEY_FILE}" -cert-file "${CERT_FILE}" localhost 127.0.0.1 ::1`, {
      cwd: CERTS_DIR,
      stdio: 'ignore'
    });
    
    console.log('✓ Generated SSL certificates with mkcert');
    return true;
  } catch (error) {
    console.log('mkcert not available, falling back to OpenSSL');
    return false;
  }
}

/**
 * Check if certificates already exist
 */
function certificatesExist() {
  return fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE);
}

/**
 * Main function
 */
function main() {
  console.log('🔒 SSL Certificate Generator for Local Development\n');
  
  // Check if certificates already exist
  if (certificatesExist()) {
    console.log('✓ SSL certificates already exist');
    console.log(`   Key: ${KEY_FILE}`);
    console.log(`   Cert: ${CERT_FILE}`);
    console.log('\n💡 To regenerate certificates, delete the existing files and run this script again.');
    return;
  }
  
  // Create certificates directory
  createCertsDirectory();
  
  // Try to generate certificates with mkcert first, then OpenSSL
  let success = false;
  
  if (generateWithMkcert()) {
    success = true;
  } else if (checkOpenSSL()) {
    success = generateCertificates();
  } else {
    console.error('✗ Neither mkcert nor OpenSSL is available');
    console.log('\n📋 Installation instructions:');
    console.log('   • mkcert: https://github.com/FiloSottile/mkcert#installation');
    console.log('   • OpenSSL: https://www.openssl.org/source/');
    process.exit(1);
  }
  
  if (success) {
    console.log('\n🎉 SSL certificates generated successfully!');
    console.log(`   Key: ${KEY_FILE}`);
    console.log(`   Cert: ${CERT_FILE}`);
    console.log('\n🚀 You can now run the development server with HTTPS enabled.');
    console.log('   npm run dev');
    console.log('\n⚠️  Note: You may need to accept the self-signed certificate in your browser.');
    
    if (process.platform === 'darwin') {
      console.log('\n💡 On macOS, you can install mkcert to avoid browser warnings:');
      console.log('   brew install mkcert');
      console.log('   mkcert -install');
    }
  } else {
    console.error('\n✗ Failed to generate SSL certificates');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  generateCertificates,
  certificatesExist,
  CERTS_DIR,
  KEY_FILE,
  CERT_FILE
};