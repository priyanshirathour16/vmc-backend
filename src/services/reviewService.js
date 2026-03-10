import { supabase } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { createReviewSchema, updateReviewSchema } from '../validators/reviewSchema.js';

/**
 * Get all reviews for a business with filters and pagination
 * Filters: rating, sortBy (recent, helpful, rating_high, rating_low)
 * Returns: Array of reviews with reviewer info and responses
 */
export const getReviewsForBusiness = async (businessId, filters = {}) => {
  const {
    rating = null,
    sort_by = 'recent',
    limit = 10,
    offset = 0
  } = filters;

  // Validate pagination
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const offsetNum = Math.max(0, parseInt(offset) || 0);

  try {
    // Base query: Get reviews for business
    let query = supabase
      .from('reviews')
      .select(`
        id,
        title,
        content,
        rating,
        created_at,
        updated_at,
        helpful_count,
        unhelpful_count,
        media_urls,
        experience_date,
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
      `, { count: 'exact' })
      .eq('business_id', businessId)
      .eq('is_approved', true);

    // Apply rating filter
    if (rating && [1, 2, 3, 4, 5].includes(parseInt(rating))) {
      query = query.eq('rating', parseInt(rating));
    }

    // Apply sorting
    if (sort_by === 'helpful') {
      query = query.order('helpful_count', { ascending: false });
    } else if (sort_by === 'rating_high') {
      query = query.order('rating', { ascending: false });
    } else if (sort_by === 'rating_low') {
      query = query.order('rating', { ascending: true });
    } else {
      // Default: recent first
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(`Failed to fetch reviews: ${error.message}`, 500);
    }

    return {
      reviews: data || [],
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < (count || 0)
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error fetching reviews: ${error.message}`, 500);
  }
};

/**
 * Create a new review
 * Validates input, checks business exists, inserts review
 * Updates business avg_rating and total_reviews
 * Increments reviewer total_reviews count
 */
export const createReview = async (reviewData, userId) => {
  // Validate input
  const { error, value } = createReviewSchema.validate(reviewData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { business_id, title, content, rating, experience_date, media_urls } = value;

  try {
    // Check business exists and is published/approved
    const { data: business, error: businessError } = await supabase
      .from('profile_business_owner')
      .select('id, is_published, is_approved, avg_rating, total_reviews')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      throw new AppError('Business not found', 404);
    }

    if (!business.is_published || !business.is_approved) {
      throw new AppError('Business is not available for reviews', 403);
    }

    // Check user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new AppError('User not found', 404);
    }

    // Prevent business owners from reviewing their own business
    if (user.role === 'business_owner') {
      const { data: ownerProfile } = await supabase
        .from('profile_business_owner')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (ownerProfile) {
        throw new AppError('Business owners cannot review their own business', 403);
      }
    }

    // Insert review
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        business_id,
        reviewer_id: userId,
        title,
        content,
        rating,
        experience_date: experience_date || null,
        media_urls: media_urls || [],
        is_approved: true, // Allow reviews from authenticated users by default
        helpful_count: 0,
        unhelpful_count: 0
      })
      .select('id, business_id, reviewer_id, rating, title, content, created_at')
      .single();

    if (insertError) {
      throw new AppError(`Failed to create review: ${insertError.message}`, 500);
    }

    // Update business metrics (avg_rating and total_reviews)
    await updateBusinessMetrics(business_id);

    // Increment consumer total_reviews
    await incrementConsumerReviewCount(userId);

    return newReview;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error creating review: ${error.message}`, 500);
  }
};

/**
 * Recalculate business avg_rating and total_reviews from all approved reviews
 */
export const updateBusinessMetrics = async (businessId) => {
  try {
    // Get all approved reviews for business
    const { data: reviews, error: fetchError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId)
      .eq('is_approved', true);

    if (fetchError) {
      throw new AppError(`Failed to fetch reviews: ${fetchError.message}`, 500);
    }

    const totalReviews = reviews?.length || 0;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
      : null;

    // Update business record
    const { error: updateError } = await supabase
      .from('profile_business_owner')
      .update({
        total_reviews: totalReviews,
        avg_rating: avgRating ? parseFloat(avgRating) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);

    if (updateError) {
      console.error('Failed to update business metrics:', updateError);
      // Don't throw - metrics update failure shouldn't fail the review creation
    }
  } catch (error) {
    console.error('Error updating business metrics:', error);
    // Don't throw - metrics update failure shouldn't fail the review creation
  }
};

/**
 * Increment consumer's total_reviews count
 */
export const incrementConsumerReviewCount = async (userId) => {
  try {
    // Get current count
    const { data: profile } = await supabase
      .from('profile_consumer')
      .select('total_reviews')
      .eq('user_id', userId)
      .single();

    const currentCount = profile?.total_reviews || 0;

    // Update with incremented count
    await supabase
      .from('profile_consumer')
      .update({
        total_reviews: currentCount + 1,
        last_review_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error incrementing consumer review count:', error);
    // Don't throw - this is non-critical
  }
};

/**
 * Get all reviews for a business (admin view — includes unapproved, all statuses)
 * Includes admin tracking columns: added_by_admin, admin_reviewer_id
 */
export const getReviewsForBusinessAdmin = async (businessId, filters = {}) => {
  const {
    rating = null,
    sort_by = 'recent',
    limit = 20,
    offset = 0,
    added_by_admin = null,
  } = filters;

  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offsetNum = Math.max(0, parseInt(offset) || 0);

  try {
    let query = supabase
      .from('reviews')
      .select(`
        id,
        title,
        content,
        rating,
        created_at,
        updated_at,
        helpful_count,
        unhelpful_count,
        media_urls,
        experience_date,
        is_approved,
        is_flagged,
        added_by_admin,
        admin_reviewer_id,
        reviewer:reviewer_id (
          id,
          name,
          email
        ),
        admin_user:admin_reviewer_id (
          id,
          name
        ),
        review_responses (
          id,
          response_text,
          created_at
        )
      `, { count: 'exact' })
      .eq('business_id', businessId);

    if (rating && [1, 2, 3, 4, 5].includes(parseInt(rating))) {
      query = query.eq('rating', parseInt(rating));
    }

    if (added_by_admin !== null) {
      query = query.eq('added_by_admin', added_by_admin === 'true' || added_by_admin === true);
    }

    if (sort_by === 'rating_high') {
      query = query.order('rating', { ascending: false });
    } else if (sort_by === 'rating_low') {
      query = query.order('rating', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(`Failed to fetch reviews: ${error.message}`, 500);
    }

    return {
      reviews: data || [],
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < (count || 0),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error fetching reviews: ${error.message}`, 500);
  }
};

/**
 * Create a review on behalf of a consumer (Admin only)
 * Sets added_by_admin=true, admin_reviewer_id=adminId, reviewer_id=consumerId
 */
export const createReviewAsAdmin = async (reviewData, consumerId, adminId) => {
  const { error: validationError, value } = createReviewSchema.validate(reviewData);
  if (validationError) {
    throw new AppError(validationError.details[0].message, 400);
  }

  const { business_id, title, content, rating, experience_date, media_urls } = value;

  try {
    // Validate business exists and is accessible
    const { data: business, error: businessError } = await supabase
      .from('profile_business_owner')
      .select('id, is_published, is_approved, avg_rating, total_reviews')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      throw new AppError('Business not found', 404);
    }

    // Validate consumer exists and is active
    const { data: consumer, error: consumerError } = await supabase
      .from('users')
      .select('id, role, is_active')
      .eq('id', consumerId)
      .single();

    if (consumerError || !consumer) {
      throw new AppError('Selected consumer not found', 404);
    }

    if (consumer.role !== 'consumer') {
      throw new AppError('Selected user is not a consumer', 400);
    }

    if (consumer.is_active === false) {
      throw new AppError('Selected consumer account is not active', 400);
    }

    // Insert review with admin tracking
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        business_id,
        reviewer_id: consumerId,
        title,
        content,
        rating,
        experience_date: experience_date || null,
        media_urls: media_urls || [],
        is_approved: true,
        helpful_count: 0,
        unhelpful_count: 0,
        added_by_admin: true,
        admin_reviewer_id: adminId,
      })
      .select('id, business_id, reviewer_id, rating, title, content, created_at, added_by_admin, admin_reviewer_id')
      .single();

    if (insertError) {
      throw new AppError(`Failed to create review: ${insertError.message}`, 500);
    }

    // Update business metrics
    await updateBusinessMetrics(business_id);

    // Increment consumer review count
    await incrementConsumerReviewCount(consumerId);

    return newReview;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error creating review: ${error.message}`, 500);
  }
};

/**
 * Get rating distribution for a business (count of reviews per star rating)
 */
export const getRatingDistribution = async (businessId) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId)
      .eq('is_approved', true);

    if (error) {
      throw new AppError(`Failed to fetch reviews: ${error.message}`, 500);
    }

    // Initialize distribution
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    // Count reviews per rating
    reviews?.forEach(review => {
      if (distribution.hasOwnProperty(review.rating)) {
        distribution[review.rating]++;
      }
    });

    return distribution;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Error getting rating distribution: ${error.message}`, 500);
  }
};
