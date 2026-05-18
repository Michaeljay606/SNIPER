import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  ShieldCheck, 
  DollarSign, 
  AlertTriangle,
  Target,
  Zap
} from 'lucide-react';
import { GlassCard } from '../ui/Shared';
import { useClientConfig } from '../../hooks/useClientConfig';

const CATEGORIES = {
  'FOREX': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
  'MÉTAUX': ['XAUUSD', 'XAGUSD'],
  'CRYPTO': ['BTCUSD', 'ETHUSD', 'SOLUSD'],
  'INDICES': ['US30', 'NAS100', 'SPX500', 'GER40'],
  'ÉNERGIE': ['USOIL', 'UKOIL', 'NGAS'],
  'SYNTHÉTIQUE': ['V75', 'V100', 'Boom 1000', 'Crash 1000']
};

const PIP_VALUES: Record<string, number> = {
  'FOREX': 10,
  'MÉTAUX': 10,
  'CRYPTO': 1,
  'INDICES': 1,
  'ÉNERGIE': 10,
  'SYNTHÉTIQUE': 1
};

type TradingMode = 'forex' | 'binary' | 'both';
type CalculatorMode = 'forex' | 'binary';

const TerminalTab = () => {
  const { config } = useClientConfig();
  const tradingMode = (config?.tradingMode as TradingMode) ?? 'forex';
  
  const [calcMode, setCalcMode] = useState<CalculatorMode>(tradingMode === 'binary' ? 'binary' : 'forex');

  useEffect(() => {
    if (tradingMode === 'forex') setCalcMode('forex');
    if (tradingMode === 'binary') setCalcMode('binary');
  }, [tradingMode]);

  const effectiveMode = tradingMode === 'both' ? calcMode : tradingMode;

  // Global state
  const [balance, setBalance] = useState<string>('1000');
  const [riskPct, setRiskPct] = useState<number>(1.0);

  // Forex state
  const [category, setCategory] = useState<string>('FOREX');
  const [pair, setPair] = useState<string>('EURUSD');
  const [slPips, setSlPips] = useState<string>('20');
  const [tpPips, setTpPips] = useState<string>('60');
  const [customPipValue, setCustomPipValue] = useState<string>('10');

  // Binary state
  const [payoutPct, setPayoutPct] = useState<string>('82');
  const [binaryAsset, setBinaryAsset] = useState<string>('EUR/USD OTC');

  useEffect(() => {
    const defaultPair = CATEGORIES[category as keyof typeof CATEGORIES]?.[0] || 'EURUSD';
    setPair(defaultPair);
    const defaultPip = PIP_VALUES[category as keyof typeof PIP_VALUES] || 10;
    setCustomPipValue(defaultPip.toString());
  }, [category]);

  const numBalance = parseFloat(balance) || 0;
  const numRiskPct = riskPct || 0;
  const riskAmount = (numBalance * numRiskPct) / 100;
  
  // Forex calculations
  const numSlPips = parseFloat(slPips) || 0;
  const numTpPips = parseFloat(tpPips) || 0;
  const currentPipVal = parseFloat(customPipValue) || 10;
  
  const calculateLot = () => {
    if (numSlPips <= 0 || currentPipVal <= 0) return 0;
    return riskAmount / (numSlPips * currentPipVal);
  };
  const recommendedLot = calculateLot();
  const potentialGainForex = (recommendedLot * numTpPips * currentPipVal);
  const rrRatio = numSlPips > 0 ? (numTpPips / numSlPips).toFixed(2) : '0.00';

  // Binary calculations
  const numPayout = parseFloat(payoutPct) || 0;
  const potentialGainBinary = riskAmount * (numPayout / 100);
  const expectedValue = potentialGainBinary - riskAmount;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 96 }}>

      {/* HEADER */}
      <div className="section-hdr" style={{ marginTop: 10 }}>
        <div className="s-line" />
        <span className="s-title">
          {effectiveMode === 'binary' ? 'CALCULATEUR BINAIRE' : 'LOT CALCULATOR'}
        </span>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* MODE SWITCHER */}
        {tradingMode === 'both' && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--subtle)', borderRadius: 50, padding: 3 }}>
            {(['forex', 'binary'] as CalculatorMode[]).map(m => (
              <button type="button" key={m} onClick={() => setCalcMode(m)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', borderRadius: 50, cursor: 'pointer',
                  transition: 'all 0.25s',
                  background: calcMode === m ? (m === 'forex' ? 'var(--green)' : 'var(--purple)') : 'transparent',
                  color: calcMode === m ? '#050507' : 'rgba(255,255,255,0.3)',
                }}>
                {m === 'forex' ? 'FOREX' : 'BINAIRE'}
              </button>
            ))}
          </div>
        )}

        {/* 1. BALANCE INPUT */}
        <GlassCard className="p-5">
          <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-3">
            SOLDE DU COMPTE ($)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <DollarSign className="text-text-muted" size={24} />
            </div>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-bg-void border border-border-subtle rounded-2xl py-4 pl-12 pr-4 text-3xl font-mono font-black text-white outline-none"
              style={{ borderBottom: `2px solid ${effectiveMode === 'binary' ? '#8B5CF6' : '#00FF41'}` }}
            />
          </div>
        </GlassCard>

        {/* 2. RISK SLIDER */}
        <GlassCard className="p-5">
          <div className="flex justify-between items-end mb-4">
            <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary">
              RISQUE À ENGAGER (%)
            </label>
            <div className="text-right">
              <span className="text-xl font-black font-mono" style={{ color: effectiveMode === 'binary' ? '#8B5CF6' : '#00FF41' }}>
                {riskPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-text-muted font-bold block">
                (${riskAmount.toFixed(2)})
              </span>
            </div>
          </div>
          <input 
            type="range" min="0.1" max="10.0" step="0.1" 
            value={riskPct}
            onChange={(e) => setRiskPct(parseFloat(e.target.value))}
            className="w-full mb-2"
            style={{ accentColor: effectiveMode === 'binary' ? '#8B5CF6' : '#00FF41' }}
          />
        </GlassCard>

        {/* 3, 4, 5, 6 - FOREX SECTIONS */}
        {effectiveMode === 'forex' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 3. INSTRUMENT SELECTOR */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">CATÉGORIE</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {Object.keys(CATEGORIES).map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${category === cat ? 'bg-accent-emerald text-black' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">PAIRE</label>
                <select value={pair} onChange={e => setPair(e.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-white font-mono outline-none">
                  {(CATEGORIES[category as keyof typeof CATEGORIES] || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* 4. SL + TP INPUTS */}
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">STOP LOSS (PIPS)</label>
                <input type="number" value={slPips} onChange={e => setSlPips(e.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-accent-red font-mono font-black outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">TAKE PROFIT (PIPS)</label>
                <input type="number" value={tpPips} onChange={e => setTpPips(e.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-accent-emerald font-mono font-black outline-none" />
              </div>
            </div>

            {/* PIP VALUE */}
            <div>
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">VALEUR PAR PIP (1 LOT)</label>
              <input type="number" value={customPipValue} onChange={e => setCustomPipValue(e.target.value)}
                className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-white font-mono outline-none" />
            </div>

            {/* 5 & 6. RESULT CARD & METRICS */}
            <GlassCard className="p-0 overflow-hidden border-accent-emerald/20">
              <div className="p-6 text-center bg-white/[0.02]">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary block mb-2">TAILLE DE LOT RECOMMANDÉE</span>
                <div className="text-5xl font-black font-mono text-white tracking-tighter">
                  {recommendedLot > 0 && recommendedLot < Infinity ? recommendedLot.toFixed(2) : '0.00'}
                </div>
                <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest mt-2 block">Lots Standards</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/5 bg-white/[0.03] border-t border-white/5">
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">RISQUE</div>
                  <div className="text-xs font-black font-mono text-accent-red">-${riskAmount.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">GAIN</div>
                  <div className="text-xs font-black font-mono text-accent-emerald">+${potentialGainForex.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">RATIO R:R</div>
                  <div className="text-xs font-black font-mono text-white">1:{rrRatio}</div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {effectiveMode === 'binary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* ASSET SELECTOR */}
            <GlassCard className="p-4">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">ACTIF (SAISISSEZ VOTRE ACTIF)</label>
              <input 
                type="text"
                list="binary-assets"
                value={binaryAsset} 
                onChange={e => setBinaryAsset(e.target.value)}
                placeholder="Ex: EUR/USD OTC"
                className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-white font-mono outline-none"
              />
              <datalist id="binary-assets">
                <option value="EUR/USD OTC" />
                <option value="GBP/USD OTC" />
                <option value="USD/JPY OTC" />
                <option value="Volatility 75" />
                <option value="Volatility 100" />
                <option value="Boom 1000" />
                <option value="Crash 1000" />
              </datalist>
            </GlassCard>



            {/* PAYOUT */}
            <GlassCard className="p-5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-3">PAYOUT DU BROKER (%)</label>
              <div className="relative">
                <input type="number" value={payoutPct} onChange={e => setPayoutPct(e.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-2xl py-4 px-4 text-3xl font-mono font-black text-white outline-none text-center focus:border-purple-500" />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-text-muted opacity-30">%</div>
              </div>
            </GlassCard>

            {/* RESULT CARD */}
            <GlassCard className="p-0 overflow-hidden" style={{ background: 'rgba(139,92,246,0.04)', borderLeft: '3px solid var(--purple)' }}>
              <div className="p-6 text-center">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary block mb-2" style={{ color: '#8B5CF6' }}>MISE FIXE</span>
                <div className="text-5xl font-black font-mono tracking-tighter" style={{ color: '#8B5CF6' }}>
                  ${riskAmount > 0 ? riskAmount.toFixed(2) : '0.00'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5">
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">SI GAGNANT</div>
                  <div className="text-sm font-black font-mono" style={{ color: 'var(--green)' }}>+${potentialGainBinary.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">SI PERDANT</div>
                  <div className="text-sm font-black font-mono text-white" style={{ color: 'var(--red)' }}>-${riskAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="flex items-center justify-between p-3 border-t border-white/5 bg-black/20">
                <div className="flex gap-2">
                </div>
                <div style={{ fontSize: '9px', fontFamily: 'Space Mono', color: 'var(--text-muted)' }}>
                  EV: <span style={{ color: expectedValue > 0 ? 'var(--green)' : 'var(--red)' }}>{expectedValue > 0 ? '+' : ''}{expectedValue.toFixed(2)}$</span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  );
};

export default TerminalTab;
