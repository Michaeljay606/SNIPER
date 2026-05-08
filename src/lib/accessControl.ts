import { supabase } from './supabase';

export interface TenantConfig {
  signals_duration_model: 'lifetime' | 'monthly' | 'fixed';
  signals_fixed_months?: number;
  academy_duration_model: 'lifetime' | 'monthly' | 'fixed';
  academy_fixed_months?: number;
  grant_all_on_payment: boolean;
}

export interface UserSubscription {
  signals_active: boolean;
  signals_expires_at: string | null;
  academy_active: boolean;
  academy_expires_at: string | null;
  academy_is_lifetime: boolean;
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export async function grantAccess(
  tenantId: string,
  memberId: string,
  section: 'signals' | 'academy',
  tenantConfig: TenantConfig
) {
  const now = new Date();
  const update: any = {};

  if (section === 'signals' || tenantConfig.grant_all_on_payment) {
    update.signals_active = true;

    switch (tenantConfig.signals_duration_model) {
      case 'lifetime':
        update.signals_expires_at = null; // never expires
        break;
      case 'monthly':
        update.signals_expires_at = addMonths(now, 1);
        break;
      case 'fixed':
        update.signals_expires_at = addMonths(now, tenantConfig.signals_fixed_months || 1);
        break;
    }
  }

  if (section === 'academy' || tenantConfig.grant_all_on_payment) {
    update.academy_active = true;

    switch (tenantConfig.academy_duration_model) {
      case 'lifetime':
        update.academy_is_lifetime = true;
        update.academy_expires_at  = null; // never expires — ever
        break;
      case 'monthly':
        update.academy_is_lifetime = false;
        update.academy_expires_at  = addMonths(now, 1);
        break;
      case 'fixed':
        update.academy_is_lifetime = false;
        update.academy_expires_at  = addMonths(now, tenantConfig.academy_fixed_months || 1);
        break;
    }
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({ 
      tenant_id: tenantId, 
      member_id: memberId, 
      ...update,
      updated_at: new Date().toISOString() 
    });

  if (error) throw error;
}

export async function getMemberAccess(tenantId: string, memberId: string) {
  const { data, error } = await supabase
    .from('member_access')
    .select('can_access_signals, can_access_academy')
    .eq('tenant_id', tenantId)
    .eq('member_id', memberId)
    .single();

  if (error) {
    console.error('Error fetching member access:', error);
    return { signals: false, academy: false };
  }

  return {
    signals: data?.can_access_signals ?? false,
    academy: data?.can_access_academy ?? false,
  };
}
