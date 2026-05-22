import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';
import { ClientConfig } from '../../context/ConfigContext';
import { triggerNotification } from '../../lib/notifications';

interface MemberOnboardingProps {
  config: ClientConfig;
  onComplete: () => void;
}

export default function MemberOnboarding({ config, onComplete }: MemberOnboardingProps) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [isEditableUsername, setIsEditableUsername] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats states
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [signalCount, setSignalCount] = useState<number | null>(null);
  const [winrate, setWinrate] = useState<number | null>(null);

  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

  // Pre-fill Telegram data or URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUsername = params.get('tg_username') || params.get('username');
    const urlFirstName = params.get('first_name') || params.get('name');

    if (tgUser) {
      if (tgUser.first_name) {
        setFirstName(tgUser.first_name);
      }
      if (tgUser.username) {
        setUsername('@' + tgUser.username);
        setIsEditableUsername(false);
      } else {
        setUsername('');
        setIsEditableUsername(true);
      }
    } else {
      // Fallback to URL parameters if not in Telegram Mini App
      if (urlFirstName) setFirstName(urlFirstName);
      if (urlUsername) {
        setUsername(urlUsername.startsWith('@') ? urlUsername : '@' + urlUsername);
        setIsEditableUsername(true); // Still editable just in case
      }
    }
  }, [tgUser]);

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count active members
        const { count: members } = await supabase
          .from('affiliates')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', TENANT_ID)
          .eq('status', 'active');
        setMemberCount(members);

        // Count signals
        const { count: signals } = await supabase
          .from('signals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', TENANT_ID);
        setSignalCount(signals);

        // Get winrate from public_mentor_stats or compute it
        const { data: statsData } = await supabase
          .from('public_mentor_stats')
          .select('winrate')
          .eq('tenant_id', TENANT_ID)
          .maybeSingle();

        if (statsData?.winrate !== undefined && statsData?.winrate !== null) {
          setWinrate(statsData.winrate);
        } else {
          // fallback
          const { data: closedSignals } = await supabase
            .from('signals')
            .select('result')
            .eq('tenant_id', TENANT_ID)
            .eq('status', 'closed');
          if (closedSignals && closedSignals.length > 5) {
            const wins = closedSignals.filter(s => s.result === 'win' || s.result === 'WIN').length;
            setWinrate(Math.round((wins / closedSignals.length) * 100));
          }
        }
      } catch (err) {
        console.error('Error fetching member onboarding stats:', err);
      }
    };
    fetchStats();
  }, []);

  const handleRegister = async () => {
    if (!firstName.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      let { data: { user } } = await supabase.auth.getUser();
      let targetId = user?.id;

      // If a user exists, verify they aren't already bound to another tenant (happens during local testing when switching tenants)
      if (user) {
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (existingAffiliate && existingAffiliate.tenant_id !== TENANT_ID) {
          // Sign out to force a fresh anonymous session for the new tenant
          await supabase.auth.signOut();
          user = null;
          targetId = undefined;
        }
      }

      // If no user exists (or was just signed out), create an auth user to satisfy the affiliates_id_fkey constraint
      if (!user) {
        // We use signInAnonymously instead of signUp to avoid "email rate limit exceeded" errors during testing
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          if (authError.message.toLowerCase().includes('anonymous')) {
            throw new Error("Veuillez activer 'Anonymous Sign-ins' dans les paramètres de Supabase (Authentication > Providers) pour tester en local.");
          }
          throw new Error("Erreur Auth: " + authError.message);
        }
        targetId = authData.user?.id;
      }

      if (!targetId) {
        throw new Error("Impossible de générer un ID utilisateur valide.");
      }

      const email = user?.email || (tgUser?.username ? `${tgUser.username}@telegram.com` : `anon_${targetId?.substring(0,6)}@telegram.com`);

      const payload: any = {
        id: targetId,
        tenant_id: TENANT_ID,
        telegram_id: tgUser?.id ? String(tgUser.id) : null,
        telegram_username: username ? username.replace('@', '') : (tgUser?.username || null),
        name: firstName,
        email,
        status: 'active',
        is_vip: false,
        role: 'user',
        created_at: new Date().toISOString()
      };

      // 1. Insert into affiliates
      const { error: affiliateError } = await supabase.from('affiliates').insert([payload]);

      if (affiliateError) throw affiliateError;

      // 2. Insert notification via edge function (triggers DB insert + push)
      try {
        await triggerNotification({
          type: 'new_member',
          tenant_id: TENANT_ID,
          target_type: 'mentor',
          data: { username: username || firstName }
        });
      } catch (notifErr) {
        console.warn('Failed to insert push notification:', notifErr);
      }

      setStep(3);
    } catch (err: any) {
      console.error('Error registering member:', err);
      setError('Erreur: ' + (err.message || 'Impossible de finaliser l\'inscription.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  const avatarUrl = config.logo_url || config.mentorPhotoUrl || config.mentor_photo_url;
  const initial = config.mentorName ? config.mentorName.charAt(0).toUpperCase() : 'M';

  const screenVariants = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  };

  const transitionSpec = { duration: 0.35, ease: [0.16, 1, 0.3, 1] };

  const hasStats = (memberCount !== null && memberCount > 0) || (signalCount !== null && signalCount > 0) || (winrate !== null && winrate > 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05070C] text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* ─── Premium background graphics ─── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,22,42,1)_0%,#05070c_80%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-[#00FF41]/[0.025] blur-[100px] pointer-events-none animate-pulse [animation-duration:10s]" />
      <div className="absolute bottom-[10%] left-[10%] w-[250px] h-[250px] rounded-full bg-violet-500/[0.015] blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[390px] flex flex-col relative z-10 space-y-6">
        
        {/* Progress header (only visible screens 1 & 2) */}
        {step < 3 && (
          <div className="flex justify-between items-center px-2 shrink-0">
            <span className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] tracking-widest uppercase">
              {step === 1 ? 'Présentation' : 'Inscription'}
            </span>
            <div className="flex items-center gap-2">
              {[1, 2].map((s) => (
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
        )}

        {/* Glassmorphic Wizard Card */}
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-white/[0.06] rounded-[24px] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden min-h-[360px] flex flex-col">
          
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            
            {/* SCREEN B1 — DÉCOUVERTE */}
            {step === 1 && (
              <motion.div
                key="screen-b1"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionSpec}
                className="flex-1 flex flex-col items-center justify-center py-4 space-y-6"
              >
                {/* Tactical radar spinner enclosing Avatar */}
                <div className="relative flex items-center justify-center w-26 h-26">
                  <div className="absolute inset-0 border border-dashed border-[#00FF41]/20 rounded-full animate-[spin_30s_linear_infinite]" />
                  <div className="absolute -inset-1.5 border border-dashed border-[#00FF41]/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  <div className="absolute -inset-3 bg-[#00FF41]/[0.01] rounded-full blur-md" />
                  
                  <div className="w-[84px] h-[84px] rounded-full border border-white/[0.08] flex items-center justify-center overflow-hidden bg-black/40 z-10">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={config.mentorName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-mono text-3xl font-black text-[#00FF41]">{initial}</span>
                    )}
                  </div>
                </div>

                {/* Name & Specialty Info */}
                <div className="text-center space-y-2">
                  <span className="font-mono text-[8px] tracking-[0.2em] text-[#00FF41]/60 uppercase">PROPRIÉTAIRE</span>
                  <h1 className="font-mono text-xl font-bold text-white tracking-tight uppercase">
                    {config.mentorName}
                  </h1>
                  {config.speciality && (
                    <p className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-[0.12em] uppercase max-w-[260px] mx-auto">
                      {config.speciality}
                    </p>
                  )}
                  <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/30 to-transparent mx-auto pt-1" />
                </div>

                {/* Tactical Stats Indicators */}
                {hasStats && (
                  <div className="flex flex-wrap justify-center items-center gap-2 max-w-[300px]">
                    {memberCount !== null && memberCount > 0 && (
                      <div className="bg-black/40 border border-white/[0.04] rounded-lg px-3 py-1.5 font-mono text-[9px] text-[rgba(255,255,255,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                        <span className="font-extrabold text-white">{memberCount}</span> MEMBRES
                      </div>
                    )}
                    {signalCount !== null && signalCount > 0 && (
                      <div className="bg-black/40 border border-white/[0.04] rounded-lg px-3 py-1.5 font-mono text-[9px] text-[rgba(255,255,255,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                        <span className="font-extrabold text-white">{signalCount}</span> SIGNAUX
                      </div>
                    )}
                    {winrate !== null && winrate > 0 && (
                      <div className="bg-black/40 border border-[#00FF41]/15 rounded-lg px-3 py-1.5 font-mono text-[9px] text-[#00FF41]/80 shadow-[0_0_10px_rgba(0,255,65,0.02),inset_0_1px_0_rgba(255,255,255,0.02)]">
                        WINRATE <span className="font-black text-[#00FF41]">{winrate}%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Vision/Description Text */}
                {config.vision_text && (
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-3.5 max-w-[280px]">
                    <p className="text-[11px] italic text-[rgba(255,255,255,0.5)] leading-relaxed text-center line-clamp-3">
                      &ldquo;{config.vision_text}&rdquo;
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN B2 — INSCRIPTION */}
            {step === 2 && (
              <motion.div
                key="screen-b2"
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
                      className="p-1 -ml-1 text-[rgba(255,255,255,0.35)] hover:text-white transition-colors text-xs font-mono"
                    >
                      ← RETOUR
                    </button>
                    <span className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-widest">STEP 02</span>
                  </div>

                  {/* Intro */}
                  <div className="space-y-1 pb-4">
                    <h2 className="text-lg font-bold text-white tracking-tight">Créer votre accès</h2>
                    <p className="text-[11px] text-[rgba(255,255,255,0.4)] leading-relaxed">
                      Saisissez ces informations pour que le mentor puisse valider votre compte.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                      {error}
                    </div>
                  )}

                  {/* Form fields */}
                  <div className="space-y-4">
                    
                    {/* Prénom */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[8px] tracking-[0.18em] text-[rgba(255,255,255,0.35)] uppercase">
                        VOTRE PRÉNOM
                      </label>
                      <input
                        type="text"
                        placeholder="Entrez votre prénom"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.06] focus:border-[#00FF41]/40 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-200 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                      />
                    </div>

                    {/* Telegram username */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[8px] tracking-[0.18em] text-[rgba(255,255,255,0.35)] uppercase">
                        IDENTIFIANT TELEGRAM
                      </label>
                      <input
                        type="text"
                        placeholder="@votre_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        readOnly={!isEditableUsername}
                        className={`w-full border rounded-xl px-4 py-3 text-xs transition-all duration-200 focus:outline-none font-mono ${
                          !isEditableUsername 
                            ? 'bg-[#00FF41]/[0.02] border-[#00FF41]/15 text-[#00FF41]/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]'
                            : 'bg-black/40 border border-white/[0.06] focus:border-[#00FF41]/40 text-white placeholder-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]'
                        }`}
                      />
                      {!isEditableUsername && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="w-1 h-1 rounded-full bg-[#00FF41] animate-pulse" />
                          <p className="text-[8px] text-[rgba(0,255,65,0.45)] font-mono uppercase tracking-widest">
                            RÉCUPÉRÉ VIA TELEGRAM SECURE SDK
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN B3 — CONFIRMATION */}
            {step === 3 && (
              <motion.div
                key="screen-b3"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionSpec}
                className="flex-1 flex flex-col items-center justify-center py-4 space-y-6"
              >
                <div className="relative flex items-center justify-center w-24 h-24">
                  <div className="absolute inset-0 border border-[#00FF41]/30 rounded-full animate-ping [animation-duration:2s]" />
                  <div className="absolute -inset-2 border border-[#00FF41]/10 rounded-full" />
                  <div className="w-16 h-16 rounded-full bg-[#00FF41]/5 border border-[#00FF41]/30 flex items-center justify-center text-xl text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.15)] font-bold">
                    ✓
                  </div>
                </div>

                <div className="text-center space-y-2.5">
                  <span className="font-mono text-[8px] text-[#00FF41] tracking-[0.2em] uppercase font-black block">
                    OPÉRATION RÉUSSIE
                  </span>
                  <h3 className="font-mono text-base font-bold text-white uppercase tracking-tight">
                    Inscription terminée
                  </h3>
                  <p className="text-[11px] text-[rgba(255,255,255,0.45)] leading-relaxed max-w-[240px] mx-auto mt-2">
                    Votre compte a été créé avec succès. Vous pouvez maintenant accéder au terminal.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Global Bottom Actions */}
        <div className="space-y-3 shrink-0">
          {step === 1 && (
            <div className="flex flex-col items-center space-y-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                className="w-full h-13 bg-gradient-to-r from-[#00FF41] to-[#00E53B] text-[#080B14] rounded-xl font-mono text-[11px] font-black tracking-[0.1em] shadow-[0_0_24px_rgba(0,255,65,0.25)] hover:shadow-[0_0_32px_rgba(0,255,65,0.4)] transition-all uppercase flex items-center justify-center gap-2 border border-[#00FF41]/20 cursor-pointer"
              >
                REJOINDRE LA COMMUNAUTÉ →
              </motion.button>
              
              <div className="font-mono text-[8px] text-[rgba(255,255,255,0.15)] tracking-[0.18em] uppercase">
                SECURED SYSTEM // EPHATA TECH
              </div>
            </div>
          )}

          {step === 2 && (
            <motion.button
              whileTap={firstName.trim() ? { scale: 0.98 } : undefined}
              onClick={handleRegister}
              disabled={!firstName.trim() || isSaving}
              className={`w-full h-13 rounded-xl font-mono text-[11px] font-black tracking-[0.15em] transition-all uppercase ${
                firstName.trim()
                  ? 'bg-gradient-to-r from-[#00FF41] to-[#00E53B] text-[#080B14] shadow-[0_0_24px_rgba(0,255,65,0.25)] hover:shadow-[0_0_32px_rgba(0,255,65,0.4)] cursor-pointer'
                  : 'bg-[rgba(255,255,255,0.04)] border border-white/[0.04] text-[rgba(255,255,255,0.2)] cursor-not-allowed'
              }`}
            >
              {isSaving ? 'INSCRIPTION...' : 'SOUMETTRE L\'INSCRIPTION →'}
            </motion.button>
          )}

          {step === 3 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleFinish}
              className="w-full h-13 bg-gradient-to-r from-[#00FF41] to-[#00E53B] text-[#080B14] shadow-[0_0_24px_rgba(0,255,65,0.25)] hover:shadow-[0_0_32px_rgba(0,255,65,0.4)] rounded-xl font-mono text-[11px] font-black tracking-[0.12em] transition-all uppercase cursor-pointer"
            >
              ACCÉDER AU TERMINAL →
            </motion.button>
          )}
        </div>

      </div>
    </div>
  );
}
