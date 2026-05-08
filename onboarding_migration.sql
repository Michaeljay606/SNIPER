-- ============================================================
-- Ephata Tech — Onboarding State Tracking
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step      integer DEFAULT 1;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
