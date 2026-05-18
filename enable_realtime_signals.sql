-- ============================================================
-- EPHATA TECH — Enable Realtime for Signals Table
-- ============================================================
-- Run this script in your Supabase SQL Editor to enable 
-- immediate, ultra-fast real-time push notifications of signals 
-- to all connected students/clients.
-- ============================================================

-- ─── 1. Check and add the 'signals' table to the 'supabase_realtime' publication ───
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'signals'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND tablename = 'signals'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
      RAISE NOTICE '✅ Realtime enabled successfully for table: signals';
    ELSE
      RAISE NOTICE 'ℹ️ Realtime is already enabled for table: signals';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Table "signals" does not exist in schema "public"';
  END IF;
END $$;

-- ─── 2. Set replica identity to FULL for signals ───
-- This ensures that updates/deletes send the full row state to the client
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- ─── 3. Enforce Supabase Security Grants (Mandatory from May 30 2026) ───
GRANT SELECT ON public.signals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO service_role;
