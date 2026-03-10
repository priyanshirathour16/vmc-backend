-- Migration 002: Add admin review tracking columns to reviews table
-- Run this in Supabase SQL editor or your DB management tool

-- Add column to track if review was submitted by admin on behalf of a consumer
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS added_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for filtering admin-submitted reviews
CREATE INDEX IF NOT EXISTS idx_added_by_admin ON reviews (added_by_admin);
CREATE INDEX IF NOT EXISTS idx_admin_reviewer_id ON reviews (admin_reviewer_id);

-- Comment
COMMENT ON COLUMN reviews.added_by_admin IS 'TRUE when an admin submitted this review on behalf of a consumer';
COMMENT ON COLUMN reviews.admin_reviewer_id IS 'The admin user who submitted this review on behalf of a consumer';
