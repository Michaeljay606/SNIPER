import React from 'react';

export const GlassCard = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={`glass-card p-4 border border-border-subtle shadow-card ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'neon', className = "", ...props }: { children: React.ReactNode, variant?: 'neon' | 'danger' | 'warning' | 'secondary', className?: string, [key: string]: any }) => {
  const variants = {
    neon: 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20',
    danger: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
    warning: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
    secondary: 'bg-bg-surface text-text-secondary border border-border-subtle'
  };
  return (
    <span {...props} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const TechHeader = ({ title, subtitle, count }: { title: string, subtitle?: string, count?: string | number }) => (
  <div className="flex items-center gap-2 px-1 mb-6">
    <div className="w-[3px] h-3.5 bg-accent-emerald rounded-sm shadow-card" />
    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.18em] font-mono">{title}</h3>
    <div className="flex-1 h-[1px] bg-border-subtle mx-2" />
    {count !== undefined && (
      <span className="text-[10px] text-text-muted font-mono">{count} {typeof count === 'number' && count > 1 ? 'ACTIFS' : 'ACTIF'}</span>
    )}
  </div>
);

export const CyberFrame = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-accent-emerald/50" />
    <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-accent-emerald/50" />
    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-accent-emerald/50" />
    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-accent-emerald/50" />
    {children}
  </div>
);
