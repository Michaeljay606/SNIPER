import { useMemo } from 'react'
import type { ClientConfig } from '../context/ConfigContext'

export interface PlanFeatures {
  // Identity
  planName:         'free' | 'basic' | 'premium' | 'empire' | 'pause'
  planLabel:        string
  planIdentity:     string

  // Signals
  signalDailyLimit:    number | null   // null = unlimited
  canPublishVipSignals: boolean

  // Academy
  hasAcademy:           boolean
  academyVideoLimit:    number | null  // null = unlimited

  // Members
  maxMembers:           number | null  // null = unlimited

  // Branding
  showOnyxBadge:        boolean
  canCustomizeTheme:    boolean
  whiteLabel:           boolean

  // Features
  canCustomizeName:     boolean
  canUploadLogo:        boolean
  canConfigureBrokers:  boolean
  brokerLimit:          number
  hasAnalytics:              boolean
  hasAdvancedAnalytics:      boolean   // EMPIRE: analytics + CSV export
  hasBlockchainWatcher:      boolean
  blockchainComingSoon:      boolean   // EMPIRE: unlocked but feature not live yet
  hasPrioritySupport:        boolean   // EMPIRE only
  contactLinksLimit:         number
  academyModuleLimit:        number
  canConfigureEliteCoaching: boolean

  // Admin
  isAdminLocked:        boolean  // true for PAUSE plan

  // Helpers
  isFree:    boolean
  isBasic:   boolean
  isPremium: boolean
  isEmpire:  boolean
  isPaused:  boolean
}

// ── Single source of truth for plan config ────────────────────────────────────
export const MEMBER_WARNING_THRESHOLD = 0.80;


export const PLAN_CONFIG = {
  free: {
    label:       'FREE',
    identity:    'Découvre la plateforme',
    price:       0,
    signalLimit: 3          as number | null,
    academy:     true,
    videoLimit:  1          as number | null,
    maxMembers:  50         as number | null,
    onyxBadge:   true,
    theme:       false,
    whiteLabel:  false,
    brokers:     1,
    analytics:   false,
    blockchain:  false,
    adminLocked: false,
    contactLinks: 1,
    moduleLimit:  1,
    eliteCoaching: false,
  },
  basic: {
    label:       'BASIC',
    identity:    'Lance ton activité de mentor',
    price:       49,
    signalLimit: null       as number | null,
    academy:     true,
    videoLimit:  10         as number | null,
    maxMembers:  500        as number | null,
    onyxBadge:   true,
    theme:       false,
    whiteLabel:  false,
    brokers:     3,
    analytics:   false,
    blockchain:  false,
    adminLocked: false,
    contactLinks: 3,
    moduleLimit:  null,
    eliteCoaching: false,
  },
  premium: {
    label:       'PREMIUM',
    identity:    "Construis ton infrastructure",
    price:       99,
    signalLimit: null       as number | null,
    academy:     true,
    videoLimit:  null       as number | null,
    maxMembers:  2000       as number | null,
    onyxBadge:   false,
    theme:       true,
    whiteLabel:  false,
    brokers:     5,
    analytics:   true,
    blockchain:  false,
    adminLocked: false,
    contactLinks: 5,
    moduleLimit:  null,
    eliteCoaching: true,
  },
  empire: {
    label:            'EMPIRE',
    identity:         'Automatise. Délègue. Domine.',
    price:            199,
    signalLimit:      null       as number | null,
    academy:          true,
    videoLimit:       null       as number | null,
    maxMembers:       null       as number | null,
    onyxBadge:        false,
    theme:            true,
    whiteLabel:       true,
    brokers:          10,
    analytics:        true,
    advancedAnalytics: true,
    blockchain:       false,      // feature not live yet
    blockchainSoon:   true,       // unlocked for empire, but coming soon
    adminLocked:      false,
    contactLinks:     5,
    moduleLimit:      null,
    eliteCoaching:    true,
    prioritySupport:  true,
  },
  pause: {
    label:       'PAUSE',
    identity:    'En pause temporaire',
    price:       19,
    signalLimit: 0          as number | null,
    academy:     false,
    videoLimit:  0          as number | null,
    maxMembers:  0          as number | null,
    onyxBadge:   true,
    theme:       false,
    whiteLabel:  false,
    brokers:     0,
    analytics:   false,
    blockchain:  false,
    adminLocked: true,
    eliteCoaching: false,
  },
} as const

// Pricing map for MRR (used in MasterControlPanel)
export const PLAN_PRICES: Record<string, number> = {
  free:    PLAN_CONFIG.free.price,
  basic:   PLAN_CONFIG.basic.price,
  premium: PLAN_CONFIG.premium.price,
  empire:  PLAN_CONFIG.empire.price,
  pause:   PLAN_CONFIG.pause.price,
}

export function usePlanFeatures(plan: ClientConfig['plan']): PlanFeatures {
  return useMemo(() => {
    const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free
    return {
      planName:             plan,
      planLabel:            cfg.label,
      planIdentity:         cfg.identity,
      signalDailyLimit:     cfg.signalLimit,
      canPublishVipSignals: cfg.signalLimit === null,
      hasAcademy:           cfg.academy,
      academyVideoLimit:    cfg.videoLimit,
      maxMembers:           cfg.maxMembers,
      showOnyxBadge:        cfg.onyxBadge,
      canCustomizeTheme:    cfg.theme,
      whiteLabel:           cfg.whiteLabel,
      canCustomizeName:     true,
      canUploadLogo:        (plan !== 'free' && plan !== 'basic'),
      canConfigureBrokers:  cfg.brokers > 0,
      brokerLimit:          cfg.brokers,
      hasAnalytics:              cfg.analytics,
      hasAdvancedAnalytics:      (cfg as any).advancedAnalytics || false,
      hasBlockchainWatcher:      cfg.blockchain,
      blockchainComingSoon:      (cfg as any).blockchainSoon || false,
      hasPrioritySupport:        (cfg as any).prioritySupport || false,
      isAdminLocked:             cfg.adminLocked,
      contactLinksLimit:         (cfg as any).contactLinks || 5,
      academyModuleLimit:        (cfg as any).moduleLimit || 50,
      canConfigureEliteCoaching: (cfg as any).eliteCoaching || false,
      isFree:    plan === 'free',
      isBasic:   plan === 'basic',
      isPremium: plan === 'premium',
      isEmpire:  plan === 'empire',
      isPaused:  plan === 'pause',
    }
  }, [plan])
}
