import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TENANT_ID } from '../../config';

export default function AdminAcademy() {
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [editingModuleData, setEditingModuleData] = useState<any>({ title: '', description: '', position: 0 });

  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonData, setEditingLessonData] = useState<any>({ module_id: '', title: '', description: '', video_url: '', thumbnail_url: '', level: 'basic', position: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: mData } = await supabase.from('modules').select('*').eq('tenant_id', TENANT_ID).order('position');
    const { data: lData } = await supabase.from('lessons').select('*').eq('tenant_id', TENANT_ID).order('position');
    if (mData) setModules(mData);
    if (lData) setLessons(lData);
  }

  const saveModule = async () => {
    if (!editingModuleData.title) return;
    const payload = { ...editingModuleData, tenant_id: TENANT_ID };
    if (payload.id) {
      await supabase.from('modules').update(payload).eq('id', payload.id);
    } else {
      await supabase.from('modules').insert(payload);
    }
    setIsEditingModule(false);
    fetchData();
  };

  const deleteModule = async (id: string) => {
    if (confirm('Supprimer ce module et toutes ses leçons ?')) {
      await supabase.from('lessons').delete().eq('module_id', id);
      await supabase.from('modules').delete().eq('id', id);
      fetchData();
    }
  };

  const saveLesson = async () => {
    if (!editingLessonData.title || !editingLessonData.module_id) return;
    const payload = { ...editingLessonData, tenant_id: TENANT_ID };
    if (!payload.thumbnail_url && payload.video_url?.includes('v=')) {
      payload.thumbnail_url = `https://img.youtube.com/vi/${payload.video_url.split('v=')[1]}/mqdefault.jpg`;
    }
    
    if (payload.id) {
      await supabase.from('lessons').update(payload).eq('id', payload.id);
    } else {
      await supabase.from('lessons').insert(payload);
    }
    setIsEditingLesson(false);
    fetchData();
  };

  const deleteLesson = async (id: string) => {
    if (confirm('Supprimer cette leçon ?')) {
      await supabase.from('lessons').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
        <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--accent-emerald)] flex items-center gap-2">
          <GraduationCap size={18} /> Academy Manager
        </h2>
        <button onClick={() => { setEditingModuleData({ title: '', description: '', position: modules.length }); setIsEditingModule(true); }} className="p-2 bg-[var(--accent-emerald)] text-black rounded-lg">
          <Plus size={16} />
        </button>
      </div>

      {isEditingModule && (
        <div className="glass-card p-4 border border-[var(--accent-emerald)] shadow-[0_0_15px_rgba(0,255,150,0.2)]">
          <h3 className="text-[10px] font-bold tracking-widest uppercase mb-4 text-[var(--accent-emerald)]">
            {editingModuleData.id ? 'Éditer Module' : 'Nouveau Module'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Titre</label>
              <input type="text" value={editingModuleData.title} onChange={e => setEditingModuleData({...editingModuleData, title: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsEditingModule(false)} className="px-4 py-2 bg-[var(--bg-input)] text-white rounded-lg text-xs font-bold uppercase">Annuler</button>
              <button onClick={saveModule} className="px-4 py-2 bg-[var(--accent-emerald)] text-black rounded-lg text-xs font-bold uppercase flex items-center gap-2"><Save size={14} /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {isEditingLesson && (
        <div className="glass-card p-4 border border-[var(--accent-gold)] shadow-[0_0_15px_rgba(255,215,0,0.2)]">
          <h3 className="text-[10px] font-bold tracking-widest uppercase mb-4 text-[var(--accent-gold)]">
            {editingLessonData.id ? 'Éditer Leçon' : 'Nouvelle Leçon'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Module</label>
              <select value={editingLessonData.module_id} onChange={e => setEditingLessonData({...editingLessonData, module_id: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">Sélectionner un module</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Titre</label>
              <input type="text" value={editingLessonData.title} onChange={e => setEditingLessonData({...editingLessonData, title: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">URL YouTube</label>
              <input type="text" placeholder="https://youtube.com/watch?v=..." value={editingLessonData.video_url} onChange={e => setEditingLessonData({...editingLessonData, video_url: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Niveau</label>
              <select value={editingLessonData.level} onChange={e => setEditingLessonData({...editingLessonData, level: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none">
                <option value="basic">Basic (Gratuit/Inclus)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsEditingLesson(false)} className="px-4 py-2 bg-[var(--bg-input)] text-white rounded-lg text-xs font-bold uppercase">Annuler</button>
              <button onClick={saveLesson} className="px-4 py-2 bg-[var(--accent-gold)] text-black rounded-lg text-xs font-bold uppercase flex items-center gap-2"><Save size={14} /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="space-y-6">
        {modules.map(mod => (
          <div key={mod.id} className="glass-card p-4">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-sm uppercase tracking-wide">{mod.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => { setEditingLessonData({ module_id: mod.id, title: '', video_url: '', level: 'basic', position: lessons.filter(l => l.module_id === mod.id).length }); setIsEditingLesson(true); }} className="p-1.5 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 rounded">
                  <Plus size={14} />
                </button>
                <button onClick={() => { setEditingModuleData(mod); setIsEditingModule(true); }} className="p-1.5 text-[var(--text-muted)] hover:text-white rounded">
                  <Edit size={14} />
                </button>
                <button onClick={() => deleteModule(mod.id)} className="p-1.5 text-red-500 hover:bg-red-500/20 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2 pl-2">
              {lessons.filter(l => l.module_id === mod.id).map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
                  <div className="flex-1 truncate pr-2">
                    <p className="text-xs font-bold truncate">{lesson.title}</p>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${
                      lesson.level === 'vip' ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}>
                      {lesson.level}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 text-[var(--text-muted)] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"><Edit size={14} /></button>
                    <button className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-red)] min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {lessons.filter(l => l.module_id === mod.id).length === 0 && (
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Aucune leçon dans ce module.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
