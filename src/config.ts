export const USE_SUPABASE = true;

const getPathTenantId = () => {
  if (typeof window === 'undefined') return null;
  const parts = window.location.pathname.split('/');
  const appIndex = parts.indexOf('app');
  if (appIndex !== -1 && parts[appIndex + 1] && parts[appIndex + 1] !== '404') {
    return parts[appIndex + 1];
  }
  return null;
};

const getTelegramStartParam = () => {
  return window.Telegram?.WebApp?.initDataUnsafe?.start_param;
};

const getTelegramStartTenantId = () => {
  const startParam = getTelegramStartParam();
  if (!startParam) return null;
  if (startParam.startsWith('ref_')) return null;
  if (startParam.includes('_ref_')) {
    return startParam.split('_ref_')[0] || null;
  }
  return startParam;
};

function getReferralCode(): string | null {
  const urlRef = new URLSearchParams(window.location.search).get('ref');
  if (urlRef) return urlRef.toUpperCase();

  const startParam = getTelegramStartParam();
  if (startParam?.startsWith('ref_')) {
    return startParam.replace('ref_', '').toUpperCase() || null;
  }
  if (startParam?.includes('_ref_')) {
    const ref = startParam.split('_ref_')[1];
    return ref ? ref.toUpperCase() : null;
  }

  return null;
}

export const TENANT_ID =
  getPathTenantId() ||
  new URLSearchParams(window.location.search).get('tenant') ||
  getTelegramStartTenantId() ||
  import.meta.env.VITE_DEFAULT_TENANT ||
  'default';

export const REFERRAL_CODE = getReferralCode();

export const APP_MODE = window.location.search.includes('mode=master') ? 'master' : 'tenant';
export const OPERATOR_ID = Number(import.meta.env.VITE_OPERATOR_ID) || 0;

export const PLAN_GATES = {
  free: {
    signals_daily:  3,
    members:        50,
    academy:        'teaser',   // 1 leçon preview
    brokers:        1,
    analytics:      'winrate_only',
    trading_modes:  ['forex'],
    branding:       'sniper_badge',
  },
  basic: {
    signals_daily:  null,       // illimité
    members:        500,
    academy:        10,         // 10 leçons max
    brokers:        3,
    analytics:      'basic',
    trading_modes:  ['forex'],
    branding:       'sniper_badge',
  },
  premium: {
    signals_daily:  null,
    members:        2000,
    academy:        null,       // illimité
    brokers:        3,
    analytics:      'advanced',
    trading_modes:  ['forex', 'binary'],  // Switch activé
    branding:       'no_badge',
  },
  empire: {
    signals_daily:  null,
    members:        null,       // illimité
    academy:        null,
    brokers:        3,
    analytics:      'full',
    trading_modes:  ['forex', 'binary'],
    branding:       'white_label',
    blockchain_watcher: true,
  },
  pause: {
    signals_daily:  0,
    members:        0,
    academy:        0,
    brokers:        0,
    analytics:      'none',
    trading_modes:  [],
    branding:       'sniper_badge',
  },
} as const;

export type PlanType = keyof typeof PLAN_GATES;
