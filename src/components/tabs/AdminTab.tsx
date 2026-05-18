import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Activity, GraduationCap, Users, Settings, BarChart2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useClientConfig } from '../../hooks/useClientConfig';
import SignalManager from './Admin/SignalManager';
import MemberManager from './Admin/MemberManager';
import AcademyManager from './Admin/AcademyManager';
import ProfileSettings from './Admin/ProfileSettings';

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

function AdminStatsContent() {
  const { tenant_id } = useParams();
  const { config } = useClientConfig();
  const queryClient = useQueryClient();
  const tradingMode = (config?.tradingMode as 'forex' | 'binary' | 'both') ?? 'forex';

  const { data: stats, isLoading } = useQuery({
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

  if (isLoading) return <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
    </div>
  </div>;

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {card('Winrate', `${stats.winrate}%`, 'var(--accent-neon)')}
        {card('Signals clôturés', stats.totalSignals)}
        {card('Performance', `${stats.totalPips >= 0 ? '+' : ''}${Math.round(stats.totalPips)}`, stats.totalPips >= 0 ? 'var(--accent-neon)' : '#FF3B30')}
        {card('Membres', stats.members)}
      </div>
      <div className="rounded-2xl p-4 border border-white/5 bg-white/3">
        <div className="flex justify-between mb-2">
          <p className="text-[9px] font-black uppercase text-white/40">Efficacité</p>
          <span className="text-[11px] font-black text-[var(--accent-neon)]">{stats.winrate}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent-neon)]" style={{ width: `${stats.winrate}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function AdminTab() {
  const { tenant_id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  
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
    supabase.from('signals').select('*').eq('tenant_id', tenant_id)
      .then(({ data }) => { if (data) setLiveSignals([...data].reverse()); });
  }, [tenant_id]);

  const navItems = [
    { id: 'signals', label: 'Signaux', icon: Activity },
    { id: 'academy', label: 'Academy', icon: GraduationCap },
    { id: 'members', label: 'Membres', icon: Users },
    { id: 'stats', label: 'Stats', icon: BarChart2 },
    { id: 'settings', label: 'Réglages', icon: Settings },
  ];

  const handleTabClick = (id: string) => {
    navigate(`/app/${tenant_id}/admin/${id}`);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: 'var(--bg)' }}>
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
          />
        )}
        {activeTab === 'academy' && <AcademyManager onShowToast={showToast} />}
        {activeTab === 'members' && <MemberManager onShowToast={showToast} />}
        {activeTab === 'stats' && <AdminStatsContent />}
        {activeTab === 'settings' && <ProfileSettings onShowToast={showToast} />}
      </div>
    </div>
  );
}

