import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';

const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  requiredSubscriptions = [],
  fallbackPath = '/login',
  showLoading = true,
  requireEmailVerification = false
}) => {
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();
  const { 
    user, 
    userProfile, 
    isLoading, 
    isAuthenticated, 
    hasRole, 
    hasSubscription, 
    isEmailVerified 
  } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && userProfile) {
      // Check email verification if required
      if (requireEmailVerification && !isEmailVerified()) {
        setHasAccess(false);
        return;
      }

      // Check role requirements
      const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.some(role => hasRole(role));
      
      // Check subscription requirements
      const hasRequiredSubscription = requiredSubscriptions.length === 0 || requiredSubscriptions.some(sub => hasSubscription(sub));
      
      // Check if user account is active
      const isActiveUser = userProfile.active !== false;
      
      setHasAccess(hasRequiredRole && hasRequiredSubscription && isActiveUser);
    } else {
      setHasAccess(false);
    }
  }, [isAuthenticated, user, userProfile, requiredRoles, requiredSubscriptions, requireEmailVerification, hasRole, hasSubscription, isEmailVerified]);

  // Show loading spinner while checking authentication
  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" message="Checking authentication..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname, message: 'Please sign in to access this page.' }}
        replace 
      />
    );
  }

  // Show email verification required message
  if (requireEmailVerification && user && !user.emailVerified) {
    return (
      <EmailVerificationRequired 
        user={user} 
        onResendVerification={handleResendVerification}
      />
    );
  }

  // Show access denied if user doesn't have required permissions
  if (!hasAccess) {
    return (
      <AccessDenied 
        userRole={userProfile?.role}
        userSubscription={userProfile?.subscription}
        requiredRoles={requiredRoles}
        requiredSubscriptions={requiredSubscriptions}
        isActive={userProfile?.active}
      />
    );
  }

  // Render protected content
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );

  async function handleResendVerification() {
    try {
      await user.sendEmailVerification();
      // Show success message
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Show error message
    }
  }
};

// Email verification required component
const EmailVerificationRequired = ({ user, onResendVerification }) => {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage('');
    
    try {
      await onResendVerification();
      setResendMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      setResendMessage('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-yellow-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification Required
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please verify your email address to access this page.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            We sent a verification email to <strong>{user?.email}</strong>
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleResend}
            disabled={isResending}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          {resendMessage && (
            <div className={`text-sm text-center ${
              resendMessage.includes('sent') ? 'text-green-600' : 'text-red-600'
            }`}>
              {resendMessage}
            </div>
          )}
          
          <button
            onClick={() => authService.signOut()}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
};

// Access denied component
const AccessDenied = ({ 
  userRole, 
  userSubscription, 
  requiredRoles, 
  requiredSubscriptions,
  isActive 
}) => {
  const getAccessMessage = () => {
    if (isActive === false) {
      return 'Your account has been deactivated. Please contact support for assistance.';
    }
    
    if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
      return `This page requires ${requiredRoles.join(' or ')} access. Your current role: ${userRole}.`;
    }
    
    if (requiredSubscriptions.length > 0 && !requiredSubscriptions.includes(userSubscription)) {
      return `This feature requires a ${requiredSubscriptions.join(' or ')} subscription. Your current plan: ${userSubscription}.`;
    }
    
    return 'You do not have permission to access this page.';
  };

  const showUpgradeOption = requiredSubscriptions.length > 0 && 
                          !requiredSubscriptions.includes(userSubscription);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getAccessMessage()}
          </p>
        </div>
        
        <div className="space-y-4">
          {showUpgradeOption && (
            <button
              onClick={() => window.location.href = '/subscription'}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upgrade Subscription
            </button>
          )}
          
          <button
            onClick={() => window.history.back()}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go Back
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;

// Higher-order component for authentication
export const withAuth = (Component, options = {}) => {
  return (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
};