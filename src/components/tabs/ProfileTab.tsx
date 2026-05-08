import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LogOut, 
  User, 
  ShieldCheck, 
  Pencil, 
  ImageIcon, 
  TrendingUp, 
  Activity, 
  Clock, 
  Trash2, 
  GraduationCap, 
  Plus, 
  ChevronRight, 
  Send, 
  MessageCircle, 
  Youtube, 
  Instagram, 
  Smartphone, 
  Globe 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';
import { compressAndUpload } from '../../lib/upload';
import { Badge, GlassCard } from '../ui/Shared';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { ThemeToggle } from '../StatusBar';

const ProfileTab = ({ user, isAdmin, onLogout, onShowToast, profileImages, content, onTabChange, config, tenantProfile, onContentUpdate, isScrolled, setShowCoachingModal, setShowVipModal, onPublicProfileGuide, setPublicProfileGuide }: any) => {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempText, setTempText] = useState("");
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);

  const features = usePlanFeatures(config?.plan || 'free');

  const handleUpdateContent = async (field: string, value: any) => {
    setIsUpdating(true);
    const newValue = { ...content, [field]: value };
    onContentUpdate(newValue);
    await supabase.from('app_settings').upsert({ key: `content_${TENANT_ID}`, tenant_id: TENANT_ID, value: newValue });
    setIsUpdating(false);
    setEditingField(null);
  };

  const handleImageClick = (key: string) => {
    if (!isAdmin) return;
    setUploadKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadKey) return;
    setIsUploading(uploadKey);
    const url = await compressAndUpload(file, 'profile', (msg) => onShowToast(msg));
    const { data: current } = await supabase.from('app_settings').select('value').eq('key', `profile_${TENANT_ID}`).eq('tenant_id', TENANT_ID).single();
    const newValue = { ...(current?.value || {}), [uploadKey]: url };
    await supabase.from('app_settings').upsert({ key: `profile_${TENANT_ID}`, tenant_id: TENANT_ID, value: newValue });
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: { [uploadKey]: url } }));
    setIsUploading(null);
  };

  return (
    <div className="no-scrollbar flex flex-col pb-20">
      <div className={`fixed ${isScrolled ? 'top-16' : 'top-20'} right-4 z-[130] flex gap-2`}>
        <button onClick={onLogout} className="p-2 bg-accent-danger/10 text-accent-danger rounded-lg border border-accent-danger/20 flex items-center gap-1 text-[10px] font-bold uppercase">
          <LogOut size={14} /> {t('common.logout')}
        </button>
      </div>

      <div className={`space-y-6 px-4 pt-10 fade-in-up`}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4 pt-4">
          <div className="relative group cursor-pointer" onClick={() => handleImageClick('profile')}>
            <div className="w-32 h-32 rounded-full border-4 border-accent-neon overflow-hidden relative shadow-lg">
              {profileImages.profile ? (
                <img src={profileImages.profile} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-bg-surface flex items-center justify-center text-accent-neon"><User size={60} /></div>
              )}
              {isUploading === 'profile' && <div className="absolute inset-0 bg-bg-void/80 flex items-center justify-center"><Activity size={24} className="animate-spin text-accent-neon" /></div>}
            </div>
            {isAdmin && <div className="absolute bottom-0 right-0 p-2 bg-accent-neon rounded-full border-2 border-bg-void"><Pencil size={14} className="text-bg-void" /></div>}
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black uppercase tracking-tighter">{tenantProfile?.mentor_name || content.aboutTitle}</h2>
            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">{tenantProfile?.speciality || content.aboutSubtitle}</p>
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'PRO-LEVEL', value: tenantProfile?.years_exp || '5+', sub: t('admin.years_exp') },
            { label: 'FIDÉLITÉ', value: tenantProfile?.traders_count || '500+', sub: t('admin.traders_count') },
            { label: 'PRECISION', value: '89%', sub: 'WIN RATE' },
          ].map(s => (
            <div key={s.label} className="bg-bg-surface border border-border-subtle rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-[10px] font-black text-accent-neon mb-1 uppercase">{s.value}</span>
              <span className="text-[7px] text-text-muted uppercase tracking-widest font-bold">{s.sub}</span>
            </div>
          ))}
        </div>

        {/* Vision Card */}
        <GlassCard className="p-5 space-y-4 border-accent-neon/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-neon/10 flex items-center justify-center text-accent-neon">
              <TrendingUp size={16} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest">{tenantProfile?.vision_title || content.visionTitle}</h3>
          </div>
          <p className="text-xs italic leading-relaxed text-text-primary">"{tenantProfile?.vision_text || content.visionText}"</p>
        </GlassCard>

        {/* Brokers Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] text-text-muted uppercase tracking-widest font-bold flex items-center gap-2 px-1">
            <ShieldCheck size={14} className="text-accent-neon" /> {t('profile.partner_broker')}
          </h3>
          <div className="grid gap-2">
            {[
              { name: tenantProfile?.broker_1_name, url: tenantProfile?.broker_1_url },
              { name: tenantProfile?.broker_2_name, url: tenantProfile?.broker_2_url },
              { name: tenantProfile?.broker_3_name, url: tenantProfile?.broker_3_url },
            ].filter(b => b.name && b.url).map((b, i) => (
              <a 
                key={i}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-bg-surface border border-border-subtle rounded-2xl hover:border-accent-neon/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-neon/5 flex items-center justify-center text-accent-neon">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{b.name}</p>
                    <p className="text-[8px] text-text-muted uppercase tracking-widest">{t('profile.account_setup')}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
              </a>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section className="space-y-4">
          <h3 className="text-[10px] text-text-muted uppercase tracking-widest font-bold flex items-center gap-2 px-1">
            <Activity size={14} className="text-accent-neon" /> {t('profile.timeline')}
          </h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-accent-neon before:to-transparent">
            {(tenantProfile?.timeline || []).length > 0 ? (
              tenantProfile.timeline.map((step: any, i: number) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[20px] top-1 w-3 h-3 rounded-full bg-bg-void border-2 border-accent-neon z-10" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-accent-neon font-mono tracking-tighter">{step.year}</span>
                    <p className="text-xs font-medium text-text-primary leading-snug">{step.milestone}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-text-muted italic">Aucun jalon défini</p>
            )}
          </div>
        </section>

        {/* Elite Coaching Section */}
        {tenantProfile?.is_coaching_active && (
          <section className="pt-4">
            <div className="neon-border glass-card p-5 bg-accent-neon/5 relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-neon/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-neon flex items-center justify-center text-bg-base shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                  <GraduationCap size={28} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black uppercase tracking-tight text-text-primary">Elite Coaching</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed mt-0.5">Accompagnement VIP sur-mesure pour traders ambitieux.</p>
                </div>
              </div>
              <button 
                onClick={() => window.open(tenantProfile.coaching_url, '_blank')}
                className="w-full py-4 bg-accent-neon text-bg-base font-black rounded-xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                RÉSERVER MA PLACE →
              </button>
            </div>
          </section>
        )}

        {/* Social Links */}
        <section className="flex justify-center gap-6 py-6 opacity-60">
           {tenantProfile?.social_links?.map((s: any, i: number) => (
             <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent-neon transition-colors">
               {s.type === 'instagram' && <Instagram size={20} />}
               {s.type === 'telegram' && <Send size={20} />}
               {s.type === 'youtube' && <Youtube size={20} />}
               {s.type === 'globe' && <Globe size={20} />}
             </a>
           ))}
        </section>
      </div>
    </div>
  );
};

export default ProfileTab;
