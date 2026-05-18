import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Link, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';

export default function AdminSettings() {
  const [config, setConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase.from('tenants_config').select('*').eq('tenant_id', TENANT_ID).single();
      if (data) setConfig(data);
    }
    loadConfig();
  }, []);

  const handleChange = (field: string, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    const parentObj = config[parent] || {};
    setConfig({ ...config, [parent]: { ...parentObj, [field]: value } });
  };

  const handleArrayAdd = (field: string, defaultObj: any) => {
    const arr = Array.isArray(config[field]) ? config[field] : [];
    setConfig({ ...config, [field]: [...arr, defaultObj] });
  };

  const handleArrayRemove = (field: string, index: number) => {
    const arr = Array.isArray(config[field]) ? config[field] : [];
    setConfig({ ...config, [field]: arr.filter((_: any, i: number) => i !== index) });
  };

  const handleArrayUpdate = (field: string, index: number, key: string, value: any) => {
    const arr = Array.isArray(config[field]) ? [...config[field]] : [];
    if (typeof arr[index] === 'string') {
      arr[index] = value;
    } else {
      arr[index] = { ...arr[index], [key]: value };
    }
    setConfig({ ...config, [field]: arr });
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('tenants_config').upsert({ ...config, tenant_id: TENANT_ID, updated_at: new Date().toISOString() });
    setSaving(false);
    alert('Paramètres sauvegardés avec succès.');
  };

  const handleRestartTour = async () => {
    if (window.confirm('Voulez-vous relancer le tutoriel interactif ?')) {
      await supabase
        .from('tenants_config')
        .upsert({ tenant_id: TENANT_ID, onboarding_completed: false, updated_at: new Date().toISOString() });
      window.location.reload();
    }
  };

  if (!config.tenant_id) return <div className="p-4 text-[var(--text-muted)] text-center">Chargement...</div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
        <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--accent-emerald)] flex items-center gap-2">
          <Settings size={18} /> Configuration
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button onClick={handleRestartTour} className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg text-xs font-bold uppercase hover:border-[var(--accent-emerald)] min-h-[44px]">
            Relancer Tutoriel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--accent-emerald)] text-black rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 min-h-[44px]">
            {saving ? '...' : <><Save size={14} /> Enregistrer</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-[16px]">
        {/* Identité */}
        <div className="glass-card p-[14px] rounded-[12px] space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Identité</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Nom du Mentor</label>
              <input type="text" value={config.mentor_name || ''} onChange={e => handleChange('mentor_name', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Sous-titre</label>
              <input type="text" value={config.mentor_subtitle || ''} onChange={e => handleChange('mentor_subtitle', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">URL Photo Profil</label>
              <input type="text" value={config.mentor_photo_url || ''} onChange={e => handleChange('mentor_photo_url', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none font-mono text-[10px] min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">URL Bannière</label>
              <input type="text" value={config.banner_url || ''} onChange={e => handleChange('banner_url', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none font-mono text-[10px] min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Vision (À propos)</label>
              <textarea rows={3} value={config.mentor_vision || ''} onChange={e => handleChange('mentor_vision', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none resize-none"></textarea>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold tracking-widest uppercase">Badges Dynamiques</label>
                <button onClick={() => handleArrayAdd('mentor_badges', 'Nouveau Badge')} className="text-[var(--accent-emerald)] min-h-[44px] min-w-[44px] flex items-center justify-center"><Plus size={14}/></button>
              </div>
              <div className="space-y-2">
                {(config.mentor_badges || []).map((badge: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" value={badge} onChange={e => handleArrayUpdate('mentor_badges', idx, '', e.target.value)} className="flex-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs outline-none min-h-[44px]" />
                    <button onClick={() => handleArrayRemove('mentor_badges', idx)} className="p-1.5 text-red-500 bg-red-500/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Système */}
        <div className="space-y-6">
          <div className="glass-card p-[14px] rounded-[12px] space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Système</h3>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Mode Trading Actif</label>
              <select value={config.trading_mode || 'forex'} onChange={e => handleChange('trading_mode', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-bold uppercase outline-none min-h-[44px]">
                <option value="forex">Forex & Indices (Classique)</option>
                <option value="binary">Options Binaires</option>
                <option value="both">Les Deux (Hybride)</option>
              </select>
            </div>
          </div>

          {/* Contacts */}
          <div className="glass-card p-[14px] rounded-[12px] space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Contacts</h3>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Username Telegram (sans @)</label>
              <input type="text" value={config.telegram_username || ''} onChange={e => handleChange('telegram_username', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none font-mono min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Numéro WhatsApp (avec indicatif)</label>
              <input type="text" value={config.whatsapp_number || ''} onChange={e => handleChange('whatsapp_number', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none font-mono min-h-[44px]" />
            </div>
          </div>

          {/* Paiements & Access Rules */}
          <div className="glass-card p-[14px] rounded-[12px] space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Monétisation & Accès</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 text-[var(--accent-emerald)]">Prix Signaux ($)</label>
                <input type="number" value={config.signals_price || 0} onChange={e => handleChange('signals_price', Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Durée Signaux</label>
                <select value={config.signals_duration || 'monthly'} onChange={e => handleChange('signals_duration', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-xs outline-none min-h-[44px]">
                  <option value="monthly">Mensuel</option>
                  <option value="lifetime">À vie</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 text-[var(--accent-gold)]">Prix Academy ($)</label>
                <input type="number" value={config.academy_price || 0} onChange={e => handleChange('academy_price', Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-mono text-sm outline-none min-h-[44px]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">Durée Academy</label>
                <select value={config.academy_duration || 'lifetime'} onChange={e => handleChange('academy_duration', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-xs outline-none min-h-[44px]">
                  <option value="monthly">Mensuel</option>
                  <option value="lifetime">À vie</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)] min-h-[44px]">
              <input type="checkbox" checked={config.grant_all_on_payment || false} onChange={e => handleChange('grant_all_on_payment', e.target.checked)} className="accent-[var(--accent-emerald)] w-5 h-5" />
              <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)] cursor-pointer leading-tight">Un paiement débloque TOUT (Signaux + Academy)</label>
            </div>
            
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 text-[var(--text-secondary)]">Wallets Crypto</label>
              <div className="space-y-2">
                <input type="text" placeholder="USDT TRC20" value={config.wallets?.usdtTrc20 || ''} onChange={e => handleNestedChange('wallets', 'usdtTrc20', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono outline-none min-h-[44px]" />
                <input type="text" placeholder="TON Address" value={config.wallets?.ton || ''} onChange={e => handleNestedChange('wallets', 'ton', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono outline-none min-h-[44px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Brokers Dynamiques */}
        <div className="glass-card p-[14px] rounded-[12px] space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]">Brokers Partenaires</h3>
            <button onClick={() => handleArrayAdd('brokers', { name: 'Nouveau Broker', affiliateLink: '', iconUrl: '' })} className="text-[var(--accent-emerald)] flex items-center gap-1 text-[10px] uppercase font-bold min-h-[44px] px-2"><Plus size={12}/> Ajouter</button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {(config.brokers || []).map((b: any, idx: number) => (
              <div key={idx} className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-subtle)] relative">
                <button onClick={() => handleArrayRemove('brokers', idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={16} /></button>
                <div className="space-y-2 pr-10">
                  <input type="text" placeholder="Nom du Broker" value={b.name || ''} onChange={e => handleArrayUpdate('brokers', idx, 'name', e.target.value)} className="w-full bg-transparent border-b border-[var(--border-subtle)] px-1 py-1 text-sm font-bold outline-none focus:border-[var(--accent-emerald)] min-h-[44px]" />
                  <div className="flex items-center gap-2 text-[var(--text-muted)] focus-within:text-[var(--accent-emerald)]">
                    <Link size={12} />
                    <input type="text" placeholder="Lien d'affiliation" value={b.affiliateLink || ''} onChange={e => handleArrayUpdate('brokers', idx, 'affiliateLink', e.target.value)} className="w-full bg-transparent border-b border-[var(--border-subtle)] px-1 py-1 text-[10px] font-mono outline-none focus:border-[var(--accent-emerald)] text-[var(--text-primary)] min-h-[44px]" />
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)] focus-within:text-[var(--accent-emerald)]">
                    <ImageIcon size={12} />
                    <input type="text" placeholder="URL Logo" value={b.iconUrl || ''} onChange={e => handleArrayUpdate('brokers', idx, 'iconUrl', e.target.value)} className="w-full bg-transparent border-b border-[var(--border-subtle)] px-1 py-1 text-[10px] font-mono outline-none focus:border-[var(--accent-emerald)] text-[var(--text-primary)] min-h-[44px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
