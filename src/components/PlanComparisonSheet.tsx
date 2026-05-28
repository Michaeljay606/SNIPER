import React, { useState, useMemo, lazy, Suspense } from 'react';
import { X, Zap, Crown, Sparkles, Check, Minus, ChevronRight, Pause, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TENANT_ID } from '../config';
import { PLAN_COMPARISON_ROWS } from '../hooks/usePlanFeatures';
import { useTonPayment } from '../hooks/useTonPayment';
import { useClientConfig } from '../hooks/useClientConfig';

const TonPaymentModal = lazy(() => import('./TonPaymentModal').then(m => ({ default: m.TonPaymentModal })));

interface PlanComparisonSheetProps {
  currentPlan: string;
  onClose: () => void;
}

type PlanId = 'free' | 'basic' | 'premium' | 'empire';

const PLANS: {
  id: PlanId;
  label: string;
  price: number;
  accent: string;
  accentDim: string;
  gradient: string;
  borderGlow: string;
  tagline: string;
  badge?: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'free',
    label: 'FREE',
    price: 0,
    accent: '#9CA3AF',
    accentDim: 'rgba(156,163,175,0.15)',
    gradient: 'linear-gradient(145deg, rgba(156,163,175,0.12) 0%, rgba(8,11,20,0.95) 55%, #060810 100%)',
    borderGlow: 'rgba(156,163,175,0.25)',
    tagline: 'Testez votre mini-app de signaux',
    icon: <Zap size={18} />,
  },
  {
    id: 'basic',
    label: 'BASIC',
    price: 49,
    accent: '#60A5FA',
    accentDim: 'rgba(96,165,250,0.18)',
    gradient: 'linear-gradient(145deg, rgba(59,130,246,0.22) 0%, rgba(8,11,20,0.92) 50%, #060810 100%)',
    borderGlow: 'rgba(59,130,246,0.45)',
    tagline: 'Signaux illimites et acces paiement',
    icon: <Sparkles size={18} />,
  },
  {
    id: 'premium',
    label: 'PREMIUM',
    price: 99,
    accent: '#A78BFA',
    accentDim: 'rgba(167,139,250,0.22)',
    gradient: 'linear-gradient(155deg, rgba(139,92,246,0.35) 0%, rgba(88,28,135,0.15) 35%, rgba(8,11,20,0.95) 70%, #060810 100%)',
    borderGlow: 'rgba(139,92,246,0.65)',
    tagline: 'Binaire, paiements TON et analytics',
    badge: 'LE PLUS POPULAIRE',
    icon: <Crown size={18} />,
  },
  {
    id: 'empire',
    label: 'EMPIRE',
    price: 199,
    accent: '#FFD60A',
    accentDim: 'rgba(255,214,10,0.2)',
    gradient: 'linear-gradient(155deg, rgba(255,214,10,0.28) 0%, rgba(180,130,0,0.12) 40%, rgba(8,11,20,0.95) 75%, #060810 100%)',
    borderGlow: 'rgba(255,214,10,0.7)',
    tagline: 'Hybride, white-label et croissance max',
    badge: 'ULTIMATE',
    icon: <Crown size={18} fill="currentColor" />,
  },
];

const ORDER: PlanId[] = ['free', 'basic', 'premium', 'empire'];

const FEATURE_GROUPS = [
  { title: 'Limites & capacite', keys: ['Signaux / jour', 'Membres max', 'Leçons Academy'] },
  { title: 'Monetisation & acces', keys: ['Profil', 'Brokers affiliés', 'Modèle accès', 'TON Connect'] },
  { title: 'Croissance & analytics', keys: ['Coaching Elite', 'Analytics', 'Notifs auto Telegram'] },
  { title: 'Trading & exclusifs', keys: ['Mode Binaire', 'Hybride Forex+Binaire', 'Blockchain Watcher', 'Support prioritaire', 'Leaderboard', 'Badge SNIPER'] },
];

function planIndex(id: string): number {
  return ORDER.indexOf(id as PlanId);
}

function CellValue({ val, accent, highlight }: { val: string | boolean; accent: string; highlight?: boolean }) {
  if (typeof val === 'boolean') {
    return val ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: 8,
          background: highlight ? `${accent}22` : 'rgba(0,255,65,0.1)',
          border: highlight ? `1px solid ${accent}55` : '1px solid rgba(0,255,65,0.25)',
          color: highlight ? accent : '#00FF41',
        }}
      >
        <Check size={12} strokeWidth={3} />
      </span>
    ) : (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          color: 'rgba(255,255,255,0.15)',
        }}
      >
        <Minus size={12} />
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: 'var(--mono), Space Mono, monospace',
        fontSize: highlight ? 12 : 10,
        fontWeight: highlight ? 800 : 700,
        color: highlight ? accent : 'rgba(255,255,255,0.75)',
        letterSpacing: 0,
        lineHeight: 1.25,
        textAlign: 'right',
        overflowWrap: 'anywhere',
      }}
    >
      {val}
    </span>
  );
}

function getModeContext(mode?: string) {
  if (mode === 'binary') {
    return {
      label: 'Terminal binaire',
      subtitle: 'Plans adaptes aux signaux CALL/PUT, UP/DOWN, expirations, payout et plateformes binaires.',
      modeFeature: 'Mode binaire',
      hybridFeature: 'Hybride Marches+Binaire',
      brokersLabel: 'Plateformes affiliees',
    };
  }
  if (mode === 'both') {
    return {
      label: 'Terminal hybride',
      subtitle: 'Comparez les limites pour un terminal Forex, Crypto et Binaire dans une seule mini-app.',
      modeFeature: 'Mode binaire inclus',
      hybridFeature: 'Hybride Forex+Binaire',
      brokersLabel: 'Brokers / plateformes',
    };
  }
  return {
    label: 'Terminal marches',
    subtitle: 'Plans adaptes aux signaux Forex, Crypto, indices et a la croissance de votre communaute.',
    modeFeature: 'Mode binaire',
    hybridFeature: 'Hybride Forex+Binaire',
    brokersLabel: 'Brokers affilies',
  };
}

function displayLabel(label: string, modeContext: ReturnType<typeof getModeContext>) {
  if (label === 'Mode Binaire') return modeContext.modeFeature;
  if (label === 'Hybride Forex+Binaire') return modeContext.hybridFeature;
  if (label.includes('Brokers')) return modeContext.brokersLabel;
  if (label.includes('Mod')) return 'Modele d acces';
  if (label.includes('Le')) return label.replace('LeÃ§ons', 'Lecons');
  return label;
}

export default function PlanComparisonSheet({ currentPlan, onClose }: PlanComparisonSheetProps) {
  const { t } = useTranslation();
  const { config } = useClientConfig();
  const [focusPlan, setFocusPlan] = useState<PlanId>(() => {
    if (currentPlan === 'empire') return 'empire';
    if (currentPlan === 'premium' || currentPlan === 'pause') return 'premium';
    if (currentPlan === 'basic') return 'basic';
    return 'premium';
  });

  const focusMeta = PLANS.find(p => p.id === focusPlan)!;
  const currentIdx = planIndex(currentPlan);
  const modeContext = getModeContext(config?.tradingMode);

  const tg = (window as any).Telegram?.WebApp;
  const user = {
    id: tg?.initDataUnsafe?.user?.id,
    telegramUsername: tg?.initDataUnsafe?.user?.username,
    name: tg?.initDataUnsafe?.user?.first_name
  };

  const { pay: startTonPayment, status: tonStatus, error: tonError, reset: resetTon } = useTonPayment();
  const [showTonPayment, setShowTonPayment] = useState(false);

  const handleUpgrade = async (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    const wallet = import.meta.env.VITE_SNIPER_WALLET;
    if (!wallet) {
      alert(t('plan.wallet_not_configured', "Erreur: Le portefeuille de la plateforme n'est pas configuré."));
      return;
    }

    setShowTonPayment(true);
    try {
      await startTonPayment({
        toWallet: wallet,
        amountUsdt: plan.price,
        comment: `Upgrade plan ${plan.label} - Tenant: ${TENANT_ID}`,
        flow: 'subscription',
        tenantId: TENANT_ID,
        plan: plan.id,
        payerTelegramId: user.id,
        memberId: user.id?.toString(),
      });
    } catch (err) {
      console.error('TON Payment failed:', err);
    }
  };

  const handleTonClose = () => {
    if (tonStatus === 'confirmed') {
      onClose();
      window.location.reload();
    }
    setShowTonPayment(false);
    resetTon();
  };

  const groupedRows = useMemo(() => {
    return FEATURE_GROUPS.map(group => ({
      ...group,
      rows: PLAN_COMPARISON_ROWS.filter(r => group.keys.includes(r.label)),
    })).filter(g => g.rows.length > 0);
  }, []);

  return (
    <div className="plan-sheet-root">
      <style>{`
        @keyframes planSheetIn {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes planGlowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes planShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .plan-sheet-root {
          position: fixed;
          inset: 0;
          z-index: 600;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          animation: planSheetIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .plan-card-scroll { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .plan-card-scroll::-webkit-scrollbar { display: none; }
        .plan-card-item { scroll-snap-align: center; }
        .plan-cta-btn:active { transform: scale(0.97); }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 55%), rgba(3,5,10,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 430,
          alignSelf: 'center',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0e1219 0%, #080b12 45%, #05070c 100%)',
          boxShadow: '0 -32px 80px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.06) inset',
        }}
      >
        {/* Top mesh */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 180,
            background: 'radial-gradient(ellipse 70% 100% at 50% -20%, rgba(139,92,246,0.2), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,214,10,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: 44,
              height: 5,
              borderRadius: 99,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '4px 20px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(0,255,65,0.2) 0%, rgba(0,255,65,0.05) 100%)',
                  border: '1px solid rgba(0,255,65,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(0,255,65,0.15)',
                }}
              >
                <Zap size={16} color="#00FF41" />
              </div>
              <span
                style={{
                  fontFamily: 'var(--mono), Space Mono, monospace',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: 'rgba(0,255,65,0.7)',
                  textTransform: 'uppercase',
                }}
              >
                {t('plan.upgrade_terminal', 'Upgrade Terminal')}
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.65) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('plan.choose_your_plan', 'Choisissez votre plan')}
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, maxWidth: 300 }}>
              {modeContext.subtitle}
            </p>
            <div style={{ display: 'inline-flex', marginTop: 10, padding: '6px 10px', borderRadius: 99, border: `1px solid ${focusMeta.borderGlow}`, background: `${focusMeta.accent}12`, color: focusMeta.accent, fontFamily: 'var(--mono), Space Mono, monospace', fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {modeContext.label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              flexShrink: 0,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 2 }}>
          {/* Premium plan cards — horizontal snap */}
          <div
            className="plan-card-scroll"
            style={{
              display: 'flex',
              gap: 14,
              padding: '16px 20px 20px',
              overflowX: 'auto',
            }}
          >
            {PLANS.map(plan => {
              const isCurrent = currentPlan === plan.id;
              const isFocus = focusPlan === plan.id;
              const canUpgrade = planIndex(plan.id) > currentIdx;
              const isPopular = plan.badge === 'LE PLUS POPULAIRE';

              return (
                <div
                  key={plan.id}
                  className="plan-card-item"
                  onClick={() => setFocusPlan(plan.id)}
                  style={{
                    flex: '0 0 168px',
                    position: 'relative',
                    borderRadius: 20,
                    padding: '1px',
                    background: isFocus
                      ? `linear-gradient(135deg, ${plan.borderGlow}, rgba(255,255,255,0.08), ${plan.borderGlow})`
                      : 'rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transform: isFocus ? 'scale(1.02)' : 'scale(1)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    boxShadow: isFocus
                      ? `0 20px 50px ${plan.accentDim}, 0 0 0 1px ${plan.accentDim}`
                      : '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  {isPopular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 3,
                        padding: '4px 12px',
                        borderRadius: 99,
                        background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #7C3AED)',
                        backgroundSize: '200% auto',
                        animation: 'planShimmer 3s linear infinite',
                        fontFamily: 'var(--mono), Space Mono, monospace',
                        fontSize: 7,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
                      }}
                    >
                      ★ {t('plan.popular_badge', 'POPULAIRE').toUpperCase()}
                    </div>
                  )}
                  {plan.badge === 'ULTIMATE' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 3,
                        padding: '4px 12px',
                        borderRadius: 99,
                        background: 'linear-gradient(90deg, #B8860B, #FFD60A, #B8860B)',
                        fontFamily: 'var(--mono), Space Mono, monospace',
                        fontSize: 7,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: '#0a0800',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 24px rgba(255,214,10,0.45)',
                      }}
                    >
                      👑 {t('plan.ultimate_badge', 'ULTIMATE').toUpperCase()}
                    </div>
                  )}

                  <div
                    style={{
                      borderRadius: 19,
                      padding: '18px 16px 16px',
                      background: plan.gradient,
                      height: '100%',
                      minHeight: 200,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: plan.accentDim,
                        border: `1px solid ${plan.borderGlow}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: plan.accent,
                        marginBottom: 12,
                        boxShadow: `0 0 24px ${plan.accentDim}`,
                      }}
                    >
                      {plan.icon}
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--mono), Space Mono, monospace',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: plan.accent,
                      }}
                    >
                      {t(`plan.${plan.label.toLowerCase()}_label`, plan.label)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 6 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>
                        ${plan.price}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>/ {t('onboarding.monthly', 'mois')}</span>
                    </div>
                    <p
                      style={{
                        margin: '10px 0 0',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.45)',
                        lineHeight: 1.45,
                        flex: 1,
                      }}
                    >
                      {t(`plan.${plan.id}_tagline`, plan.tagline)}
                    </p>

                    {isCurrent ? (
                      <div
                        style={{
                          marginTop: 14,
                          padding: '10px 0',
                          textAlign: 'center',
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${plan.accent}44`,
                          fontFamily: 'var(--mono), Space Mono, monospace',
                          fontSize: 9,
                          fontWeight: 800,
                          color: plan.accent,
                          letterSpacing: '0.1em',
                        }}
                      >
                        ✓ {t('common.active', 'ACTIF').toUpperCase()}
                      </div>
                    ) : canUpgrade ? (
                      <button
                        type="button"
                        className="plan-cta-btn"
                        onClick={e => {
                          e.stopPropagation();
                          handleUpgrade(plan.id);
                        }}
                        style={{
                          marginTop: 14,
                          width: '100%',
                          padding: '11px 0',
                          borderRadius: 12,
                          border: 'none',
                          cursor: 'pointer',
                          background: `linear-gradient(135deg, ${plan.accent} 0%, ${plan.accent}cc 100%)`,
                          color: plan.id === 'empire' ? '#0a0800' : '#fff',
                          fontFamily: 'var(--mono), Space Mono, monospace',
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          boxShadow: `0 8px 28px ${plan.accentDim}`,
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        {t('plan.choose_plan', 'CHOISIR')} <ChevronRight size={12} />
                      </button>
                    ) : (
                      <div style={{ marginTop: 14, height: 40 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Focus plan spotlight CTA */}
          {planIndex(focusPlan) > currentIdx && (
            <div style={{ padding: '0 20px 16px' }}>
              <button
                type="button"
                className="plan-cta-btn"
                onClick={() => handleUpgrade(focusPlan)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  background: `linear-gradient(135deg, ${focusMeta.accent} 0%, ${focusMeta.accent}99 50%, ${focusMeta.accent} 100%)`,
                  backgroundSize: '200% auto',
                  animation: 'planShimmer 4s ease infinite',
                  color: focusPlan === 'empire' ? '#0a0800' : '#fff',
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  boxShadow: `0 12px 40px ${focusMeta.accentDim}, 0 0 0 1px ${focusMeta.borderGlow}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {t('plan.upgrade_to', 'Passer à')} {focusMeta.label} — ${focusMeta.price}/{t('onboarding.monthly', 'mois')}
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Segmented plan selector for table */}
          <div style={{ padding: '0 20px 14px' }}>
            <p
              style={{
                fontFamily: 'var(--mono), Space Mono, monospace',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {t('plan.detailed_comparison', 'Comparaison détaillée')}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                padding: 4,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {PLANS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFocusPlan(p.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: focusPlan === p.id ? `${p.accent}22` : 'transparent',
                    boxShadow: focusPlan === p.id ? `inset 0 0 0 1px ${p.borderGlow}` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--mono), Space Mono, monospace',
                      fontSize: 8,
                      fontWeight: 800,
                      color: focusPlan === p.id ? p.accent : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {p.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Feature groups — premium list for focused plan + mini grid */}
          <div style={{ padding: '0 20px 20px' }}>
            {groupedRows.map(group => (
              <div key={group.title} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--mono), Space Mono, monospace',
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: focusMeta.accent,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(`plan.group.${group.title}`, group.title)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                    }}
                  />
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: `1px solid ${focusMeta.borderGlow}`,
                    background: 'rgba(255,255,255,0.02)',
                    boxShadow: `0 8px 32px ${focusMeta.accentDim}`,
                  }}
                >
                  {group.rows.map((row, idx) => {
                    const val = row[focusPlan];
                    return (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderBottom:
                            idx < group.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.62)', paddingRight: 12, lineHeight: 1.3 }}>
                          {t(`plan.feature.${row.label}`, displayLabel(row.label, modeContext))}
                        </span>
                        <div style={{ maxWidth: '48%', display: 'flex', justifyContent: 'flex-end' }}>
                          <CellValue val={val} accent={focusMeta.accent} highlight />
                        </div>
                      </div>
                    );
                  })}
                </div></div>
            ))}
          </div>

          <div style={{ padding: '0 20px 22px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 10,
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--mono), Space Mono, monospace',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                }}>
                  {t('plan.quick_view', 'Vue rapide tous plans')}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.34)', marginTop: 4 }}>
                  {t('plan.swipe_to_compare', 'Glissez horizontalement pour comparer sans texte compressé.')}
                </div>
              </div>
            </div>

            <div style={{
              overflowX: 'auto',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.018)',
            }}>
              <div style={{ minWidth: 620 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '170px repeat(4, 1fr)',
                  gap: 0,
                  position: 'sticky',
                  top: 0,
                  background: '#0d1118',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ padding: '12px 14px', fontSize: 9, color: 'rgba(255,255,255,0.34)', fontWeight: 800 }}>{t('plan.feature', 'Fonction')}</div>
                  {PLANS.map(plan => (
                    <div key={plan.id} style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      fontFamily: 'var(--mono), Space Mono, monospace',
                      fontSize: 9,
                      fontWeight: 900,
                      color: plan.accent,
                    }}>
                      {plan.label}
                    </div>
                  ))}
                </div>

                {PLAN_COMPARISON_ROWS.map((row, idx) => (
                  <div key={`full-${row.label}`} style={{
                    display: 'grid',
                    gridTemplateColumns: '170px repeat(4, 1fr)',
                    gap: 0,
                    borderBottom: idx < PLAN_COMPARISON_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
                  }}>
                    <div style={{ padding: '12px 14px', fontSize: 10, color: 'rgba(255,255,255,0.48)', fontWeight: 700, lineHeight: 1.25 }}>
                      {t(`plan.feature.${row.label}`, displayLabel(row.label, modeContext))}
                    </div>
                    {ORDER.map(pid => {
                      const plan = PLANS.find(p => p.id === pid)!;
                      return (
                        <div key={pid} style={{ padding: '10px 8px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <CellValue val={row[pid]} accent={plan.accent} highlight={pid === focusPlan} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PAUSE plan */}
          <div style={{ padding: '0 20px 24px' }}>
            <div
              style={{
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'linear-gradient(135deg, rgba(255,59,48,0.08) 0%, rgba(8,11,20,0.9) 100%)',
                border: '1px solid rgba(255,59,48,0.2)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(255,59,48,0.12)',
                  border: '1px solid rgba(255,59,48,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF6B6B',
                }}
              >
                <Pause size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--mono), Space Mono, monospace',
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#FF6B6B',
                    letterSpacing: '0.1em',
                  }}
                >
                  PLAN PAUSE · $19/{t('onboarding.monthly', 'mois')}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
                  {t('plan.pause_desc', 'Admin en lecture seule. Membres gardent l\'accès. Réactivation instantanée.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <p
            style={{
              textAlign: 'center',
              margin: 0,
              fontFamily: 'var(--mono), Space Mono, monospace',
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase',
            }}
          >
            SNIPER · {t('plan.secure_payment', 'Paiement sécurisé')} · {t('plan.sniper_support', 'Support SNIPER')}
          </p>
        </div>
      </div>

      {/* TON Connect Payment Overlay */}
      <Suspense fallback={null}>
        <TonPaymentModal
          show={showTonPayment}
          status={tonStatus}
          error={tonError}
          onClose={handleTonClose}
          onReset={resetTon}
        />
      </Suspense>
    </div>
  );
}


