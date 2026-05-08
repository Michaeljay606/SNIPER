import React, { useState, useEffect, useReducer, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanFeatures } from './hooks/usePlanFeatures';
import LicenceSuspended from './components/LicenceSuspended';
import AdminOnboarding from './components/AdminOnboarding';
import MentorUpgradePage from './components/MentorUpgradePage';
import EphataWelcome from './components/EphataWelcome';
import TenantNotFound from './components/TenantNotFound';
import { PlanBadge } from './components/PlanBadge';
import { PremiumLoader } from './components/PremiumLoader';
import { SubtlePremiumLoader } from './components/SubtlePremiumLoader';
import MasterControlPanel, { NeonToggle } from './components/MasterControlPanel';
import AccessDenied from './components/AccessDenied';
import NeonButton from './components/NeonButton';
import { useLongPress } from './hooks/useLongPress';

// Modularized Components
import DashboardTab from './components/tabs/DashboardTab';
import AcademyTab from './components/tabs/AcademyTab';
import AdminTab from './components/tabs/AdminTab';
import ProfileTab from './components/tabs/ProfileTab';
import TerminalTab from './components/tabs/TerminalTab';

import Onboarding from './components/Onboarding';
import StatusBar from './components/StatusBar';
import NavButton from './components/NavButton';
import CoachingModal from './components/modals/CoachingModal';
import VipModal from './components/VipModal';
import AcademyModal from './components/AcademyModal';
import { GlassCard, Badge, TechHeader, CyberFrame } from './components/ui/Shared';

import { 
  BarChart2, 
  GraduationCap, 
  Calculator, 
  User, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  AlertTriangle,
  X,
  Send,
  Instagram,
  Youtube,
  MessageCircle,
  Smartphone,
  LogOut,
  Lock,
  Unlock,
  BarChart3,
  Eye,
  Image as ImageIcon,
  ShieldCheck,
  Zap,
  Activity,
  Pencil,
  Mountain,
  ChevronRight,
  Loader2,
  Trash2,
  Plus,
  Target,
  ShieldAlert,
  DollarSign,
  TrendingDown,
  Video,
  ArrowRight,
  ChevronsRight,
  XCircle,
  Search,
  BadgePercent,
  CreditCard,
  Users,
  Download,
  Award,
  Globe,
  ArrowDown,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import { compressAndUpload } from './lib/upload';
import { USE_SUPABASE, TENANT_ID, APP_MODE, OPERATOR_ID } from './config';
import { isSupabaseConfigured } from './lib/supabase';
import { useClientConfig, ClientConfig, TenantRow } from './hooks/useClientConfig';
import { useUserRole } from './hooks/useUserRole';


// Helper Mapping logic moved to components
const mapSupabaseSignal = (s: any) => ({
  ...s,
  tp1: s.tp?.split(' | ')[0] || '',
  tp2: s.tp?.split(' | ')[1] || '',
  resultImage: s.result_image,
  updatedAt: s.updated_at,
  pipsGain: s.pips_gain,
  isVip: s.is_vip || false,
  rr: s.rr || '2.0'
});

const mapSupabaseAffiliate = (a: any) => ({
  ...a,
  telegramUsername: a.telegram_username,
  telegramId: a.telegram_id,
  isVip: a.is_vip,
  isBrokerVerified: a.is_broker_verified,
  joinedAt: a.created_at,
  signals_active: a.signals_active,
  signals_expires_at: a.signals_expires_at,
  academy_active: a.academy_active,
  academy_expires_at: a.academy_expires_at,
  academy_is_lifetime: a.academy_is_lifetime
});

const mapSupabaseLesson = (l: any) => ({
  ...l,
  youtubeId: l.youtube_id,
  moduleId: l.module_id,
  sortOrder: l.sort_order
});


interface AppState {
  activeTab: string;
  adminSubTab?: string;
  onboardingStep: number;
  isFirstLaunch: boolean;
  user: UserData | null;
  completedLessons: number[];
  isLoaded: boolean;
}

type AppAction = 
  | { type: 'SET_TAB', payload: string, subTab?: string }
  | { type: 'SET_ONBOARDING_STEP', payload: number }
  | { type: 'UPDATE_USER', payload: UserData }
  | { type: 'COMPLETE_ONBOARDING', payload: UserData }
  | { type: 'LOGOUT' }
  | { type: 'TOGGLE_LESSON', payload: number }
  | { type: 'SET_LOADED' };

// --- Reducer ---
const initialState: AppState = {
  activeTab: 'dashboard',
  onboardingStep: 1,
  isFirstLaunch: !localStorage.getItem('mrtech_user'),
  user: JSON.parse(localStorage.getItem('mrtech_user') || 'null'),
  completedLessons: JSON.parse(localStorage.getItem('mrtech_lessons') || '[]'),
  isLoaded: false
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload, adminSubTab: action.subTab || state.adminSubTab };
    case 'SET_ONBOARDING_STEP':
      return { ...state, onboardingStep: action.payload };
    case 'UPDATE_USER':
      localStorage.setItem('mrtech_user', JSON.stringify(action.payload));
      return { ...state, user: action.payload, isFirstLaunch: false };
    case 'COMPLETE_ONBOARDING':
      localStorage.setItem('mrtech_user', JSON.stringify(action.payload));
      return { ...state, user: action.payload, isFirstLaunch: false };
    case 'LOGOUT':
      localStorage.removeItem('mrtech_user');
      localStorage.removeItem('mrtech_lessons');
      return { ...state, user: null, isFirstLaunch: true, completedLessons: [] };
    case 'TOGGLE_LESSON':
      const newLessons = state.completedLessons.includes(action.payload)
        ? state.completedLessons.filter(id => id !== action.payload)
        : [...state.completedLessons, action.payload];
      localStorage.setItem('mrtech_lessons', JSON.stringify(newLessons));
      return { ...state, completedLessons: newLessons };
    case 'SET_LOADED':
      return { ...state, isLoaded: true };
    default:
      return state;
  }
}


// Constants
const DEFAULT_PROFILE_CONTENT: ProfileContent = {
  aboutTitle: "À propos du Mentor",
  aboutSubtitle: "Expert Price Action & Psychologie",
  visionTitle: "Ma Vision",
  visionText: "Le trading n'est pas une question de chance, c'est une question de discipline et de lecture de la psychologie des marchés. Mon objectif est de rendre l'Afrique centrale indépendante financièrement grâce au trading pro.",
  timeline: []
};

interface ProfileContent {
  aboutTitle: string;
  aboutSubtitle: string;
  visionTitle: string;
  visionText: string;
  timeline: { year: string; milestone: string }[];
}

interface UserData {
  id?: string;
  name: string;
  email?: string;
  accountNumber: string;
  broker: string;
  telegramUsername: string;
  telegramId?: string | number;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'refused' | 'banned';
  isVip: boolean;
  isBrokerVerified?: boolean;
  joinedAt: number | string;
}

// Helper Mapping logic moved to components but kept here for app-level data
const withTimeout = (promise: any, ms: number = 30000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délais d'attente dépassé (${ms / 1000}s). Perte de connexion avec la base de données.`));
    }, ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// --- Main App ---

export default function App() {
  const { t, i18n } = useTranslation();
  // Identify the current Telegram user before any logic
  const telegramUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id

  const { config, loading: configLoading } = useClientConfig()
  const features = usePlanFeatures(config?.plan || 'free')
  const { isAdmin, isVip, isFree, canAccessSignals, canAccessAcademy, currentUser, isLoading: roleLoading } = useUserRole();
  const loading = configLoading || roleLoading;
  console.log('App loading state:', loading);
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [liveSignals, setLiveSignals] = useState<any[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [previewRole, setPreviewRole] = useState<'admin' | 'vip' | 'free' | null>(null);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    if (e.currentTarget.scrollTop > 10) {
      if (!isScrolled) setIsScrolled(true);
    } else {
      if (isScrolled) setIsScrolled(false);
    }
  };
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [profileContent, setProfileContent] = useState<ProfileContent>(DEFAULT_PROFILE_CONTENT);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  
  // Level 2: Mentor is identified by database role OR telegram_id matching the owner
  const isMentor = previewRole
    ? previewRole === 'admin'
    : isAdmin || Number(telegramUserId) === Number(config?.telegramOwnerId);
  const canAccessSignalsStatus = previewRole === 'vip' ? true : (previewRole === 'free' ? false : canAccessSignals);
  const canAccessAcademyStatus = previewRole === 'vip' ? true : (previewRole === 'free' ? false : (canAccessAcademy || config?.academyModel === 'free'));
  const isVipStatus = canAccessSignalsStatus; // for backward compatibility in some UI components
  const isAdminUser = isMentor;
  const isApproved = currentUser?.status === 'active' || isAdminUser;
  const isBanned = currentUser?.status === 'banned';
  const isRefused = currentUser?.status === 'refused';
  const [victories, setVictories] = useState<any[]>([]);
  const [dbLessons, setDbLessons] = useState<any[]>([]);
  const [dbModules, setDbModules] = useState<any[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [onboardingForcedComplete, setOnboardingForcedComplete] = useState(false);
  const [publicProfileGuide, setPublicProfileGuide] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Traitement...");
  const [profileImages, setProfileImages] = useState({
    profile: "",
    vision: "",
    result1: "",
    result2: "",
    result3: "",
    result4: "",
    coaching: "",
  });

  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showAcademyModal, setShowAcademyModal] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Secret 3-second long-press to enter master mode
  // Secret 3-second long-press to enter master mode
  const longPress = useLongPress(() => {
    window.location.href = window.location.pathname + '?mode=master'
  }, 3000);

  const activeMentorName = features.canCustomizeName ? (tenantProfile?.mentor_name || config?.mentorName || "EPHATA TECH") : (config?.mentorName || "EPHATA TECH");
  const activeLogo = features.canUploadLogo ? (tenantProfile?.logo_url || config?.logoUrl) : null;



  useEffect(() => {
    const speciality = tenantProfile?.speciality || config?.speciality || "Expert Price Action & Psychologie";
    const vision = tenantProfile?.vision_text || config?.visionText || "Le trading n'est pas une question de chance, c'est une question de discipline et de lecture de la psychologie des marchés. Mon objectif est de rendre l'Afrique centrale indépendante financièrement grâce au trading pro.";

    setProfileContent(prev => ({
      ...prev,
      aboutTitle: (prev.aboutTitle === "À propos du Mentor" || prev.aboutTitle?.includes("EPHATA TECH")) ? `À propos de ${activeMentorName}` : prev.aboutTitle,
      aboutSubtitle: (prev.aboutSubtitle === "Expert Price Action & Psychologie" || !prev.aboutSubtitle) ? speciality : prev.aboutSubtitle,
      visionTitle: prev.visionTitle || "Ma Vision",
      visionText: prev.visionText === "Le trading n'est pas une question de chance, c'est une question de discipline et de lecture de la psychologie des marchés. Mon objectif est de rendre l'Afrique centrale indépendante financièrement grâce au trading pro." ? vision : prev.visionText,
      timeline: prev.timeline || []
    }));

    // Dynamic Theme Injection
    const themeColor = features.canCustomizeTheme ? (tenantProfile?.theme_color || config?.themeColor || '#00FF41') : '#00FF41';
    document.documentElement.style.setProperty('--color-accent-neon', themeColor);
    document.documentElement.style.setProperty('--accent-neon', themeColor); 
  }, [config, tenantProfile, features, activeMentorName]);

  // Auto-scroll en haut de page à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.activeTab, state.adminSubTab]);

  // Improved Scroll Detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      // Also check the main container if window scroll is 0 (common in some mobile wrappers)
      const mainElement = document.querySelector('main');
      const mainScroll = mainElement?.scrollTop || 0;
      
      const actualScroll = Math.max(scrollPos, mainScroll);
      
      if (actualScroll > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    // Also listen on all potential scroll containers
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 1. Global Signals Fetching
  useEffect(() => {
      const fetchSignals = async () => {
        try {
          const { data, error } = await supabase.from('signals').select('*').eq('tenant_id', TENANT_ID).order('timestamp', { ascending: false }).limit(50);
          if (error) throw error;
          setLiveSignals(data ? data.map(mapSupabaseSignal) : []);
        } catch (error) {
          console.error("Signals fetch error:", error);
          setLiveSignals([]);
        }
      };
      fetchSignals();
      const chan = supabase.channel('global_signals').on('postgres_changes', { event: '*', schema: 'public', table: 'signals', filter: `tenant_id=eq.${TENANT_ID}` }, fetchSignals).subscribe();
      return () => { supabase.removeChannel(chan); };
  }, []);

  // 2. Global Academy Fetching
  useEffect(() => {
    const fetchAcademy = async () => {
      try {
        const { data: mods } = await supabase.from('academy_modules').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true });
        const { data: less } = await supabase.from('academy_lessons').select('*').eq('tenant_id', TENANT_ID).order('sort_order', { ascending: true });
        
        if (mods) setDbModules(mods);
        if (less) setDbLessons(less.map(mapSupabaseLesson));
      } catch (error) {
        console.error("Academy fetch error:", error);
      }
    };
    fetchAcademy();
    const chan1 = supabase.channel('global_modules').on('postgres_changes', { event: '*', schema: 'public', table: 'academy_modules', filter: `tenant_id=eq.${TENANT_ID}` }, fetchAcademy).subscribe();
    const chan2 = supabase.channel('global_lessons').on('postgres_changes', { event: '*', schema: 'public', table: 'academy_lessons', filter: `tenant_id=eq.${TENANT_ID}` }, fetchAcademy).subscribe();
    return () => {
      supabase.removeChannel(chan1);
      supabase.removeChannel(chan2);
    };
  }, []);

  useEffect(() => {
    if (dbModules.length > 0 || dbLessons.length > 0) {
       console.log('--- ACADEMY DATA SYNC ---');
       console.log('Modules IDs:', dbModules.map(m => m.id));
       console.log('Lessons ModuleIDs:', dbLessons.map(l => l.moduleId));
    }
  }, [dbModules, dbLessons]);

  useEffect(() => {
    if (!loading) {
      dispatch({ type: 'SET_LOADED' });
    }
  }, [loading]);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeAffiliate = () => {};

    const setupAuth = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (unsubscribeAffiliate) {
          unsubscribeAffiliate();
          unsubscribeAffiliate = () => {};
        }

        if (session?.user) {
          console.log('Supabase session active:', session.user.id);
          
          const tgApp = (window as any).Telegram?.WebApp;
          const tgUser = tgApp?.initDataUnsafe?.user;

          // Subscribe to user changes in affiliates table
          const fetchUser = async () => {
            const { data, error } = await supabase
              .from('affiliates')
              .select('*')
              .eq('id', session.user.id)
              .eq('tenant_id', TENANT_ID)
              .single();
            
            if (error) {
              console.error('Error fetching affiliate:', error);
              if (tgUser) {
                const newUser: UserData = {
                  id: session.user.id,
                  name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
                  telegramUsername: tgUser.username || '',
                  telegramId: tgUser.id,
                  accountNumber: '',
                  broker: '',
                  status: 'pending',
                  role: tgUser.username?.toLowerCase() === TENANT_ID.toLowerCase() ? 'admin' : 'user',
                  isVip: false,
                  joinedAt: Date.now()
                };
                dispatch({ type: 'UPDATE_USER', payload: newUser });
              }
            } else if (data) {
              dispatch({ type: 'UPDATE_USER', payload: mapSupabaseAffiliate(data) });
            }
          };

          fetchUser();
          const chan = supabase.channel(`user_${session.user.id}`)
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'affiliates', 
              filter: `id=eq.${session.user.id}` 
            }, fetchUser)
            .subscribe();
          
          unsubscribeAffiliate = () => { supabase.removeChannel(chan); };
        } else {
          console.log('No user session');
          dispatch({ type: 'LOGOUT' });
        }
      });
      unsubscribeAuth = () => { subscription.unsubscribe(); };
    };

    setupAuth();
    
    return () => {
        unsubscribeAuth();
        unsubscribeAffiliate();
    };
  }, []);



    // Telegram WebApp Initialization
    const tg = (window as any).Telegram?.WebApp;
    useEffect(() => {
      if (tg) {
        tg.ready();
        tg.expand();
        
        // Check version before setting colors
        const version = parseFloat(tg.version || "6.0");
        if (version >= 6.1) {
          tg.setHeaderColor('#050505');
          tg.setBackgroundColor('#050505');
        }
      }
    }, [tg]);

    useEffect(() => {
    // Fallback: Force load after 8s just in case
    const timer = setTimeout(() => {
       if (!state.isLoaded) dispatch({ type: 'SET_LOADED' });
    }, 8000);
    
    if (!loading && !state.isLoaded) {
      dispatch({ type: 'SET_LOADED' });
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [loading, state.isLoaded]);


    // Fetch tenant profile global data
    useEffect(() => {
        const fetchTenantData = async () => {
        try {
            const { data } = await supabase.from('tenants').select('*').eq('tenant_id', TENANT_ID).single();
            if (data) setTenantProfile(data);
        } catch (err) {
            console.error("Error fetching tenant profile globally", err);
        }
        };
        fetchTenantData();
    }, []);

    useEffect(() => {
        const handleTenantProfileUpdate = (e: any) => {
        if (e.detail) {
            setTenantProfile(e.detail);
        }
        };
        window.addEventListener('tenant-profile-updated', handleTenantProfileUpdate);
        return () => window.removeEventListener('tenant-profile-updated', handleTenantProfileUpdate);
    }, []);

    // Fetch profile images
    useEffect(() => {
        let unsubProfile: any = () => {};
        
        // Instant local update for optimistic UI rendering without waiting for DB refetch
        const handleLocalProfileUpdate = (e: any) => {
        if (e.detail && Object.keys(e.detail).length > 0) {
            setProfileImages(prev => ({ ...prev, ...e.detail }));
        }
        };
        window.addEventListener('profile-updated', handleLocalProfileUpdate);

        const fetchProfileImages = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', `profile_${TENANT_ID}`).eq('tenant_id', TENANT_ID).single();
            if (data) setProfileImages(prev => ({ ...prev, ...data.value }));
        };
        fetchProfileImages();
        
        const chan = supabase.channel('profile').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.profile_${TENANT_ID}` }, fetchProfileImages).subscribe();
        unsubProfile = () => {
            supabase.removeChannel(chan);
            window.removeEventListener('profile-updated', handleLocalProfileUpdate);
        };
        return unsubProfile;
    }, []);


    // Fetch profile content
    useEffect(() => {
        let unsubContent: any = () => {};
        const fetchProfileContent = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', `content_${TENANT_ID}`).eq('tenant_id', TENANT_ID).single();
            if (data) setProfileContent(prev => ({ ...prev, ...data.value }));
        };
        fetchProfileContent();
        const chan = supabase.channel('content').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.content_${TENANT_ID}` }, fetchProfileContent).subscribe();
        unsubContent = () => supabase.removeChannel(chan);
        return unsubContent;
    }, []);

    // Fetch victories
    useEffect(() => {
        let unsubVictories: any = () => {};
          const fetchVictories = async () => {
            try {
              const { data, error } = await supabase
                .from('signals')
                .select('*')
                .eq('tenant_id', TENANT_ID)
                .eq('status', 'TP_HIT')
                .order('updated_at', { ascending: false })
                .limit(10);
                
              if (error) throw error;
              
              if (data) {
                const mapped = data
                  .map(mapSupabaseSignal)
                  .filter(sig => sig.resultImage && sig.resultImage.trim().length > 5);
                setVictories(mapped);
              } else {
                setVictories([]);
              }
            } catch (error) {
              console.error("Supabase victories fetch error:", error);
              setVictories([]);
            }
          };
          fetchVictories();
          const chan = supabase.channel('victories-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'signals', filter: `tenant_id=eq.${TENANT_ID}` }, fetchVictories).subscribe();
          unsubVictories = () => supabase.removeChannel(chan);
        return unsubVictories;
    }, []);


  // ─── Level 1: Master Control routing (after all hooks) ───────────────
  if (APP_MODE === 'master') {
    const isDevBypass = import.meta.env.DEV && !telegramUserId   // local browser, no Telegram
    const isOperator  = Number(telegramUserId) === OPERATOR_ID   // real Telegram check
    if (!isDevBypass && !isOperator) {
      return <AccessDenied />
    }
    return <MasterControlPanel />
  }
  // ──────────────────────────────────────────────────────────────────────

  // STATE 1: No tenant ID in URL at all → show landing page
  if (!TENANT_ID) {
    return <EphataWelcome />
  }

  // STATE 2: Loading
  if (loading) return (
    <PremiumLoader isVisible={loading} message={`${t('common.loading')} ${activeMentorName}...`} />
  )

  // STATE 3: Tenant ID provided but not found in DB
  if (!config) {
    return <TenantNotFound tenantId={TENANT_ID} />
  }

  // STATE 4: Licence suspended
  if (config.licenceStatus === 'suspended') return (
    <LicenceSuspended mentorName={activeMentorName} />
  )



  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
    showToast(t('auth.logout_success'));
  };

  const handleTelegramConnect = async () => {
    try {
      showToast(t('auth.connecting'), 'success');
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      showToast(t('auth.login_success'), 'success');
    } catch (error: any) {
      console.error('Auth error:', error);
      showToast(t('auth.login_error') + ': ' + (error.message || t('auth.login_error')), 'error');
    }
  };

  if (!state.isLoaded || loading) {
    return <PremiumLoader message={t('common.loading')} isVisible={true} />;
  }

  if (state.isFirstLaunch || !state.user) {
    return (
      <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="noise-overlay" />
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="aura-glow top-[10%] left-[-10%] w-[80%] h-[40%] bg-accent-neon/10" />
        </div>

        <div className="relative z-10 space-y-10 w-full max-w-sm">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-3xl bg-accent-neon/10 flex items-center justify-center text-accent-neon border border-accent-neon/20 relative group overflow-hidden mx-auto mb-6">
              <TrendingUp size={48} className="relative z-10 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-accent-neon/5 blur-xl group-hover:bg-accent-neon/20 transition-colors" />
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-neon" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-neon" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase font-mono text-text-primary">
              {activeMentorName}
            </h1>
            <p className="text-[10px] text-text-secondary uppercase tracking-[0.4em] font-bold mt-2">
              {t('auth.welcome_title')}
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleTelegramConnect}
              className="w-full flex items-center justify-center gap-3 py-5 bg-[#24A1DE] text-text-primary font-black rounded-2xl hover:bg-[#24A1DE]/90 transition-all active:scale-95 shadow-[0_10px_30px_rgba(36,161,222,0.3)] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-bg-elevated translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
              <Send size={20} className="relative z-10" />
              <span className="relative z-10 tracking-[0.2em] uppercase text-xs">{t('auth.start_telegram')}</span>
            </button>

            <button 
              onClick={() => {
                const testUser: UserData = {
                  id: 'test-user-' + Date.now(),
                  name: "Admin Test",
                  telegramUsername: TENANT_ID,
                  telegramId: 999999,
                  accountNumber: "12345678",
                  broker: "Exness",
                  status: 'active',
                  role: 'admin',
                  isVip: true,
                  joinedAt: Date.now()
                };
                dispatch({ type: 'UPDATE_USER', payload: testUser });
              }}
              className="w-full py-4 bg-bg-surface text-text-secondary font-bold rounded-2xl hover:bg-bg-elevated border border-border-subtle transition-all active:scale-95 text-[9px] tracking-widest uppercase"
            >
              {t('auth.demo_mode')}
            </button>
          </div>
          
          <div className="pt-4">
            <p className="text-[8px] text-text-secondary uppercase tracking-[0.3em] opacity-50">
              {t('auth.secure_terminal')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Mentor Onboarding Gate (Global) ---
  if (isMentor && config && !config.onboardingCompleted && !onboardingForcedComplete && !isTransitioning && !publicProfileGuide && !localStorage.getItem('mrtech_onboarding_done')) {
    return (
      <AdminOnboarding 
        tenantId={config.tenantId}
        initialStep={config.onboardingStep || 1}
        config={config}
        profilePhoto={profileImages.profile}
        onComplete={() => {
          setOnboardingForcedComplete(true);
          localStorage.setItem('mrtech_onboarding_done', 'true');
          setIsTransitioning(true);
          // Redirect to Admin > Profil automatically after transition
          setTimeout(() => {
            dispatch({ type: 'SET_TAB', payload: 'admin', subTab: 'profil' });
            setIsTransitioning(false);
          }, 3500);
        }}
      />
    );
  }

  if (isTransitioning) {
    return (
      <div className="fixed inset-0 z-[600] bg-bg-void flex flex-col items-center justify-center p-12 text-center overflow-hidden">
        <div className="noise-overlay" />
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="aura-glow top-[-10%] left-[-10%] w-[100%] h-[50%] bg-accent-neon/20" />
          <div className="aura-glow bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-accent-neon/15" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="w-20 h-20 border-t-2 border-r-2 border-accent-neon rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,102,0.3)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck size={32} className="text-accent-neon animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-black font-mono tracking-tighter text-text-primary uppercase italic animate-in fade-in slide-in-from-bottom duration-700">
              {publicProfileGuide ? 'Déploiement de votre' : 'Initialisation du'} <span className="text-accent-neon">{publicProfileGuide ? 'Vitrine' : 'Terminal'}</span>
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className="h-1 w-24 bg-accent-neon/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent-neon animate-progress" />
              </div>
            </div>
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-[0.3em] opacity-50">
              {publicProfileGuide ? 'Préparation de votre profil public...' : 'Configuration de votre espace Admin...'}
            </p>
          </div>
        </div>
      </div>
    );
  }




  // Handle Banned or Refused users (Permanent blocks)
  if ((isBanned || isRefused) && !isAdminUser) {
    return (
      <div className="min-h-screen bg-bg-void flex flex-col max-w-[430px] mx-auto relative shadow-2xl shadow-black">
        <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar flex flex-col items-center justify-center text-center">
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 fade-in-up">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center neon-glow ${isBanned ? 'bg-accent-danger/20 text-accent-danger' : 'bg-accent-warning/20 text-accent-warning'}`}>
              {isBanned ? <AlertTriangle size={40} /> : <X size={40} />}
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-tighter">
                {isBanned ? t('auth.banned_title') : t('auth.refused_title')}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed px-8">
                {isBanned 
                  ? t('auth.banned_desc') 
                  : t('auth.refused_desc')}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
            >
              {t('auth.logout')}
            </button>
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-bg-void flex flex-col max-w-[430px] mx-auto relative shadow-card overflow-hidden selection:bg-accent-neon/30">
      <StatusBar />

      {/* Premium Visual Layers */}
      <div className="noise-overlay" />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="aura-glow top-[-10%] left-[-10%] w-[80%] h-[40%] bg-accent-neon/10" />
        <div className="aura-glow bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-accent-neon/10" style={{ animationDelay: '2s' }} />
        <div className="aura-glow top-[20%] right-[-10%] w-[50%] h-[50%] bg-accent-warning/5" style={{ animationDelay: '4s' }} />
      </div>
      {isGlobalLoading && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-bg-elevated/90 backdrop-blur-md border border-accent-neon/30 px-5 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(0,255,102,0.2)] animate-in slide-in-from-top fade-in">
           <div className="w-4 h-4 border-2 border-accent-neon border-t-transparent rounded-full animate-spin"></div>
           <span className="text-[10px] font-mono font-black text-accent-neon tracking-widest uppercase">{loadingMessage}</span>
        </div>
      )}
      {toast && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-xl border backdrop-blur-xl fade-in-up flex items-center gap-3 ${toast.type === 'success' ? 'bg-accent-neon/10 border-accent-neon/20 text-accent-neon' : 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
      
      <main 
        onScroll={handleMainScroll}
        className="flex-1 overflow-y-auto no-scrollbar relative pt-24 pb-24"
      >
        {!isAdminUser && !state.user?.id && (
          <Onboarding 
            user={state.user}
            config={config}
            tenantProfile={tenantProfile}
            features={features}
            onComplete={(data) => dispatch({ type: 'COMPLETE_ONBOARDING', payload: data })} 
          />
        )}
        <header className={`fixed top-0 left-0 right-0 max-w-[430px] mx-auto z-[100] transition-all duration-200 border-b ${isScrolled ? 'bg-bg-void/70 backdrop-blur-xl border-border-subtle h-16 pt-2' : 'bg-bg-void border-transparent h-24 pt-6'} px-6 flex justify-between items-center overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent-neon/50 to-transparent scanner-line" />
            <div className={`flex flex-col relative transition-all duration-200 ${isScrolled ? 'scale-90 origin-left' : 'scale-100'}`}>
              {features.showOnyxBadge && (
                <div className={`flex items-center gap-2 mb-0.5 transition-all duration-200 ${isScrolled ? 'hidden' : 'flex'}`}>
                  <div className="w-2 h-2 bg-accent-neon rounded-full pulse-live" />
                  <span className="text-[8px] font-bold text-accent-neon uppercase tracking-[0.3em]">Ephata Terminal</span>
                </div>
              )}
              {activeLogo ? (
                <img 
                  src={activeLogo} 
                  alt={activeMentorName} 
                  className={`object-contain transition-all duration-200 ${isScrolled ? 'h-6' : 'h-8 sm:h-10'}`} 
                />
              ) : (
                <h1 className={`font-black tracking-tighter uppercase font-mono text-text-primary flex items-center gap-2 transition-all duration-200 ${isScrolled ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                  {activeMentorName}
                </h1>
              )}
              <div className={`flex items-center gap-1.5 transition-all duration-200 ${isScrolled ? 'hidden' : 'flex'}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMentor ? 'bg-accent-warning' : 'bg-accent-neon'}`} />
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isMentor ? 'text-accent-warning' : 'text-accent-neon'}`}>
                  {isMentor ? 'Mentor Access' : t('status.live')}
                </span>
              </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
              className="px-2 py-1 bg-bg-surface border border-border-subtle rounded-lg text-[9px] font-mono text-text-muted hover:text-text-primary transition-all uppercase tracking-widest"
            >
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </button>
            {isMentor && (
              <button 
                id="nav-admin"
                onClick={() => dispatch({ type: 'SET_TAB', payload: 'admin' })}
                className={`p-2 rounded-xl transition-all shadow-lg ${state.activeTab === 'admin' ? 'bg-accent-warning text-text-inverse animate-pulse' : 'bg-bg-elevated text-accent-warning border border-accent-warning/20'}`}
              >
                <ShieldCheck size={18} />
              </button>
            )}
            <div 
              id="nav-mentor"
              onClick={() => dispatch({ type: 'SET_TAB', payload: 'profile' })} 
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border bg-bg-elevated flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all ${isMentor ? 'border-accent-warning ring-2 ring-accent-warning/20' : 'border-border-subtle'}`}
            >
              {profileImages.profile ? (
                <img src={profileImages.profile} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User size={18} className={isMentor ? 'text-accent-warning' : 'text-accent-neon opacity-40'} />
              )}
            </div>
          </div>
        </header>
        <div className="pb-40">
        {state.activeTab === 'dashboard' && (
          <DashboardTab 
            onShowToast={showToast} 
            victories={victories}
            liveSignals={liveSignals}
            config={config}
            tenantProfile={tenantProfile}
            isScrolled={isScrolled}
            previewRole={previewRole}
            setShowVipModal={setShowVipModal}
          />
        )}
        {state.activeTab === 'academy' && (
          <div className="relative">
            <AcademyTab 
              completedLessons={state.completedLessons as any} 
              toggleLesson={(id: any) => dispatch({ type: 'TOGGLE_LESSON', payload: id })} 
              ownerPhoto={profileImages.profile}
              onTabChange={(tab, subTab) => dispatch({ type: 'SET_TAB', payload: tab, subTab })}
              config={config}
              dbModules={dbModules}
              dbLessons={dbLessons}
              isScrolled={isScrolled}
              tenantProfile={tenantProfile}
              previewRole={previewRole}
              setShowAcademyModal={setShowAcademyModal}
              features={features}
            />
          </div>
        )}
        {state.activeTab === 'terminal' && <TerminalTab isScrolled={isScrolled} config={config} tenantProfile={tenantProfile} />}
        {state.activeTab === 'profile' && (
          <ProfileTab 
            user={state.user} 
            isAdmin={isMentor}
            onLogout={handleLogout} 
            onShowToast={showToast}
            profileImages={profileImages}
            content={profileContent}
            onTabChange={(tab) => dispatch({ type: 'SET_TAB', payload: tab })}
            config={config}
            tenantProfile={tenantProfile}
            onContentUpdate={(newContent) => setProfileContent(newContent)}
            isScrolled={isScrolled}
            isRealAdmin={true}
            previewRole={previewRole}
            setPreviewRole={setPreviewRole}
            setShowCoachingModal={setShowCoachingModal}
            setShowVipModal={setShowVipModal}
            onPublicProfileGuide={publicProfileGuide}
            setPublicProfileGuide={setPublicProfileGuide}
          />
        )}
        {state.activeTab === 'admin' && isMentor && (
          <AdminTab 
            onShowToast={showToast} 
            liveSignals={liveSignals} 
            setLiveSignals={setLiveSignals} 
            initialSubTab={state.adminSubTab}
            config={config}
            features={features}
            dbModules={dbModules}
            dbLessons={dbLessons}
            setIsGlobalLoading={setIsGlobalLoading}
            setLoadingMessage={setLoadingMessage}
            setDbLessons={setDbLessons}
            setDbModules={setDbModules}
            isScrolled={isScrolled}
            profilePhoto={profileImages.profile}
            onboardingJustFinished={onboardingForcedComplete}
            onSaveSuccess={() => {
              if (onboardingForcedComplete) {
                setLoadingMessage("Déploiement de votre Vitrine...");
                setIsTransitioning(true);
                setTimeout(() => {
                  dispatch({ type: 'SET_TAB', payload: 'profile' });
                  setPublicProfileGuide(true);
                  setIsTransitioning(false);
                }, 3500);
              }
            }}
          />
        )}
          {/* Catch-all to prevent black screen if tab logic fails */}
          {!['dashboard', 'academy', 'terminal', 'profile', 'admin'].includes(state.activeTab) && (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <AlertTriangle size={40} className="mb-4 opacity-20" />
              <p className="text-[10px] uppercase tracking-widest">{t('common.maintenance_title')}</p>
              <button onClick={() => dispatch({ type: 'SET_TAB', payload: 'dashboard' })} className="mt-4 text-accent-neon text-[9px] font-bold underline">{t('common.back_dashboard')}</button>
            </div>
          )}

          {state.activeTab === 'admin' && !isMentor && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <Lock size={40} className="text-accent-warning mb-4 opacity-50" />
              <h3 className="text-sm font-bold uppercase text-text-primary mb-2">{t('common.restricted_access')}</h3>
              <p className="text-[10px] text-text-secondary leading-relaxed uppercase tracking-widest">
                {t('common.restricted_desc')}
              </p>
            </div>
          )}
        </div>
      </main>

      <nav className="floating-dock">
        <NavButton 
          active={state.activeTab === 'dashboard'} 
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'dashboard' })}
          icon={<BarChart2 size={20} />}
          label={t('nav.live')}
        />
        <NavButton 
          active={state.activeTab === 'academy'} 
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'academy' })}
          icon={<GraduationCap size={20} />}
          label={t('nav.academy')}
        />
        <NavButton 
          active={state.activeTab === 'terminal'} 
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'terminal' })}
          icon={<Calculator size={20} />}
          label={t('nav.calcul')}
        />
        <NavButton 
          active={state.activeTab === 'profile'} 
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'profile' })}
          icon={<User size={20} />}
          label={activeMentorName.split(' ')[0] || t('admin.profil')}
        />
        {isMentor && (
          <NavButton 
            data-tour="nav-admin-btn"
            active={state.activeTab === 'admin'} 
            onClick={() => dispatch({ type: 'SET_TAB', payload: 'admin' })}
            icon={<ShieldCheck size={20} className="text-accent-warning" />}
            label={t('nav.admin')}
          />
        )}
      </nav>
      {/* Secret operator entry — no visual feedback, invisible to users */}
      {/* Floating Ephata Badge for Free/Basic/Pause plans */}
      {features?.showOnyxBadge && (
        <div className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto z-[200] pointer-events-none">
          <div 
            {...longPress}
            className="absolute right-4 animate-in fade-in slide-in-from-right duration-1000 pointer-events-auto cursor-pointer"
          >
            <div className="bg-bg-void/80 backdrop-blur-md border border-accent-neon/30 px-3 py-2 rounded-2xl flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              <div className="w-2 h-2 rounded-full bg-accent-neon animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black tracking-[0.3em] text-text-muted leading-none mb-0.5">POWERED BY</span>
                <span className="text-[10px] font-black tracking-tight text-accent-neon italic leading-none">EPHATA TECH</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {showVipModal && (
        <VipModal 
          onClose={() => setShowVipModal(false)} 
          config={config} 
          tenantProfile={tenantProfile} 
          user={state.user}
        />
      )}
      {showAcademyModal && (
        <AcademyModal 
          onClose={() => setShowAcademyModal(false)} 
          config={config} 
          tenantProfile={tenantProfile} 
          user={state.user}
        />
      )}
      {showCoachingModal && (
        <CoachingModal 
          onClose={() => setShowCoachingModal(false)} 
          config={config} 
          tenantProfile={tenantProfile} 
        />
      )}

      {/* High-End Transition Layer */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[1000] bg-bg-void flex flex-col items-center justify-center animate-in fade-in duration-700">
          <PremiumLoader message={loadingMessage} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,102,0.1),transparent_70%)]" />
        </div>
      )}
    </div>
  );
}
