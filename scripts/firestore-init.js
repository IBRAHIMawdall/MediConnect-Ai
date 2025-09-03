/**
 * Firestore Database Initialization Script
 * Sets up initial collections, documents, and sample data
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : require('../config/firebase-service-account.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id'
  });
}

const db = admin.firestore();

// Sample data for initialization
const sampleData = {
  // Drug categories
  drugCategories: [
    { id: 'analgesics', name: 'Analgesics', description: 'Pain relief medications' },
    { id: 'antibiotics', name: 'Antibiotics', description: 'Antimicrobial medications' },
    { id: 'cardiovascular', name: 'Cardiovascular', description: 'Heart and blood vessel medications' },
    { id: 'respiratory', name: 'Respiratory', description: 'Breathing and lung medications' },
    { id: 'gastrointestinal', name: 'Gastrointestinal', description: 'Digestive system medications' },
    { id: 'neurological', name: 'Neurological', description: 'Nervous system medications' },
    { id: 'endocrine', name: 'Endocrine', description: 'Hormone-related medications' },
    { id: 'dermatological', name: 'Dermatological', description: 'Skin condition medications' }
  ],

  // Sample drugs
  drugs: [
    {
      id: 'acetaminophen',
      name: 'Acetaminophen',
      generic_name: 'Acetaminophen',
      brand_names: ['Tylenol', 'Panadol'],
      category: 'analgesics',
      description: 'Over-the-counter pain reliever and fever reducer',
      dosage_forms: ['tablet', 'capsule', 'liquid'],
      strength: ['325mg', '500mg', '650mg'],
      indications: ['Pain relief', 'Fever reduction'],
      contraindications: ['Severe liver disease'],
      side_effects: ['Nausea', 'Liver damage (overdose)'],
      interactions: ['Warfarin', 'Alcohol'],
      pregnancy_category: 'B',
      active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      id: 'amoxicillin',
      name: 'Amoxicillin',
      generic_name: 'Amoxicillin',
      brand_names: ['Amoxil', 'Trimox'],
      category: 'antibiotics',
      description: 'Penicillin antibiotic for bacterial infections',
      dosage_forms: ['capsule', 'tablet', 'suspension'],
      strength: ['250mg', '500mg', '875mg'],
      indications: ['Bacterial infections', 'Respiratory tract infections'],
      contraindications: ['Penicillin allergy'],
      side_effects: ['Diarrhea', 'Nausea', 'Rash'],
      interactions: ['Methotrexate', 'Oral contraceptives'],
      pregnancy_category: 'B',
      active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }
  ],

  // System configuration
  systemConfig: {
    app_version: '1.0.0',
    maintenance_mode: false,
    api_rate_limits: {
      search: 100,
      reviews: 10,
      bookmarks: 50
    },
    feature_flags: {
      drug_interactions: true,
      user_reviews: true,
      advanced_search: true,
      notifications: true
    },
    cache_duration: {
      drugs: 3600,
      categories: 7200,
      search_results: 1800
    }
  },

  // Medical specialties
  specialties: [
    { id: 'cardiology', name: 'Cardiology', category: 'medical' },
    { id: 'neurology', name: 'Neurology', category: 'medical' },
    { id: 'oncology', name: 'Oncology', category: 'medical' },
    { id: 'pediatrics', name: 'Pediatrics', category: 'medical' },
    { id: 'psychiatry', name: 'Psychiatry', category: 'medical' },
    { id: 'surgery', name: 'Surgery', category: 'surgical' },
    { id: 'emergency', name: 'Emergency Medicine', category: 'medical' },
    { id: 'family', name: 'Family Medicine', category: 'primary_care' }
  ]
};

/**
 * Initialize a collection with sample data
 */
async function initializeCollection(collectionName, data, useCustomId = true) {
  console.log(`Initializing ${collectionName} collection...`);
  
  const batch = db.batch();
  const collectionRef = db.collection(collectionName);
  
  for (const item of data) {
    const docRef = useCustomId && item.id 
      ? collectionRef.doc(item.id)
      : collectionRef.doc();
    
    // Remove id from data if it exists (since it's used as document ID)
    const { id, ...docData } = item;
    batch.set(docRef, docData);
  }
  
  await batch.commit();
  console.log(`✓ ${collectionName} collection initialized with ${data.length} documents`);
}

/**
 * Initialize system configuration
 */
async function initializeSystemConfig() {
  console.log('Initializing system configuration...');
  
  const systemRef = db.collection('system').doc('config');
  await systemRef.set({
    ...sampleData.systemConfig,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✓ System configuration initialized');
}

/**
 * Create security indexes and validate rules
 */
async function validateFirestoreSetup() {
  console.log('Validating Firestore setup...');
  
  try {
    // Test read access to collections
    const collections = ['drugs', 'drug_categories', 'specialties'];
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection).limit(1).get();
      console.log(`✓ ${collection} collection accessible`);
    }
    
    console.log('✓ Firestore setup validation completed');
  } catch (error) {
    console.error('✗ Firestore validation failed:', error.message);
    throw error;
  }
}

/**
 * Main initialization function
 */
async function initializeFirestore() {
  try {
    console.log('🚀 Starting Firestore initialization...');
    console.log('Project ID:', admin.app().options.projectId);
    
    // Initialize collections
    await initializeCollection('drug_categories', sampleData.drugCategories);
    await initializeCollection('drugs', sampleData.drugs);
    await initializeCollection('specialties', sampleData.specialties);
    
    // Initialize system configuration
    await initializeSystemConfig();
    
    // Validate setup
    await validateFirestoreSetup();
    
    console.log('\n🎉 Firestore initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Deploy Firestore security rules: firebase deploy --only firestore:rules');
    console.log('2. Deploy Firestore indexes: firebase deploy --only firestore:indexes');
    console.log('3. Test the setup with your application');
    
  } catch (error) {
    console.error('\n❌ Firestore initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Clean up existing data (use with caution)
 */
async function cleanupFirestore() {
  console.log('⚠️  Cleaning up existing Firestore data...');
  
  const collections = ['drugs', 'drug_categories', 'specialties', 'system'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!snapshot.empty) {
      await batch.commit();
      console.log(`✓ Cleaned up ${collectionName} collection`);
    }
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      initializeFirestore();
      break;
    case 'cleanup':
      cleanupFirestore().then(() => {
        console.log('✓ Cleanup completed');
        process.exit(0);
      });
      break;
    case 'reset':
      cleanupFirestore().then(() => {
        return initializeFirestore();
      });
      break;
    default:
      console.log('Usage:');
      console.log('  node firestore-init.js init     - Initialize Firestore with sample data');
      console.log('  node firestore-init.js cleanup  - Clean up existing data');
      console.log('  node firestore-init.js reset    - Clean up and reinitialize');
      process.exit(1);
  }
}

module.exports = {
  initializeFirestore,
  cleanupFirestore,
  initializeCollection,
  sampleData
};