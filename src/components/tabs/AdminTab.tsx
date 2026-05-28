import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Activity, GraduationCap, Users, Settings, BarChart2, ShieldCheck, ShieldAlert, Share2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useClientConfig } from '../../hooks/useClientConfig';
import { usePlanFeatures, type PlanFeatures } from '../../hooks/usePlanFeatures';
import { PausedGate } from '../ui/PlanGate';
import SignalManager from './Admin/SignalManager';
import MemberManager from './Admin/MemberManager';
import AcademyManager from './Admin/AcademyManager';
import ProfileSettings from './Admin/ProfileSettings';
import ReferralTab from './Admin/ReferralTab';
import PlanComparisonSheet from '../PlanComparisonSheet';
import FakeStatCard from '../FakeStatCard';
import LockedFeature from '../LockedFeature';
import { useTranslation } from 'react-i18next';

type ToastType = 'success' | 'error' | 'warning';
interface Toast { msg: string; type: ToastType }

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  function showToast(msg: string, type: ToastType) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }
  return { toast, showToast };
}

function FakeAdvancedChart() {
  const { t } = useTranslation();
  const bars = [72, 58, 81, 65, 90, 74, 88];
  return (
    <div className="rounded-2xl p-4 border border-white/5 bg-white/3 space-y-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{t('stats_admin.performance_by_period')}</p>
      <div className="flex items-end gap-2 h-24">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, background: 'linear-gradient(180deg, #00FF41 0%, rgba(0,255,65,0.2) 100%)' }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-[8px] text-white/30 uppercase">{t('stats_admin.conv_vip')}</p><p className="font-mono text-sm text-[var(--accent-neon)]">34%</p></div>
        <div><p className="text-[8px] text-white/30 uppercase">{t('stats_admin.retention')}</p><p className="font-mono text-sm text-[var(--accent-neon)]">89%</p></div>
        <div><p className="text-[8px] text-white/30 uppercase">{t('stats_admin.growth')}</p><p className="font-mono text-sm text-[var(--accent-neon)]">+24%</p></div>
      </div>
    </div>
  );
}

function AdminStatsContent({ planFeatures, onUpgrade }: { planFeatures: PlanFeatures; onUpgrade: () => void }) {
  const { t } = useTranslation();
  const { tenant_id } = useParams();
  const { config } = useClientConfig();
  const tradingMode = (config?.tradingMode as 'forex' | 'binary' | 'both') ?? 'forex';

  const { data: stats, isLoading } = useQuery({
    enabled: planFeatures.hasBasicAnalytics,
    queryKey: ['admin-stats', tenant_id, tradingMode],
    queryFn: async () => {
      const modeFilter = tradingMode === 'both' ? null : (tradingMode === 'forex' ? 'MARKETS' : 'BINARY');
      let sigQuery = supabase.from('signals').select('status, rr').eq('tenant_id', tenant_id!);
      if (modeFilter) sigQuery = sigQuery.eq('trading_mode', modeFilter);

      const [{ data: sigs }, { data: mems }] = await Promise.all([
        sigQuery,
        supabase.from('affiliates').select('id').eq('tenant_id', tenant_id!).eq('status', 'active'),
      ]);
      const closed = (sigs || []).filter(s => s && ['tp', 'sl'].includes(s.status));
      const tpHit = closed.filter(s => s.status === 'tp').length;
      const slHit = closed.filter(s => s.status === 'sl').length;
      const totalPips = closed.reduce((acc, c) => {
        const v = parseFloat(c.rr || '0');
        if (isNaN(v)) return acc;
        return c.status === 'tp' ? acc + Math.abs(v) : acc - Math.abs(v);
      }, 0);
      const winrate = closed.length > 0 ? Math.round((tpHit / closed.length) * 100) : 0;
      return { winrate, totalSignals: closed.length, tpHit, slHit, totalPips, members: (mems || []).length };
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const card = (label: string, value: string | number, color?: string) => (
    <div className="rounded-2xl p-4 border border-white/5 bg-white/3">
      <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-white/40">{label}</p>
      <p className="text-2xl font-black font-mono" style={{ color: color || 'white' }}>{value}</p>
    </div>
  );

  const exportCsv = () => {
    if (!stats) return;
    const rows = [
      ['metric', 'value'],
      ['winrate', `${stats.winrate}%`],
      ['signals_closed', stats.totalSignals],
      ['tp_hit', stats.tpHit],
      ['sl_hit', stats.slHit],
      ['performance', Math.round(stats.totalPips)],
      ['members', stats.members],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sniper-stats-${tenant_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Basic analytics — always visible */}
      {!planFeatures.hasBasicAnalytics ? (
        <LockedFeature
          currentPlan={planFeatures.plan}
          requiredPlan="basic"
          featureName="Analytics"
          description={t('stats_admin.basic_locked_desc')}
          mode="blur"
          onUpgrade={onUpgrade}
        >
          <div className="grid grid-cols-2 gap-3">
            <FakeStatCard label="WINRATE" value="73%" />
            <FakeStatCard label="TP HIT" value="47" />
            <FakeStatCard label="SL HIT" value="17" />
            <FakeStatCard label="PIPS" value="3240" />
          </div>
        </LockedFeature>
      ) : isLoading ? (
        <div className="animate-pulse grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {card(t('stats_admin.global_winrate'), `${stats.winrate}%`, 'var(--accent-neon)')}
            {card(t('stats_admin.closed_signals'), stats.totalSignals)}
            {card(t('stats_admin.total_pips'), `${stats.totalPips >= 0 ? '+' : ''}${Math.round(stats.totalPips)}`, stats.totalPips >= 0 ? 'var(--accent-neon)' : '#FF3B30')}
            {card(t('stats_admin.active_members'), stats.members)}
          </div>
          {planFeatures.hasWinrateByPair && (
            <div className="rounded-2xl p-4 border border-white/5 bg-white/3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3">{t('stats_admin.winrate_by_pair')}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {['XAUUSD', 'EURUSD', 'BTCUSD'].map((pair, i) => (
                  <div key={pair}>
                    <p className="text-[8px] text-white/30 font-mono">{pair}</p>
                    <p className="text-sm font-black text-[var(--accent-neon)]">{[68, 71, 64][i]}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-2xl p-4 border border-white/5 bg-white/3">
            <div className="flex justify-between mb-2">
              <p className="text-[9px] font-black uppercase text-white/40">{t('stats_admin.efficiency')}</p>
              <span className="text-[11px] font-black text-[var(--accent-neon)]">{stats.winrate}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--accent-neon)]" style={{ width: `${stats.winrate}%` }} />
            </div>
          </div>
        </>
      ) : null}

      {/* Advanced analytics — always visible */}
      <LockedFeature
        currentPlan={planFeatures.plan}
        requiredPlan="premium"
        featureName={t('stats_admin.advanced_analytics')}
        description={t('stats_admin.advanced_locked_desc')}
        mode="blur"
        onUpgrade={onUpgrade}
      >
        {planFeatures.hasAdvancedAnalytics && stats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {card(t('stats_admin.tp_hit'), stats.tpHit, 'var(--accent-neon)')}
              {card(t('stats_admin.sl_hit'), stats.slHit, '#FF3B30')}
            </div>
            <FakeAdvancedChart />
          </div>
        ) : (
          <FakeAdvancedChart />
        )}
      </LockedFeature>

      {/* CSV export — always visible */}
      <LockedFeature
        currentPlan={planFeatures.plan}
        requiredPlan="empire"
        featureName="Export CSV"
        description={t('stats_admin.csv_locked_desc')}
        mode="replace"
        onUpgrade={onUpgrade}
      >
        <button
          type="button"
          onClick={exportCsv}
          className="w-full py-3 rounded-xl border border-[var(--accent-neon)]/30 bg-[var(--accent-neon)]/10 text-[var(--accent-neon)] text-[10px] font-black uppercase tracking-widest"
        >
          {t('stats_admin.export_csv')}
        </button>
      </LockedFeature>
    </div>
  );
}

function PlanBar({ plan, onUpgrade, onViewPlans }: { plan: string; onUpgrade: () => void; onViewPlans: () => void }) {
  const { t } = useTranslation();
  const features = usePlanFeatures();
  const { config } = useClientConfig();
  const creditBalance = config?.credit_balance || 0;
  const colors: Record<string, string> = {
    free: '#9CA3AF',
    basic: '#3B82F6',
    premium: '#8B5CF6',
    empire: '#FFD60A',
    pause: '#FF3B30',
  };
  const color = colors[plan] ?? colors.free;
  const limits = features.signalsUnlimited
    ? t('admin.plan_signals_unlimited')
    : t('admin.plan_signals_daily', { count: features.maxSignalsPerDay });
  const members = features.membersUnlimited ? t('admin.plan_members_unlimited') : t('admin.plan_members_limit', { count: features.maxMembers });
  const lessons = features.academyUnlimited ? t('admin.plan_academy_unlimited') : t('admin.plan_lessons_limit', { count: features.maxLessons });

  return (
    <div style={{
      margin: '12px 14px 0',
      padding: '12px 14px',
      borderRadius: 14,
      background: `linear-gradient(135deg, ${color}12 0%, rgba(8,11,20,0.9) 100%)`,
      border: `1px solid ${color}40`,
      boxShadow: `0 4px 24px ${color}15`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
        <div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, color, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block' }}>
            {features.planLabel}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{features.planPrice}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onViewPlans}
          style={{
            padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
          }}
        >
          {t('admin.view_plans')}
        </button>
        {plan !== 'empire' && plan !== 'pause' && (
          <button
            type="button"
            onClick={onUpgrade}
            style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${color}44`,
              background: `${color}12`, color, fontFamily: 'var(--mono)',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            {t('admin.upgrade_cta')}
          </button>
        )}
      </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[limits, members, lessons].map(chip => (
          <span key={chip} style={{
            fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
            padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.06em',
          }}>
            {chip}
          </span>
        ))}
      </div>
      {creditBalance > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#00FF41', letterSpacing: '0.08em' }}>
            {t('admin.credit_available', { amount: (creditBalance / 100).toFixed(2) })}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminTab() {
  const { t } = useTranslation();
  const { tenant_id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const { config, loading: configLoading } = useClientConfig();
  const planFeatures = usePlanFeatures();
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const openUpgrade = () => setShowPlanSheet(true);

  // Determine active tab from URL path
  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split('/');
    const last = pathParts[pathParts.length - 1];
    if (!last || last === 'admin' || last === tenant_id) return 'signals';
    return last;
  }, [location.pathname, tenant_id]);

  const [liveSignals, setLiveSignals] = useState<any[]>([]);

  useEffect(() => {
    if (!tenant_id) return;
    setLiveSignals([]); // Clear old signals

    // Fetch active signals and recent signals in parallel for maximum speed
    Promise.all([
      supabase.from('signals')
        .select('*')
        .eq('tenant_id', tenant_id)
        .in('status', ['active', 'tp1_hit', 'tp2_hit']),
      supabase.from('signals')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('timestamp', { ascending: false })
        .limit(50)
    ]).then(([activeRes, recentRes]) => {
      const activeData = activeRes.data || [];
      const recentData = recentRes.data || [];

      const combined = [...activeData, ...recentData];
      const uniqueMap = new Map();
      combined.forEach(s => {
        if (s && s.id) uniqueMap.set(s.id, s);
      });
      const uniqueList = Array.from(uniqueMap.values());

      // Sort: chronological descending by default
      uniqueList.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.created_at || 0).getTime();
        const bTime = new Date(b.timestamp || b.created_at || 0).getTime();
        return bTime - aTime;
      });

      setLiveSignals(uniqueList);
    }).catch(err => {
      console.error('Error syncing signals in AdminTab:', err);
    });
  }, [tenant_id]);

  const navItems = useMemo(() => {
    return [
      { id: 'signals', label: t('admin.signals'), icon: Activity },
      { id: 'academy', label: t('admin.academy'), icon: GraduationCap },
      { id: 'members', label: t('admin.members_tab'), icon: Users },
      { id: 'stats', label: t('admin.stats'), icon: BarChart2 },
      { id: 'settings', label: t('admin.settings_tab'), icon: Settings },
      { id: 'referral', label: t('referral_admin.title'), icon: Share2 },
    ];
  }, [t]);

  const handleTabClick = (id: string) => {
    navigate(`/app/${tenant_id}/admin/${id}`);
  };

  if (configLoading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {t('common.loading')}
        </span>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: 'var(--bg)' }}>

      {/* ── PAUSE GUARD ─────────────────────────────── */}
      {planFeatures.isAdminLocked && (
        <PausedGate />
      )}

      {!planFeatures.isAdminLocked && (
        <>
      <PlanBar plan={planFeatures.plan} onUpgrade={openUpgrade} onViewPlans={openUpgrade} />
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
          toast.type === 'success' ? 'bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41]' : 
          toast.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
          'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
        }`}>
          {toast.type === 'success' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span className="text-[11px] font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="admin-tabbar" style={{ display: 'flex', overflowX: 'auto', padding: '0 14px 12px', gap: 4, borderBottom: '1px solid var(--subtle)', position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,11,20,0.92)', backdropFilter: 'blur(16px)' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => handleTabClick(item.id)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
              padding: '8px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              cursor: 'pointer',
              background: activeTab === item.id ? 'rgba(0,255,65,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeTab === item.id ? 'rgba(0,255,65,0.25)' : 'rgba(255,255,255,0.08)'}`,
              color: activeTab === item.id ? 'var(--green)' : 'rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}>
            <item.icon size={13} /> {item.label}
          </button>
        ))}
      </div>

      <div className="p-4">
          {activeTab === 'signals' && (
            <SignalManager
              liveSignals={liveSignals}
              setLiveSignals={setLiveSignals}
              onShowToast={showToast}
              planFeatures={planFeatures}
              onUpgrade={openUpgrade}
            />
          )}
          {activeTab === 'academy' && (
            <AcademyManager onShowToast={showToast} planFeatures={planFeatures} onUpgrade={openUpgrade} />
          )}
          {activeTab === 'members' && (
            <MemberManager onShowToast={showToast} planFeatures={planFeatures} onUpgrade={openUpgrade} />
          )}
          {activeTab === 'stats' && (
            <AdminStatsContent planFeatures={planFeatures} onUpgrade={openUpgrade} />
          )}
          {activeTab === 'settings' && (
            <ProfileSettings onShowToast={showToast} planFeatures={planFeatures} onUpgrade={openUpgrade} />
          )}
          {activeTab === 'referral' && (
            <ReferralTab onShowToast={showToast} />
          )}
        </div>

        {showPlanSheet && (
          <PlanComparisonSheet
            currentPlan={planFeatures.plan}
            onClose={() => setShowPlanSheet(false)}
          />
        )}
        </>
      )}
    </div>
  );
}
