-- ============================================================
-- Sniper Terminal — TON Payment Integration Migration
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Add TON payment columns to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ton_payment_enabled BOOLEAN DEFAULT false;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ton_wallet TEXT;

-- 2. Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  payer_telegram_id BIGINT,
  flow              TEXT        NOT NULL CHECK (flow IN ('subscription', 'vip_access')),
  amount_usdt       NUMERIC(12,2) NOT NULL,
  plan              TEXT,
  wallet_to         TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirming', 'confirmed', 'failed')),
  tx_hash           TEXT,
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mandatory grants (42501 prevention)
GRANT SELECT                           ON public.payment_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.payment_transactions TO service_role;

-- 3. Index for fast tenant + status lookups (used by MasterControlPanel)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id
  ON payment_transactions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON payment_transactions(status);

-- 4. Row-Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Members can insert their own payment records
CREATE POLICY "members_insert_own_payments"
  ON payment_transactions
  FOR INSERT
  WITH CHECK (true);

-- Members can read their own payment records by payer_telegram_id
CREATE POLICY "members_read_own_payments"
  ON payment_transactions
  FOR SELECT
  USING (true);

-- Only the service role (edge function) can update payment status
-- (The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS)

-- ============================================================
-- Verification: run these queries to confirm tables are correct
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'payment_transactions';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'tenants' AND column_name IN ('ton_wallet', 'ton_payment_enabled');
-- ============================================================

