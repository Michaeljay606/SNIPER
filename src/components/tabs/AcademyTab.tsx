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
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserRole } from '../../hooks/useUserRole';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useQuery } from '@tanstack/react-query';
import VipModal from '../VipModal';

const AcademyTab = () => {
  const { t } = useTranslation();
  const { tenantConfig, tenant_id } = useOutletContext<{ tenantConfig: any; tenant_id?: string }>();
  const tenantId = tenant_id || 'default';
  const { isAdmin, canSeeVipAcademy } = useUserRole();
  const { config } = useClientConfig();
  
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [playingLesson, setPlayingLesson] = useState<number | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(`academy_progress_${tenantId}`);
    if (savedProgress) {
      try {
        setCompletedLessons(JSON.parse(savedProgress));
      } catch (e) {}
    }
  }, [tenantId]);

  // TanStack Query for Modules (Cached & Loaded in Parallel)
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['academy_modules', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_modules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // TanStack Query for Lessons (Cached & Loaded in Parallel)
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['academy_lessons', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .eq('tenant_id', tenantId)
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
    localStorage.setItem(`academy_progress_${tenantId}`, JSON.stringify(newCompleted));
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
            {t('academy.subtitle')}
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px',
            color: '#00FF41',
          }}>
            {completedCount} / {totalCount} {t('academy.lessons')}
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
                {t('locked_feature.required', { plan: t('common.vip_badge') })}
              </span>
              <span style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 500
              }}>
                {lockedCount} {t('academy.lessons')}
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
            {t('common.unlock')}
          </button>
        </div>
      )}

      {/* MODULES LIST */}
      <div className="modules-list">
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 14px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden', opacity: 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="shimmer" style={{ width: 36, height: 36, borderRadius: 8 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="shimmer" style={{ width: 140, height: 12, borderRadius: 4 }} />
                      <div className="shimmer" style={{ width: 90, height: 8, borderRadius: 4 }} />
                    </div>
                  </div>
                  <div className="shimmer" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                </div>
              </div>
            ))}
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

              {/* LESSONS — 2-column premium card grid */}
              {isOpen && (
                <div style={{ marginTop: 6, marginBottom: 20 }}>
                  {modLessons.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                      {t('academy.no_content')}
                    </div>
                  ) : (
                    <>
                      {/* Full-width player when a lesson is active */}
                      {playingLesson !== null && modLessons.some(l => l.id === playingLesson) && (() => {
                        const activeLesson = modLessons.find(l => l.id === playingLesson)!;
                        return (
                          <div style={{
                            marginBottom: 10,
                            borderRadius: 12,
                            overflow: 'hidden',
                            aspectRatio: '16/9',
                            border: '1px solid rgba(0,255,65,0.25)',
                            boxShadow: '0 0 24px rgba(0,255,65,0.12)',
                            position: 'relative',
                          }}>
                            <iframe
                              src={`https://www.youtube.com/embed/${activeLesson.youtube_id}?autoplay=1`}
                              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                            {/* Close player */}
                            <button
                              onClick={() => setPlayingLesson(null)}
                              style={{
                                position: 'absolute', top: 8, right: 8,
                                background: 'rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 6,
                                width: 26, height: 26,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#fff',
                                fontSize: 12,
                                zIndex: 20,
                                padding: 0,
                              }}
                            >✕</button>
                          </div>
                        );
                      })()}

                      {/* 2-column grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                      }}>
                        {modLessons.map((lesson, idx) => {
                          const isLocked = !lesson.is_free && !canSeeVipAcademy;
                          const isCompleted = completedLessons.includes(lesson.id);
                          const isPlaying = playingLesson === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => isLocked ? openVipModal() : (isPlaying ? setPlayingLesson(null) : setPlayingLesson(lesson.id))}
                              style={{
                                background: isPlaying
                                  ? 'rgba(0,255,65,0.06)'
                                  : isCompleted
                                    ? 'rgba(0,255,65,0.02)'
                                    : 'rgba(255,255,255,0.025)',
                                border: isPlaying
                                  ? '1px solid rgba(0,255,65,0.35)'
                                  : isLocked
                                    ? '1px solid rgba(255,214,10,0.12)'
                                    : '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 10,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              {/* Thumbnail */}
                              <div style={{
                                position: 'relative',
                                aspectRatio: '16/9',
                                background: '#0a0c14',
                                overflow: 'hidden',
                              }}>
                                {lesson.youtube_id ? (
                                  <img
                                    src={`https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`}
                                    alt={lesson.title}
                                    style={{
                                      width: '100%', height: '100%',
                                      objectFit: 'cover',
                                      opacity: isLocked ? 0.4 : 1,
                                      filter: isLocked ? 'blur(2px) brightness(0.55)' : 'none',
                                      transition: 'all 0.3s ease',
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20, opacity: 0.1,
                                  }}>▶</div>
                                )}

                                {/* Play overlay */}
                                {!isLocked && !isPlaying && (
                                  <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.18)',
                                  }}>
                                    <div style={{
                                      width: 26, height: 26,
                                      borderRadius: '50%',
                                      background: 'rgba(0,255,65,0.92)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 9, color: '#030305',
                                      boxShadow: '0 0 14px rgba(0,255,65,0.55)',
                                    }}>▶</div>
                                  </div>
                                )}

                                {/* Lock overlay */}
                                {isLocked && (
                                  <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.3)',
                                  }}>
                                    <Lock size={14} color="#FFD60A" />
                                  </div>
                                )}

                                {/* NOW PLAYING badge */}
                                {isPlaying && (
                                  <div style={{
                                    position: 'absolute', top: 4, left: 4,
                                    fontFamily: 'Space Mono, monospace',
                                    fontSize: 7, fontWeight: 700,
                                    padding: '2px 6px', borderRadius: 4,
                                    background: 'rgba(0,255,65,0.92)',
                                    color: '#030305',
                                    letterSpacing: '0.06em',
                                  }}>▶ {t('dashboard.live_status')}</div>
                                )}

                                {/* Index */}
                                <div style={{
                                  position: 'absolute', bottom: 3, left: 4,
                                  fontFamily: 'Space Mono, monospace',
                                  fontSize: 7, color: 'rgba(255,255,255,0.55)',
                                  background: 'rgba(0,0,0,0.6)',
                                  padding: '1px 4px', borderRadius: 3,
                                }}>
                                  {String(idx + 1).padStart(2, '0')}
                                </div>

                                {/* Duration */}
                                {lesson.duration && (
                                  <div style={{
                                    position: 'absolute', bottom: 3, right: 4,
                                    fontFamily: 'Space Mono, monospace',
                                    fontSize: 7, color: 'rgba(255,255,255,0.55)',
                                    background: 'rgba(0,0,0,0.6)',
                                    padding: '1px 4px', borderRadius: 3,
                                  }}>
                                    {lesson.duration}
                                  </div>
                                )}
                              </div>

                              {/* Card footer: title + badge + check */}
                              <div style={{
                                padding: '8px 9px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 6,
                                flex: 1,
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {/* Title */}
                                  <div style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: isLocked ? 'rgba(255,255,255,0.35)' : isCompleted ? 'rgba(255,255,255,0.55)' : '#F0F0F0',
                                    lineHeight: 1.35,
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    marginBottom: 4,
                                  }}>
                                    {lesson.title}
                                  </div>
                                  {/* Badge */}
                                  {lesson.is_free ? (
                                    <span style={{
                                      fontFamily: 'Space Mono, monospace',
                                      fontSize: 7, fontWeight: 700,
                                      padding: '2px 5px', borderRadius: 3,
                                      background: 'rgba(0,255,65,0.08)',
                                      color: '#00FF41',
                                      border: '1px solid rgba(0,255,65,0.2)',
                                      letterSpacing: '0.06em',
                                      textTransform: 'uppercase',
                                    }}>{t('common.free_badge')}</span>
                                  ) : (
                                    <span style={{
                                      fontFamily: 'Space Mono, monospace',
                                      fontSize: 7, fontWeight: 700,
                                      padding: '2px 5px', borderRadius: 3,
                                      background: 'rgba(255,214,10,0.08)',
                                      color: '#FFD60A',
                                      border: '1px solid rgba(255,214,10,0.2)',
                                      letterSpacing: '0.06em',
                                      textTransform: 'uppercase',
                                    }}>VIP</span>
                                  )}
                                </div>

                                {/* Completion toggle */}
                                {!isLocked ? (
                                  <button
                                    onClick={(e) => toggleCompleted(lesson.id, e)}
                                    title={isCompleted ? t('academy.already_completed') : t('academy.mark_completed')}
                                    style={{
                                      background: isCompleted ? 'rgba(0,255,65,0.12)' : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${isCompleted ? 'rgba(0,255,65,0.35)' : 'rgba(255,255,255,0.1)'}`,
                                      borderRadius: 6,
                                      width: 24, height: 24,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      padding: 0,
                                      flexShrink: 0,
                                    }}
                                  >
                                    <CheckCircle2 size={12} color={isCompleted ? '#00FF41' : 'rgba(255,255,255,0.2)'} />
                                  </button>
                                ) : (
                                  <div style={{
                                    width: 24, height: 24,
                                    borderRadius: 6,
                                    background: 'rgba(255,214,10,0.05)',
                                    border: '1px solid rgba(255,214,10,0.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                  }}>
                                    <Lock size={10} color="#FFD60A" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
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
              {t('academy.no_content')}
            </p>
            {isAdmin && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                {t('academy.create_first')}
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
