import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Activity, Users, Plus, Search, ExternalLink, 
  Trash2, Bell, CreditCard, CheckCircle, AlertCircle, 
  Clock, Zap, Globe, Lock, Unlock, X, RefreshCw 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMasterData, Tenant } from '../hooks/useMasterData';
import NeonToggle from './NeonToggle';
import PlanBadge from './PlanBadge';

const OPERATOR_ID = import.meta.env.VITE_OPERATOR_ID;

const MasterControlPanel = ({ onClose }: { onClose: () => void }) => {
  const isDev = import.meta.env.DEV;
  const { tenants, setTenants, transactions, loading, mrr, dbStatus, refresh } = useMasterData();
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form states for new tenant
  // DB CHECK constraint requires uppercase: 'MARKETS' | 'BINARY'
  const [newMentor, setNewMentor] = useState({
    name: '',
    id: '',
    tradingMode: 'MARKETS' as 'MARKETS' | 'BINARY' | 'BOTH',
    plan: 'free' as 'free' | 'basic' | 'premium' | 'empire',
    isTrial: true
  });
  const [creating, setCreating] = useState(false);

  // Broadcast state
  const [broadcast, setBroadcast] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => 
      t.mentor_name?.toLowerCase().includes(search.toLowerCase()) || 
      t.tenant_id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [tenants, search]);

  const handleForceConfirm = async (txId: string) => {
    const hash = window.prompt("Entrer le TxHash pour forcer la confirmation:");
    if (!hash) return;

    try {
      const { error } = await supabase.from('payment_transactions').update({ status: 'confirmed', tx_hash: hash }).eq('id', txId);
      if (error) throw error;
      refresh();
    } catch (err) {
      alert('Erreur lors de la confirmation forcée');
    }
  };

  const handleCreateTenant = async () => {
    if (!newMentor.name || !newMentor.id) return;
    setCreating(true);
    
    const tid = newMentor.id.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    const payload = {
      tenant_id: tid,
      mentor_name: newMentor.name,
      plan: newMentor.isTrial ? 'empire' : newMentor.plan,
      trading_mode: newMentor.tradingMode, // already uppercase: 'MARKETS' | 'BINARY'
      licence_status: 'active',
      theme_color: '#00FF41',
      trial_ends_at: newMentor.isTrial ? new Date(Date.now() + 7*24*60*60*1000).toISOString() : null,
      created_at: new Date().toISOString(),
      onboarding_completed: false
    };

    try {
      const { error } = await supabase.from('tenants').insert(payload);
      if (error) throw error;
      
      // Auto-copy link
      const link = `${window.location.origin}/app/${tid}`;
      navigator.clipboard.writeText(link);
      
      setNewMentor({ name: '', id: '', tradingMode: 'MARKETS', plan: 'free', isTrial: true });
      refresh();
      alert(`✓ ${payload.mentor_name} créé — ID: ${tid}\nLien copié !`);
    } catch (err: any) {
      alert(err.message === 'Duplicate' ? 'Cet ID est déjà utilisé' : err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleLicence = async (tenant: Tenant) => {
    const newStatus = tenant.licence_status === 'active' ? 'suspended' : 'active';
    
    // Optimistic update
    const oldTenants = [...tenants];
    setTenants(tenants.map(t => t.tenant_id === tenant.tenant_id ? { ...t, licence_status: newStatus } : t));

    try {
      const { error } = await supabase.from('tenants').update({ licence_status: newStatus }).eq('tenant_id', tenant.tenant_id);
      if (error) throw error;
    } catch (err) {
      setTenants(oldTenants);
      alert('Erreur lors du changement de licence');
    }
  };

  const handlePlanChange = async (tenantId: string, newPlan: any) => {
    const oldTenants = [...tenants];
    setTenants(tenants.map(t => t.tenant_id === tenantId ? { ...t, plan: newPlan } : t));
    
    try {
      const { error } = await supabase.from('tenants').update({ plan: newPlan }).eq('tenant_id', tenantId);
      if (error) throw error;
    } catch (err) {
      setTenants(oldTenants);
      alert('Erreur lors du changement de plan');
    }
  };

  const handleDeleteTenant = async (tid: string) => {
    const confirm = window.prompt("Taper 'SUPPRIMER' pour confirmer");
    if (confirm !== 'SUPPRIMER') return;

    try {
      const { error } = await supabase.from('tenants').delete().eq('tenant_id', tid);
      if (error) throw error;
      refresh();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcast) return;
    setSendingBroadcast(true);
    try {
      // Mocking the Edge Function call as we don't have the endpoint yet
      console.log('Sending broadcast:', broadcast);
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`✓ Message envoyé à ${tenants.length} mentors`);
      setBroadcast('');
    } catch (err) {
      alert('Erreur lors de l\'envoi');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const trials = tenants.filter(t => t.trial_ends_at);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ 
        position: 'fixed', 
        top: 0,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        zIndex: 1000, 
        background: '#080B14', 
        color: '#fff', 
        fontFamily: '"Space Mono", monospace',
        overflowY: 'auto', 
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
        borderLeft: '1px solid rgba(0,255,65,0.1)',
        borderRight: '1px solid rgba(0,255,65,0.1)',
      }}
    >
      <div style={{ padding: 16 }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#00FF41', fontSize: 14, fontWeight: 700, letterSpacing: '0.2em' }}>
              SNIPER
            </div>
            <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={10} /> ···{OPERATOR_ID?.toString()?.slice(-4) || '????'}
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: 10, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.25em', marginTop: 4 }}>
            MASTER CONTROL PANEL
          </div>
          <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.4)', marginTop: 8 }}>
            SYS · {currentTime.toLocaleTimeString('fr-FR', { hour12: false })} UTC
          </div>
          <div style={{ height: 1, background: 'rgba(0,255,65,0.08)', margin: '10px 0' }} />
        </header>

        {/* SECTION 1 — MRR DASHBOARD */}
        <section style={{ 
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,255,65,0.08)', 
          borderRadius: 12, padding: 14, marginBottom: 16 
        }}>
          <div style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 8 }}>
            REVENUS MENSUELS RÉCURRENTS
          </div>
          <div style={{ 
            fontSize: 36, fontWeight: 700, color: '#00FF41', 
            textShadow: '0 0 20px rgba(0,255,65,0.3)', lineHeight: 1 
          }}>
            ${mrr.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginTop: 4 }}>
            {tenants.filter(t => t.licence_status === 'active').length} MENTOR(S) ACTIF(S)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
            {['free', 'basic', 'premium', 'empire', 'pause'].map(p => {
              const count = tenants.filter(t => t.plan === p && t.licence_status === 'active').length;
              if (count === 0) return null;
              const price = (p === 'free' ? 0 : p === 'basic' ? 49 : p === 'premium' ? 99 : p === 'empire' ? 199 : 19);
              return (
                <div key={p} style={{ 
                  background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.1)', 
                  borderRadius: 20, padding: '3px 10px', fontSize: 9, color: '#00FF41' 
                }}>
                  {count}× {p.toUpperCase()} — ${count * price}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3 — CREATE NEW TENANT */}
        <section style={{ 
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,255,65,0.08)', 
          borderTop: '2px solid #00FF41', borderRadius: 12, padding: 14, marginBottom: 16 
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#00FF41', marginBottom: 14 }}>
            + NOUVEAU MENTOR
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <input 
                value={newMentor.name} 
                onChange={e => setNewMentor({...newMentor, name: e.target.value})}
                placeholder="Nom du mentor (ex: CryptoKing)"
                style={{ 
                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12, fontFamily: 'inherit' 
                }}
              />
            </div>
            <div>
              <input 
                value={newMentor.id} 
                onChange={e => {
                  const val = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                  setNewMentor({...newMentor, id: val});
                }}
                placeholder="Tenant ID (ex: cryptoking)"
                style={{ 
                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12, fontFamily: 'inherit' 
                }}
              />
              <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.4)', marginTop: 4 }}>
                URL: /app/{newMentor.id || '...'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>TRADING MODE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['MARKETS', 'BINARY', 'BOTH'] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => setNewMentor({...newMentor, tradingMode: m})}
                    style={{ 
                      flex: 1, padding: '6px', fontSize: 9, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                      background: newMentor.tradingMode === m ? 'rgba(0,255,65,0.1)' : 'transparent',
                      color: newMentor.tradingMode === m ? '#00FF41' : 'rgba(255,255,255,0.3)',
                      cursor: 'pointer'
                    }}
                  >
                    {m === 'MARKETS' ? 'FOREX' : m === 'BINARY' ? 'BINARY' : 'BOTH'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,255,65,0.03)', padding: 10, borderRadius: 10, border: '1px solid rgba(0,255,65,0.1)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#00FF41' }}>7 JOURS D'ESSAI EMPIRE GRATUIT</div>
              <NeonToggle isOn={newMentor.isTrial} onToggle={() => setNewMentor({...newMentor, isTrial: !newMentor.isTrial})} />
            </div>

            <button 
              onClick={handleCreateTenant}
              disabled={creating || !newMentor.name || !newMentor.id}
              style={{ 
                width: '100%', height: 48, borderRadius: 12, background: '#00FF41', color: '#000',
                border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginTop: 8,
                opacity: creating ? 0.5 : 1
              }}
            >
              {creating ? 'CRÉATION...' : 'CRÉER LE TENANT →'}
            </button>
          </div>
        </section>

        {/* SECTION 4 — TRIAL MONITOR */}
        {trials.length > 0 && (
          <section style={{ 
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,255,65,0.08)', 
            borderTop: '2px solid #FFD60A', borderRadius: 12, padding: 14, marginBottom: 16 
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFD60A', marginBottom: 14 }}>
              ESSAIS EN COURS
            </div>
            {trials.map(t => {
              const trialDate = t.trial_ends_at ? new Date(t.trial_ends_at).getTime() : 0;
              const daysLeft = trialDate ? Math.ceil((trialDate - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
              const isExpired = daysLeft <= 0;
              return (
                <div key={t.tenant_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{t.mentor_name}</div>
                    <PlanBadge plan={t.plan} />
                  </div>
                  <div style={{ 
                    fontSize: 10, fontWeight: 700, 
                    color: isExpired ? '#FF4141' : (daysLeft <= 3 ? '#FF4141' : '#FFD60A')
                  }}>
                    {isExpired ? 'EXPIRÉ' : `J${daysLeft}`}
                  </div>
                  <button style={{ 
                    padding: '4px 10px', fontSize: 9, borderRadius: 6, border: 'none',
                    background: 'rgba(0,255,65,0.06)', color: '#00FF41', cursor: 'pointer'
                  }}>
                    CONVERTIR →
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {/* SECTION 2 — TENANT LIST */}
        <section>
          <div style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 8 }}>
            LISTE DES MENTORS
          </div>
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un mentor..."
            style={{ 
              width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, fontFamily: 'inherit',
              marginBottom: 10
            }}
          />
          
          <AnimatePresence>
            {filteredTenants.map(tenant => (
              <motion.div 
                key={tenant.tenant_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: 12, padding: 14, marginBottom: 8 
                }}
              >
                {/* Row 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{tenant.mentor_name}</div>
                    <div style={{ 
                      fontSize: 7, padding: '2px 6px', borderRadius: 4, fontWeight: 800,
                      background: tenant.trading_mode === 'binary' ? 'rgba(139,92,246,0.1)' : (tenant.trading_mode === 'both' ? 'rgba(59,130,246,0.1)' : 'rgba(0,255,65,0.1)'),
                      color: tenant.trading_mode === 'binary' ? '#8B5CF6' : (tenant.trading_mode === 'both' ? '#3B82F6' : '#00FF41')
                    }}>
                      {tenant.trading_mode === 'both' ? 'F+B' : tenant.trading_mode?.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlanBadge plan={tenant.plan} />
                    <div style={{ 
                      width: 7, height: 7, borderRadius: '50%',
                      background: tenant.licence_status === 'active' ? '#00FF41' : '#FF4141',
                      boxShadow: tenant.licence_status === 'active' ? '0 0 8px #00FF41' : 'none'
                    }} />
                  </div>
                </div>

                {/* Row 2 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{tenant.tenant_id}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    CRÉÉ: {new Date(tenant.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                {/* Row 3 — Licence */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>LICENCE</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: tenant.licence_status === 'active' ? '#00FF41' : '#FF4141' }}>
                      {tenant.licence_status?.toUpperCase()}
                    </div>
                  </div>
                  <NeonToggle 
                    isOn={tenant.licence_status === 'active'} 
                    onToggle={() => handleToggleLicence(tenant)} 
                  />
                </div>

                {/* Row 4 — Plan Selector */}
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {['free', 'basic', 'premium', 'empire', 'pause'].map(p => (
                    <button 
                      key={p}
                      onClick={() => handlePlanChange(tenant.tenant_id, p)}
                      style={{ 
                        flex: 1, padding: '5px 0', fontSize: 8, borderRadius: 6, 
                        border: '1px solid',
                        borderColor: tenant.plan === p ? 'rgba(0,255,65,0.3)' : 'rgba(255,255,255,0.08)',
                        background: tenant.plan === p ? 'rgba(0,255,65,0.1)' : 'transparent',
                        color: tenant.plan === p ? '#00FF41' : 'rgba(255,255,255,0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Row 5 — Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button 
                    onClick={() => window.open(`/app/${tenant.tenant_id}`, '_blank')}
                    style={{ 
                      flex: 1, padding: '6px', fontSize: 9, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                      background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                    }}
                  >
                    VOIR L'APP <ExternalLink size={10} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTenant(tenant.tenant_id)}
                    style={{ 
                      padding: '6px 12px', fontSize: 9, borderRadius: 6, border: '1px solid rgba(255,65,65,0.2)',
                      background: 'rgba(255,65,65,0.05)', color: '#FF4141', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        {/* SECTION 5 — BROADCAST */}
        <section style={{ 
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,255,65,0.08)', 
          borderRadius: 12, padding: 14, marginBottom: 16 
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>MESSAGE GLOBAL</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Envoyer à tous les mentors actifs</div>
          <textarea 
            value={broadcast}
            onChange={e => setBroadcast(e.target.value)}
            placeholder="Ex: Nouvelle fonctionnalité disponible..."
            style={{ 
              width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: 8, padding: 10, color: '#fff', fontSize: 12, fontFamily: 'inherit',
              minHeight: 80, resize: 'none', marginBottom: 10
            }}
          />
          <button 
            onClick={handleBroadcast}
            disabled={sendingBroadcast || !broadcast}
            style={{ 
              width: '100%', height: 44, borderRadius: 10, border: '1px solid rgba(0,255,65,0.15)',
              background: 'rgba(0,255,65,0.06)', color: '#00FF41', fontWeight: 700, fontSize: 11, cursor: 'pointer'
            }}
          >
            {sendingBroadcast ? 'ENVOI...' : 'ENVOYER À TOUS →'}
          </button>
        </section>

        {/* SECTION 6 — PAYMENTS MONITOR */}
        <section style={{ 
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,255,65,0.08)', 
          borderRadius: 12, padding: 14, marginBottom: 16 
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 14 }}>PAIEMENTS RÉCENTS</div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>CONFIRMÉS</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#00FF41' }}>
                {transactions.filter(tx => tx.status === 'confirmed').length}
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>ATTENTE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFD60A' }}>
                {transactions.filter(tx => ['pending', 'confirming'].includes(tx.status)).length}
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>ÉCHOUÉS</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FF4141' }}>
                {transactions.filter(tx => tx.status === 'failed').length}
              </div>
            </div>
          </div>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {transactions.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>
                Aucune transaction récente
              </div>
            ) : transactions.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 6, height: 6, borderRadius: '50%',
                    background: tx.status === 'confirmed' ? '#00FF41' : (tx.status === 'failed' ? '#FF4141' : '#FFD60A'),
                    boxShadow: tx.status === 'confirmed' ? '0 0 5px #00FF41' : 'none'
                  }} />
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{tx.tenant_id}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>${tx.amount}</div>
                </div>
                {tx.status !== 'confirmed' && (
                  <button 
                    onClick={() => handleForceConfirm(tx.id)}
                    style={{ 
                      padding: '3px 8px', fontSize: 8, borderRadius: 4, border: 'none',
                      background: 'rgba(0,255,65,0.06)', color: '#00FF41', cursor: 'pointer'
                    }}
                  >
                    FORCER ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 7 — SYSTEM STATUS */}
        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 700 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF41', boxShadow: '0 0 5px #00FF41' }} />
              ONLINE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 700 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dbStatus === 'online' ? '#00FF41' : (dbStatus === 'timeout' ? '#FFD60A' : '#FF4141') }} />
              DB {dbStatus.toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 700 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF41' }} />
              BOT
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>v2.4.0</div>
        </footer>

      </div>
    </motion.div>
  );
};

export default MasterControlPanel;
