// src/components/StatusBar.tsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <button 
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center text-text-secondary hover:text-accent-neon transition-colors"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

const StatusBar = () => {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-bg-void/50 backdrop-blur-md border-b border-border-subtle">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent-neon animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-accent-neon">Live System</span>
      </div>
      <ThemeToggle />
    </div>
  );
};

export default StatusBar;
