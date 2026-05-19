import React, { useEffect, useState } from 'react';
import { Bell, X, Activity, Check, Trash2, ShieldCheck, GraduationCap, User, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';

interface NotificationBellProps {
  tenantId: string;
}

export default function NotificationBell({ tenantId }: NotificationBellProps) {
  const { currentUser, isAdmin, isVip } = useUserRole();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const userTgId = tgUser?.id ? Number(tgUser.id) : (currentUser?.telegram_id ? Number(currentUser.telegram_id) : null);
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .gt('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(30);

      // Construct OR filters
      const orFilters = ['target_type.eq.all_members'];
      if (userTgId) {
        orFilters.push(`target_telegram_id.eq.${userTgId}`);
      }
      if (isVip) {
        orFilters.push('target_type.eq.vip_members');
      } else {
        orFilters.push('target_type.eq.free_members');
      }
      if (isAdmin || currentUser?.role === 'mentor') {
        orFilters.push('target_type.eq.mentor');
      }

      query = query.or(orFilters.join(','));

      const { data, error } = await query;
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [tenantId, currentUser, isVip, isAdmin]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-live-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, currentUser]);

  const userTgId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id 
    ? Number((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) 
    : (currentUser?.telegram_id ? Number(currentUser.telegram_id) : null);

  const getUnreadCount = () => {
    if (!userTgId) return 0;
    return notifications.filter(
      (n) => !n.read_by || !n.read_by.some((id: any) => Number(id) === userTgId)
    ).length;
  };

  const unreadCount = getUnreadCount();

  // Mark single as read
  const markAsRead = async (notif: any) => {
    if (!userTgId) return;
    const isAlreadyRead = notif.read_by && notif.read_by.some((id: any) => Number(id) === userTgId);
    if (isAlreadyRead) {
      handleNotifClick(notif);
      return;
    }

    const updatedReadBy = [...(notif.read_by || []), userTgId];

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read_by: updatedReadBy } : n))
    );

    try {
      await supabase
        .from('notifications')
        .update({ read_by: updatedReadBy })
        .eq('id', notif.id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }

    handleNotifClick(notif);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userTgId) return;
    const unreadNotifs = notifications.filter(
      (n) => !n.read_by || !n.read_by.some((id: any) => Number(id) === userTgId)
    );

    if (unreadNotifs.length === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => {
        const isUnread = !n.read_by || !n.read_by.some((id: any) => Number(id) === userTgId);
        if (isUnread) {
          return { ...n, read_by: [...(n.read_by || []), userTgId] };
        }
        return n;
      })
    );

    try {
      // Loop update
      for (const notif of unreadNotifs) {
        const updatedReadBy = [...(notif.read_by || []), userTgId];
        await supabase
          .from('notifications')
          .update({ read_by: updatedReadBy })
          .eq('id', notif.id);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Click handler to redirect or scroll
  const handleNotifClick = (notif: any) => {
    if (notif.data?.signal_id) {
      setIsOpen(false);
      // Wait for navigation and state to update
      setTimeout(() => {
        const card = document.getElementById(`sig-card-${notif.data.signal_id}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.borderColor = 'var(--green)';
          setTimeout(() => {
            card.style.borderColor = 'var(--subtle)';
          }, 2000);
        }
      }, 350);
    }
  };

  // Timeago helper in French
  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHr < 24) return `Il y a ${diffHr} h`;
    if (diffDay === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Category type icon map
  const getTypeIcon = (type: string) => {
    const circleStyle = {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    };

    switch (type) {
      case 'new_signal':
        return (
          <div style={{ ...circleStyle, background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
            <Activity size={15} color="var(--green)" />
          </div>
        );
      case 'signal_tp_hit':
      case 'payment_confirmed':
      case 'vip_activated':
        return (
          <div style={{ ...circleStyle, background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)' }}>
            <Check size={15} color="var(--green)" />
          </div>
        );
      case 'signal_sl_hit':
      case 'signal_cancelled':
      case 'vip_expired':
      case 'access_rejected':
        return (
          <div style={{ ...circleStyle, background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)' }}>
            <X size={15} color="#FF3B30" />
          </div>
        );
      case 'new_lesson':
      case 'new_module':
        return (
          <div style={{ ...circleStyle, background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.2)' }}>
            <GraduationCap size={15} color="#007AFF" />
          </div>
        );
      case 'new_member':
      case 'new_payment_request':
      case 'new_broker_request':
      case 'vip_member_expiring':
        return (
          <div style={{ ...circleStyle, background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.2)' }}>
            <ShieldCheck size={15} color="var(--amber)" />
          </div>
        );
      default:
        return (
          <div style={{ ...circleStyle, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Bell size={15} color="var(--muted)" />
          </div>
        );
    }
  };

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Bell size={16} color="var(--text)" style={{ animation: unreadCount > 0 ? 'bell-shake 1.5s infinite alternate' : 'none' }} />
        
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              background: '#FF3B30',
              border: '2px solid #080B14',
              fontFamily: 'Space Mono',
              fontSize: '9px',
              fontWeight: 700,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 10px rgba(255,59,48,0.4)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Shake Keyframe definition */}
      <style>{`
        @keyframes bell-shake {
          0% { transform: rotate(0); }
          15% { transform: rotate(10deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(5deg); }
          60% { transform: rotate(-5deg); }
          75% { transform: rotate(2deg); }
          100% { transform: rotate(0); }
        }
      `}</style>

      {/* Bottom Sheet Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(8px)' }}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                position: 'relative',
                background: 'var(--bg)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px 24px 0 0',
                padding: '20px 16px 32px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Drag Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'Space Mono', fontSize: '12px', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', margin: 0 }}>
                  NOTIFICATIONS
                </h3>
                
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--green)',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Space Mono',
                      letterSpacing: '0.05em',
                      padding: '4px 8px',
                    }}
                  >
                    TOUT MARQUER LU
                  </button>
                )}
              </div>

              {/* Scrollable List */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '50vh', paddingRight: '4px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
                    Aucune notification reçue ces 7 derniers jours.
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isRead = notif.read_by && notif.read_by.some((id: any) => Number(id) === userTgId);
                    
                    return (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif)}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '14px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: 'pointer',
                          opacity: isRead ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {getTypeIcon(notif.type)}
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: isRead ? 500 : 700, color: '#FFFFFF' }}>
                              {notif.title}
                            </span>
                            <span style={{ fontFamily: 'Space Mono', fontSize: '8px', color: 'var(--muted)' }}>
                              {formatTimeAgo(notif.sent_at)}
                            </span>
                          </div>
                          
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, margin: 0 }}>
                            {notif.body}
                          </p>
                        </div>

                        {!isRead && (
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--green)',
                              alignSelf: 'center',
                              boxShadow: '0 0 6px var(--green)',
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
