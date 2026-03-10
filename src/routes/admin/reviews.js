import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getReviewsForBusinessAdmin, createReviewAsAdmin } from '../../services/reviewService.js';
import { getBusinessById } from '../../services/businessService.js';

const router = express.Router({ mergeParams: true });

/**
 * ============================================================================
 * ADMIN REVIEW ROUTES
 * Mounted under /api/admin/businesses/:businessId/reviews
 * Authentication + Admin role required on all routes
 * ============================================================================
 */

/**
 * @GET /api/admin/businesses/:businessId/reviews
 * List all reviews for a business (admin view — all statuses, includes admin-submitted)
 *
 * Query Parameters:
 * - rating: 1-5 (filter by star rating)
 * - added_by_admin: true | false (filter by source)
 * - sort_by: 'recent' | 'rating_high' | 'rating_low' (default: 'recent')
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 */
router.get(
  '/:businessId/reviews',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { businessId } = req.params;
    const {
      rating = null,
      added_by_admin = null,
      sort_by = 'recent',
      limit = 20,
      offset = 0,
    } = req.query;

    const result = await getReviewsForBusinessAdmin(businessId, {
      rating,
      added_by_admin,
      sort_by,
      limit,
      offset,
    });

    res.json({
      status: 'success',
      data: result.reviews,
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  })
);

/**
 * @POST /api/admin/businesses/:businessId/reviews
 * Admin creates a review on behalf of a consumer
 * consumer_id is REQUIRED — review is attributed to that consumer
 *
 * Body:
 * {
 *   "consumer_id": "uuid"       — REQUIRED: the consumer this review is on behalf of
 *   "title": "string",
 *   "content": "string",
 *   "rating": 1-5,
 *   "experience_date": "date (optional)",
 *   "media_urls": [] (optional)
 * }
 */
router.post(
  '/:businessId/reviews',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { businessId } = req.params;
    const adminId = req.user.id;
    const { consumer_id, title, content, rating, experience_date, media_urls } = req.body;

    if (!consumer_id) {
      throw new AppError('consumer_id is required — select a consumer on whose behalf to submit this review', 400);
    }

    const review = await createReviewAsAdmin(
      { business_id: businessId, title, content, rating, experience_date, media_urls },
      consumer_id,
      adminId
    );

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully on behalf of consumer',
      data: review,
    });
  })
);

export default router;
