import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, Zap, Check } from 'lucide-react';
import NeonButton from './NeonButton';
import TonPaymentSheet from './TonPaymentSheet';

interface VipModalProps {
  config: any;
  tenantProfile: any;
  onClose: () => void;
  user: any;
}

const VipModal: React.FC<VipModalProps> = ({ config, tenantProfile, onClose, user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'payment' | 'broker'>(
    tenantProfile?.vip_model === 'both' ? 'payment' : (tenantProfile?.vip_model === 'broker' ? 'broker' : 'payment')
  );

  const [brokerId, setBrokerId] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [showTonPayment, setShowTonPayment] = useState(false);

  const currency = tenantProfile?.vip_currency || '$';
  const mentorTelegram = tenantProfile?.social_telegram?.replace('https://t.me/', '').split('?')[0] || config.socialTelegram?.replace('https://t.me/', '').split('?')[0] || 'admin';

  const plans = [
    { id: '1m', label: t('vip_modal.one_month'), price: tenantProfile?.vip_price_1m || '99', savings: null, hidden: tenantProfile?.signals_duration_model === 'lifetime' },
    { id: '2m', label: t('vip_modal.two_months'), price: tenantProfile?.vip_price_2m || '179', savings: '-10%', hidden: tenantProfile?.signals_duration_model === 'lifetime' },
    { id: '1y', label: t('vip_modal.one_year'), price: tenantProfile?.vip_price_1y || '599', savings: '-40%', hidden: tenantProfile?.signals_duration_model === 'lifetime' },
    { id: 'lifetime', label: t('vip_modal.lifetime'), price: tenantProfile?.vip_price_lifetime || '999', savings: t('vip_modal.best_price'), hidden: false },
  ].filter(p => !p.hidden);

  const [selectedPlan, setSelectedPlan] = useState<'1m' | '2m' | '1y' | 'lifetime'>(plans[0]?.id as any || 'lifetime');

  const handleTelegramPayment = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    const msg = encodeURIComponent(
      t('vip_modal.payment_msg', {
        plan: plan?.label,
        price: plan?.price,
        currency: currency,
        username: user?.telegramUsername || 'inconnu',
        id: user?.id || 'inconnu'
      })
    );
    window.open(`https://t.me/${mentorTelegram}?text=${msg}`, '_blank');
  };

  const handleSubmitBroker = async () => {
    if (!brokerId.trim() || !selectedBroker) return;
    
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('affiliates').insert([{
        tenant_id: tenantProfile.tenant_id || tenantProfile.id,
        telegram_id: user?.id,
        name: user?.name || user?.telegramUsername,
        broker_id: brokerId,
        broker_name: selectedBroker.name,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
      
      if (error) throw error;
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(t('vip_modal.error_sending'));
    }
  };

  const brokers = [
    { name: tenantProfile?.broker_1_name, url: tenantProfile?.broker_1_url },
    { name: tenantProfile?.broker_2_name, url: tenantProfile?.broker_2_url },
    { name: tenantProfile?.broker_3_name, url: tenantProfile?.broker_3_url },
    { name: tenantProfile?.broker_4_name, url: tenantProfile?.broker_4_url },
    { name: tenantProfile?.broker_5_name, url: tenantProfile?.broker_5_url },
  ].filter(b => b.name && b.url);

  return (
    <>
    {showTonPayment ? (
      <TonPaymentSheet
        flow="vip_access"
        plan={plans.find(p => p.id === selectedPlan)?.label}
        amountUsdt={parseFloat(plans.find(p => p.id === selectedPlan)?.price || '0')}
        toWallet={tenantProfile?.wallets?.ton || tenantProfile?.ton_wallet || config?.ton_wallet || ''}
        tenantId={tenantProfile?.tenant_id || tenantProfile?.id}
        memberId={user?.id}
        mentorName={tenantProfile?.mentor_name || config.mentorName}
        onSuccess={() => {
          setShowTonPayment(false);
          onClose();
        }}
        onClose={() => setShowTonPayment(false)}
      />
    ) : (
    <div className="fixed inset-0 z-[600] flex items-end justify-center px-0 sm:px-4">
      {/* Overlay with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Bottom Sheet Wrapper */}
      <div className="relative z-10 w-full max-w-[500px] bg-modal-bg border-t border-modal-border rounded-t-[32px] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
        
        {/* Mobile handle */}
        <div className="w-full flex justify-center py-4">
          <div className="w-12 h-1.5 bg-bg-elevated rounded-full" />
        </div>

        {/* Floating Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center bg-bg-surface rounded-full text-text-muted hover:text-text-primary transition-all active:scale-90"
        >
          <X size={18} />
        </button>

        {/* Content Area */}
        <div className="px-6 pb-12 overflow-y-auto max-h-[80vh]">
          <div className="flex flex-col items-center text-center mb-8 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-accent-neon/10 border border-accent-neon/20 flex items-center justify-center text-accent-neon mb-4 -rotate-3">
              <Zap size={28} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-text-primary uppercase italic">{t('vip_modal.title')}</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent-neon font-bold mt-1">
              {tenantProfile?.mentor_name || config.mentorName}
            </p>
          </div>

          {tenantProfile?.vip_model === 'both' && (
            <div className="bg-bg-surface p-1 rounded-2xl flex gap-1 mb-8 border border-border-subtle">
              <button 
                onClick={() => setActiveTab('payment')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'payment' ? 'bg-accent-neon text-text-inverse shadow-[0_0_15px_rgba(0,255,153,0.3)]' : 'text-text-muted'}`}
              >
                {t('vip_modal.payment')}
              </button>
              <button 
                onClick={() => setActiveTab('broker')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'broker' ? 'bg-accent-neon text-text-inverse shadow-[0_0_15px_rgba(0,255,153,0.3)]' : 'text-text-muted'}`}
              >
                {t('vip_modal.broker')}
              </button>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as any)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                      selectedPlan === plan.id 
                        ? 'bg-accent-neon/10 border-accent-neon shadow-[0_0_20px_rgba(0,255,153,0.1)]' 
                        : 'bg-bg-surface border-border-subtle hover:border-border-subtle'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-black text-text-muted uppercase tracking-widest leading-none">{plan.label}</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selectedPlan === plan.id ? 'bg-accent-neon' : 'border-2 border-border-subtle'
                      }`}>
                        {selectedPlan === plan.id && <Check size={12} className="text-black font-black" />}
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`text-2xl font-mono font-black tracking-tighter ${selectedPlan === plan.id ? 'text-accent-neon' : 'text-text-primary'}`}>
                        {plan.price}{currency}
                      </span>
                      {plan.savings && (
                        <span className="text-[8px] font-black text-accent-neon uppercase tracking-tighter mt-1">
                          {plan.savings}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-3">
                {/* TON Connect button — only if tonPaymentEnabled AND (ton_wallet OR wallets.ton) set */}
                {(config?.tonPaymentEnabled || tenantProfile?.ton_payment_enabled) &&
                 (config?.tonWallet || tenantProfile?.ton_wallet || tenantProfile?.wallets?.ton) && (
                  <button
                    onClick={() => setShowTonPayment(true)}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(0,255,65,0.06)',
                      border: '1px solid rgba(0,255,65,0.2)',
                      color: 'var(--accent-neon)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Space Mono, monospace',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>💎</span>
                    PAYER EN USDT (TON)
                  </button>
                )}

                {/* Manual Wallets Display */}
                {tenantProfile?.wallets?.usdtTrc20 && (
                  <div className="p-4 rounded-2xl bg-bg-surface border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">USDT TRC20 (Manuel)</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(tenantProfile.wallets.usdtTrc20);
                          alert('Adresse copiée !');
                        }}
                        className="text-[9px] font-black text-accent-neon uppercase tracking-tighter"
                      >
                        Copier
                      </button>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl border border-border-subtle">
                      <p className="text-[10px] font-mono text-text-secondary break-all leading-relaxed">
                        {tenantProfile.wallets.usdtTrc20}
                      </p>
                    </div>
                  </div>
                )}
                <NeonButton 
                  onClick={handleTelegramPayment}
                  variant="gold"
                  className="w-full h-14 text-sm shadow-[0_10px_25px_rgba(255,193,7,0.2)]"
                >
                  {t('vip_modal.cta')} — {plans.find(p => p.id === selectedPlan)?.price}{currency}
                </NeonButton>
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-[9px] text-text-primary uppercase font-black tracking-widest italic">{t('plans.activation_note')}</span>
                  <span className="text-[10px] text-text-primary uppercase font-black tracking-widest underline">{t('vip_modal.contact')} @{mentorTelegram.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'broker' && (
            <div className="space-y-6">
              {!selectedBroker ? (
                <>
                  <div className="bg-accent-neon/5 border border-accent-neon/20 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-[12px] text-accent-neon leading-relaxed uppercase tracking-widest font-black">
                      {t('vip_modal.offered_access')}
                    </p>
                    <p className="text-[10px] text-text-secondary leading-relaxed uppercase font-bold italic">
                      {tenantProfile?.broker_msg_vip || t('admin.broker_msg_default')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {brokers.map((broker, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          window.open(broker.url, '_blank');
                          setSelectedBroker(broker);
                        }}
                        className="group p-4 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-between cursor-pointer hover:border-accent-neon/40 hover:bg-bg-elevated transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-black border border-border-subtle flex items-center justify-center font-black text-xs text-text-muted group-hover:text-accent-neon transition-all">
                            {broker.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-black text-text-primary block uppercase tracking-tight">{broker.name}</span>
                            <span className="text-[9px] text-text-muted uppercase tracking-widest font-bold">{t('vip_modal.partner_link')}</span>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-text-muted group-hover:text-accent-neon transition-all" />
                      </div>
                    ))}
                  </div>
                </>
              ) : isSubmitted ? (
                <div className="py-10 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-accent-neon/10 border border-accent-neon/30 flex items-center justify-center text-accent-neon shadow-[0_0_30px_rgba(0,255,153,0.1)]">
                    <Check size={40} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">{t('vip_modal.verification_msg')}</h3>
                    <p className="text-[11px] text-text-muted uppercase tracking-[0.2em] font-bold mt-2">{t('vip_modal.activation_max')}</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-bg-surface border border-border-subtle rounded-2xl text-[12px] font-black text-text-primary uppercase tracking-widest hover:bg-bg-elevated transition-all"
                  >
                    {t('vip_modal.close')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="p-4 bg-bg-surface rounded-2xl border border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-[10px] font-black text-accent-neon">
                        {selectedBroker.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-black text-text-primary uppercase">{selectedBroker.name}</span>
                    </div>
                    <button onClick={() => setSelectedBroker(null)} className="text-[10px] font-black text-accent-neon uppercase underline tracking-tighter">{t('vip_modal.change')}</button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] text-center">{t('vip_modal.account_id_title')}</h3>
                    <input 
                      type="text" 
                      placeholder={t('vip_modal.id_placeholder')}
                      value={brokerId}
                      onChange={(e) => setBrokerId(e.target.value)}
                      className="w-full h-14 bg-bg-surface border-2 border-border-subtle rounded-2xl px-6 font-mono text-lg text-accent-neon text-center focus:border-accent-neon outline-none transition-all placeholder:text-text-muted"
                    />
                    <NeonButton 
                      onClick={handleSubmitBroker}
                      disabled={!brokerId.trim()}
                      variant="gold"
                      className="w-full h-14 text-sm shadow-[0_10px_25px_rgba(255,193,7,0.2)]"
                    >
                      {t('vip_modal.verify_account')}
                    </NeonButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    )}
    </>
  );
};

export default VipModal;
