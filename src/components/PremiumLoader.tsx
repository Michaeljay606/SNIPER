import React from 'react';

export const PremiumLoader = ({ message, isVisible }: { message: string, isVisible: boolean }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#08090d]/98 backdrop-blur-3xl overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-neon/30 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-warning/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
          
          {/* Scanning Line */}
          <div className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-accent-neon to-transparent opacity-60 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_20px_var(--color-accent-neon)]"></div>
      </div>
      
      <div className="flex flex-col items-center gap-10 relative z-10">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Outer Rings */}
          <div className="absolute inset-0 border-4 border-accent-neon/20 rounded-full"></div>
          <div className="absolute inset-0 border-t-4 border-accent-neon rounded-full animate-[spin_1.5s_linear_infinite]"></div>
          
          <svg className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] animate-[spin_4s_linear_infinite_reverse]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent-warning/30" strokeDasharray="5 10" />
          </svg>
          
          <div className="absolute inset-8 border border-border-subtle rounded-full animate-pulse"></div>
          
          {/* Logo/Text */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-black tracking-tighter text-text-primary drop-shadow-[0_0_20px_rgba(0,255,240,0.6)] animate-pulse uppercase italic">
              EPHATA
            </div>
            <div className="h-1 w-8 bg-accent-warning rounded-full mt-1"></div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-mono font-black uppercase tracking-[0.5em] bg-gradient-to-r from-accent-neon via-white to-accent-warning bg-clip-text text-transparent animate-shimmer">
            {message}
          </p>
          <div className="flex gap-1">
             <div className="w-1 h-1 bg-accent-neon rounded-full animate-bounce delay-100"></div>
             <div className="w-1 h-1 bg-accent-neon rounded-full animate-bounce delay-200"></div>
             <div className="w-1 h-1 bg-accent-neon rounded-full animate-bounce delay-300"></div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
      `}} />
    </div>
  );
};

