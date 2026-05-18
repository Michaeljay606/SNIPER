import React, { useState } from 'react';
import { X, Zap, ArrowRight } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function PoweredByBadge() {
  const { tenantConfig } = useOutletContext<any>() || {};
  const [isOpen, setIsOpen] = useState(false);
  
  // Hide if empire plan (white-label)
  const isEmpire = false; // TODO: get real plan from config. Currently hardcoded for demo

  if (isEmpire) return null;

  return (
    <>
      {/* Floating Badge Container */}
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-[430px] pointer-events-none z-40">
        <button 
          onClick={() => setIsOpen(true)}
          className="absolute right-[16px] bottom-0 h-[36px] pointer-events-auto bg-black/60 border border-[rgba(255,255,255,0.07)] backdrop-blur-xl px-3 py-0 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 hover:border-[var(--accent-neon)] transition-all group"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[var(--accent-neon)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent-neon)]"></span>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              Powered By
            </span>
          </div>
          <span className="text-[12px] font-black italic uppercase text-[var(--accent-neon)] leading-none">
            Ephata Tech
          </span>
        </button>
      </div>

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-[var(--bg-base)] border-t border-[var(--accent-emerald)]/30 rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,255,150,0.1)] animate-in slide-in-from-bottom duration-300">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-white bg-[var(--bg-elevated)] rounded-full">
              <X size={16} />
            </button>

            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-[var(--border-subtle)] rounded-full" />
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/30 mb-4 shadow-[0_0_20px_rgba(0,255,150,0.2)]">
                <Zap size={24} className="text-[var(--accent-emerald)]" />
              </div>
              <h2 className="text-xl font-black font-mono uppercase tracking-tighter mb-2">Lance ta propre<br/><span className="text-[var(--accent-emerald)]">Mini App</span></h2>
              <p className="text-xs text-[var(--text-secondary)] tracking-wider">Monétise ton audience comme un pro avec ton propre terminal Telegram.</p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Design Premium sur mesure',
                'Paiements Crypto 0% de frais',
                'Espace Academy Sécurisé',
                'Notifications Push en temps réel'
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-subtle)]">
                  <CheckCircle size={16} className="text-[var(--accent-emerald)] flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">{feat}</span>
                </div>
              ))}
            </div>

            <div className="text-center mb-6">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-1">À partir de</span>
              <span className="text-2xl font-black font-mono text-[var(--text-primary)]">49$/<span className="text-sm">mois</span></span>
            </div>

            <a href="https://ephatatech.io" target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-[var(--accent-neon)] text-black rounded-xl text-center font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,65,0.4)]">
              Créer mon app <ArrowRight size={18} />
            </a>
            
            <p className="text-center text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-widest mt-4">
              🎁 30 jours EMPIRE offerts
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function CheckCircle({ size, className }: any) {
  return <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
