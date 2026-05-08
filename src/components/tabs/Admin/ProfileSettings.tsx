import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Activity, 
  ImageIcon, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Zap, 
  BadgePercent, 
  CreditCard, 
  Loader2, 
  ShieldAlert,
  Share2
} from 'lucide-react';
import { PlanBadge } from '../../PlanBadge';
import { NeonToggle } from '../../MasterControlPanel';

const FeatureLock = ({ children, feature, label, isAdmin, onUpgrade }: any) => {
  if (!feature && !isAdmin) {
    return (
      <div className="relative group cursor-not-allowed">
        <div className="opacity-40 grayscale pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-all">
          <button type="button" onClick={onUpgrade} className="bg-accent-warning text-bg-base px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">UPGRADE {label}</button>
        </div>
      </div>
    );
  }
  return children;
};

const ProfileSettings = ({ 
  profileData, 
  setProfileData, 
  handleSaveProfile, 
  isSavingProfile, 
  features, 
  triggerProfileImageUpload, 
  profilePhoto, 
  setShowUpgradeSheet,
  t 
}: any) => {
  return (
    <form onSubmit={handleSaveProfile} className="space-y-8 pb-20">
      <section className="space-y-4">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <User size={16} /> {t('admin.identity')}
        </h3>

        <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border-subtle rounded-2xl">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-bg-elevated border border-border-subtle flex items-center justify-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-text-muted" />
              )}
            </div>
            <button
              type="button"
              onClick={() => triggerProfileImageUpload('profile')}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent-neon text-bg-base rounded-full border-2 border-bg-base flex items-center justify-center shadow-lg"
            >
              <ImageIcon size={14} />
            </button>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-black text-text-primary uppercase tracking-widest">Avatar Terminal</p>
            <p className="text-[9px] text-text-secondary leading-relaxed">Format carré recommandé. Max 2MB.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <FeatureLock feature={features.canCustomizeName} label="Nom Custom" isAdmin={true} onUpgrade={() => setShowUpgradeSheet(true)}>
            <div className="space-y-1.5">
              <label className="text-[10px] text-text-secondary uppercase font-bold px-1">{t('admin.mentor_name')}</label>
              <input 
                className="w-full h-12 bg-bg-elevated border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-neon outline-none transition-all" 
                value={profileData?.mentor_name || ''} 
                onChange={e => setProfileData({...profileData, mentor_name: e.target.value})} 
                placeholder="Ex: John Doe"
              />
            </div>
          </FeatureLock>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-text-secondary uppercase font-bold px-1">{t('admin.speciality')}</label>
              <input 
                className="w-full h-12 bg-bg-elevated border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-neon outline-none" 
                value={profileData?.speciality || ''} 
                onChange={e => setProfileData({...profileData, speciality: e.target.value})} 
                placeholder="Ex: ICT / SMC"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-text-secondary uppercase font-bold px-1">{t('admin.years_exp')}</label>
              <input 
                className="w-full h-12 bg-bg-elevated border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-neon outline-none" 
                value={profileData?.years_exp || ''} 
                onChange={e => setProfileData({...profileData, years_exp: e.target.value})} 
                placeholder="Ex: 5"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <MessageCircle size={16} /> {t('admin.vision_and_bio')}
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-secondary uppercase font-bold px-1">{t('admin.vision_title')}</label>
            <input 
              className="w-full h-12 bg-bg-elevated border border-border-subtle rounded-xl px-4 text-sm text-text-primary focus:border-accent-neon outline-none" 
              value={profileData?.vision_title || ''} 
              onChange={e => setProfileData({...profileData, vision_title: e.target.value})} 
              placeholder="Ex: Ma Vision du Trading"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-secondary uppercase font-bold px-1">{t('admin.vision_text')}</label>
            <textarea 
              className="w-full h-32 bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-neon outline-none resize-none" 
              value={profileData?.vision_text || ''} 
              onChange={e => setProfileData({...profileData, vision_text: e.target.value})} 
              placeholder="Décrivez votre approche..."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} /> {t('admin.timeline')}
          </h3>
          <button 
            type="button"
            onClick={() => {
              const newTimeline = [...(profileData.timeline || []), { year: '', milestone: '' }];
              setProfileData({...profileData, timeline: newTimeline});
            }}
            className="p-2 bg-accent-neon/10 text-accent-neon rounded-lg"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {(profileData?.timeline || []).map((step: any, idx: number) => (
            <div key={idx} className="flex gap-2 items-start">
              <input 
                className="w-20 bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-bold text-center" 
                placeholder="2024"
                value={step.year}
                onChange={e => {
                  const newT = [...profileData.timeline];
                  newT[idx].year = e.target.value;
                  setProfileData({...profileData, timeline: newT});
                }}
              />
              <input 
                className="flex-1 bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs" 
                placeholder="Événement marquant"
                value={step.milestone}
                onChange={e => {
                  const newT = [...profileData.timeline];
                  newT[idx].milestone = e.target.value;
                  setProfileData({...profileData, timeline: newT});
                }}
              />
              <button 
                type="button"
                onClick={() => {
                  const newT = profileData.timeline.filter((_: any, i: number) => i !== idx);
                  setProfileData({...profileData, timeline: newT});
                }}
                className="p-2.5 text-accent-red"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <Zap size={16} /> {t('profile.partner_broker')}
        </h3>
        <div className="space-y-3">
          {(profileData?.broker_links || []).map((link: any, idx: number) => (
            <div key={idx} className="flex gap-2 items-end bg-bg-surface p-3 rounded-2xl border border-border-subtle">
              <div className="flex-1 space-y-2">
                <input 
                  placeholder="Nom du Broker" 
                  className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary" 
                  value={link.name} 
                  onChange={e => {
                    const newLinks = [...(profileData.broker_links || [])];
                    newLinks[idx].name = e.target.value;
                    setProfileData({...profileData, broker_links: newLinks});
                  }} 
                />
                <input 
                  placeholder="Lien d'affiliation" 
                  className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary" 
                  value={link.url} 
                  onChange={e => {
                    const newLinks = [...(profileData.broker_links || [])];
                    newLinks[idx].url = e.target.value;
                    setProfileData({...profileData, broker_links: newLinks});
                  }} 
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  const newLinks = (profileData.broker_links || []).filter((_: any, i: number) => i !== idx);
                  setProfileData({...profileData, broker_links: newLinks});
                }}
                className="p-3 bg-accent-red/10 text-accent-red rounded-xl"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(profileData?.broker_links || []).length < features.brokerLimit && (
            <button 
              type="button"
              onClick={() => {
                const newLinks = [...(profileData.broker_links || []), { name: '', url: '' }];
                setProfileData({...profileData, broker_links: newLinks});
              }}
              className="w-full py-4 border-2 border-dashed border-border-subtle rounded-2xl text-[10px] font-black uppercase text-text-secondary hover:text-accent-neon transition-all"
            >
              + {t('admin.add_broker')}
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <CreditCard size={16} /> {t('admin.access_model')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-bg-surface border border-border-subtle rounded-2xl space-y-3">
             <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest">PAIEMENT DIRECT</p>
                <NeonToggle 
                  checked={profileData?.is_payment_active || false} 
                  onChange={(checked) => setProfileData({...profileData, is_payment_active: checked})} 
                />
             </div>
             <input 
              type="number"
              className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-2 text-sm font-bold font-mono"
              placeholder="Prix en TON"
              value={profileData?.payment_price || ''}
              onChange={e => setProfileData({...profileData, payment_price: parseFloat(e.target.value) || 0})}
             />
          </div>
          <div className="p-4 bg-bg-surface border border-border-subtle rounded-2xl flex flex-col justify-center gap-3">
             <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest">MODÈLE BROKER</p>
                <NeonToggle 
                  checked={profileData?.is_broker_active !== false} 
                  onChange={(checked) => setProfileData({...profileData, is_broker_active: checked})} 
                />
             </div>
             <p className="text-[8px] text-text-secondary leading-tight uppercase font-mono">Validation manuelle via ID Affilié</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <BadgePercent size={16} /> Elite Coaching
        </h3>
        <FeatureLock feature={features.canConfigureEliteCoaching} label="Coaching" isAdmin={true} onUpgrade={() => setShowUpgradeSheet(true)}>
          <div className="p-4 bg-bg-surface border border-border-subtle rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest">Section Coaching</p>
                <p className="text-[8px] text-text-muted">Affiche un bouton "Coaching" sur votre profil</p>
              </div>
              <NeonToggle 
                checked={profileData?.is_coaching_active || false} 
                onChange={(checked) => setProfileData({...profileData, is_coaching_active: checked})} 
              />
            </div>
            {profileData?.is_coaching_active && (
              <input 
                className="w-full h-11 bg-bg-void border border-border-subtle rounded-xl px-4 text-xs font-bold text-accent-neon" 
                placeholder="Lien Calendly ou Telegram"
                value={profileData?.coaching_url || ''}
                onChange={e => setProfileData({...profileData, coaching_url: e.target.value})}
              />
            )}
          </div>
        </FeatureLock>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <Share2 size={16} /> Social Links
        </h3>
        <FeatureLock feature={features.canConfigureSocialLinks} label="Réseaux Sociaux" isAdmin={true} onUpgrade={() => setShowUpgradeSheet(true)}>
          <div className="space-y-3">
            {(profileData?.social_links || []).map((link: any, idx: number) => (
              <div key={idx} className="flex gap-2 items-center bg-bg-surface p-3 rounded-2xl border border-border-subtle">
                <select 
                  className="w-24 bg-bg-void border border-border-subtle rounded-xl px-2 py-2 text-[10px] font-bold uppercase"
                  value={link.type}
                  onChange={e => {
                    const newS = [...profileData.social_links];
                    newS[idx].type = e.target.value;
                    setProfileData({...profileData, social_links: newS});
                  }}
                >
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="youtube">YouTube</option>
                  <option value="globe">Website</option>
                </select>
                <input 
                  placeholder="URL ou @Username" 
                  className="flex-1 bg-bg-void border border-border-subtle rounded-xl px-3 py-2 text-xs"
                  value={link.url}
                  onChange={e => {
                    const newS = [...profileData.social_links];
                    newS[idx].url = e.target.value;
                    setProfileData({...profileData, social_links: newS});
                  }}
                />
                <button 
                  type="button"
                  onClick={() => {
                    const newS = profileData.social_links.filter((_: any, i: number) => i !== idx);
                    setProfileData({...profileData, social_links: newS});
                  }}
                  className="p-2 text-accent-red"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {(profileData?.social_links || []).length < (features.socialLimit || 3) && (
              <button 
                type="button"
                onClick={() => {
                  const newS = [...(profileData.social_links || []), { type: 'instagram', url: '' }];
                  setProfileData({...profileData, social_links: newS});
                }}
                className="w-full py-4 border-2 border-dashed border-border-subtle rounded-2xl text-[10px] font-black uppercase text-text-secondary"
              >
                + AJOUTER UN RÉSEAU
              </button>
            )}
          </div>
        </FeatureLock>
      </section>

      <section className="space-y-4 pt-6 border-t border-border-subtle">
        <h3 className="text-xs font-black text-accent-neon uppercase tracking-widest flex items-center gap-2 px-1">
          <Activity size={16} /> Theme & Brand
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">Accent Color</label>
            <div className="flex items-center gap-3 p-3 bg-bg-surface border border-border-subtle rounded-xl">
              <input 
                type="color" 
                className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer"
                value={profileData?.brand_color || '#00FF41'}
                onChange={e => setProfileData({...profileData, brand_color: e.target.value})}
              />
              <span className="text-[10px] font-mono text-text-primary uppercase">{profileData?.brand_color || '#00FF41'}</span>
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">Logo Terminal</label>
             <button 
              type="button"
              onClick={() => triggerProfileImageUpload('logo')}
              className="w-full h-14 border border-dashed border-border-subtle rounded-xl flex items-center justify-center text-text-muted hover:text-accent-neon transition-all"
             >
               <Plus size={20} />
             </button>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-void via-bg-void/90 to-transparent z-[200]">
        <button 
          type="submit" 
          disabled={isSavingProfile}
          className="w-full max-w-[400px] mx-auto h-14 bg-accent-neon text-bg-base rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(0,255,65,0.3)] flex items-center justify-center active:scale-95 transition-all"
        >
          {isSavingProfile ? <Loader2 className="animate-spin" /> : t('admin.save_all_changes')}
        </button>
      </div>
    </form>
  );
};

export default ProfileSettings;
