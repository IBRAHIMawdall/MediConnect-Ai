import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { authMethods, onAuthStateChange, getCurrentUser, isAuthenticated as checkAuthenticated, getUserRole, hasRole as checkUserRole } from '../config/auth';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          setUser(firebaseUser);
          setIsAuthenticated(true);
          
          // Fetch user profile from Firestore
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              setUserProfile(userDoc.data());
            } else {
              // Create user profile if it doesn't exist
              const defaultProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                firstName: '',
                lastName: '',
                role: 'user',
                subscription: 'free',
                emailVerified: firebaseUser.emailVerified,
                subscribeNewsletter: false,
                preferences: {
                  theme: 'light',
                  language: 'en',
                  notifications: {
                    email: true,
                    push: false
                  }
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
              };
              
              await setDoc(doc(db, 'users', firebaseUser.uid), defaultProfile);
              setUserProfile(defaultProfile);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          // User is signed out
          setUser(null);
          setUserProfile(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, userData = {}) => {
    try {
      const result = await authMethods.signUpWithEmail(email, password, userData);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email, password, rememberMe = false) => {
    try {
      const result = await authMethods.signInWithEmail(email, password, rememberMe);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Social Authentication Methods
  const signInWithGoogle = async (useRedirect = false) => {
    try {
      return await authMethods.signInWithGoogle(useRedirect);
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithFacebook = async (useRedirect = false) => {
    try {
      return await authMethods.signInWithFacebook(useRedirect);
    } catch (error) {
      console.error('Facebook sign in error:', error);
      throw error;
    }
  };

  const signInWithTwitter = async (useRedirect = false) => {
    try {
      return await authMethods.signInWithTwitter(useRedirect);
    } catch (error) {
      console.error('Twitter sign in error:', error);
      throw error;
    }
  };

  const signInWithGithub = async (useRedirect = false) => {
    try {
      return await authMethods.signInWithGithub(useRedirect);
    } catch (error) {
      console.error('Github sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      return await authMethods.resetPassword(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (profileData) => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Update Firebase Auth profile
      const authUpdates = {};
      if (profileData.displayName !== undefined) {
        authUpdates.displayName = profileData.displayName;
      }
      
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(user, authUpdates);
      }

      // Update Firestore profile
      const firestoreUpdates = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', user.uid), firestoreUpdates);
      
      // Update local state
      setUserProfile(prev => ({ ...prev, ...firestoreUpdates }));
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      
      // Provide more user-friendly error messages
      if (error.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please sign out and sign in again before changing your password');
      }
      
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete user account from Firebase Auth
      await deleteUser(user);
      
      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please sign out and sign in again before deleting your account');
      }
      
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      await sendEmailVerification(user);
      return { success: true };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) {
      return null;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        setUserProfile(profileData);
        return profileData;
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
    
    return null;
  };

  const hasRole = (role) => {
    return userProfile?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(userProfile?.role);
  };

  const hasSubscription = (subscription) => {
    return userProfile?.subscription === subscription;
  };

  const isEmailVerified = () => {
    return user?.emailVerified || false;
  };

  const getUserDisplayName = () => {
    return userProfile?.displayName || user?.displayName || user?.email || 'User';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    if (displayName === 'User' || displayName.includes('@')) {
      return 'U';
    }
    
    const names = displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    
    return displayName[0].toUpperCase();
  };

  const value = {
    // State
    user,
    userProfile,
    isLoading,
    isAuthenticated,
    
    // Authentication methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    
    // Social authentication methods
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    signInWithGithub,
    
    // Profile management
    updateUserProfile,
    changePassword,
    deleteAccount,
    refreshUserProfile,
    
    // Email verification
    sendVerificationEmail,
    isEmailVerified,
    
    // Utility methods
    hasRole,
    hasAnyRole,
    hasSubscription,
    getUserDisplayName,
    getUserInitials,
    
    // Legacy compatibility
    loading: isLoading,
    login: signIn,
    logout: signOut,
    isOwner: userProfile?.role === 'admin' || userProfile?.role === 'owner'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;