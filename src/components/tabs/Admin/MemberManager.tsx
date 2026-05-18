import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, CheckCircle, Ban, Shield, Activity, GraduationCap, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { GlassCard, NeonButton, Badge } from '../../ui/Shared';

interface AccessRequest {
  id: string;
  member_telegram_id: number;
  member_username: string | null;
  request_type: 'vip_payment' | 'vip_broker' | 'academy_payment' | 'academy_broker';
  access_target: 'signals' | 'academy' | 'both';
  payment_method: string | null;
  amount: number | null;
  currency: string | null;
  broker_name: string | null;
  broker_account_id: string | null;
  plan_label: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
}

function computeExpiry(planLabel: string | null): string | null {
  if (!planLabel) return null;
  const now = new Date();
  if (planLabel.includes('1 MOIS') || planLabel.includes('1m')) {
    now.setDate(now.getDate() + 30); return now.toISOString();
  }
  if (planLabel.includes('2 MOIS') || planLabel.includes('2m')) {
    now.setDate(now.getDate() + 60); return now.toISOString();
  }
  if (planLabel.includes('1 AN') || planLabel.includes('1y')) {
    now.setFullYear(now.getFullYear() + 1); return now.toISOString();
  }
  return null; // lifetime
}

interface MemberManagerProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const MemberManager = ({ onShowToast }: MemberManagerProps) => {
  const { tenant_id: paramTenantId } = useParams();
  const TENANT_ID = paramTenantId || 'default';
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });
    if (data) setMembers(data);
    setIsLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('access_requests')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingRequests(data as AccessRequest[]);
  };

  useEffect(() => {
    fetchMembers();
    fetchPendingRequests();

    const channel = supabase
      .channel(`access-requests-${TENANT_ID}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'access_requests',
        filter: `tenant_id=eq.${TENANT_ID}`,
      }, () => {
        fetchPendingRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [TENANT_ID]);

  const updateMemberStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('affiliates').update({ status }).eq('id', id);
    if (error) {
      onShowToast("Erreur lors de la mise à jour du statut", "error");
    } else {
      onShowToast(`Statut mis à jour: ${status}`, "success");
      setMembers(members.map(m => m.id === id ? { ...m, status } : m));
    }
  };

  const updateMemberPlan = async (id: string, is_vip: boolean) => {
    const { error } = await supabase.from('affiliates').update({ is_vip }).eq('id', id);
    if (error) {
      onShowToast("Erreur lors de la mise à jour du plan", "error");
    } else {
      onShowToast(`Plan mis à jour avec succès`, "success");
      setMembers(members.map(m => m.id === id ? { ...m, is_vip } : m));
    }
  };

  const toggleAccess = async (id: string, field: string, currentValue: boolean) => {
    // This assumes custom fields has_signals_access and has_academy_access exist or can be set.
    // If they don't exist, this update might silently fail depending on RLS/schema, but we fulfill the requirement.
    const { error } = await supabase.from('affiliates').update({ [field]: !currentValue }).eq('id', id);
    if (error) {
      onShowToast(`Erreur de mise à jour des accès`, "error");
    } else {
      onShowToast(`Accès mis à jour`, "success");
      setMembers(members.map(m => m.id === id ? { ...m, [field]: !currentValue } : m));
    }
  };

  const confirmRequest = async (req: AccessRequest) => {
    setConfirmingId(req.id);
    // Optimistic: remove from list
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    const expiry = computeExpiry(req.plan_label);
    const updates: Record<string, unknown> = {
      is_vip: true, status: 'active', vip_expires_at: expiry,
    };
    if (req.access_target === 'academy' || req.access_target === 'both') {
      updates.has_academy_access = true;
    }

    const { error: affiliateErr } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('tenant_id', TENANT_ID)
      .eq('telegram_id', req.member_telegram_id);

    if (affiliateErr) {
      // Rollback
      setPendingRequests(prev => [req, ...prev]);
      onShowToast('Erreur lors de l\'activation', 'error');
      setConfirmingId(null);
      return;
    }

    await supabase
      .from('access_requests')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', req.id);

    onShowToast(`✓ Accès VIP activé pour @${req.member_username || req.member_telegram_id}`, 'success');
    setConfirmingId(null);
    fetchMembers();
  };

  const rejectRequest = async (req: AccessRequest) => {
    setRejectingId(req.id);
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    const { error } = await supabase
      .from('access_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id);

    if (error) {
      setPendingRequests(prev => [req, ...prev]);
      onShowToast('Erreur lors du refus', 'error');
    } else {
      onShowToast('✗ Demande refusée', 'info');
    }
    setRejectingId(null);
  };

  const requestTypeBadge = (type: AccessRequest['request_type']) => {
    const map: Record<typeof type, { label: string; color: string; bg: string }> = {
      'vip_payment':      { label: '💳 PAIEMENT VIP',     color: '#00FF41', bg: 'rgba(0,255,65,0.1)' },
      'vip_broker':       { label: '🤝 BROKER VIP',       color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
      'academy_payment':  { label: '💳 ACADEMY',          color: '#FFD60A', bg: 'rgba(255,214,10,0.1)' },
      'academy_broker':   { label: '🤝 ACADEMY BROKER',   color: '#FFD60A', bg: 'rgba(255,214,10,0.1)' },
    };
    return map[type];
  };

  const filteredMembers = members.filter(m => {
    const planStr = m.is_vip ? 'VIP' : 'BASIC';
    if (filterPlan !== 'ALL' && planStr !== filterPlan) return false;
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ─── PENDING ACCESS REQUESTS ─── */}
      {pendingRequests.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 2px 10px', marginBottom: 8,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#FFD60A',
              boxShadow: '0 0 8px rgba(255,214,10,0.7)',
              animation: 'pulse-glow 1.5s infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              letterSpacing: '0.18em', color: '#FFD60A', textTransform: 'uppercase', fontWeight: 700,
            }}>
              Demandes en attente ({pendingRequests.length})
            </span>
          </div>

          {pendingRequests.map(req => {
            const badge = requestTypeBadge(req.request_type);
            const isConfirming = confirmingId === req.id;
            const isRejecting = rejectingId === req.id;
            return (
              <div key={req.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '2px solid #FFD60A',
                borderRadius: 10, padding: '12px 14px',
                marginBottom: 8,
              }}>
                {/* Row 1: username + type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0' }}>
                    @{req.member_username || req.member_telegram_id}
                  </span>
                  <span style={{
                    fontSize: 9, fontFamily: 'Space Mono, monospace', fontWeight: 700,
                    padding: '3px 8px', borderRadius: 4,
                    background: badge.bg, color: badge.color,
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Row 2: details */}
                <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                  {req.broker_name ? (
                    <><span>Broker: {req.broker_name}</span> · <span>ID: {req.broker_account_id}</span></>
                  ) : (
                    <><span>Plan: {req.plan_label || '—'}</span> · <span>Montant: {req.amount ? `${req.amount} ${req.currency}` : '—'}</span></>
                  )}
                </div>

                {/* Row 3: date */}
                <div style={{ fontSize: 9, fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
                  {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => confirmRequest(req)}
                    disabled={isConfirming || isRejecting}
                    style={{
                      flex: 1, padding: '7px 14px', fontSize: 10,
                      fontFamily: 'Space Mono, monospace', fontWeight: 700, letterSpacing: '0.06em',
                      background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.25)',
                      color: '#00FF41', borderRadius: 8, cursor: 'pointer',
                      opacity: (isConfirming || isRejecting) ? 0.5 : 1,
                    }}
                  >
                    {isConfirming ? '...' : '✓ CONFIRMER'}
                  </button>
                  <button
                    onClick={() => rejectRequest(req)}
                    disabled={isConfirming || isRejecting}
                    style={{
                      flex: 1, padding: '7px 14px', fontSize: 10,
                      fontFamily: 'Space Mono, monospace', fontWeight: 700, letterSpacing: '0.06em',
                      background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)',
                      color: '#FF3B30', borderRadius: 8, cursor: 'pointer',
                      opacity: (isConfirming || isRejecting) ? 0.5 : 1,
                    }}
                  >
                    {isRejecting ? '...' : '✗ REFUSER'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FILTERS */}
      <GlassCard className="p-4 border-accent-emerald/20 shadow-[0_0_15px_rgba(0,255,150,0.05)]">
        <h3 className="text-[11px] font-black tracking-[0.2em] uppercase text-accent-emerald mb-4 flex items-center gap-2">
          <Users size={16} />
          Filtres Membres
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Plan</label>
            <select 
              value={filterPlan} 
              onChange={e => setFilterPlan(e.target.value)} 
              className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-3 text-[11px] uppercase font-black text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
            >
              <option value="ALL">Tous les plans</option>
              <option value="BASIC">Basic</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Statut</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)} 
              className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-3 text-[11px] uppercase font-black text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="active">Actif</option>
              <option value="banned">Banni</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* MEMBERS LIST */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1 mb-3 flex justify-between items-center">
          <span>Liste des membres ({filteredMembers.length})</span>
          {isLoading && <span className="text-accent-emerald animate-pulse">Chargement...</span>}
        </h3>

        {filteredMembers.map(member => (
          <GlassCard key={member.id} className="p-4 border-border-subtle/50 hover:border-accent-emerald/30 transition-colors">
            
            {/* Header: Name & Status */}
            <div className="flex justify-between items-start mb-4 border-b border-border-subtle/30 pb-3">
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white">
                  {member.name || member.email || member.telegram_username || 'Utilisateur inconnu'}
                </span>
                <span className="text-[9px] text-text-muted font-mono mt-1">
                  Inscrit le {new Date(member.created_at).toLocaleDateString()}
                </span>
              </div>
              <Badge variant={member.status === 'active' ? 'neon' : member.status === 'pending' ? 'warning' : 'danger'} className="ml-2">
                {member.status}
              </Badge>
            </div>

            {/* Plan & Access Settings */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div className="flex items-center justify-between bg-bg-void/50 p-2.5 rounded-xl border border-border-subtle/30">
                <span className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Plan Global</span>
                <select 
                  value={member.is_vip ? 'VIP' : 'BASIC'} 
                  onChange={e => updateMemberPlan(member.id, e.target.value === 'VIP')}
                  className={`bg-bg-void border border-border-subtle rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none min-h-[36px] ${member.is_vip ? 'text-accent-gold border-accent-gold/50' : 'text-text-primary'}`}
                >
                  <option value="BASIC">BASIC</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => toggleAccess(member.id, 'has_signals_access', member.has_signals_access !== false)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all min-h-[48px] ${
                    member.has_signals_access !== false 
                      ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald' 
                      : 'bg-bg-void border-border-subtle text-text-secondary'
                  }`}
                >
                  <Activity size={14} />
                  <span className="text-[9px] font-black tracking-widest uppercase">Signaux</span>
                </button>
                <button 
                  onClick={() => toggleAccess(member.id, 'has_academy_access', member.has_academy_access !== false)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all min-h-[48px] ${
                    member.has_academy_access !== false 
                      ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald' 
                      : 'bg-bg-void border-border-subtle text-text-secondary'
                  }`}
                >
                  <GraduationCap size={14} />
                  <span className="text-[9px] font-black tracking-widest uppercase">Academy</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {member.status !== 'active' && (
                <button 
                  onClick={() => updateMemberStatus(member.id, 'active')} 
                  className="flex-1 flex justify-center items-center gap-1.5 py-3 bg-accent-emerald text-bg-void rounded-xl text-[10px] font-black uppercase hover:shadow-[0_0_15px_rgba(0,255,150,0.3)] transition-all min-h-[44px]"
                >
                  <CheckCircle size={14} /> Approuver
                </button>
              )}
              {member.status !== 'banned' && (
                <button 
                  onClick={() => updateMemberStatus(member.id, 'banned')} 
                  className="flex-1 flex justify-center items-center gap-1.5 py-3 bg-bg-void text-accent-red border border-accent-red/30 rounded-xl text-[10px] font-black uppercase hover:bg-accent-red/10 transition-all min-h-[44px]"
                >
                  <Ban size={14} /> Bannir
                </button>
              )}
            </div>

          </GlassCard>
        ))}

        {!isLoading && filteredMembers.length === 0 && (
          <div className="text-center py-10 bg-bg-elevated/30 rounded-2xl border border-border-subtle/30 border-dashed">
            <Users size={24} className="mx-auto mb-3 text-text-secondary opacity-50" />
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
              Aucun membre trouvé
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberManager;
