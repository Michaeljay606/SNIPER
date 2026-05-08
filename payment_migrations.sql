  -- Payment transactions log
  CREATE TABLE IF NOT EXISTS payment_transactions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    payer_telegram_id BIGINT,
    flow            TEXT NOT NULL
      CHECK (flow IN ('subscription', 'vip_access')),
    amount_usdt     NUMERIC(10,2) NOT NULL,
    plan            TEXT,
    tx_hash         TEXT UNIQUE,
    status          TEXT DEFAULT 'pending'
      CHECK (status IN (
        'pending','confirming','confirmed','failed'
      )),
    wallet_from     TEXT,
    wallet_to       TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at    TIMESTAMPTZ
  );

  -- Add wallet address to tenants
  ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS ton_wallet TEXT;

  -- RLS
  ALTER TABLE payment_transactions
    ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "insert_own_payment"
    ON payment_transactions FOR INSERT
    WITH CHECK (true);

  CREATE POLICY "read_own_payment"
    ON payment_transactions FOR SELECT
    USING (true);
