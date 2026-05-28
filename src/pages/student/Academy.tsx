import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Lock, Play, CheckCircle, GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

export default function Academy() {
  const { t } = useTranslation();
  const { tenant_id } = useOutletContext<any>();
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAcademy() {
      const { data: mData } = await supabase.from('modules').select('*').eq('tenant_id', tenant_id).order('position');
      const { data: lData } = await supabase.from('lessons').select('*').eq('tenant_id', tenant_id).order('position');
      if (mData) setModules(mData);
      if (lData) setLessons(lData);
    }
    fetchAcademy();
  }, [tenant_id]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const completedCount = 0; // TODO: Track completed lessons locally or in DB
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="glass-card p-4">
        <h1 className="text-2xl font-mono font-black uppercase italic tracking-tight mb-4 flex items-center gap-2">
          <GraduationCap className="text-[var(--accent-emerald)]" />
          {t('academy.title')}
        </h1>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
            <span className="text-[var(--text-secondary)]">{t('academy.subtitle')}</span>
            <span className="text-[var(--accent-emerald)]">{completedCount} / {totalCount} {t('academy.lessons')}</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
            <div className="h-full bg-[var(--accent-emerald)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {modules.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)] flex flex-col items-center">
          <GraduationCap size={32} className="mb-4 opacity-50" />
          <p className="text-sm font-bold uppercase tracking-widest">{t('academy.no_content')}</p>
        </div>
      )}

      {/* Modules List */}
      <div className="space-y-4 pb-8">
        {modules.map(mod => {
          const modLessons = lessons.filter(l => l.module_id === mod.id);
          const isExpanded = expandedModules.includes(mod.id);

          return (
            <div key={mod.id} className="glass-card overflow-hidden rounded-[12px]">
              <button 
                onClick={() => toggleModule(mod.id)}
                className="w-full p-4 flex items-center justify-between bg-[var(--bg-elevated)]/50 active:bg-[var(--bg-elevated)] transition-colors min-h-[56px]"
              >
                <div className="text-left">
                  <h3 className="text-sm font-bold tracking-wide">{mod.title}</h3>
                  <p className="text-[10px] text-[var(--text-secondary)] tracking-wider mt-1 uppercase">{modLessons.length} {t('academy.lessons')}</p>
                </div>
                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 space-y-3 border-t border-[var(--border-subtle)]">
                  {modLessons.map((lesson, idx) => {
                    const isVipLocked = lesson.level === 'vip' && false; // TODO: Check user access
                    
                    return (
                      <div key={lesson.id} className="group relative bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl overflow-hidden transition-all hover:border-[var(--accent-emerald)]/50">
                        {isVipLocked && (
                          <div className="absolute inset-0 bg-[var(--bg-base)]/80 backdrop-blur-md z-10 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-base)]/90 transition-colors">
                            <Lock className="text-[var(--accent-gold)] mb-2" size={24} />
                            <span className="text-[10px] font-bold text-[var(--accent-gold)] tracking-widest uppercase mb-2">{t('common.vip_badge')}</span>
                            <span className="px-3 py-1.5 bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] rounded-lg text-[10px] uppercase tracking-wider font-bold">{t('academy.unlock_btn')}</span>
                          </div>
                        )}

                        <div className="flex gap-3 p-3">
                          <div 
                            className="relative w-24 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                            onClick={() => !isVipLocked && setActiveVideo(lesson.video_url)}
                          >
                            <img 
                              src={lesson.thumbnail_url || `https://img.youtube.com/vi/${lesson.video_url?.split('v=')[1]}/mqdefault.jpg`} 
                              alt={lesson.title}
                              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-[var(--accent-emerald)] transition-colors border border-white/20 group-hover:border-transparent">
                                <Play size={14} className="text-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-center">
                            <span className="text-[9px] text-[var(--text-secondary)] font-mono mb-1 uppercase">{t('academy.lessons')} {idx + 1}</span>
                            <h4 className="text-xs font-bold leading-tight mb-2 line-clamp-2">{lesson.title}</h4>
                            <div className="flex justify-between items-center mt-auto">
                              <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${lesson.level === 'vip' ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                                {lesson.level}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
          <div className="flex justify-end p-4">
            <button onClick={() => setActiveVideo(null)} className="p-2 bg-white/10 rounded-full text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-[76px]">
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-white/10">
              <iframe 
                src={`https://www.youtube.com/embed/${activeVideo.split('v=')[1]}?autoplay=1`} 
                className="w-full h-full" 
                allowFullScreen
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
