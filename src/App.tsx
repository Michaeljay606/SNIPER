import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { PremiumLoader } from './components/PremiumLoader';

// Core Layouts & Components
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
const AdminSignals = AdminTab;
const AdminAcademy = AdminTab;
const AdminMembers = AdminTab;
const AdminSettings = AdminTab;
const AdminStats = AdminTab;
const AdminPayments = AdminTab;

// --- App Root Component ---
export default function App() {
  const location = useLocation();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <Suspense fallback={<PremiumLoader isVisible={true} message="Chargement..." />}>
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
