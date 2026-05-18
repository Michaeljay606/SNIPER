import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calculator as CalcIcon } from 'lucide-react';

export default function Calculator() {
  const { tenantConfig } = useOutletContext<any>();
  const isPremium = true; // TODO: Check actual plan from user profile
  
  const [mode, setMode] = useState<'forex' | 'binary'>(() => {
    return (localStorage.getItem('preferred_mode') as any) || 'forex';
  });

  const [capital, setCapital] = useState(1000);
  const [risk, setRisk] = useState(2);
  const [slPips, setSlPips] = useState(20);

  useEffect(() => {
    localStorage.setItem('preferred_mode', mode);
  }, [mode]);

  const handleModeSwitch = (newMode: 'forex' | 'binary') => {
    if (!isPremium && newMode === 'binary') return; // Cannot switch to binary if not premium
    setMode(newMode);
  };

  const isForex = mode === 'forex';
  
  // Calculations
  const riskAmount = (capital * risk) / 100;
  const pipValue = 10; // Simple approximation for standard lots
  const lotSize = riskAmount / (slPips * pipValue);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="glass-card p-4">
        <h1 className="text-2xl font-mono font-black uppercase italic tracking-tight mb-4 flex items-center gap-2">
          <CalcIcon className={isForex ? 'text-[var(--accent-emerald)]' : 'text-[var(--accent-amber)]'} />
          Calculateur
        </h1>

        {/* Mode Switch */}
          <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] relative w-full">
          <button 
            onClick={() => handleModeSwitch('forex')}
            className={`flex-1 py-[10px] text-xs font-bold tracking-widest uppercase rounded-lg transition-all duration-200 z-10 min-h-[44px] ${
              isForex ? 'text-black bg-[var(--accent-emerald)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Forex
          </button>
          <button 
            onClick={() => handleModeSwitch('binary')}
            className={`flex-1 py-[10px] text-xs font-bold tracking-widest uppercase rounded-lg transition-all duration-200 z-10 min-h-[44px] ${
              !isForex ? 'text-black bg-[var(--accent-amber)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            } ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isPremium ? "Mode Binaire disponible en PREMIUM" : ""}
          >
            Binaire
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card p-4 space-y-6 rounded-[12px]">
        <div>
          <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-2">Solde du compte ($)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono">$</span>
            <input 
              type="number" 
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-3 pl-10 pr-4 font-mono text-lg min-h-[44px] focus:border-[var(--accent-emerald)] outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Risque %</label>
            <span className="text-[10px] text-[var(--accent-emerald)] font-bold tracking-wider">MAX: 2% RECOMMANDÉ</span>
          </div>
          <div className="flex items-center gap-4 h-[44px]">
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1"
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value))}
              className="flex-1 accent-[var(--accent-emerald)]"
            />
            <span className="font-mono font-bold w-12 text-right text-[14px]">{risk.toFixed(1)}%</span>
          </div>
        </div>

        {isForex && (
          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-2">Stop Loss (Pips)</label>
            <input 
              type="number" 
              value={slPips}
              onChange={(e) => setSlPips(Number(e.target.value))}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-3 px-4 font-mono text-lg min-h-[44px] focus:border-[var(--accent-emerald)] outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className={`glass-card p-6 rounded-[12px] border ${isForex ? 'border-[var(--accent-emerald)] shadow-[0_0_20px_rgba(0,255,150,0.1)]' : 'border-[var(--accent-amber)] shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}>
        <div className="text-center mb-6">
          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-2">
            {isForex ? 'Taille de lot recommandée' : 'Mise recommandée'}
          </p>
          <p className={`text-4xl font-mono font-black ${isForex ? 'text-[var(--accent-emerald)]' : 'text-[var(--accent-amber)]'}`}>
            {isForex ? lotSize.toFixed(2) : `$${riskAmount.toFixed(2)}`}
          </p>
        </div>

        {isForex && (
          <div className="flex justify-between pt-4 border-t border-[var(--border-subtle)]">
            <div>
              <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Risque Net</p>
              <p className="font-mono text-sm text-[var(--accent-red)]">-${riskAmount.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
