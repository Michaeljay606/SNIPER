import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, Zap, Check, Loader, ShieldCheck, AlertCircle } from 'lucide-react';
import { useTonPayment } from '../hooks/useTonPayment';
import { useConfig } from '../context/ConfigContext';
import { supabase } from '../lib/supabase';
import { triggerNotification } from '../lib/notifications';

interface VipModalProps {
  config: any;
  tenantProfile?: any;
  onClose: () => void;
  user?: any;
  triggerType?: 'signals' | 'academy';
}

const VipModal: React.FC<VipModalProps> = ({ config, tenantProfile = config, onClose, user: userProp, triggerType = 'signals' }) => {
  const { t } = useTranslation();
  const tg = (window as any).Telegram?.WebApp;
  const user = userProp || {
    id: tg?.initDataUnsafe?.user?.id,
    telegramUsername: tg?.initDataUnsafe?.user?.username,
    name: tg?.initDataUnsafe?.user?.first_name
  };
  
  const modelToUse = triggerType === 'academy' ? tenantProfile?.academy_model : tenantProfile?.vip_model;
  
  const [activeTab, setActiveTab] = useState<'payment' | 'broker'>(
    modelToUse === 'both' ? 'payment' : (modelToUse === 'broker' ? 'broker' : 'payment')
  );

  const [brokerId, setBrokerId] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [showTonPayment, setShowTonPayment] = useState(false);
  const { pay: startTonPayment, status: tonStatus, error: tonError, reset: resetTon, txHash } = useTonPayment();
  const { refresh: refreshConfig } = useConfig();

  const currency = tenantProfile?.vip_currency || '$';
  const rawTelegram = tenantProfile?.social_telegram || config?.social_telegram || '';
  const mentorTelegram = rawTelegram.replace('https://t.me/', '').replace('@', '').split('?')[0];

  const isAcademy = triggerType === 'academy';
  const plans = isAcademy
    ? [
        { id: '1m', label: t('vip_modal.one_month'), price: tenantProfile?.academy_price_1m, savings: null, hidden: tenantProfile?.academy_duration_model === 'lifetime' },
        { id: 'lifetime', label: t('vip_modal.lifetime'), price: tenantProfile?.academy_price_lifetime, savings: t('vip_modal.best_price'), hidden: tenantProfile?.academy_duration_model === 'monthly' },
      ].filter(p => !p.hidden && p.price && p.price !== '0' && p.price !== 0)
    : [
        { id: '1m', label: t('vip_modal.one_month'), price: tenantProfile?.vip_price_1m, savings: null, hidden: tenantProfile?.signals_duration_model === 'lifetime' },
        { id: '1y', label: t('vip_modal.one_year'), price: tenantProfile?.vip_price_1y, savings: '-40%', hidden: tenantProfile?.signals_duration_model === 'lifetime' },
        { id: 'lifetime', label: t('vip_modal.lifetime'), price: tenantProfile?.vip_price_lifetime, savings: t('vip_modal.best_price'), hidden: false },
      ].filter(p => !p.hidden && p.price && p.price !== '0' && p.price !== 0);

  const [selectedPlan, setSelectedPlan] = useState<'1m' | '2m' | '1y' | 'lifetime'>(plans[0]?.id as any || '');

  const handleTelegramPayment = async () => {
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
    tg.openTelegramLink(`https://t.me/${mentorTelegram}?text=${msg}`);
    
    // Also track this request in access_requests table
    try {
      await supabase.from('access_requests').insert([{
        tenant_id: tenantProfile?.tenant_id || tenantProfile?.id,
        member_telegram_id: user?.id,
        member_username: user?.telegramUsername,
        request_type: isAcademy ? 'academy_payment' : 'vip_payment',
        access_target: isAcademy ? 'academy' : 'signals',
        payment_method: 'manual_telegram',
        amount: parseFloat(plan?.price || '0'),
        currency,
        plan_label: plan?.label,
        status: 'pending'
      }]);

      // Trigger notification to the mentor
      await triggerNotification({
        type: 'new_payment_request',
        tenant_id: tenantProfile?.tenant_id || tenantProfile?.id,
        target_type: 'mentor',
        data: {
          username: user?.telegramUsername || user?.name || 'inconnu',
          plan: plan?.label || 'Plan',
          amount: plan?.price || '0',
          currency
        }
      });
    } catch (e) {
      console.error("Failed to insert access_request", e);
    }
  };

  const handleTonPayment = async () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    const tonWallet = config?.ton_wallet || tenantProfile?.ton_wallet || tenantProfile?.wallets?.ton;
    if (!tonWallet) {
      alert("Erreur: Le mentor n'a pas configuré son adresse TON.");
      return;
    }

    setShowTonPayment(true);
    try {
      await startTonPayment({
        toWallet: tonWallet,
        amountUsdt: Number(plan.price),
        comment: `VIP Access - ${plan.label} - ${user?.telegramUsername || user?.id}`,
        flow: isAcademy ? 'academy_access' : 'vip_access',
        tenantId: tenantProfile?.tenant_id || tenantProfile?.id,
        plan: plan.id,
        payerTelegramId: user?.id,
        memberId: user?.id?.toString()
      });
    } catch (err) {
      console.error('TON Payment failed:', err);
    }
  };

  const handleTonClose = () => {
    if (tonStatus === 'confirmed') {
      onClose();
      window.location.reload(); // Refresh to get VIP status
    }
    setShowTonPayment(false);
    resetTon();
  };

  const handleSubmitBroker = async () => {
    if (!brokerId.trim() || !selectedBroker) return;
    
    try {
      const { error } = await supabase.from('affiliates').insert([{
        tenant_id: tenantProfile.tenant_id || tenantProfile.id,
        telegram_id: user?.id,
        name: user?.name || user?.telegramUsername,
        broker_id: brokerId,
        broker_name: selectedBroker.name,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
      
      // Track in access_requests table as well
      await supabase.from('access_requests').insert([{
        tenant_id: tenantProfile?.tenant_id || tenantProfile?.id,
        member_telegram_id: user?.id,
        member_username: user?.telegramUsername,
        request_type: isAcademy ? 'academy_broker' : 'vip_broker',
        access_target: isAcademy ? 'academy' : 'signals',
        payment_method: 'broker_affiliation',
        broker_name: selectedBroker.name,
        broker_account_id: brokerId,
        status: 'pending'
      }]);

      // Trigger notification to the mentor
      await triggerNotification({
        type: 'new_broker_request',
        tenant_id: tenantProfile?.tenant_id || tenantProfile?.id,
        target_type: 'mentor',
        data: {
          username: user?.telegramUsername || user?.name || 'inconnu',
          broker: selectedBroker.name,
          account_id: brokerId
        }
      });
      
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
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="w-full max-w-sm bg-modal-bg border border-modal-border rounded-[24px] p-8 text-center shadow-[0_0_50px_rgba(0,152,234,0.2)]">
          
          {tonStatus === 'confirmed' ? (
            <div className="animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <Check size={40} className="text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Paiement Confirmé !</h3>
              <p className="text-text-muted text-sm mb-8">Votre accès VIP est en cours d'activation. Veuillez patienter un instant.</p>
              <button 
                onClick={handleTonClose}
                className="w-full h-12 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl"
              >
                C'est parti !
              </button>
            </div>
          ) : tonStatus === 'failed' ? (
            <div className="animate-in shake duration-300">
              <div className="w-20 h-20 bg-red-500/20 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Paiement Échoué</h3>
              <p className="text-red-400/80 text-sm mb-8">{tonError || "Une erreur est survenue lors de la transaction."}</p>
              <div className="flex gap-3">
                <button 
                  onClick={resetTon}
                  className="flex-1 h-12 bg-white/10 text-white font-bold uppercase rounded-xl border border-white/10"
                >
                  Réessayer
                </button>
                <button 
                  onClick={handleTonClose}
                  className="flex-1 h-12 bg-red-500 text-white font-bold uppercase rounded-xl"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader size={40} className="text-blue-400 animate-spin" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                {tonStatus === 'connecting' ? 'Connexion Wallet...' : 
                 tonStatus === 'waiting_signature' ? 'Signature requise' : 
                 'Confirmation on-chain...'}
              </h3>
              
              <p className="text-text-muted text-sm mb-8">
                {tonStatus === 'connecting' ? 'Veuillez ouvrir votre application TON (Telegram, Tonkeeper...)' : 
                 tonStatus === 'waiting_signature' ? 'Veuillez signer la transaction dans votre application.' : 
                 'Transaction envoyée ! Nous attendons la confirmation sur la blockchain.'}
              </p>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 mb-8">
                <ShieldCheck size={20} className="text-blue-400" />
                <div className="text-left">
                  <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Sécurité</div>
                  <div className="text-[11px] text-white/80">Paiement 100% décentralisé via Smart Contract</div>
                </div>
              </div>

              {tonStatus !== 'confirming' && (
                <button 
                  onClick={handleTonClose}
                  className="text-text-muted text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                >
                  Annuler l'opération
                </button>
              )}
            </div>
          )}
        </div>
      </div>
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

          {modelToUse === 'both' && (
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
              {plans.length > 0 ? (
                <>
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
                {(config?.ton_payment_enabled || tenantProfile?.ton_payment_enabled) &&
                 (config?.ton_wallet || tenantProfile?.ton_wallet || tenantProfile?.wallets?.ton) && (
                  <button
                    onClick={handleTonPayment}
                    className="group relative w-full h-[56px] rounded-2xl bg-gradient-to-br from-[#0098EA] to-[#0072AF] text-white flex items-center justify-center gap-3 shadow-[0_10px_25px_rgba(0,152,234,0.3)] active:scale-95 transition-all overflow-hidden"
                  >
                    {/* Glass shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                    
                    <svg width="24" height="24" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-sm">
                      <path d="M256 512c141.385 0 256-114.615 256-256S397.385 0 256 0 0 114.615 0 256s114.615 256 256 256z" fill="#0098EA"/>
                      <path d="M198.503 161.12c-15.656 0-24.972 17.44-16.143 30.364l70.187 102.768 70.187-102.768c8.829-12.924-.487-30.364-16.143-30.364H198.503z" fill="white"/>
                      <path d="M256 322.064l-83.333-122.04c-5.833-8.544.292-20.354 10.73-20.354h145.206c10.438 0 16.563 11.81 10.73 20.354L256 322.064z" fill="white"/>
                      <path d="M256 322.064V179.67l73.497 107.618c5.15 7.541.4 17.844-8.736 17.844H256z" fill="white" fillOpacity="0.5"/>
                    </svg>

                    <span className="relative z-10 font-mono text-[11px] font-black uppercase tracking-[0.1em] text-white drop-shadow-sm">
                      Payer en USDT (TON)
                    </span>
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
                <button 
                  onClick={handleTelegramPayment}
                  className="w-full h-14 text-sm shadow-[0_10px_25px_rgba(255,193,7,0.2)] rounded-full border border-accent-gold text-accent-gold bg-transparent uppercase font-bold tracking-widest hover:bg-accent-gold/10 transition-colors"
                >
                  {t('vip_modal.cta')} — {plans.find(p => p.id === selectedPlan)?.price}{currency}
                </button>
                {mentorTelegram && (
                  <div className="flex flex-col items-center gap-1 opacity-40">
                    <span className="text-[9px] text-text-primary uppercase font-black tracking-widest italic">{t('plans.activation_note')}</span>
                    <span className="text-[10px] text-text-primary uppercase font-black tracking-widest underline">{t('vip_modal.contact')} @{mentorTelegram.toUpperCase()}</span>
                  </div>
                )}
              </div>
              </>
              ) : (
                <div className="text-center py-6 bg-accent-neon/5 rounded-2xl border border-accent-neon/20">
                  <p className="text-accent-neon font-mono uppercase tracking-widest text-xs font-bold mb-2">Accès gratuit ou sur invitation</p>
                  <p className="text-text-muted text-[10px]">Veuillez contacter le mentor pour y accéder.</p>
                  {mentorTelegram && (
                    <button 
                      onClick={() => window.open(`https://t.me/${mentorTelegram}`, '_blank')}
                      className="mt-4 px-6 py-2 bg-bg-elevated border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-primary"
                    >
                      Contacter @{mentorTelegram.toUpperCase()}
                    </button>
                  )}
                </div>
              )}
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
                    <button 
                      onClick={handleSubmitBroker}
                      disabled={!brokerId.trim()}
                      className="w-full h-14 text-sm shadow-[0_10px_25px_rgba(255,193,7,0.2)] rounded-full border border-accent-gold text-accent-gold bg-transparent uppercase font-bold tracking-widest hover:bg-accent-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('vip_modal.verify_account')}
                    </button>
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
