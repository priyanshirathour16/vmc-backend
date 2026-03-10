import Joi from 'joi';
import { supabase } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Validation Schemas for Business Management
 */
const createBusinessSchema = Joi.object({
  business_name: Joi.string().min(3).max(150).required(),
  business_category: Joi.string().uuid().required(),
  website_url: Joi.string().uri().required(),
  street_address: Joi.string().min(5).max(255).required(),
  city: Joi.string().min(2).max(100).required(),
  state_province: Joi.string().min(2).max(100).optional(),
  postal_code: Joi.string().max(20).optional(),
  country: Joi.string().min(2).max(100).required(),
  phone_number: Joi.string().pattern(/^[\d\s\-\+\(\)]{10,}$/).required(),
  email_business: Joi.string().email().optional(),
  business_description: Joi.string().max(1000).optional(),
  business_logo_url: Joi.string().uri().optional(),
  opening_hours: Joi.object().optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
});

const updateBusinessSchema = Joi.object({
  business_name: Joi.string().min(3).max(150).optional(),
  business_category: Joi.string().uuid().optional(),
  website_url: Joi.string().uri().optional(),
  street_address: Joi.string().min(5).max(255).optional(),
  city: Joi.string().min(2).max(100).optional(),
  state_province: Joi.string().min(2).max(100).optional(),
  postal_code: Joi.string().max(20).optional(),
  country: Joi.string().min(2).max(100).optional(),
  phone_number: Joi.string().pattern(/^[\d\s\-\+\(\)]{10,}$/).optional(),
  email_business: Joi.string().email().optional(),
  business_description: Joi.string().max(1000).optional(),
  business_logo_url: Joi.string().uri().optional(),
  opening_hours: Joi.object().optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  is_approved: Joi.boolean().optional(),
  is_verified: Joi.boolean().optional(),
}).min(1);

/**
 * Get all businesses with filtering, sorting, and pagination
 * Used by: Admin to view all businesses (including admin-created ones)
 * 
 * Filters:
 * - created_by_type: 'owner' | 'admin' | 'all' (default: 'all')
 * - search: search by business name, email, or phone
 * - category_id: filter by category UUID
 * - is_verified: true | false
 * - is_approved: true | false
 * - is_published: true | false (for admin-created businesses)
 * 
 * Sorting:
 * - sort_by: 'name' | 'created_at' | 'updated_at' (default: 'created_at')
 * - sort_order: 'asc' | 'desc' (default: 'desc')
 * - perpage: number (default: 20, max: 100)
 * - page: number (default: 1)
 */
export const getAllBusinessesAdmin = async (filters = {}) => {
  const {
    created_by_type = 'all',
    search = '',
    category_id = null,
    is_verified = null,
    is_approved = null,
    is_published = null,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    perpage = 20,
  } = filters;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const perpageNum = Math.min(100, Math.max(1, parseInt(perpage) || 20));
  const offset = (pageNum - 1) * perpageNum;

  // Validate sort
  const validSortFields = ['business_name', 'created_at', 'updated_at', 'verification_status'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortAsc = sort_order === 'asc';

  try {
    const selectFields = `
      id,
      user_id,
      business_name,
      business_category,
      website_url,
      phone_number,
      email_business,
      street_address,
      city,
      country,
      business_logo_url,
      verification_status,
      is_verified,
      is_approved,
      is_published,
      created_by_type,
      admin_created_by,
      created_at,
      updated_at,
      avg_rating
    `;

    // Build base query with count option
    let query = supabase
      .from('profile_business_owner')
      .select(selectFields, { count: 'exact' });

    // Apply status filters
    if (is_verified !== null) {
      query = query.eq('is_verified', is_verified);
    }
    if (is_approved !== null) {
      query = query.eq('is_approved', is_approved);
    }
    if (is_published !== null) {
      query = query.eq('is_published', is_published);
    }

    // Apply creation type filter
    if (created_by_type !== 'all') {
      query = query.eq('created_by_type', created_by_type);
    }

    // Apply category filter
    if (category_id) {
      query = query.eq('business_category', category_id);
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = `%${search.toLowerCase()}%`;
      query = query.or(
        `business_name.ilike.${searchLower},email_business.ilike.${searchLower},phone_number.ilike.${searchLower}`
      );
    }

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order(sortField, { ascending: sortAsc })
      .range(offset, offset + perpageNum - 1);

    if (error) {
      throw new AppError(
        `Failed to fetch businesses: ${error.message}`,
        500
      );
    }

    return {
      data: data || [],
      pagination: {
        page: pageNum,
        perpage: perpageNum,
        total: count || 0,
        pages: Math.ceil((count || 0) / perpageNum),
      },
      filters: {
        created_by_type,
        search,
        category_id,
        is_verified,
        is_approved,
        is_published,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Get single business by ID
 */
export const getBusinessById = async (businessId) => {
  try {
    const { data, error } = await supabase
      .from('profile_business_owner')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Business not found', 404);
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to fetch business: ${error.message}`, 500);
  }
};

/**
 * Create a new business (Admin only)
 * Sets:
 * - created_by_type = 'admin'
 * - admin_created_by = current admin ID
 * - verification_status = 'verified' (auto-verified)
 * - is_verified = true
 * - is_published = true (immediately visible)
 */
export const createBusinessAsAdmin = async (businessData, adminId) => {
  try {
    // Validate input
    const { error: validationError } = createBusinessSchema.validate(businessData);
    if (validationError) {
      throw new AppError(validationError.details[0].message, 400);
    }

    // For admin-created businesses, set user_id to NULL (no real owner)
    // The admin_created_by column tracks creation authority
    const adminBusinessUserId = null;

    // Prepare business payload with admin-specific fields
    const payload = {
      ...businessData,
      user_id: adminBusinessUserId, // Virtual user record for tracking
      created_by_type: 'admin',
      admin_created_by: adminId,
      verification_status: 'verified', // Auto-verified
      is_verified: true,
      is_published: true, // Immediately published
      is_approved: true, // Admin approval automatic
    };

    const { data, error } = await supabase
      .from('profile_business_owner')
      .insert([payload])
      .select();

    if (error) {
      throw new AppError(
        `Failed to create business: ${error.message}`,
        500
      );
    }

    // Return the created business
    return data[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Update a business (Admin only)
 */
export const updateBusinessAsAdmin = async (businessId, updateData, adminId) => {
  try {
    // Validate input
    const { error: validationError } = updateBusinessSchema.validate(updateData);
    if (validationError) {
      throw new AppError(validationError.details[0].message, 400);
    }

    // Check if business exists and was created by admin
    const existingBusiness = await getBusinessById(businessId);
    if (existingBusiness.created_by_type !== 'admin') {
      throw new AppError(
        'Only admin-created businesses can be edited by admin',
        403
      );
    }

    // Update timestamp
    const payload = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profile_business_owner')
      .update(payload)
      .eq('id', businessId)
      .select();

    if (error) {
      throw new AppError(
        `Failed to update business: ${error.message}`,
        500
      );
    }

    // Log the update in audit_logs
    await logAdminAction(adminId, 'business_update', businessId, 'profile_business_owner', updateData);

    return data[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Publish/Unpublish a business (Admin only)
 */
export const publishBusiness = async (businessId, publishStatus, adminId) => {
  try {
    const { data, error } = await supabase
      .from('profile_business_owner')
      .update({ is_published: publishStatus })
      .eq('id', businessId)
      .select();

    if (error) {
      throw new AppError(
        `Failed to update business publishing status: ${error.message}`,
        500
      );
    }

    // Log the action
    await logAdminAction(
      adminId,
      publishStatus ? 'business_publish' : 'business_unpublish',
      businessId,
      'profile_business_owner'
    );

    return data[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Verify/Reject a business (Admin only)
 */
export const verifyBusiness = async (businessId, verificationStatus, adminId) => {
  // Allowed values: 'verified', 'pending', 'rejected'
  const allowedStatuses = ['verified', 'pending', 'rejected'];
  if (!allowedStatuses.includes(verificationStatus)) {
    throw new AppError('Invalid verification status', 400);
  }

  try {
    const payload = {
      verification_status: verificationStatus,
      is_verified: verificationStatus === 'verified',
    };

    const { data, error } = await supabase
      .from('profile_business_owner')
      .update(payload)
      .eq('id', businessId)
      .select();

    if (error) {
      throw new AppError(
        `Failed to verify business: ${error.message}`,
        500
      );
    }

    // Log the action
    await logAdminAction(
      adminId,
      `business_${verificationStatus}`,
      businessId,
      'profile_business_owner'
    );

    return data[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Soft delete a business (Admin only)
 * Option: Mark as unpublished instead of hard delete
 */
export const deleteBusinessAsAdmin = async (businessId, adminId, softDelete = true) => {
  try {
    if (softDelete) {
      // Soft delete: just unpublish
      const { data, error } = await supabase
        .from('profile_business_owner')
        .update({ is_published: false })
        .eq('id', businessId)
        .select();

      if (error) {
        throw new AppError(
          `Failed to delete business: ${error.message}`,
          500
        );
      }

      // Log the action
      await logAdminAction(adminId, 'business_delete', businessId, 'profile_business_owner');

      return {
        message: 'Business unpublished successfully',
        data: data[0],
      };
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Log admin actions in audit_logs table
 */
export const logAdminAction = async (adminId, actionType, targetId, targetType, changes = null) => {
  try {
    const payload = {
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      target_type: targetType,
      changes: changes ? JSON.stringify(changes) : null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([payload]);

    if (error) {
      console.error('Failed to log admin action:', error.message);
      // Don't throw - logging failure shouldn't block the main operation
    }
  } catch (error) {
    console.error('Error logging admin action:', error.message);
  }
};

/**
 * Get audit logs for a specific business
 */
export const getBusinessAuditLogs = async (businessId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_id', businessId)
      .eq('target_type', 'profile_business_owner')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError(
        `Failed to fetch audit logs: ${error.message}`,
        500
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Database error: ${error.message}`, 500);
  }
};

/**
 * Assign/Remove Verified Business badge (BIZ-11)
 * Note: This function would need to interact with a badges/business_badges table
 * Placeholder for now - to be completed when badge system details are confirmed
 */
export const assignVerifiedBadge = async (businessId, assignBadge = true) => {
  try {
    // TODO: Implement badge assignment logic once badge table structure is confirmed
    // This should:
    // 1. Check if BIZ-11 badge exists
    // 2. Add/remove entry in business_badges table linking business to badge
    console.log(`Badge assignment placeholder: ${assignBadge ? 'assigning' : 'removing'} badge to business ${businessId}`);
  } catch (error) {
    console.error('Error managing badge:', error.message);
  }
};

/**
 * PUBLIC APIS - For consumers to browse businesses
 */

/**
 * Get all published & approved businesses with filters and pagination
 * Public endpoint - no auth required
 * 
 * Filters:
 * - search: string (search by name)
 * - category: UUID (filter by category)
 * - location: string (filter by city/country)
 * - rating_min: 0-5 (filter by minimum rating)
 * - sort_by: 'rating', 'reviews', 'name' (default: 'rating')
 * - limit: 10-100 (default: 12)
 * - offset: 0+ (default: 0)
 * - verified_only: boolean (default: false)
 */
export const getPublishedBusinesses = async (filters = {}) => {
  const {
    search = '',
    category = null,
    location = '',
    rating_min = 0,
    sort_by = 'rating',
    limit = 12,
    offset = 0,
    verified_only = false
  } = filters;

  // Validate pagination
  const limitNum = Math.min(100, Math.max(10, parseInt(limit) || 12));
  const offsetNum = Math.max(0, parseInt(offset) || 0);
  const minRating = Math.max(0, Math.min(5, parseFloat(rating_min) || 0));

  try {
    // First, get the count with all filters applied
    let countQuery = supabase
      .from('profile_business_owner')
      .select('id', { count: 'exact' })
      .eq('is_published', true)
      .eq('is_approved', true);

    // Apply filters to countQuery
    if (minRating > 0) {
      countQuery = countQuery.gte('avg_rating', minRating);
    }
    if (verified_only) {
      countQuery = countQuery.eq('is_verified', true);
    }
    if (search.trim()) {
      const searchLower = `%${search.toLowerCase()}%`;
      countQuery = countQuery.ilike('business_name', searchLower);
    }
    if (category) {
      countQuery = countQuery.eq('business_category', category);
    }
    if (location.trim()) {
      const locationLower = `%${location.toLowerCase()}%`;
      countQuery = countQuery.or(`city.ilike.${locationLower},country.ilike.${locationLower}`);
    }

    const { count } = await countQuery;

    // Now get the data with all fields
    let query = supabase
      .from('profile_business_owner')
      .select(`
        id,
        business_name,
        business_category,
        avg_rating,
        total_reviews,
        is_verified,
        city,
        country,
        business_logo_url
      `)
      .eq('is_published', true)
      .eq('is_approved', true);

    // Apply filters to data query
    if (minRating > 0) {
      query = query.gte('avg_rating', minRating);
    }
    if (verified_only) {
      query = query.eq('is_verified', true);
    }
    if (search.trim()) {
      const searchLower = `%${search.toLowerCase()}%`;
      query = query.ilike('business_name', searchLower);
    }
    if (category) {
      query = query.eq('business_category', category);
    }
    if (location.trim()) {
      const locationLower = `%${location.toLowerCase()}%`;
      query = query.or(`city.ilike.${locationLower},country.ilike.${locationLower}`);
    }

    // Apply sorting
    if (sort_by === 'reviews') {
      query = query.order('total_reviews', { ascending: false });
    } else if (sort_by === 'name') {
      query = query.order('business_name', { ascending: true });
    } else {
      // Default: sort by rating (highest first)
      query = query.order('avg_rating', { ascending: false });
    }

    // Apply pagination
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error } = await query;

    if (error) {
      throw new AppError(`Failed to fetch businesses: ${error.message}`, 500);
    }

    // Format response
    const businesses = (data || []).map(biz => ({
      id: biz.id,
      business_name: biz.business_name,
      category_id: biz.business_category,
      city: biz.city,
      country: biz.country,
      avg_rating: biz.avg_rating || 0,
      total_reviews: biz.total_reviews || 0,
      is_verified: biz.is_verified,
      avatar_url: biz.business_logo_url
    }));

    return {
      status: 'success',
      data: businesses,
      pagination: {
        offset: offsetNum,
        limit: limitNum,
        total: count || 0,
        hasMore: offsetNum + limitNum < (count || 0)
      }
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error fetching businesses: ${error.message}`, 500);
  }
};

/**
 * Get public business details by ID
 * Includes latest reviews and rating distribution
 */
export const getPublicBusinessDetail = async (businessId) => {
  try {
    // Fetch business details
    const { data: business, error: bizError } = await supabase
      .from('profile_business_owner')
      .select(`
        id,
        user_id,
        business_name,
        business_category,
        business_description,
        avg_rating,
        total_reviews,
        is_verified,
        response_rate,
        street_address,
        city,
        state_province,
        postal_code,
        country,
        latitude,
        longitude,
        phone_number,
        email_business,
        website_url,
        business_logo_url,
        opening_hours,
        created_at,
        owner:user_id (
          id,
          name,
          avatar_url,
          email
        )
      `)
      .eq('id', businessId)
      .eq('is_published', true)
      .eq('is_approved', true)
      .single();

    if (bizError) {
      if (bizError.code === 'PGRST116') {
        throw new AppError('Business not found or not published', 404);
      }
      throw bizError;
    }

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    // Fetch latest 5 reviews with reviewer info
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        title,
        content,
        rating,
        created_at,
        helpful_count,
        unhelpful_count,
        media_urls,
        reviewer:reviewer_id (
          id,
          name,
          avatar_url
        ),
        review_responses (
          id,
          response_text,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError.message);
    }

    // Calculate rating distribution
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId)
      .eq('is_approved', true);

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    (allReviews || []).forEach(review => {
      if (ratingDistribution.hasOwnProperty(review.rating)) {
        ratingDistribution[review.rating]++;
      }
    });

    return {
      status: 'success',
      data: {
        id: business.id,
        business_name: business.business_name,
        category_id: business.business_category,
        description: business.business_description,
        contact: {
          phone: business.phone_number,
          email: business.email_business,
          website: business.website_url
        },
        address: {
          street: business.street_address,
          city: business.city,
          state: business.state_province,
          postal_code: business.postal_code,
          country: business.country,
          latitude: business.latitude,
          longitude: business.longitude
        },
        hours: business.opening_hours,
        rating: {
          average: business.avg_rating || 0,
          total_reviews: business.total_reviews || 0,
          distribution: ratingDistribution
        },
        stats: {
          is_verified: business.is_verified,
          response_rate: business.response_rate || 0,
          created_at: business.created_at
        },
        owner: {
          id: business.owner?.id,
          name: business.owner?.name,
          avatar: business.owner?.avatar_url
        },
        avatar_url: business.business_logo_url,
        recent_reviews: reviews || []
      }
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error fetching business details: ${error.message}`, 500);
  }
};

export default {
  getAllBusinessesAdmin,
  getBusinessById,
  createBusinessAsAdmin,
  updateBusinessAsAdmin,
  publishBusiness,
  verifyBusiness,
  deleteBusinessAsAdmin,
  logAdminAction,
  getBusinessAuditLogs,
  assignVerifiedBadge,
  // Public APIs
  getPublishedBusinesses,
  getPublicBusinessDetail,
};
