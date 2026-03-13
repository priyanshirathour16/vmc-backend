import express from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../middleware/auth.js';
import { getBusinessDashboard, getBusinessReviews } from '../services/businessService.js';
import { sendReviewApprovedNotification, sendReviewRejectedNotification } from '../services/emailService.js';
import { supabase } from '../config/db.js';

const router = express.Router();

/**
 * ============================================================================
 * BUSINESS OWNER ROUTES (Authentication + business_owner role required)
 * ============================================================================
 */

// All routes require authentication and business_owner role
router.use(authMiddleware);
router.use(authorizeRole('business_owner'));

/**
 * @GET /api/business/me
 * Get current business owner's dashboard data
 * 
 * Returns:
 * - Business profile information
 * - Aggregated statistics (reviews, ratings, response rate)
 * - Recent reviews (last 10) with reviewer information
 * 
 * Response: 200 OK
 * {
 *   "status": "success",
 *   "data": {
 *     "business": { ... },
 *     "stats": { ... },
 *     "recentReviews": [ ... ]
 *   }
 * }
 * 
 * Errors:
 * - 404: Business profile not found
 * - 500: Database or service error
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    try {
      const dashboardData = await getBusinessDashboard(userId);
      
      res.json({
        status: 'success',
        data: dashboardData
      });
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @GET /api/business/reviews
 * Get all reviews for the current business with filtering and pagination
 * 
 * Query Parameters:
 * - status: 'approved' | 'pending' | 'all' (default: 'all')
 * - rating: 1-5 (optional, filter by specific rating)
 * - sort_by: 'created_at' | 'rating' | 'helpful_count' (default: 'created_at')
 * - sort_order: 'asc' | 'desc' (default: 'desc')
 * - limit: 1-100 (default: 20)
 * - offset: 0+ (default: 0)
 * - search: search term for title/content (optional)
 * 
 * Response: 200 OK
 * {
 *   "status": "success",
 *   "data": {
 *     "reviews": [ ... ],
 *     "pagination": {
 *       "limit": 20,
 *       "offset": 0,
 *       "total": 45,
 *       "pages": 3
 *     },
 *     "filters": { ... }
 *   }
 * }
 * 
 * Errors:
 * - 404: Business profile not found
 * - 400: Invalid filter parameters
 * - 500: Database error
 */
router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // First, get the business profile to get business_id
    const { data: business, error: businessError } = await supabase
      .from('profile_business_owner')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    // Extract filters from query params
    const filters = {
      status: req.query.status || 'all',
      rating: req.query.rating || null,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc',
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
      search: req.query.search || ''
    };

    try {
      const reviewsData = await getBusinessReviews(business.id, filters);
      
      res.json({
        status: 'success',
        data: reviewsData
      });
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @GET /api/business/stats
 * Get snapshot of business statistics
 * 
 * Lightweight endpoint for analytics widgets
 * Returns only aggregated stats, not full dashboard data
 * 
 * Response: 200 OK
 * {
 *   "status": "success",
 *   "data": {
 *     "totalReviews": 234,
 *     "avgRating": 4.5,
 *     "approvedReviews": 225,
 *     "pendingReviews": 9,
 *     "ratingDistribution": { ... }
 *   }
 * }
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      const dashboardData = await getBusinessDashboard(userId);
      
      res.json({
        status: 'success',
        data: dashboardData.stats
      });
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @GET /api/business/profile
 * Get complete business profile information
 */
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: business, error } = await supabase
      .from('profile_business_owner')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !business) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    res.json({
      status: 'success',
      data: business
    });
  })
);

/**
 * @PUT /api/business/profile/basic
 * Update business basic information (name, category, description, website)
 */
router.put(
  '/profile/basic',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { business_name, business_category, business_description, website_url } = req.body;

    // Validation
    if (!business_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Business name is required'
      });
    }

    // Update profile
    const { data, error } = await supabase
      .from('profile_business_owner')
      .update({
        business_name,
        business_category,
        business_description,
        website_url,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to update profile'
      });
    }

    res.json({
      status: 'success',
      message: 'Basic information updated',
      data
    });
  })
);

/**
 * @PUT /api/business/profile/contact
 * Update business contact information
 */
router.put(
  '/profile/contact',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { 
      email_business, 
      phone_number, 
      street_address, 
      city, 
      state_province, 
      postal_code, 
      country 
    } = req.body;

    // Validation
    if (!email_business || !phone_number || !street_address || !city || !country) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields are missing'
      });
    }

    // Update profile
    const { data, error } = await supabase
      .from('profile_business_owner')
      .update({
        email_business,
        phone_number,
        street_address,
        city,
        state_province,
        postal_code,
        country,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to update contact information'
      });
    }

    res.json({
      status: 'success',
      message: 'Contact information updated',
      data
    });
  })
);

/**
 * @PUT /api/business/profile/hours
 * Update business opening hours
 */
router.put(
  '/profile/hours',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { opening_hours } = req.body;

    if (!opening_hours) {
      return res.status(400).json({
        status: 'error',
        message: 'Opening hours are required'
      });
    }

    // Update profile
    const { data, error } = await supabase
      .from('profile_business_owner')
      .update({
        opening_hours,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to update opening hours'
      });
    }

    res.json({
      status: 'success',
      message: 'Opening hours updated',
      data
    });
  })
);

/**
 * @POST /api/business/profile/change-password
 * Change business account password
 */
router.post(
  '/profile/change-password',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current and new passwords are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password hash
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to update password'
      });
    }

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });
  })
);

/**
 * @GET /api/business/reviews/pending/count
 * Get count of pending reviews (not yet approved)
 */
router.get(
  '/reviews/pending/count',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get business ID from business owner's profile
    const { data: business, error: businessError } = await supabase
      .from('profile_business_owner')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    // Get pending reviews count
    const { data: reviews, error: reviewError, count } = await supabase
      .from('reviews')
      .select('id', { count: 'exact' })
      .eq('business_id', business.id)
      .eq('status', 'pending');

    if (reviewError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch pending reviews count'
      });
    }

    res.json({
      status: 'success',
      data: {
        pendingCount: count || 0
      }
    });
  })
);

/**
 * @POST /api/business/reviews/:reviewId/approve
 * Approve a review for public display
 */
router.post(
  '/reviews/:reviewId/approve',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { reviewId } = req.params;

    // Get business ID from business owner's profile
    const { data: business, error: businessError } = await supabase
      .from('profile_business_owner')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    // Verify the review belongs to this business
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, business_id, is_approved')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    if (review.business_id !== business.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to approve this review'
      });
    }

    // Update review status with approval details
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        is_approved: true,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (updateError) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to approve review'
      });
    }

    // Fetch full review and reviewer data to send approval email (non-blocking)
    const { data: fullReview } = await supabase
      .from('reviews')
      .select('id, title, rating, content, created_at, reviewer_id')
      .eq('id', reviewId)
      .single();

    const { data: reviewer } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', fullReview?.reviewer_id)
      .single();

    if (fullReview && reviewer) {
      // Get business info for email
      const { data: businessFull } = await supabase
        .from('profile_business_owner')
        .select('id, business_name')
        .eq('id', business.id)
        .single();

      if (businessFull) {
        // Non-blocking: email sent in background
        sendReviewApprovedNotification(fullReview, businessFull, reviewer);
      }
    }

    res.json({
      status: 'success',
      message: 'Review approved successfully'
    });
  })
);

/**
 * @POST /api/business/reviews/:reviewId/reject
 * Reject a review (hide from public display)
 * Body: { rejection_reason?: string }
 */
router.post(
  '/reviews/:reviewId/reject',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rejection_reason } = req.body;

    // Get business ID from business owner's profile
    const { data: business, error: businessError } = await supabase
      .from('profile_business_owner')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        status: 'error',
        message: 'Business profile not found'
      });
    }

    // Verify the review belongs to this business
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, business_id, is_approved')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    if (review.business_id !== business.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to reject this review'
      });
    }

    // Update review status with rejection details
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        is_approved: false,
        status: 'rejected',
        rejection_reason: rejection_reason || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (updateError) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to reject review'
      });
    }

    // Fetch full review and reviewer data to send rejection email (non-blocking)
    const { data: fullReview } = await supabase
      .from('reviews')
      .select('id, title, rating, content, created_at, reviewer_id')
      .eq('id', reviewId)
      .single();

    const { data: reviewer } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', fullReview?.reviewer_id)
      .single();

    if (fullReview && reviewer) {
      // Get business info for email
      const { data: businessFull } = await supabase
        .from('profile_business_owner')
        .select('id, business_name, email_business')
        .eq('id', business.id)
        .single();

      if (businessFull) {
        // Non-blocking: email sent in background
        sendReviewRejectedNotification(fullReview, businessFull, reviewer, rejection_reason);
      }
    }

    res.json({
      status: 'success',
      message: 'Review rejected successfully'
    });
  })
);

export default router;
