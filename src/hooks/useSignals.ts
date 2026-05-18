import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Signal {
  id: string;
  pair?: string;
  asset?: string;
  type?: string;
  direction?: string;
  mode?: string;
  entry?: string;
  sl?: string;
  tp?: string;
  expiration?: string;
  payout_pct?: number;
  rr?: string;
  status: string;
  created_at?: string;
  is_vip?: boolean;
  tenant_id: string;
}

export function useSignals(tenantId: string, tradingMode: 'forex' | 'binary' | 'both' = 'both') {
  const queryClient = useQueryClient();
  const tid = tenantId || 'default';

  const { data: signals = [], isLoading, refetch } = useQuery({
    queryKey: ['signals', tid, tradingMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signals')
        .select('id, pair, type, signal_type, entry, entry_low, entry_high, sl, tp, status, timestamp, is_vip, tenant_id, mode, direction, expiration, payout_pct, asset, trading_mode, rr, analysis_note, watch_activated_at, martingale')
        .eq('tenant_id', tid)
        .order('timestamp', { ascending: false })
        .limit(40);

      if (error) throw error;
      
      const allSignals = (data as any[] || []).map(s => {
        // Map timestamp to created_at if it exists, with fallback to current time to prevent display failure
        const createdAt = s.timestamp || s.created_at || new Date().toISOString();
        // Normalize status
        let status = (s.status || 'active').toLowerCase();
        if (status === 'tp1_hit' || status === 'tp2_hit') {
          // Keep these as active partially-hit statuses to remain live in UI
        } else {
          if (status.includes('tp')) status = 'tp';
          if (status.includes('sl')) status = 'sl';
          if (status.includes('cancel')) status = 'cancelled';
          if (status.includes('hit')) status = status.replace('_hit', '');
        }

        // Normalize direction (BUY/SELL/CALL/PUT)
        let direction = (s.direction || s.type || '').toUpperCase();
        if (!['BUY', 'SELL', 'CALL', 'PUT'].includes(direction)) {
          if (s.direction && ['BUY', 'SELL', 'CALL', 'PUT'].includes(s.direction.toUpperCase())) {
            direction = s.direction.toUpperCase();
          } else if (s.type && ['BUY', 'SELL', 'CALL', 'PUT'].includes(s.type.toUpperCase())) {
            direction = s.type.toUpperCase();
          } else {
            direction = 'BUY'; 
          }
        }

        let mode = (s.mode || s.trading_mode || 'forex').toLowerCase();
        if (!['forex', 'binary'].includes(mode)) mode = 'forex';

        return {
          ...s,
          status,
          direction,
          pair: (s.pair || '').trim(),
          asset: (s.asset || '').trim(),
          mode: mode as 'forex' | 'binary',
          created_at: createdAt,
        };
      }) as Signal[];

      // Filter by trading mode in JS
      if (tradingMode === 'forex') {
        return allSignals.filter(s => s.mode === 'forex');
      } else if (tradingMode === 'binary') {
        return allSignals.filter(s => s.mode === 'binary');
      }
      return allSignals;
    },
    staleTime: 1000 * 5, // 5 seconds safety net
    retry: 0,
  });

  useEffect(() => {
    if (!tid) return;

    const channel = supabase.channel(`live-signals-${tid}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'signals', filter: `tenant_id=eq.${tid}` }, 
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['signals', tid] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tid, queryClient]);

  return { signals, isLoading, refetch };
}
