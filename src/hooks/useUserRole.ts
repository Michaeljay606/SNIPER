import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { TENANT_ID } from '../config'

export interface Affiliate {
  id: string
  tenant_id: string
  telegram_id: number
  status: 'pending' | 'active' | 'refused' | 'banned'
  is_vip: boolean
  role: 'user' | 'admin'
  name?: string
  email?: string
  can_access_signals?: boolean
  can_access_academy?: boolean
}

export function useUserRole() {
  const [currentUser, setCurrentUser] = useState<Affiliate | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      if (!isSupabaseConfigured) {
        setIsLoading(false)
        return
      }

      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setIsLoading(false);
          return;
        }

        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

        // Fetch affiliate info by Auth UID (most reliable)
        let query = supabase
          .from('affiliates')
          .select('*')
          .eq('tenant_id', TENANT_ID);

        if (authUser.id) {
          query = query.eq('id', authUser.id);
        } else if (tgUser?.id) {
          query = query.eq('telegram_id', tgUser.id);
        } else {
          setIsLoading(false);
          return;
        }

        const userRes = await query.single();

        // Fetch access status separately to handle errors gracefully
        const { data: accessData } = await supabase
          .from('member_access')
          .select('can_access_signals, can_access_academy')
          .eq('tenant_id', TENANT_ID)
          .eq('member_id', authUser.id)
          .single();


        if (userRes.error) {
          if (userRes.error.code !== 'PGRST116') {
            console.error('Error fetching user info:', userRes.error);
          }
        } else {
          // If the affiliate doesn't have a telegram_id yet, but we are in Telegram, sync it!
          if (!userRes.data.telegram_id && tgUser?.id) {
            console.log('useUserRole: Syncing telegram_id for affiliate');
            await supabase.from('affiliates').update({ telegram_id: tgUser.id }).eq('id', authUser.id);
          }

          setCurrentUser({
            ...userRes.data,
            can_access_signals: accessData?.can_access_signals ?? userRes.data?.is_vip ?? false,
            can_access_academy: accessData?.can_access_academy ?? userRes.data?.is_vip ?? false
          });
        }
      } catch (err) {
        console.error('Unexpected error fetching user role:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'mentor'
  const isVip = currentUser?.is_vip === true || isAdmin
  const canAccessSignals = currentUser?.can_access_signals || isAdmin
  const canAccessAcademy = currentUser?.can_access_academy || isAdmin
  const isFree = !isVip && !canAccessSignals && !canAccessAcademy

  return { isAdmin, isVip, isFree, canAccessSignals, canAccessAcademy, currentUser, isLoading }
}
