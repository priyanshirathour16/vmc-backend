import express from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, authorizeRole } from '../middleware/auth.js';
import { supabase } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// All consumer routes require auth and consumer role
router.use(authMiddleware);
router.use(authorizeRole('consumer'));

/**
 * @GET /api/consumer/me
 * Get current consumer's full dashboard data:
 *   - User profile (users + profile_consumer tables)
 *   - Review stats (computed from reviews table)
 *   - Recent reviews with business name
 */
router.get('/me', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Fetch user profile + consumer profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      avatar_url,
      verified_email,
      is_active,
      created_at,
      profile_consumer (
        id,
        phone,
        location,
        country,
        bio,
        language,
        timezone,
        gender,
        notification_email,
        notification_push,
        notification_sms
      )
    `)
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new AppError('User not found', 404);
  }

  // 2. Fetch all reviews by this user (without join to avoid schema cache issues)
  const { data: reviews, error: reviewError } = await supabase
    .from('reviews')
    .select(`
      id,
      title,
      content,
      rating,
      helpful_count,
      unhelpful_count,
      created_at,
      is_approved,
      business_id
    `)
    .eq('reviewer_id', userId)
    .order('created_at', { ascending: false });

  if (reviewError) {
    throw new AppError(`Failed to fetch reviews: ${reviewError.message}`, 500);
  }

  const allReviews = reviews || [];

  // 2b. Fetch business names for those reviews (separate query — avoids schema cache join issues)
  const businessIds = [...new Set(allReviews.map(r => r.business_id).filter(Boolean))];
  let businessMap = {};
  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from('profile_business_owner')
      .select('id, business_name, city')
      .in('id', businessIds);
    if (businesses) {
      businesses.forEach(b => { businessMap[b.id] = b; });
    }
  }

  // Attach business info to each review
  const allReviewsWithBusiness = allReviews.map(r => ({
    ...r,
    business: businessMap[r.business_id] ?? null,
  }));

  // 3. Compute stats from reviews
  const totalReviews = allReviewsWithBusiness.length;
  const approvedReviews = allReviewsWithBusiness.filter(r => r.is_approved);
  const totalHelpful = allReviewsWithBusiness.reduce((sum, r) => sum + (r.helpful_count || 0), 0);
  const totalUnhelpful = allReviewsWithBusiness.reduce((sum, r) => sum + (r.unhelpful_count || 0), 0);
  const avgRating = totalReviews > 0
    ? parseFloat((allReviewsWithBusiness.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  // Count unique businesses reviewed
  const uniqueBusinessIds = new Set(allReviewsWithBusiness.map(r => r.business_id).filter(Boolean));
  const uniqueBusinesses = uniqueBusinessIds.size;

  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allReviewsWithBusiness.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating]++;
    }
  });

  res.json({
    status: 'success',
    data: {
      user,
      stats: {
        totalReviews,
        approvedReviews: approvedReviews.length,
        totalHelpful,
        totalUnhelpful,
        avgRating,
        uniqueBusinesses,
        ratingDistribution,
      },
      recentReviews: allReviewsWithBusiness.slice(0, 5),
    },
  });
}));

/**
 * @PUT /api/consumer/profile
 * Update the consumer's profile (users.name + profile_consumer fields).
 * Body: { name, phone, bio, date_of_birth, gender, location, country,
 *         language, timezone,
 *         notification_email, notification_push, notification_sms, marketing_emails,
 *         show_profile, show_email }
 */
router.put('/profile', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const {
    name,
    phone, bio, date_of_birth, gender, location, country,
    language, timezone,
    notification_email, notification_push, notification_sms, marketing_emails,
    show_profile, show_email,
  } = req.body;

  // 1. Update users.name if provided
  if (name !== undefined) {
    const trimmedName = (name ?? '').trim();
    if (trimmedName.length < 2) {
      throw new AppError('Name must be at least 2 characters', 400);
    }
    const { error: nameErr } = await supabase
      .from('users')
      .update({ name: trimmedName, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (nameErr) throw new AppError('Failed to update name', 500);
  }

  // 2. Build profile_consumer update payload (only include defined keys)
  const profileUpdate = {};
  if (phone          !== undefined) profileUpdate.phone          = phone          || null;
  if (bio            !== undefined) profileUpdate.bio            = bio            || null;
  if (date_of_birth  !== undefined) profileUpdate.date_of_birth  = date_of_birth  || null;
  if (gender         !== undefined) profileUpdate.gender         = gender         || null;
  if (location       !== undefined) profileUpdate.location       = location       || null;
  if (country        !== undefined) profileUpdate.country        = country        || null;
  if (language       !== undefined) profileUpdate.language       = language       || 'en';
  if (timezone       !== undefined) profileUpdate.timezone       = timezone       || null;
  if (notification_email  !== undefined) profileUpdate.notification_email  = Boolean(notification_email);
  if (notification_push   !== undefined) profileUpdate.notification_push   = Boolean(notification_push);
  if (notification_sms    !== undefined) profileUpdate.notification_sms    = Boolean(notification_sms);
  if (marketing_emails    !== undefined) profileUpdate.marketing_emails    = Boolean(marketing_emails);
  if (show_profile   !== undefined) profileUpdate.show_profile   = Boolean(show_profile);
  if (show_email     !== undefined) profileUpdate.show_email     = Boolean(show_email);

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updated_at = new Date().toISOString();

    // Upsert — profile_consumer row may not exist for older accounts
    const { error: profileErr } = await supabase
      .from('profile_consumer')
      .upsert({ user_id: userId, ...profileUpdate }, { onConflict: 'user_id' });

    if (profileErr) throw new AppError('Failed to update profile', 500);
  }

  res.json({ status: 'success', message: 'Profile updated successfully' });
}));

/**
 * @POST /api/consumer/change-password
 * Change password after verifying current password.
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required', 400);
  }
  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400);
  }

  // Fetch current hash
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (fetchErr || !user) throw new AppError('User not found', 404);

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new AppError('Current password is incorrect', 400);

  // Prevent reuse of the same password
  const isSame = await bcrypt.compare(newPassword, user.password_hash);
  if (isSame) throw new AppError('New password must be different from current password', 400);

  // Hash and store new password
  const newHash = await bcrypt.hash(newPassword, 10);
  const { error: updateErr } = await supabase
    .from('users')
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateErr) throw new AppError('Failed to update password', 500);

  res.json({ status: 'success', message: 'Password changed successfully' });
}));

export default router;
