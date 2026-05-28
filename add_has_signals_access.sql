-- ============================================================
-- Sniper Terminal — Add has_signals_access column to affiliates
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add has_signals_access column to affiliates table
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS has_signals_access BOOLEAN DEFAULT false;

-- 2. Migrate existing VIP users: give them full access by default
UPDATE affiliates 
SET 
  has_signals_access = true,
  has_academy_access = true
WHERE is_vip = true;

-- ============================================================
-- MANDATORY SUPABASE GRANT RULES (required from May 30 2026)
-- Without these, Supabase returns error 42501 (Permission Denied)
-- ============================================================
GRANT SELECT                         ON public.affiliates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO service_role;

-- Reload PostgREST schema cache so changes take effect immediately
NOTIFY pgrst, 'reload schema';
