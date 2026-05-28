-- SQL Migration: Plan Restriction System
-- Ensure columns and types exist on public.tenants

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'
  CHECK (plan IN ('free', 'basic', 'premium', 'empire', 'pause'));

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS custom_accent_color TEXT;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS hide_sniper_badge BOOLEAN DEFAULT true;

-- GRANTS (Supabase May 30 2026 requirement)
GRANT SELECT ON public.tenants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO service_role;
