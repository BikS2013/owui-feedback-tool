/**
 * Protected route component that requires authentication
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { isAuthenticated, loading, authStatus, error } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Show error if auth check failed
  if (error) {
    return (
      <div className="auth-loading">
        <div className="error-icon">⚠️</div>
        <p>Unable to connect to authentication service</p>
        <p className="error-detail">Please ensure the backend server is running on port 3001</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // If auth is disabled, allow access
  if (authStatus && !authStatus.enabled) {
    return <>{children}</>;
  }

  // If auth is required but user is not authenticated, redirect to login
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated or auth is not required
  return <>{children}</>;
};