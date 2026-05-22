import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.3';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const BOT_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

    const { type, tenant_id, target_type, target_telegram_id, data } = await req.json();

    if (!tenant_id || !type || !target_type) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STEP 1: Build message text ──
    let message = { title: '🔔 Notification', body: '' };

    switch (type) {
      case 'new_signal':
        message = {
          title: '📡 Nouveau Signal',
          body: `${data.pair || data.asset} ${data.type || data.direction}\n` +
                `${data.is_vip ? '🔐 Signal VIP' : '🟢 Signal Gratuit'}`,
        };
        break;

      case 'signal_tp_hit':
        message = {
          title: '✅ TP Touché !',
          body: `${data.pair} — ${data.pips ? '+' + data.pips + ' pips' : 'Objectif atteint'}\n💰 Félicitations !`,
        };
        break;

      case 'signal_sl_hit':
        message = {
          title: '❌ Stop Loss',
          body: `${data.pair} — SL touché\n📊 Analysez et restez discipliné.`,
        };
        break;

      case 'signal_cancelled':
        message = {
          title: '⚠️ Signal Annulé',
          body: `${data.pair} — Signal retiré par le mentor`,
        };
        break;

      case 'vip_activated':
        message = {
          title: '🔐 Accès VIP Activé !',
          body: `Votre accès VIP est maintenant actif.\nOuvrez l'app pour voir les signaux exclusifs.`,
        };
        break;

      case 'vip_expiring':
        message = {
          title: '⏰ Votre VIP expire bientôt',
          body: `Votre accès VIP expire dans ${data.days_left} jour(s).\nRenouvelez maintenant pour ne rien manquer.`,
        };
        break;

      case 'vip_expired':
        message = {
          title: '🔒 Accès VIP Expiré',
          body: `Votre accès VIP a expiré.\nRenouvelez dans l'app pour reprendre l'accès.`,
        };
        break;

      case 'access_rejected':
        message = {
          title: '❌ Demande Refusée',
          body: `Votre demande d'accès a été refusée.\nContactez le mentor pour plus d'informations.`,
        };
        break;

      case 'new_lesson':
        message = {
          title: '🎓 Nouvelle Leçon',
          body: `"${data.title}" vient d'être publiée\nModule: ${data.module_title}`,
        };
        break;

      case 'new_module':
        message = {
          title: '📚 Nouveau Module',
          body: `Module "${data.title}" ajouté à l'Academy`,
        };
        break;

      case 'new_member':
        message = {
          title: '👤 Nouveau Membre',
          body: `@${data.username} a rejoint votre communauté\nValisez son accès dans Admin → Membres`,
        };
        break;

      case 'new_payment_request':
        message = {
          title: '💰 Demande de Paiement',
          body: `@${data.username} — ${data.plan}\nMontant: ${data.amount} ${data.currency}\nConfirmez dans Admin → Membres`,
        };
        break;

      case 'new_broker_request':
        message = {
          title: '🤝 Demande Broker',
          body: `@${data.username}\nBroker: ${data.broker}\nID: ${data.account_id}\nValidez dans Admin → Membres`,
        };
        break;

      case 'payment_confirmed':
        message = {
          title: '✅ Paiement TON Confirmé',
          body: `@${data.username} — ${data.amount} USDT\nAccès VIP activé automatiquement`,
        };
        break;

      case 'vip_member_expiring':
        message = {
          title: '⏰ VIP Membre Expirant',
          body: `@${data.username} expire dans ${data.days_left}j\nContactez-le pour renouveler`,
        };
        break;

      case 'broadcast_operator':
        message = {
          title: '📢 Message Sniper',
          body: data.message || '',
        };
        break;

      default:
        message = {
          title: '🔔 Notification',
          body: data.message || JSON.stringify(data),
        };
    }

    // ── STEP 2: Determine recipients ──
    let recipients: (number | string)[] = [];

    if (target_type === 'member') {
      if (target_telegram_id) {
        recipients = [target_telegram_id];
      }
    } else if (target_type === 'mentor') {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('telegram_id')
        .eq('tenant_id', tenant_id)
        .single();
      if (tenant?.telegram_id) {
        recipients = [tenant.telegram_id];
      }
    } else {
      // Query recipients checking their preferences
      let query = supabase
        .from('affiliates')
        .select('telegram_id')
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .not('telegram_id', 'is', null)
        .eq('notif_blocked', false); // Skip blocked members

      if (target_type === 'vip_members') {
        query = query.eq('is_vip', true);
      } else if (target_type === 'free_members') {
        query = query.eq('is_vip', false);
      }

      // Filter by notification preferences type
      if (['new_signal', 'signal_tp_hit', 'signal_sl_hit', 'signal_cancelled'].includes(type)) {
        query = query.eq('notif_signals', true);
      } else if (['new_lesson', 'new_module'].includes(type)) {
        query = query.eq('notif_academy', true);
      } else if (['vip_activated', 'vip_expiring', 'vip_expired', 'access_rejected'].includes(type)) {
        query = query.eq('notif_vip', true);
      }

      const { data: affiliates, error: affErr } = await query;
      if (!affErr && affiliates) {
        recipients = affiliates.map((a) => a.telegram_id).filter(Boolean) as (number | string)[];
      }
    }

    // ── STEP 3: Save to notifications table ──
    let notificationId: string | null = null;
    try {
      const { data: newNotif, error: notifErr } = await supabase
        .from('notifications')
        .insert([{
          tenant_id,
          target_type,
          target_telegram_id: target_type === 'member' ? (target_telegram_id ? Number(target_telegram_id) : null) : null,
          type,
          title: message.title,
          body: message.body,
          data: data || {},
          read_by: []
        }])
        .select('id')
        .single();

      if (!notifErr && newNotif) {
        notificationId = newNotif.id;
      }
    } catch (saveErr) {
      console.error('Failed to save notification record:', saveErr);
    }

    // ── STEP 4: Send via Telegram Bot API ──
    let sentCount = 0;
    let failedCount = 0;

    if (BOT_TOKEN && recipients.length > 0) {
      for (const recipientId of recipients) {
        try {
          const res = await fetch(`${BOT_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: recipientId,
              text: `<b>${message.title}</b>\n\n${message.body}`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [[{
                  text: '📱 Ouvrir Sniper',
                  url: `https://t.me/SniperTradingBot/app?startapp=${tenant_id}`
                }]]
              }
            }),
          });

          if (res.status === 403) {
            // User blocked the bot
            await supabase
              .from('affiliates')
              .update({ notif_blocked: true })
              .eq('telegram_id', String(recipientId))
              .eq('tenant_id', tenant_id);
            failedCount++;
          } else if (res.status === 429) {
            // Rate limit hit: sleep and retry once
            const retryAfter = parseInt(res.headers.get('retry-after') || '1') * 1000;
            await new Promise((resolve) => setTimeout(resolve, retryAfter + 100));

            const retryRes = await fetch(`${BOT_API}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: recipientId,
                text: `<b>${message.title}</b>\n\n${message.body}`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [[{
                    text: '📱 Ouvrir Sniper',
                    url: `https://t.me/SniperTradingBot/app?startapp=${tenant_id}`
                  }]]
                }
              }),
            });

            if (retryRes.ok) {
              sentCount++;
            } else {
              failedCount++;
            }
          } else if (res.ok) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (tgErr) {
          console.error(`Telegram delivery failed to ${recipientId}:`, tgErr);
          failedCount++;
        }

        // Add 35ms delay between broadcasts to avoid spam limits
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
    } else if (!BOT_TOKEN) {
      console.warn('No TELEGRAM_BOT_TOKEN set inside Edge Function env.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        notification_id: notificationId,
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
