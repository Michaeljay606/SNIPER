-- Migration: Add Gale stage progression columns to signals table
-- Run this in Supabase SQL Editor

ALTER TABLE signals 
  ADD COLUMN IF NOT EXISTS gale_stage INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gale_activated_at TIMESTAMPTZ;

-- Comment: 
-- gale_stage: 0 = Initial trade, 1 = Gale 1 active, 2 = Gale 2 active
-- gale_activated_at: timestamp when admin triggered the current gale stage
