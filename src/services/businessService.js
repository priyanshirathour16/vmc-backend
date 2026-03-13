import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';
import { sendBusinessApprovedEmail, sendBusinessRejectedEmail } from './emailService.js';

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
      avg_rating,
      total_reviews
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
    // 1. Fetch business with owner details
    const { data: businessData, error: fetchError } = await supabase
      .from('profile_business_owner')
      .select(`
        id,
        business_name,
        user_id,
        users:user_id(email, name)
      `)
      .eq('id', businessId)
      .single();

    if (fetchError || !businessData) {
      throw new AppError('Business not found', 404);
    }

    const ownerEmail = businessData.users?.email;
    const ownerName = businessData.users?.name;
    const businessName = businessData.business_name;

    // 2. Update verification status
    const payload = {
      verification_status: verificationStatus,
      is_verified: verificationStatus === 'verified',
      is_approved: verificationStatus === 'verified', // ← FIX: Also set is_approved when verified
      verification_date: verificationStatus === 'verified' ? new Date().toISOString() : null,
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

    // 3. Send email based on verification status (non-blocking)
    if (verificationStatus === 'verified' && ownerEmail && ownerName) {
      sendBusinessApprovedEmail(ownerEmail, ownerName, businessName);
    } else if (verificationStatus === 'rejected' && ownerEmail && ownerName) {
      sendBusinessRejectedEmail(ownerEmail, ownerName, businessName);
    }

    // 4. Log the action
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
      .eq('is_verified', true);  // ← FIX: Check is_verified (actual status) not is_approved (legacy)

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
        business_logo_url,
        opening_hours
      `)
      .eq('is_published', true)
      .eq('is_verified', true);  // ← FIX: Check is_verified (actual status) not is_approved (legacy)

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
      .eq('is_verified', true)
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

/**
 * Validation schema for owner-initiated business application
 */
const applyBusinessSchema = Joi.object({
  // Owner account info
  owner_name: Joi.string().min(2).max(150).required(),
  owner_email: Joi.string().email().required(),
  owner_password: Joi.string().min(8).required(),

  // Business details
  business_name: Joi.string().min(3).max(150).required(),
  business_category: Joi.string().uuid().required(),
  website_url: Joi.string().uri().required(),
  phone_number: Joi.string().pattern(/^[\d\s\-\+\(\)]{10,}$/).required(),
  email_business: Joi.string().email().optional().allow(''),
  business_description: Joi.string().min(20).max(1000).required(),
  business_logo_url: Joi.string().uri().optional().allow(''),

  // Location
  street_address: Joi.string().min(5).max(255).required(),
  city: Joi.string().min(2).max(100).required(),
  state_province: Joi.string().min(2).max(100).optional().allow(''),
  postal_code: Joi.string().max(20).optional().allow(''),
  country: Joi.string().min(2).max(100).required(),

  opening_hours: Joi.object().optional(),
});

/**
 * Apply for business registration (Owner from main website)
 *
 * Creates a new user (business_owner role) + pending business profile in one
 * atomic-style transaction. The business starts as:
 *  - verification_status: 'pending'
 *  - is_published: false
 *  - is_approved: false
 *
 * Admin must approve before the business appears on the public listing.
 */
export const applyBusinessRegistration = async (data) => {
  const { error: validationError, value } = applyBusinessSchema.validate(data);
  if (validationError) {
    throw new AppError(validationError.details[0].message, 400);
  }

  const {
    owner_name,
    owner_email,
    owner_password,
    business_name,
    business_category,
    website_url,
    phone_number,
    email_business,
    business_description,
    business_logo_url,
    street_address,
    city,
    state_province,
    postal_code,
    country,
    opening_hours,
  } = value;

  // Check email uniqueness
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', owner_email)
    .single();

  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(owner_password, 10);

  // Create user with business_owner role
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert([{
      email: owner_email,
      password_hash: passwordHash,
      name: owner_name,
      role: 'business_owner',
      is_active: true,
      verified_email: false,
    }])
    .select()
    .single();

  if (userError) {
    throw new AppError(`Failed to create account: ${userError.message}`, 500);
  }

  // Create pending business profile linked to the new user
  const businessPayload = {
    user_id: newUser.id,
    business_name,
    business_category,
    website_url,
    phone_number,
    email_business: email_business || null,
    business_description,
    business_logo_url: business_logo_url || null,
    street_address,
    city,
    state_province: state_province || null,
    postal_code: postal_code || null,
    country,
    opening_hours: opening_hours || null,
    // owner-submitted — awaits admin review
    created_by_type: 'owner',
    verification_status: 'pending',
    is_verified: false,
    is_approved: false,
    is_published: false,
    subscription_tier: 'free',
    subscription_status: 'active',
  };

  const { data: newBusiness, error: businessError } = await supabase
    .from('profile_business_owner')
    .insert([businessPayload])
    .select()
    .single();

  if (businessError) {
    // Roll back user creation so we don't leave orphan accounts
    await supabase.from('users').delete().eq('id', newUser.id);
    throw new AppError(`Failed to submit business registration: ${businessError.message}`, 500);
  }

  // Issue tokens so the owner is immediately logged in
  const accessToken = generateToken(newUser.id, 'business_owner');
  const refreshToken = generateToken(newUser.id, 'business_owner', '7d');

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    business: {
      id: newBusiness.id,
      business_name: newBusiness.business_name,
      verification_status: newBusiness.verification_status,
      is_published: newBusiness.is_published,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * ============================================================================
 * BUSINESS OWNER DASHBOARD FUNCTIONS
 * ============================================================================
 */

/**
 * @function getBusinessDashboard
 * Get comprehensive dashboard data for a business owner
 * 
 * Returns:
 * - Business profile info
 * - Aggregated stats (total reviews, avg rating, views, response rate)
 * - Rating distribution
 * - Recent reviews with reviewer details
 * 
 * @param {string} userId - The business owner's user_id
 * @returns {Object} Dashboard data structure
 */
export const getBusinessDashboard = async (userId) => {
  // 1. Fetch business profile
  const { data: business, error: businessError } = await supabase
    .from('profile_business_owner')
    .select(`
      id,
      user_id,
      business_name,
      business_logo_url,
      city,
      country,
      verification_status,
      is_published,
      created_at,
      business_category,
      phone_number,
      email_business,
      website_url
    `)
    .eq('user_id', userId)
    .single();

  if (businessError || !business) {
    throw new AppError('Business profile not found. This account may not be a business owner.', 404);
  }

  // 2. Fetch all reviews for this business
  const { data: reviews, error: reviewError } = await supabase
    .from('reviews')
    .select(`
      id,
      reviewer_id,
      title,
      content,
      rating,
      helpful_count,
      unhelpful_count,
      created_at,
      is_approved,
      status,
      reviewed_at,
      reviewed_by,
      rejection_reason,
      business_id,
      updated_at
    `)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (reviewError) {
    throw new AppError(`Failed to fetch reviews: ${reviewError.message}`, 500);
  }

  const allReviews = reviews || [];

  // 3. Fetch reviewer information (names, avatars)
  const reviewerIds = [...new Set(allReviews.map(r => r.reviewer_id).filter(Boolean))];
  let reviewerMap = {};
  
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from('users')
      .select('id, name, avatar_url, email')
      .in('id', reviewerIds);
    
    if (reviewers) {
      reviewers.forEach(r => {
        reviewerMap[r.id] = {
          id: r.id,
          name: r.name,
          avatar_url: r.avatar_url,
          email: r.email
        };
      });
    }
  }

  // 4. Compute statistics from reviews
  const totalReviews = allReviews.length;
  const approvedReviews = allReviews.filter(r => r.is_approved).length;
  const pendingReviews = allReviews.filter(r => !r.is_approved).length;
  
  const totalHelpful = allReviews.reduce((sum, r) => sum + (r.helpful_count || 0), 0);
  const totalUnhelpful = allReviews.reduce((sum, r) => sum + (r.unhelpful_count || 0), 0);
  
  const avgRating = totalReviews > 0
    ? parseFloat((allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(2))
    : 0;

  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allReviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating]++;
    }
  });

  // Recent reviews (first 10) with reviewer info
  const recentReviews = allReviews.slice(0, 10).map(r => ({
    id: r.id,
    reviewer_id: r.reviewer_id,
    reviewer_name: reviewerMap[r.reviewer_id]?.name || 'Anonymous',
    reviewer_avatar: reviewerMap[r.reviewer_id]?.avatar_url || null,
    title: r.title || 'No title',
    content: r.content || '',
    rating: r.rating,
    helpful_count: r.helpful_count || 0,
    unhelpful_count: r.unhelpful_count || 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
    is_approved: r.is_approved,
    status: r.status || 'pending',
    reviewed_at: r.reviewed_at || null,
    reviewed_by: r.reviewed_by || null,
    rejection_reason: r.rejection_reason || null
  }));

  // 5. Calculate response rate (if business has response tracking in future)
  // For now, using a placeholder based on approved vs total
  const responseRate = totalReviews > 0
    ? Math.round((approvedReviews / totalReviews) * 100)
    : 0;

  // Return dashboard data
  return {
    business: {
      id: business.id,
      user_id: business.user_id,
      business_name: business.business_name,
      business_logo_url: business.business_logo_url,
      city: business.city,
      country: business.country,
      verification_status: business.verification_status,
      is_published: business.is_published,
      created_at: business.created_at,
      status: business.is_published ? 'Active' : (business.verification_status === 'pending' ? 'Pending' : 'Inactive')
    },
    stats: {
      totalReviews,
      approvedReviews,
      pendingReviews,
      avgRating,
      totalHelpful,
      totalUnhelpful,
      responseRate,
      ratingDistribution
    },
    recentReviews
  };
};

/**
 * @function getBusinessReviews
 * Fetch reviews for a business with filtering and pagination
 * 
 * Supports:
 * - Filtering by approval status, rating, date range
 * - Sorting by date, rating, helpful count
 * - Pagination
 * 
 * @param {string} businessId - The business ID
 * @param {Object} filters - Filter options
 * @returns {Object} Paginated reviews with metadata
 */
export const getBusinessReviews = async (businessId, filters = {}) => {
  const {
    status = 'all', // 'approved' | 'pending' | 'all'
    rating = null, // filter by specific rating (1-5)
    sort_by = 'created_at', // 'created_at' | 'rating' | 'helpful_count'
    sort_order = 'desc', // 'asc' | 'desc'
    limit = 20,
    offset = 0,
    search = '' // search in title or content
  } = filters;

  // Build base query
  let query = supabase
    .from('reviews')
    .select(`
      id,
      reviewer_id,
      title,
      content,
      rating,
      helpful_count,
      unhelpful_count,
      created_at,
      updated_at,
      is_approved,
      status,
      reviewed_at,
      reviewed_by,
      rejection_reason,
      business_id,
      users!reviewer_id(
        id,
        name,
        avatar_url,
        email
      )
    `, { count: 'exact' })
    .eq('business_id', businessId);

  // Apply approval status filter
  if (status === 'approved') {
    query = query.eq('is_approved', true);
  } else if (status === 'pending') {
    query = query.eq('is_approved', false);
  }

  // Apply rating filter
  if (rating && rating >= 1 && rating <= 5) {
    query = query.eq('rating', parseInt(rating));
  }

  // Apply search filter (title or content)
  if (search && search.trim()) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortFields = ['created_at', 'rating', 'helpful_count'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortAsc = sort_order === 'asc';

  query = query.order(sortField, { ascending: sortAsc });

  // Apply pagination
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offsetNum = Math.max(0, parseInt(offset) || 0);

  query = query.range(offsetNum, offsetNum + limitNum - 1);

  const { data: reviews, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to fetch reviews: ${error.message}`, 500);
  }

  // Format reviews with reviewer info
  const formattedReviews = (reviews || []).map(r => ({
    id: r.id,
    reviewer_id: r.reviewer_id,
    reviewer_name: r.users?.name || 'Anonymous',
    reviewer_avatar: r.users?.avatar_url || null,
    reviewer_email: r.users?.email || null,
    title: r.title || 'No title',
    content: r.content || '',
    rating: r.rating,
    helpful_count: r.helpful_count || 0,
    unhelpful_count: r.unhelpful_count || 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
    is_approved: r.is_approved,
    status: r.status || 'pending',
    reviewed_at: r.reviewed_at || null,
    reviewed_by: r.reviewed_by || null,
    rejection_reason: r.rejection_reason || null,
    experience_date: r.experience_date || null
  }));

  return {
    reviews: formattedReviews,
    pagination: {
      limit: limitNum,
      offset: offsetNum,
      total: count || 0,
      pages: Math.ceil((count || 0) / limitNum)
    },
    filters: {
      status,
      rating,
      sort_by: sortField,
      sort_order: sortAsc ? 'asc' : 'desc',
      search
    }
  };
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
  applyBusinessRegistration,
  // Dashboard APIs
  getBusinessDashboard,
  getBusinessReviews,
};
