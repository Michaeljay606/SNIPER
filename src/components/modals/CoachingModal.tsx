import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mountain, Video } from 'lucide-react';
import NeonButton from '../NeonButton';

const CoachingModal = ({ onClose, config, tenantProfile }: { onClose: () => void, config: any, tenantProfile?: any }) => {
  const { t } = useTranslation();
  const telegramUrl = tenantProfile?.social_telegram || config?.socialTelegram;
  
  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center px-0 sm:px-4">
      <div 
        className="absolute inset-0 bg-modal-bg backdrop-blur-[4px] animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative z-10 w-full max-w-[500px] bg-bg-base border-t border-border-subtle rounded-t-[32px] shadow-elevated flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
        
        <div className="w-full flex justify-center py-4">
          <div className="w-12 h-1.5 bg-bg-elevated rounded-full" />
        </div>
 
        <button 
          onClick={onClose} 
          className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center bg-bg-surface text-text-muted hover:text-text-primary transition-all active:scale-90"
        >
          <X size={18} />
        </button>
 
        <div className="px-6 pb-12 overflow-y-auto max-h-[85vh]">
          <div className="flex flex-col items-center text-center mb-8 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold mb-4 rotate-3">
              <Mountain size={28} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-text-primary uppercase italic">{t('profile.elite_coaching')}</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent-warning font-bold mt-1">
              {tenantProfile?.mentor_name || config.mentorName}
            </p>
          </div>
 
          <div className="space-y-6">
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-center gap-3 text-[10px] font-black text-accent-gold uppercase tracking-[0.2em] bg-accent-gold/5 py-3 rounded-xl border border-border-subtle">
                <Video size={16} />
                {tenantProfile?.elite_tag || config?.eliteTag || t('profile.sessions_desc')}
              </div>
              
              <p className="text-sm text-text-secondary leading-relaxed text-center font-medium">
                {tenantProfile?.elite_description || t('profile.coaching_desc')}
              </p>
              
              <div className="h-[1px] w-full bg-border-subtle" />
 
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">{t('profile.unique_price')}</span>
                  <span className="text-[10px] text-accent-gold font-bold uppercase mt-1 italic">{t('profile.unlimited_access')}</span>
                </div>
                <span className="text-4xl font-mono font-black text-text-primary tracking-tighter">
                  {tenantProfile?.elite_price || '2995€'}
                </span>
              </div>
            </div>
 
            <div className="pt-4 space-y-4">
              <NeonButton 
                onClick={() => window.open(telegramUrl, '_blank')} 
                className="w-full h-14 !bg-accent-gold !text-bg-base !shadow-elevated text-sm"
              >
                {t('profile.join_coaching')} — {tenantProfile?.elite_price || '2995€'}
              </NeonButton>
              <p className="text-[9px] text-text-muted text-center uppercase tracking-widest font-black italic">
                {t('profile.limited_slots', { mentor: telegramUrl?.split('/').pop()?.toUpperCase() || '' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachingModal;
