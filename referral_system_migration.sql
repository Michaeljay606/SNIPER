-- Sniper Terminal — recurring mentor referral credits
-- credit_balance and referral_events amounts are stored in cents.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_balance INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS referral_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  referred_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  month_number INT NOT NULL CHECK (month_number BETWEEN 1 AND 12),
  amount_cents INT NOT NULL,
  plan_at_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id, month_number)
);

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code :=
      UPPER(SUBSTRING(NEW.tenant_id, 1, 4))
      || UPPER(SUBSTRING(MD5(NEW.tenant_id::TEXT), 1, 4));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON tenants;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

UPDATE tenants
  SET referral_code =
    UPPER(SUBSTRING(tenant_id, 1, 4))
    || UPPER(SUBSTRING(MD5(tenant_id), 1, 4))
WHERE referral_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_referral_events_referrer_status
  ON referral_events(referrer_id, status);

CREATE INDEX IF NOT EXISTS idx_referral_events_referred
  ON referral_events(referred_id);

GRANT SELECT, INSERT, UPDATE
  ON public.referral_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.referral_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.referral_events TO service_role;
