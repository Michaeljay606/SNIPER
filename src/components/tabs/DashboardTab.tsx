import React, { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useParams } from 'react-router-dom';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useSignals } from '../../hooks/useSignals';
import { useUserRole } from '../../hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VipModal from '../VipModal';

interface Signal {
  id: string;
  pair?: string;
  asset?: string;
  type?: string;
  signal_type?: string; // 'LIVE' | 'WATCH'
  direction?: string;
  mode?: 'forex' | 'binary';
  entry?: string;
  entry_low?: number;
  entry_high?: number;
  sl?: string;
  tp?: string;
  expiration?: string;
  payout_pct?: number;
  rr?: string;
  status: string;
  created_at: string;
  is_vip?: boolean;
  analysis_note?: string;
  watch_activated_at?: string;
  timestamp?: string;
  martingale?: string;
  gale_stage?: number;
  gale_activated_at?: string;
}

const FOREX_TICKERS = [
  { pair: 'XAUUSD', price: '2 345.32', arrow: '▲', up: true },
  { pair: 'EURUSD', price: '1.0842',   arrow: '▼', up: false },
  { pair: 'BTCUSD', price: '62 410',   arrow: '▲', up: true },
];

const BINARY_TICKERS = [
  { pair: 'EURUSD (OTC)', price: '1.0842',   arrow: '▲', up: true },
  { pair: 'GBPUSD (OTC)', price: '1.2715',   arrow: '▼', up: false },
  { pair: 'USDJPY (OTC)', price: '156.24',   arrow: '▲', up: true },
];

const DashboardTab = () => {
  const { tenant_id } = useParams();
  const { config } = useClientConfig();
  const { t } = useTranslation();
  const { isAdmin, canSeeVipSignals } = useUserRole();
  const queryClient = useQueryClient();

  const optimisticUpdate = (signalId: string, updates: Partial<Signal>) => {
    const tid = tenant_id || 'default';
    const keys = [
      ['signals', tid, 'binary'],
      ['signals', tid, 'both']
    ];
    keys.forEach(key => {
      queryClient.setQueryData(key, (old: any) => {
        if (!old) return old;
        return old.map((s: any) => {
          if (s.id === signalId) {
            return { ...s, ...updates };
          }
          return s;
        });
      });
    });
  };
  
  // Normalize trading mode from config
  const rawMode = (config?.tradingMode || config?.trading_mode || 'forex').toLowerCase();
  const tradingMode: 'forex' | 'binary' | 'both' = 
    rawMode === 'binary' ? 'binary' : 
    (rawMode === 'both' ? 'both' : 'forex');

  const initialTickers = useMemo(() => {
    return tradingMode === 'binary' ? BINARY_TICKERS : FOREX_TICKERS;
  }, [tradingMode]);

  const [currentTickers, setCurrentTickers] = useState(initialTickers);

  useEffect(() => {
    setCurrentTickers(initialTickers);
  }, [initialTickers]);

  // Simulate premium dynamic price updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTickers(prev => prev.map(t => {
        const isUp = Math.random() > 0.48;
        const currentPriceVal = parseFloat(t.price.replace(/\s+/g, '').replace(',', '.'));
        if (isNaN(currentPriceVal)) return t;

        // Tiny fluctuation (0.01% - 0.03%)
        const fluctuation = currentPriceVal * (Math.random() * 0.0002 + 0.0001);
        const newPriceVal = isUp ? currentPriceVal + fluctuation : currentPriceVal - fluctuation;

        let newPriceStr = '';
        if (t.pair.includes('BTCUSD')) {
          newPriceStr = Math.round(newPriceVal).toLocaleString('fr-FR').replace(/\s+/g, ' ');
        } else if (t.pair.includes('XAUUSD')) {
          const parts = newPriceVal.toFixed(2).split('.');
          const integerPart = Math.round(parseFloat(parts[0])).toLocaleString('fr-FR').replace(/\s+/g, ' ');
          newPriceStr = `${integerPart}.${parts[1]}`;
        } else if (t.pair.includes('USDJPY')) {
          newPriceStr = newPriceVal.toFixed(3);
        } else {
          newPriceStr = newPriceVal.toFixed(4);
        }

        return {
          ...t,
          price: newPriceStr,
          up: isUp,
          arrow: isUp ? '▲' : '▼'
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const { signals, isLoading: signalsLoading } = useSignals(tenant_id || 'default', tradingMode);
  const { loading: configLoading } = useClientConfig();

  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [winGains, setWinGains] = useState<Record<string, string>>({});
  const binaryTerminology = config?.wallets?.binary_terminology || 'callput';

  useEffect(() => {
    localStorage.setItem('binary_terminology', binaryTerminology);
    window.dispatchEvent(new Event('storage'));
  }, [binaryTerminology]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isOverallLoading = signalsLoading || configLoading;


  const filteredSignals = useMemo(() => {
    if (!signals) return [];
    
    if (tradingMode === 'forex') {
      return signals.filter(s =>
        s.mode === 'forex' || s.mode === null || s.mode === undefined
      );
    }
    
    if (tradingMode === 'binary') {
      return signals.filter(s => s.mode === 'binary');
    }
    
    return signals;
  }, [signals, tradingMode]);

  function groupSignalsByDate(sigs: Signal[]) {
    const groups: Record<string, Signal[]> = {};
    
    sigs.forEach(signal => {
      const date = signal.created_at ? new Date(signal.created_at) : new Date();
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = t('dashboard.today', 'AUJOURD\'HUI');
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = t('dashboard.yesterday', 'HIER');
      } else {
        key = date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        }).toUpperCase();
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(signal);
    });

    return groups;
  }

  const isClosed = (s: Signal) => ['tp', 'sl', 'cancelled'].includes(s.status);
  const isWatchSignal = (s: Signal) => s.signal_type === 'WATCH';
  const isBin    = (s: Signal) => (s.mode || 'forex') === 'binary';
  const isUp     = (s: Signal) => {
    const d = (s.direction || '').toUpperCase();
    return d.includes('BUY') || d.includes('CALL');
  };

  const liveSignals = useMemo(() => {
    if (!filteredSignals) return [];
    return filteredSignals.filter(s => !isClosed(s) && !isWatchSignal(s));
  }, [filteredSignals]);

  const watchSignals = useMemo(() => {
    if (!filteredSignals) return [];
    return filteredSignals.filter(s => isWatchSignal(s) && s.status === 'active');
  }, [filteredSignals]);

  const historicalSignals = useMemo(() => {
    if (!filteredSignals) return [];
    return filteredSignals.filter(s => isClosed(s));
  }, [filteredSignals]);

  const groupedHistorical = useMemo(() => groupSignalsByDate(historicalSignals), [historicalSignals]);

  const historicalKeys = useMemo(() => Object.keys(groupedHistorical).sort((a, b) => {
    if (a === 'AUJOURD\'HUI') return -1;
    if (b === 'AUJOURD\'HUI') return 1;
    if (a === 'HIER') return -1;
    if (b === 'HIER') return 1;
    
    const sigA = groupedHistorical[a][0];
    const sigB = groupedHistorical[b][0];
    if (!sigA || !sigB) return 0;
    return new Date(sigB.created_at).getTime() - new Date(sigA.created_at).getTime();
  }), [groupedHistorical]);

  const fmt = (ts?: string) => {
    const d = ts ? new Date(ts) : new Date();
    return isNaN(d.getTime()) ? 'NOW' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderResultBadge = (s: Signal) => {
    const bin = isBin(s);
    if (s.status === 'tp') {
      if (bin) {
        return (
          <div className="result-pill" style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', color: 'var(--green)' }}>
            ✓ WIN {s.rr || t('dashboard.win_direct', 'DIRECT')}
          </div>
        );
      }
      const lbl = s.rr ? `+${s.rr} ${t('dashboard.pips', 'Pips')}` : '';
      return (
        <div className="result-pill" style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', color: 'var(--green)' }}>
          ✓ TP {lbl}
        </div>
      );
    }
    if (s.status === 'sl') {
      if (bin) {
        return (
          <div className="result-pill" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: 'var(--red)' }}>
            ✗ LOSS
          </div>
        );
      }
      const lbl = s.rr ? `${s.rr}p` : '';
      return (
        <div className="result-pill" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: 'var(--red)' }}>
          ✗ SL {lbl}
        </div>
      );
    }
    if (s.status === 'cancelled') return (
      <div className="result-pill" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
        {t('dashboard.cancelled', 'ANNULÉ')}
      </div>
    );
    return (
      <div className="live-ind">
        <span className="live-dot" />
        LIVE
      </div>
    );
  };

  // ─── WATCH CARD ───────────────────────────────────────────────
  const renderWatchCard = (s: Signal) => {
    const up = isUp(s);
    const bin = isBin(s);
    const dirLabel = bin 
      ? (binaryTerminology === 'callput' 
        ? (up ? '▲ CALL' : '▼ PUT') 
        : (up ? '▲ UP' : '▼ DOWN'))
      : (up ? '▲ BUY' : '▼ SELL');
    
    const isLockedVip = s.is_vip && !canSeeVipSignals;
    const dirClass = isLockedVip ? 'sig-vip-locked' : (up ? 'sig-call' : 'sig-put');
    const cornerColor = isLockedVip ? '#FFD60A' : (up ? 'var(--green)' : 'var(--red)');
    
    // VIP Theme integration
    const themeColor = s.is_vip ? '#FFD60A' : 'var(--amber)';
    const themeRgb = s.is_vip ? '255,214,10' : '255,178,0';

    const activeClass = s.is_vip 
      ? 'is-vip-active' 
      : (up ? 'is-buy-active' : 'is-sell-active');

    return (
      <div key={s.id} className={`sig-card ${dirClass} ${activeClass}`}>
        <div className="corner c-tl" style={{ borderColor: cornerColor }} />
        <div className="corner c-tr" style={{ borderColor: cornerColor }} />
        <div className="corner c-bl" style={{ borderColor: cornerColor }} />
        <div className="corner c-br" style={{ borderColor: cornerColor }} />

        <div style={{ position: 'absolute', top: 0, left: 0, background: themeColor, padding: '3px 10px', borderRadius: '0 0 8px 0', fontSize: 7, fontFamily: 'var(--mono)', fontWeight: 700, color: '#000', zIndex: 5 }}>
          {t('dashboard.alert', 'ALERTE')}
        </div>

        <div className="card-top" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="card-pair">{s.pair || s.asset || 'ASSET'}</span>
            {isLockedVip ? (
              <span className="type-badge" style={{ background: 'rgba(255,214,10,0.1)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.3)', fontFamily: 'var(--mono)', fontSize: '8px' }}>
                🔒 VIP
              </span>
            ) : (
              <span className={`type-badge ${up ? 'tb-call' : 'tb-put'}`}>
                {dirLabel}
              </span>
            )}
            {s.is_vip ? (
              <span className="vip-badge" style={{ background: 'rgba(255,214,10,0.1)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.3)' }}>VIP</span>
            ) : (
              <span className="vip-badge" style={{ background: 'rgba(0,255,65,0.1)', color: '#00FF41', border: '1px solid rgba(0,255,65,0.3)' }}>{t('dashboard.free', 'GRATUIT')}</span>
            )}
          </div>
          <div className="live-ind" style={{ color: themeColor }}>
            <span className="live-dot" style={{ background: themeColor, boxShadow: `0 0 8px rgba(${themeRgb},0.8)`, animation: 'pulse-glow 1.5s infinite' }} />
            {t('dashboard.surveillance', 'SURVEILLANCE')}
          </div>
        </div>

        {s.is_vip && !canSeeVipSignals ? (
          <div style={{ position: 'relative', marginTop: 8, height: 100, overflow: 'hidden', borderRadius: 10 }}>
            <div style={{ filter: 'blur(12px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.85, transform: 'scale(0.85)', transformOrigin: 'center top' }}>
              <div className="binary-hero">
                <div className="b-stat">
                  <div className="b-val" style={{ color: bin ? themeColor : 'var(--red)' }}>—</div>
                  <div className="b-lbl" style={{ color: bin ? undefined : 'rgba(255,59,48,0.6)' }}>{bin ? t('dashboard.expiration', 'EXPIRATION') : 'STOP LOSS'}</div>
                </div>
                <div className="b-stat" style={{ borderLeft: '1px solid var(--subtle)', borderRight: '1px solid var(--subtle)' }}>
                  <div className="b-val" style={{ color: themeColor, fontSize: '14px' }}>{t('dashboard.to_define', 'À DÉFINIR')}</div>
                  <div className="b-lbl">{t('dashboard.entry_zone', 'ZONE D\'ENTRÉE')}</div>
                </div>
                <div className="b-stat">
                  <div className="b-val" style={{ color: bin ? '#fff' : 'var(--green)' }}>—</div>
                  <div className="b-lbl" style={{ color: bin ? undefined : 'rgba(0,255,65,0.6)' }}>{bin ? 'PAYOUT' : 'TAKE PROFIT'}</div>
                </div>
              </div>
              <div className="payout-bar-bg">
                <div className="payout-bar-fill" style={{ width: '100%', background: `rgba(${themeRgb}, 0.5)` }} />
              </div>
            </div>
            
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,20,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
                <span style={{ fontSize: '18px' }}>🔐</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                  {t('dashboard.vip_alert', 'ALERTE VIP')}
                </span>
              </div>
              <button onClick={() => setIsVipModalOpen(true)} style={{ fontFamily: 'var(--mono)', fontSize: '9px', padding: '6px 16px', borderRadius: '24px', background: 'rgba(255,214,10,0.16)', border: '1px solid rgba(255,214,10,0.4)', color: '#FFD60A', cursor: 'pointer', letterSpacing: '0.05em', fontWeight: 800, transition: 'all 0.2s' }}>
                {t('dashboard.unlock', 'DÉBLOQUER')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="binary-hero">
              <div className="b-stat">
                <div className="b-val" style={{ color: bin ? themeColor : 'var(--red)' }}>—</div>
                <div className="b-lbl" style={{ color: bin ? undefined : 'rgba(255,59,48,0.6)' }}>{bin ? t('dashboard.expiration', 'EXPIRATION') : 'STOP LOSS'}</div>
              </div>
              <div className="b-stat" style={{ borderLeft: '1px solid var(--subtle)', borderRight: '1px solid var(--subtle)' }}>
                <div className="b-val" style={{ color: themeColor, fontSize: '18px', whiteSpace: 'nowrap' }}>
                  {s.entry_low && s.entry_high 
                    ? `${s.entry_low} - ${s.entry_high}` 
                    : (s.entry_low || s.entry_high || s.entry || t('dashboard.to_define', 'À DÉFINIR'))}
                </div>
                <div className="b-lbl">{t('dashboard.entry_zone', 'ZONE D\'ENTRÉE')}</div>
              </div>
              <div className="b-stat">
                <div className="b-val" style={{ color: bin ? '#fff' : 'var(--green)' }}>—</div>
                <div className="b-lbl" style={{ color: bin ? undefined : 'rgba(0,255,65,0.6)' }}>{bin ? 'PAYOUT' : 'TAKE PROFIT'}</div>
              </div>
            </div>

            <div className="payout-bar-bg">
              <div className="payout-bar-fill" style={{ width: '100%', background: `rgba(${themeRgb}, 0.5)` }} />
            </div>

            {s.analysis_note && (
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  💬 "{s.analysis_note}"
                </p>
              </div>
            )}
          </>
        )}

        <div className="card-bottom" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: themeColor }}>
            {t('dashboard.waiting_activation', 'En attente d\'activation...')}
          </span>
          <span className="card-time">
            <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
            {fmt(s.created_at)}
          </span>
        </div>
      </div>
    );
  };

  const renderForexCard = (s: Signal, isNew: boolean) => {
    const up      = isUp(s);
    const closed  = isClosed(s);
    
    const isLockedVip = s.is_vip && !canSeeVipSignals;
    const dirClass = isLockedVip ? 'sig-vip-locked' : (up ? 'sig-buy' : 'sig-sell');
    const cornerColor = isLockedVip ? '#FFD60A' : (up ? 'var(--green)' : 'var(--red)');
    const badgeBg = isLockedVip ? '#FFD60A' : (up ? 'var(--green)' : 'var(--red)');
    const badgeFg = isLockedVip ? '#050507' : (up ? '#050507' : '#fff');
    
    const activationTime = s.watch_activated_at ? new Date(s.watch_activated_at).getTime() : new Date(s.created_at).getTime();
    const isJustActivated = (now - activationTime) < 300000;

    const calculatedRR = (() => {
      const parsedEntry = s.entry || s.entry_low || s.entry_high;
      if (!parsedEntry || !s.sl || !s.tp) return s.rr || '2.0';

      const entryVal = parseFloat(String(parsedEntry).replace(/[^0-9.]/g, ''));
      const slVal = parseFloat(String(s.sl).replace(/[^0-9.]/g, ''));
      
      // Get the first TP level
      const firstTpStr = String(s.tp).split(',')[0].trim();
      const tpVal = parseFloat(firstTpStr.replace(/[^0-9.]/g, ''));

      if (isNaN(entryVal) || isNaN(slVal) || isNaN(tpVal)) return s.rr || '2.0';

      const risk = Math.abs(entryVal - slVal);
      const reward = Math.abs(tpVal - entryVal);

      if (risk === 0) return s.rr || '2.0';

      const ratio = reward / risk;
      return ratio.toFixed(1);
    })();

    const activeClass = closed ? '' : ((s.is_vip || isJustActivated) ? 'is-vip-active' : (up ? 'is-buy-active' : 'is-sell-active'));

    return (
      <div key={s.id} className={`sig-card ${dirClass} ${activeClass}`} style={{ 
        opacity: closed ? 0.6 : 1,
      }}>
        <div className="corner c-tl" style={{ borderColor: cornerColor }} />
        <div className="corner c-tr" style={{ borderColor: cornerColor }} />
        <div className="corner c-bl" style={{ borderColor: cornerColor }} />
        <div className="corner c-br" style={{ borderColor: cornerColor }} />

        {!closed && s.signal_type === 'WATCH' ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: s.is_vip ? '#FFD60A' : '#0098EA', padding: '3px 10px', borderRadius: '0 0 8px 0', fontSize: 7, fontFamily: 'var(--mono)', fontWeight: 700, color: s.is_vip ? '#050507' : '#fff', zIndex: 5 }}>
            {t('dashboard.watch_zone', '👀 ZONE DE SURVEILLANCE')}
          </div>
        ) : !closed && s.status === 'tp1_hit' ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0, 255, 65, 0.16)', borderRight: '1px solid rgba(0, 255, 65, 0.3)', borderBottom: '1px solid rgba(0, 255, 65, 0.3)', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--green)', zIndex: 5, letterSpacing: '0.05em', boxShadow: '0 2px 10px rgba(0, 255, 65, 0.15)' }}>
            {t('dashboard.tp1_hit', '🎯 TP 1 TOUCHÉ !')} {s.rr ? `(+${s.rr} ${t('dashboard.pips', 'Pips')})` : ''}
          </div>
        ) : !closed && s.status === 'tp2_hit' ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0, 255, 65, 0.16)', borderRight: '1px solid rgba(0, 255, 65, 0.3)', borderBottom: '1px solid rgba(0, 255, 65, 0.3)', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--green)', zIndex: 5, letterSpacing: '0.05em', boxShadow: '0 2px 10px rgba(0, 255, 65, 0.15)' }}>
            {t('dashboard.tp2_hit', '🎯 TP 2 TOUCHÉ !')} {s.rr ? `(+${s.rr} ${t('dashboard.pips', 'Pips')})` : ''}
          </div>
        ) : !closed && isJustActivated ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: s.is_vip ? '#FFD60A' : 'var(--amber)', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: '#000', zIndex: 5, letterSpacing: '0.05em' }}>
            {t('dashboard.go_now', '⚡ GO NOW !')}
          </div>
        ) : !closed ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: s.is_vip ? '#FFD60A' : 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '0 0 8px 0', fontSize: 7, fontFamily: 'var(--mono)', fontWeight: 700, color: s.is_vip ? '#050507' : 'rgba(255,255,255,0.7)', zIndex: 5 }}>
            {t('dashboard.in_progress', '📈 EN COURS')}
          </div>
        ) : null}

        <div className="card-top" style={{ marginTop: !closed ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="card-pair">{s.pair || s.asset || 'ASSET'}</span>
            {isLockedVip ? (
              <span className="type-badge" style={{ background: 'rgba(255,214,10,0.1)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.3)', fontFamily: 'var(--mono)', fontSize: '8px' }}>
                🔒 VIP
              </span>
            ) : (
              <span className={`type-badge ${up ? 'tb-buy' : 'tb-sell'}`}>
                {up ? '▲ BUY' : '▼ SELL'}
              </span>
            )}
            {s.is_vip ? (
              <span className="vip-badge" style={{ background: 'rgba(255,214,10,0.1)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.3)' }}>VIP</span>
            ) : (
              <span className="vip-badge" style={{ background: 'rgba(0,255,65,0.1)', color: '#00FF41', border: '1px solid rgba(0,255,65,0.3)' }}>{t('dashboard.free', 'GRATUIT')}</span>
            )}
          </div>
          {renderResultBadge(s)}
        </div>

        {s.is_vip && !canSeeVipSignals ? (
          <>
            <div style={{ position: 'relative', marginTop: 8, height: 100, overflow: 'hidden', borderRadius: 10 }}>
              {/* Blurred Data */}
              <div style={{ filter: 'blur(12px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.85, transform: 'scale(0.85)', transformOrigin: 'center top' }}>
                <div className="entry-hero">
                  <div className="entry-price">{s.entry || (s.entry_low && s.entry_high ? `${s.entry_low} - ${s.entry_high}` : (s.entry_low || s.entry_high || t('dashboard.to_define', 'À DÉFINIR')))}</div>
                  <div className="entry-label">{t('dashboard.entry_price', 'PRIX D\'ENTRÉE')}</div>
                </div>
                <div className="card-bottom">
                  <div className="levels">
                    <div className="lvl"><span className="lvl-label" style={{ color: 'rgba(255,59,48,0.5)' }}>SL</span><span className="lvl-val lvl-sl" style={{ color: 'var(--red)' }}>{s.sl || '—'}</span></div>
                    <div className="lvl-sep" />
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
                      {(s.tp || '').split(',').map((val, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span className="lvl-label" style={{ color: 'rgba(0,255,65,0.5)' }}>TP{idx > 0 ? idx + 1 : ''}</span>
                          <span className="lvl-val lvl-tp" style={{ color: 'var(--green)' }}>{val.trim() || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Lock Overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,20,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
                  <span style={{ fontSize: '18px' }}>🔐</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                    {t('dashboard.vip_signal', 'SIGNAL VIP')}
                  </span>
                </div>
                <button onClick={() => setIsVipModalOpen(true)} style={{ fontFamily: 'var(--mono)', fontSize: '9px', padding: '6px 16px', borderRadius: '24px', background: 'rgba(255,214,10,0.16)', border: '1px solid rgba(255,214,10,0.4)', color: '#FFD60A', cursor: 'pointer', letterSpacing: '0.05em', fontWeight: 800, transition: 'all 0.2s' }}>
                  {t('dashboard.unlock', 'DÉBLOQUER')}
                </button>
              </div>
            </div>
            {/* Card Meta (Always Visible) */}
            <div className="card-meta" style={{ marginTop: 10 }}>
              {calculatedRR && <span className="rr-badge">R:R {calculatedRR}</span>}
              <span className="card-time">
                <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                {fmt(s.created_at)}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="entry-hero">
              <div className="entry-price">{s.entry || (s.entry_low && s.entry_high ? `${s.entry_low} - ${s.entry_high}` : (s.entry_low || s.entry_high || t('dashboard.to_define', 'À DÉFINIR')))}</div>
              <div className="entry-label">{t('dashboard.entry_price', 'PRIX D\'ENTRÉE')}</div>
            </div>

            <div className="card-bottom">
              <div className="levels">
                <div className="lvl">
                  <span className="lvl-label" style={{ color: 'rgba(255,59,48,0.5)' }}>SL</span>
                  <span className="lvl-val lvl-sl" style={{ color: 'var(--red)' }}>{s.sl || '—'}</span>
                </div>
                <div className="lvl-sep" />
                <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {(s.tp || '').split(',').map((val, idx) => {
                    const tpNum = idx + 1;
                    const isHit = 
                      s.status === 'tp' ||
                      (s.status === 'tp1_hit' && tpNum === 1) ||
                      (s.status === 'tp2_hit' && tpNum <= 2);
                    
                    return (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 1,
                        position: 'relative',
                        padding: isHit ? '2px 6px' : '0px',
                        background: isHit ? 'rgba(0, 255, 65, 0.08)' : 'transparent',
                        border: isHit ? '1px solid rgba(0, 255, 65, 0.3)' : 'none',
                        borderRadius: 6,
                        boxShadow: isHit ? '0 0 8px rgba(0, 255, 65, 0.12)' : 'none',
                        transition: 'all 0.3s ease'
                      }}>
                        <span className="lvl-label" style={{ color: isHit ? 'var(--green)' : 'rgba(0,255,65,0.5)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: isHit ? 800 : 500 }}>
                          {isHit && <span style={{ fontSize: 7 }}>✓</span>}
                          TP{idx > 0 ? idx + 1 : ''}
                        </span>
                        <span className="lvl-val lvl-tp" style={{ color: 'var(--green)', textDecoration: isHit ? 'line-through' : 'none', opacity: isHit ? 0.7 : 1 }}>
                          {val.trim() || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card-meta">
                {calculatedRR && <span className="rr-badge">R:R {calculatedRR}</span>}
                <span className="card-time">
                  <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                  {fmt(s.created_at)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const getExpirationSeconds = (exp?: string): number => {
    if (!exp) return 0;
    const str = exp.trim().toUpperCase();
    // Handle formats: "M5", "5M", "5 MIN", "M 5", "30S", "1H", etc.
    const numFirst = str.match(/^(\d+)\s*([MHSD])/);
    const unitFirst = str.match(/^([MHSD])\s*(\d+)/);
    const match = numFirst || unitFirst;
    if (!match) return 0;
    const num = parseInt(numFirst ? match[1] : match[2]);
    const unit = numFirst ? match[2] : match[1];
    if (unit === 'M') return num * 60;
    if (unit === 'H') return num * 3600;
    if (unit === 'S') return num;
    if (unit === 'D') return num * 86400;
    return 0;
  };

  const renderBinaryCard = (s: Signal, isNew: boolean) => {
    const up      = isUp(s);
    const closed  = isClosed(s);
    
    const binaryLabel = binaryTerminology === 'callput' 
      ? (up ? '▲ CALL' : '▼ PUT') 
      : (up ? '▲ UP' : '▼ DOWN');
    
    const isLockedVip = s.is_vip && !canSeeVipSignals;
    const dirClass = isLockedVip ? 'sig-vip-locked' : (up ? 'sig-call' : 'sig-put');
    const cornerColor = isLockedVip ? '#FFD60A' : (up ? 'var(--green)' : 'var(--red)');
    
    const payPct  = s.payout_pct || 0;
    const payColor = payPct >= 80 ? 'var(--green)' : payPct >= 70 ? 'var(--amber)' : 'var(--red)';
    const isJustActivated = s.watch_activated_at && (new Date().getTime() - new Date(s.watch_activated_at).getTime() < 300000);

    const baseSecs = getExpirationSeconds(s.expiration);
    
    // Parse the martingale metadata: e.g. "G2_G1_2026-05-17T16:30:00.000Z" or just "G2" or "G1" or "M0"
    let mType = 'M0';
    let galeStage = 0;
    let galeActivatedAt: string | null = null;
    
    if (s.martingale) {
      if (s.martingale.includes('_')) {
        const parts = s.martingale.split('_');
        const rawType = parts[0];
        mType = rawType === 'M1' ? 'G1' : rawType === 'M2' ? 'G2' : rawType;
        if (parts[1] === 'G1') galeStage = 1;
        if (parts[1] === 'G2') galeStage = 2;
        galeActivatedAt = parts[2];
      } else {
        const rawType = s.martingale;
        mType = rawType === 'M1' ? 'G1' : rawType === 'M2' ? 'G2' : rawType;
      }
    }
    
    const hasMartingale = mType && mType !== 'M0';
    const maxStages = mType === 'G1' ? 1 : mType === 'G2' ? 2 : 0;
    const isFinalStage = galeStage === maxStages;
    const martingaleMultiplier = maxStages + 1;
    const currentStage = galeStage;

    const startTimeStr = (galeStage > 0 && galeActivatedAt)
      ? galeActivatedAt
      : (s.watch_activated_at || s.created_at || s.timestamp || new Date().toISOString());
      
    const startTime = new Date(startTimeStr).getTime();
    const elapsedSecs = Math.max(0, (now - startTime) / 1000);
    const remainingInStage = Math.max(0, baseSecs - elapsedSecs);
    const isTimerFinished = baseSecs > 0 && elapsedSecs >= baseSecs;

    // Compute bar width directly from JS (no CSS animation) for perfect sync with countdown
    let timerStyle: React.CSSProperties = { width: `${payPct}%`, background: payColor, transition: 'width 1s linear' };

    if (!closed && baseSecs > 0) {
      if (!isTimerFinished) {
        const barPct = (remainingInStage / baseSecs) * 100;
        timerStyle = { width: `${barPct}%`, background: payColor, transition: 'width 1s linear' };
      } else {
        timerStyle = { width: '0%', background: payColor };
      }
    } else if (closed) {
      timerStyle = { width: '0%', background: payColor };
    }

    const activeClass = closed ? '' : ((s.is_vip || isJustActivated) ? 'is-vip-active' : (up ? 'is-buy-active' : 'is-sell-active'));

    return (
      <div key={s.id} className={`sig-card ${dirClass} ${activeClass}`} style={{ 
        opacity: closed ? 0.6 : 1,
      }}>
        <div className="corner c-tl" style={{ borderColor: cornerColor }} />
        <div className="corner c-tr" style={{ borderColor: cornerColor }} />
        <div className="corner c-bl" style={{ borderColor: cornerColor }} />
        <div className="corner c-br" style={{ borderColor: cornerColor }} />

        {!closed && isTimerFinished ? (
          <div style={{ 
            position: 'absolute', top: 0, left: 0, 
            background: isFinalStage ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.2)', 
            border: isFinalStage ? 'none' : '1px solid rgba(245,158,11,0.4)',
            padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, 
            color: isFinalStage ? 'rgba(255,255,255,0.6)' : '#F59E0B', zIndex: 5, letterSpacing: '0.05em' 
          }}>
            {isFinalStage ? '⏳ VÉRIFICATION EN COURS' : `⏳ ATTENTE GALE ${galeStage + 1}`}
          </div>
        ) : !closed && hasMartingale && currentStage === 2 ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: 'linear-gradient(90deg,#F43F5E,#C084FC)', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: '#fff', zIndex: 5, letterSpacing: '0.05em' }}>
            🚨 GALE 2 EN COURS
          </div>
        ) : !closed && hasMartingale && currentStage === 1 ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(192,132,252,0.2)', border: '1px solid rgba(192,132,252,0.4)', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: '#C084FC', zIndex: 5, letterSpacing: '0.05em' }}>
            ⚠️ GALE 1 EN COURS
          </div>
        ) : (s.is_vip || isJustActivated) && !closed ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: '#FFD60A', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: '#000', zIndex: 5, letterSpacing: '0.05em' }}>
            ⚡ GO NOW !
          </div>
        ) : !closed ? (
          <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0,255,136,0.12)', padding: '3px 12px', borderRadius: '0 0 8px 0', fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--green)', zIndex: 5, letterSpacing: '0.05em' }}>
            🔥 TRADE INITIAL
          </div>
        ) : isNew && !closed && (
          <div style={{ position: 'absolute', top: 0, left: 0, background: isLockedVip ? '#FFD60A' : '#0098EA', padding: '3px 10px', borderRadius: '0 0 8px 0', fontSize: 7, fontFamily: 'var(--mono)', fontWeight: 700, color: isLockedVip ? '#050507' : '#fff', zIndex: 5 }}>
            NOUVEAU
          </div>
        )}

        <div className="card-top" style={{ 
          marginTop: (!closed && (isTimerFinished || s.is_vip || isJustActivated || isNew)) ? 14 : 0,
          marginBottom: 10
        }}>
          {/* Top Row: Asset Pair + VIP status + Direction (Inline) & Result */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span className="card-pair" style={{ fontSize: '18px', fontWeight: 800 }}>{s.pair || s.asset || 'ASSET'}</span>
              {s.is_vip ? (
                <span className="vip-badge" style={{ background: 'rgba(255,214,10,0.1)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.3)', fontSize: '8px' }}>VIP</span>
              ) : (
                <span className="vip-badge" style={{ background: 'rgba(0,255,65,0.1)', color: '#00FF41', border: '1px solid rgba(0,255,65,0.3)', fontSize: '8px' }}>GRATUIT</span>
              )}

              {/* Extremely Sleek & Compact Direction Callout (Binary Trader Style) - INLINE */}
              {isLockedVip ? (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 4,
                  background: 'rgba(255,214,10,0.04)', 
                  border: '1px dashed rgba(255,214,10,0.3)', 
                  borderRadius: 4, 
                  padding: '2px 8px', 
                  color: '#FFD60A', 
                  fontFamily: 'var(--mono)', 
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  opacity: closed ? 0.6 : 1
                }}>
                  🔒
                </span>
              ) : (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 4,
                  background: up ? 'rgba(0,255,65,0.04)' : 'rgba(255,59,48,0.04)', 
                  border: `1px solid ${up ? 'var(--green)' : 'var(--red)'}`, 
                  borderRadius: 4, 
                  padding: '2px 10px', 
                  color: up ? 'var(--green)' : 'var(--red)', 
                  fontFamily: 'var(--mono)', 
                  fontSize: '11px', 
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  boxShadow: closed ? 'none' : (up ? '0 0 6px rgba(0,255,65,0.12)' : '0 0 6px rgba(255,59,48,0.12)'),
                  textShadow: closed ? 'none' : (up ? '0 0 3px rgba(0,255,65,0.25)' : '0 0 3px rgba(255,59,48,0.25)'),
                  textTransform: 'uppercase',
                  opacity: closed ? 0.5 : 1
                }}>
                  {binaryLabel}
                </span>
              )}
            </div>
            {renderResultBadge(s)}
          </div>
        </div>

        {s.is_vip && !canSeeVipSignals ? (
          <>
            <div style={{ position: 'relative', marginTop: 8, height: 100, overflow: 'hidden', borderRadius: 10 }}>
              <div style={{ userSelect: 'none', pointerEvents: 'none', opacity: 0.95, transform: 'scale(0.85)', transformOrigin: 'center top' }}>
                <div className="binary-hero">
                  <div className="b-stat">
                    <div className="b-val" style={{ color: 'var(--amber)', filter: 'blur(6px)' }}>{s.expiration || '—'}</div>
                    <div className="b-lbl">EXPIRATION</div>
                  </div>
                  <div className="b-stat" style={{ borderLeft: '1px solid var(--subtle)', borderRight: '1px solid var(--subtle)' }}>
                    <div className="b-val" style={{ color: 'var(--green)', filter: 'blur(6px)' }}>{payPct ? `${payPct}%` : '—'}</div>
                    <div className="b-lbl">PAYOUT</div>
                  </div>
                  {hasMartingale ? (
                    <>
                      <div className="b-stat" style={{ borderRight: '1px solid var(--subtle)' }}>
                        <div className="b-val" style={{ color: '#fff', filter: 'blur(6px)' }}>{s.entry || 'MKT'}</div>
                        <div className="b-lbl">ENTRÉE</div>
                      </div>
                      <div className="b-stat">
                        <div className="b-val" style={{ 
                          color: mType === 'G2' ? '#F43F5E' : '#C084FC',
                          textShadow: mType === 'G2' ? '0 0 10px rgba(244,63,94,0.3)' : '0 0 10px rgba(192,132,252,0.3)',
                          filter: 'blur(6px)'
                        }}>
                          {mType}
                        </div>
                        <div className="b-lbl">MARTINGALE</div>
                      </div>
                    </>
                  ) : (
                    <div className="b-stat">
                      <div className="b-val" style={{ color: '#fff', filter: 'blur(6px)' }}>{s.entry || 'MKT'}</div>
                      <div className="b-lbl">ENTRÉE</div>
                    </div>
                  )}
                </div>

                <div className="payout-bar-bg" style={{ filter: 'blur(6px)' }}>
                  <div className="payout-bar-fill" style={timerStyle} />
                </div>
              </div>
              
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,11,20,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
                  <span style={{ fontSize: '18px' }}>🔐</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                    SIGNAL VIP
                  </span>
                </div>
                <button onClick={() => setIsVipModalOpen(true)} style={{ fontFamily: 'var(--mono)', fontSize: '9px', padding: '6px 16px', borderRadius: '24px', background: 'rgba(255,214,10,0.16)', border: '1px solid rgba(255,214,10,0.4)', color: '#FFD60A', cursor: 'pointer', letterSpacing: '0.05em', fontWeight: 800, transition: 'all 0.2s' }}>
                  DÉBLOQUER
                </button>
              </div>
            </div>
            {/* Card Bottom (Always Visible) */}
            <div className="card-bottom" style={{ marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)' }}>
                {payPct ? `Gain potentiel : +${payPct}%` : ''}
              </span>
              <span className="card-time">
                <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                {fmt(s.created_at)}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="binary-hero">
              <div className="b-stat">
                <div className="b-val" style={{ color: 'var(--amber)' }}>{s.expiration || '—'}</div>
                <div className="b-lbl">EXPIRATION</div>
              </div>
              <div className="b-stat" style={{ borderLeft: '1px solid var(--subtle)', borderRight: '1px solid var(--subtle)' }}>
                <div className="b-val" style={{ color: 'var(--green)' }}>{payPct ? `${payPct}%` : '—'}</div>
                <div className="b-lbl">PAYOUT</div>
              </div>
              {hasMartingale ? (
                <>
                  <div className="b-stat" style={{ borderRight: '1px solid var(--subtle)' }}>
                    <div className="b-val" style={{ color: '#fff', fontSize: 15 }}>
                      {s.entry_low || s.entry_high || s.entry
                        ? (s.entry_low || s.entry_high || s.entry)
                        : fmt(s.watch_activated_at || s.created_at)}
                    </div>
                    <div className="b-lbl">{s.entry_low || s.entry_high || s.entry ? 'HEURE / PRIX' : 'HEURE D\'ENTRÉE'}</div>
                  </div>
                  <div className="b-stat">
                    <div className="b-val" style={{ 
                      color: mType === 'G2' ? '#F43F5E' : '#C084FC',
                      textShadow: mType === 'G2' ? '0 0 10px rgba(244,63,94,0.3)' : '0 0 10px rgba(192,132,252,0.3)'
                    }}>
                      {mType}
                    </div>
                    <div className="b-lbl">MARTINGALE</div>
                  </div>
                </>
              ) : (
                <div className="b-stat">
                  <div className="b-val" style={{ color: '#fff', fontSize: 15 }}>
                    {s.entry_low || s.entry_high || s.entry
                      ? (s.entry_low || s.entry_high || s.entry)
                      : fmt(s.watch_activated_at || s.created_at)}
                  </div>
                  <div className="b-lbl">{s.entry_low || s.entry_high || s.entry ? 'HEURE / PRIX' : 'HEURE D\'ENTRÉE'}</div>
                </div>
              )}
            </div>

            <div className="payout-bar-bg">
              <div key={`timer-${s.id}-${currentStage}`} className="payout-bar-fill" style={timerStyle} />
            </div>

            {hasMartingale && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
                {[0, 1, 2].slice(0, martingaleMultiplier).map(stage => {
                  const stageLabels = ['INITIAL', 'GALE 1', 'GALE 2'];
                  const stageColors = ['var(--green)', '#C084FC', '#F43F5E'];
                  const isActive = stage === currentStage;
                  const isPast = stage < currentStage;
                  return (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: isActive ? `${stageColors[stage]}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? stageColors[stage] : (isPast ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)')}`, opacity: isPast ? 0.4 : 1, transition: 'all 0.3s' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? stageColors[stage] : 'rgba(255,255,255,0.2)', boxShadow: isActive ? `0 0 6px ${stageColors[stage]}` : 'none' }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, fontWeight: 700, color: isActive ? stageColors[stage] : 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>{stageLabels[stage]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!closed && baseSecs > 0 && (() => {
              const mm = Math.floor(remainingInStage / 60).toString().padStart(2, '0');
              const ss = Math.floor(remainingInStage % 60).toString().padStart(2, '0');
              const stageColors = ['var(--green)', '#C084FC', '#F43F5E'];
              const timerColor = stageColors[Math.min(currentStage, 2)];
              return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: isTimerFinished ? 'rgba(255,255,255,0.2)' : timerColor, letterSpacing: '0.1em', textShadow: isTimerFinished ? 'none' : `0 0 12px ${timerColor}` }}>
                    {mm}:{ss}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {isTimerFinished ? 'temps écoulé' : 'restant'}
                  </span>
                </div>
              );
            })()}

            {/* Quick Actions Panel for Admins (appears premium and only when timer ends) */}
            {isAdmin && !closed && isTimerFinished && (
              <>
                <style>{`
                  @keyframes admin-slide-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                <div 
                  className="admin-decision-drawer"
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, rgba(20,20,25,0.9) 0%, rgba(10,10,12,0.98) 100%)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    animation: 'admin-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                    <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '0.1em' }}>
                      DÉCISION REQUISE (STAGE {galeStage + 1})
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="text" 
                        placeholder="Gain (Optionnel)"
                        value={winGains[s.id] || ''}
                        onChange={(e) => setWinGains(prev => ({ ...prev, [s.id]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          width: '90px', 
                          background: 'rgba(255,255,255,0.06)', 
                          border: '1px solid rgba(255,255,255,0.25)', 
                          borderRadius: 4, 
                          padding: '4px 6px', 
                          color: '#fff', 
                          fontSize: 9, 
                          fontFamily: 'var(--mono)',
                          outline: 'none',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }} 
                        onFocus={(e) => e.currentTarget.style.border = '1px solid rgba(0, 255, 136, 0.4)'}
                        onBlur={(e) => e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)'}
                      />
                      <span style={{ fontSize: 6, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--mono)' }}>
                        MENTOR PANEL
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, width: '100%', paddingTop: 4 }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const gainInput = winGains[s.id]?.trim();
                        const winningStage = galeStage === 0 ? 'DIRECT' : `G${galeStage}`;
                        const finalRR = gainInput ? `${winningStage} (${gainInput})` : winningStage;
                        
                        optimisticUpdate(s.id, { status: 'tp', rr: finalRR });
                        try {
                          const { error } = await supabase
                            .from('signals')
                            .update({ status: 'tp', rr: finalRR })
                            .eq('id', s.id);
                          if (error) throw error;
                        } catch (err) {
                          console.error("Error setting TP:", err);
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(0, 255, 136, 0.03)',
                        border: '1px solid rgba(0, 255, 136, 0.25)',
                        color: 'var(--green)',
                        fontFamily: 'var(--mono)',
                        fontSize: 8,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        padding: '8px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 10px rgba(0, 255, 136, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)';
                        e.currentTarget.style.border = '1px solid rgba(0, 255, 136, 0.4)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 136, 0.03)';
                        e.currentTarget.style.border = '1px solid rgba(0, 255, 136, 0.25)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 255, 136, 0.05)';
                      }}
                    >
                      🟢 WIN {galeStage > 0 ? `(G${galeStage})` : '(DIRECT)'}
                    </button>

                    {galeStage < maxStages ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const nextStage = galeStage + 1;
                          const nextMartingale = `${mType}_G${nextStage}_${new Date().toISOString()}`;
                          const nowIso = new Date().toISOString();
                          
                          optimisticUpdate(s.id, {
                            martingale: nextMartingale,
                            watch_activated_at: nowIso
                          });

                          try {
                            const { error } = await supabase
                              .from('signals')
                              .update({ 
                                martingale: nextMartingale,
                                watch_activated_at: nowIso
                              })
                              .eq('id', s.id);
                            if (error) throw error;
                          } catch (err) {
                            console.error("Error launching Gale:", err);
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(192, 132, 252, 0.03)',
                          border: '1px solid rgba(192, 132, 252, 0.25)',
                          color: '#C084FC',
                          fontFamily: 'var(--mono)',
                          fontSize: 8,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          padding: '8px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 10px rgba(192, 132, 252, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(192, 132, 252, 0.08)';
                          e.currentTarget.style.border = '1px solid rgba(192, 132, 252, 0.4)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(192, 132, 252, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(192, 132, 252, 0.03)';
                          e.currentTarget.style.border = '1px solid rgba(192, 132, 252, 0.25)';
                          e.currentTarget.style.boxShadow = '0 2px 10px rgba(192, 132, 252, 0.05)';
                        }}
                      >
                        🔮 ENTRER GALE {galeStage + 1}
                      </button>
                    ) : (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          optimisticUpdate(s.id, { status: 'sl' });
                          try {
                            const { error } = await supabase
                              .from('signals')
                              .update({ status: 'sl' })
                              .eq('id', s.id);
                            if (error) throw error;
                          } catch (err) {
                            console.error("Error setting SL:", err);
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 59, 92, 0.03)',
                          border: '1px solid rgba(255, 59, 92, 0.25)',
                          color: 'var(--red)',
                          fontFamily: 'var(--mono)',
                          fontSize: 8,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          padding: '8px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 10px rgba(255, 59, 92, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 59, 92, 0.08)';
                          e.currentTarget.style.border = '1px solid rgba(255, 59, 92, 0.4)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 59, 92, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 59, 92, 0.03)';
                          e.currentTarget.style.border = '1px solid rgba(255, 59, 92, 0.25)';
                          e.currentTarget.style.boxShadow = '0 2px 10px rgba(255, 59, 92, 0.05)';
                        }}
                      >
                        🔴 LOSS
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="card-bottom" style={{ marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)' }}>
                {payPct ? `Gain potentiel : +${payPct}%` : ''}
              </span>
              <span className="card-time">
                <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                {fmt(s.created_at)}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 96 }}>
      <div className="ticker">
        {currentTickers.map(t => (
          <div key={t.pair} className="tick-item">
            <span className="tick-pair">{t.pair}</span>
            <span className="tick-price">{t.price}</span>
            <span className={`tick-arrow ${t.up ? 'tick-up' : 'tick-down'}`}>{t.arrow}</span>
          </div>
        ))}
      </div>



      {/* ─── SKELETON LOADER EN COURS DE CHARGEMENT ─── */}
      {isOverallLoading && (
        <div style={{ padding: '0 14px', marginBottom: 10 }}>
          <div className="section-hdr" style={{ padding: '14px 0 10px' }}>
            <div className="s-line" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'none' }} />
            <span className="s-title" style={{ color: 'rgba(255,255,255,0.2)' }}>SYNCHRONISATION TERMINAL</span>
            <span className="s-count" style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5 }}>
              <span className="live-dot" style={{ background: 'rgba(255,255,255,0.2)' }} />
              CONNEXION...
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map((i) => (
              <div key={i} className="sig-card" style={{ opacity: 0.35, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                <div className="corner c-tl" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <div className="corner c-tr" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <div className="corner c-bl" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <div className="corner c-br" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                
                <div className="card-top" style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div className="shimmer" style={{ width: 60, height: 14, borderRadius: 4 }} />
                    <div className="shimmer" style={{ width: 45, height: 14, borderRadius: 4 }} />
                  </div>
                  <div className="shimmer" style={{ width: 35, height: 10, borderRadius: 4 }} />
                </div>
                
                <div className="entry-hero" style={{ padding: '12px 0' }}>
                  <div className="shimmer" style={{ width: 110, height: 22, borderRadius: 6, margin: '0 auto' }} />
                  <div className="shimmer" style={{ width: 70, height: 8, borderRadius: 4, margin: '6px auto 0' }} />
                </div>
                
                <div className="card-bottom" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="shimmer" style={{ width: 90, height: 8, borderRadius: 4 }} />
                  <div className="shimmer" style={{ width: 40, height: 8, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ZONE LIVE & ALERTES ────────────────────── */}
      {(!isOverallLoading && (liveSignals.length > 0 || watchSignals.length > 0)) && (
        <div style={{ padding: '0 14px', marginBottom: 10 }}>
          <div className="section-hdr" style={{ padding: '14px 0 10px' }}>
            <div className="s-line" />
            <span className="s-title">SIGNAUX EN TEMPS RÉEL</span>
            <span className="s-count" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="live-dot" style={{ animation: 'pulse-glow 1.5s infinite', background: 'var(--green)' }} />
              {liveSignals.length} ACTIF{liveSignals.length !== 1 ? 'S' : ''}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* 1. Watch Alerts always on top for maximum urgency */}
            {watchSignals.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 6px' }}>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,178,0,0.2)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--amber)', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(255,214,10,0.3)' }}>⏳ EN SURVEILLANCE — {watchSignals.length} ZONE{watchSignals.length > 1 ? 'S' : ''}</span>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,178,0,0.2)' }} />
                </div>
                {watchSignals.map(s => renderWatchCard(s))}
              </>
            )}

            {/* 2. Live Active Signals underneath watch alerts */}
            {liveSignals.length > 0 && (
              <>
                {watchSignals.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 6px' }}>
                    <div style={{ height: 1, flex: 1, background: 'rgba(0,255,65,0.1)' }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', color: 'rgba(0,255,65,0.4)', whiteSpace: 'nowrap' }}>⚡ EN COURS (LIVE)</span>
                    <div style={{ height: 1, flex: 1, background: 'rgba(0,255,65,0.1)' }} />
                  </div>
                )}
                {liveSignals.map(s => (
                  isBin(s)
                    ? renderBinaryCard(s, true)
                    : renderForexCard(s, true)
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── ZONE HISTORIQUE (TP/SL/ANNULÉ) ─────────── */}
      <div style={{ paddingBottom: 30 }}>
        {isOverallLoading ? null : (liveSignals.length === 0 && watchSignals.length === 0 && historicalKeys.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Activity size={32} style={{ opacity: 0.3, marginBottom: 16, color: 'var(--text-primary)' }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: 8 }}>
              Aucun signal publié pour le moment.
            </p>
            {isAdmin && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                Publiez votre premier signal dans Admin → Signaux
              </p>
            )}
          </div>
        ) : historicalKeys.length > 0 ? (
          <>
            <div className="section-hdr" style={{ padding: '16px 14px 10px' }}>
              <div className="s-line" style={{ background: 'rgba(255,255,255,0.25)', boxShadow: 'none' }} />
              <span className="s-title" style={{ color: 'rgba(255,255,255,0.3)' }}>HISTORIQUE DES SIGNAUX</span>
            </div>
            
            {historicalKeys.map(dateKey => (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 14px 8px' }}>
                  <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                    {dateKey}
                  </span>
                  <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupedHistorical[dateKey]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(signal => (
                      isBin(signal) 
                        ? renderBinaryCard(signal, false)
                        : renderForexCard(signal, false)
                    ))
                  }
                </div>
              </div>
            ))}
          </>
        ) : null}
      </div>
      {isVipModalOpen && config && (
        <VipModal
          config={config}
          triggerType="signals"
          onClose={() => setIsVipModalOpen(false)}
          onSuccess={() => setIsVipModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardTab;
