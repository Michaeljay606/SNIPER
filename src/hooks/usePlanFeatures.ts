import { useClientConfig } from './useClientConfig'

export type PlanId = 'free' | 'basic' | 'premium' | 'empire' | 'pause'
export type VipModelOption = 'broker' | 'payment' | 'both'

export interface PlanFeatures {
  plan: PlanId

  // Display
  planLabel: string
  planPrice: string

  // Signal limits
  maxSignalsPerDay: number
  signalsUnlimited: boolean

  // Member limits
  maxMembers: number
  membersUnlimited: boolean

  // Academy limits
  maxLessons: number
  academyUnlimited: boolean

  // Profile
  canEditFullProfile: boolean
  canUploadMedia: boolean
  canAddCoachingElite: boolean

  // Brokers
  maxBrokers: number

  // Access models (VIP / Academy monetization)
  allowedVipModels: readonly VipModelOption[]

  // Payment
  canUseTonConnect: boolean
  canUseManualPayment: boolean
  canUseBrokerModel: boolean

  // Analytics
  hasBasicAnalytics: boolean
  hasWinrateByPair: boolean
  hasAdvancedAnalytics: boolean
  hasFullAnalytics: boolean
  canExportCSV: boolean

  // Branding
  showSniperBadge: boolean
  canHideBadge: boolean
  canWhiteLabel: boolean
  canCustomizeColors: boolean
  canCustomizeAppName: boolean

  // Notifications
  hasAutoNotifications: boolean

  // Trading modes
  canUseBinaryMode: boolean
  canUseHybridMode: boolean

  // Empire exclusives
  hasBlockchainWatcher: boolean
  hasPrioritySupport: boolean
  hasLeaderboard: boolean

  // Pause
  isPaused: boolean
  isAdminLocked: boolean
  canAcceptNewMembers: boolean
}

export const PLAN_CONFIG: Record<PlanId, PlanFeatures> = {
  free: {
    plan: 'free',
    planLabel: 'FREE',
    planPrice: '$0/mois',
    maxSignalsPerDay: 3,
    signalsUnlimited: false,
    maxMembers: 50,
    membersUnlimited: false,
    maxLessons: 3,
    academyUnlimited: false,
    canEditFullProfile: false,
    canUploadMedia: false,
    canAddCoachingElite: false,
    maxBrokers: 1,
    allowedVipModels: ['broker', 'payment'],
    canUseTonConnect: false,
    canUseManualPayment: true,
    canUseBrokerModel: true,
    hasBasicAnalytics: false,
    hasWinrateByPair: false,
    hasAdvancedAnalytics: false,
    hasFullAnalytics: false,
    canExportCSV: false,
    showSniperBadge: true,
    canHideBadge: false,
    canWhiteLabel: false,
    canCustomizeColors: false,
    canCustomizeAppName: false,
    hasAutoNotifications: false,
    canUseBinaryMode: false,
    canUseHybridMode: false,
    hasBlockchainWatcher: false,
    hasPrioritySupport: false,
    hasLeaderboard: false,
    isPaused: false,
    isAdminLocked: false,
    canAcceptNewMembers: true,
  },

  basic: {
    plan: 'basic',
    planLabel: 'BASIC',
    planPrice: '$49/mois',
    maxSignalsPerDay: Infinity,
    signalsUnlimited: true,
    maxMembers: 500,
    membersUnlimited: false,
    maxLessons: 10,
    academyUnlimited: false,
    canEditFullProfile: true,
    canUploadMedia: true,
    canAddCoachingElite: false,
    maxBrokers: 3,
    allowedVipModels: ['broker', 'payment'],
    canUseTonConnect: false,
    canUseManualPayment: true,
    canUseBrokerModel: true,
    hasBasicAnalytics: true,
    hasWinrateByPair: true,
    hasAdvancedAnalytics: false,
    hasFullAnalytics: false,
    canExportCSV: false,
    showSniperBadge: true,
    canHideBadge: false,
    canWhiteLabel: false,
    canCustomizeColors: false,
    canCustomizeAppName: false,
    hasAutoNotifications: false,
    canUseBinaryMode: false,
    canUseHybridMode: false,
    hasBlockchainWatcher: false,
    hasPrioritySupport: false,
    hasLeaderboard: false,
    isPaused: false,
    isAdminLocked: false,
    canAcceptNewMembers: true,
  },

  premium: {
    plan: 'premium',
    planLabel: 'PREMIUM',
    planPrice: '$99/mois',
    maxSignalsPerDay: Infinity,
    signalsUnlimited: true,
    maxMembers: 2000,
    membersUnlimited: false,
    maxLessons: Infinity,
    academyUnlimited: true,
    canEditFullProfile: true,
    canUploadMedia: true,
    canAddCoachingElite: true,
    maxBrokers: 3,
    allowedVipModels: ['broker', 'payment', 'both'],
    canUseTonConnect: true,
    canUseManualPayment: true,
    canUseBrokerModel: true,
    hasBasicAnalytics: true,
    hasWinrateByPair: true,
    hasAdvancedAnalytics: true,
    hasFullAnalytics: false,
    canExportCSV: false,
    showSniperBadge: false,
    canHideBadge: true,
    canWhiteLabel: false,
    canCustomizeColors: false,
    canCustomizeAppName: false,
    hasAutoNotifications: true,
    canUseBinaryMode: true,
    canUseHybridMode: false,
    hasBlockchainWatcher: false,
    hasPrioritySupport: false,
    hasLeaderboard: false,
    isPaused: false,
    isAdminLocked: false,
    canAcceptNewMembers: true,
  },

  empire: {
    plan: 'empire',
    planLabel: 'EMPIRE',
    planPrice: '$199/mois',
    maxSignalsPerDay: Infinity,
    signalsUnlimited: true,
    maxMembers: Infinity,
    membersUnlimited: true,
    maxLessons: Infinity,
    academyUnlimited: true,
    canEditFullProfile: true,
    canUploadMedia: true,
    canAddCoachingElite: true,
    maxBrokers: 3,
    allowedVipModels: ['broker', 'payment', 'both'],
    canUseTonConnect: true,
    canUseManualPayment: true,
    canUseBrokerModel: true,
    hasBasicAnalytics: true,
    hasWinrateByPair: true,
    hasAdvancedAnalytics: true,
    hasFullAnalytics: true,
    canExportCSV: true,
    showSniperBadge: false,
    canHideBadge: true,
    canWhiteLabel: true,
    canCustomizeColors: true,
    canCustomizeAppName: true,
    hasAutoNotifications: true,
    canUseBinaryMode: true,
    canUseHybridMode: true,
    hasBlockchainWatcher: true,
    hasPrioritySupport: true,
    hasLeaderboard: true,
    isPaused: false,
    isAdminLocked: false,
    canAcceptNewMembers: true,
  },

  pause: {
    plan: 'pause',
    planLabel: 'PAUSE',
    planPrice: '$19/mois',
    maxSignalsPerDay: 0,
    signalsUnlimited: false,
    maxMembers: 0,
    membersUnlimited: false,
    maxLessons: 0,
    academyUnlimited: false,
    canEditFullProfile: false,
    canUploadMedia: false,
    canAddCoachingElite: false,
    maxBrokers: 0,
    allowedVipModels: [],
    canUseTonConnect: false,
    canUseManualPayment: false,
    canUseBrokerModel: false,
    hasBasicAnalytics: false,
    hasWinrateByPair: false,
    hasAdvancedAnalytics: false,
    hasFullAnalytics: false,
    canExportCSV: false,
    showSniperBadge: true,
    canHideBadge: false,
    canWhiteLabel: false,
    canCustomizeColors: false,
    canCustomizeAppName: false,
    hasAutoNotifications: false,
    canUseBinaryMode: false,
    canUseHybridMode: false,
    hasBlockchainWatcher: false,
    hasPrioritySupport: false,
    hasLeaderboard: false,
    isPaused: true,
    isAdminLocked: true,
    canAcceptNewMembers: false,
  },
}

export const FREE_PLAN_FEATURES: PlanFeatures = PLAN_CONFIG.free

/** Comparison table rows — synced with product spec */
export const PLAN_COMPARISON_ROWS = [
  { label: 'Signaux / jour', free: '3', basic: '∞', premium: '∞', empire: '∞' },
  { label: 'Membres max', free: '50', basic: '500', premium: '2000', empire: '∞' },
  { label: 'Leçons Academy', free: '3', basic: '10', premium: '∞', empire: '∞' },
  { label: 'Profil', free: 'Basique', basic: 'Complet', premium: 'Complet', empire: 'White-label' },
  { label: 'Brokers affiliés', free: '1', basic: '3', premium: '3', empire: '3' },
  { label: 'Modèle accès', free: 'Broker+Paiement manuel', basic: 'Broker+Paiement', premium: 'Les 3', empire: 'Les 3' },
  { label: 'TON Connect', free: false, basic: false, premium: true, empire: true },
  { label: 'Coaching Elite', free: false, basic: false, premium: true, empire: true },
  { label: 'Analytics', free: false, basic: 'Winrate+TP/SL', premium: 'Avancées', empire: 'Complètes+CSV' },
  { label: 'Badge SNIPER', free: 'Obligatoire', basic: 'Obligatoire', premium: 'Masqué', empire: 'Masqué' },
  { label: 'Mode Binaire', free: false, basic: false, premium: true, empire: true },
  { label: 'Hybride Forex+Binaire', free: false, basic: false, premium: false, empire: true },
  { label: 'Blockchain Watcher', free: false, basic: false, premium: false, empire: true },
  { label: 'Notifs auto Telegram', free: false, basic: false, premium: true, empire: true },
  { label: 'Support prioritaire', free: false, basic: false, premium: false, empire: '24h' },
  { label: 'Leaderboard', free: false, basic: false, premium: false, empire: 'Phase 2' },
] as const

function resolvePlanKey(raw: string | undefined | null): PlanId {
  if (!raw) return 'free'
  if (raw in PLAN_CONFIG) return raw as PlanId
  return 'free'
}

export function usePlanFeatures(): PlanFeatures {
  const { config } = useClientConfig()
  const planKey = resolvePlanKey(config?.plan ?? 'free')

  const trialEndsAt =
    config?.trialEndsAt ??
    (config as { trial_ends_at?: string } | null)?.trial_ends_at

  if (planKey === 'empire' && trialEndsAt) {
    try {
      const trialEnd = new Date(trialEndsAt)
      if (!Number.isNaN(trialEnd.getTime()) && trialEnd > new Date()) {
        return {
          ...PLAN_CONFIG.empire,
          plan: planKey,
          planLabel: `${PLAN_CONFIG[planKey].planLabel} · ESSAI`,
        }
      }
    } catch {
      // ignore invalid date
    }
  }

  return PLAN_CONFIG[planKey] ?? PLAN_CONFIG.free
}

export function isVipModelAllowed(
  features: PlanFeatures,
  model: VipModelOption
): boolean {
  return features.allowedVipModels.includes(model)
}

/** FREE/BASIC: badge obligatoire. PREMIUM/EMPIRE: masqué par défaut, discret si hideSniperBadge === false */
export function shouldShowSniperBadge(
  features: PlanFeatures,
  hideSniperBadge?: boolean | null
): boolean {
  if (!features.canHideBadge) return true
  return hideSniperBadge !== true
}
