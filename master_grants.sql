-- ============================================================
-- SNIPER TERMINAL — MASTER GRANT RULES
-- Mandatory from May 30 2026 (Supabase policy change)
-- Without these: error 42501 "permission denied for table X"
--
-- Safe to re-run any number of times (idempotent).
-- Tables that do not yet exist are silently skipped.
-- ============================================================

DO $$
DECLARE
  t TEXT;

  -- ── Complete table inventory ──────────────────────────────
  -- Sources: database_schema.sql, supabase_migration.sql,
  --          ton_payment_migrations.sql, payment_migrations.sql,
  --          access_requests_migration.sql,
  --          access_decoupling_migration.sql,
  --          recalibrate_member_limits.sql
  -- ─────────────────────────────────────────────────────────
  tables TEXT[] := ARRAY[
    -- ── Core ──────────────────────────────────────────────
    'tenants',
    'tenants_config',

    -- ── Trading ───────────────────────────────────────────
    'signals',
    'live_positions',
    'watch_alerts',

    -- ── Members / Auth ────────────────────────────────────
    'affiliates',
    'members',
    'access_requests',

    -- ── Academy ───────────────────────────────────────────
    'academy_modules',
    'academy_lessons',
    'modules',
    'lessons',

    -- ── Payments ──────────────────────────────────────────
    'payment_transactions',
    'payment_intents',
    'user_subscriptions',
    'invoices',

    -- ── Platform / Misc ───────────────────────────────────
    'app_settings',
    'mentor_badges',
    'plan_defaults',
    'referral_commissions',
    'platform_events',
    'timeline_events',
    'notifications'
  ];

BEGIN
  FOREACH t IN ARRAY tables LOOP

    IF EXISTS (
      SELECT 1
      FROM   information_schema.tables
      WHERE  table_schema = 'public'
        AND  table_name   = t
    ) THEN

      -- anon: read-only (public data, still gated by RLS)
      EXECUTE format(
        'GRANT SELECT ON public.%I TO anon', t
      );

      -- authenticated: full CRUD (RLS enforces row-level access)
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t
      );

      -- service_role: full CRUD (bypasses RLS — used by Edge Functions)
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t
      );

      RAISE NOTICE '✅  GRANTs applied  →  %', t;

    ELSE
      RAISE NOTICE '⏭️   Table not found (skipped)  →  %', t;
    END IF;

  END LOOP;
END $$;


-- ============================================================
-- SEQUENCE GRANTS
-- Serial / identity columns need USAGE on their sequences
-- so authenticated users can INSERT without error 42501.
-- ============================================================
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN
    SELECT sequence_schema, sequence_name
    FROM   information_schema.sequences
    WHERE  sequence_schema = 'public'
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO authenticated',
      seq.sequence_schema, seq.sequence_name
    );
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO service_role',
      seq.sequence_schema, seq.sequence_name
    );
    RAISE NOTICE '🔢  Sequence GRANTs applied  →  %.%',
      seq.sequence_schema, seq.sequence_name;
  END LOOP;
END $$;


-- ============================================================
-- STORAGE BUCKET GRANTS
-- Edge Functions and authenticated users need object access.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    -- anon: public read from open buckets (controlled by bucket policy)
    GRANT SELECT ON storage.objects TO anon;

    -- authenticated: full object management
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO service_role;

    -- Bucket metadata
    GRANT SELECT ON storage.buckets TO anon;
    GRANT SELECT ON storage.buckets TO authenticated;
    GRANT SELECT ON storage.buckets TO service_role;

    RAISE NOTICE '🗄️  Storage GRANTs applied';
  ELSE
    RAISE NOTICE '⏭️  storage.objects not found — skipped';
  END IF;
END $$;


-- ============================================================
-- VERIFICATION QUERY
-- Run this after the block above to confirm every table
-- received its three-role grant set.
-- ============================================================
SELECT
  t.table_name,
  g.grantee,
  string_agg(g.privilege_type, ', ' ORDER BY g.privilege_type) AS privileges
FROM information_schema.tables t
LEFT JOIN information_schema.role_table_grants g
       ON g.table_name   = t.table_name
      AND g.table_schema = t.table_schema
      AND g.grantee IN ('anon', 'authenticated', 'service_role')
WHERE t.table_schema = 'public'
GROUP BY t.table_name, g.grantee
ORDER BY t.table_name, g.grantee;
