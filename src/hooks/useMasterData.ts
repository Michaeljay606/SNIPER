import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Tenant {
  tenant_id: string;
  mentor_name: string;
  plan: 'free' | 'basic' | 'premium' | 'empire' | 'pause';
  licence_status: 'active' | 'suspended';
  trading_mode: 'forex' | 'binary' | 'both';
  created_at: string;
  trial_ends_at?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  referral_count?: number | null;
  credit_balance?: number | null;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'confirming';
  created_at: string;
}

const PRICES = {
  free: 0,
  basic: 49,
  premium: 99,
  empire: 199,
  pause: 19,
};

export function useMasterData() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'error' | 'timeout' | 'checking'>('checking');

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      // DB Health check
      const healthPromise = supabase.from('tenants').select('tenant_id').limit(1);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      await Promise.race([healthPromise, timeoutPromise])
        .then((res: any) => {
          if (res.error) setDbStatus('error');
          else setDbStatus('online');
        })
        .catch(err => setDbStatus(err.message === 'Timeout' ? 'timeout' : 'error'));

      // Fetch tenants and transactions
      const [tenantsRes, transRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_transactions').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (tenantsRes.error) throw tenantsRes.error;
      setTenants(tenantsRes.data || []);
      setTransactions(transRes.data || []);

      // Compute MRR
      const computedMrr = (tenantsRes.data || [])
        .filter(t => t.licence_status === 'active')
        .reduce((sum, t) => sum + (PRICES[t.plan as keyof typeof PRICES] || 0), 0);
      setMrr(computedMrr);

    } catch (err) {
      console.error('Master data fetch error:', err);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase.channel('master-tenants')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tenants' 
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_transactions'
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { tenants, setTenants, transactions, loading, mrr, dbStatus, refresh: fetchData };
}
