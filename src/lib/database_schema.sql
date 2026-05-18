-- SQL Schema for MrTech Core Multi-Tenant SaaS on Supabase

-- 0. Tenants Table (Master Config)
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  mentor_name TEXT NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'empire')),
  licence_status TEXT DEFAULT 'active' CHECK (licence_status IN ('active', 'suspended')),
  telegram_link TEXT,
  vision_text TEXT,
  speciality TEXT,
  years_exp TEXT,
  traders_count TEXT,
  broker_1_name TEXT,
  broker_1_url TEXT,
  broker_2_name TEXT,
  broker_2_url TEXT,
  broker_3_name TEXT,
  broker_3_url TEXT,
  social_telegram TEXT,
  social_youtube TEXT,
  social_instagram TEXT,
  social_tiktok TEXT,
  elite_title TEXT,
  elite_description TEXT,
  elite_price TEXT,
  elite_contact_url TEXT,
  theme_color TEXT DEFAULT '#00FF41',
  social_links JSONB DEFAULT '[]'::jsonb,
  telegram_id BIGINT,
  trading_mode TEXT DEFAULT 'MARKETS' CHECK (trading_mode IN ('MARKETS', 'BINARY')),
  vip_model TEXT DEFAULT 'payment' CHECK (vip_model IN ('payment', 'broker', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Signals Table
CREATE TABLE IF NOT EXISTS signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  type TEXT,
  entry TEXT,
  tp TEXT,
  sl TEXT,
  martingale TEXT,
  status TEXT DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'TP_HIT', 'SL_HIT', 'CLOSED', 'CANCELLED')),
  pips_gain INTEGER DEFAULT 0,
  analysis_url TEXT,
  result_image TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  rr TEXT DEFAULT '2.0',
  trading_mode TEXT DEFAULT 'MARKETS' CHECK (trading_mode IN ('MARKETS', 'BINARY')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Affiliates Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'refused', 'banned')),
  is_vip BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  account_number TEXT,
  broker TEXT,
  telegram_username TEXT,
  telegram_id TEXT,
  is_broker_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Academy Tables
CREATE TABLE IF NOT EXISTS academy_modules (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  videos_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  thumbnail TEXT,
  tag TEXT
);

CREATE TABLE IF NOT EXISTS academy_lessons (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES academy_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT NOT NULL,
  duration TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 4. Live Positions Table
CREATE TABLE IF NOT EXISTS live_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  type TEXT NOT NULL,
  entry TEXT NOT NULL,
  current_price TEXT,
  pips TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Global Settings / Profile Content
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  value JSONB NOT NULL
);

-- 6. Mentor Badges
CREATE TABLE IF NOT EXISTS mentor_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Configuration
-- For a SaaS, we enable RLS to ensure one tenant cannot see another tenant's data.

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_badges ENABLE ROW LEVEL SECURITY;

-- Simple Policies (In production, use auth.uid() and tenant_id mapping)
-- For now, we allow all operations to ensure functionality while maintaining tenant_id isolation in the app logic.

-- Tenants
DROP POLICY IF EXISTS "Allow all for tenants" ON tenants;
CREATE POLICY "Allow all for tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);

-- Signals
DROP POLICY IF EXISTS "Allow all for signals" ON signals;
CREATE POLICY "Allow all for signals" ON signals FOR ALL USING (true) WITH CHECK (true);

-- Affiliates
DROP POLICY IF EXISTS "Allow all for affiliates" ON affiliates;
CREATE POLICY "Allow all for affiliates" ON affiliates FOR ALL USING (true) WITH CHECK (true);

-- Academy
DROP POLICY IF EXISTS "Allow all for academy_modules" ON academy_modules;
CREATE POLICY "Allow all for academy_modules" ON academy_modules FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for academy_lessons" ON academy_lessons;
CREATE POLICY "Allow all for academy_lessons" ON academy_lessons FOR ALL USING (true) WITH CHECK (true);

-- Live Positions
DROP POLICY IF EXISTS "Allow all for live_positions" ON live_positions;
CREATE POLICY "Allow all for live_positions" ON live_positions FOR ALL USING (true) WITH CHECK (true);

-- App Settings
DROP POLICY IF EXISTS "Allow all for app_settings" ON app_settings;
CREATE POLICY "Allow all for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Mentor Badges
DROP POLICY IF EXISTS "Allow all for mentor_badges" ON mentor_badges;
CREATE POLICY "Allow all for mentor_badges" ON mentor_badges FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------
-- STORAGE BUCKETS
-- ---------------------------------------------------------
-- Note: These might need to be run in the SQL editor individually if there are permission issues.
INSERT INTO storage.buckets (id, name, public) VALUES ('profile', 'profile', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('results', 'results', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Allow public upload/read)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING ( bucket_id IN ('profile', 'results') ) WITH CHECK ( bucket_id IN ('profile', 'results') );

-- Insert Default Tenant for Testing
INSERT INTO tenants (tenant_id, mentor_name, plan, trading_mode) VALUES ('mrtech237', 'MR TECH', 'empire', 'MARKETS') ON CONFLICT (tenant_id) DO NOTHING;

-- Insert Default Modules for the tenant
-- Temporarily disable triggers to bypass tenant integrity checks during setup
ALTER TABLE academy_modules DISABLE TRIGGER ALL;

INSERT INTO academy_modules (id, tenant_id, title, description, sort_order) VALUES
(1, 'mrtech237', 'Structure du Marché', 'Les bases de l''analyse technique', 1),
(2, 'mrtech237', 'Psychologie & Discipline', 'Maîtriser ses émotions', 2),
(3, 'mrtech237', 'Price Action Avancé', 'Concepts institutionnels', 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE academy_modules ENABLE TRIGGER ALL;

-- ---------------------------------------------------------
-- MANDATORY GRANTS (Required from May 30 2026)
-- ---------------------------------------------------------
GRANT SELECT ON public.tenants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO service_role;

GRANT SELECT ON public.signals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO service_role;

GRANT SELECT ON public.affiliates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO service_role;

GRANT SELECT ON public.academy_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_modules TO service_role;

GRANT SELECT ON public.academy_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lessons TO service_role;

GRANT SELECT ON public.live_positions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_positions TO service_role;

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO service_role;

GRANT SELECT ON public.mentor_badges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_badges TO service_role;
