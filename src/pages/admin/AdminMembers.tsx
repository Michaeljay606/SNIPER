import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Ban, Shield, Edit, Activity, GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    async function fetchMembers() {
      const { data } = await supabase.from('affiliates').select(`
        *,
        user_subscriptions (
          signals_active,
          academy_active
        )
      `).eq('tenant_id', TENANT_ID).order('created_at', { ascending: false });
      if (data) setMembers(data);
    }
    fetchMembers();
  }, []);

  const updateMemberStatus = async (id: string, status: string) => {
    await supabase.from('affiliates').update({ status }).eq('id', id).eq('tenant_id', TENANT_ID);
    setMembers(members.map(m => m.id === id ? { ...m, status } : m));
  };

  const updateMemberPlan = async (id: string, is_vip: boolean) => {
    await supabase.from('affiliates').update({ is_vip }).eq('id', id).eq('tenant_id', TENANT_ID);
    setMembers(members.map(m => m.id === id ? { ...m, is_vip } : m));
  };

  const filteredMembers = members.filter(m => {
    const planStr = m.is_vip ? 'premium' : 'free';
    if (filterPlan !== 'ALL' && planStr !== filterPlan) return false;
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--accent-emerald)] flex items-center gap-2">
          <Users size={18} /> Member Manager
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Plan</label>
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs outline-none uppercase font-bold">
              <option value="ALL">Tous les plans</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Statut</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs outline-none uppercase font-bold">
              <option value="ALL">Tous les statuts</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-3 px-[16px] pb-8">
          {filteredMembers.map(member => (
            <div key={member.id} className="bg-[var(--bg-input)] p-[14px] rounded-[12px] border border-[var(--border-subtle)] w-[calc(100%-32px)] mx-auto">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 truncate pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{member.username || member.first_name || 'Anonymous'}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex-shrink-0 ${
                      member.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      member.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1 truncate">
                    ID: {member.telegram_id || 'N/A'} | Inscrit le {new Date(member.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <select 
                    value={member.is_vip ? 'premium' : 'free'} 
                    onChange={e => updateMemberPlan(member.id, e.target.value === 'premium')}
                    className={`bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[9px] font-bold uppercase tracking-widest outline-none min-h-[44px] ${
                      member.is_vip ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Subscriptions info */}
              <div className="flex gap-2 mb-3">
                <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                  member.user_subscriptions?.[0]?.signals_active ? 'border-[var(--accent-emerald)] text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}>
                  <Activity size={10} /> Signaux
                </span>
                <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                  member.user_subscriptions?.[0]?.academy_active ? 'border-[var(--accent-emerald)] text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}>
                  <GraduationCap size={10} /> Academy
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
                {member.status !== 'active' && (
                  <button onClick={() => updateMemberStatus(member.id, 'active')} className="flex-1 flex justify-center items-center gap-1 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-bold uppercase hover:bg-green-500/20 min-h-[44px]">
                    <CheckCircle size={12} /> Approuver
                  </button>
                )}
                {member.status !== 'banned' && (
                  <button onClick={() => updateMemberStatus(member.id, 'banned')} className="flex-1 flex justify-center items-center gap-1 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500/20 min-h-[44px]">
                    <Ban size={12} /> Bannir
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="text-center py-[40px] text-[var(--text-muted)] flex flex-col items-center justify-center h-[200px]">
              <Users size={40} className="mb-4 opacity-50" />
              <p className="text-[13px] font-bold uppercase tracking-widest">Aucun membre trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
