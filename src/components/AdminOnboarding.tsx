import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MessageCircle, 
  CreditCard, 
  ShieldCheck, 
  ArrowRight, 
  Loader2,
  Camera,
  CheckCircle2,
  Smartphone,
  Globe,
  Settings,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ONBOARDING_STEPS } from '../constants/onboarding';
import { compressAndUpload } from '../lib/upload';

interface AdminOnboardingProps {
  tenantId: string;
  initialStep?: number;
  config: any;
  onComplete: () => void;
  profilePhoto?: string | null;
}

const AdminOnboarding: React.FC<AdminOnboardingProps> = ({ tenantId, initialStep, config, onComplete, profilePhoto }) => {
  const [step, setStep] = useState(initialStep || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<any>({
    mentor_name: config.mentorName || '',
    mentor_photo_url: profilePhoto || null,
    telegram_username: config.socialTelegram || '',
    whatsapp_number: config.whatsappUrl || '',
    wallets: config.wallets || { usdtTrc20: '', ton: config.tonWallet || '' },
    signals_duration_model: config.signalsDurationModel || 'monthly',
    academy_duration_model: config.academyDurationModel || 'lifetime',
    vip_model: config.vipModel || 'payment',
    academy_model: config.academyModel || 'broker'
  });

  useEffect(() => {
    if (profilePhoto && !formData.mentor_photo_url) {
      setFormData((prev: any) => ({ ...prev, mentor_photo_url: profilePhoto }));
    }
  }, [profilePhoto]);

  const currentStepData = ONBOARDING_STEPS.find(s => s.step === step);

  const handleNext = async () => {
    if (isSubmitting) return;

    // Check required fields
    const required = currentStepData?.required || [];
    const missing = required.filter(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return !formData[parent]?.[child];
      }
      return !formData[field];
    });

    if (missing.length > 0) {
      alert(`Veuillez remplir les champs obligatoires: ${missing.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 0. Ensure affiliate record exists and is linked to this tenant to satisfy security triggers
      if (user) {
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id, tenant_id')
          .eq('id', user.id)
          .single();
        
        const affiliateData = {
          id: user.id,
          tenant_id: tenantId,
          role: 'mentor',
          name: formData.mentor_name || 'Mentor',
          email: user.email || `${tenantId}@mrtech.local`
        };

        if (!existingAffiliate) {
          console.log('AdminOnboarding: Creating initial affiliate record for mentor');
          await supabase.from('affiliates').insert([affiliateData]);
        } else if (existingAffiliate.tenant_id !== tenantId) {
          console.log('AdminOnboarding: Updating affiliate tenant link');
          await supabase.from('affiliates').update({ tenant_id: tenantId, role: 'mentor' }).eq('id', user.id);
        }
      }

      // 1. Update Profile Photo in app_settings (Separate from branding logo)
      if (formData.mentor_photo_url) {
        // Fetch current profile settings to merge
        const { data: currentSettings } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', `profile_${tenantId}`)
          .eq('tenant_id', tenantId)
          .single();

        const newValue = { 
          ...(currentSettings?.value || {}), 
          profile: formData.mentor_photo_url 
        };

        await supabase
          .from('app_settings')
          .upsert({
            key: `profile_${tenantId}`,
            tenant_id: tenantId,
            value: newValue
          }, { onConflict: 'key' });
      }

      // 2. Update Basic Tenant Info
      const { error } = await supabase
        .from('tenants')
        .update({
          onboarding_step: step + 1,
          wallets: formData.wallets,
          signals_duration_model: formData.signals_duration_model,
          academy_duration_model: formData.academy_duration_model,
          vip_model: formData.vip_model,
          academy_model: formData.academy_model,
          mentor_name: formData.mentor_name,
          // logo_url is NOT updated here anymore as requested by user
          social_telegram: formData.telegram_username,
          whatsapp_url: formData.whatsapp_number,
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      if (step < 4) {
        setStep(step + 1);
      } else {
        // Final completion
        await supabase
          .from('tenants')
          .update({
            onboarding_completed: true,
            onboarding_step: 4
          })
          .eq('tenant_id', tenantId);
        onComplete();
      }
    } catch (err: any) {
      console.error('Onboarding step save error:', err);
      alert('Erreur lors de la sauvegarde: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await compressAndUpload(file, 'profile');
      setFormData({ ...formData, mentor_photo_url: url });
    } catch (err) {
      console.error('Logo upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-bg-void flex flex-col items-center justify-start overflow-y-auto no-scrollbar pt-10 px-6">
      <div className="noise-overlay" />
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="aura-glow top-[-10%] left-[-10%] w-[100%] h-[50%] bg-accent-neon/10" />
        <div className="aura-glow bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-accent-neon/5" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 pb-20">
        {/* Progress Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black font-mono text-accent-neon tracking-widest uppercase">
              Étape {step} de 4
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(s => (
                <div 
                  key={s} 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${s === step ? 'bg-accent-neon scale-125 shadow-[0_0_10px_rgba(0,255,65,0.8)]' : s < step ? 'bg-accent-neon/40' : 'bg-bg-elevated'}`} 
                />
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-text-primary uppercase">{currentStepData?.title}</h1>
            <p className="text-xs text-text-secondary font-medium tracking-wide">{currentStepData?.description}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {step === 1 && (
              <div className="space-y-6 bg-bg-surface backdrop-blur-xl border border-border-subtle p-6 rounded-3xl">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-border-subtle flex items-center justify-center overflow-hidden bg-bg-elevated/50 group-hover:border-accent-neon transition-all">
                      {formData.mentor_photo_url ? (
                        <img src={formData.mentor_photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-text-muted" size={32} />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="text-accent-neon animate-spin" size={24} />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-accent-neon text-bg-void p-2 rounded-xl cursor-pointer shadow-xl active:scale-90 transition-all">
                      <Camera size={16} />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                  <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Photo de profil</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest px-1">Nom du Mentor</label>
                  <input 
                    type="text"
                    value={formData.mentor_name}
                    onChange={e => setFormData({ ...formData, mentor_name: e.target.value })}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 focus:neon-border outline-none transition-all text-sm font-bold"
                    placeholder="ex: CRYPTO KING"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 bg-bg-surface backdrop-blur-xl border border-border-subtle p-6 rounded-3xl">
                <div className="space-y-2">
                  <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest px-1">Username Telegram</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">@</div>
                    <input 
                      type="text"
                      value={formData.telegram_username}
                      onChange={e => setFormData({ ...formData, telegram_username: e.target.value.replace('@', '') })}
                      className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 pl-9 focus:neon-border outline-none transition-all text-sm font-bold"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest px-1">Lien WhatsApp (Optionnel)</label>
                  <input 
                    type="text"
                    value={formData.whatsapp_number}
                    onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 focus:neon-border outline-none transition-all text-sm font-bold"
                    placeholder="https://wa.me/..."
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 bg-bg-surface backdrop-blur-xl border border-border-subtle p-6 rounded-3xl">
                <div className="space-y-2">
                  <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest px-1">Adresse USDT TRC20</label>
                  <input 
                    type="text"
                    value={formData.wallets.usdtTrc20}
                    onChange={e => setFormData({ ...formData, wallets: { ...formData.wallets, usdtTrc20: e.target.value } })}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 focus:neon-border outline-none transition-all text-[10px] font-mono break-all"
                    placeholder="T..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest px-1">Adresse TON</label>
                  <input 
                    type="text"
                    value={formData.wallets.ton}
                    onChange={e => setFormData({ ...formData, wallets: { ...formData.wallets, ton: e.target.value } })}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 focus:neon-border outline-none transition-all text-[10px] font-mono break-all"
                    placeholder="U..."
                  />
                </div>
                <div className="p-3 rounded-2xl bg-accent-warning/5 border border-accent-warning/20">
                  <p className="text-[9px] text-accent-warning font-bold uppercase leading-relaxed tracking-wider">
                    Ces adresses seront utilisées pour les paiements manuels de tes élèves. Tu peux passer cette étape si tu ne souhaites pas encore configurer de wallet.
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 bg-bg-surface backdrop-blur-xl border border-border-subtle p-6 rounded-3xl">
                {/* SIGNALS ACCESS MODEL */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-accent-neon uppercase font-black tracking-widest px-1">Modèle d'accès Signaux</label>
                    <p className="text-[9px] text-text-muted uppercase font-bold px-1">Comment tes membres accèdent aux signaux VIP ?</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'payment', label: 'Paiement', sub: 'Abonnement', icon: CreditCard },
                      { id: 'broker', label: 'Broker', sub: 'Affiliation', icon: Globe },
                      { id: 'both', label: 'Les Deux', sub: 'Au choix', icon: Settings }
                    ].map(opt => (
                      <div 
                        key={opt.id}
                        onClick={() => setFormData({ ...formData, vip_model: opt.id })}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${formData.vip_model === opt.id ? 'bg-accent-neon/10 border-accent-neon' : 'bg-bg-elevated border-border-subtle opacity-50'}`}
                      >
                        <opt.icon size={16} className={formData.vip_model === opt.id ? 'text-accent-neon' : 'text-text-muted'} />
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-text-primary uppercase">{opt.label}</p>
                          <p className="text-[7px] text-text-muted uppercase font-bold">{opt.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACADEMY ACCESS MODEL */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-accent-neon uppercase font-black tracking-widest px-1">Modèle d'accès Academy</label>
                    <p className="text-[9px] text-text-muted uppercase font-bold px-1">Comment tes membres accèdent à tes cours ?</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'free', label: 'Gratuit', sub: 'Accès Libre', icon: Zap },
                      { id: 'broker', label: 'Broker', sub: 'Affiliation', icon: Globe },
                      { id: 'payment', label: 'Paiement', sub: 'Abonnement', icon: CreditCard },
                      { id: 'both', label: 'Paiement/Brok', sub: 'Au choix', icon: Settings }
                    ].map(opt => (
                      <div 
                        key={opt.id}
                        onClick={() => setFormData({ ...formData, academy_model: opt.id })}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${formData.academy_model === opt.id ? 'bg-accent-neon/10 border-accent-neon' : 'bg-bg-elevated border-border-subtle opacity-50'}`}
                      >
                        <opt.icon size={14} className={formData.academy_model === opt.id ? 'text-accent-neon' : 'text-text-muted'} />
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black text-text-primary uppercase">{opt.label}</p>
                          <p className="text-[6px] text-text-muted uppercase font-bold">{opt.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing type — independent selectors per module */}
                {(formData.vip_model === 'payment' || formData.vip_model === 'both') && (
                  <>
                    <div className="h-[1px] w-full bg-bg-surface" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📈</span>
                        <label className="text-[10px] text-accent-neon uppercase font-black tracking-widest">Facturation Signaux VIP</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'monthly', label: 'Mensuel', sub: 'Abonnement récurrent' },
                          { id: 'lifetime', label: 'À Vie', sub: 'Paiement unique' }
                        ].map(opt => (
                          <div
                            key={opt.id}
                            onClick={() => setFormData({ ...formData, signals_duration_model: opt.id })}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${formData.signals_duration_model === opt.id ? 'bg-accent-neon/10 border-accent-neon' : 'bg-bg-elevated border-border-subtle opacity-50'}`}
                          >
                            <p className="text-xs font-black text-text-primary uppercase">{opt.label}</p>
                            <p className="text-[8px] text-text-muted uppercase font-bold">{opt.sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(formData.academy_model === 'payment' || formData.academy_model === 'both') && (
                  <>
                    <div className="h-[1px] w-full bg-bg-surface" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎓</span>
                        <label className="text-[10px] text-accent-neon uppercase font-black tracking-widest">Facturation Academy</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'monthly', label: 'Mensuel', sub: 'Abonnement récurrent' },
                          { id: 'lifetime', label: 'À Vie', sub: 'Paiement unique' }
                        ].map(opt => (
                          <div
                            key={opt.id}
                            onClick={() => setFormData({ ...formData, academy_duration_model: opt.id })}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer text-center ${formData.academy_duration_model === opt.id ? 'bg-accent-neon/10 border-accent-neon' : 'bg-bg-elevated border-border-subtle opacity-50'}`}
                          >
                            <p className="text-xs font-black text-text-primary uppercase">{opt.label}</p>
                            <p className="text-[8px] text-text-muted uppercase font-bold">{opt.sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Action Button */}
        <button 
          onClick={handleNext}
          disabled={isSubmitting || isUploading}
          className="w-full cyber-button py-5 rounded-2xl flex items-center justify-center gap-3 group disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <span className="text-sm font-black uppercase tracking-[0.3em] text-bg-void">
                {step === 4 ? 'Terminer la configuration' : 'Continuer'}
              </span>
              <ArrowRight className="text-bg-void group-hover:translate-x-1 transition-transform" size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminOnboarding;
