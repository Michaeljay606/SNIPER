import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function detectTelegramTheme(): Theme {
  const tg = (window as any).Telegram?.WebApp;
  const saved = localStorage.getItem('theme');
  if (saved) return saved as Theme;
  
  if (tg?.colorScheme) {
    return tg.colorScheme as Theme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.setHeaderColor) {
    tg.setHeaderColor(theme === 'dark' ? '#08090d' : '#F0F2F5');
  }
  
  // Dispatch event for components to sync
  window.dispatchEvent(new Event('theme-change'));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(detectTelegramTheme());

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeState(detectTelegramTheme());
    };
    window.addEventListener('theme-change', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    applyTheme(newTheme);
  };

  return { theme, setTheme };
}
