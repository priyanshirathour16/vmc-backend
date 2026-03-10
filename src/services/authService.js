import bcrypt from 'bcryptjs';
import Joi from 'joi';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';
import config from '../config/env.js';

/**
 * Validation Schemas
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('consumer', 'business_owner').default('consumer')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Admin Create Consumer Schema
 * Used when admin creates a consumer account for a reviewer
 */
const adminCreateConsumerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(255).required(),
  password: Joi.string().min(8).optional(), // If not provided, will be auto-generated
  first_name: Joi.string().max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  avatar_url: Joi.string().uri().optional(),
  phone: Joi.string().pattern(/^[\d\s\-\+\(\)]{10,}$/).optional(),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  bio: Joi.string().max(500).optional(),
  location: Joi.string().max(255).optional(),
  country: Joi.string().max(100).optional(),
  language: Joi.string().length(2).default('en').optional(),
  timezone: Joi.string().optional(),
  notification_email: Joi.boolean().default(true).optional(),
  notification_push: Joi.boolean().default(false).optional(),
  notification_sms: Joi.boolean().default(false).optional(),
  marketing_emails: Joi.boolean().default(false).optional(),
  show_profile: Joi.boolean().default(true).optional()
});

/**
 * Register a new user
 * Creates user in users table and role-specific profile
 */
export const registerUser = async (userData) => {
  // Validate input
  const { value, error } = registerSchema.validate(userData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password, name, role } = value;

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert([
      {
        email,
        password_hash: passwordHash,
        name,
        role,
        is_active: true,
        verified_email: false
      }
    ])
    .select()
    .single();

  if (userError) {
    throw new AppError(userError.message, 400);
  }

  // Create role-specific profile
  if (role === 'consumer') {
    const { error: profileError } = await supabase
      .from('profile_consumer')
      .insert([
        {
          user_id: newUser.id,
          show_profile: true,
          notification_email: true
        }
      ]);

    if (profileError) {
      // Delete user if profile creation fails
      await supabase.from('users').delete().eq('id', newUser.id);
      throw new AppError('Failed to create user profile', 500);
    }
  } else if (role === 'business_owner') {
    const { error: profileError } = await supabase
      .from('profile_business_owner')
      .insert([
        {
          user_id: newUser.id,
          business_name: name,
          subscription_tier: 'free',
          subscription_status: 'active'
        }
      ]);

    if (profileError) {
      await supabase.from('users').delete().eq('id', newUser.id);
      throw new AppError('Failed to create business profile', 500);
    }
  }

  // Generate tokens
  const accessToken = generateToken(newUser.id, role);
  const refreshToken = generateToken(newUser.id, role, config.REFRESH_TOKEN_EXPIRY);

  // Return user data (no password)
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    },
    accessToken,
    refreshToken
  };
};

/**
 * Login user
 * Authenticates against users table and returns JWT tokens
 */
export const loginUser = async (loginData) => {
  // Validate input
  const { value, error } = loginSchema.validate(loginData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password } = value;

  // Find user by email
  const { data: user, error: queryError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (queryError || !user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is banned
  if (user.is_banned) {
    throw new AppError(`Account is banned: ${user.banned_reason || 'No reason provided'}`, 403);
  }

  // Check if user is active
  if (!user.is_active) {
    throw new AppError('Account is disabled', 403);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last login timestamp
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  // Generate tokens
  const accessToken = generateToken(user.id, user.role);
  const refreshToken = generateToken(user.id, user.role, config.REFRESH_TOKEN_EXPIRY);

  // Return user data (no password)
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      verified_email: user.verified_email
    },
    accessToken,
    refreshToken
  };
};

/**
 * Admin Login
 * Same as login but validates user has admin role
 */
export const adminLogin = async (loginData) => {
  // Validate input
  const { value, error } = adminLoginSchema.validate(loginData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password } = value;

  // Find admin user by email and role
  const { data: user, error: queryError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('role', 'admin')
    .single();

  if (queryError || !user) {
    throw new AppError('Invalid admin credentials', 401);
  }

  // Check if user is banned
  if (user.is_banned) {
    throw new AppError('Admin account is banned', 403);
  }

  // Check if admin is active
  if (!user.is_active) {
    throw new AppError('Admin account is disabled', 403);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid admin credentials', 401);
  }

  // Get admin profile for permissions
  const { data: adminProfile } = await supabase
    .from('profile_admin')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Update last login timestamp
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  // Generate tokens with extended expiry for admins
  const accessToken = generateToken(user.id, user.role, '48h');
  const refreshToken = generateToken(user.id, user.role, '30d');

  // Return user data with admin profile info
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      admin: adminProfile ? {
        level: adminProfile.admin_level,
        permissions: {
          can_manage_users: adminProfile.can_manage_users,
          can_manage_businesses: adminProfile.can_manage_businesses,
          can_manage_reviews: adminProfile.can_manage_reviews,
          can_moderate_content: adminProfile.can_moderate_content,
          can_manage_reports: adminProfile.can_manage_reports,
          can_view_analytics: adminProfile.can_view_analytics,
          can_view_audit_logs: adminProfile.can_view_audit_logs
        }
      } : null
    },
    accessToken,
    refreshToken
  };
};

/**
 * Logout user
 * Invalidates refresh token by adding to blacklist
 */
export const logoutUser = async (userId, refreshToken) => {
  if (!refreshToken) {
    return true; // Silent success if no token
  }

  try {
    // Decode token to get expiry
    const decoded = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64'));
    const expiresAt = new Date(decoded.exp * 1000);

    // Add token to blacklist
    const { error } = await supabase
      .from('auth_tokens')
      .insert([
        {
          user_id: userId,
          token_hash: hashToken(refreshToken),
          token_type: 'refresh',
          expires_at: expiresAt.toISOString(),
          is_revoked: true
        }
      ]);

    if (error) {
      console.warn('Could not blacklist token:', error);
      // Don't throw - logout should succeed anyway
    }

    return true;
  } catch (error) {
    console.warn('Logout error:', error);
    return true; // Soft fail
  }
};

/**
 * Refresh access token
 * Validates refresh token and returns new access token
 */
export const refreshAccessToken = async (userId, userRole, refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  // If userId/userRole not provided, decode the refresh token to get them
  let decodedToken;
  if (!userId || !userRole) {
    try {
      decodedToken = jwt.verify(refreshToken, config.JWT_SECRET);
      userId = decodedToken.id;
      userRole = decodedToken.role;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token has expired', 401);
      }
      throw new AppError('Invalid refresh token', 401);
    }
  }

  // Check if token is blacklisted
  const { data: blacklistedToken } = await supabase
    .from('auth_tokens')
    .select('id')
    .eq('token_hash', hashToken(refreshToken))
    .eq('is_revoked', true)
    .single();

  if (blacklistedToken) {
    throw new AppError('Refresh token has been revoked', 401);
  }

  // Generate new access token
  const newAccessToken = generateToken(userId, userRole);

  return {
    accessToken: newAccessToken
  };
};

/**
 * Hash token (simple SHA-256)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get user profile with role-specific data
 */
export const getUserProfile = async (userId, userRole) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, role, verified_email, created_at')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new AppError('User not found', 404);
  }

  // Fetch role-specific profile
  let profile = null;
  if (userRole === 'consumer') {
    const { data } = await supabase
      .from('profile_consumer')
      .select('*')
      .eq('user_id', userId)
      .single();
    profile = data;
  } else if (userRole === 'business_owner') {
    const { data } = await supabase
      .from('profile_business_owner')
      .select('*')
      .eq('user_id', userId)
      .single();
    profile = data;
  } else if (userRole === 'admin') {
    const { data } = await supabase
      .from('profile_admin')
      .select('*')
      .eq('user_id', userId)
      .single();
    profile = data;
  }

  return {
    ...user,
    [userRole === 'consumer' ? 'consumer_profile' : userRole === 'business_owner' ? 'business_profile' : 'admin_profile']: profile
  };
};

/**
 * Admin Create Consumer
 * Create a consumer/reviewer account as admin with auto-verification
 * 
 * @param {Object} consumerData - Consumer information
 * @param {string} adminId - Admin user ID creating the consumer
 * @returns {Object} Created user and profile data
 */
export const createConsumerAsAdmin = async (consumerData, adminId) => {
  // Validate input
  const { value, error } = adminCreateConsumerSchema.validate(consumerData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const {
    email,
    name,
    password,
    first_name,
    last_name,
    avatar_url,
    phone,
    date_of_birth,
    gender,
    bio,
    location,
    country,
    language = 'en',
    timezone,
    notification_email = true,
    notification_push = false,
    notification_sms = false,
    marketing_emails = false,
    show_profile = true
  } = value;

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Generate or hash password
  const finalPassword = password || crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(finalPassword, 10);

  // Create user with admin-verified status
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert([
      {
        email,
        password_hash: passwordHash,
        name,
        first_name: first_name || null,
        last_name: last_name || null,
        avatar_url: avatar_url || null,
        role: 'consumer',
        verified_email: true, // AUTO-VERIFIED by admin
        is_active: true,
        is_banned: false,
        verified_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (userError) {
    throw new AppError(userError.message, 500);
  }

  // Create consumer profile
  const { data: profile, error: profileError } = await supabase
    .from('profile_consumer')
    .insert([
      {
        user_id: newUser.id,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        bio: bio || null,
        location: location || null,
        country: country || null,
        language,
        timezone: timezone || null,
        notification_email,
        notification_push,
        notification_sms,
        marketing_emails,
        show_profile,
        show_email: false
      }
    ])
    .select()
    .single();

  if (profileError) {
    // Delete user if profile creation fails
    await supabase.from('users').delete().eq('id', newUser.id);
    throw new AppError('Failed to create consumer profile', 500);
  }

  // Return created consumer (no password hash)
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: 'consumer',
      verified_email: true,
      is_active: true,
      created_at: newUser.created_at
    },
    profile,
    temporaryPassword: password ? undefined : finalPassword // If auto-generated, return it
  };
};
