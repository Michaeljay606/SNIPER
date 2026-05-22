import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Save, Zap, Camera } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { GlassCard, NeonButton } from '../../ui/Shared';
import { useConfig } from '../../../context/ConfigContext';

type TradingModeType = 'forex' | 'binary' | 'both';

interface ProfileSettingsProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

// Only the columns that actually exist in the 'tenants' table
const EDITABLE_FIELDS: Record<string, { label: string; type: string; placeholder?: string }> = {
  mentor_name:         { label: 'Nom du Mentor / Marque',  type: 'text',   placeholder: 'Ex: Sniper' },
  speciality:          { label: 'Spécialité',               type: 'text',   placeholder: 'Ex: Expert Trading Forex' },
  years_exp:           { label: 'Années d\'expérience',     type: 'text',   placeholder: 'Ex: 5+' },
  traders_count:       { label: 'Nombre de traders',        type: 'text',   placeholder: 'Ex: 1200+' },
  vision_text:         { label: 'Vision / À propos',        type: 'textarea', placeholder: 'Décrivez votre vision...' },
  social_telegram:     { label: 'Lien contact Telegram',   type: 'text',   placeholder: 'https://t.me/...' },
  whatsapp_url:        { label: 'Lien WhatsApp',            type: 'text',   placeholder: 'https://wa.me/...' },
};

const ProfileSettings = ({ onShowToast }: ProfileSettingsProps) => {
  const { tenant_id: paramTenantId } = useParams();
  const TENANT_ID = paramTenantId || 'default';
  const { refresh: refreshConfig } = useConfig();
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tradingMode, setTradingMode] = useState<TradingModeType>('forex');
  const [savingMode, setSavingMode] = useState(false);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      onShowToast("Fichier trop volumineux (max 3MB)", 'warning');
      return;
    }

    setIsUploading(type);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > height) {
            if (width > maxDim) { height *= maxDim / width; width = maxDim; }
          } else {
            if (height > maxDim) { width *= maxDim / height; height = maxDim; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const fileName = type === 'logo' ? 'avatar.webp' : 'cover.webp';
            const filePath = `${TENANT_ID}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('profile')
              .upload(filePath, blob, { contentType: 'image/webp', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('profile')
              .getPublicUrl(filePath);

            // Store clean URL without cache-buster — the buster is only for display
            const cleanUrl = publicUrl;
            const displayUrl = `${publicUrl}?t=${Date.now()}`;

            // Immediately persist to DB (don't wait for the Save button)
            const dbField = type === 'logo' ? 'logo_url' : 'cover_image_url';
            const { error: dbError } = await supabase
              .from('tenants')
              .update({ [dbField]: cleanUrl })
              .eq('tenant_id', TENANT_ID);

            if (dbError) {
              onShowToast('Upload OK mais erreur DB: ' + dbError.message, 'error');
            } else {
              // Update local state with display URL (has cache buster for immediate display)
              handleChange(dbField, displayUrl);
              // Invalidate ConfigContext cache so next read gets fresh data
              await refreshConfig();
              onShowToast('Image sauvegardée ✓', 'success');
            }

            setIsUploading(null);
          }, 'image/webp', 0.8);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setIsUploading(null);
      onShowToast("Erreur lors de l'upload", 'error');
    }
  };

  useEffect(() => {
    async function loadConfig() {
      const { data, error } = await supabase.from('tenants').select('*').eq('tenant_id', TENANT_ID).single();
      if (error) {
        console.error('Load config error:', error.message);
        onShowToast('Erreur de chargement: ' + error.message, 'error');
        setConfig({ tenant_id: TENANT_ID });
        return;
      }
      if (data) {
        setConfig(data);
        if (data.trading_mode) {
          const normMode = data.trading_mode.toLowerCase();
          setTradingMode(normMode === 'binary' ? 'binary' : 'forex');
        }
        // Build brokers array from broker_N_name / broker_N_url columns
        const brkrs = [];
        for (let i = 1; i <= 5; i++) {
          if (data[`broker_${i}_name`]) {
            brkrs.push({ index: i, name: data[`broker_${i}_name`] || '', url: data[`broker_${i}_url`] || '' });
          }
        }
        if (brkrs.length === 0) brkrs.push({ index: 1, name: '', url: '' });
        setBrokers(brkrs);
      }
    }
    loadConfig();
  }, [TENANT_ID]);

  const handleChange = (field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveTradingMode = async () => {
    setSavingMode(true);
    const dbMode = tradingMode === 'binary' ? 'BINARY' : 'MARKETS';
    const { error } = await supabase.from('tenants').update({ trading_mode: dbMode }).eq('tenant_id', TENANT_ID);
    setSavingMode(false);
    if (error) {
      console.error('Save mode error:', error);
      onShowToast('Erreur: ' + error.message, 'error');
    } else {
      onShowToast('Mode de trading mis à jour ✓', 'success');
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    // Build only the columns that exist in the 'tenants' table
    const payload: any = {
      tenant_id: TENANT_ID,
    };

    // Add the simple editable fields
    Object.keys(EDITABLE_FIELDS).forEach(field => {
      if (config[field] !== undefined) payload[field] = config[field];
    });

    // Add image URLs explicitly since they were removed from EDITABLE_FIELDS
    if (config.logo_url !== undefined) payload.logo_url = config.logo_url;
    if (config.cover_image_url !== undefined) payload.cover_image_url = config.cover_image_url;

    // Add pricing fields
    const pricingFields = [
      'signals_price', 'signals_duration_model',
      'academy_price_lifetime', 'academy_price_1m', 'academy_duration_model',
      'vip_model', 'vip_price_1m', 'vip_price_2m', 'vip_price_1y', 'vip_price_lifetime', 'vip_currency',
      'grant_all_on_payment', 'ton_payment_enabled', 'ton_wallet',
      'broker_msg_vip', 'broker_msg_academy', 'social_telegram',
      'elite_title', 'elite_description', 'elite_price', 'elite_contact_url', 'elite_tag',
      'wallets',
    ];
    pricingFields.forEach(field => {
      if (config[field] !== undefined) payload[field] = config[field];
    });

    // Add broker columns
    brokers.forEach(b => {
      if (b.index) {
        payload[`broker_${b.index}_name`] = b.name || null;
        payload[`broker_${b.index}_url`] = b.url || null;
      }
    });

    // Add trading_mode explicitly to avoid default value constraint violation
    payload.trading_mode = tradingMode === 'binary' ? 'BINARY' : 'MARKETS';

    const { error } = await supabase.from('tenants').upsert(payload);
    setSaving(false);

    if (error) {
      console.error('Save error:', error);
      onShowToast('Erreur: ' + error.message, 'error');
    } else {
      // Invalidate ConfigContext so the whole app picks up new values immediately
      await refreshConfig();
      onShowToast('Configuration sauvegardée ✓', 'success');
    }
  };

  if (!config) {
    return (
      <div className="flex justify-center items-center h-32">
        <span className="animate-pulse text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--accent-neon)' }}>
          Chargement...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">

      {/* MODE DE TRADING */}
      <GlassCard className="p-4">
        <h4 className="text-[10px] font-black tracking-widest uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--accent-neon)' }}>
          <Zap size={14} /> MODE DE TRADING
        </h4>
        <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Quel type de trading proposez-vous à vos membres ?</p>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {([
            { id: 'forex',  emoji: '📈', label: 'FOREX / CRYPTO',    desc: 'Signaux Forex & Crypto seulement' },
            { id: 'binary', emoji: '🎯', label: 'BINAIRE UNIQUEMENT', desc: 'Options binaires seulement' },
          ] as { id: TradingModeType; emoji: string; label: string; desc: string }[]).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTradingMode(opt.id)}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[52px] text-left"
              style={{
                background:  tradingMode === opt.id 
                  ? (opt.id === 'binary' ? 'rgba(0,152,234,0.08)' : 'rgba(0,255,65,0.08)') 
                  : 'var(--bg-void)',
                borderColor: tradingMode === opt.id 
                  ? (opt.id === 'binary' ? 'rgba(0,152,234,0.3)' : 'rgba(0,255,65,0.3)') 
                  : 'var(--border-subtle)',
              }}
            >
              <span className="text-lg">{opt.emoji}</span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest" 
                  style={{ color: tradingMode === opt.id ? (opt.id === 'binary' ? '#0098EA' : 'var(--accent-neon)') : 'var(--text-primary)' }}>
                  {opt.label}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
              </div>
              {tradingMode === opt.id && (
                <span className="ml-auto text-[10px] font-black" 
                  style={{ color: opt.id === 'binary' ? '#0098EA' : 'var(--accent-neon)' }}>
                  ✓ ACTIF
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={saveTradingMode}
          disabled={savingMode}
          className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all min-h-[44px] text-black"
          style={{ background: savingMode ? 'rgba(0,255,65,0.4)' : 'var(--accent-neon)' }}
        >
          {savingMode ? 'Sauvegarde...' : '💾 SAUVEGARDER LE MODE'}
        </button>
      </GlassCard>

      {/* SAVE BUTTON */}
      <GlassCard className="p-4 sticky top-0 z-20 backdrop-blur-xl bg-bg-void/80">
        <div className="flex justify-between items-center">
          <h3 className="text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: 'var(--accent-neon)' }}>
            <Settings size={16} /> Profil & Configuration
          </h3>
          <NeonButton onClick={handleSave} disabled={saving} className="px-4 py-2 text-[10px] min-h-[44px]">
            {saving ? '...' : <><Save size={14} /> SAUVEGARDER</>}
          </NeonButton>
        </div>
      </GlassCard>

      {/* IDENTITY FIELDS */}
      <GlassCard className="p-4">
        <h4 className="text-[10px] font-black tracking-widest uppercase border-b border-border-subtle/30 pb-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
          Identité & Branding
        </h4>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Logo / Avatar</label>
            <label className="block h-24 rounded-xl border border-dashed border-border-subtle bg-bg-void/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent-emerald transition-colors relative overflow-hidden">
              {isUploading === 'logo' ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-emerald border-t-transparent" />
              ) : config.logo_url ? (
                <img src={config.logo_url} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <>
                  <Camera size={20} className="text-text-muted mb-1" />
                  <span className="text-[9px] text-text-muted uppercase tracking-wider">Ajouter Logo</span>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Couverture</label>
            <label className="block h-24 rounded-xl border border-dashed border-border-subtle bg-bg-void/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent-emerald transition-colors relative overflow-hidden">
              {isUploading === 'cover' ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-emerald border-t-transparent" />
              ) : config.cover_image_url ? (
                <img src={config.cover_image_url} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <>
                  <Camera size={20} className="text-text-muted mb-1" />
                  <span className="text-[9px] text-text-muted uppercase tracking-wider">Ajouter Fond</span>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
            </label>
          </div>
        </div>
        <div className="space-y-4">
          {/* NOM & SPÉCIALITÉ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
                {EDITABLE_FIELDS.mentor_name.label}
              </label>
              <input
                type="text"
                value={config.mentor_name || ''}
                onChange={e => handleChange('mentor_name', e.target.value)}
                placeholder={EDITABLE_FIELDS.mentor_name.placeholder}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
                {EDITABLE_FIELDS.speciality.label}
              </label>
              <input
                type="text"
                value={config.speciality || ''}
                onChange={e => handleChange('speciality', e.target.value)}
                placeholder={EDITABLE_FIELDS.speciality.placeholder}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* EXPÉRIENCE & TRADERS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
                {EDITABLE_FIELDS.years_exp.label}
              </label>
              <input
                type="text"
                value={config.years_exp || ''}
                onChange={e => handleChange('years_exp', e.target.value)}
                placeholder={EDITABLE_FIELDS.years_exp.placeholder}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
                {EDITABLE_FIELDS.traders_count.label}
              </label>
              <input
                type="text"
                value={config.traders_count || ''}
                onChange={e => handleChange('traders_count', e.target.value)}
                placeholder={EDITABLE_FIELDS.traders_count.placeholder}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* VISION (Full width) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
              {EDITABLE_FIELDS.vision_text.label}
            </label>
            <textarea
              rows={3}
              value={config.vision_text || ''}
              onChange={e => handleChange('vision_text', e.target.value)}
              placeholder={EDITABLE_FIELDS.vision_text.placeholder}
              className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none resize-none"
            />
          </div>

          {/* RÉSEAUX SOCIAUX */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
                {EDITABLE_FIELDS.social_telegram.label}
              </label>
              <input
                type="text"
                value={config.social_telegram || ''}
                onChange={e => handleChange('social_telegram', e.target.value)}
                placeholder={EDITABLE_FIELDS.social_telegram.placeholder}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>
                {EDITABLE_FIELDS.whatsapp_url.label}
              </label>
              <input
                type="text"
                value={config.whatsapp_url || ''}
                onChange={e => handleChange('whatsapp_url', e.target.value)}
                placeholder={EDITABLE_FIELDS.whatsapp_url.placeholder}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* BROKERS */}
      <GlassCard className="p-4">
        <div className="flex justify-between items-center border-b border-border-subtle/30 pb-2 mb-4">
          <h4 className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--text-secondary)' }}>Brokers Partenaires</h4>
          {brokers.length < 5 && (
            <button
              onClick={() => setBrokers(prev => [...prev, { index: prev.length + 1, name: '', url: '' }])}
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg min-h-[36px]"
              style={{ color: 'var(--accent-neon)', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)' }}
            >
              + Ajouter
            </button>
          )}
        </div>
        <div className="space-y-4">
          {brokers.map((b, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border-subtle/50 bg-bg-void/50">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-muted)' }}>Nom broker {b.index}</label>
                <input
                  type="text"
                  value={b.name}
                  onChange={e => setBrokers(prev => prev.map((br, i) => i === idx ? { ...br, name: e.target.value } : br))}
                  placeholder="Ex: Pocket Option"
                  className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:border-accent-emerald outline-none min-h-[40px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-muted)' }}>Lien affiliation</label>
                <input
                  type="text"
                  value={b.url}
                  onChange={e => setBrokers(prev => prev.map((br, i) => i === idx ? { ...br, url: e.target.value } : br))}
                  placeholder="https://..."
                  className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[40px]"
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOC 1 — VIP SIGNAUX                               */}
      {/* ═══════════════════════════════════════════════════ */}
      <div style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(0,255,65,0.04) 0%, rgba(0,0,0,0) 60%)',
        border: '1px solid rgba(0,255,65,0.12)',
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 20 }}>📡</div>
          <div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: '#00FF41', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Accès VIP — Signaux
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              Comment les membres débloquent les signaux premium ?
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Mode selector ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {([
              { id: 'payment', icon: '💳', title: 'PAIEMENT', sub: 'Abonnement mensuel / annuel' },
              { id: 'broker',  icon: '🤝', title: 'BROKER',   sub: 'Inscription via lien affilié' },
              { id: 'both',    icon: '⚡', title: 'LES DEUX', sub: 'Membre choisit' },
            ] as { id: string; icon: string; title: string; sub: string }[]).map(opt => {
              const active = (config.vip_model || 'payment') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleChange('vip_model', opt.id)}
                  style={{
                    background: active ? 'rgba(0,255,65,0.08)' : 'rgba(255,255,255,0.02)',
                    border: active ? '1.5px solid rgba(0,255,65,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, padding: '12px 6px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: active ? '#00FF41' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    {opt.title}
                  </span>
                  {active && (
                    <span style={{ fontSize: 7, color: 'rgba(0,255,65,0.6)', textAlign: 'center', lineHeight: 1.3 }}>
                      {opt.sub}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── PAYMENT fields ────────────────────────────── */}
          {(config.vip_model === 'payment' || config.vip_model === 'both' || !config.vip_model) && (
            <div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: 'rgba(0,255,65,0.6)', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
                Plans tarifaires
              </div>
              {/* Plan rows — each has label + price input side by side */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { field: 'vip_price_1m',       label: '1 Mois',  tag: 'Mensuel', tagColor: '#00FF41' },
                  { field: 'vip_price_1y',       label: '1 An',    tag: 'Économie -40%', tagColor: '#FFD60A' },
                  { field: 'vip_price_lifetime', label: 'À Vie',   tag: 'Meilleur prix', tagColor: '#FF6B6B' },
                ].map(({ field, label, tag, tagColor }) => (
                  <div key={field} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, padding: '10px 14px',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F0' }}>{label}</div>
                      <div style={{ fontSize: 9, color: tagColor, fontFamily: 'Space Mono, monospace', marginTop: 2 }}>{tag}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        value={config[field] || ''}
                        onChange={e => handleChange(field, e.target.value)}
                        placeholder="0"
                        style={{
                          width: 80, background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, padding: '6px 10px',
                          fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700,
                          color: '#FFFFFF', outline: 'none', textAlign: 'right',
                        }}
                      />
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 32 }}>
                        {config.vip_currency || 'USDT'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Devise + Telegram */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 6 }}>Devise</label>
                  <input
                    type="text"
                    value={config.vip_currency || 'USDT'}
                    onChange={e => handleChange('vip_currency', e.target.value)}
                    placeholder="USDT"
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 6 }}>Telegram contact</label>
                  <input
                    type="text"
                    value={config.social_telegram || ''}
                    onChange={e => handleChange('social_telegram', e.target.value)}
                    placeholder="@username"
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* ── TON CONNECT ─────────────────────────────── */}
              <div style={{ marginTop: 20, padding: 16, background: 'rgba(0,152,234,0.04)', border: '1px solid rgba(0,152,234,0.15)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💎</span>
                    <div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, color: '#0098EA', letterSpacing: '0.05em' }}>TON CONNECT (USDT)</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Paiement crypto automatique</div>
                    </div>
                  </div>
                  <div 
                    onClick={() => handleChange('ton_payment_enabled', !config.ton_payment_enabled)}
                    style={{ 
                      width: 40, height: 20, borderRadius: 10, 
                      background: config.ton_payment_enabled ? '#0098EA' : 'rgba(255,255,255,0.1)', 
                      position: 'relative', cursor: 'pointer', transition: 'all 0.2s' 
                    }}
                  >
                    <div style={{ 
                      width: 16, height: 16, borderRadius: '50%', background: '#FFF', 
                      position: 'absolute', top: 2, left: config.ton_payment_enabled ? 22 : 2, 
                      transition: 'all 0.2s' 
                    }} />
                  </div>
                </div>

                {config.ton_payment_enabled && (
                  <div className="animate-in slide-in-from-top duration-300">
                    <label style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 6 }}>Adresse Wallet TON (Réception)</label>
                    <input
                      type="text"
                      value={config.ton_wallet || ''}
                      onChange={e => handleChange('ton_wallet', e.target.value)}
                      placeholder="UQ..."
                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,152,234,0.3)', borderRadius: 10, padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#0098EA', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BROKER info ────────────────────────────────── */}
          {(config.vip_model === 'broker' || config.vip_model === 'both') && (
            <div style={{
              background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
              borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔗</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 4 }}>Liens d'affiliation broker</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Configurez vos brokers partenaires dans la section <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Brokers Partenaires</strong> ci-dessus. Le membre recevra vos liens d'affiliation directement dans le modal de déblocage.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOC 2 — VIP ACADEMY                               */}
      {/* ═══════════════════════════════════════════════════ */}
      <div style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(255,214,10,0.04) 0%, rgba(0,0,0,0) 60%)',
        border: '1px solid rgba(255,214,10,0.12)',
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 20 }}>🎓</div>
          <div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: '#FFD60A', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Accès Academy
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              Comment les membres débloquent les cours premium ?
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Mode selector ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {([
              { id: 'payment', icon: '💳', title: 'PAIEMENT', sub: 'Abonnement' },
              { id: 'broker',  icon: '🤝', title: 'BROKER',   sub: 'Affiliation' },
              { id: 'both',    icon: '⚡', title: 'LES DEUX', sub: 'Au choix' },
            ] as { id: string; icon: string; title: string; sub: string }[]).map(opt => {
              const active = (config.academy_model || 'payment') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleChange('academy_model', opt.id)}
                  style={{
                    background: active ? 'rgba(255,214,10,0.08)' : 'rgba(255,255,255,0.02)',
                    border: active ? '1.5px solid rgba(255,214,10,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, padding: '12px 6px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: active ? '#FFD60A' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    {opt.title}
                  </span>
                  {active && (
                    <span style={{ fontSize: 7, color: 'rgba(255,214,10,0.6)', textAlign: 'center', lineHeight: 1.3 }}>
                      {opt.sub}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── PAYMENT fields ────────────────────────────── */}
          {(config.academy_model === 'payment' || config.academy_model === 'both' || !config.academy_model) && (
            <div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: 'rgba(255,214,10,0.7)', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
                Type de facturation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'monthly', title: 'MENSUEL', sub: 'ABONNEMENT' },
                  { id: 'lifetime', title: 'À VIE', sub: 'PAIEMENT UNIQUE' },
                ].map(opt => {
                  const active = (config.academy_duration_model || 'monthly') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChange('academy_duration_model', opt.id)}
                      style={{
                        background: active ? 'rgba(0,255,65,0.08)' : 'rgba(255,255,255,0.02)',
                        border: active ? '1px solid #00FF41' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 14, padding: '16px 8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase' }}>
                        {opt.title}
                      </span>
                      <span style={{ fontSize: 9, color: active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: 'rgba(255,214,10,0.7)', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
                Prix configuré
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { field: 'academy_price_1m',       label: '1 Mois',    tag: 'Mensuel',        tagColor: '#00FF41', show: (config.academy_duration_model || 'monthly') === 'monthly' },
                  { field: 'academy_price_lifetime',  label: 'À Vie',     tag: 'Accès permanent', tagColor: '#FF6B6B', show: config.academy_duration_model === 'lifetime' },
                ].filter(x => x.show).map(({ field, label, tag, tagColor }) => (
                  <div key={field} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, padding: '10px 14px',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#F0F0F0' }}>{label}</div>
                      <div style={{ fontSize: 9, color: tagColor, fontFamily: 'Space Mono, monospace', marginTop: 2 }}>{tag}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        value={config[field] || ''}
                        onChange={e => handleChange(field, e.target.value)}
                        placeholder="0"
                        style={{
                          width: 80, background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, padding: '6px 10px',
                          fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700,
                          color: '#FFFFFF', outline: 'none', textAlign: 'right',
                        }}
                      />
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', minWidth: 32 }}>
                        {config.vip_currency || 'USDT'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BROKER info ────────────────────────────────── */}
          {(config.academy_model === 'broker' || config.academy_model === 'both') && (
            <div style={{
              background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
              borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔗</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 4 }}>Accès par affiliation broker</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Le membre s'inscrit chez votre broker via votre lien affilié pour débloquer l'Academy. Configurez vos liens dans la section <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Brokers Partenaires</strong> ci-dessus.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>



    </div>
  );
};

export default ProfileSettings;
