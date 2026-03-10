import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { getReviewsForBusiness, createReview } from '../services/reviewService.js';

const router = express.Router();

/**
 * @GET /api/reviews
 * Get reviews for a business with filters and pagination
 * Query params:
 * - businessId: UUID (REQUIRED - filter by business)
 * - rating: 1-5 (optional - filter by star rating)
 * - sort_by: 'recent', 'helpful', 'rating_high', 'rating_low' (default: 'recent')
 * - limit: 10-50 (default: 10)
 * - offset: 0+ (default: 0)
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    businessId,
    rating = null,
    sort_by = 'recent',
    limit = 10,
    offset = 0
  } = req.query;

  if (!businessId) {
    return res.status(400).json({
      status: 'error',
      message: 'businessId query parameter is required'
    });
  }

  const result = await getReviewsForBusiness(businessId, {
    rating,
    sort_by,
    limit,
    offset
  });

  res.json({
    status: 'success',
    data: result.reviews,
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
      hasMore: result.hasMore
    }
  });
}));

/**
 * @GET /api/reviews/:id
 * Get single review (currently not fully implemented)
 */
router.get('/:id', asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    message: 'Individual review retrieval not yet implemented',
    data: null
  });
}));

/**
 * @POST /api/reviews
 * Create new review (Auth required - must be logged in)
 * Body:
 * {
 *   "business_id": "uuid",
 *   "title": "string (5-255 chars)",
 *   "content": "string (10-5000 chars)",
 *   "rating": number,
 *   "experience_date": "optional date",
 *   "media_urls": ["optional", "image", "urls"]
 * }
 */
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const { business_id, title, content, rating, experience_date, media_urls } = req.body;
  const userId = req.user.id;

  const review = await createReview({
    business_id,
    title,
    content,
    rating,
    experience_date,
    media_urls
  }, userId);

  res.status(201).json({
    status: 'success',
    message: 'Review created successfully',
    data: review
  });
}));

/**
 * @PUT /api/reviews/:id
 * Update review (Auth required - only by review author)
 */
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    message: 'Review update not yet implemented',
    data: null
  });
}));

/**
 * @DELETE /api/reviews/:id
 * Delete review (Auth required - only by review author or admin)
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    message: 'Review deletion not yet implemented',
    data: null
  });
}));

export default router;
