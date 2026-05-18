import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from './ConfigContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TradingMode = 'MARKETS' | 'BINARY';

interface TradingModeContextType {
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => Promise<void>;
  isLoading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const TradingModeContext = createContext<TradingModeContextType | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map old 'forex' / 'binary' / 'both' values → new canonical 'MARKETS' | 'BINARY' */
function normalizeMode(raw: string | undefined | null): TradingMode {
  if (!raw) return 'MARKETS';
  const up = raw.toUpperCase();
  if (up === 'BINARY') return 'BINARY';
  // 'forex', 'both', 'MARKETS' → MARKETS
  return 'MARKETS';
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TradingModeProviderProps {
  children: React.ReactNode;
  tenantId: string;
}

export function TradingModeProvider({ children, tenantId }: TradingModeProviderProps) {
  const { config } = useConfig();

  // Seed instantly from ConfigContext — no extra loading state on mount
  const [tradingMode, setTradingModeState] = useState<TradingMode>(() =>
    normalizeMode(config?.tradingMode)
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync when ConfigContext refreshes (realtime from ConfigContext propagates here too)
  useEffect(() => {
    if (config?.tradingMode) {
      setTradingModeState(normalizeMode(config.tradingMode));
    }
  }, [config?.tradingMode]);

  // ── Realtime subscription on `tenants` table ──────────────────────────────
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`trading-mode-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenants',                          // ← correct table
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMode = payload.new?.trading_mode;
          if (newMode) {
            setTradingModeState(normalizeMode(newMode));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // ── Write to Supabase (RLS enforces Mentor-only server-side) ──────────────
  const setTradingMode = async (mode: TradingMode): Promise<void> => {
    if (mode === tradingMode) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')                             // ← correct table
        .update({ trading_mode: mode })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Optimistic local update — realtime subscription will confirm
      setTradingModeState(mode);
    } catch (err) {
      console.error('[TradingModeContext] Failed to update trading_mode:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({ tradingMode, setTradingMode, isLoading }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tradingMode, isLoading]
  );

  return (
    <TradingModeContext.Provider value={value}>
      {children}
    </TradingModeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTradingMode(): TradingModeContextType {
  const ctx = useContext(TradingModeContext);
  if (!ctx) {
    throw new Error(
      '[useTradingMode] Must be used inside <TradingModeProvider>. ' +
      'Wrap your component tree with <TradingModeProvider tenantId="…">.'
    );
  }
  return ctx;
}
