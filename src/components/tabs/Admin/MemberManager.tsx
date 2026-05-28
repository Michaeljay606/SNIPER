import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, CheckCircle, Ban, Shield, Activity, GraduationCap, Clock, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { GlassCard, NeonButton, Badge } from '../../ui/Shared';
import { QuotaBanner } from '../../ui/PlanGate';
import type { PlanFeatures } from '../../../hooks/usePlanFeatures';
import LockedFeature from '../../LockedFeature';
import { useTranslation } from 'react-i18next';

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
  planFeatures: PlanFeatures;
  onUpgrade: () => void;
}

const MemberManager = ({ onShowToast, planFeatures, onUpgrade }: MemberManagerProps) => {
  const { t } = useTranslation();
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
    const { error } = await supabase.from('affiliates').update({ status }).eq('id', id).eq('tenant_id', TENANT_ID);
    if (error) {
      onShowToast(t('members_admin.status_update_error'), "error");
    } else {
      onShowToast(t('members_admin.status_updated', { status }), "success");
      setMembers(members.map(m => m.id === id ? { ...m, status } : m));
    }
  };

  const updateMemberPlan = async (id: string, is_vip: boolean) => {
    const updates = {
      is_vip,
      has_signals_access: is_vip,
      has_academy_access: is_vip
    };
    const { error } = await supabase.from('affiliates').update(updates).eq('id', id).eq('tenant_id', TENANT_ID);
    if (error) {
      onShowToast(t('members_admin.plan_update_error'), "error");
    } else {
      onShowToast(t('members_admin.plan_updated'), "success");
      setMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
    }
  };

  const toggleAccess = async (id: string, field: string, currentValue: boolean) => {
    // This assumes custom fields has_signals_access and has_academy_access exist or can be set.
    // If they don't exist, this update might silently fail depending on RLS/schema, but we fulfill the requirement.
    const { error } = await supabase.from('affiliates').update({ [field]: !currentValue }).eq('id', id).eq('tenant_id', TENANT_ID);
    if (error) {
      onShowToast(t('members_admin.access_update_error'), "error");
    } else {
      onShowToast(t('members_admin.access_updated'), "success");
      setMembers(members.map(m => m.id === id ? { ...m, [field]: !currentValue } : m));
    }
  };

  const confirmRequest = async (req: AccessRequest) => {
    if (!planFeatures.canAcceptNewMembers) {
      onShowToast(t('members_admin.pause_no_new_member'), 'warning');
      return;
    }
    if (!planFeatures.membersUnlimited && activeMembers >= planFeatures.maxMembers) {
      onShowToast(t('members_admin.member_limit_reached_desc', { count: planFeatures.maxMembers }), 'warning');
      return;
    }
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
    if (req.access_target === 'signals' || req.access_target === 'both') {
      updates.has_signals_access = true;
    }

    const { error: affiliateErr } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('tenant_id', TENANT_ID)
      .eq('telegram_id', req.member_telegram_id);

    if (affiliateErr) {
      // Rollback
      setPendingRequests(prev => [req, ...prev]);
      onShowToast(t('members_admin.activation_error'), 'error');
      setConfirmingId(null);
      return;
    }

    await supabase
      .from('access_requests')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', req.id)
      .eq('tenant_id', TENANT_ID);

    onShowToast(t('members_admin.vip_activated_for', { user: req.member_username || req.member_telegram_id }), 'success');
    setConfirmingId(null);
    fetchMembers();
  };

  const rejectRequest = async (req: AccessRequest) => {
    setRejectingId(req.id);
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    const { error } = await supabase
      .from('access_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id)
      .eq('tenant_id', TENANT_ID);

    if (error) {
      setPendingRequests(prev => [req, ...prev]);
      onShowToast(t('members_admin.rejection_error'), 'error');
    } else {
      onShowToast(t('members_admin.request_rejected'), 'info');
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

  const activeMembers = members.filter(m => m.status === 'active').length;

  const isMemberLimitReached = useMemo(() => {
    if (!planFeatures.canAcceptNewMembers) return true;
    if (planFeatures.membersUnlimited) return false;
    return activeMembers >= planFeatures.maxMembers;
  }, [activeMembers, planFeatures]);

  const memberRequiredPlan = useMemo(() => {
    if (planFeatures.plan === 'free') return 'basic';
    if (planFeatures.plan === 'basic') return 'premium';
    return 'empire';
  }, [planFeatures.plan]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ─── MEMBER QUOTA BANNER ─── */}
      {!planFeatures.membersUnlimited && (
        <QuotaBanner
          used={activeMembers}
          max={planFeatures.maxMembers}
          label={t('members_admin.active_members')}
          upgradeHint={t('members_admin.member_limit_reached_upgrade', { count: planFeatures.maxMembers })}
        />
      )}

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
              {t('members_admin.pending_title', { count: pendingRequests.length })}
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
                    <><span>Plan: {req.plan_label || '—'}</span> · <span>{t('members_admin.amount')}: {req.amount ? `${req.amount} ${req.currency}` : '—'}</span></>
                  )}
                </div>

                {/* Row 3: date */}
                <div style={{ fontSize: 9, fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
                  {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  flexDirection: isMemberLimitReached ? 'column' : 'row',
                  gap: 8,
                  alignItems: 'stretch',
                  width: '100%'
                }}>
                  {isMemberLimitReached ? (
                    <LockedFeature
                      currentPlan={planFeatures.plan}
                      requiredPlan={memberRequiredPlan}
                      featureName={t('locked_feature.more_members')}
                      description={t('locked_feature.members_desc')}
                      mode="replace"
                      onUpgrade={onUpgrade}
                    />
                  ) : (
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
                      {isConfirming ? '...' : `✓ ${t('common.confirm')}`}
                    </button>
                  )}
                  <button
                    onClick={() => rejectRequest(req)}
                    disabled={isConfirming || isRejecting}
                      style={{
                      flex: 1, width: '100%', padding: '7px 14px', fontSize: 10,
                      fontFamily: 'Space Mono, monospace', fontWeight: 700, letterSpacing: '0.06em',
                      background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)',
                      color: '#FF3B30', borderRadius: 8, cursor: 'pointer',
                      opacity: (isConfirming || isRejecting) ? 0.5 : 1,
                    }}
                  >
                    {isRejecting ? '...' : `✗ ${t('members_admin.refuse')}`}
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
          {t('members_admin.filters')}
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">{t('members_admin.plan')}</label>
            <select 
              value={filterPlan} 
              onChange={e => setFilterPlan(e.target.value)} 
              className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-3 text-[11px] uppercase font-black text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
            >
              <option value="ALL">{t('members_admin.all_plans')}</option>
              <option value="BASIC">Basic</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">{t('members_admin.status')}</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)} 
              className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-3 text-[11px] uppercase font-black text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
            >
              <option value="ALL">{t('members_admin.all_statuses')}</option>
              <option value="pending">{t('common.pending')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="banned">{t('common.banned')}</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* MEMBERS LIST */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1 mb-3 flex justify-between items-center">
          <span>{t('members_admin.members_list')} ({filteredMembers.length})</span>
          {isLoading && <span className="text-accent-emerald animate-pulse">{t('common.loading')}</span>}
        </h3>

        {filteredMembers.length > 0 ? (
          <GlassCard className="border-border-subtle/40 overflow-hidden divide-y divide-border-subtle/15">
            {filteredMembers.map(member => {
              const memberName = member.name || member.email || member.telegram_username || t('members_admin.user_fallback');
              const initial = memberName.charAt(0).toUpperCase();
              const isBanned = member.status === 'banned';
              const isPending = member.status === 'pending';
              const isVip = member.is_vip;

              return (
                <div 
                  key={member.id} 
                  className={`flex items-center justify-between p-2.5 transition-colors ${
                    isBanned ? 'bg-accent-red/5 opacity-60' : 'hover:bg-white/[0.01]'
                  }`}
                >
                  {/* Left: Avatar + Identity */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 border uppercase ${
                      isBanned 
                        ? 'bg-accent-red/10 border-accent-red/20 text-accent-red' 
                        : isVip 
                          ? 'bg-accent-gold/10 border-accent-gold/20 text-accent-gold' 
                          : 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald'
                    }`}>
                      {initial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-bold text-xs tracking-tight text-white truncate ${isBanned ? 'line-through text-text-muted' : ''}`}>
                          {memberName}
                        </span>
                        {isBanned && (
                          <span className="text-[7px] font-black tracking-widest uppercase px-1 py-0.5 rounded bg-accent-red/20 text-accent-red border border-accent-red/30 flex-shrink-0">
                            BAN
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[7px] font-black tracking-widest uppercase px-1 py-0.5 rounded bg-accent-orange/20 text-accent-orange border border-accent-orange/30 flex-shrink-0 animate-pulse">
                            {t('common.pending')}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] text-text-muted font-mono mt-0.5">
                        {t('members_admin.registered_on', { date: new Date(member.created_at).toLocaleDateString() })}
                      </span>
                    </div>
                  </div>

                  {/* Right: Plan select + Toggles + Action button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Plan dropdown (compact style) */}
                    <select 
                      value={member.is_vip ? 'VIP' : 'BASIC'} 
                      onChange={e => updateMemberPlan(member.id, e.target.value === 'VIP')}
                      className={`bg-bg-void border border-border-subtle/50 rounded-lg px-1.5 py-1 text-[9px] font-black uppercase outline-none min-h-[28px] ${
                        member.is_vip ? 'text-accent-gold border-accent-gold/50' : 'text-text-secondary'
                      }`}
                    >
                      <option value="BASIC">BASIC</option>
                      <option value="VIP">VIP</option>
                    </select>

                    {/* Toggles */}
                    <div className="flex gap-1">
                      {/* Signaux Toggle */}
                      <button 
                        onClick={() => toggleAccess(member.id, 'has_signals_access', member.has_signals_access === true)}
                        title={t('members_admin.signals_access')}
                        className={`p-1.5 rounded-lg border transition-all ${
                          member.has_signals_access === true 
                            ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald' 
                            : 'bg-bg-void border-border-subtle/30 text-text-muted opacity-40 hover:opacity-70'
                        }`}
                      >
                        <Activity size={12} />
                      </button>

                      {/* Academy Toggle */}
                      <button 
                        onClick={() => toggleAccess(member.id, 'has_academy_access', member.has_academy_access === true)}
                        title={t('members_admin.academy_access')}
                        className={`p-1.5 rounded-lg border transition-all ${
                          member.has_academy_access === true 
                            ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald' 
                            : 'bg-bg-void border-border-subtle/30 text-text-muted opacity-40 hover:opacity-70'
                        }`}
                      >
                        <GraduationCap size={12} />
                      </button>
                    </div>

                    {/* Actions: Bannir ou Approuver */}
                    <div className="w-7 flex justify-center">
                      {isPending ? (
                        <button 
                          onClick={() => updateMemberStatus(member.id, 'active')} 
                          title={t('members_admin.approve')}
                          className="p-1.5 bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30 rounded-lg hover:bg-accent-emerald/30 transition-all"
                        >
                          <CheckCircle size={12} />
                        </button>
                      ) : !isBanned ? (
                        <button 
                          onClick={() => updateMemberStatus(member.id, 'banned')} 
                          title={t('members_admin.ban')}
                          className="p-1.5 bg-accent-red/10 text-accent-red border border-accent-red/20 rounded-lg hover:bg-accent-red/20 transition-all"
                        >
                          <Ban size={12} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateMemberStatus(member.id, 'active')} 
                          title={t('members_admin.reactivate')}
                          className="p-1.5 bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 rounded-lg hover:bg-accent-emerald/20 transition-all"
                        >
                          <CheckCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </GlassCard>
        ) : (
          <div className="text-center py-10 bg-bg-elevated/30 rounded-2xl border border-border-subtle/30 border-dashed">
            <Users size={24} className="mx-auto mb-3 text-text-secondary opacity-50" />
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
              {t('members_admin.no_members')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberManager;
