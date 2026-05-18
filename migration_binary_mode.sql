-- ============================================================
-- EPHATA TECH — Binary Mode Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add binary signal columns to signals table
ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'forex'
    CHECK (mode IN ('forex', 'binary')),
  ADD COLUMN IF NOT EXISTS direction TEXT
    CHECK (direction IN ('BUY', 'SELL', 'CALL', 'PUT')),
  ADD COLUMN IF NOT EXISTS expiration TEXT,
  ADD COLUMN IF NOT EXISTS payout_pct INT,
  ADD COLUMN IF NOT EXISTS asset TEXT;

-- 2. Add trading_mode to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'forex'
    CHECK (trading_mode IN ('forex', 'binary', 'both'));

-- 3. Backfill existing signals as forex mode
UPDATE signals SET mode = 'forex' WHERE mode IS NULL;

-- 4. Backfill existing tenants as forex mode
UPDATE tenants SET trading_mode = 'forex' WHERE trading_mode IS NULL;
