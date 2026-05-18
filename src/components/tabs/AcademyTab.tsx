import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Lock, 
  ChevronRight, 
  PlayCircle,
  CheckCircle2,
  BookOpen,
  X,
  Zap,
  ArrowRight,
  CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserRole } from '../../hooks/useUserRole';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useQuery } from '@tanstack/react-query';
import VipModal from '../VipModal';

const AcademyTab = () => {
  const { t } = useTranslation();
  const { tenantConfig } = useOutletContext<{ tenantConfig: any }>();
  const { isAdmin, canSeeVipAcademy } = useUserRole();
  const { config } = useClientConfig();
  
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [playingLesson, setPlayingLesson] = useState<number | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(`academy_progress_${TENANT_ID}`);
    if (savedProgress) {
      try {
        setCompletedLessons(JSON.parse(savedProgress));
      } catch (e) {}
    }
  }, []);

  // TanStack Query for Modules (Cached & Loaded in Parallel)
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['academy_modules', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_modules')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // TanStack Query for Lessons (Cached & Loaded in Parallel)
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['academy_lessons', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Expand the first module once modules are loaded
  useEffect(() => {
    if (modules.length > 0 && expandedModules.length === 0) {
      setExpandedModules([modules[0].id]);
    }
  }, [modules]);

  const isLoading = isLoadingModules || isLoadingLessons;

  const toggleModule = (id: number) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleCompleted = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompleted = completedLessons.includes(id) 
      ? completedLessons.filter(l => l !== id)
      : [...completedLessons, id];
      
    setCompletedLessons(newCompleted);
    localStorage.setItem(`academy_progress_${TENANT_ID}`, JSON.stringify(newCompleted));
  };

  const openVipModal = () => {
    setIsVipModalOpen(true);
  };

  const totalCount = lessons.length;
  const completedCount = completedLessons.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const lockedCount = lessons.filter(l => !l.is_free && !canSeeVipAcademy).length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 96 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '24px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 900, color: '#FFFFFF', lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}>{t('academy.title')}</h1>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>{t('academy.subtitle')}</span>
        </div>
      </div>

      {/* FIX 6 — PROGRESS BAR */}
      <div style={{
        margin: '10px 14px 14px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '12px 14px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: '#F0F0F0',
          }}>
            Formation & Progression
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px',
            color: '#00FF41',
          }}>
            {completedCount} / {totalCount} leçons
          </span>
        </div>
        <div style={{
          height: '4px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#00FF41',
            borderRadius: '2px',
            boxShadow: '0 0 8px rgba(0,255,65,0.4)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* FIX 3 — VIP LOCK BLOCK (Free teaser) */}
      {lockedCount > 0 && (
        <div style={{
          margin: '0 14px 16px',
          padding: '16px',
          background: 'rgba(255,214,10,0.03)',
          border: '1px solid rgba(255,214,10,0.15)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px', height: '44px',
              borderRadius: '50%',
              background: 'rgba(255,214,10,0.1)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,214,10,0.2)',
              flexShrink: 0
            }}>
              <Lock size={20} color="#FFD60A" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                Contenu VIP Verrouillé
              </span>
              <span style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 500
              }}>
                {lockedCount} leçons exclusives à débloquer
              </span>
            </div>
          </div>
          <button onClick={openVipModal}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '11px',
              fontWeight: 900,
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#FFD60A',
              border: 'none',
              color: '#000000',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: '0 0 20px rgba(255,214,10,0.3)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            DÉBLOQUER
          </button>
        </div>
      )}

      {/* MODULES LIST */}
      <div className="modules-list">
        {isLoading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--green)] border-t-transparent mx-auto mb-3" />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('common.loading')}</span>
          </div>
        )}

        {modules.map((mod) => {
          const modLessons = lessons.filter(l => l.module_id === mod.id).sort((a,b) => a.sort_order - b.sort_order);
          const isOpen = expandedModules.includes(mod.id);
          
          return (
            <div key={mod.id} style={{ margin: '0 14px' }}>
              {/* FIX 5 — MODULE CARD REDESIGN */}
              <div
                onClick={() => toggleModule(mod.id)}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                {/* Module banner */}
                <div style={{
                  height: '64px',
                  background: 'linear-gradient(135deg, rgba(0,255,65,0.08), transparent)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '10px 14px',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    {/* FIX 2 — MODULE TAG BADGE */}
                    {mod.tag && (
                      <div style={{
                        fontFamily: 'Space Mono, monospace',
                        fontSize: '8px',
                        letterSpacing: '0.12em',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'inline-block',
                        background: 'rgba(0,255,65,0.08)',
                        border: '1px solid rgba(0,255,65,0.2)',
                        color: '#00FF41',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}>
                        {mod.tag}
                      </div>
                    )}
                    <div style={{
                      fontSize: '14px', fontWeight: 700,
                      color: '#F0F0F0',
                    }}>
                      {mod.title}
                    </div>
                    <div style={{
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.35)',
                      marginTop: '2px',
                    }}>
                      {modLessons.length} {t('academy.lessons')}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.3)',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}>
                    ▼
                  </div>
                </div>
              </div>

              {/* FIX 4 — LESSONS GRID (2 columns) */}
              {isOpen && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginTop: '10px',
                  marginBottom: '20px'
                }}>
                  {modLessons.map((lesson) => {
                    const isLocked = !lesson.is_free && !canSeeVipAcademy;
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isPlaying = playingLesson === lesson.id;
                    
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => isLocked ? openVipModal() : (isPlaying ? setPlayingLesson(null) : setPlayingLesson(lesson.id))}
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{
                          height: '80px',
                          position: 'relative',
                          background: '#0F1220',
                          overflow: 'hidden',
                        }}>
                          {lesson.youtube_id ? (
                            <img
                              src={`https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`}
                              alt={lesson.title}
                              style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                                opacity: isLocked ? 0.6 : 1,
                                filter: isLocked ? 'blur(4px) brightness(0.7)' : 'none',
                                transition: 'all 0.3s ease',
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%',
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px', opacity: 0.15,
                            }}>
                              ▶
                            </div>
                          )}

                          {/* Play overlay */}
                          {!isLocked && !isPlaying && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <div style={{
                                width: '28px', height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(0,255,65,0.85)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px', color: '#050507',
                              }}>
                                ▶
                              </div>
                            </div>
                          )}

                          {/* YouTube Iframe if playing */}
                          {isPlaying && !isLocked && (
                            <iframe 
                              src={`https://www.youtube.com/embed/${lesson.youtube_id}?autoplay=1`} 
                              style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0, zIndex: 10 }}
                              allow="autoplay; encrypted-media" 
                              allowFullScreen
                            />
                          )}

                          {/* Lock overlay for non-VIP */}
                          {isLocked && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,0.4)',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              zIndex: 5
                            }}>
                              <div style={{
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '50%',
                                width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                              }}>
                                🔒
                              </div>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 900,
                                color: '#FFFFFF',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                              }}>
                                DÉBLOQUER
                              </span>
                            </div>
                          )}

                          {/* PREMIUM badge */}
                          {isLocked && (
                            <div style={{
                              position: 'absolute', top: '4px', right: '4px',
                              fontFamily: 'Space Mono, monospace',
                              fontSize: '7px',
                              padding: '2px 5px',
                              borderRadius: '3px',
                              background: 'rgba(255,214,10,0.15)',
                              color: '#FFD60A',
                              letterSpacing: '0.08em',
                            }}>
                              DÉBLOQUER
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: '8px 10px' }}>
                          <div style={{
                            fontSize: '11px', fontWeight: 600,
                            lineHeight: 1.3, marginBottom: '4px',
                            color: '#F0F0F0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {lesson.title}
                          </div>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span style={{
                              fontFamily: 'Space Mono, monospace',
                              fontSize: '9px', color: 'rgba(255,255,255,0.3)',
                            }}>
                              {lesson.duration || '0:00'}
                            </span>
                            {isCompleted && (
                              <span style={{
                                fontFamily: 'Space Mono, monospace',
                                fontSize: '8px',
                                color: '#00FF41',
                                letterSpacing: '0.08em',
                              }}>
                                ✓
                              </span>
                            )}
                            {!isLocked && (
                              <button 
                                onClick={(e) => toggleCompleted(lesson.id, e)}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                              >
                                <CheckCircle2 size={12} color={isCompleted ? '#00FF41' : 'rgba(255,255,255,0.2)'} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {modLessons.length === 0 && (
                    <div style={{ gridColumn: 'span 2', padding: 20, textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                      {t('academy.no_content')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!isLoading && modules.length === 0 && (
          <div style={{ margin: '0 14px', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <GraduationCap size={32} style={{ opacity: 0.3, marginBottom: 16, color: 'var(--text-primary)' }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: 8 }}>
              Aucun contenu disponible.
            </p>
            {isAdmin && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                Ajoutez vos modules dans Admin → Academy
              </p>
            )}
          </div>
        )}
      </div>

      {isVipModalOpen && config && (
        <VipModal
          config={config}
          triggerType="academy"
          onClose={() => setIsVipModalOpen(false)}
          onSuccess={() => setIsVipModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AcademyTab;
