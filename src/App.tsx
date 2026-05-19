import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useConfig } from './context/ConfigContext';
import { useUserRole } from './hooks/useUserRole';
import MentorOnboarding from './components/onboarding/MentorOnboarding';
import MemberOnboarding from './components/onboarding/MemberOnboarding';

// Lightweight fallback for React.Suspense
function SuspenseFallback() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080B14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SniperLogo size={60} animated={true} />
    </div>
  );
}

// Custom Fallback Screens
function EphataWelcome() {
  const [tenantId, setTenantId] = useState('');
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#080B14] text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-center">
          <SniperLogo size={72} animated={true} />
        </div>
        <div className="space-y-2">
          <h1 className="font-mono text-2xl font-black text-[#00FF41] tracking-wider uppercase drop-shadow-[0_0_10px_rgba(0,255,65,0.3)]">
            SNIPER TERMINAL
          </h1>
          <p className="text-xs text-[rgba(255,255,255,0.4)] tracking-widest uppercase font-mono">
            Ephata Tech Premium
          </p>
        </div>
        
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="space-y-2 text-left">
            <label className="block font-mono text-[9px] tracking-[0.15em] text-[rgba(255,255,255,0.35)] uppercase">
              Identifiant du Terminal
            </label>
            <input
              type="text"
              placeholder="Identifiant (ex: default)"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value.toLowerCase().trim())}
              className="w-full bg-black/40 border border-[rgba(255,255,255,0.08)] focus:border-[rgba(0,255,65,0.3)] rounded-[10px] px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tenantId) {
                  navigate(`/app/${tenantId}`);
                }
              }}
            />
          </div>
          <button
            onClick={() => navigate(`/app/${tenantId}`)}
            disabled={!tenantId}
            className={`w-full h-12 rounded-xl font-mono text-xs font-extrabold tracking-[0.06em] transition-all uppercase ${
              tenantId
                ? 'bg-[#00FF41] text-[#080B14] shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:bg-[#00E53B]'
                : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.2)] cursor-not-allowed'
            }`}
          >
            REJOINDRE LE TERMINAL →
          </button>
        </div>

        <div className="pt-4 space-y-2">
          <a
            href="https://sniper.ephatatech.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[10px] font-mono text-[rgba(255,255,255,0.3)] hover:text-white uppercase tracking-wider underline transition-colors"
          >
            Créer mon propre terminal
          </a>
        </div>
      </div>
    </div>
  );
}

function TenantNotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#080B14] text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-mono text-lg font-bold text-red-500 uppercase tracking-tight">
            Terminal Introuvable
          </h2>
          <p className="text-xs text-[rgba(255,255,255,0.45)] leading-relaxed max-w-[280px] mx-auto">
            L'instance demandée n'existe pas ou l'adresse saisie est incorrecte.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

function LicenceSuspended() {
  return (
    <div className="min-h-screen bg-[#080B14] text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-[#FFD60A] shadow-[0_0_20px_rgba(255,214,10,0.15)]">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-mono text-lg font-bold text-[#FFD60A] uppercase tracking-tight">
            Terminal Suspendu
          </h2>
          <p className="text-xs text-[rgba(255,255,255,0.45)] leading-relaxed max-w-[280px] mx-auto">
            Les services de ce terminal de trading ont été suspendus par l'administrateur. Veuillez contacter le support.
          </p>
        </div>
      </div>
    </div>
  );
}

function BannedScreen() {
  return (
    <div className="min-h-screen bg-[#080B14] text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-mono text-lg font-bold text-red-500 uppercase tracking-tight">
            Accès Banni
          </h2>
          <p className="text-xs text-[rgba(255,255,255,0.45)] leading-relaxed max-w-[280px] mx-auto">
            Votre accès à ce terminal a été suspendu pour non-respect des conditions d'utilisation.
          </p>
        </div>
      </div>
    </div>
  );
}

// Core Layouts & Components
import SniperLogo from './assets/SniperLogo';
import StudentShell from './layouts/StudentShell';
import DashboardTab from './components/tabs/DashboardTab';
import AcademyTab from './components/tabs/AcademyTab';
import TerminalTab from './components/tabs/TerminalTab';

const PublicShell = lazy(() => import('./layouts/PublicShell'));

// Fallback & Static Pages
const NotFound = lazy(() => import('./pages/NotFound'));
const Terms = lazy(() => import('./pages/Terms'));

const Profile = lazy(() => import('./pages/student/Profile'));

const AdminTab = lazy(() => import('./components/tabs/AdminTab'));

// --- App Root Component ---
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const { config, loading: configLoading, isError: configError, refresh: refreshConfig } = useConfig();
  const { isAdmin, isBanned, currentUser, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Base Welcome Screen for root domain
  if (location.pathname === '/' || location.pathname === '') {
    return <EphataWelcome />;
  }

  // Strict Rendering Order for App Routes
  const isAppPath = location.pathname.startsWith('/app/');
  if (isAppPath) {
    if (configLoading || roleLoading) {
      return <SuspenseFallback />;
    }

    if (configError || !config) {
      return <TenantNotFound />;
    }

    if (config.licenceStatus === 'suspended') {
      return <LicenceSuspended />;
    }

    if (isAdmin && config.onboardingCompleted === false) {
      return <MentorOnboarding config={config} onComplete={() => refreshConfig()} />;
    }

    if (!isAdmin && !currentUser) {
      return <MemberOnboarding config={config} onComplete={() => window.location.reload()} />;
    }

    if (isBanned) {
      return <BannedScreen />;
    }
  }

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* Default route redirects to 404 or a landing if tenant not specified */}
        <Route path="/" element={<Navigate to="/404" replace />} />

        {/* --- MAIN APP ROUTES (STUDENT & ADMIN) --- */}
        <Route path="/app/:tenant_id" element={<StudentShell />}>
          <Route index element={<Navigate to="live" replace />} />
          <Route path="live" element={<DashboardTab />} />
          <Route path="academy" element={<AcademyTab />} />
          <Route path="calcul" element={<TerminalTab />} />
          <Route path="profile" element={<Profile />} />
          
          {/* Admin sub-routes */}
          <Route path="admin/*" element={<AdminTab />} />
        </Route>

        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<PublicShell />}>
          <Route path="calculator" element={<div>Public Calculator</div>} />
          <Route path="stats/:tenant_id" element={<div>Public Stats</div>} />
          <Route path="terms" element={<Terms />} />
        </Route>

        {/* --- FALLBACK --- */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
