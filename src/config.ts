export const USE_SUPABASE = true;

function getTenantId(): string | null {
  // Priority 1: Telegram startapp parameter
  const startParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (startParam) return startParam;

  // Priority 2: URL query parameter
  const urlParam = new URLSearchParams(window.location.search).get('tenant');
  if (urlParam) return urlParam;

  // Priority 3: return null — no default fallback
  return null;
}

export const TENANT_ID = getTenantId() || 'mrtech237';

function getAppMode(): 'master' | 'tenant' {
  // Route 1: Super Admin access
  // Triggered by long-press on "POWERED BY EPHATA TECH"
  // OR by URL: ?mode=master (for dev testing only)
  if (window.location.search.includes('mode=master')) {
    return 'master'
  }

  // Route 2: Normal tenant app (mentor or member)
  return 'tenant'
}

export const APP_MODE = getAppMode()
export const OPERATOR_ID = Number(import.meta.env.VITE_OPERATOR_ID)
