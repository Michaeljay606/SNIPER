import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Send, TrendingUp, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import NeonButton from './NeonButton';

interface UserData {
  id?: string;
  name: string;
  email?: string;
  accountNumber: string;
  broker: string;
  telegramUsername: string;
  telegramId?: string | number;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'refused' | 'banned';
  isVip: boolean;
  isBrokerVerified?: boolean;
  joinedAt: number | string;
}

const Onboarding = ({ user, onComplete, config, tenantProfile, features }: { user: UserData | null, onComplete: (data: UserData) => void, config: any, tenantProfile: any, features: any }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    telegramUsername: user?.telegramUsername || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.telegramUsername && !formData.telegramUsername) {
      setFormData(prev => ({ ...prev, telegramUsername: user.telegramUsername }));
    }
    if (user?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user, formData.telegramUsername, formData.name]);

  const handleNext = () => setStep(step + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    if (features?.maxMembers) {
      try {
        const { count, error: countError } = await supabase
          .from('affiliates')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', TENANT_ID);
          
        if (!countError && count !== null && count >= features.maxMembers) {
          alert(`Limite de membres atteinte (${features.maxMembers}). Le mentor doit upgrader son plan.`);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Error checking member limit:", err);
      }
    }

    const userData: UserData = {
      ...formData,
      accountNumber: '',
      broker: 'None',
      telegramId: tgUser?.id || '',
      telegramUsername: formData.telegramUsername || tgUser?.username || 'user_' + Math.random().toString(36).slice(2, 7),
      status: 'active',
      role: (formData.telegramUsername.toLowerCase() === TENANT_ID.toLowerCase() || tgUser?.username?.toLowerCase() === TENANT_ID.toLowerCase()) ? 'admin' : 'user',
      isVip: false,
      joinedAt: Date.now()
    };

    try {
      let { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (!supabaseUser) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        supabaseUser = signInData.user;
      }

      if (!supabaseUser) throw new Error("Session error");
      const userId = supabaseUser.id;
      
      const { error } = await supabase.from('affiliates').upsert([{
        id: userId,
        tenant_id: TENANT_ID,
        name: formData.name,
        email: formData.telegramUsername + "@mrtech.local", 
        status: userData.status,
        role: userData.role,
        is_vip: false,
        account_number: '',
        broker: 'None',
        telegram_username: userData.telegramUsername,
        telegram_id: userData.telegramId ? userData.telegramId.toString() : null,
        created_at: new Date().toISOString()
      }], { onConflict: 'id' });
      if (error) throw error;
      
      onComplete({ ...userData, id: userId });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      alert("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) return (
    <div className="fixed inset-0 z-[300] bg-bg-void flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="noise-overlay" />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="aura-glow top-[-10%] left-[-10%] w-[100%] h-[50%] bg-accent-neon/15" />
        <div className="aura-glow bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-accent-neon/10" />
      </div>
      
      <div className="relative z-10 space-y-12">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-accent-neon/20 blur-3xl animate-pulse" />
          <h1 className="text-6xl sm:text-7xl font-mono font-black text-text-primary tracking-tighter fade-in-up relative">
            {tenantProfile?.mentor_name?.split(' ')[0] || config?.mentorName?.split(' ')[0] || 'EPHATA'}<span className="text-accent-neon">TECH</span>
          </h1>
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent-neon to-transparent mt-2 scanner-line" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 fade-in-up" style={{ animationDelay: '100ms' }}>
             <div className="h-[1px] w-8 bg-bg-elevated" />
             <p className="text-[10px] text-text-secondary tracking-[0.6em] uppercase font-bold">
               {t('onboarding.subtitle')}
             </p>
             <div className="h-[1px] w-8 bg-bg-elevated" />
          </div>
          <div className="grid grid-cols-3 gap-2 fade-in-up" style={{ animationDelay: '200ms' }}>
             {['ANALYSIS', 'SIGNALS', 'ACADEMY'].map(f => (
               <div key={f} className="px-2 py-1 bg-bg-surface border border-border-subtle rounded text-[7px] text-text-secondary font-bold tracking-widest">{f}</div>
             ))}
          </div>
        </div>

        <button 
          onClick={handleNext} 
          className="cyber-button px-10 py-5 rounded-2xl text-xs font-black text-bg-void uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(0,255,102,0.4)] fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          {t('onboarding.cta')}
        </button>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="fixed inset-0 z-[300] bg-bg-void flex flex-col p-8 overflow-y-auto no-scrollbar">
      <div className="space-y-8 max-w-sm mx-auto w-full pt-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">IDENTIFICATION</h2>
          <p className="text-sm text-text-secondary">Remplissez ces informations pour accéder au terminal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">{t('onboarding.name_label')}</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl p-4 focus:neon-border outline-none transition-all"
              placeholder={t('onboarding.name_placeholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">{t('onboarding.telegram_label')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">@</span>
              <input 
                required
                type="text" 
                value={formData.telegramUsername}
                onChange={(e) => setFormData({...formData, telegramUsername: e.target.value.replace('@', '')})}
                className="w-full bg-bg-elevated border border-border-subtle rounded-xl p-4 pl-8 focus:neon-border outline-none transition-all"
                placeholder={t('onboarding.username_placeholder')}
              />
          </div>
        </div>

        <NeonButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('onboarding.submitting') : t('onboarding.submit')}
          </NeonButton>
        </form>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-bg-void flex flex-col items-center justify-center p-8 text-center space-y-8">
      <div className="w-20 h-20 rounded-full border-2 border-accent-neon flex items-center justify-center neon-glow">
        <Clock className="text-accent-neon animate-spin" style={{ animationDuration: '3s' }} size={40} />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">{t('onboarding.success_title')}</h2>
        <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
          {t('onboarding.success_subtitle')}
        </p>
      </div>
      <div className="px-4 py-2 rounded-full border border-accent-warning/30 bg-accent-warning/5 text-accent-warning text-[10px] font-bold tracking-widest animate-pulse">
        {t('onboarding.pending')}
      </div>
      <NeonButton onClick={() => window.location.reload()}>
        {t('onboarding.explore')}
      </NeonButton>
    </div>
  );
};

export default Onboarding;
