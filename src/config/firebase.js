// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';

// Firebase configuration object
// Note: These are public configuration values, not secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with error handling
let db = null;
try {
  db = getFirestore(app);
} catch (error) {
  console.warn('Firestore not available - billing may not be enabled:', error);
  db = null;
}
export { db };

// Initialize Functions with error handling
let functions = null;
try {
  functions = getFunctions(app);
} catch (error) {
  console.warn('Firebase Functions not available - billing may not be enabled:', error);
  functions = null;
}
export { functions };

// Initialize Storage with error handling
let storage = null;
try {
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase Storage not available - billing may not be enabled:', error);
  storage = null;
}
export { storage };

// Initialize Analytics (only in production)
let analytics = null;
let performance = null;

if (typeof window !== 'undefined' && import.meta.env.PROD) {
  try {
    analytics = getAnalytics(app);
    performance = getPerformance(app);
  } catch (error) {
    console.warn('Analytics/Performance initialization failed:', error);
  }
}

export { analytics, performance };

// Connect to emulators in development
if (import.meta.env.DEV) {
  const EMULATOR_HOST = 'localhost';
  
  try {
    // Auth emulator
    if (!auth._delegate._config.emulator) {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, {
        disableWarnings: true
      });
    }
    
    // Firestore emulator
    if (!db._delegate._databaseId.projectId.includes('demo-')) {
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    }
    
    // Functions emulator
    if (!functions._delegate._url) {
      connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
    }
    
    // Storage emulator
    if (!storage._delegate._host.includes('localhost')) {
      connectStorageEmulator(storage, EMULATOR_HOST, 9199);
    }
    
    console.log('🔧 Connected to Firebase emulators');
  } catch (error) {
    console.warn('Emulator connection failed:', error);
  }
}

// Firebase configuration utilities
export const firebaseUtils = {
  // Check if Firebase is properly configured
  isConfigured: () => {
    return firebaseConfig.projectId !== 'demo-project' && 
           firebaseConfig.apiKey !== 'demo-api-key';
  },
  
  // Get current environment
  getEnvironment: () => {
    if (import.meta.env.DEV) return 'development';
    if (import.meta.env.PROD) return 'production';
    return 'unknown';
  },
  
  // Get project configuration
  getConfig: () => ({
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    environment: firebaseUtils.getEnvironment(),
    emulators: import.meta.env.DEV
  })
};

// Export the app instance
export default app;

// Firebase error handling utilities
export const handleFirebaseError = (error) => {
  console.error('Firebase Error:', error);
  
  // Common Firebase error codes and user-friendly messages
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters long.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'permission-denied': 'You do not have permission to perform this action.',
    'unavailable': 'Service is currently unavailable. Please try again later.',
    'deadline-exceeded': 'Request timed out. Please check your connection.',
    'resource-exhausted': 'Service quota exceeded. Please try again later.'
  };
  
  return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
};

// Firebase connection status
export const checkFirebaseConnection = async () => {
  try {
    if (!db) {
      return { connected: false, error: 'Firestore not initialized - billing may not be enabled' };
    }
    
    // Simple connectivity test using v9+ syntax
    const { doc, getDoc } = await import('firebase/firestore');
    const testDocRef = doc(db, '_health', 'test');
    const testDoc = await getDoc(testDocRef);
    return { connected: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.warn('Firebase connection test failed:', error);
    return { connected: false, error: error.message };
  }
};