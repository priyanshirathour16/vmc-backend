import express from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  registerUser,
  loginUser,
  adminLogin,
  logoutUser,
  refreshAccessToken,
  getUserProfile
} from '../services/authService.js';

const router = express.Router();

/**
 * @POST /api/auth/register
 * Register a new user (consumer or business owner)
 * Body: { email, password (min 8 chars), name, role? (consumer|business_owner) }
 */
router.post('/register', asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: result
  });
}));

/**
 * @POST /api/auth/login
 * User login (consumer or business owner)
 * Body: { email, password }
 */
router.post('/login', asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);

  res.json({
    status: 'success',
    message: 'Login successful',
    data: result
  });
}));

/**
 * @POST /api/auth/admin/login
 * Admin login
 * Body: { email, password }
 * Returns: user (with admin permissions) and tokens (24h access, 30d refresh)
 */
router.post('/admin/login', asyncHandler(async (req, res) => {
  const result = await adminLogin(req.body);

  res.json({
    status: 'success',
    message: 'Admin login successful',
    data: result
  });
}));

/**
 * @POST /api/auth/logout
 * User logout (requires authentication)
 * Blacklists the refresh token
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  await logoutUser(req.userId, refreshToken);

  res.json({
    status: 'success',
    message: 'Logout successful'
  });
}));

/**
 * @POST /api/auth/refresh
 * Refresh access token using refresh token
 * Body: { refreshToken }
 * NOTE: Does NOT require access token verification (access token may be expired)
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  const result = await refreshAccessToken(null, null, refreshToken);

  res.json({
    status: 'success',
    message: 'Access token refreshed',
    data: result
  });
}));

/**
 * @GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await getUserProfile(req.userId, req.userRole);

  res.json({
    status: 'success',
    message: 'User profile retrieved',
    data: user
  });
}));

export default router;
