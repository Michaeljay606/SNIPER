-- Platform Directive v1.8 — Decoupled Signals & Academy Access Logic

-- 1. Extend tenants table with per-section duration models
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS signals_duration_model  text DEFAULT 'monthly'
    CHECK (signals_duration_model IN ('lifetime', 'monthly', 'fixed')),
  ADD COLUMN IF NOT EXISTS signals_fixed_months    integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signals_price           text,

  ADD COLUMN IF NOT EXISTS academy_duration_model  text DEFAULT 'lifetime'
    CHECK (academy_duration_model IN ('lifetime', 'monthly', 'fixed')),
  ADD COLUMN IF NOT EXISTS academy_fixed_months    integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS academy_price           text,

  ADD COLUMN IF NOT EXISTS grant_all_on_payment    boolean DEFAULT false;

-- 2. Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  signals_active       boolean DEFAULT false,
  signals_expires_at   timestamptz,
  
  academy_active       boolean DEFAULT false,
  academy_expires_at   timestamptz,
  academy_is_lifetime  boolean DEFAULT false,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, member_id)
);

-- 3. Migrate existing data from affiliates to user_subscriptions
-- We assume if is_vip is true, both signals and academy are active (as it was before decoupling)
-- For existing data, we'll set academy to lifetime and signals to null expiry (or now + 1 month)
INSERT INTO user_subscriptions (tenant_id, member_id, signals_active, academy_active, academy_is_lifetime)
SELECT 
  tenant_id, 
  id as member_id, 
  is_vip as signals_active, 
  is_vip as academy_active, 
  is_vip as academy_is_lifetime
FROM affiliates
ON CONFLICT (tenant_id, member_id) DO NOTHING;

-- 4. Computed access view — single source of truth
CREATE OR REPLACE VIEW member_access AS
SELECT
  a.*,
  -- Signals: active only if not expired AND account status is active
  (us.signals_active AND a.status = 'active' AND (
    us.signals_expires_at IS NULL OR
    us.signals_expires_at > now()
  )) AS can_access_signals,

  -- Academy: active if (lifetime OR not yet expired) AND account status is active
  (us.academy_active AND a.status = 'active' AND (
    us.academy_is_lifetime = true OR
    us.academy_expires_at IS NULL OR
    us.academy_expires_at > now()
  )) AS can_access_academy,
  
  us.signals_active,
  us.signals_expires_at,
  us.academy_active,
  us.academy_expires_at,
  us.academy_is_lifetime

FROM user_subscriptions us
JOIN affiliates a ON us.member_id = a.id AND us.tenant_id = a.tenant_id;

-- Enable RLS on user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for user_subscriptions" ON user_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Mandatory grants
GRANT SELECT ON public.user_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO service_role;

-- 5. SQL implementation of grantAccess (for Edge Functions & DB triggers)
CREATE OR REPLACE FUNCTION grant_member_access(
  p_tenant_id TEXT,
  p_member_id UUID,
  p_section TEXT -- 'signals' or 'academy'
) RETURNS VOID AS $$
DECLARE
  v_signals_duration_model TEXT;
  v_signals_fixed_months INT;
  v_academy_duration_model TEXT;
  v_academy_fixed_months INT;
  v_grant_all_on_payment BOOLEAN;
  v_now TIMESTAMPTZ := NOW();
  v_signals_expires_at TIMESTAMPTZ;
  v_academy_expires_at TIMESTAMPTZ;
  v_academy_is_lifetime BOOLEAN := FALSE;
BEGIN
  -- Get tenant config
  SELECT 
    signals_duration_model, COALESCE(signals_fixed_months, 1),
    academy_duration_model, COALESCE(academy_fixed_months, 1),
    COALESCE(grant_all_on_payment, false)
  INTO 
    v_signals_duration_model, v_signals_fixed_months,
    v_academy_duration_model, v_academy_fixed_months,
    v_grant_all_on_payment
  FROM tenants
  WHERE tenant_id = p_tenant_id;

  -- Signals Logic
  IF p_section = 'signals' OR v_grant_all_on_payment THEN
    CASE COALESCE(v_signals_duration_model, 'monthly')
      WHEN 'lifetime' THEN v_signals_expires_at := NULL;
      WHEN 'monthly' THEN v_signals_expires_at := v_now + INTERVAL '1 month';
      WHEN 'fixed' THEN v_signals_expires_at := v_now + (v_signals_fixed_months || ' months')::INTERVAL;
      ELSE v_signals_expires_at := v_now + INTERVAL '1 month';
    END CASE;
    
    INSERT INTO user_subscriptions (tenant_id, member_id, signals_active, signals_expires_at, updated_at)
    VALUES (p_tenant_id, p_member_id, TRUE, v_signals_expires_at, v_now)
    ON CONFLICT (tenant_id, member_id) DO UPDATE SET
      signals_active = TRUE,
      signals_expires_at = v_signals_expires_at,
      updated_at = v_now;
  END IF;

  -- Academy Logic
  IF p_section = 'academy' OR v_grant_all_on_payment THEN
    CASE COALESCE(v_academy_duration_model, 'lifetime')
      WHEN 'lifetime' THEN 
        v_academy_is_lifetime := TRUE;
        v_academy_expires_at := NULL;
      WHEN 'monthly' THEN 
        v_academy_is_lifetime := FALSE;
        v_academy_expires_at := v_now + INTERVAL '1 month';
      WHEN 'fixed' THEN 
        v_academy_is_lifetime := FALSE;
        v_academy_expires_at := v_now + (v_academy_fixed_months || ' months')::INTERVAL;
      ELSE 
        v_academy_is_lifetime := TRUE;
        v_academy_expires_at := NULL;
    END CASE;

    INSERT INTO user_subscriptions (tenant_id, member_id, academy_active, academy_expires_at, academy_is_lifetime, updated_at)
    VALUES (p_tenant_id, p_member_id, TRUE, v_academy_expires_at, v_academy_is_lifetime, v_now)
    ON CONFLICT (tenant_id, member_id) DO UPDATE SET
      academy_active = TRUE,
      academy_expires_at = v_academy_expires_at,
      academy_is_lifetime = v_academy_is_lifetime,
      updated_at = v_now;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Automated expiry processing
CREATE OR REPLACE FUNCTION process_expired_subscriptions()
RETURNS VOID AS $$
BEGIN
  -- We don't necessarily need to "delete" or "set active=false" if we use the member_access view,
  -- because the view already checks expires_at > now().
  -- However, for performance and clarity, we can periodically sync the boolean flags.
  
  -- Inactivate expired signals
  UPDATE user_subscriptions
  SET signals_active = false, updated_at = now()
  WHERE signals_active = true 
    AND signals_expires_at IS NOT NULL 
    AND signals_expires_at < now();

  -- Inactivate expired academy (if not lifetime)
  UPDATE user_subscriptions
  SET academy_active = false, updated_at = now()
  WHERE academy_active = true 
    AND academy_is_lifetime = false
    AND academy_expires_at IS NOT NULL 
    AND academy_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real environment, you would schedule this via pg_cron:
-- SELECT cron.schedule('0 * * * *', 'SELECT process_expired_subscriptions()');
