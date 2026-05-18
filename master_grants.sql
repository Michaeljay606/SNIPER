-- ============================================================
-- MASTER GRANTS FILE — Supabase (mandatory from May 30 2026)
-- VERSION SÉCURISÉE : ignore les tables qui n'existent pas encore
-- Erreur 42P01 (relation does not exist) → gérée automatiquement
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'tenants',
    'tenants_config',
    'signals',
    'members',
    'affiliates',
    'user_subscriptions',
    'payment_transactions',
    'payment_intents',
    'invoices',
    'access_requests',
    'academy_modules',
    'academy_lessons',
    'lessons',
    'modules',
    'live_positions',
    'app_settings',
    'mentor_badges',
    'plan_defaults',
    'referral_commissions',
    'platform_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Vérifier si la table existe avant d'appliquer les GRANTs
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
      RAISE NOTICE '✅ GRANTs appliqués sur : %', t;
    ELSE
      RAISE NOTICE '⏭️  Table ignorée (n''existe pas) : %', t;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Vérification : affiche les tables qui ont reçu les GRANTs
-- ============================================================
SELECT
  table_name,
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
  AND table_name IN (
    'tenants','tenants_config','signals','members','affiliates',
    'user_subscriptions','payment_transactions','payment_intents',
    'invoices','access_requests','academy_modules','academy_lessons',
    'lessons','modules','live_positions','app_settings',
    'mentor_badges','plan_defaults','referral_commissions','platform_events'
  )
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
