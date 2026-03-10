import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { getPublishedBusinesses, getPublicBusinessDetail } from '../services/businessService.js';

const router = express.Router();

/**
 * @GET /api/businesses
 * Get all published & approved businesses with filters and pagination
 * Query params:
 * - search: string (search by business name)
 * - category: UUID (filter by category)
 * - location: string (filter by city/country)
 * - rating_min: 0-5 (filter by minimum rating)
 * - sort_by: 'rating', 'reviews', 'name' (default: 'rating')
 * - limit: 10-100 (default: 12)
 * - offset: 0+ (default: 0)
 * - verified_only: boolean (default: false)
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    search = '',
    category = null,
    location = '',
    rating_min = 0,
    sort_by = 'rating',
    limit = 12,
    offset = 0,
    verified_only = false
  } = req.query;

  const result = await getPublishedBusinesses({
    search,
    category,
    location,
    rating_min,
    sort_by,
    limit,
    offset,
    verified_only: verified_only === 'true'
  });

  res.json(result);
}));

/**
 * @GET /api/businesses/:id
 * Get business details with reviews and rating distribution
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await getPublicBusinessDetail(req.params.id);
  res.json(result);
}));

/**
 * @POST /api/businesses
 * Create new business (Auth required - deprecated, use /api/admin/businesses)
 */
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  res.status(201).json({
    status: 'success',
    message: 'Use /api/admin/businesses for business creation',
    data: null
  });
}));

/**
 * @PUT /api/businesses/:id
 * Update business (Auth required - deprecated, use /api/admin/businesses/:id)
 */
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    message: 'Use /api/admin/businesses/:id for business updates',
    data: null
  });
}));

export default router;
