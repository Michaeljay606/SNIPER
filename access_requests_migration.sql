-- ============================================================
-- Sniper Terminal — Access Requests Sprint Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── 1. access_requests table ────────────────────────────────
CREATE TABLE IF NOT EXISTS access_requests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  member_telegram_id BIGINT NOT NULL,
  member_username   TEXT,
  request_type      TEXT NOT NULL CHECK (request_type IN (
    'vip_payment', 'vip_broker', 'academy_payment', 'academy_broker'
  )),
  access_target     TEXT NOT NULL CHECK (access_target IN ('signals', 'academy', 'both')),
  payment_method    TEXT CHECK (payment_method IN (
    'ton_usdt', 'manual_telegram', 'broker_affiliation'
  )),
  amount            NUMERIC(10,2),
  currency          TEXT DEFAULT 'USDT',
  tx_hash           TEXT,
  broker_name       TEXT,
  broker_account_id TEXT,
  plan_label        TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  admin_note        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ
);

-- ─── 2. Permissions ──────────────────────────────────────────
GRANT SELECT ON public.access_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_requests TO service_role;

-- ─── 3. New columns on affiliates ────────────────────────────
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS ton_wallet TEXT;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMPTZ;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS has_academy_access BOOLEAN DEFAULT false;

-- ─── 3b. New columns on tenants ──────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS academy_model TEXT DEFAULT 'payment';

-- ─── 4. Index for fast pending queries ───────────────────────
CREATE INDEX IF NOT EXISTS idx_access_requests_tenant_status
  ON access_requests(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_access_requests_telegram_id
  ON access_requests(member_telegram_id);

-- ─── 5. Enable Realtime on access_requests (idempotent) ─────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'access_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE access_requests;
  END IF;
END $$;
