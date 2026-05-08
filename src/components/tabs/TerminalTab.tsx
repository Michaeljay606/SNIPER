import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Search, ChevronDown, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../ui/Shared';

const TerminalTab = ({ isScrolled, config, tenantProfile }: any) => {
  const { t } = useTranslation();
  const [balance, setBalance] = useState('10,000');
  const [risk, setRisk] = useState(1);
  const [stopLoss, setStopLoss] = useState('20');
  const [tp, setTp] = useState('40');
  const [asset, setAsset] = useState('XAUUSD');

  const riskValue = parseFloat(balance.replace(/,/g, '')) * (risk / 100);

  return (
    <div className="flex flex-col pb-20">
      <header className={`fixed ${isScrolled ? 'top-16' : 'top-24'} left-0 right-0 max-w-[430px] mx-auto z-[120] transition-all duration-200 border-b ${isScrolled ? 'bg-bg-void/70 backdrop-blur-xl border-border-subtle py-2' : 'bg-bg-void border-transparent py-3'} px-4`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-xs font-black font-mono tracking-tighter text-text-primary uppercase">{t('calcul.title')}</h2>
            <p className="text-[8px] text-text-muted uppercase tracking-[0.2em] font-bold">{t('calcul.subtitle')}</p>
          </div>
          <Calculator size={16} className="text-accent-neon" />
        </div>
      </header>

      <div className={`space-y-4 px-4 transition-all duration-200 ${isScrolled ? 'pt-20' : 'pt-28'}`}>
        <GlassCard className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{t('calcul.balance')}</label>
            <input 
              value={balance} 
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-bg-surface border border-border-subtle rounded-xl p-3 font-mono text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{t('calcul.risk')}</label>
              <span className="text-xs font-bold text-accent-neon">{risk}% (${riskValue.toLocaleString()})</span>
            </div>
            <input 
              type="range" min="0.1" max="10" step="0.1" value={risk} 
              onChange={(e) => setRisk(parseFloat(e.target.value))}
              className="w-full h-1 bg-bg-surface rounded-full appearance-none accent-accent-neon"
            />
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-3 space-y-1 border-accent-danger/20">
            <p className="text-[8px] text-text-muted uppercase font-bold">{t('terminal.net_risk')}</p>
            <p className="text-xs font-black text-accent-danger">-${riskValue.toLocaleString()}</p>
          </GlassCard>
          <GlassCard className="p-3 space-y-1 border-accent-neon/20">
            <p className="text-[8px] text-text-muted uppercase font-bold">{t('terminal.potential')}</p>
            <p className="text-xs font-black text-accent-neon">+${(riskValue * 2).toLocaleString()}</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default TerminalTab;
