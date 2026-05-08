// lib/theme.ts — single source of truth
// Called ONCE before React renders — in main.tsx

export type Theme = 'dark' | 'light';

export function detectTelegramTheme(): Theme {
  const tg = (window as any).Telegram?.WebApp;

  if (tg?.colorScheme) {
    return tg.colorScheme as Theme; // 'dark' | 'light' — from Telegram
  }

  // Fallback: system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Also update the Telegram header color if possible
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.setHeaderColor) {
    tg.setHeaderColor(theme === 'dark' ? '#08090d' : '#F0F2F5');
  }
}
