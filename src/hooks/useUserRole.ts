import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useClientConfig } from './useClientConfig';
import { useParams } from 'react-router-dom';
import { TENANT_ID as FALLBACK_TENANT_ID } from '../config';

export interface Affiliate {
  id: string;
  tenant_id: string;
  telegram_id: number | string | null;
  status: 'pending' | 'active' | 'refused' | 'banned';
  is_vip: boolean;
  role: 'user' | 'admin' | 'mentor';
  name?: string;
  email?: string;
  account_number?: string;
  broker?: string;
  vip_expires_at?: string | null;
  has_academy_access?: boolean;
  has_signals_access?: boolean;
  ton_wallet?: string | null;
}

export interface UserRole {
  isAdmin: boolean;
  isVip: boolean;
  isFree: boolean;
  isPending: boolean;
  isBanned: boolean;
  canSeeVipSignals: boolean;
  canSeeVipAcademy: boolean;
  canAccessAdmin: boolean;
  canEditProfile: boolean;
  showRenewalPrompt: boolean;
  dismissRenewalPrompt: () => void;
  currentUser: Affiliate | null;
  isLoading: boolean;
}

function computeVipExpired(affiliate: Affiliate | null): boolean {
  if (!affiliate?.is_vip) return false;
  if (!affiliate.vip_expires_at) return false;
  return new Date(affiliate.vip_expires_at) < new Date();
}

export function useUserRole(): UserRole {
  const [currentUser, setCurrentUser] = useState<Affiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRenewalPrompt, setShowRenewalPrompt] = useState(false);
  const { config } = useClientConfig();
  const { tenant_id: routeTenantId } = useParams();
  const tenantId = routeTenantId || FALLBACK_TENANT_ID;

  const telegramIdStr = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const telegramId = telegramIdStr ? Number(telegramIdStr) : null;

  const fetchUser = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      let affiliate: Affiliate | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      const currentAuthId = user?.id;
      const registrationData = localStorage.getItem(`sniper_affiliate_${tenantId}`);

      const getStoredAffiliate = async (): Promise<Affiliate | null> => {
        if (!registrationData) return null;

        try {
          const stored = JSON.parse(registrationData);

          if (stored.id) {
            const { data } = await supabase
              .from('affiliates')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('id', stored.id)
              .maybeSingle();

            if (data) return data as Affiliate;
          }

          if (stored.telegram_id) {
            const { data } = await supabase
              .from('affiliates')
              .select('*')
              .eq('tenant_id', tenantId)
              .eq('telegram_id', String(stored.telegram_id))
              .maybeSingle();

            if (data) return data as Affiliate;
          }

          if (stored.user) {
            return stored.user as Affiliate;
          }
        } catch (e) {
          console.error('localStorage fallback error:', e);
        }

        return null;
      };

      if (telegramId) {
        const { data } = await supabase
          .from('affiliates')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('telegram_id', String(telegramId))
          .maybeSingle();
        affiliate = data as Affiliate | null;
      } else if (currentAuthId) {
        const { data } = await supabase
          .from('affiliates')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', currentAuthId)
          .maybeSingle();
        affiliate = data as Affiliate | null;

        if (!affiliate) {
          const storedAffiliate = await getStoredAffiliate();
          if (storedAffiliate) {
            if (storedAffiliate.id !== currentAuthId) {
              const { data: affiliateByOldId } = await supabase
                .from('affiliates')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('id', storedAffiliate.id)
                .maybeSingle();

              if (affiliateByOldId) {
                const { error: updateError } = await supabase
                  .from('affiliates')
                  .update({ id: currentAuthId })
                  .eq('id', storedAffiliate.id)
                  .eq('tenant_id', tenantId);

                if (!updateError) {
                  affiliateByOldId.id = currentAuthId;
                  localStorage.setItem(`sniper_affiliate_${tenantId}`, JSON.stringify({
                    id: currentAuthId,
                    telegram_id: affiliateByOldId.telegram_id,
                    createdAt: new Date().toISOString(),
                  }));
                }
                affiliate = affiliateByOldId as Affiliate;
              }
            } else {
              affiliate = storedAffiliate;
            }
          }
        }
      }

      if (!affiliate) {
        affiliate = await getStoredAffiliate();
      }

      if (!affiliate && !currentAuthId) {
        setIsLoading(false);
        return;
      }

      if (affiliate && computeVipExpired(affiliate)) {
        const { error: downgradeError } = await supabase
          .from('affiliates')
          .update({
            is_vip: false,
            vip_expires_at: null,
            has_signals_access: false,
            has_academy_access: false,
          })
          .eq('id', affiliate.id)
          .eq('tenant_id', tenantId);

        if (!downgradeError) {
          affiliate.is_vip = false;
          affiliate.vip_expires_at = null;
          affiliate.has_signals_access = false;
          affiliate.has_academy_access = false;
          setShowRenewalPrompt(true);
        }
      }

      setCurrentUser(affiliate);
    } catch (err) {
      console.error('useUserRole: Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [telegramId, tenantId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!telegramId || !isSupabaseConfigured) return;

    const channel = supabase.channel(`user-role-${telegramId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'affiliates',
        filter: `telegram_id=eq.${telegramId} AND tenant_id=eq.${tenantId}`,
      }, () => {
        fetchUser();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [telegramId, tenantId, fetchUser]);

  let isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'mentor' ||
    (telegramId !== null && config?.telegramId !== null && telegramId === config?.telegramId);

  let isBanned = currentUser?.status === 'banned';
  let isPending = currentUser?.status === 'pending' && !isAdmin;
  let isVip = currentUser?.is_vip === true && currentUser?.status === 'active' && !isAdmin;
  let isFree = currentUser?.status === 'active' && !currentUser?.is_vip && !isAdmin;

  const debugRole = localStorage.getItem('debug_role');
  if (debugRole) {
    isAdmin = debugRole === 'admin';
    isVip = debugRole === 'vip';
    isFree = debugRole === 'free';
    isPending = false;
    isBanned = false;
  }

  return {
    isAdmin,
    isVip,
    isFree,
    isPending,
    isBanned,
    canSeeVipSignals: isAdmin || currentUser?.has_signals_access === true,
    canSeeVipAcademy: isAdmin || currentUser?.has_academy_access === true,
    canAccessAdmin: isAdmin,
    canEditProfile: isAdmin,
    showRenewalPrompt,
    dismissRenewalPrompt: () => setShowRenewalPrompt(false),
    currentUser,
    isLoading,
  };
}
