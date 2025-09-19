import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Service/Context';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log('ProtectedRoute Debug:', {
    isAuthenticated,
    loading,
    user,
    requiredRole,
    currentPath: location.pathname
  });

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('ProtectedRoute: Still loading...');
    return (
      <div className="empty-state">
        <div className="empty-state-card">
          <div className="spinner-border mx-auto mb-4"></div>
          <h3 className="empty-state-title">Loading...</h3>
          <p className="empty-state-description">
            Please wait while we load your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is required and user doesn't have it, redirect to unauthorized page
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('ProtectedRoute: User does not have required role:', requiredRole);
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and has required role (if any)
  console.log('ProtectedRoute: User authenticated, rendering children');
  return children;
};

export default ProtectedRoute; 