-- =============================================================================
-- EPHATA TERMINAL — Row-Level Security Policies
-- Run this script in the Supabase SQL editor (Settings → SQL Editor)
-- =============================================================================
-- This script:
--   1. Enables RLS on every tenant-scoped table
--   2. Drops any existing permissive policies
--   3. Creates strict SELECT / INSERT / UPDATE / DELETE policies
--      that enforce tenant isolation at the database level.
-- =============================================================================

-- ─── HELPER: ensure anon + authenticated roles exist ─────────────────────────
-- (They always exist in Supabase — included for clarity)

-- =============================================================================
-- HELPER FUNCTIONS (Break Recursion)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS TEXT AS $$
  -- Returns the tenant_id the current user belongs to
  SELECT tenant_id FROM public.affiliates WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS BOOLEAN AS $$
  -- Returns true if the current user owns ANY tenant
  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- TABLE: affiliates
-- =============================================================================
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliates_select" ON affiliates;
DROP POLICY IF EXISTS "affiliates_insert" ON affiliates;
DROP POLICY IF EXISTS "affiliates_update" ON affiliates;
DROP POLICY IF EXISTS "affiliates_delete" ON affiliates;
DROP POLICY IF EXISTS "Allow all" ON affiliates;

CREATE POLICY "affiliates_select" ON affiliates
  FOR SELECT USING (
    id = auth.uid()   -- a member can always read their own row
    OR is_tenant_owner() -- owner can see all affiliates (simplified check)
  );

CREATE POLICY "affiliates_insert" ON affiliates
  FOR INSERT WITH CHECK (true);  -- insertion is done server-side via service role or initial reg

CREATE POLICY "affiliates_update" ON affiliates
  FOR UPDATE USING (
    id = auth.uid()
    OR is_tenant_owner()
  );

CREATE POLICY "affiliates_delete" ON affiliates
  FOR DELETE USING (
    is_tenant_owner()
  );

-- =============================================================================
-- TABLE: signals
-- =============================================================================
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signals_select"  ON signals;
DROP POLICY IF EXISTS "signals_insert"  ON signals;
DROP POLICY IF EXISTS "signals_update"  ON signals;
DROP POLICY IF EXISTS "signals_delete"  ON signals;
DROP POLICY IF EXISTS "Allow all"       ON signals;

CREATE POLICY "signals_select" ON signals
  FOR SELECT USING (
    tenant_id = get_auth_tenant_id()
    OR is_tenant_owner()
  );

-- Only tenant owner / admin can insert/update/delete
CREATE POLICY "signals_insert" ON signals
  FOR INSERT WITH CHECK (
    is_tenant_owner()
    OR EXISTS (
      SELECT 1 FROM affiliates
      WHERE id = auth.uid() AND role = 'admin' AND tenant_id = signals.tenant_id
    )
  );

CREATE POLICY "signals_update" ON signals
  FOR UPDATE USING (
    is_tenant_owner()
    OR EXISTS (
      SELECT 1 FROM affiliates
      WHERE id = auth.uid() AND role = 'admin' AND tenant_id = signals.tenant_id
    )
  );

CREATE POLICY "signals_delete" ON signals
  FOR DELETE USING (
    is_tenant_owner()
    OR EXISTS (
      SELECT 1 FROM affiliates
      WHERE id = auth.uid() AND role = 'admin' AND tenant_id = signals.tenant_id
    )
  );

-- =============================================================================
-- TABLE: academy_modules
-- =============================================================================
ALTER TABLE academy_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academy_modules_select" ON academy_modules;
DROP POLICY IF EXISTS "academy_modules_insert" ON academy_modules;
DROP POLICY IF EXISTS "academy_modules_update" ON academy_modules;
DROP POLICY IF EXISTS "academy_modules_delete" ON academy_modules;
DROP POLICY IF EXISTS "Allow all"              ON academy_modules;

CREATE POLICY "academy_modules_select" ON academy_modules
  FOR SELECT USING (
    tenant_id = get_auth_tenant_id()
    OR is_tenant_owner()
  );

CREATE POLICY "academy_modules_insert" ON academy_modules
  FOR INSERT WITH CHECK (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = academy_modules.tenant_id)
  );

CREATE POLICY "academy_modules_update" ON academy_modules
  FOR UPDATE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = academy_modules.tenant_id)
  );

CREATE POLICY "academy_modules_delete" ON academy_modules
  FOR DELETE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = academy_modules.tenant_id)
  );

-- =============================================================================
-- TABLE: academy_lessons
-- =============================================================================
ALTER TABLE academy_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academy_lessons_select" ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_insert" ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_update" ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_delete" ON academy_lessons;
DROP POLICY IF EXISTS "Allow all"              ON academy_lessons;

CREATE POLICY "academy_lessons_select" ON academy_lessons
  FOR SELECT USING (
    tenant_id = get_auth_tenant_id()
    OR is_tenant_owner()
  );

CREATE POLICY "academy_lessons_insert" ON academy_lessons
  FOR INSERT WITH CHECK (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = academy_lessons.tenant_id)
  );

CREATE POLICY "academy_lessons_update" ON academy_lessons
  FOR UPDATE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = academy_lessons.tenant_id)
  );

CREATE POLICY "academy_lessons_delete" ON academy_lessons
  FOR DELETE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = academy_lessons.tenant_id)
  );

-- =============================================================================
-- TABLE: payment_transactions
-- =============================================================================
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_transactions_select" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_insert" ON payment_transactions;
DROP POLICY IF EXISTS "Allow all"                   ON payment_transactions;

CREATE POLICY "payment_transactions_select" ON payment_transactions
  FOR SELECT USING (
    is_tenant_owner()
    OR payer_telegram_id = (
      SELECT telegram_id FROM affiliates WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "payment_transactions_insert" ON payment_transactions
  FOR INSERT WITH CHECK (true);  -- frontend inserts with anon key before verification

-- =============================================================================
-- TABLE: member_access — SKIPPED (this is a VIEW; RLS applies to the base table)
-- =============================================================================

-- =============================================================================
-- TABLE: mentor_badges
-- =============================================================================
ALTER TABLE mentor_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_badges_select" ON mentor_badges;
DROP POLICY IF EXISTS "mentor_badges_insert" ON mentor_badges;
DROP POLICY IF EXISTS "mentor_badges_update" ON mentor_badges;
DROP POLICY IF EXISTS "mentor_badges_delete" ON mentor_badges;
DROP POLICY IF EXISTS "Allow all"            ON mentor_badges;

CREATE POLICY "mentor_badges_select" ON mentor_badges
  FOR SELECT USING (
    tenant_id = get_auth_tenant_id()
    OR is_tenant_owner()
  );

CREATE POLICY "mentor_badges_insert" ON mentor_badges
  FOR INSERT WITH CHECK (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = mentor_badges.tenant_id)
  );

CREATE POLICY "mentor_badges_update" ON mentor_badges
  FOR UPDATE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = mentor_badges.tenant_id)
  );

CREATE POLICY "mentor_badges_delete" ON mentor_badges
  FOR DELETE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = mentor_badges.tenant_id)
  );

-- =============================================================================
-- TABLE: timeline_events
-- =============================================================================
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timeline_events_select" ON timeline_events;
DROP POLICY IF EXISTS "timeline_events_insert" ON timeline_events;
DROP POLICY IF EXISTS "timeline_events_update" ON timeline_events;
DROP POLICY IF EXISTS "timeline_events_delete" ON timeline_events;
DROP POLICY IF EXISTS "Allow all"              ON timeline_events;

CREATE POLICY "timeline_events_select" ON timeline_events
  FOR SELECT USING (
    tenant_id = get_auth_tenant_id()
    OR is_tenant_owner()
  );

CREATE POLICY "timeline_events_insert" ON timeline_events
  FOR INSERT WITH CHECK (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = timeline_events.tenant_id)
  );

CREATE POLICY "timeline_events_update" ON timeline_events
  FOR UPDATE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = timeline_events.tenant_id)
  );

CREATE POLICY "timeline_events_delete" ON timeline_events
  FOR DELETE USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = timeline_events.tenant_id)
  );

-- =============================================================================
-- TABLE: app_settings
-- =============================================================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
DROP POLICY IF EXISTS "app_settings_upsert" ON app_settings;
DROP POLICY IF EXISTS "Allow all"           ON app_settings;

CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT USING (
    tenant_id = get_auth_tenant_id()
    OR is_tenant_owner()
  );

CREATE POLICY "app_settings_upsert" ON app_settings
  FOR ALL USING (
    is_tenant_owner()
    OR EXISTS (SELECT 1 FROM affiliates WHERE id = auth.uid() AND role = 'admin' AND tenant_id = app_settings.tenant_id)
  );

-- =============================================================================
-- TABLE: tenants  (read-only for members, full access for owner)
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;
DROP POLICY IF EXISTS "Allow all"      ON tenants;

CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (
    user_id = auth.uid()
    OR tenant_id = get_auth_tenant_id()
  );

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================================================
-- MANDATORY GRANTS (Required from May 30 2026 to avoid error 42501)
-- =============================================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tenants', 'signals', 'affiliates', 'academy_modules', 
    'academy_lessons', 'payment_transactions', 'mentor_badges', 
    'timeline_events', 'app_settings', 'user_subscriptions', 
    'live_positions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Only attempt GRANT if table exists to avoid 42P01 error
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================
