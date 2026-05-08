import React, { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { grantAccess } from '../lib/accessControl'
import { OPERATOR_ID } from '../config'
import { PLAN_CONFIG, PLAN_PRICES } from '../hooks/usePlanFeatures'
import { PlanBadge } from './PlanBadge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tenant {
  tenant_id: string
  mentor_name: string
  plan: 'free' | 'basic' | 'premium' | 'empire' | 'pause'
  licence_status: 'active' | 'suspended'
  created_at: string | null
  theme_color: string | null
  telegram_id: number | null
}

interface PaymentTransaction {
  id: string
  tenant_id: string
  flow: 'subscription' | 'vip_access' | 'academy_access'
  amount_usdt: number
  status: 'pending' | 'confirming' | 'confirmed' | 'failed'
  created_at: string
  tx_hash?: string
  plan?: string
  payer_telegram_id?: number
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function UtcClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = pad(time.getUTCHours())
  const m = pad(time.getUTCMinutes())
  const s = pad(time.getUTCSeconds())
  return (
    <span style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)', fontFamily: 'Space Mono, monospace' }}>
      SYS · {h}:{m}:{s} UTC
    </span>
  )
}

interface NeonToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

export function NeonToggle({ checked, onChange }: NeonToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: checked ? '1px solid #00FF41' : '1px solid rgba(255,255,255,0.15)',
        background: checked ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.08)',
        boxShadow: checked ? '0 0 10px rgba(0,255,65,0.25)' : 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
      aria-checked={checked}
      role="switch"
    >
      <div style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: checked ? '#00FF41' : 'rgba(255,255,255,0.4)',
        transition: 'all 0.2s',
      }} />
    </button>
  )
}

// ─── Styles (reusable) ────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(0,255,65,0.1)',
  borderRadius: '14px',
  padding: '16px',
  marginBottom: '10px',
}

const mutedText: React.CSSProperties = {
  fontSize: '9px',
  color: 'rgba(255,255,255,0.3)',
  fontFamily: 'Space Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}

const pillStyle: React.CSSProperties = {
  background: 'rgba(0,255,65,0.05)',
  border: '1px solid rgba(0,255,65,0.12)',
  borderRadius: '20px',
  padding: '3px 10px',
  fontSize: '9px',
  color: '#00FF41',
  fontFamily: 'Space Mono, monospace',
}

// ─── Tenant card ─────────────────────────────────────────────────────────────

interface TenantCardProps {
  key?: React.Key
  tenant: Tenant
  onToggleLicence: (tenantId: string, newStatus: string) => Promise<void>
  onPlanChange: (tenantId: string, newPlan: string) => Promise<void>
  onShowToast: (msg: string) => void
}

function TenantCard({ tenant, onToggleLicence, onPlanChange, onShowToast }: TenantCardProps) {
  const [confirmSuspend, setConfirmSuspend] = useState(false)



  const handleToggleLicence = (newChecked: boolean) => {
    if (!newChecked) {
      setConfirmSuspend(true)
      return
    }
    onToggleLicence(tenant.tenant_id, 'active')
  }

  const handleConfirmSuspend = () => {
    onToggleLicence(tenant.tenant_id, 'suspended')
    setConfirmSuspend(false)
  }

  const handlePlanChange = (newPlan: 'free' | 'basic' | 'premium' | 'empire' | 'pause') => {
    if (newPlan === tenant.plan) return
    onPlanChange(tenant.tenant_id, newPlan)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  }

  const isActive = tenant.licence_status === 'active'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '14px',
      marginBottom: '8px',
    }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'white', fontFamily: 'Space Mono, monospace' }}>
          {tenant.mentor_name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlanBadge plan={tenant.plan} />
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: isActive ? '#00FF41' : '#FF4141',
            boxShadow: isActive ? '0 0 6px rgba(0,255,65,0.6)' : '0 0 6px rgba(255,65,65,0.6)',
          }} />
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
        <span style={{ ...mutedText, fontSize: '10px' }}>{tenant.tenant_id}</span>
        <span style={{ ...mutedText, fontSize: '10px' }}>Créé: {formatDate(tenant.created_at)}</span>
      </div>
      <div style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        fontStyle: 'italic',
        marginTop: '2px',
        marginBottom: '12px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {PLAN_CONFIG[tenant.plan]?.identity}
      </div>

      {/* Suspension confirmation */}
      {confirmSuspend && (
        <div style={{
          background: 'rgba(255,65,65,0.05)', border: '1px solid rgba(255,65,65,0.2)',
          borderRadius: '8px', padding: '10px', marginBottom: '10px',
          fontSize: '11px', fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.7)',
        }}>
          Suspendre {tenant.mentor_name} ?
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => setConfirmSuspend(false)}
              style={{ flex: 1, height: '28px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontFamily: 'Space Mono, monospace', cursor: 'pointer', letterSpacing: '0.08em' }}
            >ANNULER</button>
            <button
              onClick={handleConfirmSuspend}
              style={{ flex: 1, height: '28px', background: 'rgba(255,65,65,0.15)', border: '1px solid rgba(255,65,65,0.3)', borderRadius: '6px', color: '#FF4141', fontSize: '9px', fontFamily: 'Space Mono, monospace', cursor: 'pointer', letterSpacing: '0.08em' }}
            >CONFIRMER</button>
          </div>
        </div>
      )}

      {/* Row 3 — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
        {/* Licence toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={mutedText}>LICENCE</span>
          <NeonToggle checked={isActive} onChange={handleToggleLicence} />
          <span style={{ ...mutedText, color: isActive ? '#00FF41' : '#FF4141' }}>
            {isActive ? 'ACTIVE' : 'SUSPENDU'}
          </span>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {(['free', 'basic', 'premium', 'empire', 'pause'] as const).map(p => (
            <button
              key={p}
              onClick={() => handlePlanChange(p)}
              style={{
                height: '28px', padding: '0 8px', borderRadius: '6px',
                fontSize: '8px', letterSpacing: '0.05em',
                fontFamily: 'Space Mono, monospace', cursor: 'pointer',
                border: tenant.plan === p ? '1px solid rgba(0,255,65,0.3)' : '1px solid rgba(255,255,255,0.08)',
                background: tenant.plan === p ? 'rgba(0,255,65,0.12)' : 'transparent',
                color: tenant.plan === p ? '#00FF41' : 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase' as const,
                transition: 'all 0.15s',
              }}
            >{p}</button>
          ))}
        </div>

        {/* Open app */}
        <button
          onClick={() => window.open(`?tenant=${tenant.tenant_id}`, '_blank')}
          style={{
            height: '28px', padding: '0 10px', borderRadius: '6px',
            fontSize: '9px', fontFamily: 'Space Mono, monospace', cursor: 'pointer',
            border: '1px solid rgba(0,255,65,0.15)', background: 'transparent',
            color: 'rgba(0,255,65,0.6)', letterSpacing: '0.08em',
          }}
        >VOIR L'APP →</button>
      </div>
    </div>
  )
}

// ─── Add Tenant Form ──────────────────────────────────────────────────────────

interface AddTenantFormProps {
  onRefresh: () => void
  onShowToast: (msg: string) => void
}

function AddTenantForm({ onRefresh, onShowToast }: AddTenantFormProps) {
  const [mentorName, setMentorName] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [plan, setPlan] = useState<'basic' | 'premium' | 'empire'>('basic')
  const [saving, setSaving] = useState(false)

  const handleTenantIdChange = (v: string) => {
    setTenantId(v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentorName.trim() || !tenantId.trim()) return
    setSaving(true)
    const { error } = await supabase.from('tenants').insert([{
      tenant_id: tenantId,
      mentor_name: mentorName,
      plan: 'free',
      licence_status: 'active',
      theme_color: '#00FF41',
      created_at: new Date().toISOString(),
      onboarding_complete: false,
    }])
    setSaving(false)
    if (!error) {
      onShowToast(`✓ Tenant créé — ${mentorName}`)
      setMentorName(''); setTenantId(''); setPlan('basic')
      onRefresh()
    } else {
      onShowToast('Erreur: ' + error.message)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '44px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
    padding: '0 12px', fontSize: '12px', color: 'white',
    fontFamily: 'Space Mono, monospace', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { ...mutedText, display: 'block', marginBottom: '5px' }

  return (
    <div style={glassCard}>
      <p style={{ ...mutedText, marginBottom: '14px', fontSize: '11px', color: 'rgba(0,255,65,0.7)' }}>
        + NOUVEAU MENTOR
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Nom du mentor</label>
          <input id="mcp-mentor-name" style={inputStyle} value={mentorName} onChange={e => setMentorName(e.target.value)} placeholder="Ex: CryptoKing" required />
        </div>
        <div>
          <label style={labelStyle}>Tenant ID</label>
          <input id="mcp-tenant-id" style={inputStyle} value={tenantId} onChange={e => handleTenantIdChange(e.target.value)} placeholder="ex: cryptoking" required />
          {tenantId && (
            <p style={{ ...mutedText, marginTop: '4px', color: 'rgba(0,255,65,0.4)' }}>
              App URL: ?tenant={tenantId}
            </p>
          )}
        </div>
        <div>
          <label style={labelStyle}>Plan (Modifiable plus tard)</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
                type="button"
                disabled
                style={{
                  flex: 1, height: '36px', borderRadius: '8px', fontSize: '9px',
                  fontFamily: 'Space Mono, monospace',
                  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                  border: '1px solid rgba(0,255,65,0.3)',
                  background: 'rgba(0,255,65,0.12)',
                  color: '#00FF41',
                }}
              >FREE</button>
          </div>
        </div>
        <button
          id="mcp-create-tenant"
          type="submit"
          disabled={saving}
          style={{
            height: '48px', borderRadius: '12px', width: '100%',
            background: saving ? 'rgba(0,255,65,0.4)' : '#00FF41',
            color: '#050507', fontWeight: 800, fontSize: '13px',
            fontFamily: 'Space Mono, monospace', border: 'none', cursor: 'pointer',
            letterSpacing: '0.08em', transition: 'opacity 0.2s',
          }}
        >{saving ? '...' : 'CRÉER LE TENANT →'}</button>
      </form>
    </div>
  )
}

// ─── MasterControlPanel ───────────────────────────────────────────────────────

export default function MasterControlPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [toast, setToast] = useState<string | null>(null)

  // Last 4 digits of OPERATOR_ID
  const operatorSuffix = String(OPERATOR_ID).slice(-4)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchTenants = useCallback(async () => {
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (error) {
      setDbStatus('error')
    } else {
      setTenants((data as Tenant[]) || [])
      setDbStatus('ok')
    }

    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      
    if (!paymentsError && paymentsData) {
      setPayments(paymentsData)
    }
  }, [])

  useEffect(() => {
    const checkDb = async () => {
      try {
        const { error } = await supabase.from('tenants').select('tenant_id').limit(1)
        setDbStatus(error ? 'error' : 'ok')
      } catch {
        setDbStatus('error')
      }
    }
    checkDb()
    fetchTenants()
  }, [fetchTenants])

  async function handlePlanChange(tenantId: string, newPlan: string) {
    setTenants(prev => prev.map(t =>
      t.tenant_id === tenantId ? { ...t, plan: newPlan as any } : t
    ))

    const { error } = await supabase
      .from('tenants')
      .update({ plan: newPlan, tenant_id: tenantId })
      .eq('tenant_id', tenantId)

    if (error) {
      setTenants(prev => prev.map(t =>
        t.tenant_id === tenantId
          ? { ...t, plan: t.plan } 
          : t
      ))
      showToast('Erreur — plan non modifié')
    } else {
      showToast(`Plan ${newPlan} activé`)
    }
  }

  async function handleLicenceToggle(tenantId: string, newStatus: string) {
    setTenants(prev => prev.map(t =>
      t.tenant_id === tenantId
        ? { ...t, licence_status: newStatus as any }
        : t
    ))

    const { error } = await supabase
      .from('tenants')
      .update({ licence_status: newStatus, tenant_id: tenantId })
      .eq('tenant_id', tenantId)

    if (error) {
      setTenants(prev => prev.map(t =>
        t.tenant_id === tenantId
          ? { ...t, licence_status: t.licence_status } 
          : t
      ))
      showToast('Erreur — statut non modifié')
      return
    }

    showToast(
      newStatus === 'suspended'
        ? 'Licence suspendue'
        : 'Licence réactivée'
    )
  }

  async function handleManualOverride(payment: PaymentTransaction) {
    const txHash = prompt("Veuillez coller le TX Hash pour forcer la confirmation:");
    if (!txHash) return;

    try {
      const { error } = await supabase
        .from('payment_transactions')
        .update({ status: 'confirmed', tx_hash: txHash, confirmed_at: new Date().toISOString() })
        .eq('id', payment.id)

      if (error) throw error;

      if (payment.flow === 'subscription' && payment.plan) {
        await supabase.from('tenants').update({ plan: payment.plan, licence_status: 'active' }).eq('tenant_id', payment.tenant_id);
      } else if (payment.flow === 'vip_access' && payment.payer_telegram_id) {
        // Fetch tenant config to know duration models
        const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', payment.tenant_id).single();
        const { data: affiliate } = await supabase.from('affiliates').select('id').eq('tenant_id', payment.tenant_id).eq('telegram_id', payment.payer_telegram_id).single();
        
        if (tenant && affiliate) {
          await grantAccess(payment.tenant_id, affiliate.id, 'signals', tenant);
        } else {
          // Fallback if not found
          await supabase.from('affiliates').update({ is_vip: true }).eq('tenant_id', payment.tenant_id).eq('telegram_id', payment.payer_telegram_id);
        }
      } else if (payment.flow === 'academy_access' && payment.payer_telegram_id) {
         // Fetch tenant config
         const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', payment.tenant_id).single();
         const { data: affiliate } = await supabase.from('affiliates').select('id').eq('tenant_id', payment.tenant_id).eq('telegram_id', payment.payer_telegram_id).single();
         
         if (tenant && affiliate) {
           await grantAccess(payment.tenant_id, affiliate.id, 'academy', tenant);
         }
      }
      
      showToast('Paiement forcé avec succès');
      fetchTenants();
    } catch (err: any) {
      showToast('Erreur: ' + err.message);
    }
  }

  // ── MRR Computation ──
  const activeTenants = tenants.filter(t => t.licence_status === 'active')
  const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.plan] || 0), 0)
  const freeCount = activeTenants.filter(t => t.plan === 'free').length
  const basicCount = activeTenants.filter(t => t.plan === 'basic').length
  const premiumCount = activeTenants.filter(t => t.plan === 'premium').length
  const empireCount = activeTenants.filter(t => t.plan === 'empire').length
  const pauseCount = activeTenants.filter(t => t.plan === 'pause').length

  const totalRevenue = payments
    .filter(p => p.status === 'confirmed' && p.flow === 'subscription')
    .reduce((sum, p) => sum + Number(p.amount_usdt), 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFC107'; // amber
      case 'confirming': return '#2196F3'; // blue
      case 'confirmed': return '#00FF41'; // green
      case 'failed': return '#FF4141'; // red
      default: return '#FFFFFF';
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050507',
      fontFamily: 'Space Mono, monospace',
      color: 'white',
    }}>
      {/* Import Space Mono */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');`}</style>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', paddingBottom: '40px' }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)',
            borderRadius: '10px', padding: '10px 20px', zIndex: 9999,
            fontSize: '11px', color: '#00FF41', fontFamily: 'Space Mono, monospace',
            whiteSpace: 'nowrap',
          }}>{toast}</div>
        )}

        {/* ── Header ── */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', color: '#00FF41', letterSpacing: '0.2em', fontWeight: 700 }}>
              EPHATA TECH
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono, monospace' }}>
              🛡 ID: ···{operatorSuffix}
            </span>
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '4px' }}>
            MASTER CONTROL PANEL
          </div>
          <div style={{ marginTop: '4px' }}>
            <UtcClock />
          </div>
          <div style={{ height: '1px', background: 'rgba(0,255,65,0.08)', margin: '10px 0' }} />
        </div>

        {/* ── Section 1: MRR Dashboard ── */}
        <div style={glassCard}>
          <p style={mutedText}>REVENUS MENSUELS</p>
          <div style={{
            fontSize: '36px', fontWeight: 700, color: '#00FF41',
            textShadow: '0 0 20px rgba(0,255,65,0.3)', margin: '6px 0 2px',
          }}>${mrr}</div>
          <p style={{ ...mutedText, marginBottom: '10px' }}>
            {activeTenants.length} MENTOR(S) ACTIF(S)
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            <PlanBadge plan="free" />
            <PlanBadge plan="basic" />
            <PlanBadge plan="premium" />
            <PlanBadge plan="empire" />
            <PlanBadge plan="pause" />
          </div>
        </div>

        {/* ── Section 2–4: Tenant List ── */}
        <div style={glassCard}>
          <p style={{ ...mutedText, marginBottom: '12px' }}>
            TENANTS ({tenants.length})
          </p>
          {tenants.length === 0 ? (
            <p style={{ ...mutedText, textAlign: 'center', padding: '20px 0' }}>
              Aucun tenant trouvé
            </p>
          ) : (
            tenants.map(t => (
              <TenantCard 
                key={t.tenant_id} 
                tenant={t} 
                onPlanChange={handlePlanChange} 
                onToggleLicence={handleLicenceToggle} 
                onShowToast={showToast} 
              />
            ))
          )}
        </div>

        {/* ── Section 4.5: Payments Monitor ── */}
        <div style={glassCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ ...mutedText, marginBottom: 0 }}>PAIEMENTS RÉCENTS</p>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>REVENUS CONFIRMÉS (USDT)</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#00FF41' }}>${totalRevenue}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {payments.length === 0 ? (
              <p style={{ ...mutedText, textAlign: 'center', padding: '20px 0' }}>Aucun paiement trouvé</p>
            ) : (
              payments.map(p => (
                <div key={p.id} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: getStatusColor(p.status),
                        animation: p.status === 'confirming' ? 'pulse 1.5s infinite' : 'none'
                      }} />
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{p.tenant_id}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{p.flow === 'subscription' ? 'SUB' : 'VIP'}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: p.status === 'confirmed' ? '#00FF41' : 'white' }}>
                      {p.amount_usdt} USDT
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(p.created_at).toLocaleString()}
                    </span>
                    
                    {p.status === 'failed' && (
                      <button 
                        onClick={() => handleManualOverride(p)}
                        style={{
                          background: 'rgba(255,193,7,0.1)', color: '#FFC107',
                          border: '1px solid rgba(255,193,7,0.3)', borderRadius: '4px',
                          fontSize: '9px', padding: '4px 8px', cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        FORCER LA CONFIRMATION
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Section 5: Add Tenant ── */}
        <AddTenantForm onRefresh={fetchTenants} onShowToast={showToast} />

        {/* ── Section 6: System Status ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#00FF41', boxShadow: '0 0 5px rgba(0,255,65,0.6)',
              }} />
              <span style={mutedText}>SYSTEM ONLINE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: dbStatus === 'ok' ? '#00FF41' : '#FF4141',
                boxShadow: dbStatus === 'ok' ? '0 0 5px rgba(0,255,65,0.6)' : '0 0 5px rgba(255,65,65,0.6)',
              }} />
              <span style={mutedText}>
                {dbStatus === 'ok' ? 'DB CONNECTED' : dbStatus === 'error' ? 'DB ERROR' : 'DB CHECKING...'}
              </span>
            </div>
          </div>
          <span style={mutedText}>v1.0.0</span>
        </div>

      </div>
    </div>
  )
}
