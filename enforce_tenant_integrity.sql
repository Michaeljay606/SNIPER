-- ============================================================
-- Ephata Tech — Tenant Integrity Hardening
-- This script creates triggers to prevent malicious tenant_id injection.
-- It ensures a user can ONLY insert data for their assigned tenant.
-- ============================================================

-- 1. Create the Enforcement Function
CREATE OR REPLACE FUNCTION public.enforce_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  v_authorized_tenant_id TEXT;
  v_current_role TEXT;
BEGIN
  -- Get current role
  v_current_role := current_setting('role', true);

  -- Bypass check for service_role (Admin / Edge Functions / Internal Supabase tasks)
  IF v_current_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Get the tenant_id associated with the current auth.uid()
  -- Note: We use SECURITY DEFINER to allow the function to read the affiliates table 
  -- even if the user doesn't have direct SELECT permissions there.
  SELECT tenant_id INTO v_authorized_tenant_id
  FROM public.affiliates
  WHERE id = auth.uid();

  -- Special case for 'affiliates' table: 
  -- When a user is first creating their affiliate record, v_authorized_tenant_id will be NULL.
  -- We allow the insert but we should verify the tenant_id exists.
  IF TG_TABLE_NAME = 'affiliates' AND v_authorized_tenant_id IS NULL THEN
     IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'tenant_id is required for registration';
     END IF;
     -- Ensure the tenant exists
     IF NOT EXISTS (SELECT 1 FROM tenants WHERE tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Invalid tenant_id: %', NEW.tenant_id;
     END IF;
     RETURN NEW;
  END IF;

  -- Validation Logic for all other multi-tenant tables
  IF v_authorized_tenant_id IS NOT NULL THEN
    -- If NEW.tenant_id is missing, auto-fill it from the user's profile
    IF NEW.tenant_id IS NULL THEN
      NEW.tenant_id := v_authorized_tenant_id;
    -- If NEW.tenant_id is provided but different from the user's tenant, block it!
    ELSIF NEW.tenant_id <> v_authorized_tenant_id THEN
      RAISE EXCEPTION 'Security Violation: Tenant ID mismatch. Expected %, got %', v_authorized_tenant_id, NEW.tenant_id;
    END IF;
  ELSE
    -- If no tenant association found and not service_role, deny the operation
    RAISE EXCEPTION 'Security Violation: User profile (affiliate) not found or not linked to a tenant.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply Triggers to Tables (Safe Block)
-- We check if each table exists before trying to create the trigger.
DO $$
BEGIN
  -- Signals
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'signals') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_signals ON signals;
    CREATE TRIGGER tr_enforce_tenant_id_signals BEFORE INSERT ON signals FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- Academy Modules
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'academy_modules') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_academy_modules ON academy_modules;
    CREATE TRIGGER tr_enforce_tenant_id_academy_modules BEFORE INSERT ON academy_modules FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- Academy Lessons
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'academy_lessons') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_academy_lessons ON academy_lessons;
    CREATE TRIGGER tr_enforce_tenant_id_academy_lessons BEFORE INSERT ON academy_lessons FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- Live Positions
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_positions') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_live_positions ON live_positions;
    CREATE TRIGGER tr_enforce_tenant_id_live_positions BEFORE INSERT ON live_positions FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- App Settings
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_settings') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_app_settings ON app_settings;
    CREATE TRIGGER tr_enforce_tenant_id_app_settings BEFORE INSERT ON app_settings FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- Mentor Badges
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mentor_badges') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_mentor_badges ON mentor_badges;
    CREATE TRIGGER tr_enforce_tenant_id_mentor_badges BEFORE INSERT ON mentor_badges FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- Payment Transactions
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_payment_transactions ON payment_transactions;
    CREATE TRIGGER tr_enforce_tenant_id_payment_transactions BEFORE INSERT ON payment_transactions FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- User Subscriptions
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_user_subscriptions ON user_subscriptions;
    CREATE TRIGGER tr_enforce_tenant_id_user_subscriptions BEFORE INSERT ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;

  -- Affiliates
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliates') THEN
    DROP TRIGGER IF EXISTS tr_enforce_tenant_id_affiliates ON affiliates;
    CREATE TRIGGER tr_enforce_tenant_id_affiliates BEFORE INSERT ON affiliates FOR EACH ROW EXECUTE FUNCTION enforce_tenant_id();
  END IF;
END $$;

-- 3. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
