import { Outlet, useParams, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, GraduationCap, Calculator, User, ShieldCheck, X, Zap, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLongPress } from '../hooks/useLongPress';
import { useClientConfig } from '../hooks/useClientConfig';
import { TradingModeProvider } from '../context/TradingModeContext';
import MasterControlPanel from '../components/MasterControlPanel';
import { useUserRole } from '../hooks/useUserRole';
import SniperLogo from '../assets/SniperLogo';
import { AnimatePresence } from 'framer-motion';
import NotificationBell from '../components/NotificationBell';

function CheckCircleIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function StudentShell() {
  const { tenant_id } = useParams();
  const location = useLocation();
  const { config: tenantConfig, loading: configLoading } = useClientConfig();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [showMasterControl, setShowMasterControl] = useState(false);

  // Check for mode=master in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('mode') === 'master') {
      const telegramId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
      const operatorId = import.meta.env.VITE_OPERATOR_ID;
      const isDev = import.meta.env.DEV;
      
      // Bypass check for test/dev or if specifically allowed
      if (telegramId === operatorId || isDev || !operatorId) {
        setShowMasterControl(true);
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (!roleLoading && !isAdmin && location.pathname.includes('/admin')) {
      navigate(`/app/${tenant_id}/live`, { replace: true });
    }
  }, [isAdmin, roleLoading, location.pathname, tenant_id, navigate]);

  // Redirect to live tab on initial mount/refresh
  useEffect(() => {
    if (tenant_id) {
      navigate(`/app/${tenant_id}/live`, { replace: true });
    }
  }, []);

  const navItems = [
    { path: 'live',    icon: Activity,      label: 'Live'    },
    { path: 'academy', icon: GraduationCap, label: 'Academy' },
    { path: 'calcul',  icon: Calculator,    label: 'Calcul'  },
    { path: 'profile', icon: User,          label: tenantConfig?.mentorName?.split(' ')[0] || 'Mentor' },
  ];
  if (isAdmin) navItems.push({ path: 'admin', icon: ShieldCheck, label: 'Admin' });

  const { refresh } = useClientConfig();

  const [time, setTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour12: false }));
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('fr-FR', { hour12: false })), 1000);
    return () => clearInterval(timer);
  }, []);

  const longPress = useLongPress(() => {
    const telegramId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    const operatorId = import.meta.env.VITE_OPERATOR_ID;
    const isDev = import.meta.env.DEV;
    const searchParams = new URLSearchParams(location.search);
    const isBypass = searchParams.get('auth') === 'bypass';
    
    if (telegramId === operatorId || isDev || !operatorId || isBypass) {
      setShowMasterControl(true);
    } else {
      setShowUpgradeSheet(true);
    }
  }, 3000);

  const setDebugRole = (role: string | null) => {
    if (role) {
      localStorage.setItem('debug_role', role);
    } else {
      localStorage.removeItem('debug_role');
    }
    window.location.reload();
  };

  const currentDebugRole = localStorage.getItem('debug_role');

  return (
    <TradingModeProvider tenantId={tenant_id || ''}>
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)', maxWidth: 430, margin: '0 auto', position: 'relative', borderLeft: '1px solid var(--subtle)', borderRight: '1px solid var(--subtle)' }}>

      {/* ─── COMPACT HEADER ─────────────────────────── */}
      <header style={{ background: 'rgba(8,11,20,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--subtle)', padding: '10px 16px 8px', position: 'sticky', top: 0, zIndex: 50 }}>

        {/* Row 1 — System bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            <SniperLogo size={16} animated={false} />
            SNIPER TERMINAL
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            SNIPER-V2.4
            <span style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              {[4, 7, 5, 9].map((h, i) => (
                <span key={i} style={{ width: 3, height: h, background: i < 3 ? 'var(--green)' : 'var(--subtle)', borderRadius: 1, display: 'inline-block' }} />
              ))}
            </span>
          </div>
        </div>

        {/* Row 2 — Mentor + Avatar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1, margin: 0, textTransform: 'uppercase' }}>
              {tenantConfig?.mentorName || 'SNIPER'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ width: 5, height: 5, background: 'var(--green)', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>MENTOR ACCESS</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Notification Bell */}
            <NotificationBell tenantId={tenant_id || ''} />

            <div 
              onClick={() => navigate(`/app/${tenant_id}/profile`)}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--green)', overflow: 'hidden', background: 'var(--elevated)', flexShrink: 0, boxShadow: '0 0 12px rgba(0,255,65,0.25)', cursor: 'pointer' }}
            >
              {tenantConfig?.logo_url || tenantConfig?.mentorPhotoUrl ? (
                <img
                  src={tenantConfig?.logo_url || tenantConfig?.mentorPhotoUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt="mentor"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 700 }}>
                  {(tenantConfig?.mentorName || 'M').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ paddingBottom: 80 }}>
        <Outlet context={{ tenant_id, tenantConfig }} />
      </main>

      {/* ─── BOTTOM NAVIGATION ───────────────────────── */}
      <nav className="floating-dock" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        {/* POWERED BY strip */}
        <div
          style={{ fontFamily: 'var(--mono)', fontSize: 8, opacity: 0.2, textAlign: 'center', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 6, cursor: 'default', userSelect: 'none', textTransform: 'uppercase' }}
          {...longPress}
        >
          <SniperLogo size={10} animated={false} />
          <span>SNIPER</span>
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isExternal = item.path.startsWith('/');
            const isActive = isExternal
              ? location.pathname.startsWith(item.path)
              : location.pathname.includes(`/app/${tenant_id}/${item.path}`);
            const isAdminItem = item.path === 'admin';
            const activeColor = isAdminItem ? 'var(--amber)' : 'var(--green)';

            return (
              <NavLink
                key={item.path}
                to={isExternal ? item.path : `/app/${tenant_id}/${item.path}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '2px 0', position: 'relative', textDecoration: 'none', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <item.icon
                  size={20}
                  style={{ opacity: isActive ? 1 : 0.3, color: isActive ? activeColor : 'var(--text)', transition: 'all 0.2s' }}
                />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive ? activeColor : 'var(--muted)', transition: 'color 0.2s' }}>
                  {item.label}
                </span>
                {isActive && (
                  <span style={{ position: 'absolute', bottom: -8, width: 18, height: 2, borderRadius: 1, background: activeColor, boxShadow: `0 0 8px ${activeColor}` }} />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ─── DEBUG ROLE SWITCHER ─── */}
      <div style={{ position: 'fixed', bottom: 100, left: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--amber)', textTransform: 'uppercase', textAlign: 'center', fontWeight: 700 }}>Test Roles</div>
        <button onClick={() => setDebugRole('admin')} style={{ padding: '6px 12px', fontSize: 10, fontFamily: 'var(--mono)', borderRadius: 6, border: '1px solid var(--green)', background: currentDebugRole === 'admin' ? 'var(--green)' : 'transparent', color: currentDebugRole === 'admin' ? '#000' : 'var(--green)', cursor: 'pointer' }}>ADMIN</button>
        <button onClick={() => setDebugRole('vip')} style={{ padding: '6px 12px', fontSize: 10, fontFamily: 'var(--mono)', borderRadius: 6, border: '1px solid #FFD60A', background: currentDebugRole === 'vip' ? '#FFD60A' : 'transparent', color: currentDebugRole === 'vip' ? '#000' : '#FFD60A', cursor: 'pointer' }}>VIP</button>
        <button onClick={() => setDebugRole('free')} style={{ padding: '6px 12px', fontSize: 10, fontFamily: 'var(--mono)', borderRadius: 6, border: '1px solid #fff', background: currentDebugRole === 'free' ? '#fff' : 'transparent', color: currentDebugRole === 'free' ? '#000' : '#fff', cursor: 'pointer' }}>GRATUIT</button>
        {currentDebugRole && <button onClick={() => setDebugRole(null)} style={{ padding: '6px 12px', fontSize: 10, fontFamily: 'var(--mono)', borderRadius: 6, border: '1px solid var(--red)', color: 'var(--red)', background: 'transparent', cursor: 'pointer', marginTop: 4 }}>RESET</button>}
      </div>

      {/* ─── UPGRADE SHEET ─── */}
      {showUpgradeSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowUpgradeSheet(false)} />
          <div style={{ position: 'relative', background: 'var(--bg)', borderTop: '1px solid rgba(0,255,65,0.3)', borderRadius: '20px 20px 0 0', padding: 24, boxShadow: '0 -10px 40px rgba(0,255,65,0.1)' }}>
            <button onClick={() => setShowUpgradeSheet(false)} style={{ position: 'absolute', top: 16, right: 16, padding: 8, background: 'var(--elevated)', border: 'none', borderRadius: '50%', color: 'var(--muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 4, background: 'var(--subtle)', borderRadius: 2 }} />
            </div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--green-dim)', border: '1px solid var(--green-border)', marginBottom: 16 }}>
                <Zap size={24} color="var(--green)" />
              </div>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                Lance ta propre<br /><span style={{ color: 'var(--green)' }}>Mini App</span>
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Monétise ton audience comme un pro avec ton propre terminal Telegram.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {['Design Premium sur mesure', 'Paiements Crypto 0% de frais', 'Espace Academy Sécurisé', 'Notifications Push en temps réel'].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--glass)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--subtle)' }}>
                  <CheckCircleIcon size={16} className="text-accent-emerald" />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{feat}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>À partir de</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700 }}>49$/<span style={{ fontSize: 14 }}>mois</span></span>
            </div>
            <a href="https://sniper.ephatatech.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', background: 'var(--green)', color: '#000', borderRadius: 12, fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 0 20px rgba(0,255,65,0.4)', textDecoration: 'none' }}>
              Créer mon app <ArrowRight size={18} />
            </a>
            <p style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 12 }}>
              🎁 30 jours EMPIRE offerts
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showMasterControl && <MasterControlPanel onClose={() => setShowMasterControl(false)} />}
      </AnimatePresence>
    </div>
    </TradingModeProvider>
  );
}
