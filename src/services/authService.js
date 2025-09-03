import { auth, db } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { getRemoteConfig, getValue } from 'firebase/remote-config';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.authStateListeners = [];
    this.remoteConfig = null;
    this.initializeRemoteConfig();
    this.setupAuthStateListener();
  }

  async initializeRemoteConfig() {
    try {
      this.remoteConfig = getRemoteConfig();
      this.remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
    } catch (error) {
      console.error('Failed to initialize Remote Config:', error);
    }
  }

  setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.loadUserProfile(user.uid);
      } else {
        this.userProfile = null;
      }
      this.notifyAuthStateListeners(user);
    });
  }

  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(listener => listener !== callback);
    };
  }

  notifyAuthStateListeners(user) {
    this.authStateListeners.forEach(callback => {
      try {
        callback(user, this.userProfile);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  async signUp(email, password, userData = {}) {
    try {
      // Check if user registration is enabled
      if (this.remoteConfig) {
        const registrationEnabled = getValue(this.remoteConfig, 'enable_user_registration').asBoolean();
        if (!registrationEnabled) {
          throw new Error('User registration is currently disabled');
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile
      if (userData.displayName) {
        await updateProfile(user, {
          displayName: userData.displayName
        });
      }

      // Create user document in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: 'user',
        subscription: 'free',
        active: true,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            updates: true
          },
          privacy: {
            shareData: false,
            analytics: true
          }
        },
        profile: {
          avatar: '',
          bio: '',
          specialization: '',
          institution: '',
          location: ''
        }
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      this.userProfile = userProfile;

      return { user, userProfile };
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login
      await this.updateLastLogin(user.uid);

      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signOut() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  async updateUserProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const userRef = doc(db, 'users', this.currentUser.uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);
      
      // Update local profile
      this.userProfile = {
        ...this.userProfile,
        ...updates
      };

      return this.userProfile;
    } catch (error) {
      console.error('Update profile error:', error);
      throw this.handleAuthError(error);
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        this.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(this.currentUser, credential);

      // Update password
      await updatePassword(this.currentUser, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      throw this.handleAuthError(error);
    }
  }

  async deleteAccount(password) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        this.currentUser.email,
        password
      );
      await reauthenticateWithCredential(this.currentUser, credential);

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', this.currentUser.uid));

      // Delete user account
      await deleteUser(this.currentUser);

      this.currentUser = null;
      this.userProfile = null;
    } catch (error) {
      console.error('Delete account error:', error);
      throw this.handleAuthError(error);
    }
  }

  async loadUserProfile(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        this.userProfile = userDoc.data();
        return this.userProfile;
      } else {
        console.warn('User profile not found in Firestore');
        return null;
      }
    } catch (error) {
      console.error('Load user profile error:', error);
      return null;
    }
  }

  async updateLastLogin(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }

  async checkUserRole(requiredRoles = []) {
    if (!this.userProfile) {
      return false;
    }

    if (requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.includes(this.userProfile.role);
  }

  async checkSubscription(requiredSubscriptions = []) {
    if (!this.userProfile) {
      return false;
    }

    if (requiredSubscriptions.length === 0) {
      return true;
    }

    return requiredSubscriptions.includes(this.userProfile.subscription);
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserProfile() {
    return this.userProfile;
  }

  getUserId() {
    return this.currentUser?.uid || null;
  }

  getUserEmail() {
    return this.currentUser?.email || null;
  }

  getUserRole() {
    return this.userProfile?.role || 'user';
  }

  getUserSubscription() {
    return this.userProfile?.subscription || 'free';
  }

  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  isModerator() {
    return ['admin', 'moderator'].includes(this.getUserRole());
  }

  isPremiumUser() {
    return ['premium', 'enterprise'].includes(this.getUserSubscription());
  }

  handleAuthError(error) {
    const errorMessages = {
      'auth/user-not-found': 'No user found with this email address.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/requires-recent-login': 'Please sign in again to complete this action.'
    };

    const message = errorMessages[error.code] || error.message || 'An unexpected error occurred.';
    return new Error(message);
  }

  // Utility methods for rate limiting and feature flags
  async getRateLimit() {
    if (!this.remoteConfig) return 60;
    
    try {
      return getValue(this.remoteConfig, 'api_rate_limit_per_minute').asNumber();
    } catch {
      return 60;
    }
  }

  async getFeatureFlag(flagName) {
    if (!this.remoteConfig) return false;
    
    try {
      return getValue(this.remoteConfig, flagName).asBoolean();
    } catch {
      return false;
    }
  }

  async getConfigValue(key, defaultValue = '') {
    if (!this.remoteConfig) return defaultValue;
    
    try {
      return getValue(this.remoteConfig, key).asString() || defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;

// Export individual methods for convenience
export const {
  signUp,
  signIn,
  signOut,
  resetPassword,
  updateUserProfile,
  changePassword,
  deleteAccount,
  onAuthStateChanged,
  isAuthenticated,
  getCurrentUser,
  getUserProfile,
  getUserId,
  getUserEmail,
  getUserRole,
  getUserSubscription,
  isAdmin,
  isModerator,
  isPremiumUser,
  checkUserRole,
  checkSubscription,
  getRateLimit,
  getFeatureFlag,
  getConfigValue
} = authService;