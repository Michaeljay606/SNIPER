-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,
  plan                  text NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free','basic','premium','empire','pause')),
  plan_expires_at       timestamptz,
  state                 text DEFAULT 'active'
                        CHECK (state IN ('active','paused','suspended','banned')),
  onboarding_completed  boolean DEFAULT false,
  referral_code         text UNIQUE,
  referred_by           uuid REFERENCES tenants(id),
  referral_valid_until  timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- Config dynamique par tenant
CREATE TABLE IF NOT EXISTS tenants_config (
  tenant_id             uuid PRIMARY KEY REFERENCES tenants(id),
  -- Identité
  mentor_name           text,
  mentor_photo_url      text,
  banner_url            text,
  gallery_images        jsonb DEFAULT '[]',
  mentor_bio_title      text,
  mentor_subtitle       text,
  mentor_badges         jsonb DEFAULT '[]',
  mentor_vision         text,
  -- Contacts
  telegram_username     text,
  whatsapp_number       text,
  support_link          text,
  -- Paiements
  wallets               jsonb DEFAULT '{}',
  -- wallets.usdtTrc20, wallets.ton
  -- Plans élèves
  signals_price         numeric DEFAULT 0,
  academy_price         numeric DEFAULT 0,
  signals_duration      text DEFAULT 'monthly'
                        CHECK (signals_duration IN ('lifetime','monthly','fixed')),
  academy_duration      text DEFAULT 'lifetime'
                        CHECK (academy_duration IN ('lifetime','monthly','fixed')),
  grant_all_on_payment  boolean DEFAULT false,
  -- Brokers dynamiques
  brokers               jsonb DEFAULT '[]',
  -- [{name, affiliateLink, iconUrl}]
  -- Mode trading
  trading_mode          text DEFAULT 'forex'
                        CHECK (trading_mode IN ('forex','binary','both')),
  -- Thème
  theme                 jsonb DEFAULT '{}',
  updated_at            timestamptz DEFAULT now()
);

-- Signaux
CREATE TABLE IF NOT EXISTS signals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  mode          text DEFAULT 'forex'
                CHECK (mode IN ('forex','binary')),
  -- Forex fields
  pair          text NOT NULL,
  direction     text CHECK (direction IN ('BUY','SELL','CALL','PUT')),
  entry         numeric,
  tp1           numeric,
  tp2           numeric,
  sl            numeric,
  -- Binary fields
  expiration    text,  -- 'M1','M5','M15','M30','H1'
  stake_percent numeric,
  -- Common
  signal_type   text DEFAULT 'LIVE'
                CHECK (signal_type IN ('LIVE','WATCH','IMMINENT')),
  status        text DEFAULT 'active'
                CHECK (status IN ('active','closed','cancelled')),
  result        text CHECK (result IN ('WIN','LOSS','BE')),
  result_pips   numeric,
  is_victory    boolean DEFAULT false,
  is_vip        boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Leçons Academy
CREATE TABLE IF NOT EXISTS lessons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  module_id     uuid,
  title         text NOT NULL,
  description   text,
  video_url     text,
  thumbnail_url text,
  level         text CHECK (level IN ('basic','vip')),
  position      integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Modules Academy
CREATE TABLE IF NOT EXISTS modules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  title         text NOT NULL,
  description   text,
  position      integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Membres
CREATE TABLE IF NOT EXISTS members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  telegram_id     bigint NOT NULL,
  username        text,
  first_name      text,
  plan            text DEFAULT 'free'
                  CHECK (plan IN ('free','basic','premium')),
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending','active','banned')),
  referrer_id     uuid REFERENCES members(id),
  joined_at       timestamptz DEFAULT now(),
  UNIQUE(tenant_id, telegram_id)
);

-- Accès membres (indépendant par section)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid REFERENCES tenants(id),
  member_id             uuid REFERENCES members(id),
  signals_active        boolean DEFAULT false,
  signals_expires_at    timestamptz,
  academy_active        boolean DEFAULT false,
  academy_expires_at    timestamptz,
  academy_is_lifetime   boolean DEFAULT false,
  updated_at            timestamptz DEFAULT now()
);

-- Vue accès calculée
CREATE OR REPLACE VIEW member_access AS
SELECT
  member_id, tenant_id,
  (signals_active AND (
    signals_expires_at IS NULL OR signals_expires_at > now()
  )) AS can_access_signals,
  (academy_active AND (
    academy_is_lifetime = true OR
    academy_expires_at IS NULL OR
    academy_expires_at > now()
  )) AS can_access_academy
FROM user_subscriptions;

-- Paiements
CREATE TABLE IF NOT EXISTS payment_intents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id),
  payer_type      text CHECK (payer_type IN ('mentor','member')),
  plan            text,
  usd_amount      numeric,
  crypto_amount   numeric,
  currency        text,
  address         text UNIQUE,
  tx_hash         text,
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending','detected','confirmed','expired')),
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Factures
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id),
  payer_type      text,
  invoice_number  text UNIQUE,
  plan            text,
  amount_usd      numeric,
  amount_crypto   numeric,
  currency        text,
  tx_hash         text,
  intent_id       uuid REFERENCES payment_intents(id),
  issued_at       timestamptz DEFAULT now()
);

-- Commissions parrainage
CREATE TABLE IF NOT EXISTS referral_commissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid REFERENCES tenants(id),
  referred_id     uuid REFERENCES tenants(id),
  invoice_id      uuid REFERENCES invoices(id),
  commission_rate numeric DEFAULT 0.10,
  amount_usd      numeric,
  status          text DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','expired')),
  earned_at       timestamptz DEFAULT now()
);

-- Analytics
CREATE TABLE IF NOT EXISTS platform_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES tenants(id),
  member_id     uuid,
  event_type    text,
  metadata      jsonb DEFAULT '{}',
  occurred_at   timestamptz DEFAULT now()
);

-- RLS sur toutes les tables
ALTER TABLE signals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_events      ENABLE ROW LEVEL SECURITY;
