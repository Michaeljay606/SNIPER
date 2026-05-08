import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { TENANT_ID } from '../config';
import { PlanCard } from './PlanCard';
import { Zap, Shield, Crown } from 'lucide-react';
import TonPaymentSheet from './TonPaymentSheet';

interface MentorUpgradePageProps {
  config: any;
}
export default function MentorUpgradePage({ config }: MentorUpgradePageProps) {
  const { t } = useTranslation();
  const currentPlan = config?.plan || 'free';
  const features = usePlanFeatures(currentPlan as any);
  
  // Decide the default selected plan to upgrade to.
  const defaultSelected = 
    currentPlan === 'free' ? 'basic' :
    currentPlan === 'basic' ? 'premium' :
    'empire';
    
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'empire'>(defaultSelected as any);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const PLAN_PRICES = {
    basic: 49, premium: 99, empire: 199, pause: 19
  };

  const handleUpgradeClick = (planLabel: string, price: number) => {
    setShowPaymentSheet(true);
  };

  return (
    <div className="flex flex-col gap-0 animate-in fade-in duration-700 pb-20 relative">
      {/* Background Auras */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-neon/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-40 left-0 w-64 h-64 bg-accent-warning/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 px-4">
        {/* HEADER BLOCK */}
        <div className="text-center pt-8 pb-6 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-bg-elevated to-bg-void border border-border-subtle shadow-[0_0_30px_rgba(0,255,65,0.1)] relative group">
            <div className="absolute inset-0 bg-accent-neon/20 blur-xl group-hover:bg-accent-neon/30 transition-all duration-500" />
            <Crown size={32} className="text-accent-warning relative z-10 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tighter text-text-primary uppercase">
              {t('upgrade.title_1')} <span className="text-accent-neon">{t('upgrade.title_2')}</span>
            </h2>
            <h2 className="text-xs text-text-secondary leading-relaxed max-w-[280px] mx-auto">
              {currentPlan === 'free' 
                ? t('upgrade.subtitle_free')
                : t('upgrade.subtitle_basic')}
            </h2>
          </div>
        </div>

        {/* CURRENT PLAN BADGE */}
        <div className="flex items-center justify-center mb-8">
          <div className="px-4 py-2 rounded-full bg-bg-surface border border-border-subtle flex items-center gap-2 shadow-lg backdrop-blur-sm">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{t('upgrade.current_plan')}</span>
            <span className="text-[10px] text-accent-neon uppercase tracking-widest font-black flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-accent-neon rounded-full animate-pulse" />
              {features.planLabel}
            </span>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="space-y-6 relative">
          {(['basic', 'premium', 'empire'] as const).map((planKey) => {
            const prices = { basic: 49, premium: 99, empire: 199 };
            const labels = { basic: 'BASIC', premium: 'PREMIUM', empire: 'EMPIRE' };
            const isCurrentPlan = currentPlan === planKey;

            return (
              <div key={planKey} className="relative">
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="px-3 py-1 bg-bg-elevated backdrop-blur-xl border border-border-card rounded-full text-[8px] font-black uppercase tracking-widest text-text-primary shadow-2xl">
                      {t('upgrade.your_plan')}
                    </span>
                  </div>
                )}
                <div className={`transition-all duration-300 ${isCurrentPlan ? 'opacity-50 pointer-events-none scale-[0.98]' : ''}`}>
                  <PlanCard
                    plan={planKey}
                    selected={selectedPlan === planKey && !isCurrentPlan}
                    onSelect={() => !isCurrentPlan && setSelectedPlan(planKey)}
                    onCTA={() => handleUpgradeClick(labels[planKey], prices[planKey])}
                    showCTA={!isCurrentPlan}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* SECURE PAYMENT INFO */}
        <div className="mt-8 pt-6 border-t border-border-subtle text-center space-y-3">
          <div className="flex items-center justify-center gap-3 opacity-40 grayscale">
            <Shield size={16} className="text-text-primary" />
            <Zap size={16} className="text-text-primary" />
          </div>
          <p className="text-[9px] text-text-muted uppercase tracking-[0.15em] font-mono leading-relaxed">
            {t('plans.secure_payment')}<br/>
            {t('plans.auto_activation')}
          </p>
        </div>
      </div>
      
      {showPaymentSheet && (
        <TonPaymentSheet
          flow="subscription"
          plan={selectedPlan}
          amountUsdt={PLAN_PRICES[selectedPlan] || 0}
          toWallet={import.meta.env.VITE_EPHATA_WALLET}
          tenantId={TENANT_ID}
          mentorName={config?.mentorName ?? ''}
          onSuccess={() => {
            setShowPaymentSheet(false);
            window.location.reload(); // Quick refresh to grab new plan from DB
          }}
          onClose={() => setShowPaymentSheet(false)}
        />
      )}
    </div>
  );
}
