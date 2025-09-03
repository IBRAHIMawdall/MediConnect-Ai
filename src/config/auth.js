/**
 * Firebase Authentication Configuration
 * Supports multiple authentication providers and user management
 */

import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  deleteUser,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';

import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Initialize Firebase Auth
export const auth = getAuth();

// Configure authentication providers
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

const twitterProvider = new TwitterAuthProvider();

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');

// Authentication methods
export const authMethods = {
  // Email/Password Authentication
  async signUpWithEmail(email, password, userData = {}) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile
      if (userData.displayName) {
        await updateProfile(user, {
          displayName: userData.displayName,
          photoURL: userData.photoURL || null
        });
      }
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create user document in Firestore
      await this.createUserDocument(user, userData);
      
      return { user, success: true };
    } catch (error) {
      console.error('Email signup error:', error);
      throw this.handleAuthError(error);
    }
  },

  async signInWithEmail(email, password, rememberMe = false) {
    try {
      // Set persistence based on remember me option
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login time
      await this.updateUserLastLogin(user.uid);
      
      return { user, success: true };
    } catch (error) {
      console.error('Email signin error:', error);
      throw this.handleAuthError(error);
    }
  },

  // Social Authentication
  async signInWithGoogle(useRedirect = false) {
    try {
      const result = useRedirect 
        ? await signInWithRedirect(auth, googleProvider)
        : await signInWithPopup(auth, googleProvider);
      
      if (result) {
        const user = result.user;
        await this.handleSocialSignIn(user, 'google');
        return { user, success: true };
      }
    } catch (error) {
      console.error('Google signin error:', error);
      throw this.handleAuthError(error);
    }
  },

  async signInWithFacebook(useRedirect = false) {
    try {
      const result = useRedirect 
        ? await signInWithRedirect(auth, facebookProvider)
        : await signInWithPopup(auth, facebookProvider);
      
      if (result) {
        const user = result.user;
        await this.handleSocialSignIn(user, 'facebook');
        return { user, success: true };
      }
    } catch (error) {
      console.error('Facebook signin error:', error);
      throw this.handleAuthError(error);
    }
  },

  async signInWithTwitter(useRedirect = false) {
    try {
      const result = useRedirect 
        ? await signInWithRedirect(auth, twitterProvider)
        : await signInWithPopup(auth, twitterProvider);
      
      if (result) {
        const user = result.user;
        await this.handleSocialSignIn(user, 'twitter');
        return { user, success: true };
      }
    } catch (error) {
      console.error('Twitter signin error:', error);
      throw this.handleAuthError(error);
    }
  },

  async signInWithGithub(useRedirect = false) {
    try {
      const result = useRedirect 
        ? await signInWithRedirect(auth, githubProvider)
        : await signInWithPopup(auth, githubProvider);
      
      if (result) {
        const user = result.user;
        await this.handleSocialSignIn(user, 'github');
        return { user, success: true };
      }
    } catch (error) {
      console.error('Github signin error:', error);
      throw this.handleAuthError(error);
    }
  },

  // User Management
  async signOutUser() {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Signout error:', error);
      throw this.handleAuthError(error);
    }
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  },

  async updateUserPassword(newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
      
      await updatePassword(user, newPassword);
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Password update error:', error);
      throw this.handleAuthError(error);
    }
  },

  async updateUserProfile(profileData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL
      });
      
      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updated_at: serverTimestamp()
      });
      
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Profile update error:', error);
      throw this.handleAuthError(error);
    }
  },

  async deleteUserAccount() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
      
      // Delete user document from Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        deleted: true,
        deleted_at: serverTimestamp()
      });
      
      // Delete Firebase Auth user
      await deleteUser(user);
      
      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw this.handleAuthError(error);
    }
  },

  // Helper Methods
  async createUserDocument(user, additionalData = {}) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || additionalData.displayName || '',
          photoURL: user.photoURL || additionalData.photoURL || '',
          emailVerified: user.emailVerified,
          role: 'user',
          active: true,
          preferences: {
            theme: 'light',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              reviews: true,
              updates: false
            }
          },
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          last_login: serverTimestamp(),
          ...additionalData
        };
        
        await setDoc(userRef, userData);
        console.log('User document created successfully');
      }
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  },

  async handleSocialSignIn(user, provider) {
    try {
      // Check if user document exists
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user document for social sign-in
        await this.createUserDocument(user, {
          provider,
          social_providers: [provider]
        });
      } else {
        // Update existing user with new provider
        const userData = userDoc.data();
        const socialProviders = userData.social_providers || [];
        
        if (!socialProviders.includes(provider)) {
          await updateDoc(userRef, {
            social_providers: [...socialProviders, provider],
            last_login: serverTimestamp()
          });
        } else {
          await this.updateUserLastLogin(user.uid);
        }
      }
    } catch (error) {
      console.error('Error handling social sign-in:', error);
      throw error;
    }
  },

  async updateUserLastLogin(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        last_login: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

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
      'auth/popup-closed-by-user': 'Sign-in popup was closed before completion.',
      'auth/cancelled-popup-request': 'Only one popup request is allowed at a time.',
      'auth/popup-blocked': 'Sign-in popup was blocked by the browser.',
      'auth/requires-recent-login': 'Please sign in again to complete this action.'
    };
    
    return {
      code: error.code,
      message: errorMessages[error.code] || error.message || 'An unexpected error occurred.',
      originalError: error
    };
  }
};

// Authentication state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Get user role from Firestore
export const getUserRole = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data().role : 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
};

// Check if user has specific role
export const hasRole = async (uid, requiredRole) => {
  const userRole = await getUserRole(uid);
  const roleHierarchy = ['user', 'moderator', 'admin'];
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  return userRoleIndex >= requiredRoleIndex;
};

export default authMethods;
