-- [MIGRATION] Dynamic Monetization Models for Tenants
-- Run this in Supabase SQL Editor

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vip_model TEXT DEFAULT 'payment' CHECK (vip_model IN ('payment', 'broker', 'both'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vip_price_1m TEXT DEFAULT '99';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vip_price_2m TEXT DEFAULT '179';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vip_price_1y TEXT DEFAULT '599';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vip_price_lifetime TEXT DEFAULT '999';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vip_currency TEXT DEFAULT '$';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS academy_model TEXT DEFAULT 'broker' CHECK (academy_model IN ('free', 'broker', 'payment', 'both'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS academy_price_1m TEXT DEFAULT '49';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS academy_price_lifetime TEXT DEFAULT '299';

-- Ensure broker columns exist (already should but for safety)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_1_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_1_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_2_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_2_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_3_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_3_url TEXT;
