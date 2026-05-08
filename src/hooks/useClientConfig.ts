import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { TENANT_ID } from '../config'

export interface MentorBadge {
  id: string
  label: string
}

export interface TenantRow {
  tenant_id: string;
  mentor_name: string;
  logo_url: string | null;
  plan: 'free' | 'basic' | 'premium' | 'empire' | 'pause';
  licence_status: 'active' | 'suspended';
  telegram_link: string | null;
  vision_text: string | null;
  speciality: string | null;
  years_exp: string | null;
  traders_count: string | null;
  broker_1_name: string | null;
  broker_1_url: string | null;
  broker_2_name: string | null;
  broker_2_url: string | null;
  broker_3_name: string | null;
  broker_3_url: string | null;
  social_telegram: string | null;
  social_youtube: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  elite_title: string | null;
  elite_description: string | null;
  elite_tag: string | null;
  elite_price: string | null;
  elite_contact_url: string | null;
  theme_color: string | null;
  telegram_id: number | null;
  social_links: any[] | null;
  whatsapp_url: string | null;
  telegram_contact_url: string | null;
  vip_model: 'payment' | 'broker' | 'both' | null;
  vip_price_1m: string | null;
  vip_price_2m: string | null;
  vip_price_1y: string | null;
  vip_price_lifetime: string | null;
  vip_currency: string | null;
  academy_model: 'free' | 'broker' | 'payment' | 'both' | null;
  academy_price_lifetime: string | null;
  academy_price_1m: string | null;
  broker_msg_vip: string | null;
  broker_msg_academy: string | null;
  max_members: number | null;
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
  ton_payment_enabled: boolean | null;
  ton_wallet: string | null;
  wallets: any | null;
  signals_duration_model: string | null;
  academy_duration_model: string | null;
}

export interface ClientConfig {
  tenantId:      string
  mentorName:    string
  logoUrl:       string | null
  plan:          'free' | 'basic' | 'premium' | 'empire' | 'pause'
  licenceStatus: 'active' | 'suspended'
  telegramLink:  string | null
  visionText:    string | null
  speciality:    string | null
  yearsExp:      string | null
  tradersCount:  string | null
  broker1Name:   string
  broker1Url:    string | null
  broker2Name:   string
  broker2Url:    string | null
  broker3Name:   string
  broker3Url:    string | null
  socialTelegram:  string | null
  socialYoutube:   string | null
  socialInstagram: string | null
  socialTiktok:    string | null
  eliteTitle:      string | null
  eliteDescription: string | null
  eliteTag:        string | null
  elitePrice:      string | null
  eliteContactUrl: string | null
  themeColor:      string
  telegramOwnerId: number | null;
  socialLinks:     any[];
  badges:          MentorBadge[];
  vipModel:        'payment' | 'broker' | 'both'
  vipPrice1m:      string
  vipPrice2m:      string
  vipPrice1y:      string
  vipPriceLifetime: string
  vipCurrency:     string
  academyModel:    'free' | 'broker' | 'payment' | 'both'
  academyPriceLifetime: string
  academyPrice1m: string
  brokerMsgVip:    string
  brokerMsgAcademy: string
  maxMembers:      number | null
  onboardingCompleted: boolean
  onboardingStep: number
  whatsappUrl?: string
  telegramContactUrl?: string
  tonPaymentEnabled: boolean
  tonWallet:        string | null
  wallets:          any
  signalsDurationModel: string
  academyDurationModel: string
}

const DEFAULT_CONFIG: ClientConfig = {
  tenantId: TENANT_ID,
  mentorName: 'EPHATA TECH',
  logoUrl: null,
  plan: 'basic',
  licenceStatus: 'active',
  telegramLink: null,
  visionText: null,
  speciality: "Expert Trading Intelligence",
  yearsExp: "5+",
  tradersCount: "1000+",
  broker1Name: '',
  broker1Url: null,
  broker2Name: '',
  broker2Url: null,
  broker3Name: '',
  broker3Url: null,
  eliteTag: 'SESSIONS PRIVÉES SUR GOOGLE MEET',
  brokerMsgVip: "Pour accéder aux signaux VIP gratuitement via nos brokers partenaires, vous devez choisir l'un des brokers ci-dessous, créer un compte et effectuer un dépôt.",
  brokerMsgAcademy: "Pour accéder à l'Academy gratuitement via nos brokers partenaires, vous devez choisir l'un des brokers ci-dessous, créer un compte et effectuer un dépôt.",
  socialTelegram: null,
  socialYoutube: null,
  socialInstagram: null,
  socialTiktok: null,
  eliteTitle: "Accompagnement Elite",
  eliteDescription: "Un coaching privé avec un suivi jusqu'à la rentabilité.",
  elitePrice: "2995€",
  eliteContactUrl: null,
  themeColor: '#00FF41',
  telegramOwnerId: null,
  socialLinks: [],
  badges: [],
  vipModel: 'payment',
  vipPrice1m: '99',
  vipPrice2m: '179',
  vipPrice1y: '599',
  vipPriceLifetime: '999',
  vipCurrency: '$',
  academyModel: 'broker',
  academyPriceLifetime: '299',
  academyPrice1m: '29',
  maxMembers: 50,
  onboardingCompleted: true,
  onboardingStep: 4,
  whatsappUrl: '',
  telegramContactUrl: '',
  tonPaymentEnabled: false,
  tonWallet: null,
  wallets: { usdtTrc20: '', ton: '' },
  signalsDurationModel: 'monthly',
  academyDurationModel: 'lifetime',
}

function rowToConfig(row: TenantRow, badges: MentorBadge[]): ClientConfig {
  return {
    tenantId:        row.tenant_id,
    mentorName:      row.mentor_name,
    logoUrl:         row.logo_url,
    plan:            row.plan,
    licenceStatus:   row.licence_status,
    telegramLink:    row.telegram_link,
    visionText:      row.vision_text,
    speciality:      row.speciality,
    yearsExp:        row.years_exp,
    tradersCount:    row.traders_count,
    broker1Name:     row.broker_1_name ?? '',
    broker1Url:      row.broker_1_url,
    broker2Name:     row.broker_2_name ?? '',
    broker2Url:      row.broker_2_url,
    broker3Name:     row.broker_3_name ?? '',
    broker3Url:      row.broker_3_url,
    socialTelegram:  row.social_telegram,
    socialYoutube:   row.social_youtube,
    socialInstagram: row.social_instagram,
    socialTiktok:    row.social_tiktok,
    eliteTitle:      row.elite_title,
    eliteDescription: row.elite_description,
    eliteTag:         row.elite_tag ?? 'SESSIONS PRIVÉES SUR GOOGLE MEET',
    elitePrice:      row.elite_price,
    eliteContactUrl: row.elite_contact_url,
    themeColor:      row.theme_color ?? '#00FF41',
    telegramOwnerId: row.telegram_id,
    socialLinks:     row.social_links ?? [],
    badges,
    vipModel:        row.vip_model ?? 'payment',
    vipPrice1m:      row.vip_price_1m ?? '99',
    vipPrice2m:      row.vip_price_2m ?? '179',
    vipPrice1y:      row.vip_price_1y ?? '599',
    vipPriceLifetime: row.vip_price_lifetime ?? '999',
    vipCurrency:     row.vip_currency ?? '$',
    academyModel:    row.academy_model ?? 'broker',
    academyPriceLifetime: row.academy_price_lifetime ?? '299',
    academyPrice1m:  row.academy_price_1m ?? '29',
    brokerMsgVip:     row.broker_msg_vip ?? "Pour accéder aux signaux VIP gratuitement via nos brokers partenaires, vous devez choisir l'un des brokers ci-dessous, créer un compte et effectuer un dépôt.",
    brokerMsgAcademy: row.broker_msg_academy ?? "Pour accéder à l'Academy gratuitement via nos brokers partenaires, vous devez choisir l'un des brokers ci-dessous, créer un compte et effectuer un dépôt.",
    maxMembers:      row.max_members ?? null,
    onboardingCompleted: row.onboarding_completed ?? false,
    onboardingStep: row.onboarding_step ?? 1,
    whatsappUrl:      row.whatsapp_url ?? '',
    telegramContactUrl: row.telegram_contact_url ?? '',
    tonPaymentEnabled: row.ton_payment_enabled ?? false,
    tonWallet:        row.ton_wallet ?? null,
    wallets:          row.wallets ?? { usdtTrc20: '', ton: row.ton_wallet || '' },
    signalsDurationModel: row.signals_duration_model ?? 'monthly',
    academyDurationModel: row.academy_duration_model ?? 'lifetime',
  }
}

export function useClientConfig() {
  const [config, setConfig] = useState<ClientConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured) {
        setConfig(DEFAULT_CONFIG)
        setLoading(false)
        return
      }

      try {
        // 1. Fetch existing tenant
        let { data: tenant, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .eq('tenant_id', TENANT_ID)
          .single()

        // Fallback to legacy 'id' column
        if (fetchError && fetchError.message.includes('tenant_id')) {
           const retry = await supabase
             .from('tenants')
             .select('*')
             .eq('id', TENANT_ID)
             .single()
           tenant = retry.data
           fetchError = retry.error
        }

        let currentTenant = tenant

        // 2. Auto-create if not found and Telegram context available
        if (!tenant && (fetchError?.code === 'PGRST116' || !tenant)) {
          const tgUser = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name: string } } } } })
            .Telegram?.WebApp?.initDataUnsafe?.user
          if (tgUser && TENANT_ID) {
            const payload: Partial<TenantRow> & { id?: string } = {
              mentor_name: tgUser.first_name,
              telegram_id: tgUser.id,
              plan: 'free',
              licence_status: 'active',
              onboarding_completed: false,
              onboarding_step: 1,
            }

            if (fetchError && fetchError.message.includes('tenant_id')) {
              payload.id = TENANT_ID
            } else {
              payload.tenant_id = TENANT_ID
            }

            const { data: newTenant, error: createError } = await supabase
              .from('tenants')
              .insert([payload])
              .select()
              .single()

            if (!createError) {
              currentTenant = newTenant
            } else {
              console.error("Create tenant error:", createError)
            }
          }
        }

        if (currentTenant) {
          const { data: badgesRes } = await supabase
            .from('mentor_badges')
            .select('*')
            .eq('tenant_id', TENANT_ID)

          const cfg = rowToConfig(currentTenant as TenantRow, badgesRes || [])
          setConfig(cfg)

          // Apply theme immediately
          document.documentElement.style.setProperty('--color-accent-neon', cfg.themeColor)
        } else {
          setConfig(DEFAULT_CONFIG)
        }
      } catch (error) {
        console.error("Error fetching/creating client config:", error)
        setConfig(DEFAULT_CONFIG)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // ── Realtime subscription — syncs plan/licence changes from Master Control ──
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel(`tenant-config-${TENANT_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenants',
          filter: `tenant_id=eq.${TENANT_ID}`,
        },
        (payload) => {
          const updated = payload.new as Partial<TenantRow>

          setConfig(prev => {
            if (!prev) return prev
            return {
              ...prev,
              licenceStatus:      (updated.licence_status as ClientConfig['licenceStatus']) ?? prev.licenceStatus,
              plan:               (updated.plan as ClientConfig['plan'])                   ?? prev.plan,
              mentorName:         updated.mentor_name                                      ?? prev.mentorName,
              themeColor:         updated.theme_color                                      ?? prev.themeColor,
              maxMembers:         updated.max_members                                      ?? prev.maxMembers,
               onboardingCompleted: updated.onboarding_completed                            ?? prev.onboardingCompleted,
               onboardingStep:      updated.onboarding_step                                 ?? prev.onboardingStep,
               wallets:             updated.wallets                                         ?? prev.wallets,
               signalsDurationModel: updated.signals_duration_model                         ?? prev.signalsDurationModel,
               academyDurationModel: updated.academy_duration_model                         ?? prev.academyDurationModel,
            }
          })

          // Sync CSS variable when theme changes
          if (updated.theme_color) {
            document.documentElement.style.setProperty('--color-accent-neon', updated.theme_color)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Safety timeout — never stay stuck loading forever ────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('Force loading to false after 10s')
        setLoading(false)
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [loading])

  return { config, loading }
}
