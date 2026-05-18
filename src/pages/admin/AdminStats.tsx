import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';

export default function AdminStats() {
  const [stats, setStats] = useState({
    mrr: 0,
    winrate: 0,
    activeMembers: 0,
    totalMembers: 0,
    totalPips: 0
  });

  useEffect(() => {
    async function fetchStats() {
      // Members
      const { data: members } = await supabase.from('members').select('status').eq('tenant_id', TENANT_ID);
      const activeMembers = members?.filter(m => m.status === 'active').length || 0;
      const totalMembers = members?.length || 0;

      // Config (for pricing)
      const { data: config } = await supabase.from('tenants_config').select('signals_price, academy_price').eq('tenant_id', TENANT_ID).single();
      const price = config?.signals_price || 0;
      const mrr = activeMembers * price;

      // Signals
      const { data: signals } = await supabase.from('signals').select('result, result_pips').eq('tenant_id', TENANT_ID).eq('status', 'closed');
      const wins = signals?.filter(s => s.result === 'WIN').length || 0;
      const totalClosed = signals?.length || 0;
      const winrate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0;
      const totalPips = signals?.reduce((acc, curr) => acc + (Number(curr.result_pips) || 0), 0) || 0;

      setStats({ mrr, winrate, activeMembers, totalMembers, totalPips });
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="glass-card p-[14px] rounded-[12px] sm:p-6">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--accent-emerald)] flex items-center gap-2">
          <BarChart2 size={18} /> Statistiques
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2">
              <DollarSign size={14} className="text-[var(--accent-emerald)]" />
              <span className="text-[10px] font-bold tracking-widest uppercase">MRR Estimé</span>
            </div>
            <div className="text-2xl font-mono font-black text-[var(--accent-emerald)]">${stats.mrr}</div>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2">
              <Activity size={14} className="text-[var(--accent-gold)]" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Winrate</span>
            </div>
            <div className="text-2xl font-mono font-black text-[var(--text-primary)]">{stats.winrate}%</div>
            <div className="text-[10px] text-[var(--accent-gold)] font-mono mt-1">+{stats.totalPips} Pips</div>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)] col-span-2">
            <div className="flex justify-between items-end">
              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2">
                  <Users size={14} className="text-[#24A1DE]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Membres Actifs</span>
                </div>
                <div className="text-3xl font-mono font-black text-[var(--text-primary)]">{stats.activeMembers}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest uppercase block mb-1">Total Inscrits</span>
                <span className="text-lg font-mono font-bold text-[var(--text-muted)]">{stats.totalMembers}</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden mt-4">
              <div className="h-full bg-[#24A1DE] transition-all duration-1000" style={{ width: `${stats.totalMembers > 0 ? (stats.activeMembers/stats.totalMembers)*100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Placeholder for recent payments */}
        <div>
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)] mb-3">Derniers Paiements</h3>
          <div className="bg-[var(--bg-input)] p-8 rounded-xl border border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] flex flex-col items-center">
            <DollarSign size={24} className="mb-2 opacity-30" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Historique vide</span>
          </div>
        </div>
      </div>
    </div>
  );
}
