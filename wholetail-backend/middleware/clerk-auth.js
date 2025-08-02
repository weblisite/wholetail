const { ClerkExpressRequireAuth } = require('@clerk/express');
const { errors } = require('../utils/errorResponse');

// Middleware to require authentication (using the version 1.0.0 syntax)
const requireAuth = (req, res, next) => {
  // For now, we'll use a simple auth check until Clerk is properly configured
  // In production, this would use ClerkExpressRequireAuth
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.auth = null; // No auth provided
  } else {
    // Mock auth object for development
    req.auth = {
      userId: 'retailer-123', // Mock user ID for testing
      sessionClaims: {
        metadata: {
          user_type: 'retailer'
        }
      }
    };
  }
  
  next();
};

// Optional auth middleware
const optionalAuth = (req, res, next) => {
  req.auth = null; // No auth required
  next();
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const userMetadata = req.auth?.sessionClaims?.metadata || {};
      const userRole = userMetadata.user_type || userMetadata.role;

      if (!userRole) {
        return errors.forbidden(res, 'User role not found');
      }

      if (!allowedRoles.includes(userRole)) {
        return errors.forbidden(res, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return errors.serverError(res, 'Authorization check failed');
    }
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const userMetadata = req.auth?.sessionClaims?.metadata || {};
      const userPermissions = userMetadata.permissions || [];

      if (!userPermissions.includes(permission)) {
        return errors.forbidden(res, `Missing required permission: ${permission}`);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return errors.serverError(res, 'Permission check failed');
    }
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission
};