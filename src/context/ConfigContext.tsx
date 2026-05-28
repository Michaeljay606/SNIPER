import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import SniperLogo from '../assets/SniperLogo';
import { PremiumLoader } from '../components/PremiumLoader';

import { TENANT_ID as STATIC_TENANT_ID } from '../config';

const getEffectiveTenantId = () => {
  const parts = window.location.pathname.split('/');
  const appIndex = parts.indexOf('app');
  if (appIndex !== -1 && parts[appIndex + 1]) {
    return parts[appIndex + 1];
  }
  return STATIC_TENANT_ID;
};

const TENANT_ID = getEffectiveTenantId();

export interface ClientConfig {
  mentorName: string;
  mentorPhotoUrl: string;
  themeColor: string;
  licenceStatus: 'active' | 'expired' | 'suspended';
  plan: 'free' | 'basic' | 'premium' | 'empire' | 'legacy' | 'pause';
  maxMembers: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
  wallets: any;
  signalsDurationModel: 'fixed' | 'flexible';
  academyDurationModel: 'fixed' | 'flexible';
  tradingMode: 'forex' | 'binary' | 'both';
  trialEndsAt: string | null;
  // Branding images
  logo_url: string;
  cover_image_url: string;
  vision_photo_url: string;   // ← was missing — causes vision photo to vanish on refresh
  elite_cover_url: string;    // ← was missing — causes elite cover to vanish on refresh
  mentor_photo_url: string;
  // Identity
  speciality: string;
  vision_text: string;
  years_exp: string;
  traders_count: string;
  // Social links
  social_telegram: string;
  social_whatsapp: string;
  social_youtube: string;
  social_tiktok: string;
  social_instagram: string;
  social_facebook: string;
  telegram_contact_url: string;
  whatsapp_url: string;
  // Brokers
  broker_1_name: string;
  broker_1_url: string;
  broker_2_name: string;
  broker_2_url: string;
  broker_3_name: string;
  broker_3_url: string;
  // Elite coaching
  elite_title: string;
  elite_description: string;
  elite_price: string;
  elite_contact_url: string;
  elite_tag: string;
  // Permissions & Models
  telegramId: number | null;
  vipModel: 'payment' | 'broker' | 'both';
  academy_model: 'payment' | 'broker' | 'both';
  academy_price_1m: string;
  academy_price_lifetime: string;
  academy_duration_model: 'monthly' | 'lifetime';
  vip_price_1m: string;
  vip_price_1y: string;
  vip_price_lifetime: string;
  signals_duration_model: 'monthly' | 'lifetime';
  vip_currency: string;
  ton_payment_enabled: boolean;
  ton_wallet: string;
  hideSniperBadge: boolean;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  credit_balance: number;
}

const DEFAULT_CONFIG: ClientConfig = {
  mentorName: 'Sniper Mentor',
  mentorPhotoUrl: '',
  themeColor: '#00FF41',
  licenceStatus: 'active',
  plan: 'empire',
  telegramId: null,
  vipModel: 'payment',
  maxMembers: 1000,
  onboardingCompleted: true,
  onboardingStep: 4,
  wallets: {},
  signalsDurationModel: 'flexible',
  academyDurationModel: 'flexible',
  tradingMode: 'forex',
  trialEndsAt: null,
  logo_url: '',
  cover_image_url: '',
  vision_photo_url: '',
  elite_cover_url: '',
  mentor_photo_url: '',
  speciality: '',
  vision_text: '',
  years_exp: '',
  traders_count: '',
  social_telegram: '',
  social_whatsapp: '',
  social_youtube: '',
  social_tiktok: '',
  social_instagram: '',
  social_facebook: '',
  telegram_contact_url: '',
  whatsapp_url: '',
  broker_1_name: '',
  broker_1_url: '',
  broker_2_name: '',
  broker_2_url: '',
  broker_3_name: '',
  broker_3_url: '',
  elite_title: '',
  elite_description: '',
  elite_price: '',
  elite_contact_url: '',
  elite_tag: '',
  academy_model: 'payment',
  academy_price_1m: '',
  academy_price_lifetime: '',
  academy_duration_model: 'monthly',
  vip_price_1m: '',
  vip_price_1y: '',
  vip_price_lifetime: '',
  signals_duration_model: 'monthly',
  vip_currency: 'USDT',
  ton_payment_enabled: false,
  ton_wallet: '',
  hideSniperBadge: true,
  referral_code: '',
  referred_by: null,
  referral_count: 0,
  credit_balance: 0,
};

interface ConfigContextType {
  config: ClientConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isError?: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  refresh: async () => {},
  isError: false,
});

const applyTheme = (mode: string, themeColor: string) => {
  const isBinary = mode === 'binary';
  const color = isBinary ? '#0098EA' : themeColor;
  const dimColor = isBinary ? 'rgba(0,152,234,0.1)' : 'rgba(0,255,65,0.1)';
  const activeBorder = isBinary ? 'rgba(0,152,234,0.3)' : 'rgba(0,255,65,0.3)';
  
  const root = document.documentElement;
  root.style.setProperty('--accent-neon', color);
  root.style.setProperty('--color-accent-neon', color);
  root.style.setProperty('--accent-emerald', color);
  root.style.setProperty('--color-accent-emerald', color);
  root.style.setProperty('--accent-emerald-dim', dimColor);
  root.style.setProperty('--border-active', activeBorder);
};

const normalizePlan = (raw: string | null | undefined): ClientConfig['plan'] => {
  if (raw === 'free' || raw === 'basic' || raw === 'premium' || raw === 'empire' || raw === 'pause' || raw === 'legacy') {
    return raw;
  }
  return 'free';
};

const normalizeTradingMode = (rawMode: string | null | undefined, plan: ClientConfig['plan']): ClientConfig['tradingMode'] => {
  const raw = (rawMode || 'forex').toUpperCase();
  const requested = raw === 'BINARY' ? 'binary' : raw === 'BOTH' ? 'both' : 'forex';

  if (requested === 'both') return plan === 'empire' ? 'both' : 'forex';
  if (requested === 'binary') return plan === 'premium' || plan === 'empire' ? 'binary' : 'forex';
  return 'forex';
};

const rowToConfig = (row: any): ClientConfig => {
  const plan = normalizePlan(row.plan);
  const canUseTon = plan === 'premium' || plan === 'empire';
  const canHideBadge = plan === 'premium' || plan === 'empire';
  const canWhiteLabel = plan === 'empire';
  const canUsePayment = plan === 'free' || plan === 'basic' || plan === 'premium' || plan === 'empire';
  const canUseBothAccess = plan === 'premium' || plan === 'empire';
  const vipModel = (row.vip_model as 'payment' | 'broker' | 'both') || 'broker';
  const academyModel = row.academy_model === 'free'
    ? 'payment'
    : ((row.academy_model as 'payment' | 'broker' | 'both') || 'payment');

  return ({
  mentorName: row.mentor_name || 'Mentor',
  mentorPhotoUrl: row.mentor_photo_url || '',
  themeColor: canWhiteLabel ? (row.theme_color || '#00FF41') : '#00FF41',
  licenceStatus: row.licence_status || 'active',
  plan,
  maxMembers: row.max_members || 1000,
  onboardingCompleted: row.onboarding_completed ?? true,
  onboardingStep: row.onboarding_step || 4,
  wallets: row.wallets || {},
  signalsDurationModel: row.signals_duration_model || 'flexible',
  academyDurationModel: row.academy_duration_model || 'flexible',
  tradingMode: normalizeTradingMode(row.trading_mode, plan),
  trialEndsAt: row.trial_ends_at || null,
  // Branding images — ALL included so they survive refresh
  logo_url: row.logo_url || '',
  cover_image_url: row.cover_image_url || '',
  vision_photo_url: row.vision_photo_url || '',
  elite_cover_url: row.elite_cover_url || '',
  mentor_photo_url: row.mentor_photo_url || '',
  // Identity
  speciality: row.speciality || '',
  vision_text: row.vision_text || '',
  years_exp: row.years_exp || '',
  traders_count: row.traders_count || '',
  // Social
  social_telegram: row.social_telegram || '',
  social_whatsapp: row.social_whatsapp || '',
  social_youtube: row.social_youtube || '',
  social_tiktok: row.social_tiktok || '',
  social_instagram: row.social_instagram || '',
  social_facebook: row.social_facebook || '',
  telegram_contact_url: row.telegram_contact_url || '',
  whatsapp_url: row.whatsapp_url || '',
  // Brokers
  broker_1_name: row.broker_1_name || '',
  broker_1_url: row.broker_1_url || '',
  broker_2_name: row.broker_2_name || '',
  broker_2_url: row.broker_2_url || '',
  broker_3_name: row.broker_3_name || '',
  broker_3_url: row.broker_3_url || '',
  // Elite
  elite_title: row.elite_title || '',
  elite_description: row.elite_description || '',
  elite_price: row.elite_price || '',
  elite_contact_url: row.elite_contact_url || '',
  elite_tag: row.elite_tag || '',
  // Permissions
  telegramId: row.telegram_id ? Number(row.telegram_id) : null,
  vipModel: canUseBothAccess || vipModel !== 'both'
    ? (canUsePayment ? vipModel : 'broker')
    : 'payment',
  academy_model: canUseBothAccess || academyModel !== 'both'
    ? (canUsePayment ? academyModel : 'broker')
    : 'payment',
  academy_price_1m: row.academy_price_1m || '',
  academy_price_lifetime: row.academy_price_lifetime || '',
  academy_duration_model: row.academy_duration_model || 'monthly',
  vip_price_1m: row.vip_price_1m || '',
  vip_price_1y: row.vip_price_1y || '',
  vip_price_lifetime: row.vip_price_lifetime || '',
  signals_duration_model: row.signals_duration_model || 'monthly',
  vip_currency: row.vip_currency || 'USDT',
  ton_payment_enabled: canUseTon ? !!row.ton_payment_enabled : false,
  ton_wallet: canUseTon ? (row.ton_wallet || '') : '',
  hideSniperBadge: canHideBadge ? row.hide_sniper_badge !== false : false,
  referral_code: row.referral_code || '',
  referred_by: row.referred_by || null,
  referral_count: Number(row.referral_count || 0),
  credit_balance: Number(row.credit_balance || 0),
  });
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bootAnimDone, setBootAnimDone] = useState(false);
  const queryClient = useQueryClient();
  const location = useLocation();

  const tenant_id = useMemo(() => {
    const parts = location.pathname.split('/');
    const appIndex = parts.indexOf('app');
    if (appIndex !== -1 && parts[appIndex + 1]) {
      return parts[appIndex + 1];
    }
    return STATIC_TENANT_ID;
  }, [location.pathname]);

  // On récupère instantanément le dernier nom connu (cache) pour éviter le clignotement
  const cachedMentorName = localStorage.getItem(`mentorName_${tenant_id}`);

  const { data: config, isLoading, isError, error } = useQuery({
    queryKey: ['config', tenant_id],
    queryFn: async () => {
      if (!tenant_id) throw new Error('No tenant ID provided');
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_id', tenant_id)
        .single();

      if (error) {
        console.error(`Config fetch error for ${tenant_id}:`, error);
        throw error;
      }
      
      if (!data) throw new Error('Tenant not found');

      const cfg = rowToConfig(data);
      applyTheme(cfg.tradingMode, cfg.themeColor);
      return cfg;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!tenant_id,
    retry: 1,
  });

  useEffect(() => {
    if (!tenant_id) return;
    // Realtime subscription
    const channel = supabase
      .channel(`global-config-${tenant_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `tenant_id=eq.${tenant_id}` },
        (payload) => {
          const updated = payload.new;
          const cfg = rowToConfig(updated);
          applyTheme(cfg.tradingMode, cfg.themeColor);
          queryClient.setQueryData(['config', tenant_id], cfg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, tenant_id]);

  // Met à jour le cache instantané dès qu'on a le nom depuis la DB
  useEffect(() => {
    if (config?.mentorName) {
      localStorage.setItem(`mentorName_${tenant_id}`, config.mentorName);
    }
  }, [config?.mentorName, tenant_id]);

  const value = useMemo(() => ({
    config: config || null,
    loading: isLoading,
    refresh: async () => { await queryClient.invalidateQueries({ queryKey: ['config', tenant_id] }); },
    isError: !!isError,
  }), [config, isLoading, tenant_id, queryClient, isError]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
      {!bootAnimDone && (
        <PremiumLoader 
          onComplete={() => setBootAnimDone(true)} 
          tenantName={config?.mentorName || cachedMentorName || undefined} 
          ready={!isLoading}
        />
      )}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
