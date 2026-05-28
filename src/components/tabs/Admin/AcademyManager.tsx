import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  GraduationCap, Plus, Edit2, Trash2, Save, ChevronUp, ChevronDown,
  Video, Lock, Unlock, X, BookOpen, ArrowRight, CheckCircle2, Layers
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { GlassCard, NeonButton } from '../../ui/Shared';
import { QuotaBanner } from '../../ui/PlanGate';
import { triggerNotification } from '../../../lib/notifications';
import type { PlanFeatures } from '../../../hooks/usePlanFeatures';
import LockedFeature from '../../LockedFeature';
import { useTranslation } from 'react-i18next';

interface AcademyManagerProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  planFeatures: PlanFeatures;
  onUpgrade: () => void;
}

type DrawerMode = null | 'new-module' | 'edit-module' | 'new-lesson' | 'edit-lesson';

const AcademyManager = ({ onShowToast, planFeatures, onUpgrade }: AcademyManagerProps) => {
  const { t } = useTranslation();
  const { tenant_id: paramTenantId } = useParams();
  const TENANT_ID = paramTenantId || 'default';

  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);

  // Drawer state
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [moduleForm, setModuleForm] = useState<any>({ title: '', description: '', tag: '' });
  const [lessonForm, setLessonForm] = useState<any>({ module_id: '', title: '', description: '', youtube_id: '', is_free: true, duration: '', sort_order: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const isLessonLimitReached = useMemo(() => {
    if (planFeatures.academyUnlimited) return false;
    return lessons.length >= planFeatures.maxLessons;
  }, [lessons.length, planFeatures]);

  const lessonRequiredPlan = useMemo(() => {
    if (planFeatures.plan === 'free') return 'basic';
    return 'premium';
  }, [planFeatures.plan]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: mData } = await supabase.from('academy_modules').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true });
    const { data: lData } = await supabase.from('academy_lessons').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true });
    if (mData) { setModules(mData); if (expandedModules.length === 0 && mData.length > 0) setExpandedModules([mData[0].id]); }
    if (lData) setLessons(lData);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [TENANT_ID]);

  const toggleModule = (id: number) =>
    setExpandedModules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Module CRUD ──────────────────────────────────────────────
  const openNewModule = () => {
    setModuleForm({ title: '', description: '', tag: '', sort_order: modules.length });
    setDrawerMode('new-module');
  };
  const openEditModule = (mod: any) => {
    setModuleForm({ ...mod });
    setDrawerMode('edit-module');
  };
  const saveModule = async () => {
    if (!moduleForm.title.trim()) { onShowToast(t('academy_admin.module_title_required'), 'warning'); return; }
    setIsSaving(true);
    const payload: any = { title: moduleForm.title, description: moduleForm.description || null, tag: moduleForm.tag || null, sort_order: moduleForm.sort_order ?? 0, tenant_id: TENANT_ID };
    let error;
    if (moduleForm.id) {
      ({ error } = await supabase.from('academy_modules').update(payload).eq('id', moduleForm.id).eq('tenant_id', TENANT_ID));
    } else {
      ({ error } = await supabase.from('academy_modules').insert(payload));
      if (!error) triggerNotification({ type: 'new_module', tenant_id: TENANT_ID, target_type: 'all_members', data: { title: moduleForm.title } }).catch(() => {});
    }
    setIsSaving(false);
    if (error) { onShowToast(`Erreur: ${error.message}`, 'error'); return; }
    onShowToast(moduleForm.id ? t('academy_admin.module_updated') : t('academy_admin.module_created'), 'success');
    setDrawerMode(null);
    fetchData();
  };
  const deleteModule = async (id: number) => {
    if (!window.confirm(t('academy_admin.delete_module_confirm'))) return;
    await supabase.from('academy_lessons').delete().eq('module_id', id).eq('tenant_id', TENANT_ID);
    await supabase.from('academy_modules').delete().eq('id', id).eq('tenant_id', TENANT_ID);
    onShowToast(t('academy_admin.module_deleted'), 'success');
    fetchData();
  };

  // ── Lesson CRUD ──────────────────────────────────────────────
  const extractYouTubeId = (urlOrId: string) => {
    const match = urlOrId.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? match[2] : urlOrId;
  };
  const openNewLesson = (moduleId: number) => {
    setLessonForm({ module_id: moduleId, title: '', description: '', youtube_id: '', is_free: true, duration: '', sort_order: lessons.filter(l => l.module_id === moduleId).length });
    setDrawerMode('new-lesson');
  };
  const openEditLesson = (lesson: any) => {
    setLessonForm({ ...lesson });
    setDrawerMode('edit-lesson');
  };
  const saveLesson = async () => {
    if (!lessonForm.title.trim() || !lessonForm.module_id) { onShowToast(t('academy_admin.lesson_title_module_required'), 'warning'); return; }

    // ── Lesson quota check ─────────────────────────────────
    if (!lessonForm.id && !planFeatures.academyUnlimited && lessons.length >= planFeatures.maxLessons) {
      const upgradePlan = planFeatures.plan === 'free' ? 'Basic' : 'Premium';
      onShowToast(
        t('academy_admin.lesson_limit_reached', { count: planFeatures.maxLessons, plan: upgradePlan }),
        'warning'
      );
      return;
    }
    // ────────────────────────────────────────────
    setIsSaving(true);
    const finalYoutubeId = lessonForm.youtube_id ? extractYouTubeId(lessonForm.youtube_id) : null;
    const payload: any = { title: lessonForm.title, description: lessonForm.description || null, youtube_id: finalYoutubeId || null, module_id: Number(lessonForm.module_id), sort_order: lessonForm.sort_order ?? 0, tenant_id: TENANT_ID, is_free: lessonForm.is_free ?? true, duration: lessonForm.duration || null };
    let error;
    if (lessonForm.id) {
      ({ error } = await supabase.from('academy_lessons').update(payload).eq('id', lessonForm.id).eq('tenant_id', TENANT_ID));
    } else {
      ({ error } = await supabase.from('academy_lessons').insert(payload));
      if (!error) {
        const mod = modules.find(m => m.id === Number(lessonForm.module_id));
        triggerNotification({ type: 'new_lesson', tenant_id: TENANT_ID, target_type: lessonForm.is_free ? 'all_members' : 'vip_members', data: { title: lessonForm.title, module_title: mod?.title || 'Academy' } }).catch(() => {});
      }
    }
    setIsSaving(false);
    if (error) { onShowToast(`Erreur: ${error.message}`, 'error'); return; }
    onShowToast(lessonForm.id ? t('academy_admin.lesson_updated') : t('academy_admin.lesson_created'), 'success');
    setDrawerMode(null);
    fetchData();
  };
  const deleteLesson = async (id: number) => {
    if (!window.confirm(t('academy_admin.delete_lesson_confirm'))) return;
    await supabase.from('academy_lessons').delete().eq('id', id).eq('tenant_id', TENANT_ID);
    onShowToast(t('academy_admin.lesson_deleted'), 'success');
    fetchData();
  };

  // ── Reorder ──────────────────────────────────────────────────
  const moveModule = async (index: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && index === 0) || (dir === 'down' && index === modules.length - 1)) return;
    const arr = [...modules];
    const ti = dir === 'up' ? index - 1 : index + 1;
    [arr[index].sort_order, arr[ti].sort_order] = [arr[ti].sort_order, arr[index].sort_order];
    if (arr[index].sort_order === arr[ti].sort_order) { arr[index].sort_order = index; arr[ti].sort_order = ti; }
    setModules([...arr].sort((a, b) => a.sort_order - b.sort_order));
    await supabase.from('academy_modules').update({ sort_order: arr[index].sort_order }).eq('id', arr[index].id).eq('tenant_id', TENANT_ID);
    await supabase.from('academy_modules').update({ sort_order: arr[ti].sort_order }).eq('id', arr[ti].id).eq('tenant_id', TENANT_ID);
  };
  const moveLesson = async (moduleId: number, index: number, dir: 'up' | 'down') => {
    const ml = lessons.filter(l => l.module_id === moduleId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if ((dir === 'up' && index === 0) || (dir === 'down' && index === ml.length - 1)) return;
    const ti = dir === 'up' ? index - 1 : index + 1;
    const i1 = { ...ml[index], sort_order: ml[ti].sort_order ?? ti };
    const i2 = { ...ml[ti], sort_order: ml[index].sort_order ?? index };
    setLessons(lessons.map(l => l.id === i1.id ? i1 : l.id === i2.id ? i2 : l));
    await supabase.from('academy_lessons').update({ sort_order: i1.sort_order }).eq('id', i1.id).eq('tenant_id', TENANT_ID);
    await supabase.from('academy_lessons').update({ sort_order: i2.sort_order }).eq('id', i2.id).eq('tenant_id', TENANT_ID);
  };

  const previewId = lessonForm.youtube_id ? extractYouTubeId(lessonForm.youtube_id) : '';
  const isDrawerOpen = drawerMode !== null;
  const totalLessons = lessons.length;

  return (
    <>
      <div className="pb-32 animate-in fade-in duration-300" style={{ paddingBottom: 120 }}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <GraduationCap size={16} color="var(--accent-neon)" />
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Academy Manager
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Mono, monospace' }}>
              {t('academy_admin.module_lesson_count', { modules: modules.length, lessons: totalLessons })}
              {!planFeatures.academyUnlimited && (
                <span style={{ marginLeft: 6, color: isLessonLimitReached ? '#FF3B30' : 'rgba(0,255,65,0.6)' }}>
                  ({totalLessons}/{planFeatures.maxLessons})
                </span>
              )}
            </span>
          </div>
          <button
            onClick={openNewModule}
            disabled={planFeatures.isPaused}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              background: planFeatures.isPaused ? 'rgba(255,255,255,0.06)' : 'var(--accent-neon)',
              border: planFeatures.isPaused ? '1px solid rgba(255,255,255,0.1)' : 'none',
              borderRadius: 12,
              color: planFeatures.isPaused ? 'rgba(255,255,255,0.3)' : '#000',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.06em',
              cursor: planFeatures.isPaused ? 'not-allowed' : 'pointer',
              boxShadow: planFeatures.isPaused ? 'none' : '0 0 16px rgba(0,255,65,0.3)',
              textTransform: 'uppercase',
              minHeight: 44,
            }}
          >
            <Plus size={14} />
            {t('academy_admin.new_module')}
          </button>
        </div>

        {/* ── LESSON QUOTA BANNER ── */}
        {!planFeatures.academyUnlimited && (
          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <QuotaBanner
              used={totalLessons}
              max={planFeatures.maxLessons}
              label={t('academy_admin.lessons_used')}
              upgradeHint={t('academy_admin.lesson_limit_upgrade', { count: planFeatures.maxLessons, plan: planFeatures.plan === 'free' ? 'Basic' : 'Premium' })}
            />
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!isLoading && modules.length === 0 && (
          <div style={{
            margin: '0 16px',
            padding: '48px 24px',
            border: '2px dashed rgba(255,255,255,0.08)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={24} color="rgba(0,255,65,0.4)" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{t('academy_admin.no_module')}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                {t('academy_admin.no_module_desc')}
              </p>
            </div>
            <button
              onClick={openNewModule}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 10, color: '#00FF41', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
            >
              <Plus size={13} /> {t('academy_admin.create_first_module')}
            </button>
          </div>
        )}

        {/* ── MODULES LIST ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
          {isLoading && [1, 2].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
          ))}

          {modules.map((mod, mIndex) => {
            const modLessons = lessons.filter(l => l.module_id === mod.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            const isOpen = expandedModules.includes(mod.id);

            return (
              <div key={mod.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>

                {/* Module row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                  {/* Expand toggle + info */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0 }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(0,255,65,0.07)',
                      border: '1px solid rgba(0,255,65,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Layers size={15} color="#00FF41" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mod.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono, monospace' }}>
                        {t('academy_admin.lesson_count', { count: modLessons.length })}
                        {mod.description && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {mod.description}</span>}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 12, flexShrink: 0 }}>
                      {isOpen ? '▲' : '▼'}
                    </div>
                  </button>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {/* Reorder */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button onClick={() => moveModule(mIndex, 'up')} disabled={mIndex === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: mIndex === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)' }}><ChevronUp size={12} /></button>
                      <button onClick={() => moveModule(mIndex, 'down')} disabled={mIndex === modules.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: mIndex === modules.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)' }}><ChevronDown size={12} /></button>
                    </div>
                    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />
                    <button
                      onClick={() => openEditModule(mod)}
                      title={t('academy_admin.edit_module')}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Edit2 size={12} color="rgba(255,255,255,0.5)" />
                    </button>
                    <button
                      onClick={() => deleteModule(mod.id)}
                      title={t('academy_admin.delete_module')}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,60,60,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={12} color="rgba(255,80,80,0.6)" />
                    </button>
                  </div>
                </div>

                {/* Lessons section */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 14px 14px' }}>

                    {/* Add lesson CTA — locked when limit reached */}
                    {isLessonLimitReached ? (
                      <button
                        onClick={onUpgrade}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '10px',
                          background: planFeatures.plan === 'free' ? 'rgba(59,130,246,0.06)' : 'rgba(139,92,246,0.06)',
                          border: `1px dashed ${planFeatures.plan === 'free' ? 'rgba(59,130,246,0.3)' : 'rgba(139,92,246,0.3)'}`,
                          borderRadius: 10,
                          color: planFeatures.plan === 'free' ? '#60A5FA' : '#A78BFA',
                          fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', marginBottom: 10,
                          letterSpacing: '0.04em',
                        }}
                      >
                        🔒 LIMITE ATTEINTE · DÉBLOQUER {planFeatures.plan === 'free' ? 'BASIC' : 'PREMIUM'}
                      </button>
                    ) : (
                      <button
                        onClick={() => openNewLesson(mod.id)}
                        disabled={planFeatures.isPaused}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '10px',
                          background: planFeatures.isPaused ? 'rgba(255,255,255,0.02)' : 'rgba(0,152,234,0.05)',
                          border: `1px dashed ${planFeatures.isPaused ? 'rgba(255,255,255,0.08)' : 'rgba(0,152,234,0.3)'}`,
                          borderRadius: 10,
                          color: planFeatures.isPaused ? 'rgba(255,255,255,0.2)' : '#0098EA',
                          fontSize: 11, fontWeight: 700,
                          cursor: planFeatures.isPaused ? 'not-allowed' : 'pointer', marginBottom: 10,
                          letterSpacing: '0.04em',
                        }}
                      >
                        <Plus size={13} /> Ajouter une leçon à ce module
                      </button>
                    )}

                    {/* Lesson rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {modLessons.length === 0 && (
                        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '8px 0', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {t('academy_admin.no_lesson_in_module')}
                        </div>
                      )}
                      {modLessons.map((lesson, lIndex) => (
                        <div key={lesson.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 10,
                        }}>
                          {/* Thumbnail */}
                          <div style={{ width: 44, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#0a0c14', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                            {lesson.youtube_id ? (
                              <img src={`https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : (
                              <Video size={11} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.3 }} color="#fff" />
                            )}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#F0F0F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                              {lesson.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{
                                fontFamily: 'Space Mono, monospace', fontSize: 7, fontWeight: 700,
                                padding: '1px 5px', borderRadius: 3,
                                background: lesson.is_free ? 'rgba(0,255,65,0.08)' : 'rgba(255,214,10,0.08)',
                                color: lesson.is_free ? '#00FF41' : '#FFD60A',
                                border: `1px solid ${lesson.is_free ? 'rgba(0,255,65,0.2)' : 'rgba(255,214,10,0.2)'}`,
                                textTransform: 'uppercase',
                              }}>
                                {lesson.is_free ? t('common.free_badge') : 'VIP'}
                              </span>
                              {lesson.duration && (
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono, monospace' }}>
                                  ◷ {lesson.duration}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <button onClick={() => moveLesson(mod.id, lIndex, 'up')} disabled={lIndex === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', color: lIndex === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)' }}><ChevronUp size={11} /></button>
                              <button onClick={() => moveLesson(mod.id, lIndex, 'down')} disabled={lIndex === modLessons.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', color: lIndex === modLessons.length - 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)' }}><ChevronDown size={11} /></button>
                            </div>
                            <button onClick={() => openEditLesson(lesson)} style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Edit2 size={11} color="rgba(255,255,255,0.45)" />
                            </button>
                            <button onClick={() => deleteLesson(lesson.id)} style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,60,60,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={11} color="rgba(255,80,80,0.55)" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DRAWER OVERLAY ── */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerMode(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer panel */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(100%, 430px)',
            maxWidth: 430,
            background: '#0D0F1C',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px 20px 0 0',
            zIndex: 130,
            padding: '0',
            maxHeight: 'min(88vh, 760px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 16px 14px', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
                  {drawerMode === 'new-module' && '➕ Nouveau module'}
                  {drawerMode === 'edit-module' && '✏️ Modifier le module'}
                  {drawerMode === 'new-lesson' && t('academy_admin.new_lesson')}
                  {drawerMode === 'edit-lesson' && t('academy_admin.edit_lesson')}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                  {drawerMode?.includes('module') ? t('academy_admin.lessons_added_later') : t('academy_admin.linked_to_module')}
                </div>
              </div>
              <button
                onClick={() => setDrawerMode(null)}
                style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="rgba(255,255,255,0.5)" />
              </button>
            </div>

            <div style={{
              padding: '0 14px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>

              {/* ── MODULE FORM ── */}
              {(drawerMode === 'new-module' || drawerMode === 'edit-module') && (
                <>
                  <Field label={t('academy_admin.module_title_required_label')} hint={t('academy_admin.module_title_hint')}>
                    <input
                      autoFocus
                      type="text"
                      value={moduleForm.title}
                      onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })}
                      placeholder="Ex: Price Action Avancé"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label={t('academy_admin.short_description')} hint={t('academy_admin.short_description_hint')}>
                    <textarea
                      rows={2}
                      value={moduleForm.description || ''}
                      onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
                      placeholder="Ex: Maîtrisez les bases de l'analyse technique..."
                      style={{ ...inputStyle, resize: 'none', height: 72 }}
                    />
                  </Field>
                  <Field label={t('academy_admin.tag_badge')} hint={t('academy_admin.tag_badge_hint')}>
                    <input
                      type="text"
                      value={moduleForm.tag || ''}
                      onChange={e => setModuleForm({ ...moduleForm, tag: e.target.value })}
                      placeholder="Ex: DÉBUTANT"
                      style={inputStyle}
                    />
                  </Field>
                </>
              )}

              {/* ── LESSON FORM ── */}
              {(drawerMode === 'new-lesson' || drawerMode === 'edit-lesson') && (
                drawerMode === 'new-lesson' && isLessonLimitReached ? (
                <LockedFeature
                  currentPlan={planFeatures.plan}
                  requiredPlan={lessonRequiredPlan}
                  featureName={t('academy_admin.unlimited_academy')}
                  description={planFeatures.plan === 'free'
                    ? t('academy_admin.basic_lesson_limit_desc')
                    : t('academy_admin.current_lesson_limit_desc', { count: planFeatures.maxLessons })}
                  mode="replace"
                  onUpgrade={onUpgrade}
                />
                ) : (
                  <>
                    {/* Module selector (only for new lesson) */}
                    {drawerMode === 'new-lesson' && (
                      <Field label={t('academy_admin.module_required_label')} hint={t('academy_admin.choose_module_hint')}>
                        <select
                          value={lessonForm.module_id}
                          onChange={e => setLessonForm({ ...lessonForm, module_id: Number(e.target.value) })}
                          style={inputStyle}
                        >
                          <option value="">{t('academy_admin.select_module')}</option>
                          {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                      </Field>
                    )}

                    <Field label={t('academy_admin.lesson_title_required_label')} hint={t('academy_admin.lesson_title_hint')}>
                      <input
                        autoFocus
                        type="text"
                        value={lessonForm.title}
                        onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                        placeholder="Ex: Introduction au Price Action"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label={t('academy_admin.youtube_link')} hint={t('academy_admin.youtube_link_hint')}>
                      <input
                        type="text"
                        value={lessonForm.youtube_id || ''}
                        onChange={e => setLessonForm({ ...lessonForm, youtube_id: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        style={{ ...inputStyle, fontFamily: 'Space Mono, monospace', fontSize: 11 }}
                      />
                    </Field>

                    {/* YouTube preview */}
                    {previewId && previewId.length === 11 && (
                      <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', border: '1px solid rgba(0,152,234,0.3)' }}>
                        <img src={`https://img.youtube.com/vi/${previewId}/mqdefault.jpg`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} alt={t('academy_admin.preview')} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <div style={{ background: '#FF0000', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Video size={16} color="#fff" />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{t('academy_admin.video_preview')}</span>
                          </div>
                        </div>
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,152,234,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                          {t('academy_admin.video_detected')}
                        </div>
                      </div>
                    )}

                    <Field label={t('academy_admin.duration')} hint={t('academy_admin.duration_hint')}>
                      <input
                        type="text"
                        value={lessonForm.duration || ''}
                        onChange={e => setLessonForm({ ...lessonForm, duration: e.target.value })}
                        placeholder="Ex: 14:32"
                        style={{ ...inputStyle, fontFamily: 'Space Mono, monospace', fontSize: 12 }}
                      />
                    </Field>

                    {/* Access toggle */}
                    <Field label={t('academy_admin.access')} hint={t('academy_admin.access_hint')}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { val: true, label: t('common.free_badge'), sub: t('academy_admin.visible_to_all'), icon: <Unlock size={16} />, color: '#00FF41', bg: 'rgba(0,255,65,0.08)', border: 'rgba(0,255,65,0.3)' },
                          { val: false, label: 'VIP', sub: t('academy_admin.vip_members_only'), icon: <Lock size={16} />, color: '#FFD60A', bg: 'rgba(255,214,10,0.08)', border: 'rgba(255,214,10,0.3)' },
                        ].map(opt => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => setLessonForm({ ...lessonForm, is_free: opt.val })}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '14px 10px',
                              borderRadius: 12,
                              border: `1.5px solid ${lessonForm.is_free === opt.val ? opt.border : 'rgba(255,255,255,0.07)'}`,
                              background: lessonForm.is_free === opt.val ? opt.bg : 'rgba(255,255,255,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ color: lessonForm.is_free === opt.val ? opt.color : 'rgba(255,255,255,0.3)' }}>{opt.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: lessonForm.is_free === opt.val ? opt.color : 'rgba(255,255,255,0.4)' }}>{opt.label}</span>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{opt.sub}</span>
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )
              )}

              {/* ── SAVE BUTTON ── */}
              {!(drawerMode === 'new-lesson' && isLessonLimitReached) && (
                <div style={{
                  position: 'sticky',
                  bottom: 0,
                  display: 'flex',
                  gap: 10,
                  margin: '0 -14px -14px',
                  padding: '12px 14px calc(14px + env(safe-area-inset-bottom, 0px))',
                  background: 'linear-gradient(180deg, rgba(13,15,28,0.72), #0D0F1C 24%)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <button
                    onClick={() => setDrawerMode(null)}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={drawerMode?.includes('module') ? saveModule : saveLesson}
                    disabled={isSaving}
                    style={{
                      flex: 2, padding: '14px',
                      borderRadius: 12,
                      background: drawerMode?.includes('lesson') ? '#0098EA' : 'var(--accent-neon)',
                      border: 'none',
                      color: drawerMode?.includes('lesson') ? '#fff' : '#000',
                      fontSize: 13, fontWeight: 900,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: drawerMode?.includes('lesson') ? '0 0 20px rgba(0,152,234,0.35)' : '0 0 20px rgba(0,255,65,0.3)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isSaving ? (
                      <span>{t('academy_admin.saving')}</span>
                    ) : (
                      <><CheckCircle2 size={16} /> {t('common.save')}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// ── Helper components ──────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 13,
  color: '#F0F0F0',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  minHeight: 48,
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 2 }}>{label}</label>
      {hint && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

export default AcademyManager;
