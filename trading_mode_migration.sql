-- ============================================================
-- EPHATA TECH — Trading Mode Migration (v3 — FINAL FIX)
-- La colonne trading_mode existe déjà dans tenants
-- mais avec l'ancienne contrainte ('forex','binary','both')
-- ============================================================

-- ─── 1. Supprimer l'ancienne contrainte CHECK ─────────────────
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_trading_mode_check;

-- ─── 2. Ajouter la nouvelle contrainte CHECK ──────────────────
ALTER TABLE tenants
  ADD CONSTRAINT tenants_trading_mode_check
    CHECK (trading_mode IN ('MARKETS', 'BINARY', 'forex', 'binary', 'both'));
-- Note: on garde les anciennes valeurs temporairement pour le backfill

-- ─── 3. Backfill : normaliser forex/both → MARKETS, binary → BINARY
UPDATE tenants
SET trading_mode = CASE
  WHEN LOWER(trading_mode) = 'binary' THEN 'BINARY'
  ELSE 'MARKETS'
END;

-- ─── 4. Remplacer par la contrainte stricte finale ────────────
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_trading_mode_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_trading_mode_check
    CHECK (trading_mode IN ('MARKETS', 'BINARY'));

-- ─── 5. Ajouter trading_mode à signals (si pas déjà fait) ─────
ALTER TABLE signals
  DROP CONSTRAINT IF EXISTS signals_trading_mode_check;

ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS trading_mode TEXT NOT NULL DEFAULT 'MARKETS';

ALTER TABLE signals
  ADD CONSTRAINT signals_trading_mode_check
    CHECK (trading_mode IN ('MARKETS', 'BINARY'));

-- ─── 6. Backfill signals ──────────────────────────────────────
UPDATE signals
SET trading_mode = CASE
  WHEN LOWER(COALESCE(mode, '')) = 'binary' THEN 'BINARY'
  ELSE 'MARKETS'
END;

-- ─── 7. Activer Realtime sur tenants ─────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
