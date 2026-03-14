import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../../middleware/auth.js';
import { createConsumerAsAdmin } from '../../services/authService.js';
import { sendAdminCreatedConsumerWelcomeEmail } from '../../services/emailService.js';
import { supabase } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = express.Router();

/**
 * ============================================================================
 * ADMIN CONSUMER ROUTES (Authentication + Admin role required)
 * ============================================================================
 */

/**
 * @GET /api/admin/consumers
 * List all consumers with filtering, sorting, and pagination
 * Admin only
 * 
 * Query Parameters:
 * - search: search by name, email, or phone
 * - sort_by: 'name' | 'email' | 'created_at' (default: 'created_at')
 * - sort_order: 'asc' | 'desc' (default: 'desc')
 * - limit: number of records (default: 10, max: 100)
 * - offset: number of records to skip (default: 0)
 * - verified_email: true | false (filter by email verification)
 * - is_active: true | false (filter by active status)
 */
router.get(
  '/',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const search = req.query.search || '';
    const sortBy = req.query.sort_by || 'created_at';
    const sortOrder = req.query.sort_order || 'desc';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const validSortFields = ['name', 'email', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortAsc = sortOrder === 'asc';

    try {
      let query = supabase
        .from('users')
        .select(
          `
          id,
          email,
          name,
          avatar_url,
          verified_email,
          is_active,
          created_at,
          profile_consumer(
            id,
            phone,
            location,
            country,
            bio,
            language,
            timezone,
            gender,
            notification_email,
            notification_push,
            notification_sms
          )
        `,
          { count: 'exact' }
        )
        .eq('role', 'consumer');

      // Apply verified_email filter
      if (req.query.verified_email !== undefined) {
        const verified = req.query.verified_email === 'true';
        query = query.eq('verified_email', verified);
      }

      // Apply is_active filter
      if (req.query.is_active !== undefined) {
        const active = req.query.is_active === 'true';
        query = query.eq('is_active', active);
      }

      // Apply search
      if (search.trim()) {
        const searchLower = `%${search.toLowerCase()}%`;
        query = query.or(
          `name.ilike.${searchLower},email.ilike.${searchLower}`
        );
      }

      // Get total count before pagination
      const { count } = await query;

      // Apply sorting and pagination
      query = query
        .order(sortField, {
          ascending: sortAsc
        })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch consumers: ${error.message}`, 500);
      }

      res.json({
        status: 'success',
        data: data || [],
        pagination: {
          offset,
          limit,
          total: count || 0,
          hasMore: (offset + limit) < (count || 0)
        }
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Database error: ${err.message}`, 500);
    }
  })
);

/**
 * @POST /api/admin/consumers
 * Create a new consumer account (Admin registration)
 * Admin only
 * 
 * Body:
 * {
 *   "email": "string (required, unique)",
 *   "name": "string (required, min 2 chars)",
 *   "password": "string (optional, auto-generated if not provided)",
 *   "first_name": "string (optional)",
 *   "last_name": "string (optional)",
 *   "avatar_url": "string (optional, URL)",
 *   "phone": "string (optional, phone format)",
 *   "date_of_birth": "string (optional, date)",
 *   "gender": "string (optional: male, female, other, prefer_not_to_say)",
 *   "bio": "string (optional, max 500 chars)",
 *   "location": "string (optional)",
 *   "country": "string (optional)",
 *   "language": "string (optional, default: 'en')",
 *   "timezone": "string (optional)",
 *   "notification_email": "boolean (optional, default: true)",
 *   "notification_push": "boolean (optional, default: false)",
 *   "notification_sms": "boolean (optional, default: false)",
 *   "marketing_emails": "boolean (optional, default: false)",
 *   "show_profile": "boolean (optional, default: true)"
 * }
 * 
 * Auto-Sets (cannot be overridden):
 * - role: 'consumer'
 * - verified_email: true (admin-verified)
 * - is_active: true
 * - verified_at: NOW()
 */
router.post(
  '/',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const consumer = await createConsumerAsAdmin(req.body, req.userId);

    // Send welcome email non-blocking
    if (consumer.user.email) {
      sendAdminCreatedConsumerWelcomeEmail(
        consumer.user.email,
        consumer.user.name,
        consumer.temporaryPassword  // May be undefined if admin provided password
      );
    }

    res.status(201).json({
      status: 'success',
      message: 'Consumer created successfully',
      data: consumer
    });
  })
);

/**
 * @GET /api/admin/consumers/:consumerId
 * Get single consumer details
 * Admin only
 */
router.get(
  '/:consumerId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { data: consumer, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        name,
        first_name,
        last_name,
        avatar_url,
        verified_email,
        is_active,
        is_banned,
        created_at,
        updated_at,
        profile_consumer:profile_consumer(*)
      `
      )
      .eq('id', req.params.consumerId)
      .eq('role', 'consumer')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Consumer not found', 404);
      }
      throw new AppError(error.message, 500);
    }

    res.json({
      status: 'success',
      data: consumer
    });
  })
);

/**
 * @PUT /api/admin/consumers/:consumerId
 * Update consumer details
 * Admin only
 */
router.put(
  '/:consumerId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { consumerId } = req.params;
    const updateData = req.body;

    // Prevent changing role and verified status
    delete updateData.role;
    delete updateData.verified_email;
    delete updateData.is_active;
    delete updateData.is_banned;

    // Validate consumer exists
    const { data: existingConsumer, error: checkError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', consumerId)
      .single();

    if (checkError || !existingConsumer || existingConsumer.role !== 'consumer') {
      throw new AppError('Consumer not found', 404);
    }

    // Separate user and profile fields
    const userFields = ['name', 'first_name', 'last_name', 'avatar_url'];
    const profileFields = [
      'phone', 'date_of_birth', 'gender', 'bio', 'location', 'country',
      'language', 'timezone', 'notification_email', 'notification_push',
      'notification_sms', 'marketing_emails', 'show_profile'
    ];

    const userUpdate = {};
    const profileUpdate = {};

    Object.keys(updateData).forEach(key => {
      if (userFields.includes(key)) {
        userUpdate[key] = updateData[key];
      } else if (profileFields.includes(key)) {
        profileUpdate[key] = updateData[key];
      }
    });

    // Update user record if needed
    if (Object.keys(userUpdate).length > 0) {
      userUpdate.updated_at = new Date().toISOString();
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('id', consumerId);

      if (userError) {
        throw new AppError(`Failed to update consumer: ${userError.message}`, 500);
      }
    }

    // Update profile record if needed
    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.updated_at = new Date().toISOString();
      const { error: profileError } = await supabase
        .from('profile_consumer')
        .update(profileUpdate)
        .eq('user_id', consumerId);

      if (profileError) {
        throw new AppError(`Failed to update consumer profile: ${profileError.message}`, 500);
      }
    }

    // Fetch updated record
    const { data: updated } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        name,
        first_name,
        last_name,
        avatar_url,
        verified_email,
        is_active,
        profile_consumer:profile_consumer(*)
      `
      )
      .eq('id', consumerId)
      .single();

    res.json({
      status: 'success',
      message: 'Consumer updated successfully',
      data: updated
    });
  })
);

/**
 * @DELETE /api/admin/consumers/:consumerId
 * Delete a consumer account
 * Admin only
 */
router.delete(
  '/:consumerId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { consumerId } = req.params;

    // Verify consumer exists and is actually a consumer
    const { data: consumer, error: checkError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', consumerId)
      .single();

    if (checkError || !consumer || consumer.role !== 'consumer') {
      throw new AppError('Consumer not found', 404);
    }

    // Delete user (cascades to profile_consumer via ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', consumerId);

    if (deleteError) {
      throw new AppError(`Failed to delete consumer: ${deleteError.message}`, 500);
    }

    res.json({
      status: 'success',
      message: 'Consumer deleted successfully'
    });
  })
);

export default router;
