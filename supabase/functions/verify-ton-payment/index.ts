import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const TONCENTER_API = 'https://toncenter.com/api/v2/getTransactions'
const TONCENTER_KEY = Deno.env.get('TONCENTER_API_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const {
      wallet_to,
      amount_usdt,
      comment,
      payment_id,
      tenant_id,
      flow,
      plan,
      payer_telegram_id,
      member_id,
    } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Poll TonCenter for recent transactions
    // Retry up to 12 times (every 5s = 1 minute total)
    let confirmed = false
    let txHash = ''
    let attempts = 0

    while (!confirmed && attempts < 12) {
      await new Promise(r => setTimeout(r, 5000))
      attempts++

      try {
        const res = await fetch(
          `${TONCENTER_API}?address=${wallet_to}&limit=10`,
          {
            headers: {
              'X-API-Key': TONCENTER_KEY
            }
          }
        )
        const data = await res.json()
        const txs = data.result ?? []

        for (const tx of txs) {
          // Check for USDT Jetton transfer matching amount and comment
          const msgBody = tx.in_msg?.msg_data?.text ?? ''
          const value = tx.in_msg?.value ?? 0

          // Amount check: USDT amount in nanoUSDT
          const expectedNano = Math.round(amount_usdt * 1_000_000)

          if (
            msgBody.includes(comment) ||
            Math.abs(value - expectedNano) < 1000
          ) {
            confirmed = true
            txHash = tx.transaction_id?.hash ?? ''
            break
          }
        }
      } catch (err) {
        console.error('TonCenter poll error:', err)
      }
    }

    const headers = { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }

    if (confirmed) {
      // Update payment record
      await supabase
        .from('payment_transactions')
        .update({
          status:       'confirmed',
          tx_hash:      txHash,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment_id)

      // Apply the effect based on flow
      if (flow === 'subscription') {
        // Activate mentor plan
        await supabase
          .from('tenants')
          .update({
            plan:            plan,
            licence_status:  'active',
          })
          .eq('tenant_id', tenant_id)

        // Notify mentor via bot
        if (payer_telegram_id) {
          await fetch(
            `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id:    payer_telegram_id,
                text:
                  `✅ *Paiement confirmé !*\n\n` +
                  `Plan ${plan.toUpperCase()} activé.\n` +
                  `Montant : ${amount_usdt} USDT\n\n` +
                  `Votre infrastructure Ephata Tech est prête.`,
                parse_mode: 'Markdown',
              })
            }
          )
        }
      } else if (flow === 'vip_access' || flow === 'academy_access') {
        const section = flow === 'vip_access' ? 'signals' : 'academy';
        
        // Find member ID if not provided
        let finalMemberId = member_id;
        if (!finalMemberId && payer_telegram_id) {
          const { data: member } = await supabase
            .from('affiliates')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('telegram_id', payer_telegram_id)
            .single();
          finalMemberId = member?.id;
        }

        if (finalMemberId) {
          await supabase.rpc('grant_member_access', {
            p_tenant_id: tenant_id,
            p_member_id: finalMemberId,
            p_section:   section
          });
        }

        // Notify member
        if (payer_telegram_id) {
          await fetch(
            `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id:    payer_telegram_id,
                text:
                  `🔐 *Accès ${section === 'signals' ? 'VIP' : 'Academy'} activé !*\n\n` +
                  `Paiement de ${amount_usdt} USDT confirmé.\n` +
                  `Ouvrez l'app pour accéder au contenu.`,
                parse_mode: 'Markdown',
              })
            }
          )
        }
      }

      return new Response(
        JSON.stringify({ confirmed: true, txHash }),
        { headers }
      )
    }

    // Payment not confirmed after 1 minute
    await supabase
      .from('payment_transactions')
      .update({ status: 'failed' })
      .eq('id', payment_id)

    return new Response(
      JSON.stringify({
        confirmed: false,
        error: 'Transaction not found after 60s'
      }),
      { headers }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ confirmed: false, error: error.message }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }, 
        status: 400 
      }
    )
  }
})
