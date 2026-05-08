-- ============================================================
-- OnyxTech — Plan System Migration
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Drop old plan constraint, add 5-tier + pause
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_plan_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free', 'basic', 'premium', 'empire', 'pause'));

-- 2. Member limit column
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 50;

-- 3. Feature flags
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS show_analytics BOOLEAN DEFAULT false;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS white_label BOOLEAN DEFAULT false;

-- 4. Onboarding flag
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- 5. Set correct limits for existing rows
UPDATE tenants SET max_members = 999999 WHERE plan = 'empire';
UPDATE tenants SET max_members = 200    WHERE plan = 'premium';
UPDATE tenants SET max_members = 50     WHERE plan = 'basic';
UPDATE tenants SET max_members = 10     WHERE plan = 'free';

-- 6. Mark existing tenants as onboarding complete (they already set up)
UPDATE tenants SET onboarding_complete = true WHERE plan != 'free';
