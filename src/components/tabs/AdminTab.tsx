import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Send, 
  Users, 
  GraduationCap, 
  Activity, 
  Eye, 
  User, 
  Lock, 
  X, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  ArrowDown, 
  ArrowRight 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';
import { Badge, GlassCard, TechHeader } from '../ui/Shared';
import { SubtlePremiumLoader } from '../SubtlePremiumLoader';
import MentorUpgradePage from '../MentorUpgradePage';
import { PlanBadge } from '../PlanBadge';
import { PremiumLoader } from '../PremiumLoader';

// Lazy load managers for better performance
const SignalManager = lazy(() => import('./Admin/SignalManager'));
const MemberManager = lazy(() => import('./Admin/MemberManager'));
const AcademyManager = lazy(() => import('./Admin/AcademyManager'));
const ProfileSettings = lazy(() => import('./Admin/ProfileSettings'));

const withTimeout = (promise: any, ms: number = 30000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délais d'attente dépassé (${ms / 1000}s)`));
    }, ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const AdminTab = ({ 
  onShowToast, 
  liveSignals, 
  setLiveSignals, 
  initialSubTab, 
  config, 
  features, 
  dbModules, 
  dbLessons, 
  setIsGlobalLoading, 
  setLoadingMessage, 
  setDbLessons, 
  setDbModules, 
  isScrolled,
  profilePhoto,
  onboardingJustFinished,
  onSaveSuccess
}: any) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab || 'signals');
  const [profileData, setProfileData] = useState<any>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [showGuide, setShowGuide] = useState(onboardingJustFinished);
  const [affiliates, setAffiliates] = useState<any[]>([]);

  useEffect(() => {
    if (activeSubTab === 'profil') {
      const fetchTenant = async () => {
        try {
          const { data, error } = await supabase.from('tenants').select('*').eq('tenant_id', TENANT_ID).single();
          if (error) throw error;
          if (data) {
            setProfileData({
              ...data,
              broker_links: [
                { name: data.broker_1_name, url: data.broker_1_url },
                { name: data.broker_2_name, url: data.broker_2_url },
                { name: data.broker_3_name, url: data.broker_3_url },
                { name: data.broker_4_name, url: data.broker_4_url },
                { name: data.broker_5_name, url: data.broker_5_url }
              ].filter(b => b.name && b.url),
              social_links: data.social_links || []
            });
          }
        } catch (err) {
          console.error("Error fetching admin profile:", err);
        }
      };
      fetchTenant();
    } else if (activeSubTab === 'affiliates') {
      const fetchAffiliates = async () => {
        try {
          const { data, error } = await supabase
            .from('affiliates')
            .select('*')
            .eq('tenant_id', TENANT_ID)
            .order('created_at', { ascending: false });
          if (error) throw error;
          setAffiliates(data || []);
        } catch (err) {
          console.error("Error fetching affiliates:", err);
        }
      };
      fetchAffiliates();
      
      const channel = supabase
        .channel('affiliates_admin_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliates', filter: `tenant_id=eq.${TENANT_ID}` }, fetchAffiliates)
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeSubTab]);

  const [newLesson, setNewLesson] = useState({ title: '', youtubeId: '', module_id: '', isFree: false });

  // ── Affiliates Management ──
  const manageAffiliate = async (id: string, status: 'active' | 'refused' | 'banned') => {
    try {
      const { error } = await supabase.from('affiliates').update({ status }).eq('id', id).eq('tenant_id', TENANT_ID);
      if (error) throw error;
      onShowToast(t('admin.status_updated', { status }));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const toggleVip = async (id: string, currentVip: boolean) => {
    try {
      const { error } = await supabase.from('affiliates').update({ is_vip: !currentVip }).eq('id', id).eq('tenant_id', TENANT_ID);
      if (error) throw error;
      onShowToast(t('admin.vip_updated'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const deleteAffiliate = async (id: string) => {
    if (!confirm(t('admin.delete_confirm'))) return;
    try {
      const { error } = await supabase.from('affiliates').delete().eq('id', id).eq('tenant_id', TENANT_ID);
      if (error) throw error;
      onShowToast(t('admin.user_deleted'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  // ── Academy Management ──
  const handleAddModule = async () => {
    const title = prompt(t('admin.module_title'));
    if (!title) return;
    try {
      const { error } = await supabase.from('academy_modules').insert([{ title, tenant_id: TENANT_ID, sort_order: dbModules.length }]);
      if (error) throw error;
      onShowToast(t('admin.module_created'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm(t('admin.delete_module_confirm'))) return;
    try {
      const { error } = await supabase.from('academy_modules').delete().eq('id', id).eq('tenant_id', TENANT_ID);
      if (error) throw error;
      onShowToast(t('admin.module_deleted'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.module_id) return onShowToast(t('admin.select_module_first'), 'error');
    try {
      const { error } = await supabase.from('academy_lessons').insert([{
        title: newLesson.title,
        youtube_id: newLesson.youtubeId,
        module_id: newLesson.module_id,
        tenant_id: TENANT_ID,
        is_free: newLesson.isFree,
        sort_order: dbLessons.length
      }]);
      if (error) throw error;
      onShowToast(t('admin.lesson_added'));
      setNewLesson({ title: '', youtubeId: '', module_id: '', isFree: false });
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm(t('admin.delete_lesson_confirm'))) return;
    try {
      const { error } = await supabase.from('academy_lessons').delete().eq('id', id).eq('tenant_id', TENANT_ID);
      if (error) throw error;
      onShowToast(t('admin.lesson_deleted'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const verifyBroker = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('affiliates').update({ is_broker_verified: !currentStatus }).eq('id', id).eq('tenant_id', TENANT_ID);
      if (error) throw error;
      onShowToast(t('admin.broker_verified_updated'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'profile' | 'logo'>('profile');

  const triggerProfileImageUpload = (type: 'profile' | 'logo') => {
    setUploadType(type);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGlobalLoading(true);
    setLoadingMessage(t('admin.uploading_image'));
    try {
      const { compressAndUpload } = await import('../../lib/upload');
      const url = await compressAndUpload(file, uploadType === 'logo' ? 'branding' : 'profiles', (msg) => onShowToast(msg));
      
      if (uploadType === 'logo') {
        const { error } = await supabase.from('tenants').update({ logo_url: url }).eq('tenant_id', TENANT_ID);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase.from('app_settings').select('value').eq('key', `profile_${TENANT_ID}`).single();
        const newValue = { ...(existing?.value || {}), profile_photo: url };
        const { error } = await supabase.from('app_settings').upsert({ 
          key: `profile_${TENANT_ID}`, 
          value: newValue, 
          tenant_id: TENANT_ID 
        });
        if (error) throw error;
      }
      
      onShowToast(t('admin.upload_success'));
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const { broker_links, ...rest } = profileData;
      const dataToUpsert = { ...rest, tenant_id: TENANT_ID };
      
      // Map back broker links
      if (broker_links) {
        for (let i = 0; i < 5; i++) {
          dataToUpsert[`broker_${i + 1}_name`] = broker_links[i]?.name || null;
          dataToUpsert[`broker_${i + 1}_url`] = broker_links[i]?.url || null;
        }
      }

      const { error } = await withTimeout(supabase.from('tenants').upsert(dataToUpsert));
      if (error) throw error;
      
      onShowToast(t('admin.save_success'));
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      onShowToast(err.message || t('admin.save_error'), "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (showUpgradeSheet) {
    return (
      <div className="relative pt-10">
        <button onClick={() => setShowUpgradeSheet(false)} className="fixed top-20 right-4 z-[600] p-2 bg-bg-surface border border-border-subtle rounded-full"><X size={20} /></button>
        <MentorUpgradePage config={config} />
      </div>
    );
  }

  return (
    <div className="flex flex-col no-scrollbar pb-20">
      <PremiumLoader isVisible={isSavingProfile} message={t('admin.saving_profile')} />
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
      
      <header className={`fixed ${isScrolled ? 'top-16' : 'top-24'} left-0 right-0 max-w-[430px] mx-auto z-[120] transition-all duration-200 border-b ${isScrolled ? 'bg-bg-void/70 backdrop-blur-xl border-border-subtle py-2' : 'bg-bg-void border-transparent pt-4 pb-3'} px-4 flex flex-col gap-2`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-xs font-black font-mono tracking-tighter text-text-primary uppercase">{t('admin.title')}</h2>
            <p className="text-[8px] text-accent-neon uppercase tracking-[0.2em] font-bold">{t('admin.subtitle')}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-accent-neon animate-pulse" />
        </div>
        
        <div className="flex p-1 bg-bg-void rounded-xl border border-border-subtle overflow-x-auto no-scrollbar gap-1">
          {([
            { id: 'signals',    label: t('admin.signals'),  icon: Send,           locked: false },
            { id: 'affiliates', label: t('admin.affiliates'),  icon: Users,          locked: false },
            { id: 'academy',    label: t('admin.academy'),  icon: GraduationCap,  locked: !features.hasAcademy },
            { id: 'stats',      label: t('admin.stats'),    icon: Activity,       locked: !features.hasAnalytics },
            { id: 'profil',     label: t('admin.profil'),   icon: User,           locked: false }
          ] as const).map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-none px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${activeSubTab === tab.id ? 'bg-accent-neon/20 text-accent-neon' : 'text-text-secondary'}`}
            >
              <tab.icon size={12} />
              {tab.label}
              {tab.locked && <Lock size={10} className="text-accent-warning" />}
            </button>
          ))}
        </div>
      </header>

      <div className={`space-y-4 px-4 transition-all duration-200 ${isScrolled ? 'pt-32' : 'pt-[140px]'} relative`}>
        {/* Plan Indicator */}
        <div className="p-3 bg-accent-neon/5 border border-accent-neon/10 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[9px] text-text-muted uppercase tracking-widest">{t('admin.active_infra')}</p>
            <PlanBadge plan={features.planName} />
          </div>
          {!features.isEmpire && (
            <button onClick={() => setShowUpgradeSheet(true)} className="px-3 py-1.5 border border-accent-neon/30 text-accent-neon text-[9px] font-black uppercase rounded-lg">
              {t('admin.upgrade_cta')}
            </button>
          )}
        </div>

        <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="animate-spin text-accent-neon" /></div>}>
          {activeSubTab === 'signals' && (
            <SignalManager 
              liveSignals={liveSignals}
              setLiveSignals={setLiveSignals}
              onShowToast={onShowToast}
              features={features}
              setIsGlobalLoading={setIsGlobalLoading}
              setLoadingMessage={setLoadingMessage}
            />
          )}
          
          {activeSubTab === 'affiliates' && (
            <MemberManager 
              affiliates={affiliates}
              features={features}
              onShowToast={onShowToast}
              manageAffiliate={manageAffiliate}
              toggleVip={toggleVip}
              deleteAffiliate={deleteAffiliate}
              verifyBroker={verifyBroker}
              setShowUpgradeSheet={setShowUpgradeSheet}
            />
          )}

          {activeSubTab === 'academy' && (
            <AcademyManager 
              dbModules={dbModules}
              dbLessons={dbLessons}
              features={features}
              onShowToast={onShowToast}
              handleAddModule={handleAddModule}
              handleDeleteModule={handleDeleteModule}
              handleAddLesson={handleAddLesson}
              handleDeleteLesson={handleDeleteLesson}
              newLesson={newLesson}
              setNewLesson={setNewLesson}
              setIsGlobalLoading={setIsGlobalLoading}
            />
          )}

          {activeSubTab === 'stats' && (
            <div className="space-y-4">
              <TechHeader title={t('admin.stats')} subtitle="Analytics Feed" />
              <div className="grid grid-cols-2 gap-3">
                <GlassCard className="flex flex-col gap-1">
                  <p className="text-[8px] text-text-secondary uppercase tracking-widest">{t('admin.total_members')}</p>
                  <p className="text-2xl font-black font-mono text-accent-neon">{affiliates.length}</p>
                </GlassCard>
                <GlassCard className="flex flex-col gap-1">
                  <p className="text-[8px] text-text-secondary uppercase tracking-widest">{t('admin.active_signals')}</p>
                  <p className="text-2xl font-black font-mono text-accent-neon">{liveSignals.filter((s: any) => s.status === 'LIVE').length}</p>
                </GlassCard>
              </div>
              <div className="p-8 border border-dashed border-border-subtle rounded-2xl text-center opacity-40">
                <Activity size={32} className="mx-auto mb-2 text-text-muted" />
                <p className="text-[9px] uppercase tracking-widest">Graphiques de performance bientôt disponibles</p>
              </div>
            </div>
          )}

          {activeSubTab === 'profil' && profileData && (
            <ProfileSettings 
              profileData={profileData}
              setProfileData={setProfileData}
              handleSaveProfile={handleSaveProfile}
              isSavingProfile={isSavingProfile}
              features={features}
              triggerProfileImageUpload={triggerProfileImageUpload}
              profilePhoto={profilePhoto}
              setShowUpgradeSheet={setShowUpgradeSheet}
              t={t}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default AdminTab;
