import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
      (n) => !Array.isArray(n.read_by) || !n.read_by.some((id: any) => Number(id) === userTgId)
    ).length;
  };

  const unreadCount = getUnreadCount();

  // Mark single as read
  const markAsRead = async (notif: any) => {
    if (!userTgId) {
      handleNotifClick(notif);
      return;
    }
    const isAlreadyRead = Array.isArray(notif.read_by) && notif.read_by.some((id: any) => Number(id) === userTgId);
    if (isAlreadyRead) {
      handleNotifClick(notif);
      return;
    }

    const updatedReadBy = [...(Array.isArray(notif.read_by) ? notif.read_by : []), userTgId];

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
      (n) => !Array.isArray(n.read_by) || !n.read_by.some((id: any) => Number(id) === userTgId)
    );

    if (unreadNotifs.length === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => {
        const isUnread = !Array.isArray(n.read_by) || !n.read_by.some((id: any) => Number(id) === userTgId);
        if (isUnread) {
          return { ...n, read_by: [...(Array.isArray(n.read_by) ? n.read_by : []), userTgId] };
        }
        return n;
      })
    );

    try {
      // Loop update
      for (const notif of unreadNotifs) {
        const updatedReadBy = [...(Array.isArray(notif.read_by) ? notif.read_by : []), userTgId];
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
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
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
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Backdrop for closing when clicking outside */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'transparent',
          }}
        />
      )}

      {/* Shake & Pulse Keyframe definitions */}
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
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.4; }
          50% { transform: scale(1.05); opacity: 0.7; }
          100% { transform: scale(0.95); opacity: 0.4; }
        }
        .notif-item {
          transition: background-color 0.2s ease, transform 0.1s ease;
        }
        .notif-item:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
        .notif-item:active {
          transform: scale(0.99);
        }
      `}</style>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notification-dropdown"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '320px',
              background: 'rgba(10, 14, 26, 0.97)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(0, 255, 65, 0.15)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 65, 0.04)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', margin: 0 }}>
                NOTIFICATIONS
              </h3>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--green)',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Space Mono',
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                  }}
                >
                  TOUT LIRE
                </button>
              )}
            </div>

            {/* Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', paddingRight: '4px' }}>
              {notifications.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 12px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0, 255, 65, 0.05)', filter: 'blur(6px)', animation: 'pulse 2s infinite' }} />
                    <Bell size={20} color="rgba(0, 255, 65, 0.4)" style={{ position: 'relative' }} />
                  </div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px 0', letterSpacing: '0.02em' }}>
                    Aucune notification
                  </p>
                  <p style={{ fontSize: '9px', color: 'var(--muted)', margin: 0, lineHeight: 1.3 }}>
                    Vous êtes à jour ! Aucun message reçu ces 7 derniers jours.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = Array.isArray(notif.read_by) && notif.read_by.some((id: any) => Number(id) === userTgId);
                  
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif)}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        padding: '10px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        opacity: isRead ? 0.6 : 1,
                        borderRadius: '8px',
                        marginBottom: '2px',
                      }}
                      className="notif-item"
                    >
                      <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        {getTypeIcon(notif.type)}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: isRead ? 500 : 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {notif.title}
                          </span>
                          <span style={{ fontFamily: 'Space Mono', fontSize: '7px', color: 'var(--muted)', flexShrink: 0 }}>
                            {formatTimeAgo(notif.sent_at)}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {notif.body}
                        </p>
                      </div>

                      {!isRead && (
                        <div
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: 'var(--green)',
                            alignSelf: 'center',
                            boxShadow: '0 0 5px var(--green)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
