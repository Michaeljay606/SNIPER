import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { useClientConfig } from './useClientConfig';

export interface Affiliate {
  id: string;
  tenant_id: string;
  telegram_id: number;
  status: 'pending' | 'active' | 'refused' | 'banned';
  is_vip: boolean;
  role: 'user' | 'admin' | 'mentor';
  name?: string;
  email?: string;
  account_number?: string;
  broker?: string;
  vip_expires_at?: string | null;
  has_academy_access?: boolean;
  ton_wallet?: string | null;
}

export interface UserRole {
  // User type
  isAdmin: boolean;
  isVip: boolean;
  isFree: boolean;
  isPending: boolean;
  isBanned: boolean;

  // Derived permissions
  canSeeVipSignals: boolean;
  canSeeVipAcademy: boolean;
  canAccessAdmin: boolean;
  canEditProfile: boolean;

  // Renewal prompt
  showRenewalPrompt: boolean;
  dismissRenewalPrompt: () => void;

  // Current user data
  currentUser: Affiliate | null;
  isLoading: boolean;
}

function computeVipExpired(affiliate: Affiliate | null): boolean {
  if (!affiliate?.is_vip) return false;
  if (!affiliate.vip_expires_at) return false; // lifetime — never expires
  return new Date(affiliate.vip_expires_at) < new Date();
}

export function useUserRole(): UserRole {
  const [currentUser, setCurrentUser] = useState<Affiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRenewalPrompt, setShowRenewalPrompt] = useState(false);
  const { config } = useClientConfig();

  const telegramIdStr = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const telegramId = telegramIdStr ? Number(telegramIdStr) : null;

  const fetchUser = useCallback(async () => {
    if (!isSupabaseConfigured || !telegramId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('telegram_id', telegramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('useUserRole: Error fetching affiliate:', error);
      }

      const affiliate = data as Affiliate | null;

      // ─── VIP Expiry Check ─────────────────────────────────
      if (affiliate && computeVipExpired(affiliate)) {
        // Auto-downgrade to free silently
        const { error: downgradeError } = await supabase
          .from('affiliates')
          .update({ is_vip: false, vip_expires_at: null })
          .eq('id', affiliate.id);

        if (!downgradeError) {
          affiliate.is_vip = false;
          affiliate.vip_expires_at = null;
          setShowRenewalPrompt(true);
        }
      }

      setCurrentUser(affiliate);
    } catch (err) {
      console.error('useUserRole: Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [telegramId]);

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
        filter: `telegram_id=eq.${telegramId} AND tenant_id=eq.${TENANT_ID}`
      }, () => {
        fetchUser();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [telegramId, fetchUser]);

  // Determine admin status
  let isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'mentor' ||
    (telegramId !== null && config?.telegramId !== null && telegramId === config?.telegramId);

  // Derive roles
  let isBanned = currentUser?.status === 'banned';
  let isPending = currentUser?.status === 'pending' && !isAdmin;
  let isVip = currentUser?.is_vip === true && currentUser?.status === 'active' && !isAdmin;
  let isFree = currentUser?.status === 'active' && !currentUser?.is_vip && !isAdmin;

  // DEBUG OVERRIDE
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
    canSeeVipSignals: isAdmin || isVip,
    canSeeVipAcademy: isAdmin || isVip,
    canAccessAdmin: isAdmin,
    canEditProfile: isAdmin,
    showRenewalPrompt,
    dismissRenewalPrompt: () => setShowRenewalPrompt(false),
    currentUser,
    isLoading,
  };
}
