import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GraduationCap, ChevronRight, Check } from 'lucide-react';
import NeonButton from './NeonButton';
import TonPaymentSheet from './TonPaymentSheet';

interface AcademyModalProps {
  config: any;
  tenantProfile: any;
  onClose: () => void;
  user: any;
}

const AcademyModal: React.FC<AcademyModalProps> = ({ config, tenantProfile, onClose, user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'broker' | 'payment'>(
    tenantProfile?.academy_model === 'both' ? 'broker' : (tenantProfile?.academy_model === 'payment' ? 'payment' : 'broker')
  );
  const [selectedPlan, setSelectedPlan] = useState<string>('lifetime');
  const [brokerId, setBrokerId] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [showTonPayment, setShowTonPayment] = useState(false);

  const currency = tenantProfile?.vip_currency || '$';
  const mentorTelegram = tenantProfile?.social_telegram?.replace('https://t.me/', '').split('?')[0] || config.socialTelegram?.replace('https://t.me/', '').split('?')[0] || 'admin';
  const academyDurationModel = tenantProfile?.academy_duration_model || 'lifetime';

  const allAcademyPlans = [
    { id: '1m',       label: 'Mensuel',       price: tenantProfile?.academy_price_1m || tenantProfile?.academy_price_lifetime || '29',  hidden: academyDurationModel === 'lifetime' },
    { id: 'lifetime', label: t('academy_modal.lifetime'), price: tenantProfile?.academy_price_lifetime || '299', hidden: academyDurationModel === 'monthly' },
  ];
  const plans = allAcademyPlans.filter(p => !p.hidden);

  const handlePaymentClick = () => {
    const plan = plans.find(p => p.id === selectedPlan) || plans[0];
    const msg = encodeURIComponent(
      t('academy_modal.payment_msg', {
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
      alert(t('academy_modal.error_sending'));
    }
  };

  const brokers = [
    { name: tenantProfile?.broker_1_name, url: tenantProfile?.broker_1_url },
    { name: tenantProfile?.broker_2_name, url: tenantProfile?.broker_2_url },
    { name: tenantProfile?.broker_3_name, url: tenantProfile?.broker_3_url },
  ].filter(b => b.name && b.url);

  return (
    <>
    {showTonPayment ? (
      <TonPaymentSheet
        flow="academy_access"
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
      {/* Overlay with blur to see app behind */}
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
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-accent-neon/10 border border-accent-neon/20 flex items-center justify-center text-accent-neon mb-4 rotate-3">
              <GraduationCap size={28} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-text-primary uppercase italic">{t('academy_modal.title')}</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent-neon font-bold mt-1">
              {tenantProfile?.mentor_name || config.mentorName}
            </p>
          </div>

          {tenantProfile?.academy_model === 'both' && (
            <div className="bg-bg-surface p-1 rounded-2xl flex gap-1 mb-8 border border-border-subtle">
              <button 
                onClick={() => setActiveTab('broker')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'broker' ? 'bg-accent-neon text-text-inverse shadow-[0_0_15px_rgba(0,255,153,0.3)]' : 'text-text-muted'}`}
              >
                {t('academy_modal.broker')}
              </button>
              <button 
                onClick={() => setActiveTab('payment')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'payment' ? 'bg-accent-neon text-text-inverse shadow-[0_0_15px_rgba(0,255,153,0.3)]' : 'text-text-muted'}`}
              >
                {t('academy_modal.payment')}
              </button>
            </div>
          )}

          {activeTab === 'broker' && (
            <div className="space-y-6">
              {!selectedBroker ? (
                <>
                  <div className="bg-accent-neon/5 border border-accent-neon/20 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-[12px] text-accent-neon leading-relaxed uppercase tracking-widest font-black">
                      {t('academy_modal.offered_training')}
                    </p>
                    <p className="text-[10px] text-text-secondary leading-relaxed uppercase font-bold italic">
                      {tenantProfile?.broker_msg_academy || t('admin.broker_msg_default')}
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
                          <div className="w-12 h-12 rounded-xl bg-black border border-border-subtle flex items-center justify-center font-black text-xs text-text-muted group-hover:text-accent-neon group-hover:border-accent-neon/30 transition-all">
                            {broker.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-black text-text-primary block uppercase tracking-tight">{broker.name}</span>
                            <span className="text-[9px] text-text-muted uppercase tracking-widest font-bold">{t('academy_modal.partner_link')}</span>
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
                    <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">{t('academy_modal.request_saved')}</h3>
                    <p className="text-[11px] text-text-muted uppercase tracking-[0.2em] font-bold mt-2">{t('academy_modal.validation_24h')}</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-bg-surface border border-border-subtle rounded-2xl text-[12px] font-black text-text-primary uppercase tracking-widest hover:bg-bg-elevated transition-all"
                  >
                    {t('academy_modal.back_to_terminal')}
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
                    <button onClick={() => setSelectedBroker(null)} className="text-[10px] font-black text-accent-neon uppercase underline tracking-tighter">{t('academy_modal.change')}</button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] text-center">{t('academy_modal.account_id_title')}</h3>
                    <input 
                      type="text" 
                      placeholder={t('academy_modal.id_placeholder')}
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
                      {t('academy_modal.submit_broker')}
                    </NeonButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              {/* Plan Selector — shows cards if multiple plans available */}
              {plans.length > 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {plans.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all text-center space-y-1 ${
                        selectedPlan === plan.id
                          ? 'bg-accent-neon/10 border-accent-neon shadow-[0_0_15px_rgba(0,255,153,0.15)]'
                          : 'bg-bg-surface border-border-subtle opacity-60 hover:opacity-90'
                      }`}
                    >
                      <p className="text-[10px] font-black text-text-primary uppercase tracking-widest">{plan.label}</p>
                      <p className="text-xl font-mono font-black text-accent-neon">{plan.price}{currency}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Single plan or selected plan price display */}
              {plans.length === 1 && (
                <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 text-center space-y-2">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                    {plans[0].id === 'lifetime' ? t('academy_modal.unlimited_lifetime') : 'Accès Mensuel'}
                  </p>
                  <div className="text-3xl font-mono font-black text-accent-neon tracking-tighter">
                    {plans[0].price}{currency}
                  </div>
                  <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest">
                    {plans[0].id === 'lifetime' ? t('academy_modal.one_time_payment') : 'Par mois'}
                  </p>
                </div>
              )}

              <div className="pt-4 space-y-4">
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
                  onClick={handlePaymentClick}
                  variant="gold"
                  className="w-full h-14 text-sm shadow-[0_10px_25px_rgba(255,193,7,0.2)]"
                >
                  {t('academy_modal.cta')} — {plans.find(p => p.id === selectedPlan)?.price}{currency}
                </NeonButton>
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-[9px] text-text-primary uppercase font-black tracking-widest italic">{t('academy_modal.need_help')}</span>
                  <span className="text-[10px] text-text-primary uppercase font-black tracking-widest underline">{t('academy_modal.contact')} @{mentorTelegram.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    )}
    </>
  );
};

export default AcademyModal;
