import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../middleware/auth.js';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  restoreSubcategory,
  getCategoryTree,
} from '../services/categoryService.js';

const router = express.Router();

/**
 * ============================================================================
 * PUBLIC ROUTES (No authentication required)
 * ============================================================================
 */

/**
 * @GET /api/categories
 * Get all active categories with subcategories count
 * Used by: Registration forms, business signup
 */
router.get('/', asyncHandler(async (req, res) => {
  const categories = await getAllCategories(false); // false = only active
  
  res.json({
    status: 'success',
    data: categories,
    count: categories.length,
  });
}));

/**
 * @GET /api/categories/tree/full
 * Get full category tree for dropdowns and selects
 * Nested structure: category > subcategories
 * Used by: Registration forms, business profile
 * NOTE: Must be before /:categoryId route
 */
router.get('/tree/full', asyncHandler(async (req, res) => {
  const tree = await getCategoryTree();
  
  res.json({
    status: 'success',
    data: tree,
    count: tree.length,
  });
}));

/**
 * ============================================================================
 * ADMIN ROUTES (Authentication + Admin role required)
 * ============================================================================
 */

/**
 * @GET /api/categories/admin/all
 * Get all categories including inactive and deleted (soft deletes)
 * Admin only
 * NOTE: Must be before /:categoryId route to avoid being matched as category ID
 */
router.get(
  '/admin/all',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const categories = await getAllCategories(true); // true = include inactive
    
    res.json({
      status: 'success',
      data: categories,
      count: categories.length,
    });
  })
);

/**
 * @GET /api/categories/:categoryId
 * Get single category with full subcategories list
 * Used by: Registration forms, filtering
 * NOTE: Must be after specific routes like /tree/full and /admin/all
 */
router.get('/:categoryId', asyncHandler(async (req, res) => {
  const category = await getCategoryById(req.params.categoryId);
  
  res.json({
    status: 'success',
    data: category,
  });
}));

/**
 * ============================================================================
 * CATEGORY MANAGEMENT ROUTES (Admin only)
 * ============================================================================
 */

/**
 * @POST /api/categories/create
 * Create new category
 * Body: { name, slug, icon?, description?, display_order? }
 * Admin only
 */
router.post(
  '/create',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const newCategory = await createCategory(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: newCategory,
    });
  })
);

/**
 * @PUT /api/categories/:categoryId
 * Update category
 * Body: { name?, slug?, icon?, description?, is_active?, display_order? }
 * Admin only
 */
router.put(
  '/:categoryId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const updatedCategory = await updateCategory(req.params.categoryId, req.body);
    
    res.json({
      status: 'success',
      message: 'Category updated successfully',
      data: updatedCategory,
    });
  })
);

/**
 * @DELETE /api/categories/:categoryId
 * Soft delete category (sets deleted_at timestamp)
 * Admin only
 */
router.delete(
  '/:categoryId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await deleteCategory(req.params.categoryId);
    
    res.json({
      status: 'success',
      message: result.message,
      data: result.data,
    });
  })
);

/**
 * @POST /api/categories/:categoryId/restore
 * Restore soft-deleted category
 * Admin only
 */
router.post(
  '/:categoryId/restore',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await restoreCategory(req.params.categoryId);
    
    res.json({
      status: 'success',
      message: result.message,
      data: result.data,
    });
  })
);

/**
 * ============================================================================
 * SUBCATEGORY MANAGEMENT ROUTES (Admin only)
 * ============================================================================
 */

/**
 * @POST /api/categories/:categoryId/subcategories
 * Create subcategory under a category
 * Body: { name, slug, description?, display_order? }
 * Admin only
 */
router.post(
  '/:categoryId/subcategories',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const newSubcategory = await createSubcategory({
      ...req.body,
      category_id: req.params.categoryId,
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Subcategory created successfully',
      data: newSubcategory,
    });
  })
);

/**
 * @GET /api/categories/subcategories/:subcategoryId
 * Get subcategory details
 * Public route
 */
router.get('/subcategories/:subcategoryId', asyncHandler(async (req, res) => {
  const subcategory = await getSubcategoryById(req.params.subcategoryId);
  
  res.json({
    status: 'success',
    data: subcategory,
  });
}));

/**
 * @PUT /api/categories/subcategories/:subcategoryId
 * Update subcategory
 * Body: { name?, slug?, description?, is_active?, display_order? }
 * Admin only
 */
router.put(
  '/subcategories/:subcategoryId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const updatedSubcategory = await updateSubcategory(req.params.subcategoryId, req.body);
    
    res.json({
      status: 'success',
      message: 'Subcategory updated successfully',
      data: updatedSubcategory,
    });
  })
);

/**
 * @DELETE /api/categories/subcategories/:subcategoryId
 * Soft delete subcategory
 * Admin only
 */
router.delete(
  '/subcategories/:subcategoryId',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await deleteSubcategory(req.params.subcategoryId);
    
    res.json({
      status: 'success',
      message: result.message,
      data: result.data,
    });
  })
);

/**
 * @POST /api/categories/subcategories/:subcategoryId/restore
 * Restore soft-deleted subcategory
 * Admin only
 */
router.post(
  '/subcategories/:subcategoryId/restore',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await restoreSubcategory(req.params.subcategoryId);
    
    res.json({
      status: 'success',
      message: result.message,
      data: result.data,
    });
  })
);

export default router;
