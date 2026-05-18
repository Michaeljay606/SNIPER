-- Ephata Tech — Schema Repair Script
-- This script ensures all columns required by the Master Control Panel and App Logic exist in the 'tenants' table.
-- Run this in your Supabase SQL Editor.

-- 1. Essential Columns for Identity & Status
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS licence_status text DEFAULT 'active' 
    CHECK (licence_status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free'
    CHECK (plan IN ('free', 'basic', 'premium', 'empire', 'pause')),
  ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#00FF41',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 50;

-- 2. Branding & Content Columns (if missing)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS mentor_name text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS vision_text text,
  ADD COLUMN IF NOT EXISTS speciality text,
  ADD COLUMN IF NOT EXISTS years_exp text,
  ADD COLUMN IF NOT EXISTS traders_count text;

-- 3. Social & Contact Columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS social_telegram text,
  ADD COLUMN IF NOT EXISTS social_youtube text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_tiktok text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS telegram_contact_url text;

-- 4. Pricing & Model Columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS vip_model text DEFAULT 'payment'
    CHECK (vip_model IN ('payment', 'broker', 'both')),
  ADD COLUMN IF NOT EXISTS vip_currency text DEFAULT '$',
  ADD COLUMN IF NOT EXISTS vip_price_1m text DEFAULT '99',
  ADD COLUMN IF NOT EXISTS vip_price_2m text DEFAULT '179',
  ADD COLUMN IF NOT EXISTS vip_price_1y text DEFAULT '599',
  ADD COLUMN IF NOT EXISTS vip_price_lifetime text DEFAULT '999',
  ADD COLUMN IF NOT EXISTS academy_model text DEFAULT 'broker'
    CHECK (academy_model IN ('free', 'broker', 'payment', 'both')),
  ADD COLUMN IF NOT EXISTS academy_price_lifetime text DEFAULT '299',
  ADD COLUMN IF NOT EXISTS broker_msg_vip text,
  ADD COLUMN IF NOT EXISTS broker_msg_academy text;

-- 5. TON Payment Integration (ensure these match ton_payment_migrations.sql)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ton_payment_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ton_wallet text;

-- 6. Refresh PostgREST Schema Cache (Crucial step)
NOTIFY pgrst, 'reload schema';
