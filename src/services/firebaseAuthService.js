// Firebase Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  deleteUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  linkWithCredential,
  unlink,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirebaseError } from '../config/firebase.js';

// Authentication providers
const providers = {
  google: new GoogleAuthProvider(),
  facebook: new FacebookAuthProvider(),
  twitter: new TwitterAuthProvider(),
  github: new GithubAuthProvider(),
  microsoft: new OAuthProvider('microsoft.com'),
  apple: new OAuthProvider('apple.com')
};

// Configure providers
providers.google.addScope('email');
providers.google.addScope('profile');
providers.facebook.addScope('email');
providers.github.addScope('user:email');
providers.microsoft.addScope('mail.read');

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.initializeAuthListener();
  }

  // Initialize authentication state listener
  initializeAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        // Update user document in Firestore
        await this.updateUserDocument(user);
        
        // Log user activity
        await this.logUserActivity('sign_in');
      }
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  // Subscribe to authentication state changes
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Email/Password Authentication
  async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await this.logUserActivity('email_sign_in');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Email sign-in error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  async signUpWithEmail(email, password, displayName = '') {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(result.user);
      
      // Create user document
      await this.createUserDocument(result.user, { displayName });
      
      await this.logUserActivity('email_sign_up');
      
      return { 
        success: true, 
        user: result.user,
        message: 'Account created successfully. Please check your email for verification.'
      };
    } catch (error) {
      console.error('Email sign-up error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Social Authentication
  async signInWithProvider(providerName, useRedirect = false) {
    try {
      const provider = providers[providerName];
      if (!provider) {
        throw new Error(`Provider ${providerName} not supported`);
      }

      let result;
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        // Result will be handled by getRedirectResult
        return { success: true, redirect: true };
      } else {
        result = await signInWithPopup(auth, provider);
      }

      await this.logUserActivity(`${providerName}_sign_in`);
      return { success: true, user: result.user };
    } catch (error) {
      console.error(`${providerName} sign-in error:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Handle redirect result
  async handleRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        await this.logUserActivity('redirect_sign_in');
        return { success: true, user: result.user };
      }
      return { success: true, user: null };
    } catch (error) {
      console.error('Redirect result error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Sign out
  async signOut() {
    try {
      await this.logUserActivity('sign_out');
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign-out error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Password reset
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true, 
        message: 'Password reset email sent. Please check your inbox.' 
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Update user profile
  async updateUserProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      // Update Firebase Auth profile
      await updateProfile(this.currentUser, updates);
      
      // Update Firestore document
      await this.updateUserDocument(this.currentUser, updates);
      
      await this.logUserActivity('profile_update');
      
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Update password
  async updateUserPassword(currentPassword, newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        this.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(this.currentUser, credential);
      
      // Update password
      await updatePassword(this.currentUser, newPassword);
      
      await this.logUserActivity('password_update');
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Link account with provider
  async linkWithProvider(providerName) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      const provider = providers[providerName];
      if (!provider) {
        throw new Error(`Provider ${providerName} not supported`);
      }

      const result = await linkWithCredential(this.currentUser, provider);
      
      await this.logUserActivity(`link_${providerName}`);
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error(`Link ${providerName} error:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Unlink provider
  async unlinkProvider(providerId) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      const result = await unlink(this.currentUser, providerId);
      
      await this.logUserActivity(`unlink_${providerId}`);
      
      return { success: true, user: result };
    } catch (error) {
      console.error(`Unlink ${providerId} error:`, error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Delete user account
  async deleteAccount(password = null) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      // Re-authenticate if password provided
      if (password && this.currentUser.email) {
        const credential = EmailAuthProvider.credential(
          this.currentUser.email,
          password
        );
        await reauthenticateWithCredential(this.currentUser, credential);
      }

      const userId = this.currentUser.uid;
      
      // Delete user document from Firestore
      await this.deleteUserDocument(userId);
      
      // Delete Firebase Auth account
      await deleteUser(this.currentUser);
      
      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Account deletion error:', error);
      return { success: false, error: handleFirebaseError(error) };
    }
  }

  // Create user document in Firestore
  async createUserDocument(user, additionalData = {}) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || additionalData.displayName || '',
          photoURL: user.photoURL || '',
          emailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastSignIn: serverTimestamp(),
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en'
          },
          ...additionalData
        };
        
        await setDoc(userRef, userData);
      }
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  // Update user document in Firestore
  async updateUserDocument(user, additionalData = {}) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified,
        lastSignIn: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData
      };
      
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user document:', error);
    }
  }

  // Delete user document from Firestore
  async deleteUserDocument(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user document:', error);
    }
  }

  // Log user activity
  async logUserActivity(action) {
    try {
      if (!this.currentUser) return;
      
      const activityRef = doc(db, 'users', this.currentUser.uid, 'activity', Date.now().toString());
      await setDoc(activityRef, {
        action,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: null // Will be set by Cloud Functions
      });
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Get user token
  async getUserToken(forceRefresh = false) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }
      
      return await this.currentUser.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  // Get user claims
  async getUserClaims() {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }
      
      const tokenResult = await this.currentUser.getIdTokenResult();
      return tokenResult.claims;
    } catch (error) {
      console.error('Error getting user claims:', error);
      return {};
    }
  }
}

// Create and export singleton instance
const authService = new FirebaseAuthService();
export default authService;

// Export individual methods for convenience
export const {
  signInWithEmail,
  signUpWithEmail,
  signInWithProvider,
  signOut,
  resetPassword,
  updateUserProfile,
  updateUserPassword,
  linkWithProvider,
  unlinkProvider,
  deleteAccount,
  getCurrentUser,
  isAuthenticated,
  getUserToken,
  getUserClaims,
  onAuthStateChange
} = authService;