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

export const TENANT_ID =
  getPathTenantId() ||
  new URLSearchParams(window.location.search).get('tenant') ||
  (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param ||
  import.meta.env.VITE_DEFAULT_TENANT ||
  'default';

export const APP_MODE = window.location.search.includes('mode=master') ? 'master' : 'tenant';
export const OPERATOR_ID = Number(import.meta.env.VITE_OPERATOR_ID) || 0;

export const PLAN_GATES = {
  free: {
    signals_daily:  3,
    members:        50,
    academy:        'teaser',   // 1 leçon preview
    brokers:        0,
    analytics:      'winrate_only',
    trading_modes:  ['forex'],
    branding:       'ephatatech_badge',
  },
  basic: {
    signals_daily:  null,       // illimité
    members:        500,
    academy:        10,         // 10 leçons max
    brokers:        3,
    analytics:      'basic',
    trading_modes:  ['forex'],
    branding:       'ephatatech_badge',
  },
  premium: {
    signals_daily:  null,
    members:        2000,
    academy:        null,       // illimité
    brokers:        5,
    analytics:      'advanced',
    trading_modes:  ['forex', 'binary'],  // Switch activé
    branding:       'no_badge',
  },
  empire: {
    signals_daily:  null,
    members:        null,       // illimité
    academy:        null,
    brokers:        null,
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
    branding:       'ephatatech_badge',
  },
} as const;

export type PlanType = keyof typeof PLAN_GATES;
