import React from 'react';

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
  variant?: 'neon' | 'gold';
}

const NeonButton = ({ 
  children, 
  onClick, 
  className = "", 
  disabled = false, 
  style = {}, 
  type = "button",
  variant = 'neon',
  ...props
}: NeonButtonProps & { [key: string]: any }) => {

  const variantClasses = variant === 'gold' 
    ? "bg-accent-warning text-text-inverse shadow-[0_0_20px_rgba(255,193,7,0.3)] hover:shadow-[0_0_30px_rgba(255,193,7,0.5)]"
    : "bg-accent-neon text-text-inverse shadow-[0_0_20px_rgba(0,255,102,0.3)] hover:shadow-[0_0_30px_rgba(0,255,102,0.5)]";

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}

      className={`relative px-8 py-3 font-black text-sm rounded-xl uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:grayscale transform active:scale-95 group overflow-hidden ${variantClasses} ${className}`}
    >
      <div className="absolute inset-0 bg-bg-elevated translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default NeonButton;
