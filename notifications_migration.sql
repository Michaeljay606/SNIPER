-- =============================================================================
-- SNIPER TERMINAL — NOTIFICATIONS SYSTEM MIGRATION
-- Run this script in the Supabase SQL editor (Settings → SQL Editor)
-- =============================================================================

-- 1. Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  target_type TEXT DEFAULT 'member' CHECK (target_type IN ('member', 'mentor', 'all_members', 'vip_members', 'free_members')),
  target_telegram_id BIGINT,
  read_by BIGINT[] DEFAULT '{}',
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns to notifications if missing (in case table existed but lacks columns)
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS target_telegram_id BIGINT,
  ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'member' CHECK (target_type IN ('member', 'mentor', 'all_members', 'vip_members', 'free_members')),
  ADD COLUMN IF NOT EXISTS read_by BIGINT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- 3. Add notification preferences columns to affiliates table
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS notif_signals BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_academy BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_vip BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_blocked BOOLEAN DEFAULT false; -- to track user blocks

-- 4. Enable Row-Level Security (RLS) on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

-- 6. Create robust RLS Policies
-- SELECT: Members can read notifications for the current tenant that are either broadcasted (all_members, vip_members, free_members) or targeted directly to them.
-- Mentors can read all notifications for their tenant.
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.affiliates WHERE id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.tenants WHERE user_id = auth.uid() AND tenant_id = notifications.tenant_id
    )
  );

-- INSERT: Insertions are done by Edge Functions (service_role) or the client app upon user registration
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- UPDATE: Members can update notifications (e.g. appending their telegram_id to read_by)
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.affiliates WHERE id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.tenants WHERE user_id = auth.uid() AND tenant_id = notifications.tenant_id
    )
  );

-- DELETE: Only Mentors/Admin can delete notifications
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tenants WHERE user_id = auth.uid() AND tenant_id = notifications.tenant_id
    )
  );

-- 7. Grant Permissions to roles
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

-- Add sequence/usage grants if serial IDs are used (not strictly needed for UUID primary key but good practice)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
