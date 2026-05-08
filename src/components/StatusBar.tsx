import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-mono text-[10px] text-accent-emerald opacity-80">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
};

export const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button 
      onClick={toggleTheme}
      className={`p-1.5 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-elevated transition-all flex items-center justify-center text-text-primary group active:scale-90 ${className}`}
      title={theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
    >
      {theme === 'dark' ? (
        <Sun size={12} className="text-accent-warning group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon size={12} className="text-accent-blue group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
};

const StatusBar = () => {
  const { t } = useTranslation();
  return (
    <div className="fixed top-0 left-0 right-0 z-[110] max-w-[430px] mx-auto px-6 py-1 flex justify-between items-center bg-nav-bg backdrop-blur-md border-b border-nav-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-accent-emerald rounded-full animate-pulse" />
          <span className="text-[7px] font-bold text-text-secondary uppercase tracking-widest">{t('common.system_live')}</span>
        </div>
        <div className="h-2 w-[1px] bg-border-subtle" />
        <DigitalClock />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-bold text-text-secondary uppercase tracking-widest">Ephata-V2.4</span>
          <div className="flex gap-0.5">
            {[1,2,3,4].map(i => <div key={i} className={`w-1 h-2 rounded-sm border border-border-subtle ${i <= 3 ? 'bg-accent-neon' : 'bg-bg-elevated'}`} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
