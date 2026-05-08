import React from 'react';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  [key: string]: any;
}

const NavButton = ({ active, onClick, icon, label, ...props }: NavButtonProps) => (
  <button 
    {...props}
    onClick={onClick}
    className="relative flex flex-col items-center gap-1 sm:gap-1.5 group py-1"
  >
    <div className={`transition-all duration-300 relative z-10 ${active ? 'text-accent-emerald scale-110' : 'text-text-secondary group-hover:text-text-primary'}`}>
      {icon}
      {active && <div className="absolute inset-0 bg-accent-emerald/20 blur-lg rounded-full -z-10" />}
    </div>
    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${active ? 'text-accent-emerald font-black' : 'text-text-secondary group-hover:text-text-primary'}`}>
      {label}
    </span>
    {active && (
      <div className="absolute -bottom-3 sm:-bottom-4 left-0 right-0 h-1 bg-accent-emerald rounded-full shadow-[0_0_12px_rgba(0,255,153,1)] scale-x-75" />
    )}
  </button>
);

export default NavButton;
