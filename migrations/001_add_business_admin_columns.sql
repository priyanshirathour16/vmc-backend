-- Migration: Add admin business registration tracking columns
-- Date: March 7, 2026
-- Purpose: Track whether business was created by owner or admin

-- Check if columns exist before adding (PostgreSQL safe script)
DO $$
BEGIN
  -- Add created_by_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profile_business_owner' AND column_name='created_by_type'
  ) THEN
    ALTER TABLE profile_business_owner 
    ADD COLUMN created_by_type VARCHAR(10) DEFAULT 'owner' CHECK (created_by_type IN ('owner', 'admin'));
  END IF;
  
  -- Add admin_created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profile_business_owner' AND column_name='admin_created_by'
  ) THEN
    ALTER TABLE profile_business_owner 
    ADD COLUMN admin_created_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add is_published column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profile_business_owner' AND column_name='is_published'
  ) THEN
    ALTER TABLE profile_business_owner 
    ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;

  RAISE NOTICE 'Migration: Business admin columns added successfully';
END $$;

-- Create index for faster admin-created business queries
CREATE INDEX IF NOT EXISTS idx_profile_business_owner_created_by_type 
ON profile_business_owner(created_by_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_business_owner_admin_created_by 
ON profile_business_owner(admin_created_by) WHERE admin_created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_business_owner_is_published 
ON profile_business_owner(is_published, created_at DESC);
