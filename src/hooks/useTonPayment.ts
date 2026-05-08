import { useState } from 'react'
import { tonConnectUI } from '../lib/tonConnect'
import { buildUsdtTransfer } from '../lib/tonPayment'
import { supabase } from '../lib/supabase'

const VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-ton-payment`

export type PaymentStatus =
  | 'idle'
  | 'connecting'
  | 'waiting_signature'
  | 'confirming'
  | 'confirmed'
  | 'failed'

export function useTonPayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  async function pay(params: {
    toWallet:       string
    amountUsdt:     number
    comment:        string
    flow:           'subscription' | 'vip_access' | 'academy_access'
    tenantId:       string
    plan?:          string
    payerTelegramId?: number
    memberId?:      string
  }) {
    try {
      setStatus('connecting')
      setError('')

      // Connect wallet if not connected
      if (!tonConnectUI.connected) {
        await tonConnectUI.connectWallet()
      }

      // Get the sender's raw wallet address after connecting
      const senderAddress = tonConnectUI.wallet?.account?.address ?? undefined

      setStatus('waiting_signature')

      // Build USDT transfer — senderAddress is needed to derive the correct Jetton wallet
      const transfer = await buildUsdtTransfer({
        toWallet:      params.toWallet,
        amountUsdt:    params.amountUsdt,
        comment:       params.comment,
        flow:          params.flow,
        tenantId:      params.tenantId,
        senderAddress, // ← required for correct on-chain Jetton routing
      })

      // Log payment intent to Supabase
      const { data: paymentRecord, error: insertError } = await supabase
        .from('payment_transactions')
        .insert({
          tenant_id:         params.tenantId,
          payer_telegram_id: params.payerTelegramId,
          flow:              params.flow,
          amount_usdt:       params.amountUsdt,
          plan:              params.plan,
          wallet_to:         params.toWallet,
          status:            'pending',
        })
        .select()
        .single()

      if (insertError) throw new Error('Could not log payment')

      // Send transaction via TON Connect
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages:   [transfer],
      })

      setStatus('confirming')

      // Call Edge Function to verify on-chain
      const res = await fetch(VERIFY_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          wallet_to:         params.toWallet,
          amount_usdt:       params.amountUsdt,
          comment:           params.comment,
          payment_id:        paymentRecord?.id,
          tenant_id:         params.tenantId,
          flow:              params.flow,
          plan:              params.plan,
          payer_telegram_id: params.payerTelegramId,
          member_id:         params.memberId,
        }),
      })

      const result = await res.json()

      if (result.confirmed) {
        setStatus('confirmed')
        setTxHash(result.txHash)
      } else {
        setStatus('failed')
        setError('Transaction non trouvée. Contactez le support si vous avez été débité.')
      }

    } catch (err: unknown) {
      setStatus('failed')
      if (err instanceof Error && err.message?.includes('User rejects')) {
        setError('Paiement annulé.')
      } else {
        setError('Erreur inattendue. Réessayez.')
      }
    }
  }

  function reset() {
    setStatus('idle')
    setError('')
    setTxHash('')
  }

  return { pay, status, txHash, error, reset }
}
