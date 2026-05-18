-- Apply mandatory Supabase Grant Rules for all tables
-- This fixes Error 42501 (Permission Denied)

DO $$ 
DECLARE 
  tab text;
BEGIN 
  FOR tab IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
  LOOP 
    EXECUTE format('GRANT SELECT ON public.%I TO anon', tab);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tab);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', tab);
  END LOOP; 
END $$;

-- Specifically for the tenants table update requested earlier:
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_trading_mode_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_trading_mode_check CHECK (trading_mode IN ('MARKETS', 'BINARY', 'BOTH'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
