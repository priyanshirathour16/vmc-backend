import express from 'express';
import { asyncHandler, AppError } from '../../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../../middleware/auth.js';
import { supabase } from '../../config/db.js';

const router = express.Router();

/**
 * @GET /api/admin/dashboard
 * Admin dashboard summary data + latest 5 reviews across all businesses
 */
router.get(
  '/',
  authMiddleware,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const [
      totalBusinessesRes,
      publishedBusinessesRes,
      pendingBusinessesRes,
      totalConsumersRes,
      pendingReviewsRes,
      recentReviewsRes,
    ] = await Promise.all([
      supabase.from('profile_business_owner').select('id', { count: 'exact', head: true }),
      supabase.from('profile_business_owner').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profile_business_owner').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'consumer'),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('reviews')
        .select('id, business_id, reviewer_id, title, content, rating, status, is_approved, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const queryErrors = [
      totalBusinessesRes.error,
      publishedBusinessesRes.error,
      pendingBusinessesRes.error,
      totalConsumersRes.error,
      pendingReviewsRes.error,
      recentReviewsRes.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      throw new AppError(`Failed to load admin dashboard: ${queryErrors[0].message}`, 500);
    }

    const recentRows = recentReviewsRes.data || [];

    const businessIds = [...new Set(recentRows.map((review) => review.business_id).filter(Boolean))];
    const reviewerIds = [...new Set(recentRows.map((review) => review.reviewer_id).filter(Boolean))];

    const [businessLookupRes, reviewerLookupRes] = await Promise.all([
      businessIds.length > 0
        ? supabase
            .from('profile_business_owner')
            .select('id, business_name')
            .in('id', businessIds)
        : Promise.resolve({ data: [], error: null }),
      reviewerIds.length > 0
        ? supabase
            .from('users')
            .select('id, name')
            .in('id', reviewerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (businessLookupRes.error) {
      throw new AppError(`Failed to load admin dashboard: ${businessLookupRes.error.message}`, 500);
    }

    if (reviewerLookupRes.error) {
      throw new AppError(`Failed to load admin dashboard: ${reviewerLookupRes.error.message}`, 500);
    }

    const businessNameById = Object.fromEntries(
      (businessLookupRes.data || []).map((biz) => [biz.id, biz.business_name])
    );

    const reviewerNameById = Object.fromEntries(
      (reviewerLookupRes.data || []).map((reviewer) => [reviewer.id, reviewer.name])
    );

    const recentReviews = recentRows.map((review) => ({
      id: review.id,
      business_id: review.business_id,
      business_name: businessNameById[review.business_id] || 'Unknown Business',
      reviewer_name: reviewerNameById[review.reviewer_id] || 'Unknown Reviewer',
      rating: review.rating,
      title: review.title || '',
      content: review.content || '',
      status: review.status || (review.is_approved ? 'approved' : 'pending'),
      created_at: review.created_at,
    }));

    res.json({
      status: 'success',
      data: {
        summary: {
          totalBusinesses: totalBusinessesRes.count || 0,
          publishedBusinesses: publishedBusinessesRes.count || 0,
          pendingBusinesses: pendingBusinessesRes.count || 0,
          totalConsumers: totalConsumersRes.count || 0,
          pendingReviews: pendingReviewsRes.count || 0,
        },
        recentReviews,
      },
    });
  })
);

export default router;
