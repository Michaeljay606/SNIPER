import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  GraduationCap, 
  Lock, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  CheckCircle, 
  X 
} from 'lucide-react';
import { useUserRole } from '../../hooks/useUserRole';
import { Badge, GlassCard } from '../ui/Shared';
import NeonButton from '../NeonButton';

const AcademyTab = ({ completedLessons, toggleLesson, ownerPhoto, onTabChange, config, dbModules, dbLessons, isScrolled, tenantProfile, previewRole, setShowAcademyModal, features }: any) => {
  const { t } = useTranslation();
  const { canAccessAcademy } = useUserRole();
  const canAccessAcademyStatus = previewRole === 'vip' ? true : (previewRole === 'free' ? false : canAccessAcademy);
  const isFree = previewRole === 'free' ? true : (previewRole === 'vip' || previewRole === 'admin' ? false : !canAccessAcademyStatus);
  const [activeModule, setActiveModule] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  useEffect(() => {
    if (dbModules.length > 0 && activeModule === null) {
      setActiveModule(dbModules[0].id);
    }
  }, [dbModules]);

  const modulesWithLessons = useMemo(() => {
    const isFreePlan = features?.planName === 'free';
    const MAX_LESSONS = isFreePlan ? 1 : (features?.academyVideoLimit ?? Infinity);
    const MAX_MODULES = isFreePlan ? 1 : (features?.academyModuleLimit ?? Infinity);

    const filteredModules = isFreePlan ? dbModules.slice(0, MAX_MODULES) : dbModules;

    return filteredModules.map(mod => {
      let count = 0;
      const moduleDbLessons = dbLessons.filter(l => String(l.moduleId || l.module_id) === String(mod.id));
      
      const restrictedLessons = moduleDbLessons.map(lesson => {
        count++;
        return {
          ...lesson,
          isLocked: count > MAX_LESSONS
        };
      });

      return { ...mod, lessons: restrictedLessons };
    });
  }, [dbModules, dbLessons, features]);

  const totalLessons = modulesWithLessons.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const progress = totalLessons > 0 ? (completedLessons.length / totalLessons) * 100 : 0;

  return (
    <div className="no-scrollbar flex flex-col relative min-h-[80vh]">
      <header className={`fixed ${isScrolled ? 'top-16' : 'top-24'} left-0 right-0 max-w-[430px] mx-auto z-[120] transition-all duration-200 border-b ${isScrolled ? 'bg-bg-void/70 backdrop-blur-xl border-border-subtle py-2' : 'bg-bg-void border-transparent py-3'} px-4`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-xs font-black font-mono tracking-tighter text-text-primary uppercase">{t('academy.title')}</h2>
            <p className="text-[8px] text-text-muted uppercase tracking-[0.2em] font-bold">{t('academy.subtitle')}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-accent-neon font-mono text-[10px] font-bold">{completedLessons.length} / {totalLessons}</span>
            <div className="w-24 h-1 bg-bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-accent-neon transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className={`space-y-3 px-4 transition-all duration-200 ${isScrolled ? 'pt-20' : 'pt-[100px]'} fade-in-up`}>
        {modulesWithLessons.map((module) => (
          <div key={module.id} className="space-y-2">
            <button 
              onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
              className={`w-full flex items-center justify-between p-4 glass-card ${activeModule === module.id ? 'border-accent-neon/50' : 'border-border-subtle'}`}
            >
              <div className="flex flex-col items-start gap-1">
                <h3 className="font-bold text-xs">{module.title}</h3>
                <span className="text-[9px] text-text-muted uppercase tracking-widest">{module.lessons.length} {t('academy.lessons')}</span>
              </div>
              {activeModule === module.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {activeModule === module.id && (
              <div className="grid grid-cols-2 gap-3 p-1">
                {module.lessons.map((lesson: any) => (
                  <div 
                    key={lesson.id}
                    onClick={() => lesson.isLocked ? setShowAcademyModal(true) : setSelectedVideo(lesson)}
                    className="glass-card !p-2 relative group overflow-hidden"
                  >
                    <div className="aspect-video bg-bg-surface rounded-lg relative overflow-hidden">
                      <img src={`https://img.youtube.com/vi/${lesson.youtubeId}/mqdefault.jpg`} className="w-full h-full object-cover" />
                      {lesson.isLocked && <div className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm flex items-center justify-center"><Lock size={20} className="text-accent-warning" /></div>}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={24} className="text-accent-neon" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold mt-2 line-clamp-2">{lesson.title}</p>
                    <span className="text-[8px] text-text-muted uppercase">{lesson.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-[500] bg-bg-void/95 backdrop-blur-xl p-4 flex flex-col items-center justify-center">
          <button onClick={() => setSelectedVideo(null)} className="absolute top-10 right-4 p-3 bg-bg-surface rounded-full"><X size={24} /></button>
          <div className="w-full max-w-4xl aspect-video glass-card overflow-hidden">
            <iframe 
              src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
          <div className="mt-6 text-center">
            <h3 className="text-lg font-bold">{selectedVideo.title}</h3>
            <NeonButton onClick={() => toggleLesson(selectedVideo.id)} className="mt-4">
              {completedLessons.includes(selectedVideo.id) ? t('academy.completed') : t('academy.mark_done')}
            </NeonButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademyTab;
