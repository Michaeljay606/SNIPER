-- Platform Directive v1.7 — Member Limits Recalibration

-- 1. Create plan_defaults table if it doesn't exist
CREATE TABLE IF NOT EXISTS plan_defaults (
  id SERIAL PRIMARY KEY,
  plan TEXT NOT NULL UNIQUE,
  feature_key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a real multi-feature setup, the unique constraint would be on (plan, feature_key).
-- For this directive, we'll focus on members.max.
ALTER TABLE plan_defaults DROP CONSTRAINT IF EXISTS plan_defaults_plan_key;
ALTER TABLE plan_defaults ADD CONSTRAINT plan_defaults_plan_feature_unique UNIQUE (plan, feature_key);

-- 2. Insert/Update new member thresholds
INSERT INTO plan_defaults (plan, feature_key, value)
VALUES 
  ('free',    'members.max', '50'),
  ('basic',   'members.max', '500'),
  ('premium', 'members.max', '2000'),
  ('empire',  'members.max', 'null'),
  ('pause',   'members.max', '0')
ON CONFLICT (plan, feature_key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 3. Update existing tenants to reflect new thresholds
UPDATE tenants SET max_members = 50   WHERE plan = 'free';
UPDATE tenants SET max_members = 500  WHERE plan = 'basic';
UPDATE tenants SET max_members = 2000 WHERE plan = 'premium';
UPDATE tenants SET max_members = NULL WHERE plan = 'empire';
UPDATE tenants SET max_members = 0    WHERE plan = 'pause';

-- 4. Verify
SELECT * FROM plan_defaults WHERE feature_key = 'members.max';
