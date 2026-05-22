import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const sendNotificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    };

    let processedExpiring = 0;
    let processedExpired = 0;

    // ── STEP 1: Process expiring VIPs (expires in less than 3 days, but not yet expired) ──
    const { data: expiringMembers, error: expiringErr } = await supabase
      .from('affiliates')
      .select('id, telegram_id, vip_expires_at, tenant_id')
      .eq('is_vip', true)
      .not('vip_expires_at', 'is', null)
      .lt('vip_expires_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
      .gt('vip_expires_at', new Date().toISOString());

    if (expiringErr) throw expiringErr;

    if (expiringMembers && expiringMembers.length > 0) {
      for (const member of expiringMembers) {
        if (!member.telegram_id) continue;

        // Calculate days left
        const expiresAt = new Date(member.vip_expires_at).getTime();
        const diffMs = expiresAt - Date.now();
        const daysLeft = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

        // Get student's telegram name / username if available
        const { data: aff } = await supabase
          .from('affiliates')
          .select('telegram_username, name')
          .eq('id', member.id)
          .single();
        const username = aff?.telegram_username || aff?.name || member.telegram_id;

        // A) Notify Member
        await fetch(sendNotificationUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'vip_expiring',
            tenant_id: member.tenant_id,
            target_type: 'member',
            target_telegram_id: Number(member.telegram_id),
            data: { days_left: daysLeft }
          })
        });

        // B) Notify Mentor
        await fetch(sendNotificationUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'vip_member_expiring',
            tenant_id: member.tenant_id,
            target_type: 'mentor',
            data: { username: `@${username}`, days_left: daysLeft }
          })
        });

        processedExpiring++;
      }
    }

    // ── STEP 2: Process fully expired VIPs ──
    const { data: expiredMembers, error: expiredErr } = await supabase
      .from('affiliates')
      .select('id, telegram_id, tenant_id')
      .eq('is_vip', true)
      .not('vip_expires_at', 'is', null)
      .lt('vip_expires_at', new Date().toISOString());

    if (expiredErr) throw expiredErr;

    if (expiredMembers && expiredMembers.length > 0) {
      for (const member of expiredMembers) {
        // A) Update is_vip status to false in Database
        await supabase
          .from('affiliates')
          .update({ is_vip: false })
          .eq('id', member.id);

        // B) Notify Member
        if (member.telegram_id) {
          await fetch(sendNotificationUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              type: 'vip_expired',
              tenant_id: member.tenant_id,
              target_type: 'member',
              target_telegram_id: Number(member.telegram_id),
              data: {}
            })
          });
        }

        processedExpired++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_expiring: processedExpiring,
        processed_expired: processedExpired
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
