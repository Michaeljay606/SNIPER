import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, User, Trash2, Clock, CheckCircle, GraduationCap } from 'lucide-react';
import { GlassCard, Badge } from '../../ui/Shared';

const SignalsBadge = ({ active, expiresAt }: { active: boolean, expiresAt?: string }) => {
  if (!active) return <Badge variant="secondary" className="!text-[7px]">Signals INACTIVE</Badge>;
  return <Badge variant="neon" className="!text-[7px]">Signals Active</Badge>;
};

const AcademyBadge = ({ active, isLifetime, expiresAt }: { active: boolean, isLifetime?: boolean, expiresAt?: string }) => {
  if (!active) return <Badge variant="secondary" className="!text-[7px]">Academy INACTIVE</Badge>;
  return <Badge variant="warning" className="!text-[7px]">Academy {isLifetime ? 'LIFETIME' : 'Active'}</Badge>;
};

const MemberManager = ({ 
  affiliates, 
  features, 
  manageAffiliate, 
  toggleVip, 
  deleteAffiliate, 
  verifyBroker,
  setShowUpgradeSheet 
}: any) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">{t('admin.members_list')}</h3>
        {features.maxMembers && (
          <div className="px-3 py-1 bg-bg-surface rounded-full border border-border-subtle">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent-neon">{affiliates.filter((a: any) => a.status === 'active').length} / {features.maxMembers}</span>
          </div>
        )}
      </div>

      {affiliates.length === 0 ? (
        <GlassCard className="opacity-50 border-dashed p-10 text-center">
          <p className="text-[10px] uppercase tracking-widest">{t('admin.no_pending_request')}</p>
        </GlassCard>
      ) : (
        affiliates.map((aff: any) => (
          <GlassCard key={aff.id} className="space-y-4 relative overflow-hidden">
            {aff.isVip && <div className="absolute top-0 right-0 w-12 h-12 bg-accent-gold/10 rounded-bl-full flex items-start justify-end p-2 text-accent-gold"><Zap size={14} fill="currentColor" /></div>}
            
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-text-primary uppercase tracking-tight">{aff.name}</p>
                  <Badge variant={aff.role === 'admin' ? 'neon' : 'secondary'} className="!text-[7px]">{aff.role}</Badge>
                </div>
                <p className="text-[10px] text-text-secondary font-mono mt-0.5">@{aff.telegramUsername}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant={aff.status === 'active' ? 'neon' : aff.status === 'pending' ? 'warning' : 'danger'}>{aff.status}</Badge>
                <div className="flex gap-1">
                  <SignalsBadge active={aff.signals_active} expiresAt={aff.signals_expires_at} />
                  <AcademyBadge active={aff.academy_active} isLifetime={aff.academy_is_lifetime} expiresAt={aff.academy_expires_at} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-bg-surface rounded-xl border border-border-subtle text-[10px] font-mono">
              <div className="space-y-1">
                <p className="text-[8px] text-text-muted uppercase tracking-widest">ID Compte</p>
                <p className="text-text-primary">{aff.accountNumber || '---'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] text-text-muted uppercase tracking-widest">Broker</p>
                <div className="flex items-center gap-1">
                  <p className="text-text-primary">{aff.broker || '---'}</p>
                  {aff.isBrokerVerified ? (
                    <CheckCircle size={10} className="text-accent-emerald" />
                  ) : (
                    <Clock size={10} className="text-accent-warning" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              {aff.status === 'pending' ? (
                <>
                  <button 
                    onClick={() => manageAffiliate(aff.id, 'active')}
                    className="py-2.5 bg-accent-emerald text-bg-base rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                  >
                    {t('admin.approve')}
                  </button>
                  <button 
                    onClick={() => manageAffiliate(aff.id, 'refused')}
                    className="py-2.5 bg-bg-surface text-accent-red border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    {t('admin.refuse')}
                  </button>
                </>
              ) : (
                <>
                   <button 
                    onClick={() => verifyBroker(aff.id, aff.isBrokerVerified)}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${aff.isBrokerVerified ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20' : 'bg-accent-warning/10 text-accent-warning border-accent-warning/20'}`}
                  >
                    {aff.isBrokerVerified ? 'DÉ-VÉRIFIER BROKER' : 'VÉRIFIER BROKER'}
                  </button>
                  <button 
                    onClick={() => toggleVip(aff.id, aff.isVip)}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${aff.isVip ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/20' : 'bg-bg-surface text-text-primary border-border-subtle'}`}
                  >
                    {aff.isVip ? 'RETIRER VIP' : 'RENDRE VIP'}
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-between items-center px-1">
              <p className="text-[8px] text-text-muted font-mono uppercase">Membre depuis: {new Date(aff.joinedAt).toLocaleDateString()}</p>
              <button 
                onClick={() => deleteAffiliate(aff.id)}
                className="text-[8px] text-accent-red font-black uppercase tracking-widest hover:underline"
              >
                {t('admin.delete_user')}
              </button>
            </div>
          </GlassCard>
        ))
      )}
    </div>
  );
};

export default MemberManager;
