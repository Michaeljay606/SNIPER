-- ============================================================
-- MIGRATION: Système d'Alertes Pré-Trade (WATCH / Zone d'Imminence)
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter signal_type pour distinguer LIVE vs WATCH
ALTER TABLE signals ADD COLUMN IF NOT EXISTS signal_type TEXT DEFAULT 'LIVE'
  CHECK (signal_type IN ('LIVE', 'WATCH', 'IMMINENT'));

-- 2. Zone d'entrée (Forex) — fourchette de prix
ALTER TABLE signals ADD COLUMN IF NOT EXISTS entry_low  NUMERIC;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS entry_high NUMERIC;

-- 3. Note d'analyse du mentor (message court, max 280 chars)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS analysis_note TEXT;

-- 4. Horodatage d'activation WATCH → LIVE
ALTER TABLE signals ADD COLUMN IF NOT EXISTS watch_activated_at TIMESTAMPTZ;

-- 5. Backfill: s'assurer que les anciens signaux ont signal_type = 'LIVE'
UPDATE signals SET signal_type = 'LIVE' WHERE signal_type IS NULL;

-- ============================================================
-- 6. SUPABASE GRANT RULES (mandatory from May 30 2026)
--    Sans ces GRANTs, la table retourne erreur 42501
-- ============================================================

GRANT SELECT
  ON public.signals TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.signals TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.signals TO service_role;

-- Vérification des colonnes ajoutées
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'signals'
  AND column_name IN ('signal_type', 'entry_low', 'entry_high', 'analysis_note', 'watch_activated_at')
ORDER BY column_name;
