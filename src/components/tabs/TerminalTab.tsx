import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../ui/Shared';
import { useClientConfig } from '../../hooks/useClientConfig';

type TradingMode = 'forex' | 'binary' | 'both';
type CalculatorMode = 'forex' | 'binary';
type InstrumentCategory = 'forex' | 'metals' | 'crypto' | 'indices' | 'energy' | 'stocks' | 'synthetic';

interface Instrument {
  symbol: string;
  name: string;
  category: InstrumentCategory;
  pipValuePerLot: number;
  typicalSl: number;
  typicalTp: number;
}

const INSTRUMENTS: Instrument[] = [
  // Forex majors
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex', pipValuePerLot: 10, typicalSl: 20, typicalTp: 60 },
  { symbol: 'GBPUSD', name: 'Pound / US Dollar', category: 'forex', pipValuePerLot: 10, typicalSl: 25, typicalTp: 75 },
  { symbol: 'USDJPY', name: 'US Dollar / Yen', category: 'forex', pipValuePerLot: 9.2, typicalSl: 22, typicalTp: 66 },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'forex', pipValuePerLot: 11.2, typicalSl: 22, typicalTp: 66 },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'forex', pipValuePerLot: 7.4, typicalSl: 25, typicalTp: 75 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'forex', pipValuePerLot: 10, typicalSl: 20, typicalTp: 60 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', category: 'forex', pipValuePerLot: 10, typicalSl: 20, typicalTp: 60 },

  // Forex crosses
  { symbol: 'EURJPY', name: 'Euro / Yen', category: 'forex', pipValuePerLot: 9.2, typicalSl: 28, typicalTp: 84 },
  { symbol: 'GBPJPY', name: 'Pound / Yen', category: 'forex', pipValuePerLot: 9.2, typicalSl: 35, typicalTp: 105 },
  { symbol: 'EURGBP', name: 'Euro / Pound', category: 'forex', pipValuePerLot: 12.6, typicalSl: 18, typicalTp: 54 },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', category: 'forex', pipValuePerLot: 6.6, typicalSl: 30, typicalTp: 90 },
  { symbol: 'GBPAUD', name: 'Pound / Australian Dollar', category: 'forex', pipValuePerLot: 6.6, typicalSl: 35, typicalTp: 105 },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Yen', category: 'forex', pipValuePerLot: 9.2, typicalSl: 25, typicalTp: 75 },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Yen', category: 'forex', pipValuePerLot: 9.2, typicalSl: 25, typicalTp: 75 },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Yen', category: 'forex', pipValuePerLot: 9.2, typicalSl: 25, typicalTp: 75 },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', category: 'forex', pipValuePerLot: 7.4, typicalSl: 28, typicalTp: 84 },
  { symbol: 'GBPCAD', name: 'Pound / Canadian Dollar', category: 'forex', pipValuePerLot: 7.4, typicalSl: 32, typicalTp: 96 },

  // Metals
  { symbol: 'XAUUSD', name: 'Gold', category: 'metals', pipValuePerLot: 10, typicalSl: 300, typicalTp: 900 },
  { symbol: 'XAGUSD', name: 'Silver', category: 'metals', pipValuePerLot: 50, typicalSl: 60, typicalTp: 180 },
  { symbol: 'XPTUSD', name: 'Platinum', category: 'metals', pipValuePerLot: 5, typicalSl: 250, typicalTp: 750 },

  // Crypto CFDs
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'crypto', pipValuePerLot: 1, typicalSl: 800, typicalTp: 2400 },
  { symbol: 'ETHUSD', name: 'Ethereum', category: 'crypto', pipValuePerLot: 1, typicalSl: 80, typicalTp: 240 },
  { symbol: 'SOLUSD', name: 'Solana', category: 'crypto', pipValuePerLot: 1, typicalSl: 8, typicalTp: 24 },
  { symbol: 'BNBUSD', name: 'BNB', category: 'crypto', pipValuePerLot: 1, typicalSl: 20, typicalTp: 60 },
  { symbol: 'XRPUSD', name: 'XRP', category: 'crypto', pipValuePerLot: 1, typicalSl: 3, typicalTp: 9 },
  { symbol: 'ADAUSD', name: 'Cardano', category: 'crypto', pipValuePerLot: 1, typicalSl: 3, typicalTp: 9 },
  { symbol: 'DOGEUSD', name: 'Dogecoin', category: 'crypto', pipValuePerLot: 1, typicalSl: 2, typicalTp: 6 },

  // Indices
  { symbol: 'US30', name: 'Dow Jones', category: 'indices', pipValuePerLot: 1, typicalSl: 120, typicalTp: 360 },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'indices', pipValuePerLot: 1, typicalSl: 90, typicalTp: 270 },
  { symbol: 'SPX500', name: 'S&P 500', category: 'indices', pipValuePerLot: 1, typicalSl: 35, typicalTp: 105 },
  { symbol: 'GER40', name: 'DAX 40', category: 'indices', pipValuePerLot: 1, typicalSl: 80, typicalTp: 240 },
  { symbol: 'UK100', name: 'FTSE 100', category: 'indices', pipValuePerLot: 1, typicalSl: 45, typicalTp: 135 },
  { symbol: 'FRA40', name: 'CAC 40', category: 'indices', pipValuePerLot: 1, typicalSl: 45, typicalTp: 135 },
  { symbol: 'JP225', name: 'Nikkei 225', category: 'indices', pipValuePerLot: 1, typicalSl: 120, typicalTp: 360 },

  // Energy
  { symbol: 'USOIL', name: 'WTI Crude Oil', category: 'energy', pipValuePerLot: 10, typicalSl: 45, typicalTp: 135 },
  { symbol: 'UKOIL', name: 'Brent Oil', category: 'energy', pipValuePerLot: 10, typicalSl: 45, typicalTp: 135 },
  { symbol: 'NGAS', name: 'Natural Gas', category: 'energy', pipValuePerLot: 10, typicalSl: 35, typicalTp: 105 },

  // Stocks CFDs
  { symbol: 'AAPL', name: 'Apple', category: 'stocks', pipValuePerLot: 1, typicalSl: 3, typicalTp: 9 },
  { symbol: 'TSLA', name: 'Tesla', category: 'stocks', pipValuePerLot: 1, typicalSl: 12, typicalTp: 36 },
  { symbol: 'NVDA', name: 'Nvidia', category: 'stocks', pipValuePerLot: 1, typicalSl: 8, typicalTp: 24 },
  { symbol: 'AMZN', name: 'Amazon', category: 'stocks', pipValuePerLot: 1, typicalSl: 5, typicalTp: 15 },
  { symbol: 'META', name: 'Meta', category: 'stocks', pipValuePerLot: 1, typicalSl: 8, typicalTp: 24 },
  { symbol: 'MSFT', name: 'Microsoft', category: 'stocks', pipValuePerLot: 1, typicalSl: 5, typicalTp: 15 },

  // Synthetic
  { symbol: 'Volatility 10', name: 'V10 Index', category: 'synthetic', pipValuePerLot: 1, typicalSl: 80, typicalTp: 240 },
  { symbol: 'Volatility 25', name: 'V25 Index', category: 'synthetic', pipValuePerLot: 1, typicalSl: 100, typicalTp: 300 },
  { symbol: 'Volatility 50', name: 'V50 Index', category: 'synthetic', pipValuePerLot: 1, typicalSl: 120, typicalTp: 360 },
  { symbol: 'Volatility 75', name: 'V75 Index', category: 'synthetic', pipValuePerLot: 1, typicalSl: 150, typicalTp: 450 },
  { symbol: 'Volatility 100', name: 'V100 Index', category: 'synthetic', pipValuePerLot: 1, typicalSl: 180, typicalTp: 540 },
  { symbol: 'Boom 500', name: 'Boom 500', category: 'synthetic', pipValuePerLot: 1, typicalSl: 100, typicalTp: 300 },
  { symbol: 'Boom 1000', name: 'Boom 1000', category: 'synthetic', pipValuePerLot: 1, typicalSl: 120, typicalTp: 360 },
  { symbol: 'Crash 500', name: 'Crash 500', category: 'synthetic', pipValuePerLot: 1, typicalSl: 100, typicalTp: 300 },
  { symbol: 'Crash 1000', name: 'Crash 1000', category: 'synthetic', pipValuePerLot: 1, typicalSl: 120, typicalTp: 360 },
];

const BINARY_ASSETS = [
  'EUR/USD OTC', 'GBP/USD OTC', 'USD/JPY OTC', 'AUD/USD OTC', 'USD/CAD OTC',
  'EUR/JPY OTC', 'GBP/JPY OTC', 'AUD/JPY OTC', 'EUR/GBP OTC',
  'BTC/USD OTC', 'ETH/USD OTC', 'Gold OTC', 'Silver OTC',
  'Volatility 10', 'Volatility 25', 'Volatility 50', 'Volatility 75', 'Volatility 100',
  'Boom 500', 'Boom 1000', 'Crash 500', 'Crash 1000',
];

function safeNumber(value: string | number, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTradingMode(value: unknown): TradingMode {
  const raw = String(value || 'forex').toLowerCase();
  if (raw === 'binary') return 'binary';
  if (raw === 'both' || raw === 'hybrid') return 'both';
  return 'forex';
}

const TerminalTab = () => {
  const { t } = useTranslation();
  const { config } = useClientConfig();
  const tradingMode = normalizeTradingMode(config?.tradingMode);
  const [calcMode, setCalcMode] = useState<CalculatorMode>(tradingMode === 'binary' ? 'binary' : 'forex');

  const categories = useMemo(() => ([
    { id: 'forex', label: t('terminal.forex') },
    { id: 'metals', label: t('terminal.metals') },
    { id: 'crypto', label: t('terminal.crypto') },
    { id: 'indices', label: t('terminal.indices') },
    { id: 'energy', label: t('terminal.energy') },
    { id: 'stocks', label: t('terminal.stocks', 'STOCKS') },
    { id: 'synthetic', label: t('terminal.synthetic') },
  ] as Array<{ id: InstrumentCategory; label: string }>), [t]);

  const [balance, setBalance] = useState('1000');
  const [riskPct, setRiskPct] = useState(1);
  const [category, setCategory] = useState<InstrumentCategory>('forex');
  const [symbol, setSymbol] = useState('EURUSD');
  const [slPips, setSlPips] = useState('20');
  const [tpPips, setTpPips] = useState('60');
  const [pipValue, setPipValue] = useState('10');
  const [payoutPct, setPayoutPct] = useState('82');
  const [binaryAsset, setBinaryAsset] = useState('EUR/USD OTC');

  useEffect(() => {
    if (tradingMode === 'forex') setCalcMode('forex');
    if (tradingMode === 'binary') setCalcMode('binary');
  }, [tradingMode]);

  const effectiveMode = tradingMode === 'both' ? calcMode : tradingMode;
  const instruments = useMemo(() => INSTRUMENTS.filter(item => item.category === category), [category]);
  const selectedInstrument = INSTRUMENTS.find(item => item.symbol === symbol) || instruments[0] || INSTRUMENTS[0];

  useEffect(() => {
    const next = INSTRUMENTS.find(item => item.category === category) || INSTRUMENTS[0];
    setSymbol(next.symbol);
    setSlPips(String(next.typicalSl));
    setTpPips(String(next.typicalTp));
    setPipValue(String(next.pipValuePerLot));
  }, [category]);

  useEffect(() => {
    if (!selectedInstrument) return;
    setPipValue(String(selectedInstrument.pipValuePerLot));
  }, [selectedInstrument?.symbol]);

  const accountBalance = Math.max(0, safeNumber(balance));
  const riskAmount = accountBalance * Math.max(0, riskPct) / 100;
  const stopLoss = Math.max(0, safeNumber(slPips));
  const takeProfit = Math.max(0, safeNumber(tpPips));
  const pointValue = Math.max(0, safeNumber(pipValue));
  const lotSize = stopLoss > 0 && pointValue > 0 ? riskAmount / (stopLoss * pointValue) : 0;
  const potentialGain = lotSize * takeProfit * pointValue;
  const rrRatio = stopLoss > 0 ? takeProfit / stopLoss : 0;
  const payout = Math.max(0, safeNumber(payoutPct));
  const binaryProfit = riskAmount * payout / 100;
  const breakEvenWinRate = payout > 0 ? 100 / (1 + payout / 100) : 0;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 96 }}>
      <div className="section-hdr" style={{ marginTop: 10 }}>
        <div className="s-line" />
        <span className="s-title">
          {effectiveMode === 'binary' ? t('terminal.binary_calculator') : t('terminal.title')}
        </span>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tradingMode === 'both' && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--subtle)', borderRadius: 50, padding: 3 }}>
            {(['forex', 'binary'] as CalculatorMode[]).map(mode => (
              <button
                type="button"
                key={mode}
                onClick={() => setCalcMode(mode)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 10,
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  border: 'none',
                  borderRadius: 50,
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  background: calcMode === mode ? (mode === 'forex' ? 'var(--green)' : 'var(--purple)') : 'transparent',
                  color: calcMode === mode ? '#050507' : 'rgba(255,255,255,0.3)',
                }}
              >
                {mode === 'forex' ? 'FOREX/CFD' : t('terminal.binary')}
              </button>
            ))}
          </div>
        )}

        <GlassCard className="p-5">
          <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-3">
            {t('terminal.balance', { currency: '$' })}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <DollarSign className="text-text-muted" size={24} />
            </div>
            <input
              type="number"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              className="w-full bg-bg-void border border-border-subtle rounded-2xl py-4 pl-12 pr-4 text-3xl font-mono font-black text-white outline-none"
              style={{ borderBottom: `2px solid ${effectiveMode === 'binary' ? '#8B5CF6' : '#00FF41'}` }}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex justify-between items-end mb-4">
            <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary">
              {t('terminal.risk')}
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
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={riskPct}
            onChange={(event) => setRiskPct(safeNumber(event.target.value, 1))}
            className="w-full mb-2"
            style={{ accentColor: effectiveMode === 'binary' ? '#8B5CF6' : '#00FF41' }}
          />
          <p className="text-[9px] text-text-muted uppercase tracking-wider">{t('terminal.max_rec')}</p>
        </GlassCard>

        {effectiveMode === 'forex' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">
                  {t('terminal.category')}
                </label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {categories.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setCategory(item.id)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${category === item.id ? 'bg-accent-emerald text-black' : 'bg-white/5 text-white/40 border border-white/10'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">
                  {t('terminal.pair')}
                </label>
                <input
                  type="text"
                  list="terminal-instruments"
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-white font-mono outline-none"
                  placeholder={t('terminal.pair_placeholder')}
                />
                <datalist id="terminal-instruments">
                  {instruments.map(item => (
                    <option key={item.symbol} value={item.symbol}>{item.name}</option>
                  ))}
                </datalist>
                <div className="mt-2 text-[9px] text-white/35 uppercase tracking-wider">
                  {selectedInstrument?.name}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">
                  {t('terminal.stop_loss')}
                </label>
                <input
                  type="number"
                  value={slPips}
                  onChange={(event) => setSlPips(event.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-accent-red font-mono font-black outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">
                  {t('terminal.take_profit')}
                </label>
                <input
                  type="number"
                  value={tpPips}
                  onChange={(event) => setTpPips(event.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-accent-emerald font-mono font-black outline-none"
                />
              </div>
            </div>

            <GlassCard className="p-4">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">
                {t('terminal.pip_value')}
              </label>
              <input
                type="number"
                value={pipValue}
                onChange={(event) => setPipValue(event.target.value)}
                className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-white font-mono outline-none"
              />
              <div className="flex gap-2 mt-2 text-[9px] text-white/35 leading-relaxed">
                <Info size={12} className="shrink-0 mt-0.5" />
                <span>{t('terminal.pip_value_hint')}</span>
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden border-accent-emerald/20">
              <div className="p-6 text-center bg-white/[0.02]">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary block mb-2">
                  {t('terminal.lot_size')}
                </span>
                <div className="text-5xl font-black font-mono text-white tracking-tighter">
                  {Number.isFinite(lotSize) ? lotSize.toFixed(2) : '0.00'}
                </div>
                <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest mt-2 block">
                  {t('terminal.standard_lots')}
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/5 bg-white/[0.03] border-t border-white/5">
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">{t('terminal.net_risk')}</div>
                  <div className="text-xs font-black font-mono text-accent-red">-${riskAmount.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">{t('terminal.potential')}</div>
                  <div className="text-xs font-black font-mono text-accent-emerald">+${potentialGain.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">{t('terminal.rr_ratio')}</div>
                  <div className="text-xs font-black font-mono text-white">1:{rrRatio.toFixed(2)}</div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {effectiveMode === 'binary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <GlassCard className="p-4">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-2">
                {t('terminal.binary_asset')}
              </label>
              <input
                type="text"
                list="binary-assets"
                value={binaryAsset}
                onChange={(event) => setBinaryAsset(event.target.value)}
                placeholder="EUR/USD OTC"
                className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-white font-mono outline-none"
              />
              <datalist id="binary-assets">
                {BINARY_ASSETS.map(asset => <option key={asset} value={asset} />)}
              </datalist>
            </GlassCard>

            <GlassCard className="p-5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary block mb-3">
                {t('terminal.payout')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={payoutPct}
                  onChange={(event) => setPayoutPct(event.target.value)}
                  className="w-full bg-bg-void border border-border-subtle rounded-2xl py-4 px-4 text-3xl font-mono font-black text-white outline-none text-center focus:border-purple-500"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-text-muted opacity-30">%</div>
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden" style={{ background: 'rgba(139,92,246,0.04)', borderLeft: '3px solid var(--purple)' }}>
              <div className="p-6 text-center">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary block mb-2" style={{ color: '#8B5CF6' }}>
                  {t('terminal.fixed_stake')}
                </span>
                <div className="text-5xl font-black font-mono tracking-tighter" style={{ color: '#8B5CF6' }}>
                  ${riskAmount.toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">{t('terminal.if_win')}</div>
                  <div className="text-sm font-black font-mono" style={{ color: 'var(--green)' }}>+${binaryProfit.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">{t('terminal.if_loss')}</div>
                  <div className="text-sm font-black font-mono" style={{ color: 'var(--red)' }}>-${riskAmount.toFixed(2)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-[8px] font-black text-text-secondary uppercase mb-1">{t('terminal.break_even')}</div>
                  <div className="text-sm font-black font-mono text-white">{breakEvenWinRate.toFixed(1)}%</div>
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
