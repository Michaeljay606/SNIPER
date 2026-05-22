import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';
import { ClientConfig } from '../../context/ConfigContext';
import SniperLogo from '../../assets/SniperLogo';
import { compressAndUpload } from '../../lib/upload';

interface MentorOnboardingProps {
  config: ClientConfig;
  onComplete: () => void;
}

export default function MentorOnboarding({ config, onComplete }: MentorOnboardingProps) {
  const [step, setStep] = useState(1);
  const [speciality, setSpeciality] = useState(config.speciality || '');
  const [yearsExp, setYearsExp] = useState(config.years_exp || '');
  const [tradersCount, setTradersCount] = useState(config.traders_count || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState(config.logo_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [mentorName, setMentorName] = useState(config.mentorName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 access config state
  const [vipModel, setVipModel] = useState<'payment' | 'broker' | 'both'>(
    config.vipModel || (config as any).vip_model || 'payment'
  );
  const [vipPrice1m, setVipPrice1m] = useState(config.vip_price_1m || '99');
  const [vipPrice1y, setVipPrice1y] = useState(config.vip_price_1y || '599');
  const [vipCurrency, setVipCurrency] = useState(config.vip_currency || 'USDT');
  const [tonPaymentEnabled, setTonPaymentEnabled] = useState(!!config.ton_payment_enabled);
  const [tonWallet, setTonWallet] = useState(config.ton_wallet || config.wallets?.ton || '');
  const [usdtTrc20Wallet, setUsdtTrc20Wallet] = useState(config.wallets?.usdtTrc20 || '');

  const [brokerName, setBrokerName] = useState(config.broker_1_name || '');
  const [brokerUrl, setBrokerUrl] = useState(config.broker_1_url || '');

  const [academyModel, setAcademyModel] = useState<'payment' | 'broker' | 'both'>(
    (config.academy_model as string) === 'free' ? 'payment' : (config.academy_model || 'payment')
  );
  const [academyDurationModel, setAcademyDurationModel] = useState<'monthly' | 'lifetime'>(
    config.academy_duration_model || 'monthly'
  );
  const [academyPrice1m, setAcademyPrice1m] = useState(config.academy_price_1m || '29');
  const [academyPriceLifetime, setAcademyPriceLifetime] = useState(config.academy_price_lifetime || '199');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const url = await compressAndUpload(file, 'profile');
      setLogoUrl(url);
      
      // Update config object locally
      config.logo_url = url;

      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: url })
        .eq('tenant_id', TENANT_ID);
        
      if (error) {
        console.error('Database update failed:', error);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine if it is a trial plan
  const isTrial = !!config.trialEndsAt && new Date(config.trialEndsAt) > new Date();
  const trialDays = isTrial 
    ? Math.max(0, Math.ceil((new Date(config.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      config.mentorName = mentorName;
      const { error } = await supabase
        .from('tenants')
        .update({ 
          onboarding_completed: true,
          mentor_name: mentorName
        })
        .eq('tenant_id', TENANT_ID);
      
      if (!error) {
        onComplete();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep1Submit = async () => {
    if (!mentorName.trim()) return;
    setIsSaving(true);
    try {
      config.mentorName = mentorName;
      const { error } = await supabase
        .from('tenants')
        .update({ mentor_name: mentorName })
        .eq('tenant_id', TENANT_ID);
        
      if (!error) {
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep2Submit = async () => {
    setIsSaving(true);
    try {
      config.speciality = speciality;
      config.years_exp = yearsExp;
      config.traders_count = tradersCount;

      const { error } = await supabase
        .from('tenants')
        .update({
          speciality: speciality || null,
          years_exp: yearsExp || null,
          traders_count: tradersCount || null
        })
        .eq('tenant_id', TENANT_ID);

      if (!error) {
        setStep(3);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep3Submit = async () => {
    setIsSaving(true);
    try {
      const updatedWallets = {
        ...(config.wallets || {}),
        ton: tonWallet || null,
        usdtTrc20: usdtTrc20Wallet || null
      };

      // Sync local context state
      config.vipModel = vipModel;
      config.vip_price_1m = vipPrice1m;
      config.vip_price_1y = vipPrice1y;
      config.vip_price_lifetime = '';
      config.vip_currency = vipCurrency;
      config.ton_payment_enabled = tonPaymentEnabled;
      config.ton_wallet = tonWallet;
      config.wallets = updatedWallets;
      config.broker_1_name = brokerName;
      config.broker_1_url = brokerUrl;
      config.academy_model = academyModel;
      config.academy_duration_model = academyDurationModel;
      config.academy_price_1m = academyPrice1m;
      config.academy_price_lifetime = academyPriceLifetime;

      const { error } = await supabase
        .from('tenants')
        .update({
          vip_model: vipModel,
          vip_price_1m: vipPrice1m || null,
          vip_price_1y: vipPrice1y || null,
          vip_price_lifetime: null,
          vip_currency: vipCurrency || 'USDT',
          ton_payment_enabled: tonPaymentEnabled,
          ton_wallet: tonWallet || null,
          wallets: updatedWallets,
          broker_1_name: brokerName || null,
          broker_1_url: brokerUrl || null,
          academy_model: academyModel,
          academy_duration_model: academyDurationModel,
          academy_price_1m: academyPrice1m || null,
          academy_price_lifetime: academyPriceLifetime || null
        })
        .eq('tenant_id', TENANT_ID);

      if (!error) {
        setStep(4);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ onboarding_completed: true })
        .eq('tenant_id', TENANT_ID);
      
      if (!error) {
        onComplete();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    const fullLink = `https://t.me/SniperTradingBot/app?startapp=${TENANT_ID}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isStep2Enabled = speciality.trim().length > 0 || yearsExp.trim().length > 0 || tradersCount.trim().length > 0;
  const isStep3Enabled = !tonPaymentEnabled || tonWallet.trim().length > 0;

  const planIcons: Record<string, string> = {
    empire: '⚡',
    premium: '🛡',
    basic: '✦',
    free: '○',
  };
  const planIcon = planIcons[config.plan] || '○';

  const isBinary = config.tradingMode === 'binary';
  const isForex = config.tradingMode === 'forex';

  const brokerNamePlaceholder = isBinary 
    ? "Pocket Option" 
    : (isForex ? "XM" : "XM / Pocket Option");
     
  const brokerUrlPlaceholder = isBinary 
    ? "https://pocketoption.com/..." 
    : (isForex ? "https://xm.com/..." : "https://...");

  const screenVariants = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  };

  const transitionSpec = { duration: 0.35, ease: [0.16, 1, 0.3, 1] };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05070C] text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* ─── Premium background graphics ─── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,22,42,1)_0%,#05070c_80%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-[#00FF41]/[0.025] blur-[100px] pointer-events-none animate-pulse [animation-duration:10s]" />
      <div className="absolute bottom-[10%] left-[10%] w-[250px] h-[250px] rounded-full bg-violet-500/[0.015] blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[390px] flex flex-col relative z-10 space-y-6">
        
        {/* Progress header */}
        <div className="flex justify-between items-center px-2 shrink-0">
          <span className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] tracking-widest uppercase">
            {step === 1 ? 'Activation' : step === 2 ? 'Configuration' : step === 3 ? 'Accès & Tarifs' : 'Déploiement'}
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <motion.div
                key={s}
                animate={{
                  width: step === s ? 16 : 5,
                  height: 5,
                  backgroundColor: step === s ? '#00FF41' : 'rgba(255,255,255,0.12)',
                  boxShadow: step === s ? '0 0 8px rgba(0,255,65,0.5)' : 'none'
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="rounded-[3px]"
              />
            ))}
          </div>
        </div>

        {/* Glassmorphic Wizard Card */}
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-white/[0.06] rounded-[24px] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden min-h-[360px] flex flex-col">
          
          {/* Card subtle gloss flare */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            {/* SCREEN A1 — IDENTITÉ DU TERMINAL */}
            {step === 1 && (
              <motion.div
                key="screen-a1"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionSpec}
                className="flex-1 flex flex-col space-y-6 py-2"
              >
                {/* Header */}
                <div className="text-center space-y-1">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Identité du Terminal
                  </h1>
                  <p className="text-xs text-[rgba(255,255,255,0.45)]">
                    Configurez l'image de profil et le nom de votre terminal.
                  </p>
                </div>

                {/* Circular Avatar Uploader */}
                <div className="flex justify-center py-2">
                  <div className="relative w-28 h-28 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                    {/* Inner image/placeholder */}
                    <div className="w-full h-full rounded-full border border-white/[0.08] overflow-hidden bg-black/40 flex items-center justify-center relative shadow-[0_0_20px_rgba(0,255,65,0.05)]">
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center space-y-1 text-center">
                          <span className="w-5 h-5 rounded-full border-2 border-[#00FF41] border-t-transparent animate-spin" />
                          <span className="font-mono text-[7px] text-[#00FF41] tracking-wider uppercase">ENVOI...</span>
                        </div>
                      ) : logoUrl ? (
                        <img src={logoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[rgba(255,255,255,0.2)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                      )}
                    </div>

                    {/* Floating camera action badge */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#05070C] border border-[#00FF41]/40 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    </div>
                  </div>

                  {/* Hidden Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                {/* Display Name Input */}
                <div className="space-y-2">
                  <label className="block font-mono text-[9px] tracking-widest text-[#00FF41] uppercase">
                    NOM D'AFFICHAGE
                  </label>
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="Ephata Master"
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-white/[0.06] rounded-[16px] px-5 py-3.5 text-base font-bold text-white focus:outline-none focus:border-[#00FF41]/35 focus:bg-white/[0.01] transition-all"
                  />
                </div>

                {/* Live Preview Box */}
                <div className="space-y-2 pt-2">
                  <label className="block font-mono text-[8px] tracking-widest text-[rgba(255,255,255,0.35)] uppercase">
                    APERÇU EN DIRECT
                  </label>
                  <div className="bg-[rgba(255,255,255,0.01)] border border-white/[0.04] rounded-[16px] p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#00FF41]/30 shadow-[0_0_10px_rgba(0,255,65,0.15)] overflow-hidden bg-black/40 shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[rgba(255,255,255,0.15)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-black text-xs uppercase tracking-wider truncate flex items-center gap-1">
                        <span>{mentorName || 'Nom du Terminal'}</span>
                        <span className="text-[#00FF41]">TERMINAL</span>
                      </div>
                      <div className="font-mono text-[7px] text-[rgba(255,255,255,0.35)] tracking-widest uppercase">
                        POWERED BY SNIPER
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN A2 — CONFIGURATION ESSENTIELLE */}
            {step === 2 && (
              <motion.div
                key="screen-a2"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionSpec}
                className="flex-1 flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center pb-4 shrink-0">
                    <button 
                      onClick={() => setStep(1)}
                      className="p-1 -ml-1 text-[rgba(255,255,255,0.35)] hover:text-white transition-colors text-xs font-mono flex items-center gap-1 bg-transparent border-none cursor-pointer"
                    >
                      ← RETOUR
                    </button>
                    <span className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-widest">STEP 02</span>
                  </div>

                  {/* Intro */}
                  <div className="space-y-1 pb-4">
                    <h2 className="text-lg font-bold text-white tracking-tight">Configuration Initiale</h2>
                    <p className="text-[11px] text-[rgba(255,255,255,0.4)] leading-relaxed">
                      Configurez votre profil de mentor pour inspirer confiance à vos membres.
                    </p>
                  </div>

                  {/* Form fields wrapper */}
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    
                    {/* Spécialité */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[9px] tracking-widest text-[#00FF41] uppercase">
                        VOTRE SPÉCIALITÉ / STYLE
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Expert Price Action & Forex"
                        value={speciality}
                        onChange={(e) => setSpeciality(e.target.value)}
                        className="w-full bg-[rgba(255,255,255,0.02)] border border-white/[0.06] focus:border-[#00FF41]/35 rounded-[16px] px-5 py-3.5 text-xs text-white focus:outline-none focus:bg-white/[0.01] transition-all"
                      />
                    </div>

                    {/* Years of trading experience */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[9px] tracking-widest text-[#00FF41] uppercase">
                        ANNÉES D'EXPÉRIENCE EN TRADING
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 7+"
                        value={yearsExp}
                        onChange={(e) => setYearsExp(e.target.value)}
                        className="w-full bg-[rgba(255,255,255,0.02)] border border-white/[0.06] focus:border-[#00FF41]/35 rounded-[16px] px-5 py-3.5 text-xs text-white focus:outline-none focus:bg-white/[0.01] transition-all"
                      />
                    </div>

                    {/* Traders count */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[9px] tracking-widest text-[#00FF41] uppercase">
                        NOMBRE DE TRADERS
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 1200+"
                        value={tradersCount}
                        onChange={(e) => setTradersCount(e.target.value)}
                        className="w-full bg-[rgba(255,255,255,0.02)] border border-white/[0.06] focus:border-[#00FF41]/35 rounded-[16px] px-5 py-3.5 text-xs text-white focus:outline-none focus:bg-white/[0.01] transition-all"
                      />
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN A3 — ACCÈS & TARIFS */}
            {step === 3 && (
              <motion.div
                key="screen-a3"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionSpec}
                className="flex-1 flex flex-col justify-between text-left"
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center pb-3 shrink-0">
                    <button 
                      onClick={() => setStep(2)}
                      className="p-1 -ml-1 text-[rgba(255,255,255,0.35)] hover:text-white transition-colors text-xs font-mono flex items-center gap-1 bg-transparent border-none cursor-pointer outline-none"
                    >
                      ← RETOUR
                    </button>
                    <span className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-widest font-bold">STEP 03</span>
                  </div>

                  {/* Intro */}
                  <div className="space-y-1 pb-3">
                    <h2 className="text-lg font-bold text-white tracking-tight">Accès & Tarifs</h2>
                    <p className="text-[11px] text-[rgba(255,255,255,0.4)] leading-relaxed">
                      Définissez comment vos membres accèdent à vos signaux VIP et à l'Academy.
                    </p>
                  </div>

                  {/* Form fields wrapper */}
                  <div className="space-y-5 max-h-[290px] overflow-y-auto pr-1">
                    
                    {/* Section 1: Signaux VIP */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-1.5">
                        <span className="text-sm">📡</span>
                        <h4 className="font-mono text-[9px] tracking-widest text-[#00FF41] uppercase font-bold">
                          ACCÈS SIGNAUX VIP
                        </h4>
                      </div>

                      {/* Model Selector buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'payment', label: 'Paiement', desc: 'Abonnement' },
                          { id: 'broker', label: 'Broker', desc: 'Affiliation' },
                          { id: 'both', label: 'Les Deux', desc: 'Au Choix' },
                        ].map((opt) => {
                          const active = vipModel === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setVipModel(opt.id as any)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#00FF41]/[0.08] border-[#00FF41]/40 text-[#00FF41]'
                                  : 'bg-white/[0.02] border-white/[0.06] text-[rgba(255,255,255,0.5)] hover:bg-white/[0.04]'
                              }`}
                            >
                              <span className="text-xs font-bold font-sans tracking-wide">{opt.label}</span>
                              <span className="text-[8px] opacity-60 font-mono mt-0.5">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Payment Settings */}
                      {(vipModel === 'payment' || vipModel === 'both') && (
                        <div className="space-y-3 bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl animate-in fade-in duration-200">
                          {/* Prices input */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Prix Mensuel
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  placeholder="99"
                                  value={vipPrice1m}
                                  onChange={(e) => setVipPrice1m(e.target.value)}
                                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-[#00FF41]/30 font-mono"
                                />
                                <span className="absolute right-2 top-2 text-[8px] font-mono text-white/40">{vipCurrency}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Prix Annuel
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  placeholder="599"
                                  value={vipPrice1y}
                                  onChange={(e) => setVipPrice1y(e.target.value)}
                                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-[#00FF41]/30 font-mono"
                                />
                                <span className="absolute right-2 top-2 text-[8px] font-mono text-white/40">{vipCurrency}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Broker Settings */}
                      {(vipModel === 'broker' || vipModel === 'both') && (
                        <div className="space-y-3 bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl animate-in fade-in duration-200">
                          <div className="text-[10px] text-white/50 leading-relaxed font-sans mb-1">
                            Configurez le broker partenaire que vos membres devront utiliser.
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Nom du Broker
                              </label>
                              <input
                                type="text"
                                value={brokerName}
                                onChange={(e) => setBrokerName(e.target.value)}
                                placeholder={`Ex: ${brokerNamePlaceholder}`}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Lien d'affiliation
                              </label>
                              <input
                                type="text"
                                value={brokerUrl}
                                onChange={(e) => setBrokerUrl(e.target.value)}
                                placeholder={brokerUrlPlaceholder}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-white/70 focus:outline-none focus:border-[#00FF41]/30"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Academy */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-1.5">
                        <span className="text-sm">🎓</span>
                        <h4 className="font-mono text-[9px] tracking-widest text-[#FFD60A] uppercase font-bold">
                          ACCÈS ACADEMY
                        </h4>
                      </div>

                      {/* Academy Selector buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'payment', label: 'Paiement', desc: 'Abonnement' },
                          { id: 'broker', label: 'Broker', desc: 'Affiliation' },
                          { id: 'both', label: 'Les Deux', desc: 'Au Choix' },
                        ].map((opt) => {
                          const active = academyModel === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAcademyModel(opt.id as any)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#FFD60A]/[0.08] border-[#FFD60A]/40 text-[#FFD60A]'
                                  : 'bg-white/[0.02] border-white/[0.06] text-[rgba(255,255,255,0.5)] hover:bg-white/[0.04]'
                              }`}
                            >
                              <span className="text-xs font-bold font-sans tracking-wide">{opt.label}</span>
                              <span className="text-[8px] opacity-60 font-mono mt-0.5">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Academy Payment Config */}
                      {(academyModel === 'payment' || academyModel === 'both') && (
                        <div className="space-y-3 bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl animate-in fade-in duration-200">
                          {/* Duration Model */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAcademyDurationModel('monthly')}
                              className={`flex-1 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                                academyDurationModel === 'monthly'
                                  ? 'bg-white/10 border-white/20 text-white'
                                  : 'bg-transparent border-white/[0.06] text-white/40'
                              }`}
                            >
                              Mensuel
                            </button>
                            <button
                              type="button"
                              onClick={() => setAcademyDurationModel('lifetime')}
                              className={`flex-1 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                                academyDurationModel === 'lifetime'
                                  ? 'bg-white/10 border-white/20 text-white'
                                  : 'bg-transparent border-white/[0.06] text-white/40'
                              }`}
                            >
                              À Vie
                            </button>
                          </div>

                          {/* Price input */}
                          <div className="space-y-1">
                            <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                              Prix de l'Academy ({academyDurationModel === 'monthly' ? 'Mensuel' : 'Accès à vie'})
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={academyDurationModel === 'monthly' ? '29' : '199'}
                                value={academyDurationModel === 'monthly' ? academyPrice1m : academyPriceLifetime}
                                onChange={(e) => {
                                  if (academyDurationModel === 'monthly') {
                                    setAcademyPrice1m(e.target.value);
                                  } else {
                                    setAcademyPriceLifetime(e.target.value);
                                  }
                                }}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-[#FFD60A]/30 font-mono"
                              />
                              <span className="absolute right-2 top-2 text-[8px] font-mono text-white/40">{vipCurrency}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Academy Broker Form */}
                      {(academyModel === 'broker' || academyModel === 'both') && (
                        <div className="space-y-3 bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl animate-in fade-in duration-200">
                          <div className="text-[10px] text-[#60A5FA]/80 leading-relaxed font-sans mb-1">
                            💡 Les membres devront s'inscrire via votre lien affilié pour débloquer l'Academy.
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Nom du Broker
                              </label>
                              <input
                                type="text"
                                value={brokerName}
                                onChange={(e) => setBrokerName(e.target.value)}
                                placeholder={`Ex: ${brokerNamePlaceholder}`}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#60A5FA]/40"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Lien d'affiliation
                              </label>
                              <input
                                type="text"
                                value={brokerUrl}
                                onChange={(e) => setBrokerUrl(e.target.value)}
                                placeholder={brokerUrlPlaceholder}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[10px] font-mono text-[#60A5FA]/80 focus:outline-none focus:border-[#60A5FA]/40"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Crypto Payment Configuration */}
                    {((vipModel === 'payment' || vipModel === 'both') || (academyModel === 'payment' || academyModel === 'both')) && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-1.5">
                          <span className="text-sm">🪙</span>
                          <h4 className="font-mono text-[9px] tracking-widest text-[#0098EA] uppercase font-bold">
                            MOYENS DE PAIEMENT CRYPTO
                          </h4>
                        </div>
                        <div className="space-y-3 bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl">
                          {/* Currency setting */}
                          <div className="space-y-1">
                            <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                              Devise de Facturation
                            </label>
                            <input
                              type="text"
                              value={vipCurrency}
                              onChange={(e) => setVipCurrency(e.target.value.toUpperCase())}
                              placeholder="USDT"
                              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00FF41]/30 font-mono uppercase"
                            />
                          </div>

                          {/* TON Connect config */}
                          <div className="border-t border-white/[0.04] pt-2.5 mt-1">
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <div className="text-[10px] font-bold text-[#0098EA]">TON Connect (Automatique)</div>
                                <div className="text-[8px] text-white/40">Acceptez les paiements crypto en direct</div>
                              </div>
                              <div 
                                onClick={() => setTonPaymentEnabled(!tonPaymentEnabled)}
                                className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 flex items-center ${
                                  tonPaymentEnabled ? 'bg-[#0098EA]' : 'bg-white/10'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                                  tonPaymentEnabled ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                              </div>
                            </div>

                            {tonPaymentEnabled && (
                              <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                  <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                    Adresse Wallet TON
                                  </label>
                                  <input
                                    type="text"
                                    value={tonWallet}
                                    onChange={(e) => setTonWallet(e.target.value)}
                                    placeholder="UQ..."
                                    className="w-full bg-black/40 border border-[#0098EA]/30 rounded-lg px-3 py-2 text-[10px] font-mono text-[#0098EA] focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}

                            {/* USDT TRC20 Wallet */}
                            <div className="mt-2">
                              <label className="block text-[8px] font-mono text-[rgba(255,255,255,0.4)] uppercase">
                                Adresse USDT (TRC20)
                              </label>
                              <input
                                type="text"
                                value={usdtTrc20Wallet}
                                onChange={(e) => setUsdtTrc20Wallet(e.target.value)}
                                placeholder="T..."
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[10px] font-mono text-white/70 focus:outline-none focus:border-[#00FF41]/30"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN A4 — TERMINAL PRÊT */}
            {step === 4 && (
              <motion.div
                key="screen-a4"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionSpec}
                className="flex-1 flex flex-col items-center justify-center py-4 space-y-6"
              >
                {/* Success radar */}
                <div className="relative flex items-center justify-center w-24 h-24">
                  <div className="absolute inset-0 border border-[#00FF41]/30 rounded-full animate-ping [animation-duration:2s]" />
                  <div className="absolute -inset-2 border border-[#00FF41]/10 rounded-full" />
                  <div className="w-16 h-16 rounded-full bg-[#00FF41]/5 border border-[#00FF41]/30 flex items-center justify-center text-xl text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.15)] font-bold">
                    ✓
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Terminal Prêt !</h2>
                  <p className="text-[11px] text-[rgba(255,255,255,0.45)] leading-relaxed max-w-[260px] mx-auto">
                    Votre espace de trading est configuré. Partagez le lien d'invitation ci-dessous avec vos membres.
                  </p>
                </div>

                {/* Secure Invite Code Link */}
                <div className="w-full bg-black/50 border border-white/[0.06] rounded-xl p-4 relative overflow-hidden text-left">
                  <span className="absolute right-3 top-2.5 font-mono text-[7px] text-[rgba(255,255,255,0.25)] tracking-widest uppercase">SSL SECURE</span>
                  <label className="block font-mono text-[7px] tracking-[0.2em] text-[#00FF41]/50 uppercase mb-2">
                    LIEN UNIQUE D'INVITATION
                  </label>
                  <div className="font-mono text-[10px] text-[rgba(255,255,255,0.85)] break-all leading-relaxed select-all">
                    t.me/SniperTradingBot/app?startapp={TENANT_ID}
                  </div>
                </div>

                {/* Copy link trigger button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopy}
                  className={`w-full h-11 rounded-xl font-mono text-[10px] font-bold uppercase tracking-[0.1em] border transition-all duration-200 cursor-pointer ${
                    copied 
                      ? 'bg-[#00FF41]/[0.08] border-[#00FF41]/40 text-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                      : 'bg-white/[0.02] border-white/[0.08] text-[rgba(255,255,255,0.6)] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {copied ? '✓ COPIÉ DANS LE PRESSE-PAPIER' : 'COPIER LE LIEN TELEGRAM'}
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Global Bottom Actions */}
        <div className="space-y-3 shrink-0">
          {step === 1 && (
            <div className="flex flex-col space-y-4">
              <div className="flex justify-end w-full">
                <motion.button
                  whileTap={mentorName.trim() ? { scale: 0.97 } : undefined}
                  onClick={handleStep1Submit}
                  disabled={!mentorName.trim() || isSaving}
                  className={`px-7 py-3 rounded-full font-sans text-xs font-black tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5 shadow-md ${
                    mentorName.trim() && !isSaving
                      ? 'bg-white text-black hover:bg-gray-100 cursor-pointer'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? 'CHARGEMENT...' : 'SUIVANT'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                </motion.button>
              </div>

              <div className="flex justify-center w-full">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="font-mono text-[9px] text-[rgba(255,255,255,0.25)] hover:text-white uppercase tracking-wider underline transition-colors bg-transparent border-none cursor-pointer"
                >
                  Déployer avec les valeurs par défaut
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex justify-end w-full">
              <motion.button
                whileTap={isStep2Enabled ? { scale: 0.97 } : undefined}
                onClick={handleStep2Submit}
                disabled={!isStep2Enabled || isSaving}
                className={`px-7 py-3 rounded-full font-sans text-xs font-black tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5 shadow-md ${
                  isStep2Enabled && !isSaving
                    ? 'bg-white text-black hover:bg-gray-100 cursor-pointer'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {isSaving ? 'CHARGEMENT...' : 'SUIVANT'}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
              </motion.button>
            </div>
          )}

          {step === 3 && (
            <div className="flex justify-end w-full">
              <motion.button
                whileTap={isStep3Enabled ? { scale: 0.97 } : undefined}
                onClick={handleStep3Submit}
                disabled={!isStep3Enabled || isSaving}
                className={`px-7 py-3 rounded-full font-sans text-xs font-black tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5 shadow-md ${
                  isStep3Enabled && !isSaving
                    ? 'bg-white text-black hover:bg-gray-100 cursor-pointer'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                {isSaving ? 'CHARGEMENT...' : 'SUIVANT'}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
              </motion.button>
            </div>
          )}

          {step === 4 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleFinish}
              disabled={isSaving}
              className="w-full h-13 bg-gradient-to-r from-[#00FF41] to-[#00E53B] text-[#080B14] rounded-xl font-mono text-[11px] font-black tracking-[0.15em] shadow-[0_0_24px_rgba(0,255,65,0.25)] hover:shadow-[0_0_32px_rgba(0,255,65,0.4)] transition-all uppercase border border-[#00FF41]/20 cursor-pointer"
            >
              {isSaving ? 'CHARGEMENT...' : 'ACCÉDER À MON TERMINAL →'}
            </motion.button>
          )}
        </div>

      </div>
    </div>
  );
}
