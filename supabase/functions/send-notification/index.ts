import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const BOT_API = `https://api.telegram.org/bot${BOT_TOKEN}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) {
    console.warn('No BOT_TOKEN configured — skipping Telegram notification')
    return
  }
  await fetch(`${BOT_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, tenant_id, data } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch mentor's telegram_id for mentor-targeted notifications
    let mentorTelegramId: number | null = null
    if (['new_broker_request', 'new_payment_request'].includes(type)) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('telegram_id')
        .eq('tenant_id', tenant_id)
        .single()
      mentorTelegramId = tenant?.telegram_id ?? null
    }

    // ─── Notification types ───────────────────────────────────
    if (type === 'new_broker_request' && mentorTelegramId) {
      const text =
        `👤 *Nouvelle demande d'affiliation*\n\n` +
        `@${data.username} a soumis son ID broker\n` +
        `Broker: ${data.broker}\n` +
        `ID compte: ${data.account_id}\n\n` +
        `Validez dans *Admin → Membres*`
      await sendTelegramMessage(mentorTelegramId, text)
    }

    else if (type === 'new_payment_request' && mentorTelegramId) {
      const text =
        `💰 *Nouvelle demande de paiement VIP*\n\n` +
        `@${data.username}\n` +
        `Plan: ${data.plan}\n` +
        `Montant: ${data.amount} ${data.currency}\n\n` +
        `Confirmez dans *Admin → Membres*`
      await sendTelegramMessage(mentorTelegramId, text)
    }

    else if (type === 'vip_activated') {
      const text =
        `🔐 *Accès VIP activé !*\n\n` +
        `Votre accès a été approuvé.\n` +
        `Ouvrez l'app pour accéder aux signaux VIP.`
      await sendTelegramMessage(data.telegram_id, text)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
