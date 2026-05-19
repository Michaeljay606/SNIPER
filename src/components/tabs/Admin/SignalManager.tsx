import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Activity, X, Check, AlertTriangle, Loader2, Globe, Zap, Target, Clock, ArrowUpRight, ArrowDownRight, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { triggerNotification } from '../../../lib/notifications';

interface SignalManagerProps {
  liveSignals: any[];
  setLiveSignals: React.Dispatch<React.SetStateAction<any[]>>;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

const BINARY_EXPIRATIONS = ['5s', '10s', '30s', 'M1', 'M2', 'M5', 'M15', 'M30'];

const SignalManager = ({ liveSignals, setLiveSignals, onShowToast }: SignalManagerProps) => {
  const { tenant_id } = useParams();
  const { config } = useClientConfig();
  const queryClient = useQueryClient();
  const tradingMode = (config?.tradingMode as 'forex' | 'binary' | 'both') ?? 'forex';
  const [activeForm, setActiveForm] = useState<'forex' | 'binary'>('forex');

  // Sanitize signal list to prevent duplicates
  const uniqueSignals = useMemo(() => {
    const seen = new Set();
    return (liveSignals || []).filter(s => {
      if (!s?.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [liveSignals]);

  // Sync activeForm once config loads
  useEffect(() => {
    if (!config) return;
    const m = config.tradingMode;
    if (m === 'binary') {
      setActiveForm('binary');
      setDirection('CALL');
      setEntry('MKT');
    } else {
      setActiveForm('forex');
      setDirection('BUY');
      setEntry('');
    }
  }, [config?.tradingMode]);

  // Initial fetch on mount to ensure fresh data
  useEffect(() => {
    refresh();
  }, []);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ id: string; status: string; val: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Form states
  const [signalType, setSignalType] = useState<'LIVE' | 'WATCH'>('LIVE');
  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState<'BUY' | 'SELL' | 'CALL' | 'PUT'>('BUY');
  const [entry, setEntry] = useState('');
  const [entryLow, setEntryLow] = useState('');
  const [entryHigh, setEntryHigh] = useState('');
  const [analysisNote, setAnalysisNote] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [tp2, setTp2] = useState('');
  const [tp3, setTp3] = useState('');
  const [tpCount, setTpCount] = useState(1);
  const [expiration, setExpiration] = useState('M5');
  const [payout, setPayout] = useState('82');
  const [martingale, setMartingale] = useState('M0');
  const [isVip, setIsVip] = useState(false);

  const [expirations, setExpirations] = useState<string[]>(() => {
    const saved = localStorage.getItem('binary_expirations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return ['S5', 'S10', 'S15', 'S30', 'M1', 'M2', 'M3', 'M5', 'M10', 'M15', 'M30', 'H1', 'H4', 'D1'];
  });
  const [customExp, setCustomExp] = useState('');

  const handleAddCustomExp = () => {
    const formatted = customExp.trim().toUpperCase();
    if (!formatted) return;
    
    // Validate format: e.g. S30, M5, H2, D3
    const isValid = /^([SMHD])(\d+)$/.test(formatted) || /^(\d+)([SMHD])$/.test(formatted);
    if (!isValid) {
      onShowToast('Format invalide! Utilisez ex: S45, M4, H2, D3', 'error');
      return;
    }
    
    if (expirations.includes(formatted)) {
      setExpiration(formatted);
      setCustomExp('');
      return;
    }
    
    const newExps = [...expirations, formatted];
    setExpirations(newExps);
    localStorage.setItem('binary_expirations', JSON.stringify(newExps));
    setExpiration(formatted);
    setCustomExp('');
    onShowToast(`Expiration ${formatted} ajoutée !`, 'success');
  };

  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close custom dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowExpDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const tid = tenant_id || 'default';

  const refresh = async () => {
    try {
      const { data } = await supabase.from('signals').select('*').eq('tenant_id', tid).order('timestamp', { ascending: false }).limit(20);
      if (data) setLiveSignals(data);
    } catch (e: any) { 
      console.error('Refresh error:', e);
      onShowToast(`Erreur de sync: ${e.message || 'Inconnue'}`, 'error'); 
    }
  };

  const startEdit = (sig: any, forceLive: boolean = false) => {
    setEditingId(sig.id);
    setSignalType(forceLive ? 'LIVE' : (sig.signal_type || 'LIVE'));
    setPair(sig.pair || '');
    setDirection(sig.direction?.toUpperCase() as any || 'BUY');
    setEntry(sig.entry || '');
    setEntryLow(sig.entry_low?.toString() || '');
    setEntryHigh(sig.entry_high?.toString() || '');
    setAnalysisNote(sig.analysis_note || '');
    setShowNoteInput(!!sig.analysis_note);
    setSl(sig.sl || '');
    
    // Split TP string if it contains multiple levels
    const tps = (sig.tp || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    setTp(tps[0] || '');
    setTp2(tps[1] || '');
    setTp3(tps[2] || '');
    setTpCount(Math.max(1, tps.length));

    setExpiration(sig.expiration || 'M5');
    setPayout(sig.payout_pct?.toString() || '82');
    const mVal = (sig.martingale || 'M0').split('_')[0];
    setMartingale(mVal);
    setIsVip(!!sig.is_vip);
    setActiveForm((sig.mode || 'forex') as any);
    
    // Auto-scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPair(''); 
    setEntry(activeForm === 'binary' ? 'MKT' : ''); 
    setEntryLow(''); 
    setEntryHigh('');
    setSl(''); setTp(''); setTp2(''); setTp3(''); setAnalysisNote('');
    setShowNoteInput(false);
    setTpCount(1);
  };

  const activateWatch = async (id: string) => {
    const now = new Date().toISOString();
    
    // 1. Optimistic local state updates for instant (0ms) UI response
    setLiveSignals(prev => prev.map(s => s.id === id ? { ...s, signal_type: 'LIVE', watch_activated_at: now } : s));
    
    ['both', 'binary', 'forex'].forEach(m => {
      queryClient.setQueryData(['signals', tid, m], (old: any) => {
        if (!old) return old;
        return old.map((s: any) => s.id === id ? { ...s, signal_type: 'LIVE', watch_activated_at: now } : s);
      });
    });

    setUpdatingId(null);
    onShowToast('Signal activé en LIVE avec succès !', 'success');

    // 2. Perform the database update asynchronously in the background
    try {
      const { error } = await supabase.from('signals').update({
        signal_type: 'LIVE',
        watch_activated_at: now
      }).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['signals', tid] });

      // Trigger notification for watch signal activation
      const { data: sigDetails } = await supabase.from('signals').select('*').eq('id', id).single();
      if (sigDetails) {
        triggerNotification({
          type: 'new_signal',
          tenant_id: tid,
          target_type: sigDetails.is_vip ? 'vip_members' : 'all_members',
          data: {
            signal_id: id,
            pair: sigDetails.pair,
            type: sigDetails.direction,
            direction: sigDetails.direction,
            is_vip: sigDetails.is_vip,
          }
        });
      }
    } catch (e: any) { 
      console.error('Activate error:', e);
      onShowToast(`Erreur d'activation: ${e.message || 'Inconnue'}`, 'error');
      refresh(); 
    }
  };

  const submit = async () => {
    const modeValue = tradingMode === 'both' ? activeForm : tradingMode;
    const isWatch = signalType === 'WATCH';
    
    if (!pair) return onShowToast('La paire est requise', 'warning');
    if (isWatch) {
      const isBullish = direction === 'BUY' || direction === 'CALL';
      if (isBullish && !entryLow) return onShowToast("Le prix d'entrée bas (support) est requis", 'warning');
      if (!isBullish && !entryHigh) return onShowToast("Le prix d'entrée haut (résistance) est requis", 'warning');
    }
    if (!isWatch && modeValue === 'forex' && !entry) return onShowToast('Le prix d\'entrée est requis pour le Forex', 'warning');
    
    setLoading(true);
    
    const payload: any = {
      tenant_id: tid,
      pair: pair.toUpperCase(),
      direction,
      type: direction,
      signal_type: signalType,
      entry: isWatch ? null : entry,
      entry_low: isWatch && (direction === 'BUY' || direction === 'CALL') && entryLow ? Number(entryLow) : null,
      entry_high: isWatch && (direction === 'SELL' || direction === 'PUT') && entryHigh ? Number(entryHigh) : null,
      analysis_note: analysisNote || null,
      mode: modeValue,
      trading_mode: modeValue === 'forex' ? 'MARKETS' : 'BINARY',
      is_vip: isVip,
      status: 'active',
      updated_at: new Date().toISOString(),
      watch_activated_at: !isWatch ? new Date().toISOString() : null
    };

    if (modeValue === 'forex') {
      const combinedTp = [tp, tp2, tp3].filter(Boolean).join(', ');
      Object.assign(payload, { sl, tp: combinedTp });
    } else {
      const payVal = parseInt(payout);
      // Store entry_low/high as string to support time format (11:35) and MKT
      const entryLowVal = isWatch && (direction === 'BUY' || direction === 'CALL') ? (entryLow || null) : null;
      const entryHighVal = isWatch && (direction === 'SELL' || direction === 'PUT') ? (entryHigh || null) : null;
      Object.assign(payload, { 
        expiration, 
        payout_pct: isNaN(payVal) ? 0 : payVal, 
        martingale,
        entry_low: entryLowVal,
        entry_high: entryHighVal,
      });
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('signals').update(payload).eq('id', editingId);
        if (error) throw error;
        onShowToast('Signal mis à jour !', 'success');
        setEditingId(null);
      } else {
        payload.timestamp = new Date().toISOString();
        const { data, error } = await supabase.from('signals').insert(payload).select('id').single();
        if (error) throw error;
        onShowToast(isWatch ? 'Zone d\'alerte publiée !' : 'Signal publié !', 'success');

        if (signalType === 'LIVE' && data) {
          triggerNotification({
            type: 'new_signal',
            tenant_id: tid,
            target_type: isVip ? 'vip_members' : 'all_members',
            data: {
              signal_id: data.id,
              pair: pair.toUpperCase(),
              type: direction,
              direction: direction,
              is_vip: isVip,
            }
          });
        }
      }
      setPair(''); setEntry(''); setEntryLow(''); setEntryHigh('');
      setSl(''); setTp(''); setTp2(''); setTp3(''); setAnalysisNote('');
      setTpCount(1);
      setShowNoteInput(false);
      queryClient.invalidateQueries({ queryKey: ['signals', tid] });
      await refresh();
    } catch (e: any) { onShowToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string, rr: string) => {
    // 1. Optimistic local state updates for instant (0ms) UI response
    setLiveSignals(prev => prev.map(s => s.id === id ? { ...s, status, rr } : s));
    
    ['both', 'binary', 'forex'].forEach(m => {
      queryClient.setQueryData(['signals', tid, m], (old: any) => {
        if (!old) return old;
        return old.map((s: any) => s.id === id ? { ...s, status, rr } : s);
      });
    });

    setPending(null);
    setUpdatingId(null);
    onShowToast('Statut mis à jour !', 'success');

    // 2. Perform the database update asynchronously in the background
    try {
      const { error } = await supabase.from('signals').update({ status, rr }).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['signals', tid] });

      // Trigger notification for status changes
      const { data: sigDetails } = await supabase.from('signals').select('*').eq('id', id).single();
      if (sigDetails) {
        let notifType = '';
        if (status === 'tp') notifType = 'signal_tp_hit';
        else if (status === 'sl') notifType = 'signal_sl_hit';
        else if (status === 'cancelled') notifType = 'signal_cancelled';

        if (notifType) {
          triggerNotification({
            type: notifType,
            tenant_id: tid,
            target_type: sigDetails.is_vip ? 'vip_members' : 'all_members',
            data: {
              signal_id: id,
              pair: sigDetails.pair,
              pips: rr || '',
            }
          });
        }
      }
    } catch (e: any) { 
      onShowToast(`Erreur de sync: ${e.message}`, 'error');
      refresh();
    }
  };

  const displaySignals = (uniqueSignals || []).filter(s => {
    if (!s) return false;
    const mode = (config?.tradingMode || 'forex').toLowerCase();
    const sigMode = (s.mode || s.trading_mode || 'forex').toLowerCase();
    if (mode === 'forex' || mode === 'markets') return sigMode === 'forex' || sigMode === 'markets';
    if (mode === 'binary') return sigMode === 'binary';
    return true;
  });

  const renderBadge = () => {
    const isBin = activeForm === 'binary';
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px', borderRadius: '20px',
        fontFamily: 'var(--mono)', fontSize: '10px',
        letterSpacing: '0.1em', marginBottom: '14px',
        background: isBin ? 'rgba(139,92,246,0.06)' : 'rgba(0,255,65,0.06)',
        border: `1px solid ${isBin ? 'rgba(139,92,246,0.15)' : 'rgba(0,255,65,0.15)'}`,
        color: isBin ? 'rgba(139,92,246,0.7)' : 'rgba(0,255,65,0.7)'
      }}>
        {isBin ? <Target size={12} /> : <Zap size={12} />}
        {isBin ? 'MODE OPTION BINAIRE' : 'MODE FOREX / CRYPTO'}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ─── MODE SELECTOR / BADGE ─── */}
      {tradingMode === 'both' ? (
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--subtle)', borderRadius: 50, padding: 3, marginBottom: 10 }}>
          {(['forex', 'binary'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setActiveForm(m); setDirection(m === 'forex' ? 'BUY' : 'CALL'); setEntry(m === 'binary' ? 'MKT' : ''); }}
              style={{
                flex: 1, padding: '10px 0', fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', borderRadius: 50,
                cursor: 'pointer', transition: 'all 0.25s',
                background: activeForm === m ? (m === 'forex' ? 'var(--green)' : 'var(--purple)') : 'transparent',
                color: activeForm === m ? '#050507' : 'rgba(255,255,255,0.3)',
              }}>
              {m === 'forex' ? 'FOREX' : 'BINAIRE'}
            </button>
          ))}
        </div>
      ) : renderBadge()}

      {/* ─── SIGNAL TYPE SELECTOR ─── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {(['LIVE', 'WATCH'] as const).map(t => (
          <button key={t} type="button" onClick={() => { setSignalType(t); if (t === 'LIVE' && activeForm === 'binary') setEntry('MKT'); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', border: 'none',
              background: signalType === t ? (t === 'WATCH' ? 'rgba(255,178,0,0.12)' : 'rgba(0,255,65,0.12)') : 'rgba(255,255,255,0.03)',
              color: signalType === t ? (t === 'WATCH' ? 'var(--amber)' : 'var(--green)') : 'rgba(255,255,255,0.25)',
              outline: signalType === t ? `1px solid ${t === 'WATCH' ? 'rgba(255,178,0,0.3)' : 'rgba(0,255,65,0.3)'}` : '1px solid transparent',
            }}>
            {t === 'LIVE' ? '⚡ LIVE' : '⏳ WATCH'}
          </button>
        ))}
      </div>

      {/* ─── CREATE FORM ─── */}
      <div ref={formRef} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${signalType === 'WATCH' ? 'rgba(255,178,0,0.2)' : 'var(--subtle)'}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>PAIRE / ACTIF</label>
            <input value={pair} onChange={e => setPair(e.target.value)} placeholder="EURUSD" 
              style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, fontFamily: 'var(--mono)' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>DIRECTION</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {activeForm === 'forex' ? (
                <>
                  <button onClick={() => setDirection('BUY')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: direction === 'BUY' ? 'var(--green)' : 'rgba(255,255,255,0.05)', color: direction === 'BUY' ? '#000' : '#fff', cursor: 'pointer' }}><ArrowUpRight size={14} /></button>
                  <button onClick={() => setDirection('SELL')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: direction === 'SELL' ? 'var(--red)' : 'rgba(255,255,255,0.05)', color: direction === 'SELL' ? '#fff' : '#fff', cursor: 'pointer' }}><ArrowDownRight size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setDirection('CALL')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: direction === 'CALL' ? 'var(--green)' : 'rgba(255,255,255,0.05)', color: direction === 'CALL' ? '#000' : '#fff', cursor: 'pointer' }}>CALL</button>
                  <button onClick={() => setDirection('PUT')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: direction === 'PUT' ? 'var(--red)' : 'rgba(255,255,255,0.05)', color: direction === 'PUT' ? '#fff' : '#fff', cursor: 'pointer' }}>PUT</button>
                </>
              )}
            </div>
          </div>

          {signalType === 'WATCH' ? (
            <div style={{ gridColumn: 'span 2' }}>
              {direction === 'BUY' || direction === 'CALL' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--green)', margin: 0 }}>
                      ⏳ PRIX OU HEURE D'ENTRÉE (CALL)
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => { setEntryLow('MKT'); setEntryHigh(''); }} style={{ background: entryLow === 'MKT' ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.02)', border: entryLow === 'MKT' ? '1px solid rgba(0,255,65,0.3)' : '1px solid transparent', borderRadius: 4, color: entryLow === 'MKT' ? 'var(--green)' : 'var(--muted)', fontSize: 8, cursor: 'pointer', fontWeight: 800, padding: '2px 6px', fontFamily: 'var(--mono)', transition: 'all 0.15s' }}>MKT</button>
                      <button type="button" onClick={() => { if (entryLow === 'MKT') setEntryLow(''); }} style={{ background: entryLow !== 'MKT' ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.02)', border: entryLow !== 'MKT' ? '1px solid rgba(0,255,65,0.3)' : '1px solid transparent', borderRadius: 4, color: entryLow !== 'MKT' ? 'var(--green)' : 'var(--muted)', fontSize: 8, cursor: 'pointer', fontWeight: 800, padding: '2px 6px', fontFamily: 'var(--mono)', transition: 'all 0.15s' }}>PERSO</button>
                    </div>
                  </div>
                  <input 
                    value={entryLow} 
                    onChange={e => {
                      setEntryLow(e.target.value);
                      setEntryHigh('');
                    }} 
                    placeholder="Ex: 1.0820 ou 11:35"
                    style={{ 
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)', 
                      border: '1px solid rgba(0,255,65,0.25)', 
                      borderRadius: 10, 
                      padding: '10px', 
                      color: 'var(--green)', 
                      fontSize: 13, 
                      fontFamily: 'var(--mono)',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--red)', margin: 0 }}>
                      ⏳ PRIX OU HEURE D'ENTRÉE (PUT)
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => { setEntryHigh('MKT'); setEntryLow(''); }} style={{ background: entryHigh === 'MKT' ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.02)', border: entryHigh === 'MKT' ? '1px solid rgba(255,59,48,0.3)' : '1px solid transparent', borderRadius: 4, color: entryHigh === 'MKT' ? 'var(--red)' : 'var(--muted)', fontSize: 8, cursor: 'pointer', fontWeight: 800, padding: '2px 6px', fontFamily: 'var(--mono)', transition: 'all 0.15s' }}>MKT</button>
                      <button type="button" onClick={() => { if (entryHigh === 'MKT') setEntryHigh(''); }} style={{ background: entryHigh !== 'MKT' ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.02)', border: entryHigh !== 'MKT' ? '1px solid rgba(255,59,48,0.3)' : '1px solid transparent', borderRadius: 4, color: entryHigh !== 'MKT' ? 'var(--red)' : 'var(--muted)', fontSize: 8, cursor: 'pointer', fontWeight: 800, padding: '2px 6px', fontFamily: 'var(--mono)', transition: 'all 0.15s' }}>PERSO</button>
                    </div>
                  </div>
                  <input 
                    value={entryHigh} 
                    onChange={e => {
                      setEntryHigh(e.target.value);
                      setEntryLow('');
                    }} 
                    placeholder="Ex: 1.0860 ou 11:35"
                    style={{ 
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)', 
                      border: '1px solid rgba(255,59,48,0.25)', 
                      borderRadius: 10, 
                      padding: '10px', 
                      color: 'var(--red)', 
                      fontSize: 13, 
                      fontFamily: 'var(--mono)',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>PRIX D'ENTRÉE</label>
                {activeForm === 'binary' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setEntry('MKT')}
                      style={{
                        background: entry === 'MKT' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                        border: entry === 'MKT' ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        borderRadius: 4,
                        color: entry === 'MKT' ? 'var(--purple)' : 'var(--muted)',
                        fontSize: 8,
                        cursor: 'pointer',
                        fontWeight: 800,
                        padding: '2px 6px',
                        fontFamily: 'var(--mono)',
                        userSelect: 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      MKT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (entry === 'MKT') setEntry('');
                      }}
                      style={{
                        background: entry !== 'MKT' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                        border: entry !== 'MKT' ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        borderRadius: 4,
                        color: entry !== 'MKT' ? 'var(--purple)' : 'var(--muted)',
                        fontSize: 8,
                        cursor: 'pointer',
                        fontWeight: 800,
                        padding: '2px 6px',
                        fontFamily: 'var(--mono)',
                        userSelect: 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      PERSO
                    </button>
                  </div>
                )}
              </div>
              <input 
                value={entry} 
                onChange={e => setEntry(e.target.value)} 
                placeholder={activeForm === 'binary' && entry === 'MKT' ? 'MKT' : '1.0840'}
                disabled={activeForm === 'binary' && entry === 'MKT'}
                style={{ 
                  width: '100%', 
                  background: activeForm === 'binary' && entry === 'MKT' ? 'rgba(139,92,246,0.05)' : 'rgba(0,0,0,0.4)', 
                  border: activeForm === 'binary' && entry === 'MKT' ? '1px solid rgba(139,92,246,0.25)' : '1px solid var(--subtle)', 
                  borderRadius: 10, 
                  padding: '10px', 
                  color: activeForm === 'binary' && entry === 'MKT' ? 'var(--purple)' : '#fff', 
                  fontSize: 13, 
                  fontFamily: 'var(--mono)',
                  boxShadow: activeForm === 'binary' && entry === 'MKT' ? '0 0 10px rgba(139,92,246,0.1)' : 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }} 
              />
            </div>
          )}

          {activeForm === 'forex' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>STOP LOSS</label>
                  <input value={sl} onChange={e => setSl(e.target.value)} placeholder="1.0820" 
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: 10, padding: '10px', color: 'var(--red)', fontSize: 13, fontFamily: 'var(--mono)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>TAKE PROFITS</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {tpCount > 1 && (
                        <button type="button" onClick={() => { 
                          if (tpCount === 3) setTp3(''); else if (tpCount === 2) setTp2('');
                          setTpCount(prev => prev - 1); 
                        }} style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 4, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}>-</button>
                      )}
                      {tpCount < 3 && (
                        <button type="button" onClick={() => setTpCount(prev => prev + 1)} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid var(--green)', color: 'var(--green)', borderRadius: 4, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}>+</button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={tp} onChange={e => setTp(e.target.value)} placeholder="TP1" 
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: 10, padding: '10px', color: 'var(--green)', fontSize: 13, fontFamily: 'var(--mono)' }} />
                    
                    {tpCount >= 2 && (
                      <input value={tp2} onChange={e => setTp2(e.target.value)} placeholder="TP2" 
                        style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: 10, padding: '10px', color: 'var(--green)', fontSize: 13, fontFamily: 'var(--mono)' }} />
                    )}
                    
                    {tpCount >= 3 && (
                      <input value={tp3} onChange={e => setTp3(e.target.value)} placeholder="TP3" 
                        style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: 10, padding: '10px', color: 'var(--green)', fontSize: 13, fontFamily: 'var(--mono)' }} />
                    )}
                  </div>
                </div>
              </>
          ) : (
            <>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>EXPIRATION</label>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--purple)',
                      fontSize: 9,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontWeight: 800,
                      padding: '0 4px',
                      transition: 'all 0.2s',
                      fontFamily: 'var(--mono)',
                      userSelect: 'none'
                    }}
                    title="Ajouter une expiration personnalisée"
                  >
                    <Plus size={10} style={{ strokeWidth: 3 }} /> PERSO
                  </button>
                </div>
                
                <div 
                  onClick={() => setShowExpDropdown(!showExpDropdown)}
                  style={{ 
                    width: '100%', 
                    background: 'rgba(0,0,0,0.4)', 
                    border: '1px solid var(--subtle)', 
                    borderRadius: 10, 
                    padding: '12px 14px', 
                    color: '#fff', 
                    fontSize: 13, 
                    fontFamily: 'var(--mono)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <span>{expiration}</span>
                  <span style={{ fontSize: 9, transition: 'transform 0.2s', transform: showExpDropdown ? 'rotate(180deg)' : 'rotate(0)', color: 'var(--muted)' }}>
                    ▼
                  </span>
                </div>

                {showExpDropdown && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      maxHeight: 180,
                      overflowY: 'auto',
                      background: '#0a0a0f',
                      border: '1px solid var(--subtle)',
                      borderRadius: 10,
                      zIndex: 100,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.9), 0 0 15px rgba(139,92,246,0.15)',
                      padding: 4
                    }}
                    className="custom-scrollbar"
                  >
                    {expirations.map(ex => (
                      <div 
                        key={ex}
                        onClick={() => {
                          setExpiration(ex);
                          setShowExpDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontFamily: 'var(--mono)',
                          color: expiration === ex ? '#fff' : 'rgba(255,255,255,0.7)',
                          background: expiration === ex ? 'rgba(139,92,246,0.12)' : 'transparent',
                          border: expiration === ex ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => {
                          if (expiration !== ex) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expiration !== ex) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                          }
                        }}
                      >
                        <span>{ex}</span>
                        {expiration === ex && <Check size={12} color="var(--purple)" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>PAYOUT %</label>
                <input type="number" value={payout} onChange={e => setPayout(e.target.value)} 
                  style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--subtle)', borderRadius: 10, padding: '12px', color: 'var(--amber)', fontSize: 13, fontFamily: 'var(--mono)' }} />
              </div>

              {/* Custom Expiration Input */}
              {showCustomInput && (
                <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      ➕ AUTRE EXPIRATION :
                    </span>
                    <input
                      type="text"
                      value={customExp}
                      onChange={e => setCustomExp(e.target.value)}
                      placeholder="Saisir ex: S45, M4, H2..."
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: 11,
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        padding: '4px 0'
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomExp();
                          setShowCustomInput(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddCustomExp();
                        setShowCustomInput(false);
                      }}
                      style={{
                        background: 'var(--purple)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 9,
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      AJOUTER
                    </button>
                  </div>
                </div>
              )}

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ display: 'block', fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    MARTINGALE
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (martingale === 'M0') {
                        setMartingale('M1');
                      } else {
                        setMartingale('M0');
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: martingale !== 'M0' ? '#f43f5e' : 'var(--purple)',
                      fontSize: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontWeight: 800,
                      padding: '0 4px',
                      transition: 'all 0.2s',
                      fontFamily: 'var(--mono)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {martingale !== 'M0' ? (
                      <>❌ MASQUER</>
                    ) : (
                      <><Plus size={10} style={{ strokeWidth: 3 }} /> MARTINGALE</>
                    )}
                  </button>
                </div>

                {martingale !== 'M0' && (
                  <div style={{ animation: 'slide-down 0.25s ease-out' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        type="button" 
                        onClick={() => setMartingale('M1')} 
                        style={{ 
                          flex: 1, 
                          padding: '12px 16px', 
                          borderRadius: 10, 
                          border: martingale === 'M1' ? '1px solid rgba(192,132,252,0.6)' : '1px solid rgba(255,255,255,0.06)', 
                          background: martingale === 'M1' ? 'rgba(192,132,252,0.12)' : 'rgba(255,255,255,0.02)',
                          color: martingale === 'M1' ? '#C084FC' : 'rgba(255,255,255,0.4)',
                          textShadow: martingale === 'M1' ? '0 0 8px rgba(192,132,252,0.4)' : 'none',
                          boxShadow: martingale === 'M1' ? '0 4px 15px rgba(192,132,252,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                          fontFamily: 'var(--mono)', 
                          fontSize: 9, 
                          fontWeight: 800, 
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        🔮 GALE 1
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setMartingale('M2')} 
                        style={{ 
                          flex: 1, 
                          padding: '12px 16px', 
                          borderRadius: 10, 
                          border: martingale === 'M2' ? '1px solid rgba(192,132,252,0.6)' : '1px solid rgba(255,255,255,0.06)', 
                          background: martingale === 'M2' ? 'rgba(192,132,252,0.12)' : 'rgba(255,255,255,0.02)',
                          color: martingale === 'M2' ? '#C084FC' : 'rgba(255,255,255,0.4)',
                          textShadow: martingale === 'M2' ? '0 0 8px rgba(192,132,252,0.4)' : 'none',
                          boxShadow: martingale === 'M2' ? '0 4px 15px rgba(192,132,252,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                          fontFamily: 'var(--mono)', 
                          fontSize: 9, 
                          fontWeight: 800, 
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        🔮 GALE 2
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: signalType === 'WATCH' ? 'space-between' : 'flex-start', alignItems: 'center', marginBottom: 6 }}>
              {signalType === 'WATCH' && (
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--amber)' }}>
                  📝 NOTE D'ANALYSE
                </label>
              )}
              {signalType !== 'WATCH' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteInput(!showNoteInput);
                    if (showNoteInput) {
                      setAnalysisNote('');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: showNoteInput ? '#f43f5e' : 'var(--purple)',
                    fontSize: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontWeight: 800,
                    padding: '0 4px',
                    transition: 'all 0.2s',
                    fontFamily: 'var(--mono)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  {showNoteInput ? (
                    <>❌ MASQUER LA NOTE</>
                  ) : (
                    <><Plus size={10} style={{ strokeWidth: 3 }} /> AJOUTER UNE NOTE</>
                  )}
                </button>
              )}
            </div>

            {(signalType === 'WATCH' || showNoteInput) && (
              <div style={{ animation: 'slide-down 0.2s ease-out' }}>
                <textarea value={analysisNote} onChange={e => setAnalysisNote(e.target.value)}
                  rows={2} maxLength={280}
                  placeholder={signalType === 'WATCH' ? 'Ex: Zone de demande Daily, attente rebond...' : 'Commentaire optionnel...'}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: `1px solid ${signalType === 'WATCH' ? 'rgba(255,178,0,0.25)' : 'var(--subtle)'}`, borderRadius: 10, padding: '10px', color: '#fff', fontSize: 12, fontFamily: 'var(--sans)', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ textAlign: 'right', fontSize: 8, color: 'var(--muted)', marginTop: 2 }}>{analysisNote.length}/280</div>
              </div>
            )}
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
            <label style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>ACCÈS DU SIGNAL</label>
            <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 4 }}>
              <button type="button" onClick={() => setIsVip(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: !isVip ? 'rgba(0,255,65,0.15)' : 'transparent', color: !isVip ? 'var(--green)' : 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                GRATUIT
              </button>
              <button type="button" onClick={() => setIsVip(true)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: isVip ? 'rgba(255,214,10,0.15)' : 'transparent', color: isVip ? '#FFD60A' : 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                VIP 🔐
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={submit} disabled={loading} style={{
            flex: 1, padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? 'var(--subtle)' : (signalType === 'WATCH' ? 'var(--amber)' : 'var(--green)'),
            color: '#000', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: loading ? 'none' : (signalType === 'WATCH' ? '0 4px 15px rgba(255,178,0,0.25)' : '0 4px 15px rgba(0,255,65,0.2)')
          }}>
            {loading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : (editingId ? 'ENREGISTRER' : signalType === 'WATCH' ? '⏳ PUBLIER ZONE D\'ALERTE' : '⚡ PUBLIER LE SIGNAL')}
          </button>
          
          {editingId && (
            <button onClick={cancelEdit} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(255,59,48,0.3)', background: 'rgba(255,59,48,0.1)', color: 'var(--red)', cursor: 'pointer' }}>
              ANNULER
            </button>
          )}
        </div>
      </div>

      {/* ─── WATCH SIGNALS ─── */}
      {displaySignals.filter(s => s.signal_type === 'WATCH' && s.status === 'active').length > 0 && (
        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,178,0,0.2)' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⏳ ZONES EN SURVEILLANCE ({displaySignals.filter(s => s.signal_type === 'WATCH' && s.status === 'active').length})
          </p>
          {displaySignals.filter(s => s.signal_type === 'WATCH' && s.status === 'active').map(sig => (
            <div key={sig.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', marginBottom: 8, borderRadius: 12, background: 'rgba(255,178,0,0.05)', border: '1px solid rgba(255,178,0,0.2)' }}>
              <div>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{sig.pair}</p>
                <p style={{ fontSize: 8, color: 'var(--amber)', textTransform: 'uppercase', marginTop: 2 }}>
                  {sig.direction} · {sig.entry_low} — {sig.entry_high}
                </p>
                {sig.analysis_note && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: 2 }}>"{sig.analysis_note.substring(0, 50)}{sig.analysis_note.length > 50 ? '...' : ''}"</p>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => activateWatch(sig.id)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(0,255,65,0.15)', color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>⚡ LIVE</button>
                <button onClick={() => updateStatus(sig.id, 'cancelled', '')} style={{ padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── LIVE MANAGEMENT ─── */}
      <div style={{ paddingTop: 16, borderTop: '1px solid var(--subtle)' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={11} /> HISTORIQUE RÉCENT ({displaySignals.filter(s => s.signal_type !== 'WATCH').length})
        </p>

        {displaySignals.filter(s => s.signal_type !== 'WATCH').map(sig => {
          const isPending = pending?.id === sig.id;
          const isLoading = updatingId === sig.id;
          const isBin = (sig.mode || 'forex') === 'binary';
          const isActive = ['active', 'tp1_hit', 'tp2_hit'].includes(sig.status);

          return (
            <div key={sig.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: (sig.status === 'tp' || sig.status === 'sl' || sig.status === 'cancelled') ? 0.6 : 1 }}>
              <div>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{sig.pair}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase' }}>{isBin ? 'Binaire' : 'Forex'} · {sig.direction}</p>
                  {!isActive && (
                    <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 4, background: sig.status === 'tp' ? 'rgba(0,255,65,0.1)' : 'rgba(255,59,48,0.1)', color: sig.status === 'tp' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                      {sig.status.toUpperCase()} {sig.rr && `(${sig.rr})`}
                    </span>
                  )}
                  {isActive && sig.status !== 'active' && (
                    <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 4, background: 'rgba(0,255,65,0.15)', color: 'var(--green)', fontWeight: 800 }}>
                      {sig.status.replace('_hit', ' HIT').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {isActive ? (
                isPending ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={pending.val} onChange={e => setPending({ ...pending, val: e.target.value })} placeholder={isBin ? '$ Gain' : 'Pips'} style={{ width: 60, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--green)', borderRadius: 6, fontSize: 10, padding: 6, color: '#fff' }} />
                    <button onClick={() => updateStatus(sig.id, pending.status, pending.val)} style={{ padding: 8, background: 'var(--green)', border: 'none', borderRadius: 6 }}><Check size={12} /></button>
                    <button onClick={() => setPending(null)} style={{ padding: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6 }}><X size={12} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => startEdit(sig)} style={{ padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 6, border: 'none', color: 'var(--muted)' }}><Activity size={12} /></button>
                    {!isBin ? (
                      <>
                        <button onClick={() => updateStatus(sig.id, sig.status === 'tp1_hit' ? 'active' : 'tp1_hit', '')} style={{ padding: '6px 8px', background: sig.status === 'tp1_hit' ? 'rgba(0,255,65,0.25)' : 'rgba(0,255,65,0.08)', color: 'var(--green)', border: sig.status === 'tp1_hit' ? '1px solid var(--green)' : 'none', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>TP1</button>
                        <button onClick={() => updateStatus(sig.id, sig.status === 'tp2_hit' ? 'active' : 'tp2_hit', '')} style={{ padding: '6px 8px', background: sig.status === 'tp2_hit' ? 'rgba(0,255,65,0.25)' : 'rgba(0,255,65,0.08)', color: 'var(--green)', border: sig.status === 'tp2_hit' ? '1px solid var(--green)' : 'none', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>TP2</button>
                        <button onClick={() => setPending({ id: sig.id, status: 'tp', val: '' })} style={{ padding: '6px 8px', background: 'rgba(0,255,65,0.15)', color: '#00FF41', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 6, fontSize: 9, fontWeight: 800, cursor: 'pointer' }}>CLÔTURE</button>
                      </>
                    ) : (
                      <button onClick={() => setPending({ id: sig.id, status: 'tp', val: '' })} style={{ padding: '6px 12px', background: 'rgba(0,255,65,0.1)', color: 'var(--green)', border: 'none', borderRadius: 6, fontSize: 9, cursor: 'pointer' }}>TP</button>
                    )}
                    <button onClick={() => setPending({ id: sig.id, status: 'sl', val: '' })} style={{ padding: '6px 12px', background: 'rgba(255,59,48,0.1)', color: 'var(--red)', border: 'none', borderRadius: 6, fontSize: 9, cursor: 'pointer' }}>SL</button>
                    <button onClick={() => updateStatus(sig.id, 'cancelled', '')} style={{ padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 6, border: 'none', cursor: 'pointer' }}><AlertTriangle size={12} /></button>
                  </div>
                )
              ) : (
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {new Date(sig.timestamp || sig.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignalManager;
