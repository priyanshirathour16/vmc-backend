import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../../middleware/auth.js';
import {
  getAllBusinessesAdmin,
  getBusinessById,
  createBusinessAsAdmin,
  updateBusinessAsAdmin,
  publishBusiness,
  verifyBusiness,
  deleteBusinessAsAdmin,
  getBusinessAuditLogs,
  logAdminAction,
} from '../../services/businessService.js';

const router = express.Router();

/**
 * ============================================================================
 * ADMIN BUSINESS ROUTES (Authentication + Admin role required)
 * ============================================================================
 */

/**
 * @GET /api/admin/businesses
 * List all businesses with filtering, sorting, and pagination
 * Admin only
 * 
 * Query Parameters:
 * - created_by_type: 'owner' | 'admin' | 'all' (default: 'all')
 * - search: search by business name, email, or phone
 * - category_id: filter by category UUID
 * - is_verified: true | false
 * - is_approved: true | false
 * - is_published: true | false
 * - sort_by: 'business_name' | 'created_at' | 'updated_at' (default: 'created_at')
 * - sort_order: 'asc' | 'desc' (default: 'desc')
 * - page: page number (default: 1)
 * - perpage: items per page (default: 20, max: 100)
 */
router.get(
  '/',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const filters = {
      created_by_type: req.query.created_by_type || 'all',
      search: req.query.search || '',
      category_id: req.query.category_id || null,
      is_verified: req.query.is_verified ? req.query.is_verified === 'true' : null,
      is_approved: req.query.is_approved ? req.query.is_approved === 'true' : null,
      is_published: req.query.is_published ? req.query.is_published === 'true' : null,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc',
      page: req.query.page || 1,
      perpage: req.query.perpage || 20,
    };

    const result = await getAllBusinessesAdmin(filters);

    res.json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
      filters: result.filters,
    });
  })
);

/**
 * @GET /api/admin/businesses/:businessId
 * Get single business details by ID
 * Admin only
 */
router.get(
  '/:businessId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const business = await getBusinessById(req.params.businessId);

    res.json({
      status: 'success',
      data: business,
    });
  })
);

/**
 * @POST /api/admin/businesses
 * Create a new business (Admin registration)
 * Admin only
 * 
 * Body:
 * {
 *   "business_name": "string (required)",
 *   "business_category": "UUID (required)",
 *   "website_url": "string (required, URL)",
 *   "street_address": "string (required)",
 *   "city": "string (required)",
 *   "state_province": "string (optional)",
 *   "postal_code": "string (optional)",
 *   "country": "string (required)",
 *   "phone_number": "string (required, min 10 digits)",
 *   "email_business": "string (optional, email)",
 *   "business_description": "string (optional, max 1000)",
 *   "business_logo_url": "string (optional, URL)",
 *   "opening_hours": "object (optional)",
 *   "latitude": "number (optional)",
 *   "longitude": "number (optional)"
 * }
 * 
 * Auto-Sets (cannot be overridden):
 * - created_by_type: 'admin'
 * - admin_created_by: current admin ID
 * - verification_status: 'verified'
 * - is_verified: true
 * - is_published: true
 * - is_approved: true
 */
router.post(
  '/',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const business = await createBusinessAsAdmin(req.body, req.userId);

    // Log the creation
    await logAdminAction(req.userId, 'business_create', business.id, 'profile_business_owner', req.body);

    res.status(201).json({
      status: 'success',
      message: 'Business created successfully',
      data: business,
    });
  })
);

/**
 * @PUT /api/admin/businesses/:businessId
 * Update business details
 * Admin only
 * 
 * Body: Any updatable fields (all optional)
 */
router.put(
  '/:businessId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const business = await updateBusinessAsAdmin(
      req.params.businessId,
      req.body,
      req.userId
    );

    res.json({
      status: 'success',
      message: 'Business updated successfully',
      data: business,
    });
  })
);

/**
 * @PATCH /api/admin/businesses/:businessId/publish
 * Publish or unpublish a business
 * Admin only
 * 
 * Body: { "is_published": boolean }
 */
router.patch(
  '/:businessId/publish',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { is_published } = req.body;

    if (typeof is_published !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'is_published must be a boolean',
      });
    }

    const business = await publishBusiness(req.params.businessId, is_published, req.userId);

    res.json({
      status: 'success',
      message: `Business ${is_published ? 'published' : 'unpublished'} successfully`,
      data: business,
    });
  })
);

/**
 * @PATCH /api/admin/businesses/:businessId/verify
 * Verify or reject a business
 * Admin only
 * 
 * Body: { "verification_status": "verified" | "pending" | "rejected" }
 */
router.patch(
  '/:businessId/verify',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { verification_status } = req.body;

    const allowedStatuses = ['verified', 'pending', 'rejected'];
    if (!allowedStatuses.includes(verification_status)) {
      return res.status(400).json({
        status: 'error',
        message: `verification_status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const business = await verifyBusiness(
      req.params.businessId,
      verification_status,
      req.userId
    );

    res.json({
      status: 'success',
      message: `Business marked as ${verification_status}`,
      data: business,
    });
  })
);

/**
 * @DELETE /api/admin/businesses/:businessId
 * Delete (unpublish) a business
 * Admin only
 * Note: Uses soft delete (unpublish) by default
 */
router.delete(
  '/:businessId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await deleteBusinessAsAdmin(req.params.businessId, req.userId, true);

    res.json({
      status: 'success',
      message: result.message,
      data: result.data,
    });
  })
);

/**
 * @GET /api/admin/businesses/:businessId/audit-log
 * Get audit log for a specific business
 * Admin only
 * 
 * Query Parameters:
 * - limit: number of records (default: 50, max: 200)
 */
router.get(
  '/:businessId/audit-log',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const logs = await getBusinessAuditLogs(req.params.businessId, limit);

    res.json({
      status: 'success',
      data: logs,
      count: logs.length,
    });
  })
);

export default router;
