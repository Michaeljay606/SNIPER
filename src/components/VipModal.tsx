import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, ChevronRight, Copy, ExternalLink, Loader, MessageCircle, ShieldCheck, X, Zap } from 'lucide-react';
import { useTonPayment } from '../hooks/useTonPayment';
import { useConfig } from '../context/ConfigContext';
import { supabase } from '../lib/supabase';
import { triggerNotification } from '../lib/notifications';
import { usePlanFeatures } from '../hooks/usePlanFeatures';

interface VipModalProps {
  config: any;
  tenantProfile?: any;
  onClose: () => void;
  user?: any;
  triggerType?: 'signals' | 'academy';
}

type AccessTab = 'payment' | 'broker';

const cleanTelegramHandle = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^t\.me\//i, '')
    .replace('@', '')
    .split(/[/?#]/)[0]
    .trim();
};

const openTelegramMessage = (handle: string, message: string) => {
  const url = `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
};

const normalizeExternalUrl = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (/^(https?:\/\/|tg:\/\/)/i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
};

const openExternalLink = (url: string) => {
  const normalizedUrl = normalizeExternalUrl(url);
  if (!normalizedUrl) return;

  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openLink && /^https?:\/\//i.test(normalizedUrl)) {
    tg.openLink(normalizedUrl);
    return;
  }

  window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
};

const shortAddress = (value: string) => value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;

const VipModal: React.FC<VipModalProps> = ({ config, tenantProfile = config, onClose, user: userProp, triggerType = 'signals' }) => {
  const { t } = useTranslation();
  const planFeatures = usePlanFeatures();
  const tg = (window as any).Telegram?.WebApp;
  const user = userProp || {
    id: tg?.initDataUnsafe?.user?.id,
    telegramUsername: tg?.initDataUnsafe?.user?.username,
    name: tg?.initDataUnsafe?.user?.first_name
  };

  const isAcademy = triggerType === 'academy';
  const rawModelToUse = isAcademy ? tenantProfile?.academy_model : tenantProfile?.vip_model;
  const brokerAllowed = planFeatures.canUseBrokerModel && planFeatures.maxBrokers > 0;
  const paymentAllowed = planFeatures.canUseManualPayment;
  const modelToUse = useMemo(() => {
    if (rawModelToUse === 'both') {
      if (planFeatures.allowedVipModels.includes('both')) return 'both';
      if (brokerAllowed) return 'broker';
      if (paymentAllowed) return 'payment';
    }

    if (rawModelToUse === 'broker' && brokerAllowed) return 'broker';
    if (rawModelToUse === 'payment' && paymentAllowed) return 'payment';

    if (paymentAllowed) return 'payment';
    if (brokerAllowed) return 'broker';
    return 'payment';
  }, [brokerAllowed, paymentAllowed, planFeatures.allowedVipModels, rawModelToUse]);
  const [activeTab, setActiveTab] = useState<AccessTab>(
    modelToUse === 'both' ? 'payment' : (modelToUse === 'broker' ? 'broker' : 'payment')
  );
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [brokerId, setBrokerId] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTonPayment, setShowTonPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { pay: startTonPayment, status: tonStatus, error: tonError, reset: resetTon } = useTonPayment();
  const { refresh: refreshConfig } = useConfig();

  useEffect(() => {
    if (modelToUse === 'both') return;
    setActiveTab(modelToUse === 'broker' ? 'broker' : 'payment');
  }, [modelToUse]);

  const tenantId = tenantProfile?.tenant_id || tenantProfile?.id || config?.tenant_id || config?.id;
  const currency = tenantProfile?.vip_currency || config?.vip_currency || 'USDT';
  const mentorTelegram = cleanTelegramHandle(
    tenantProfile?.social_telegram || tenantProfile?.telegram_contact_url || config?.social_telegram || config?.telegram_contact_url
  );
  const mentorName = tenantProfile?.mentor_name || tenantProfile?.mentorName || config?.mentorName || 'Mentor';
  const wallets = tenantProfile?.wallets || config?.wallets || {};
  const tonEnabled = !!(tenantProfile?.ton_payment_enabled || config?.ton_payment_enabled);
  const tonWallet = config?.ton_wallet || tenantProfile?.ton_wallet || wallets?.ton;

  const plans = useMemo(() => {
    const rawPlans = isAcademy
      ? [
          { id: '1m', label: t('vip_modal.one_month'), price: tenantProfile?.academy_price_1m, hint: t('vip_modal.manual_activation') },
          { id: 'lifetime', label: t('vip_modal.lifetime'), price: tenantProfile?.academy_price_lifetime, hint: t('vip_modal.best_price') },
        ].filter(p => tenantProfile?.academy_duration_model !== 'monthly' || p.id !== 'lifetime')
      : [
          { id: '1m', label: t('vip_modal.one_month'), price: tenantProfile?.vip_price_1m, hint: t('vip_modal.monthly') },
          { id: '1y', label: t('vip_modal.one_year'), price: tenantProfile?.vip_price_1y, hint: '-40%' },
          { id: 'lifetime', label: t('vip_modal.lifetime'), price: tenantProfile?.vip_price_lifetime, hint: t('vip_modal.best_price') },
        ].filter(p => tenantProfile?.signals_duration_model !== 'lifetime' || p.id === 'lifetime');
    return rawPlans.filter(p => p.price && p.price !== '0' && p.price !== 0);
  }, [isAcademy, tenantProfile, t]);

  const [selectedPlan, setSelectedPlan] = useState<string>(plans[0]?.id || '');
  const plan = plans.find(p => p.id === selectedPlan) || plans[0];

  const manualWallets = useMemo(() => ([
    { key: 'usdtTrc20', label: 'USDT TRC20', value: wallets?.usdtTrc20 || wallets?.usdt_trc20 || wallets?.trc20 },
    { key: 'usdtBep20', label: 'USDT BEP20', value: wallets?.usdtBep20 || wallets?.usdt_bep20 || wallets?.bep20 },
    { key: 'usdtErc20', label: 'USDT ERC20', value: wallets?.usdtErc20 || wallets?.usdt_erc20 || wallets?.erc20 },
    { key: 'other', label: wallets?.otherLabel || t('vip_modal.other_address'), value: wallets?.other || wallets?.payment_address },
  ].filter(w => w.value)), [wallets]);

  const brokers = useMemo(() => {
    if (!brokerAllowed) return [];

    return [
      { name: tenantProfile?.broker_1_name, url: tenantProfile?.broker_1_url },
      { name: tenantProfile?.broker_2_name, url: tenantProfile?.broker_2_url },
      { name: tenantProfile?.broker_3_name, url: tenantProfile?.broker_3_url },
      { name: tenantProfile?.broker_4_name, url: tenantProfile?.broker_4_url },
      { name: tenantProfile?.broker_5_name, url: tenantProfile?.broker_5_url },
    ]
      .map(b => ({ name: b.name, url: normalizeExternalUrl(b.url) }))
      .filter(b => b.name && b.url)
      .slice(0, planFeatures.maxBrokers);
  }, [brokerAllowed, planFeatures.maxBrokers, tenantProfile]);

  const copyWallet = async (key: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1400);
  };

  const createAccessRequest = async (extra: Record<string, any>) => {
    const requestType = isAcademy
      ? (extra.kind === 'broker' ? 'academy_broker' : 'academy_payment')
      : (extra.kind === 'broker' ? 'vip_broker' : 'vip_payment');

    return supabase.from('access_requests').insert([{
      tenant_id: tenantId,
      member_telegram_id: user?.id,
      member_username: user?.telegramUsername,
      request_type: requestType,
      access_target: isAcademy ? 'academy' : 'signals',
      payment_method: extra.kind === 'broker' ? 'broker_affiliation' : 'manual_telegram',
      amount: extra.amount,
      currency,
      broker_name: extra.brokerName,
      broker_account_id: extra.brokerAccountId,
      plan_label: extra.planLabel,
      status: 'pending'
    }]);
  };

  const notifyMentor = (type: 'new_payment_request' | 'new_broker_request', data: Record<string, any>) => {
    triggerNotification({
      type,
      tenant_id: tenantId,
      target_type: 'mentor',
      data
    }).catch(err => console.error('Notification failed:', err));
  };

  const handleManualProof = async () => {
    if (!plan || !mentorTelegram || submitting) return;
    setSubmitting(true);
    try {
      await createAccessRequest({ kind: 'payment', amount: Number(plan.price || 0), planLabel: plan.label });
      notifyMentor('new_payment_request', {
        username: user?.telegramUsername || user?.name || 'inconnu',
        plan: plan.label,
        amount: plan.price,
        currency
      });
      const walletLines = manualWallets.map(w => `- ${w.label}: ${w.value}`).join('\n');
      openTelegramMessage(mentorTelegram, t('vip_modal.payment_msg_manual', {
        mentor: mentorName,
        access: isAcademy ? t('vip_modal.title_academy') : t('vip_modal.title_signals'),
        plan: plan.label,
        price: plan.price,
        currency: currency,
        username: user?.telegramUsername || 'inconnu',
        id: user?.id || 'inconnu',
        walletInfo: walletLines ? `Adresse / Wallet:\n${walletLines}` : ''
      }));
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTonPayment = async () => {
    if (!plan || !tonWallet) return;
    setShowTonPayment(true);
    try {
      await startTonPayment({
        toWallet: tonWallet,
        amountUsdt: Number(plan.price),
        comment: `VIP Access - ${plan.label} - ${user?.telegramUsername || user?.id}`,
        flow: isAcademy ? 'academy_access' : 'vip_access',
        tenantId,
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
      refreshConfig();
    }
    setShowTonPayment(false);
    resetTon();
  };

  const handleSubmitBroker = async () => {
    if (!brokerId.trim() || !selectedBroker || !mentorTelegram || submitting) return;
    setSubmitting(true);
    try {
      await createAccessRequest({
        kind: 'broker',
        brokerName: selectedBroker.name,
        brokerAccountId: brokerId.trim()
      });
      notifyMentor('new_broker_request', {
        username: user?.telegramUsername || user?.name || 'inconnu',
        broker: selectedBroker.name,
        account_id: brokerId.trim()
      });
      openTelegramMessage(mentorTelegram, t('vip_modal.broker_msg_manual', {
        mentor: mentorName,
        access: isAcademy ? t('vip_modal.title_academy') : t('vip_modal.title_signals'),
        broker: selectedBroker.name,
        accountId: brokerId.trim(),
        username: user?.telegramUsername || 'inconnu',
        id: user?.id || 'inconnu'
      }));
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(t('vip_modal.error_sending'));
    } finally {
      setSubmitting(false);
    }
  };

  if (showTonPayment) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="w-full max-w-sm bg-[#080A10] border border-white/10 rounded-[24px] p-8 text-center shadow-[0_0_50px_rgba(0,152,234,0.2)]">
          {tonStatus === 'confirmed' ? (
            <>
              <div className="w-20 h-20 bg-green-500/15 border border-green-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t('vip_modal.payment_confirmed')}</h3>
              <p className="text-white/45 text-sm mb-8">{t('vip_modal.activation_pending')}</p>
              <button onClick={handleTonClose} className="w-full h-12 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl">{t('common.next')}</button>
            </>
          ) : tonStatus === 'failed' ? (
            <>
              <div className="w-20 h-20 bg-red-500/15 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t('vip_modal.payment_failed')}</h3>
              <p className="text-red-300/80 text-sm mb-8">{tonError || t('common.error')}</p>
              <button onClick={handleTonClose} className="w-full h-12 bg-white/10 text-white font-bold uppercase rounded-xl border border-white/10">{t('common.close')}</button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader size={40} className="text-blue-400 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('vip_modal.ton_connect')}</h3>
              <p className="text-white/45 text-sm mb-8">{t('vip_modal.sign_transaction')}</p>
              <button onClick={handleTonClose} className="text-white/40 text-xs font-bold uppercase tracking-widest">{t('common.cancel')}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center px-3 pt-[9dvh] pb-5 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[6px] animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[430px] max-h-[82dvh] bg-[#070910]/97 border border-white/10 rounded-[24px] shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <button onClick={onClose} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 text-white/60 hover:text-white flex items-center justify-center active:scale-95 transition-all">
          <X size={12} />
        </button>

        <div className="px-3.5 pb-5 overflow-y-auto max-h-[calc(82dvh-36px)] overscroll-contain">
          <div className="text-center pt-1 pb-2.5">
            <p className="text-[8px] font-black tracking-[0.16em] text-[#00FF41] uppercase mb-0.5">{mentorName}</p>
            <h2 className="text-base font-black italic tracking-tight text-white uppercase leading-tight flex items-center justify-center gap-1.5">
              <Zap size={14} className="text-[#00FF41] shrink-0" />
              {isAcademy ? t('vip_modal.title_academy') : t('vip_modal.title_signals')}
            </h2>
              {t('vip_modal.choose_method')}
          </div>

          {modelToUse === 'both' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white/[0.04] border border-white/8 mb-2.5">
              {(['payment', 'broker'] as AccessTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-8 rounded-md text-[9px] font-black uppercase tracking-[0.16em] transition-all ${activeTab === tab ? 'bg-[#00FF41] text-black shadow-[0_0_20px_rgba(0,255,65,0.22)]' : 'text-white/35'}`}
                >
                  {tab === 'payment' ? t('settings_admin.payment') : t('settings_admin.broker_model')}
                </button>
              ))}
            </div>
          )}

          {!mentorTelegram && (
            <div className="mb-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-2">
              <div className="flex gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-red-100">{t('vip_modal.missing_mentor_contact')}</p>
                  <p className="text-[9px] leading-relaxed text-red-100/55 mt-0.5">
                    {t('vip_modal.missing_mentor_contact_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSubmitted && (
            <div className="mb-2.5 rounded-xl border border-[#00FF41]/20 bg-[#00FF41]/5 p-2 text-center">
              <Check className="mx-auto text-[#00FF41] mb-1 shrink-0" size={16} />
              <p className="text-[10px] font-black text-white uppercase">{t('vip_modal.sent_title')}</p>
              <p className="text-[9px] text-white/45 mt-0.5">{t('vip_modal.proof_ready')}</p>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-3.5">
              {plans.length > 0 ? (
                <>
                  <div className={`grid gap-1.5 ${plans.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {plans.map(p => {
                      const active = selectedPlan === p.id;
                      if (plans.length === 1) {
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPlan(p.id)}
                            className={`w-full min-w-0 flex items-center justify-between rounded-xl border p-2.5 transition-all ${active ? 'bg-[#00FF41]/10 border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.1)]' : 'bg-white/[0.035] border-white/10'}`}
                          >
                            <div className="flex flex-col text-left min-w-0">
                              <span className="text-[8px] font-black text-white/45 uppercase tracking-[0.1em] truncate">{p.label}</span>
                              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                                <span className={`text-lg font-black font-mono leading-none ${active ? 'text-[#00FF41]' : 'text-white'}`}>{p.price}{currency}</span>
                                <span className="text-[9px] uppercase tracking-[0.08em] text-white/35">/ {p.hint}</span>
                              </div>
                            </div>
                            <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#00FF41] text-black' : 'border border-white/15 text-transparent'}`}>
                              <Check size={10} />
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlan(p.id)}
                          className={`text-left rounded-xl border p-2.5 min-h-[72px] min-w-0 transition-all ${active ? 'bg-[#00FF41]/10 border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.1)]' : 'bg-white/[0.035] border-white/10'}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="min-w-0 text-[8px] font-black text-white/45 uppercase tracking-[0.1em] truncate">{p.label}</span>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#00FF41] text-black' : 'border border-white/15 text-transparent'}`}>
                              <Check size={9} />
                            </span>
                          </div>
                          <div className={`mt-1.5 text-lg font-black font-mono leading-none ${active ? 'text-[#00FF41]' : 'text-white'}`}>{p.price}{currency}</div>
                          <div className="text-[8px] uppercase tracking-[0.12em] text-white/35 mt-0.5">{p.hint}</div>
                        </button>
                      );
                    })}
                  </div>

                  {tonEnabled && tonWallet && (
                    <button onClick={handleTonPayment} className="w-full h-10 rounded-lg bg-[#0098EA] text-white flex items-center justify-center gap-2 font-black uppercase tracking-[0.12em] text-[9px] shadow-[0_12px_28px_rgba(0,152,234,0.2)] active:scale-[0.98]">
                    <ShieldCheck size={13} /> {t('vip_modal.pay_auto_ton')}
                    </button>
                  )}

                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#00FF41]">{t('vip_modal.manual')}</p>
                        <p className="text-[9px] text-white/40 mt-0.5">{t('vip_modal.copy_wallet_desc', "Copiez l'adresse puis envoyez la capture au mentor.")}</p>
                      </div>
                      <MessageCircle size={14} className="text-white/25 shrink-0" />
                    </div>

                    {manualWallets.length > 0 ? (
                      <div className="space-y-1.5">
                        {manualWallets.map(w => (
                          <div key={w.key} className="flex items-center justify-between gap-2 bg-black/30 border border-white/[0.06] rounded-lg px-2.5 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">{w.label}</p>
                              <p className="text-[10px] font-mono text-white/80 mt-0.5 truncate">{shortAddress(w.value)}</p>
                            </div>
                            <button
                              onClick={() => copyWallet(w.key, w.value)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                copiedKey === w.key
                                  ? 'bg-[#00FF41]/20 text-[#00FF41]'
                                  : 'bg-white/[0.06] text-white/40 hover:bg-white/10'
                              }`}
                            >
                              {copiedKey === w.key ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-yellow-300/50 bg-yellow-400/[0.04] border border-yellow-400/10 rounded-lg p-2.5">
                        {t('vip_modal.no_wallet', '⚠️ Aucune adresse configurée par le mentor.')}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleManualProof}
                    disabled={!mentorTelegram || !plan || submitting}
                    className="w-full h-12 rounded-xl border border-[#FFD60A]/50 text-[#FFD60A] bg-[#FFD60A]/[0.06] uppercase font-black tracking-[0.14em] text-[10px] shadow-[0_8px_24px_rgba(255,214,10,0.08)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all hover:bg-[#FFD60A]/10"
                  >
                    {t('vip_modal.send_proof', "✅ J'ai payé — Envoyer la preuve")}
                  </button>
                </>
              ) : (
                <div className="bg-[#00FF41]/[0.04] border border-[#00FF41]/15 rounded-xl p-5 text-center">
                  <p className="text-[#00FF41] text-[11px] font-black uppercase tracking-[0.14em]">{t('vip_modal.invitation_access')}</p>
                  <p className="text-white/35 text-[10px] mt-1.5">{t('vip_modal.contact_mentor_finalize')}</p>
                </div>
              )}
            </div>
          )}

          {/* ── BROKER TAB ── */}
          {activeTab === 'broker' && (
            <div className="space-y-3">
              {!selectedBroker ? (
                <>
                  <div className="bg-[#00FF41]/[0.04] border border-[#00FF41]/15 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-[#00FF41] uppercase tracking-[0.14em] font-black">{t('vip_modal.offered_access')}</p>
                    <p className="text-[9px] text-white/40 leading-relaxed mt-1">
                      {tenantProfile?.broker_msg_vip || tenantProfile?.broker_msg_academy || t('admin.broker_msg_default')}
                    </p>
                  </div>
                  {brokers.length > 0 ? (
                    <div className="space-y-2">
                      {brokers.map((broker, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            openExternalLink(broker.url);
                            setSelectedBroker(broker);
                          }}
                          className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-left active:scale-[0.98] transition-all hover:border-white/20"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center font-black text-[11px] text-white/40 shrink-0">
                              {broker.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[12px] font-black text-white block uppercase truncate">{broker.name}</span>
                              <span className="text-[9px] text-white/30 flex items-center gap-1 mt-0.5">
                                {t('vip_modal.partner_link')} <ExternalLink size={8} />
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-white/25 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-yellow-300/50 bg-yellow-400/[0.04] border border-yellow-400/10 rounded-lg p-2.5">
                      {t('vip_modal.no_broker')}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.14em]">{t('vip_modal.selected_broker')}</p>
                      <p className="text-[13px] font-black text-white uppercase mt-0.5">{selectedBroker.name}</p>
                    </div>
                    <button onClick={() => setSelectedBroker(null)} className="text-[#00FF41] text-[9px] font-black uppercase hover:underline">
                      {t('common.change', 'Change')}
                    </button>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-white/35 uppercase tracking-[0.14em] mb-1.5 text-center">
                      {t('vip_modal.broker_account_id')}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 123456789"
                      value={brokerId}
                      onChange={(e) => setBrokerId(e.target.value)}
                      className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-4 font-mono text-[12px] text-[#00FF41] text-center focus:border-[#00FF41]/50 outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSubmitBroker}
                    disabled={!brokerId.trim() || !mentorTelegram || submitting}
                    className="w-full h-12 rounded-xl border border-[#FFD60A]/50 text-[#FFD60A] bg-[#FFD60A]/[0.06] uppercase font-black tracking-[0.14em] text-[10px] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all hover:bg-[#FFD60A]/10"
                  >
                    {t('vip_modal.send_id_to_mentor')}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VipModal;
