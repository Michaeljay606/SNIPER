import React from 'react';
import { useTonPayment } from '../hooks/useTonPayment';
import { Loader2 } from 'lucide-react';

interface TonPaymentSheetProps {
  flow: 'subscription' | 'vip_access' | 'academy_access';
  plan?: string;
  amountUsdt: number;
  toWallet: string;
  tenantId: string;
  memberId?: string;
  mentorName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function TonPaymentSheet({
  flow,
  plan,
  amountUsdt,
  toWallet,
  tenantId,
  memberId,
  mentorName,
  onSuccess,
  onClose
}: TonPaymentSheetProps) {
  const { pay, status, txHash, error, reset } = useTonPayment();

  const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  const comment = `EPHATA-${flow === 'subscription' ? 'SUB' : (flow === 'vip_access' ? 'VIP' : 'ACA')}-${tenantId}-${Date.now()}`;

  const handlePay = () => {
    pay({
      toWallet,
      amountUsdt,
      comment,
      flow,
      tenantId,
      plan,
      payerTelegramId: telegramUser?.id,
      memberId,
    });
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center px-0 sm:px-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-300" 
        onClick={status === 'idle' || status === 'failed' || status === 'confirmed' ? onClose : undefined} 
      />
      
      <div className="relative z-10 w-full max-w-[500px] bg-[#0A0A0A] border-t border-border-subtle rounded-t-[32px] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
        <div className="w-full flex justify-center py-4">
          <div className="w-12 h-1.5 bg-bg-elevated rounded-full" />
        </div>

        <div className="px-6 pb-12 overflow-y-auto max-h-[85vh]">
          {status === 'idle' && (
            <div className="flex flex-col">
              <div className="flex flex-col items-center text-center mb-8 pt-2">
                <div className="w-12 h-12 rounded-full bg-accent-neon/10 border-2 border-accent-neon flex items-center justify-center text-2xl mb-4 shadow-[0_0_24px_rgba(0,255,65,0.3)]">
                  💎
                </div>
                <h2 className="text-xl font-black tracking-tight text-text-primary uppercase">
                  {flow === 'subscription' ? `Activer le plan ${plan}` : `Accès VIP — ${mentorName}`}
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">
                  Paiement sécurisé via TON Network
                </p>
              </div>

              <div style={{
                background: 'rgba(0,255,65,0.04)',
                border: '1px solid rgba(0,255,65,0.12)',
                borderRadius: '12px', padding: '16px',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', marginBottom: '4px' }}>
                    MONTANT
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#00FF41' }}>
                    {amountUsdt} USDT
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    = ${amountUsdt.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    ≈ 1 USDT = $1.00
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center',
                margin: '16px 0', flexWrap: 'wrap'
              }}>
                {['Réseau: TON', 'Token: USDT', 'Frais: ~0.1 TON'].map((pill, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '20px', padding: '4px 10px',
                    fontSize: '10px', fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.4)'
                  }}>
                    {pill}
                  </div>
                ))}
              </div>

              <button
                onClick={handlePay}
                style={{
                  background: '#00FF41', color: '#050507',
                  fontWeight: 800, height: '52px',
                  borderRadius: '14px', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', marginTop: '8px'
                }}
              >
                PAYER {amountUsdt} USDT →
              </button>

              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '16px' }}>
                Transaction vérifiée sur la blockchain TON
              </div>
            </div>
          )}

          {(status === 'connecting' || status === 'waiting_signature') && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px',
              padding: '40px 16px',
            }}>
              <Loader2 size={32} className="text-accent-neon animate-spin" />
              
              <div style={{
                fontSize: '13px', fontWeight: 600,
                color: '#F0F0F0',
              }}>
                {status === 'connecting'
                  ? 'Connexion au wallet...'
                  : 'En attente de signature...'}
              </div>

              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                {status === 'connecting'
                  ? 'Ouvrez votre wallet Telegram pour continuer.'
                  : 'Confirmez la transaction dans votre wallet.'}
              </div>
            </div>
          )}

          {status === 'confirming' && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px',
              padding: '40px 16px',
            }}>
              <div className="w-full h-1 bg-bg-elevated rounded-full overflow-hidden relative mb-4">
                <div className="absolute inset-y-0 left-0 bg-accent-neon w-1/3 animate-[slide_2s_ease-in-out_infinite]" />
              </div>

              <Loader2 size={32} className="text-accent-neon animate-spin" />
              
              <div style={{
                fontSize: '13px', fontWeight: 600,
                color: '#F0F0F0',
              }}>
                Vérification en cours...
              </div>

              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                Confirmation sur la blockchain TON (~30s)
              </div>
            </div>
          )}

          {status === 'confirmed' && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px',
              padding: '40px 16px', textAlign: 'center',
            }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '50%',
                background: 'rgba(0,255,65,0.1)',
                border: '2px solid #00FF41',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: '0 0 24px rgba(0,255,65,0.3)',
              }}>
                ✓
              </div>

              <div style={{
                fontSize: '18px', fontWeight: 800,
                color: '#F0F0F0',
              }}>
                {flow === 'subscription'
                  ? `Plan ${plan?.toUpperCase()} activé !`
                  : 'Accès VIP débloqué !'}
              </div>

              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.7,
              }}>
                Paiement de {amountUsdt} USDT confirmé.<br/>
                {flow === 'vip_access' &&
                  'Tous les signaux VIP sont maintenant accessibles.'
                }
              </div>

              {txHash && (
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.2)',
                  fontFamily: 'Space Mono, monospace',
                  wordBreak: 'break-all',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '6px',
                  width: '100%',
                }}>
                  TX: {txHash.slice(0, 16)}...
                </div>
              )}

              <button
                onClick={() => { onSuccess(); onClose(); }}
                style={{
                  width: '100%', height: '48px',
                  borderRadius: '12px',
                  background: '#00FF41', color: '#050507',
                  fontWeight: 800, fontSize: '13px',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'Space Mono, monospace',
                  letterSpacing: '0.06em',
                  marginTop: '16px'
                }}
              >
                CONTINUER →
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>
                ⚠️
              </div>

              <div style={{
                fontSize: '14px', fontWeight: 700,
                color: '#F0F0F0', marginBottom: '8px',
              }}>
                Paiement non confirmé
              </div>

              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.7, marginBottom: '20px',
              }}>
                {error}
              </div>

              <button onClick={reset} style={{
                width: '100%', height: '44px',
                borderRadius: '12px', border: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Space Mono, monospace',
              }}>
                RÉESSAYER
              </button>

              <div style={{
                marginTop: '12px', fontSize: '10px',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'Space Mono, monospace',
              }}>
                Si vous avez été débité sans confirmation,
                contactez @EphataTechSupport
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
