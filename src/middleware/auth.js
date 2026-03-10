import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { AppError } from './errorHandler.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    next(error);
  }
};

/**
 * Role-Based Access Control Middleware
 */
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Generate JWT Token
 */
export const generateToken = (userId, role = 'consumer', expiresIn = config.JWT_EXPIRY) => {
  return jwt.sign(
    { id: userId, role },
    config.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Verify JWT Token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    return null;
  }
};
