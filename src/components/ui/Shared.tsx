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

export const NeonButton = ({ children, onClick, variant = 'primary', className = "", disabled = false, ...props }: { children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'danger' | 'ghost', className?: string, disabled?: boolean, [key: string]: any }) => {
  const base = "relative px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none overflow-hidden group";
  const variants = {
    primary: "bg-accent-emerald text-bg-void shadow-[0_0_15px_rgba(0,255,150,0.3)] hover:shadow-[0_0_25px_rgba(0,255,150,0.5)]",
    danger: "bg-accent-red text-white shadow-[0_0_15px_rgba(255,50,50,0.3)] hover:shadow-[0_0_25px_rgba(255,50,50,0.5)]",
    ghost: "bg-transparent text-text-secondary border border-border-subtle hover:bg-white/5"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

export const SubtlePremiumLoader = () => (
  <div className="flex items-center gap-2">
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
      <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse [animation-delay:200ms]" />
      <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse [animation-delay:400ms]" />
    </div>
  </div>
);
