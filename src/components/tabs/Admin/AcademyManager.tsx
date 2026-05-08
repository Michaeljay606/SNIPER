import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus, Play, Trash2, X, Lock } from 'lucide-react';
import { GlassCard } from '../../ui/Shared';
import NeonButton from '../../NeonButton';

const AcademyManager = ({ 
  dbModules, 
  dbLessons, 
  features, 
  handleAddModule, 
  handleDeleteModule, 
  handleAddLesson, 
  handleDeleteLesson, 
  newLesson, 
  setNewLesson, 
  isPremiumLoading,
  setShowUpgradeSheet 
}: any) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">{t('admin.module_mgmt')}</h3>
        </div>
        <button 
          onClick={handleAddModule}
          className="text-[9px] font-bold text-accent-neon border border-accent-neon/30 px-3 py-1 rounded-full hover:bg-accent-neon hover:text-bg-void transition-all"
        >
          {t('admin.add_module')}
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 px-1">
        {dbModules.map((m: any) => (
          <div key={m.id} className="flex items-center gap-2 bg-bg-surface border border-border-subtle px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold">{m.title}</span>
            <button onClick={() => handleDeleteModule(m.id)} className="text-accent-danger hover:scale-110">
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
      
      <GlassCard className="space-y-4 border-accent-neon/20">
        <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Play size={16} className="text-accent-neon" /> {t('admin.new_training_video')}
        </h3>
        <form onSubmit={handleAddLesson} className="space-y-3">
          <input 
            required
            value={newLesson.title}
            onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
            className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-xs outline-none focus:border-accent-neon"
            placeholder={t('admin.lesson_title')}
          />
          <div className="grid grid-cols-2 gap-2">
            <input 
              required
              value={newLesson.youtubeId}
              onChange={(e) => setNewLesson({...newLesson, youtubeId: e.target.value})}
              className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-xs outline-none"
              placeholder="YouTube ID"
            />
            <select 
              required
              value={newLesson.module_id}
              onChange={(e) => setNewLesson({...newLesson, module_id: e.target.value})}
              className="w-full bg-bg-void border border-border-subtle rounded-xl p-3 text-xs outline-none"
            >
              <option value="">{t('admin.select_module')}</option>
              {dbModules.map((m: any) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
          <NeonButton type="submit" disabled={isPremiumLoading} className="w-full py-3 text-xs">
            {isPremiumLoading ? '...' : t('admin.publish')}
          </NeonButton>
        </form>
      </GlassCard>

      <div className="space-y-2">
        {dbLessons.map((lesson: any) => (
          <GlassCard key={lesson.id} className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-neon/10 rounded flex items-center justify-center text-accent-neon">
                <Play size={14} />
              </div>
              <div>
                <p className="text-xs font-bold">{lesson.title}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-widest">
                  {dbModules.find((m: any) => m.id === lesson.module_id)?.title || 'No Module'}
                </p>
              </div>
            </div>
            <button onClick={() => handleDeleteLesson(lesson.id)} className="text-accent-danger p-2 hover:bg-accent-danger/10 rounded-lg transition-all">
              <Trash2 size={14} />
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default AcademyManager;
