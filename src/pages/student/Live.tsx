import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Lock, CheckCircle, Clock, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignalFeed from '../../components/signals/SignalFeed';
import { useSignals } from '../../hooks/useSignals';
import { useTradingMode } from '../../context/TradingModeContext';
import { useTranslation } from 'react-i18next';

export default function Live() {
  const { t } = useTranslation();
  const { tenant_id, planFeatures } = useOutletContext<any>();
  const { tradingMode } = useTradingMode();
  const { signals, isLoading } = useSignals(tenant_id || 'default', tradingMode === 'MARKETS' ? 'forex' : 'binary');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');

  const imminents = (signals as any[]).filter(s => (s.signal_type || s.type) === 'IMMINENT' || (s.signal_type || s.type) === 'WATCH');
  const regulars = (signals as any[]).filter(s => (s.signal_type || s.type) !== 'IMMINENT' && (s.signal_type || s.type) !== 'WATCH');

  if (isLoading) return (
    <div className="p-8 flex flex-col items-center justify-center space-y-4 animate-pulse">
      <Activity className="text-[var(--accent-emerald)] opacity-20" size={48} />
      <div className="h-4 w-32 bg-white/5 rounded" />
      <div className="space-y-3 w-full">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pt-2">
      {planFeatures?.isPaused && (
        <div className="mx-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl text-center font-mono text-[10px] tracking-wider uppercase">
          ⚠️ Terminal Suspendu — Les nouveaux signaux sont interrompus. Accès aux signaux existants uniquement.
        </div>
      )}

      {/* PRIX LIVE — 3 colonnes égales */}
      <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.07)] border-y border-[rgba(255,255,255,0.07)] bg-[#08090d]">
        {[
          { pair: 'XAUUSD', value: '2345.67', trend: 'up' },
          { pair: 'EURUSD', value: '1.0892', trend: 'down' },
          { pair: 'BTCUSD', value: '64230', trend: 'up' }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center py-3 px-1">
            <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">{item.pair}</span>
            <div className={`flex items-center gap-1 text-[20px] font-mono font-black ${item.trend === 'up' ? 'text-[var(--accent-emerald)]' : 'text-[var(--accent-red)]'}`}>
              {item.trend === 'up' ? '▲' : '▼'} {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* BARRE SIGNAUX */}
      <div className="px-[16px] space-y-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              {t('live.title')} <span className="w-1.5 h-1.5 bg-[var(--accent-emerald)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent-emerald)]"></span>
            </span>
            <span className="px-2 py-0.5 bg-[var(--accent-emerald-dim)] text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/30 rounded text-[9px] font-black uppercase tracking-tighter">
              [BASIC]
            </span>
          </div>
          <button className="px-3 py-1.5 border border-[var(--accent-emerald)] text-[var(--accent-emerald)] rounded-lg text-[11px] font-bold uppercase tracking-widest bg-transparent">
            {t('live.market_open')}
          </button>
        </div>
        <p className="font-mono text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
          {t('live.real_time')} · {(() => {
            const today = new Date().toDateString();
            return signals.filter(s => 
              s.status === 'active' && new Date(s.created_at || Date.now()).toDateString() === today
            ).length;
          })()} {t('live.active')}
        </p>
      </div>

      {/* SECTION EN COURS (LIVE) */}
      <div className="flex items-center justify-center gap-4 px-[16px]">
        <div className="h-[1px] flex-1 bg-[rgba(255,255,255,0.07)]"></div>
        <span className="text-[11px] font-black text-[var(--accent-emerald)] uppercase tracking-[0.2em] flex items-center gap-2">
          ⚡ {t('dashboard.live_status')}
        </span>
        <div className="h-[1px] flex-1 bg-[rgba(255,255,255,0.07)]"></div>
      </div>

      {/* Signals List */}
      <div className="w-full px-[16px]">
        <SignalFeed signals={regulars} showHeader={false} />
      </div>

      {/* ALERTES ACTIVES (IMMINENTS / WATCH) */}
      {imminents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 px-[16px]">
            <div className="h-[1px] flex-1 bg-[rgba(255,255,255,0.07)]"></div>
            <span className="text-[11px] font-black text-[var(--accent-gold)] uppercase tracking-[0.2em] flex items-center gap-2">
              {t('dashboard.active_alerts')}
            </span>
            <div className="h-[1px] flex-1 bg-[rgba(255,255,255,0.07)]"></div>
          </div>
          <div className="px-[16px]">
            <SignalFeed signals={imminents} showHeader={false} />
          </div>
        </div>
      )}

      {regulars.length === 0 && (
        <div className="text-center py-[40px] text-[var(--text-muted)] flex flex-col items-center justify-center h-[200px]">
          <Activity size={40} className="mb-4 opacity-50" />
          <p className="text-[13px] font-bold uppercase tracking-widest">{t('live.no_signals')}</p>
        </div>
      )}
    </div>
  );
}


