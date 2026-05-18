import React, { useState, useEffect } from 'react';
import { Activity, Zap, CheckCircle, XCircle, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';

export default function AdminSignals() {
  const [signals, setSignals] = useState<any[]>([]);
  const [form, setForm] = useState({
    signalType: 'LIVE', // LIVE | WATCH
    mode: 'forex',
    pair: '',
    direction: 'BUY',
    entry: '',
    entryLow: '',
    entryHigh: '',
    tp1: '',
    tp2: '',
    sl: '',
    expiration: '',
    stake: '',
    analysisNote: '',
    isVip: false
  });

  const loadSignals = async () => {
    const { data } = await supabase
      .from('signals')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });
    if (data) setSignals(data);
  };

  useEffect(() => { loadSignals(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pair) return;

    const isWatch = form.signalType === 'WATCH';

    const payload: any = {
      tenant_id: TENANT_ID,
      signal_type: form.signalType,
      mode: form.mode,
      pair: form.pair.toUpperCase(),
      direction: form.direction,
      is_vip: form.isVip,
      analysis_note: form.analysisNote || null,
      status: 'active'
    };

    if (form.mode === 'forex') {
      payload.entry = isWatch ? null : (form.entry ? Number(form.entry) : null);
      payload.entry_low  = isWatch ? Number(form.entryLow)  : null;
      payload.entry_high = isWatch ? Number(form.entryHigh) : null;
      payload.tp1 = form.tp1 ? Number(form.tp1) : null;
      payload.tp2 = form.tp2 ? Number(form.tp2) : null;
      payload.sl  = form.sl  ? Number(form.sl)  : null;
    } else {
      payload.expiration   = form.expiration || null;
      payload.stake_percent = form.stake ? Number(form.stake) : null;
      payload.entry = isWatch ? null : (form.entry ? Number(form.entry) : null);
      payload.entry_low  = isWatch ? Number(form.entryLow)  : null;
      payload.entry_high = isWatch ? Number(form.entryHigh) : null;
    }

    const { error } = await supabase.from('signals').insert(payload);
    if (!error) {
      setForm({ ...form, pair: '', entry: '', entryLow: '', entryHigh: '', tp1: '', tp2: '', sl: '', expiration: '', stake: '', analysisNote: '' });
      loadSignals();
    }
  };

  const closeSignal = async (id: string, result: 'WIN' | 'LOSS' | 'BE') => {
    const pips = result === 'WIN' ? 50 : result === 'LOSS' ? -20 : 0;
    await supabase.from('signals').update({
      status: 'closed', result, result_pips: pips, is_victory: result === 'WIN'
    }).eq('id', id);
    loadSignals();
  };

  // Activate a WATCH signal → LIVE
  const activateWatch = async (id: string) => {
    await supabase.from('signals').update({
      signal_type: 'LIVE',
      watch_activated_at: new Date().toISOString()
    }).eq('id', id);
    loadSignals();
  };

  // Cancel a signal
  const cancelSignal = async (id: string) => {
    await supabase.from('signals').update({ status: 'cancelled' }).eq('id', id);
    loadSignals();
  };

  const isWatch = form.signalType === 'WATCH';
  const isBinary = form.mode === 'binary';

  const signalTypeColor = (t: string) => {
    if (t === 'WATCH') return 'var(--amber)';
    return 'var(--green)';
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Publisher Form */}
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--accent-emerald)] flex items-center gap-2">
          <Activity size={18} /> Signal Command Center
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Signal Type */}
          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-2">Type de Signal</label>
            <div className="flex gap-2">
              {[
                { id: 'LIVE',  label: '⚡ LIVE',  desc: 'Entrée immédiate' },
                { id: 'WATCH', label: '⏳ WATCH', desc: 'Zone d\'attente' },
              ].map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setForm({ ...form, signalType: t.id })}
                  className="flex-1 py-2 px-3 rounded-lg border text-left transition-all"
                  style={{
                    background: form.signalType === t.id ? 'var(--bg-elevated)' : 'transparent',
                    borderColor: form.signalType === t.id ? signalTypeColor(t.id) : 'var(--border-subtle)',
                    color: form.signalType === t.id ? signalTypeColor(t.id) : 'var(--text-muted)'
                  }}
                >
                  <div className="text-[11px] font-black tracking-widest">{t.label}</div>
                  <div className="text-[9px] mt-0.5 opacity-70">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 bg-[var(--bg-elevated)] p-1 rounded-xl">
            <button type="button" onClick={() => setForm({ ...form, mode: 'forex', direction: 'BUY' })}
              className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-lg ${form.mode === 'forex' ? 'bg-[var(--accent-emerald)] text-black' : 'text-[var(--text-muted)]'}`}>
              Forex
            </button>
            <button type="button" onClick={() => setForm({ ...form, mode: 'binary', direction: 'CALL' })}
              className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-lg ${form.mode === 'binary' ? 'bg-[var(--accent-amber)] text-black' : 'text-[var(--text-muted)]'}`}>
              Binaire
            </button>
          </div>

          {/* Pair + Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Paire</label>
              <input type="text" placeholder="Ex: XAUUSD" value={form.pair}
                onChange={e => setForm({ ...form, pair: e.target.value })}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono focus:border-[var(--accent-emerald)] outline-none min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Direction</label>
              <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-bold uppercase focus:border-[var(--accent-emerald)] outline-none min-h-[44px]">
                {form.mode === 'forex'
                  ? <><option value="BUY">BUY</option><option value="SELL">SELL</option></>
                  : <><option value="CALL">CALL</option><option value="PUT">PUT</option></>}
              </select>
            </div>
          </div>

          {/* Entry Zone / Price */}
          {isWatch ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--amber)' }}>
                ⏳ Zone d'Entrée (Fourchette)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="any" placeholder="Prix bas" value={form.entryLow}
                  onChange={e => setForm({ ...form, entryLow: e.target.value })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" style={{ borderColor: 'rgba(255,178,0,0.3)' }} />
                <input type="number" step="any" placeholder="Prix haut" value={form.entryHigh}
                  onChange={e => setForm({ ...form, entryHigh: e.target.value })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" style={{ borderColor: 'rgba(255,178,0,0.3)' }} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Prix d'Entrée</label>
              <input type="number" step="any" value={form.entry}
                onChange={e => setForm({ ...form, entry: e.target.value })}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
            </div>
          )}

          {/* Forex SL/TP */}
          {form.mode === 'forex' && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--accent-red)]">Stop Loss</label>
                <input type="number" step="any" value={form.sl}
                  onChange={e => setForm({ ...form, sl: e.target.value })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--accent-emerald)]">Take Profit 1</label>
                  <input type="number" step="any" value={form.tp1}
                    onChange={e => setForm({ ...form, tp1: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--accent-emerald)]">Take Profit 2</label>
                  <input type="number" step="any" value={form.tp2}
                    onChange={e => setForm({ ...form, tp2: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
                </div>
              </div>
            </div>
          )}

          {/* Binary fields */}
          {form.mode === 'binary' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Expiration</label>
                <select value={form.expiration} onChange={e => setForm({ ...form, expiration: e.target.value })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono focus:border-[var(--accent-amber)] outline-none min-h-[44px]">
                  <option value="">-- Choisir --</option>
                  {['M1','M2','M5','M10','M15','M30','H1','H4'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Stake %</label>
                <input type="number" placeholder="2" value={form.stake}
                  onChange={e => setForm({ ...form, stake: e.target.value })}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
              </div>
            </div>
          )}

          {/* Analysis Note — always shown */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: isWatch ? 'var(--amber)' : 'var(--text-secondary)' }}>
              {isWatch ? '📝 Note d\'Analyse (visible aux membres)' : '📝 Note (optionnel)'}
            </label>
            <textarea
              rows={2}
              placeholder={isWatch
                ? "Ex: Zone de demande sur Daily, attente rebond à 2340-2345 avant entrée BUY..."
                : "Ex: Cassure de résistance confirmée..."}
              value={form.analysisNote}
              onChange={e => setForm({ ...form, analysisNote: e.target.value })}
              maxLength={280}
              className="w-full bg-[var(--bg-input)] border rounded-lg px-3 py-2 text-sm resize-none outline-none"
              style={{ borderColor: isWatch ? 'rgba(255,178,0,0.3)' : 'var(--border-subtle)', color: 'var(--text)', minHeight: 68 }}
            />
            <div className="text-right text-[9px] text-[var(--text-muted)] mt-1">{form.analysisNote.length}/280</div>
          </div>

          {/* VIP toggle */}
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={form.isVip} onChange={e => setForm({ ...form, isVip: e.target.checked })}
              className="accent-[var(--accent-gold)] w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent-gold)]">Réservé VIP</span>
          </label>

          <button type="submit"
            className="w-full px-6 py-3 rounded-lg text-[13px] font-black uppercase tracking-widest active:scale-95 transition-transform min-h-[44px]"
            style={{
              background: isWatch ? 'var(--amber)' : 'var(--accent-emerald)',
              color: '#000',
              boxShadow: isWatch ? '0 0 15px rgba(255,178,0,0.35)' : '0 0 15px rgba(0,255,150,0.4)'
            }}>
            {isWatch ? '⏳ Publier Zone d\'Alerte' : '⚡ Publier Signal LIVE'}
          </button>
        </form>
      </div>

      {/* WATCH Signals (pending activation) */}
      {signals.filter(s => s.signal_type === 'WATCH' && s.status === 'active').length > 0 && (
        <div className="space-y-3 px-[16px]">
          <h3 className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-2" style={{ color: 'var(--amber)' }}>
            <AlertTriangle size={12} /> Zones en Surveillance
          </h3>
          {signals.filter(s => s.signal_type === 'WATCH' && s.status === 'active').map(signal => (
            <div key={signal.id} className="glass-card p-[14px] rounded-[12px]" style={{ border: '1px solid rgba(255,178,0,0.3)', background: 'rgba(255,178,0,0.04)' }}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base">{signal.pair}</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded" style={{ background: 'rgba(255,178,0,0.15)', color: 'var(--amber)' }}>
                    ⏳ WATCH
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    ['BUY','CALL'].includes(signal.direction) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>{signal.direction}</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)] font-mono">
                  {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {(signal.entry_low || signal.entry_high) && (
                <div className="mb-2 font-mono text-sm font-bold" style={{ color: 'var(--amber)' }}>
                  Zone: {signal.entry_low} — {signal.entry_high}
                </div>
              )}
              {signal.analysis_note && (
                <p className="text-[11px] text-[var(--text-secondary)] mb-3 italic">"{signal.analysis_note}"</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => activateWatch(signal.id)}
                  className="px-3 py-2 rounded text-[10px] font-bold uppercase min-h-[44px] transition-all active:scale-95"
                  style={{ background: 'rgba(0,255,65,0.15)', color: 'var(--green)', border: '1px solid rgba(0,255,65,0.3)' }}>
                  ⚡ Activer → LIVE
                </button>
                <button
                  onClick={() => cancelSignal(signal.id)}
                  className="px-3 py-2 rounded text-[10px] font-bold uppercase min-h-[44px] transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  Annuler
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active LIVE Signals */}
      <div className="space-y-4 px-[16px]">
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]">Signaux LIVE Actifs</h3>
        {signals.filter(s => s.signal_type !== 'WATCH' && s.status === 'active').map(signal => (
          <div key={signal.id} className="glass-card p-[14px] rounded-[12px] border border-[var(--border-subtle)]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{signal.pair}</span>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                  ['BUY','CALL'].includes(signal.direction) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>{signal.direction}</span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded" style={{ background: 'rgba(0,255,65,0.1)', color: 'var(--green)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  ⚡ LIVE
                </span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)] font-mono">
                {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {signal.analysis_note && (
              <p className="text-[10px] text-[var(--text-secondary)] mb-3 italic">"{signal.analysis_note}"</p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <button onClick={() => closeSignal(signal.id, 'WIN')} className="px-3 py-2 bg-green-500/20 text-green-400 rounded text-[10px] font-bold uppercase hover:bg-green-500/30 min-h-[44px]">WIN</button>
              <button onClick={() => closeSignal(signal.id, 'LOSS')} className="px-3 py-2 bg-red-500/20 text-red-400 rounded text-[10px] font-bold uppercase hover:bg-red-500/30 min-h-[44px]">LOSS</button>
              <button onClick={() => closeSignal(signal.id, 'BE')} className="px-3 py-2 bg-gray-500/20 text-gray-400 rounded text-[10px] font-bold uppercase hover:bg-gray-500/30 min-h-[44px]">BE</button>
            </div>
          </div>
        ))}
        {signals.filter(s => s.signal_type !== 'WATCH' && s.status === 'active').length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)] text-[10px] uppercase tracking-widest">
            Aucun signal LIVE en cours
          </div>
        )}
      </div>
    </div>
  );
}
