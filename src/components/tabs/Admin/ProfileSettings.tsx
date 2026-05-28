import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Save, Zap, Camera } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { GlassCard, NeonButton } from '../../ui/Shared';
import { useConfig } from '../../../context/ConfigContext';
import type { PlanFeatures, VipModelOption } from '../../../hooks/usePlanFeatures';
import { isVipModelAllowed } from '../../../hooks/usePlanFeatures';
import LockedFeature, { LockedOptionChip } from '../../LockedFeature';
import { useTranslation } from 'react-i18next';

type TradingModeType = 'forex' | 'binary' | 'both';

interface ProfileSettingsProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  planFeatures: PlanFeatures;
  onUpgrade: () => void;
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

const ProfileSettings = ({ onShowToast, planFeatures, onUpgrade }: ProfileSettingsProps) => {
  const { t } = useTranslation();
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
    if (!planFeatures.canUploadMedia) {
      onShowToast('Logo et couverture disponibles dès le plan Basic', 'warning');
      return;
    }
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
          const raw = String(data.trading_mode).toUpperCase();
          if (raw === 'BINARY') setTradingMode('binary');
          else if (raw === 'BOTH') setTradingMode('both');
          else setTradingMode('forex');
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

  const handleWalletChange = (field: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      wallets: {
        ...(prev?.wallets || {}),
        [field]: value,
      },
    }));
  };

  const saveTradingMode = async () => {
    setSavingMode(true);
    const dbMode =
      tradingMode === 'both' ? 'BOTH' :
      tradingMode === 'binary' ? 'BINARY' : 'MARKETS';
    if (
      tradingMode === 'forex' ||
      (tradingMode === 'binary' && planFeatures.canUseBinaryMode) ||
      (tradingMode === 'both' && planFeatures.canUseHybridMode)
    ) {
      const { error } = await supabase.from('tenants').update({ trading_mode: dbMode }).eq('tenant_id', TENANT_ID);
      setSavingMode(false);
      if (error) {
        console.error('Save mode error:', error);
        onShowToast('Erreur: ' + error.message, 'error');
        return;
      }
      onShowToast('Mode de trading mis à jour ✓', 'success');
      return;
    }
    setSavingMode(false);
    onShowToast('Ce mode nécessite un plan supérieur', 'warning');
  };

  const handleSave = async () => {
    if (!config) return;
    if (planFeatures.isAdminLocked) {
      onShowToast('Plan PAUSE — admin en lecture seule', 'warning');
      return;
    }
    setSaving(true);

    const payload: any = { tenant_id: TENANT_ID };

    payload.mentor_name = config.mentor_name ?? null;
    payload.speciality = config.speciality ?? null;

    if (planFeatures.canEditFullProfile) {
      (['years_exp', 'traders_count', 'vision_text', 'social_telegram', 'whatsapp_url'] as const).forEach(field => {
        if (config[field] !== undefined) payload[field] = config[field];
      });
    }

    if (planFeatures.canUploadMedia) {
      if (config.logo_url !== undefined) payload.logo_url = config.logo_url;
      if (config.cover_image_url !== undefined) payload.cover_image_url = config.cover_image_url;
    }

    const vipModel = (config.vip_model || 'broker') as VipModelOption;
    payload.vip_model = isVipModelAllowed(planFeatures, vipModel)
      ? vipModel
      : (planFeatures.allowedVipModels[0] ?? 'broker');

    if (planFeatures.canUseManualPayment) {
      (['vip_price_1m', 'vip_price_1y', 'vip_price_lifetime', 'vip_currency', 'signals_price', 'signals_duration_model',
        'academy_price_lifetime', 'academy_price_1m', 'academy_duration_model', 'grant_all_on_payment',
        'broker_msg_vip', 'broker_msg_academy'] as const).forEach(field => {
        if (config[field] !== undefined) payload[field] = config[field];
      });
      if (config.social_telegram !== undefined) payload.social_telegram = config.social_telegram;
      if (config.wallets !== undefined) payload.wallets = config.wallets || {};
    }

    if (planFeatures.canUseTonConnect) {
      payload.ton_payment_enabled = !!config.ton_payment_enabled;
      payload.ton_wallet = config.ton_wallet || null;
    } else {
      payload.ton_payment_enabled = false;
    }

    if (planFeatures.canAddCoachingElite) {
      (['elite_title', 'elite_description', 'elite_price', 'elite_contact_url', 'elite_tag'] as const).forEach(field => {
        if (config[field] !== undefined) payload[field] = config[field];
      });
    }

    if (planFeatures.canWhiteLabel) {
      if (config.theme_color !== undefined) payload.theme_color = config.theme_color;
      if (config.custom_accent_color !== undefined) payload.custom_accent_color = config.custom_accent_color;
    }

    if (planFeatures.canHideBadge && config.hide_sniper_badge !== undefined) {
      payload.hide_sniper_badge = !!config.hide_sniper_badge;
    }

    brokers.slice(0, planFeatures.maxBrokers).forEach(b => {
      if (b.index) {
        payload[`broker_${b.index}_name`] = b.name || null;
        payload[`broker_${b.index}_url`] = b.url || null;
      }
    });

    const dbMode =
      tradingMode === 'both' ? 'BOTH' :
      tradingMode === 'binary' ? 'BINARY' : 'MARKETS';
    if (
      (tradingMode === 'forex') ||
      (tradingMode === 'binary' && planFeatures.canUseBinaryMode) ||
      (tradingMode === 'both' && planFeatures.canUseHybridMode)
    ) {
      payload.trading_mode = dbMode;
    }

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
    <div className="space-y-6 pb-24 animate-in fade-in duration-500" style={{ position: 'relative' }}>

      {/* ── PAUSE PLAN — read-only overlay ── */}
      {planFeatures.isAdminLocked && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          margin: '-4px -4px 8px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(255,59,48,0.12) 0%, rgba(8,11,20,0.95) 100%)',
          border: '1px solid rgba(255,59,48,0.35)',
          borderRadius: 14,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⏸</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Plan PAUSE — Mode lecture seule
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
              Votre contenu est conservé. Réactivez votre plan pour modifier votre profil.
            </div>
          </div>
          <button
            onClick={onUpgrade}
            style={{
              padding: '8px 14px',
              background: 'rgba(255,59,48,0.12)',
              border: '1px solid rgba(255,59,48,0.35)',
              borderRadius: 20,
              color: '#FF3B30',
              fontFamily: 'Space Mono, monospace',
              fontSize: 9,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            RÉACTIVER →
          </button>
        </div>
      )}

      {/* MODE DE TRADING */}
      <GlassCard className="p-4">
        <h4 className="text-[10px] font-black tracking-widest uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--accent-neon)' }}>
          <Zap size={14} /> MODE DE TRADING
        </h4>
        <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Forex seul (Free/Basic) · Binaire (Premium+) · Hybride simultané (Empire)
        </p>
        <div className="grid grid-cols-1 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTradingMode('forex')}
            className="flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[52px] text-left"
            style={{
              background: tradingMode === 'forex' ? 'rgba(0,255,65,0.08)' : 'var(--bg-void)',
              borderColor: tradingMode === 'forex' ? 'rgba(0,255,65,0.3)' : 'var(--border-subtle)',
            }}
          >
            <span className="text-lg">📈</span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: tradingMode === 'forex' ? 'var(--accent-neon)' : 'var(--text-primary)' }}>FOREX / CRYPTO</p>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Signaux Forex & Crypto</p>
            </div>
            {tradingMode === 'forex' && <span className="ml-auto text-[10px] font-black text-[var(--accent-neon)]">✓</span>}
          </button>

          {planFeatures.canUseBinaryMode ? (
            <button
              type="button"
              onClick={() => setTradingMode('binary')}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[52px] text-left"
              style={{
                background: tradingMode === 'binary' ? 'rgba(0,152,234,0.08)' : 'var(--bg-void)',
                borderColor: tradingMode === 'binary' ? 'rgba(0,152,234,0.3)' : 'var(--border-subtle)',
              }}
            >
              <span className="text-lg">🎯</span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: tradingMode === 'binary' ? '#0098EA' : 'var(--text-primary)' }}>BINAIRE UNIQUEMENT</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Options binaires OTC</p>
              </div>
              {tradingMode === 'binary' && <span className="ml-auto text-[10px] font-black text-[#0098EA]">✓</span>}
            </button>
          ) : (
            <LockedFeature currentPlan={planFeatures.plan} requiredPlan="premium" featureName="Mode Binaire" description="Activez les signaux options binaires pour vos membres." mode="replace" onUpgrade={onUpgrade}>
              <div />
            </LockedFeature>
          )}

          {planFeatures.canUseHybridMode ? (
            <button
              type="button"
              onClick={() => setTradingMode('both')}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[52px] text-left"
              style={{
                background: tradingMode === 'both' ? 'rgba(255,214,10,0.08)' : 'var(--bg-void)',
                borderColor: tradingMode === 'both' ? 'rgba(255,214,10,0.35)' : 'var(--border-subtle)',
              }}
            >
              <span className="text-lg">⚡</span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: tradingMode === 'both' ? '#FFD60A' : 'var(--text-primary)' }}>HYBRIDE FOREX + BINAIRE</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Les deux modes simultanément</p>
              </div>
              {tradingMode === 'both' && <span className="ml-auto text-[10px] font-black text-[#FFD60A]">✓</span>}
            </button>
          ) : (
            <LockedFeature currentPlan={planFeatures.plan} requiredPlan="empire" featureName="Mode Hybride" description="Forex et Binaire en parallèle — exclusif Empire." mode="replace" onUpgrade={onUpgrade}>
              <div />
            </LockedFeature>
          )}
        </div>
        <button
          onClick={saveTradingMode}
          disabled={savingMode || planFeatures.isAdminLocked}
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
        <LockedFeature
          currentPlan={planFeatures.plan}
          requiredPlan="basic"
          featureName="Logo & Couverture"
          description="Personnalisez votre avatar et bannière — inclus dès Basic."
          mode="overlay"
          onUpgrade={onUpgrade}
        >
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
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} disabled={!planFeatures.canUploadMedia} />
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
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} disabled={!planFeatures.canUploadMedia} />
              </label>
            </div>
          </div>
        </LockedFeature>
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

          {/* Profil complet — Basic+ */}
          <LockedFeature
            currentPlan={planFeatures.plan}
            requiredPlan="free"
            featureName="Profil Complet"
            description="Expérience, vision, stats traders et réseaux sociaux — dès Basic."
            mode="blur"
            onUpgrade={onUpgrade}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{EDITABLE_FIELDS.years_exp.label}</label>
                  <input type="text" value={config.years_exp || ''} onChange={e => handleChange('years_exp', e.target.value)} placeholder={EDITABLE_FIELDS.years_exp.placeholder} className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{EDITABLE_FIELDS.traders_count.label}</label>
                  <input type="text" value={config.traders_count || ''} onChange={e => handleChange('traders_count', e.target.value)} placeholder={EDITABLE_FIELDS.traders_count.placeholder} className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{EDITABLE_FIELDS.vision_text.label}</label>
                <textarea rows={3} value={config.vision_text || ''} onChange={e => handleChange('vision_text', e.target.value)} placeholder={EDITABLE_FIELDS.vision_text.placeholder} className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{EDITABLE_FIELDS.social_telegram.label}</label>
                  <input type="text" value={config.social_telegram || ''} onChange={e => handleChange('social_telegram', e.target.value)} placeholder={EDITABLE_FIELDS.social_telegram.placeholder} className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[44px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>{EDITABLE_FIELDS.whatsapp_url.label}</label>
                  <input type="text" value={config.whatsapp_url || ''} onChange={e => handleChange('whatsapp_url', e.target.value)} placeholder={EDITABLE_FIELDS.whatsapp_url.placeholder} className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[44px]" />
                </div>
              </div>
            </div>
          </LockedFeature>
        </div>

        {/* Badge SNIPER — obligatoire Free/Basic, optionnel discret Premium+ */}
        <div
          className="mt-4 p-3 rounded-xl border"
          style={{
            borderColor: planFeatures.canHideBadge ? 'rgba(139,92,246,0.25)' : 'rgba(255,214,10,0.2)',
            background: planFeatures.canHideBadge ? 'rgba(139,92,246,0.06)' : 'rgba(255,214,10,0.04)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: planFeatures.canHideBadge ? '#A78BFA' : '#FFD60A' }}>
                Badge SNIPER
              </p>
              <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {planFeatures.canHideBadge
                  ? 'Masqué par défaut. Activez pour un badge discret en bas de l\'app.'
                  : 'Obligatoire et non modifiable sur votre plan.'}
              </p>
            </div>
            {planFeatures.canHideBadge ? (
              <button
                type="button"
                onClick={() => handleChange('hide_sniper_badge', !config.hide_sniper_badge)}
                className="shrink-0 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest"
                style={{
                  background: config.hide_sniper_badge !== false ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.15)',
                  border: `1px solid ${config.hide_sniper_badge !== false ? 'rgba(255,255,255,0.12)' : 'rgba(139,92,246,0.4)'}`,
                  color: config.hide_sniper_badge !== false ? 'rgba(255,255,255,0.5)' : '#A78BFA',
                }}
              >
                {config.hide_sniper_badge !== false ? 'Masqué' : 'Discret ✓'}
              </button>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD60A]">Obligatoire</span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* COACHING ELITE — always visible */}
      <LockedFeature
        currentPlan={planFeatures.plan}
        requiredPlan="premium"
        featureName="Accompagnement Exclusif"
        description="Proposez du coaching One to One avec tarification personnalisée."
        mode="replace"
        onUpgrade={onUpgrade}
      >
        <GlassCard className="p-4">
          <h4 className="text-[10px] font-black tracking-widest uppercase border-b border-border-subtle/30 pb-2 mb-4" style={{ color: '#FFD60A' }}>
            Coaching Elite
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Titre</label>
              <input
                type="text"
                value={config.elite_title || ''}
                onChange={e => handleChange('elite_title', e.target.value)}
                placeholder="Ex: Coaching Privé 1-to-1"
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                rows={3}
                value={config.elite_description || ''}
                onChange={e => handleChange('elite_description', e.target.value)}
                placeholder="Décrivez votre offre coaching..."
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Prix</label>
                <input
                  type="text"
                  value={config.elite_price || ''}
                  onChange={e => handleChange('elite_price', e.target.value)}
                  placeholder="Ex: 299 USDT"
                  className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm font-mono text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Lien contact</label>
                <input
                  type="text"
                  value={config.elite_contact_url || ''}
                  onChange={e => handleChange('elite_contact_url', e.target.value)}
                  placeholder="https://t.me/..."
                  className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[44px]"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </LockedFeature>

      {/* WHITE-LABEL — always visible */}
      <LockedFeature
        currentPlan={planFeatures.plan}
        requiredPlan="empire"
        featureName="White-Label Total"
        description="Couleurs, logo et nom d'app personnalisables."
        mode="replace"
        onUpgrade={onUpgrade}
      >
        <GlassCard className="p-4">
          <h4 className="text-[10px] font-black tracking-widest uppercase border-b border-border-subtle/30 pb-2 mb-4" style={{ color: '#FFD60A' }}>
            White-Label & Branding
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Couleur d&apos;accent</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.theme_color || '#00FF41'}
                  onChange={e => handleChange('theme_color', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-border-subtle cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={config.theme_color || '#00FF41'}
                  onChange={e => handleChange('theme_color', e.target.value)}
                  className="flex-1 bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-secondary focus:border-accent-emerald outline-none min-h-[44px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase ml-1" style={{ color: 'var(--text-secondary)' }}>Nom de l&apos;application</label>
              <input
                type="text"
                value={config.mentor_name || ''}
                onChange={e => handleChange('mentor_name', e.target.value)}
                placeholder="Ex: Terminal Pro Trading"
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Badge SNIPER masqué · logo remplaçable · couleur d&apos;accent personnalisée.
            </p>
          </div>
        </GlassCard>
      </LockedFeature>

      {/* EMPIRE — exclusifs */}
      <LockedFeature currentPlan={planFeatures.plan} requiredPlan="empire" featureName="Blockchain Watcher" description="Vérification automatique des dépôts broker on-chain." mode="replace" onUpgrade={onUpgrade}>
        <GlassCard className="p-4 border border-[#FFD60A]/20">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFD60A] mb-2">⛓ Blockchain Watcher</h4>
          <p className="text-[10px] text-white/40">Surveillance des dépôts affiliés en temps réel.</p>
        </GlassCard>
      </LockedFeature>

      <LockedFeature currentPlan={planFeatures.plan} requiredPlan="empire" featureName="Support Prioritaire" description="Réponse garantie sous 24h par l'équipe SNIPER." mode="replace" onUpgrade={onUpgrade}>
        <GlassCard className="p-4 border border-[#FFD60A]/20">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFD60A] mb-2">🛡 Support Prioritaire</h4>
          <p className="text-[10px] text-white/40">Canal dédié · réponse &lt; 24h.</p>
        </GlassCard>
      </LockedFeature>

      <LockedFeature currentPlan={planFeatures.plan} requiredPlan="empire" featureName="Leaderboard Traders" description="Classement de vos meilleurs traders — phase 2." mode="replace" onUpgrade={onUpgrade}>
        <GlassCard className="p-4 border border-[#FFD60A]/20">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFD60A] mb-2">🏆 Leaderboard</h4>
          <p className="text-[10px] text-white/40">Gamification & engagement communauté.</p>
        </GlassCard>
      </LockedFeature>

      {planFeatures.hasAutoNotifications ? (
        <GlassCard className="p-4 border border-[#8B5CF6]/20">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8B5CF6] mb-1">🔔 Notifications Telegram auto</h4>
          <p className="text-[10px] text-white/40">Activées sur votre plan Premium+</p>
        </GlassCard>
      ) : (
        <LockedFeature
          currentPlan={planFeatures.plan}
          requiredPlan="premium"
          featureName="Notifications Auto Telegram"
          description="Envoyez automatiquement chaque signal, TP et SL à vos membres via Telegram en 0s."
          mode="replace"
          onUpgrade={onUpgrade}
        >
          <div />
        </LockedFeature>
      )}

      {/* BROKERS */}
      <GlassCard className="p-4">
        <div className="flex justify-between items-center border-b border-border-subtle/30 pb-2 mb-4">
          <h4 className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--text-secondary)' }}>Brokers Partenaires</h4>
          {brokers.length < planFeatures.maxBrokers && (
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
          {/* Active broker slots (up to planFeatures.maxBrokers) */}
          {brokers.slice(0, planFeatures.maxBrokers).map((b, idx) => (
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

          {/* Broker slots 2 & 3 — always visible when locked */}
          {planFeatures.maxBrokers < 2 && (
            <LockedFeature
              currentPlan={planFeatures.plan}
              requiredPlan="basic"
              featureName="Broker Partenaire 2"
              description="Ajoutez jusqu'à 3 brokers affiliés en Basic."
              mode="replace"
              onUpgrade={onUpgrade}
            />
          )}
          {planFeatures.maxBrokers < 3 && (
            <LockedFeature
              currentPlan={planFeatures.plan}
              requiredPlan="basic"
              featureName="Broker Partenaire 3"
              description="Ajoutez jusqu'à 3 brokers affiliés en Basic."
              mode="replace"
              onUpgrade={onUpgrade}
            />
          )}
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
              {t('settings_admin.vip_access')}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {t('settings_admin.vip_access_desc', 'Comment les membres débloquent les signaux premium ?')}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Mode selector — always show all options ───── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 }}>
            {([
              { id: 'broker' as VipModelOption, icon: '🤝', title: t('settings_admin.broker_model'), sub: t('settings_admin.broker_sub'), req: 'basic' as const },
              { id: 'payment' as VipModelOption, icon: '💳', title: t('settings_admin.payment'), sub: t('settings_admin.payment_sub'), req: 'basic' as const },
              { id: 'both' as VipModelOption, icon: '⚡', title: t('settings_admin.both_model'), sub: t('settings_admin.both_sub'), req: 'premium' as const },
            ]).map(opt => {
              const allowed = isVipModelAllowed(planFeatures, opt.id);
              if (!allowed) {
                return (
                  <LockedOptionChip
                    key={opt.id}
                    label={opt.title}
                    requiredPlan={opt.req}
                    onUpgrade={onUpgrade}
                  />
                );
              }
              const active = (config.vip_model || 'broker') === opt.id;
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
                    minHeight: 86, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: active ? '#00FF41' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.25, maxWidth: '100%', overflowWrap: 'anywhere' }}>
                    {opt.title}
                  </span>
                  {active && <span style={{ fontSize: 7, color: 'rgba(0,255,65,0.6)', textAlign: 'center', lineHeight: 1.3, maxWidth: '100%' }}>{opt.sub}</span>}
                </button>
              );
            })}
          </div>

          {/* ── Paiement manuel + TON — toujours visible (FOMO FREE) */}
          <LockedFeature
            currentPlan={planFeatures.plan}
            requiredPlan="free"
            featureName="Paiement Manuel"
            description="Tarifs VIP et facturation USDT manuelle — dès Basic."
            mode="blur"
            onUpgrade={onUpgrade}
          >
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

              {/* ── TON CONNECT — always visible ─────────────── */}
              <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: 'rgba(0,255,65,0.65)', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
                  Adresses paiement manuel
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'usdtTrc20', label: 'USDT TRC20', placeholder: 'T...' },
                    { key: 'usdtBep20', label: 'USDT BEP20', placeholder: '0x...' },
                    { key: 'usdtErc20', label: 'USDT ERC20', placeholder: '0x...' },
                  ].map(wallet => (
                    <div key={wallet.key}>
                      <label style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 5 }}>
                        {wallet.label}
                      </label>
                      <input
                        type="text"
                        value={config.wallets?.[wallet.key] || ''}
                        onChange={e => handleWalletChange(wallet.key, e.target.value)}
                        placeholder={wallet.placeholder}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', lineHeight: 1.5, marginTop: 10 }}>
                  Ces adresses apparaissent dans le modal membre. Le membre copie l'adresse, paie, puis envoie la capture au Telegram configuré ci-dessus.
                </div>
              </div>

              <LockedFeature
                currentPlan={planFeatures.plan}
                requiredPlan="premium"
                featureName="TON Connect"
                description="Paiements crypto automatiques en USDT. Confirmation en 30s."
                mode="replace"
                onUpgrade={onUpgrade}
              >
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
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#FFF',
                        position: 'absolute', top: 2, left: config.ton_payment_enabled ? 22 : 2,
                        transition: 'all 0.2s',
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
              </LockedFeature>
            </div>
          </LockedFeature>

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
              {t('settings_admin.academy_access')}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {t('settings_admin.academy_access_desc', 'Comment les membres débloquent les cours premium ?')}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Mode selector ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 }}>
            {([
              { id: 'payment', icon: '💳', title: t('settings_admin.payment'), sub: t('settings_admin.payment_sub') },
              { id: 'broker',  icon: '🤝', title: t('settings_admin.broker_model'),   sub: t('settings_admin.broker_sub') },
              { id: 'both',    icon: '⚡', title: t('settings_admin.both_model'), sub: t('settings_admin.both_sub') },
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
                    minHeight: 86, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: active ? '#FFD60A' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.25, maxWidth: '100%', overflowWrap: 'anywhere' }}>
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
