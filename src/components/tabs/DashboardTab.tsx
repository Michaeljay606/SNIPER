import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Activity, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Zap, 
  Target, 
  ChevronDown, 
  X,
  Activity as ActivityIcon
} from 'lucide-react';
import { useUserRole } from '../../hooks/useUserRole';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { supabase } from '../../lib/supabase';
import { compressAndUpload } from '../../lib/upload';
import { GlassCard, Badge, TechHeader } from '../ui/Shared';
import NeonButton from '../NeonButton';

const withTimeout = (promise: any, ms: number = 30000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délais d'attente dépassé (${ms / 1000}s). Perte de connexion avec la base de données.`));
    }, ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const MarketTicker = () => {
  const [prices, setPrices] = useState({
    XAUUSD: 2345.67,
    EURUSD: 1.0845,
    BTCUSD: 67890.12
  });

  const [prevPrices, setPrevPrices] = useState(prices);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrevPrices(prices);
      setPrices(prev => ({
        XAUUSD: prev.XAUUSD + (Math.random() - 0.5) * 0.5,
        EURUSD: prev.EURUSD + (Math.random() - 0.5) * 0.0001,
        BTCUSD: prev.BTCUSD + (Math.random() - 0.5) * 10
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [prices]);

  return (
    <div className="flex gap-0 bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
      {Object.entries(prices).map(([pair, price]) => {
        const isUp = price >= prevPrices[pair as keyof typeof prices];
        return (
          <div key={pair} className="flex-1 flex items-center justify-between px-3 py-2 border-r border-border-subtle last:border-r-0">
            <div>
              <div className="text-[9px] text-text-muted font-mono tracking-wider">{pair}</div>
              <div className={`text-xs font-bold font-mono ${isUp ? 'text-accent-emerald' : 'text-accent-red'}`}>
                {(price as number).toFixed(pair === 'EURUSD' ? 4 : 2)}
              </div>
            </div>
            <span className={`text-[10px] mt-2 ${isUp ? 'text-accent-emerald' : 'text-accent-red'}`}>
              {isUp ? '▲' : '▼'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DashboardTab = ({ onShowToast, victories, liveSignals, config, tenantProfile, isScrolled, previewRole, setShowVipModal }: { 
  onShowToast: (m: string, t?: 'success' | 'error') => void,
  victories: any[],
  liveSignals: any[],
  config: any,
  tenantProfile: any,
  isScrolled: boolean,
  previewRole?: 'admin' | 'vip' | 'free' | null,
  setShowVipModal: (show: boolean) => void
}) => {
  const { t, i18n } = useTranslation();
  const { isFree: realIsFree, isAdmin: realIsAdmin, canAccessSignals, canAccessAcademy, currentUser } = useUserRole();
  const isFree = previewRole === 'free' ? true : (previewRole === 'vip' || previewRole === 'admin' ? false : realIsFree);
  const isAdmin = previewRole === 'admin' ? true : realIsAdmin;
  const canAccessSignalsStatus = previewRole === 'vip' ? true : (previewRole === 'free' ? false : canAccessSignals);
  const isVipUser = canAccessSignalsStatus; 
  const features = usePlanFeatures(config?.plan);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);

  const displayedSignals = useMemo(() => {
    const sorted = [...liveSignals].sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
      if (a.status === 'WATCH' && b.status !== 'WATCH') return -1;
      if (a.status !== 'WATCH' && b.status === 'WATCH') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const getGroupLabel = (signal: any) => {
      if (signal.status === 'WATCH') return t('dashboard.active_alerts');
      if (signal.status === 'LIVE') return t('dashboard.live_now');
      const sigDate = new Date(signal.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (sigDate.toDateString() === today.toDateString()) return t('dashboard.today');
      if (sigDate.toDateString() === yesterday.toDateString()) return t('dashboard.yesterday');
      
      return new Intl.DateTimeFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' }).format(sigDate);
    };

    const result: any[] = [];
    let currentLabel = '';

    sorted.forEach((signal, index) => {
      const label = getGroupLabel(signal);
      if (label !== currentLabel) {
        result.push({ isHeader: true, label, id: `header-${label}` });
        currentLabel = label;
      }
      result.push({ ...signal, originalIndex: index });
    });

    return result;
  }, [liveSignals, t, i18n.language]);

  useEffect(() => {
    if (isUploading) {
      const timer = setTimeout(() => {
        setIsUploading(null);
        onShowToast(t('common.timeout'), "error");
      }, 65000);
      return () => clearTimeout(timer);
    }
  }, [isUploading, onShowToast, t]);

  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const day = now.getUTCDay();
    return day !== 0 && day !== 6;
  }, []);

  const handleResultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSignalId) return;

    try {
      setIsUploading(activeSignalId);
      const url = await compressAndUpload(file, 'results', (msg) => onShowToast(msg));
      
      const currentSignal = liveSignals.find(s => s.id === activeSignalId);
      let newImages = url;
      if (currentSignal && currentSignal.resultImage) {
        const existingImages = currentSignal.resultImage.split('||').filter(Boolean);
        existingImages.push(url);
        newImages = existingImages.join('||');
      }

      const { error } = await withTimeout(supabase
        .from('signals')
        .update({ 
          result_image: newImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSignalId), 30000);
        
      if (error) throw error;
      onShowToast(t('dashboard.result_published'));
    } catch (error: any) {
      onShowToast(`${t('onboarding.error_prefix')} ` + (error.message || t('status.failed')), "error");
    } finally {
      setIsUploading(null);
      setActiveSignalId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('dashboard.time_now');
    if (diffInSeconds < 3600) return t('dashboard.time_ago_m', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('dashboard.time_ago_h', { count: Math.floor(diffInSeconds / 3600) });
    return date.toLocaleDateString();
  };

  return (
    <div className="no-scrollbar flex flex-col">
      <div className={`fixed ${isScrolled ? 'top-16' : 'top-24'} left-0 right-0 max-w-[430px] mx-auto z-[120] flex flex-col transition-all duration-200 border-b ${isScrolled ? 'bg-nav-bg backdrop-blur-xl border-nav-border' : 'bg-bg-base border-transparent'} pb-2`}>
        <div className={`px-4 sm:px-4 transition-all duration-200 overflow-hidden ${isScrolled ? 'h-0 opacity-0' : 'pt-4 pb-2 h-auto opacity-100'}`}>
          <MarketTicker />
        </div>
        <header className={`flex items-center justify-between px-4 sm:px-4 transition-all duration-200 ${isScrolled ? 'py-1' : 'py-0'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`font-medium tracking-[0.1em] text-text-primary transition-all duration-200 ${isScrolled ? 'text-xs' : 'text-xs'}`}>{t('live.title')} <span className="font-black text-accent-emerald">LIVE</span></h2>
            {!isScrolled && <div className="w-1 h-1 bg-accent-emerald rounded-full pulse-live" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isMarketOpen ? 'neon' : 'secondary'} className="!text-[7px] py-0.5 px-1.5">
              {isMarketOpen ? t('live.market_open') : t('live.market_closed')}
            </Badge>
          </div>
        </header>
      </div>

      <div className={`space-y-3 px-4 sm:px-4 transition-all duration-200 ${isScrolled ? 'pt-20' : 'pt-[100px]'} fade-in-up`}>
        <input type="file" ref={fileInputRef} onChange={handleResultUpload} className="hidden" accept="image/*" />

        {currentUser?.status === 'pending' && (
          <div style={{
            background: 'var(--accent-gold-dim)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '12px',
            fontSize: '11px',
            color: 'var(--accent-gold)',
            letterSpacing: '0.08em',
            fontFamily: 'Space Mono, monospace',
            textAlign: 'center',
          }}>
            Accès en cours de validation · Sous 24h
          </div>
        )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <TechHeader title={t('live.real_time')} count={displayedSignals.length} />
          {liveSignals.length > 0 && features.hasAnalytics && (
            <button
              onClick={() => setShowStatsModal(!showStatsModal)}
              className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all active:scale-95 whitespace-nowrap ${
                 showStatsModal 
                   ? 'text-text-inverse bg-accent-emerald shadow-card' 
                   : 'text-accent-emerald border border-accent-emerald/20 bg-accent-emerald-dim hover:bg-accent-emerald/10'
              }`}
            >
              <BarChart3 size={10} /> {t('dashboard.stats_trader')}
            </button>
          )}
        </div>

        {showStatsModal && (() => {
          const total = liveSignals.length;
          const tpHit = liveSignals.filter(s => s.status === 'TP_HIT').length;
          const slHit = liveSignals.filter(s => s.status === 'SL_HIT').length;
          const liveNow = liveSignals.filter(s => s.status === 'LIVE').length;
          const closed = tpHit + slHit;
          const winRate = closed > 0 ? Math.round((tpHit / closed) * 100) : null;
          const mentorName = tenantProfile?.mentor_name || config?.mentorName || 'Mentor';

          return (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300 mt-2 bg-bg-elevated border border-border-subtle rounded-[16px] p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[8px] text-accent-emerald uppercase tracking-[0.3em] font-bold mb-0.5">{t('dashboard.performance')}</p>
                  <h3 className="text-sm font-black uppercase tracking-tight text-text-primary">{mentorName}</h3>
                </div>
              </div>

              {winRate !== null && (
                <div className="mb-4 p-3 bg-bg-surface border border-border-subtle rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">{t('dashboard.win_rate')}</span>
                    <span className="text-base font-black font-mono" style={{ color: winRate >= 60 ? 'var(--accent-emerald)' : 'var(--accent-gold)' }}>{winRate}%</span>
                  </div>
                  <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${winRate}%`, background: winRate >= 60 ? 'var(--accent-emerald)' : 'var(--accent-gold)' }}
                    />
                  </div>
                  <p className="text-[8px] text-text-secondary text-right">{t('dashboard.winners_losers', { winners: tpHit, losers: slHit })}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: t('dashboard.total_signals'), value: total, icon: Send, accent: false },
                  { label: t('dashboard.live_now_count'), value: liveNow, icon: Activity, accent: true },
                  { label: t('dashboard.tp_hit_count'), value: tpHit, icon: TrendingUp, accent: true },
                  { label: t('dashboard.sl_hit_count'), value: slHit, icon: TrendingDown, accent: false },
                  { label: t('dashboard.closed_count'), value: closed, icon: CheckCircle, accent: false },
                  { label: t('dashboard.live_active_count'), value: `${liveNow}/${total}`, icon: Zap, accent: true },
                ].map((s, i) => (
                  <div key={i} className="bg-bg-elevated border border-border-subtle rounded-lg p-2.5 flex flex-col gap-1">
                    <s.icon size={11} className={s.accent ? 'text-accent-neon opacity-60' : 'text-text-muted'} />
                    <p className={`text-lg font-black font-mono leading-none ${s.accent ? 'text-accent-neon' : 'text-text-primary'}`}>{s.value}</p>
                    <p className="text-[7px] text-text-secondary uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="grid gap-2">
          {displayedSignals.length === 0 ? (
            <GlassCard className="p-4 text-center border-dashed border-border-subtle">
              <Target size={40} className="mx-auto text-text-muted mb-4" />
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">{t('dashboard.no_signals')}</p>
            </GlassCard>
          ) : displayedSignals.map((item) => {
             if (item.isHeader) {
               return (
                 <div key={item.id} className="flex items-center gap-2 mt-4 mb-1">
                   <div className={`h-[1px] flex-1 ${item.label.includes('⚡') ? 'bg-accent-warning/30' : 'bg-bg-elevated'}`} />
                   <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 ${
                     item.label.includes('⚡') ? 'text-accent-warning animate-pulse' :
                     item.label === 'EN COURS (LIVE)' ? 'text-accent-neon animate-pulse' : 'text-text-secondary'
                   }`}>{item.label}</span>
                   <div className={`h-[1px] flex-1 ${item.label.includes('⚡') ? 'bg-accent-warning/30' : 'bg-bg-elevated'}`} />
                 </div>
               );
            }

            const signal = item;
            const isLocked = signal.isVip && !canAccessSignalsStatus;
            
            return (
              <React.Fragment key={signal.id}>
                <div className={`relative signal-card p-[1px] rounded-2xl overflow-hidden transition-all duration-300 ${signal.isVip ? 'bg-gradient-to-r from-accent-gold/30 to-transparent' : signal.type === 'BUY' ? 'bg-gradient-to-r from-accent-emerald/30 to-transparent' : 'bg-gradient-to-r from-accent-red/30 to-transparent'}`}>
                  <GlassCard className={`relative !p-0 !bg-bg-card border-none overflow-hidden ${isLocked ? 'border-accent-gold-dim' : 'border-border-subtle'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full z-10 ${signal.isVip ? 'bg-accent-gold shadow-card' : signal.type === 'BUY' ? 'bg-accent-emerald shadow-card' : 'bg-accent-red shadow-card'}`} />
                    
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black font-mono tracking-tighter text-text-primary">
                            {signal.pair}
                          </span>
                          <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md border ${isLocked ? 'bg-bg-surface text-text-muted border-border-subtle blur-[4px] select-none' : signal.type === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                            {isLocked ? 'XXXX' : signal.type}
                          </span>
                          {signal.isVip ? (
                             <span className="text-[8px] font-bold text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded border border-border-subtle font-mono tracking-wider">VIP</span>
                          ) : (
                           <span className="text-[8px] font-bold text-accent-emerald bg-accent-emerald-dim px-1.5 py-0.5 rounded border border-border-subtle font-mono tracking-wider">{t('dashboard.free_label')}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {signal.status === 'WATCH' ? (
                            <div className={`px-2 py-1 rounded-lg border ${signal.isVip ? 'bg-accent-gold/10 border-accent-gold/30' : 'bg-accent-emerald/10 border-accent-emerald/30'}`}>
                              <span className="text-[9px] font-black uppercase tracking-widest animate-pulse text-accent-emerald">{t('dashboard.trade_imminent')}</span>
                            </div>
                          ) : signal.status === 'LIVE' ? (
                            <div className="flex items-center gap-1.5 text-accent-emerald font-mono text-[9px] font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald pulse-live" />
                              {t('dashboard.live_status')}
                            </div>
                          ) : (
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${signal.status === 'TP_HIT' ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20' : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}>
                              {signal.status === 'TP_HIT' ? `✅ TP HIT +${signal.pipsGain}` : `❌ SL HIT -${signal.pipsGain || 0}`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <div style={{ filter: isLocked ? 'blur(10px)' : 'none' }}>
                          <div className="text-base font-black font-mono text-text-primary tracking-tighter leading-none">
                            {isLocked ? '0.00000' : signal.entry}
                          </div>
                          <div className="text-[9px] font-bold text-text-muted tracking-[0.2em] mt-1 font-mono uppercase">{signal.status === 'WATCH' ? t('dashboard.watch_zone') : t('dashboard.entry_price')}</div>
                        </div>

                        <div className="relative card-bottom transition-all duration-300 pt-3 border-t border-border-subtle flex items-end justify-between">
                          <div className="flex items-center gap-2" style={{ filter: isLocked ? 'blur(8px)' : 'none' }}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-text-muted font-mono tracking-widest">SL</span>
                              <span className="text-xs font-bold text-accent-danger font-mono">{signal.sl}</span>
                            </div>
                            <div className="w-[1px] h-6 bg-bg-surface" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-text-muted font-mono tracking-widest">TP1</span>
                              <span className="text-xs font-bold text-accent-neon font-mono">{signal.tp1}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="px-2 py-0.5 rounded-md bg-bg-surface border border-border-subtle text-[9px] font-bold text-text-muted font-mono">
                               R:R 1:{signal.rr || '2.0'}
                            </div>
                            <div className="text-[9px] text-text-muted font-mono uppercase tracking-wider">
                              {getRelativeTime(signal.updatedAt || signal.timestamp)}
                            </div>
                          </div>
                        </div>

                        {isLocked && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg">
                            <span className="text-accent-gold font-black text-[11px]">{t('live.vip_signal')}</span>
                            <button onClick={() => setShowVipModal(true)} className="bg-accent-gold/10 border border-accent-gold/30 text-accent-gold px-3 py-1 rounded-full text-[9px] font-bold">
                              {t('live.unlock')}
                            </button>
                          </div>
                        )}
                      </div>

                      {signal.resultImage && !isLocked && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {signal.resultImage.split('||').filter(Boolean).map((imgUrl: string, idx: number) => (
                            <button 
                              key={idx} 
                              className="rounded-xl overflow-hidden border border-border-subtle aspect-square w-full"
                              onClick={() => setSelectedImage(imgUrl)}
                            >
                              <img src={imgUrl} alt="Result" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>
                
                {index === 2 && !isVipUser && (
                  <div className="neon-border glass-card p-3 space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-accent-emerald/10 to-transparent pointer-events-none" />
                    <p className="text-xs font-bold leading-relaxed">Pas encore de compte ? Ouvre ton compte {config?.broker1Name}/{config?.broker2Name} en 5 min.</p>
                    <button 
                      onClick={() => window.open(config?.broker1Url || '#', '_blank')}
                      className="w-full py-3 bg-accent-emerald text-bg-base font-bold rounded-lg text-xs pulse-live"
                    >
                      OUVRIR UN COMPTE →
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 mt-8">
        <TechHeader title="Dernières Victoires" subtitle="History Feed" />
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {(() => {
            const recentCaptures = victories
              .flatMap(vic => 
                (vic.resultImage ? vic.resultImage.split('||').filter(Boolean) : [])
                .map(url => ({ id: `${vic.id}-${url}`, url, pair: vic.pair, pipsGain: vic.pipsGain }))
              )
              .slice(0, 3);
              
            if (recentCaptures.length > 0) {
              return recentCaptures.map((capture) => (
                <div key={capture.id} className="shrink-0 w-48 aspect-video rounded-xl overflow-hidden border border-border-subtle relative group bg-bg-elevated">
                  <img src={capture.url} alt="Victory" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-base/80 via-bg-base/20 to-transparent flex flex-col justify-end p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-accent-emerald">{capture.pair}</span>
                      <Badge variant="neon" className="text-[8px] py-0 px-1 border-border-subtle">+{capture.pipsGain || 0} PIPS</Badge>
                    </div>
                  </div>
                </div>
              ));
            }
            
            return (
              <div className="shrink-0 w-full h-24 flex flex-col items-center justify-center border border-dashed border-border-subtle rounded-xl bg-bg-surface">
                <ActivityIcon size={24} className="text-text-muted mb-2" />
                <p className="text-[9px] text-text-secondary uppercase tracking-widest">Aucune capture disponible</p>
              </div>
            );
          })()}
        </div>
      </section>

      {!isVipUser && currentUser?.status !== 'pending' && (
        <div 
          onClick={() => setShowVipModal(true)}
          className="neon-border glass-card p-4 bg-accent-emerald-dim flex items-center justify-between cursor-pointer group mt-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-emerald/20 flex items-center justify-center text-accent-emerald">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">Passer au VIP</p>
              <p className="text-[10px] text-text-secondary">Débloquez tous les signaux & formations</p>
            </div>
          </div>
          <ChevronDown size={18} className="-rotate-90 text-accent-emerald group-hover:translate-x-1 transition-transform" />
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[500] bg-modal-bg backdrop-blur-3xl p-4 overflow-y-auto flex flex-col pt-10 pb-20 items-center justify-start">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <div className="w-full flex justify-end mb-4">
              <button 
                onClick={() => setSelectedImage(null)} 
                className="z-[600] p-3 bg-bg-elevated backdrop-blur-xl border border-border-subtle rounded-full text-text-primary hover:bg-bg-surface transition-all shadow-elevated cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>
            <img 
              src={selectedImage} 
              alt="Capture plein écran" 
              className="max-w-full w-auto max-h-[85vh] object-contain rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DashboardTab;
