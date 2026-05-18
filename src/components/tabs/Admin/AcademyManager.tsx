import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GraduationCap, Plus, Edit, Trash2, Save, ChevronUp, ChevronDown, Video, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { GlassCard, NeonButton } from '../../ui/Shared';
import { useClientConfig } from '../../../hooks/useClientConfig';

interface AcademyManagerProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const AcademyManager = ({ onShowToast }: AcademyManagerProps) => {
  const { tenant_id: paramTenantId } = useParams();
  const TENANT_ID = paramTenantId || 'default';
  const { config } = useClientConfig();
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingModule, setIsEditingModule] = useState(false);
  const [editingModuleData, setEditingModuleData] = useState<any>({ title: '', description: '', sort_order: 0 });

  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonData, setEditingLessonData] = useState<any>({ module_id: '', title: '', description: '', youtube_id: '', is_free: true, sort_order: 0 });

  const fetchData = async () => {
    setIsLoading(true);
    const { data: mData, error: mErr } = await supabase.from('academy_modules').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true });
    const { data: lData, error: lErr } = await supabase.from('academy_lessons').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true });
    if (mErr) console.error('Modules error:', mErr.message);
    if (lErr) console.error('Lessons error:', lErr.message);
    if (mData) setModules(mData);
    if (lData) setLessons(lData);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [TENANT_ID]);

  const saveModule = async () => {
    if (!editingModuleData.title) {
      onShowToast('Le titre est requis', 'warning');
      return;
    }
    // Only send columns that exist in DB
    const payload: any = {
      title: editingModuleData.title,
      description: editingModuleData.description || null,
      sort_order: editingModuleData.sort_order ?? 0,
      tenant_id: TENANT_ID,
    };

    let error;
    if (editingModuleData.id) {
      ({ error } = await supabase.from('academy_modules').update(payload).eq('id', editingModuleData.id));
    } else {
      ({ error } = await supabase.from('academy_modules').insert(payload));
    }

    if (error) {
      console.error('Save module error:', error);
      onShowToast(`Erreur: ${error.message}`, 'error');
    } else {
      onShowToast(editingModuleData.id ? 'Module mis à jour ✓' : 'Module créé ✓', 'success');
      setIsEditingModule(false);
      fetchData();
    }
  };

  const deleteModule = async (id: number) => {
    if (!window.confirm('Supprimer ce module et TOUTES ses leçons ?')) return;
    await supabase.from('academy_lessons').delete().eq('module_id', id);
    await supabase.from('academy_modules').delete().eq('id', id);
    onShowToast('Module supprimé', 'success');
    fetchData();
  };

  const extractYouTubeId = (urlOrId: string) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = urlOrId.match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId;
  };

  const saveLesson = async () => {
    if (!editingLessonData.title || !editingLessonData.module_id) {
      onShowToast('Titre et Module sont requis', 'warning');
      return;
    }

    const finalYoutubeId = editingLessonData.youtube_id ? extractYouTubeId(editingLessonData.youtube_id) : null;

    // Only send columns that exist in DB: id, title, youtube_id, duration, module_id, sort_order, tenant_id, is_free, description
    const payload: any = {
      title: editingLessonData.title,
      description: editingLessonData.description || null,
      youtube_id: finalYoutubeId || null,
      module_id: Number(editingLessonData.module_id),
      sort_order: editingLessonData.sort_order ?? 0,
      tenant_id: TENANT_ID,
      is_free: editingLessonData.is_free ?? true,
      duration: editingLessonData.duration || null,
    };

    let error;
    if (editingLessonData.id) {
      ({ error } = await supabase.from('academy_lessons').update(payload).eq('id', editingLessonData.id));
    } else {
      ({ error } = await supabase.from('academy_lessons').insert(payload));
    }

    if (error) {
      console.error('Save lesson error:', error);
      onShowToast(`Erreur: ${error.message}`, 'error');
    } else {
      onShowToast(editingLessonData.id ? 'Leçon mise à jour ✓' : 'Leçon créée ✓', 'success');
      setIsEditingLesson(false);
      fetchData();
    }
  };

  const deleteLesson = async (id: number) => {
    if (!window.confirm('Supprimer cette leçon ?')) return;
    await supabase.from('academy_lessons').delete().eq('id', id);
    onShowToast('Leçon supprimée', 'success');
    fetchData();
  };

  const moveModule = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) return;
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    let tempOrder = newModules[index].sort_order;
    newModules[index].sort_order = newModules[targetIndex].sort_order;
    newModules[targetIndex].sort_order = tempOrder;
    if (newModules[index].sort_order === newModules[targetIndex].sort_order) {
      newModules[index].sort_order = index;
      newModules[targetIndex].sort_order = targetIndex;
    }
    setModules([...newModules].sort((a, b) => a.sort_order - b.sort_order));
    await supabase.from('academy_modules').update({ sort_order: newModules[index].sort_order }).eq('id', newModules[index].id);
    await supabase.from('academy_modules').update({ sort_order: newModules[targetIndex].sort_order }).eq('id', newModules[targetIndex].id);
  };

  const moveLesson = async (moduleId: number, index: number, direction: 'up' | 'down') => {
    const modLessons = lessons.filter(l => l.module_id === moduleId).sort((a, b) => a.sort_order - b.sort_order);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modLessons.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const item1 = { ...modLessons[index] };
    const item2 = { ...modLessons[targetIndex] };
    const tempOrder = item1.sort_order;
    item1.sort_order = item2.sort_order || targetIndex;
    item2.sort_order = tempOrder || index;
    setLessons(lessons.map(l => l.id === item1.id ? item1 : l.id === item2.id ? item2 : l));
    await supabase.from('academy_lessons').update({ sort_order: item1.sort_order }).eq('id', item1.id);
    await supabase.from('academy_lessons').update({ sort_order: item2.sort_order }).eq('id', item2.id);
  };

  const currentPreviewId = editingLessonData.youtube_id ? extractYouTubeId(editingLessonData.youtube_id) : '';

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">

      {/* HEADER */}
      <GlassCard className="p-4 border-accent-emerald/30 shadow-[0_0_15px_rgba(0,255,150,0.05)] flex justify-between items-center sticky top-0 z-20 backdrop-blur-xl bg-bg-void/80">
        <h3 className="text-[11px] font-black tracking-[0.2em] uppercase text-accent-emerald flex items-center gap-2">
          <GraduationCap size={16} />
          Academy Manager
        </h3>
        <button
          onClick={() => {
            setEditingModuleData({ title: '', description: '', sort_order: modules.length });
            setIsEditingModule(true);
            setIsEditingLesson(false);
          }}
          className="p-2.5 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:shadow-[0_0_15px_rgba(0,255,150,0.4)] transition-all font-black text-black"
          style={{ background: 'var(--accent-neon)' }}
        >
          <Plus size={16} />
        </button>
      </GlassCard>

      {/* MODULE FORM */}
      {isEditingModule && (
        <GlassCard className="p-5 border-accent-emerald shadow-[0_0_20px_rgba(0,255,150,0.1)]">
          <h4 className="text-[10px] font-black tracking-widest uppercase mb-4 text-accent-emerald border-b border-border-subtle/30 pb-2">
            {editingModuleData.id ? '✏️ Éditer Module' : '➕ Nouveau Module'}
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Titre *</label>
              <input
                type="text"
                value={editingModuleData.title}
                onChange={e => setEditingModuleData({ ...editingModuleData, title: e.target.value })}
                placeholder="Ex: Module 1 — Les Bases"
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:border-accent-emerald outline-none min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Description (optionnel)</label>
              <textarea
                rows={2}
                value={editingModuleData.description || ''}
                onChange={e => setEditingModuleData({ ...editingModuleData, description: e.target.value })}
                placeholder="Décrivez le contenu de ce module..."
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-emerald outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsEditingModule(false)} className="px-5 py-3 bg-bg-elevated border border-border-subtle text-text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest min-h-[44px]">Annuler</button>
              <NeonButton onClick={saveModule} className="px-5 py-3 text-[10px] min-h-[44px]">
                <Save size={14} /> ENREGISTRER
              </NeonButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* LESSON FORM */}
      {isEditingLesson && (
        <GlassCard className="p-5 border-[#0098EA] shadow-[0_0_20px_rgba(0,152,234,0.1)]">
          <h4 className="text-[10px] font-black tracking-widest uppercase mb-4 text-[#0098EA] border-b border-border-subtle/30 pb-2">
            {editingLessonData.id ? '✏️ Éditer Leçon' : '🎬 Nouvelle Leçon'}
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Module *</label>
              <select
                value={editingLessonData.module_id}
                onChange={e => setEditingLessonData({ ...editingLessonData, module_id: Number(e.target.value) })}
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-3 py-3 text-sm font-bold text-text-primary focus:border-[#0098EA] outline-none min-h-[44px]"
              >
                <option value="">Sélectionner un module</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Titre de la leçon *</label>
              <input
                type="text"
                value={editingLessonData.title}
                onChange={e => setEditingLessonData({ ...editingLessonData, title: e.target.value })}
                placeholder="Ex: Introduction au Price Action"
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:border-[#0098EA] outline-none min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">URL YouTube ou ID vidéo</label>
              <input
                type="text"
                value={editingLessonData.youtube_id || ''}
                onChange={e => setEditingLessonData({ ...editingLessonData, youtube_id: e.target.value })}
                placeholder="https://youtube.com/watch?v=... ou ID direct"
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-primary focus:border-[#0098EA] outline-none min-h-[44px]"
              />
            </div>

            {/* YOUTUBE PREVIEW */}
            {currentPreviewId && currentPreviewId.length === 11 && (
              <div className="rounded-xl overflow-hidden border border-border-subtle aspect-video bg-bg-void relative">
                <img src={`https://img.youtube.com/vi/${currentPreviewId}/mqdefault.jpg`} alt="Preview" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="bg-red-600 text-white p-2 rounded-xl"><Video size={20} /></span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Durée (ex: 12:30)</label>
              <input
                type="text"
                value={editingLessonData.duration || ''}
                onChange={e => setEditingLessonData({ ...editingLessonData, duration: e.target.value })}
                placeholder="Ex: 14:32"
                className="w-full bg-bg-void border border-border-subtle rounded-xl px-4 py-3 text-xs font-mono text-text-primary focus:border-[#0098EA] outline-none min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest uppercase text-text-secondary ml-1">Accès</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: true, label: 'GRATUIT', icon: <Unlock size={14} />, color: 'var(--accent-neon)' },
                  { val: false, label: 'VIP', icon: <Lock size={14} />, color: 'var(--accent-gold)' },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => setEditingLessonData({ ...editingLessonData, is_free: opt.val })}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border transition-all min-h-[44px] font-black text-[10px] uppercase tracking-widest"
                    style={{
                      background: editingLessonData.is_free === opt.val ? 'rgba(0,255,65,0.08)' : 'var(--bg-void)',
                      borderColor: editingLessonData.is_free === opt.val ? opt.color : 'var(--border-subtle)',
                      color: editingLessonData.is_free === opt.val ? opt.color : 'var(--text-muted)',
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsEditingLesson(false)} className="px-5 py-3 bg-bg-elevated border border-border-subtle text-text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest min-h-[44px]">Annuler</button>
              <button onClick={saveLesson} className="px-5 py-3 bg-[#0098EA] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(0,152,234,0.4)] active:scale-95 transition-transform min-h-[44px]">
                <Save size={14} /> ENREGISTRER
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* MODULES LIST */}
      <div className="space-y-6">
        {isLoading && (
          <div className="text-center text-accent-emerald animate-pulse text-[10px] font-black tracking-widest uppercase py-10">Chargement...</div>
        )}

        {modules.map((mod, mIndex) => {
          const modLessons = lessons.filter(l => l.module_id === mod.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          return (
            <GlassCard key={mod.id} className="p-4 border-border-subtle/50 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: 'var(--accent-neon)' }} />

              {/* Module Header */}
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-border-subtle/30 pl-3">
                <div className="flex-1">
                  <h3 className="font-black text-[13px] tracking-wide text-white uppercase">{mod.title}</h3>
                  {mod.description && <p className="text-[10px] text-text-secondary mt-1">{mod.description}</p>}
                  <p className="text-[9px] text-text-muted mt-1 font-mono">{modLessons.length} leçon{modLessons.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="flex items-center gap-1 bg-bg-void/80 p-1 rounded-xl border border-border-subtle/50 ml-2 flex-shrink-0">
                  <div className="flex flex-col">
                    <button onClick={() => moveModule(mIndex, 'up')} disabled={mIndex === 0} className="p-1 text-text-secondary hover:text-white disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => moveModule(mIndex, 'down')} disabled={mIndex === modules.length - 1} className="p-1 text-text-secondary hover:text-white disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div className="w-[1px] h-8 bg-border-subtle/50 mx-1" />
                  <button
                    onClick={() => {
                      setEditingLessonData({ module_id: mod.id, title: '', youtube_id: '', description: '', is_free: true, sort_order: modLessons.length });
                      setIsEditingLesson(true);
                      setIsEditingModule(false);
                    }}
                    className="p-2 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                    style={{ color: '#0098EA' }}
                    title="Ajouter une leçon"
                  >
                    <Plus size={16} />
                  </button>
                  <button onClick={() => { setEditingModuleData(mod); setIsEditingModule(true); setIsEditingLesson(false); }} className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => deleteModule(mod.id)} className="p-2 text-accent-red hover:bg-accent-red/20 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Lessons */}
              <div className="space-y-2 pl-3">
                {modLessons.map((lesson, lIndex) => (
                  <div key={lesson.id} className="flex items-center justify-between p-2.5 bg-bg-void/50 rounded-xl border border-border-subtle/30 hover:border-border-subtle transition-colors">
                    <div className="flex items-center gap-3 flex-1 truncate pr-2">
                      <div className="w-10 h-7 bg-bg-elevated rounded flex-shrink-0 overflow-hidden relative border border-border-subtle/50">
                        {lesson.youtube_id ? (
                          <img src={`https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Video size={12} className="absolute inset-0 m-auto text-text-secondary opacity-50" />
                        )}
                      </div>
                      <div className="flex flex-col truncate">
                        <p className="text-[11px] font-bold text-text-primary truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[8px] font-black uppercase tracking-widest ${lesson.is_free ? 'text-accent-emerald' : 'text-accent-gold'}`}>
                            {lesson.is_free ? '🔓 GRATUIT' : '🔒 VIP'}
                          </span>
                          {lesson.duration && <span className="text-[8px] text-text-muted font-mono">{lesson.duration}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex flex-col mr-1">
                        <button onClick={() => moveLesson(mod.id, lIndex, 'up')} disabled={lIndex === 0} className="text-text-secondary hover:text-white disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => moveLesson(mod.id, lIndex, 'down')} disabled={lIndex === modLessons.length - 1} className="text-text-secondary hover:text-white disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <button onClick={() => { setEditingLessonData(lesson); setIsEditingLesson(true); setIsEditingModule(false); }} className="p-2 text-text-muted hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center bg-bg-elevated/50 rounded-lg"><Edit size={12} /></button>
                      <button onClick={() => deleteLesson(lesson.id)} className="p-2 text-text-muted hover:text-accent-red min-h-[36px] min-w-[36px] flex items-center justify-center bg-bg-elevated/50 rounded-lg"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                {modLessons.length === 0 && (
                  <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest py-3 text-center border border-dashed border-border-subtle/30 rounded-xl">
                    Aucune leçon — cliquez sur + pour en ajouter
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}

        {!isLoading && modules.length === 0 && (
          <div className="text-center py-10 bg-bg-elevated/30 rounded-2xl border border-border-subtle/30 border-dashed">
            <GraduationCap size={24} className="mx-auto mb-3 text-text-secondary opacity-50" />
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Aucun module créé</p>
            <p className="text-[9px] text-text-muted">Appuyez sur le + en haut pour créer votre premier module</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademyManager;
