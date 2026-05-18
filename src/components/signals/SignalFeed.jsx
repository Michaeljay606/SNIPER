import { useTradingMode } from "../../context/TradingModeContext";
import MarketSignalCard from "./MarketSignalCard";
import BinarySignalCard from "./BinarySignalCard";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  green: "#00ff88",
  greenGlow: "rgba(0,255,136,0.15)",
  red: "#ff3b5c",
  textSecondary: "#6b7280",
  textMuted: "#3d4045",
  border: "#1e1e1e",
  bgCardElevated: "#161616",
};

// ─── DATE SEPARATOR ─────────────────────────────────────────────────────────────

function DateSeparator({ label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '16px 0 10px',
    }}>
      <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
        color: '#6b7280', fontFamily: 'JetBrains Mono, monospace',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px',
        background: 'rgba(0,255,136,0.1)', color: '#00ff88',
        borderRadius: 3, fontFamily: 'JetBrains Mono, monospace',
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
    </div>
  );
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function groupSignalsByDate(signals) {
  const groups = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  signals.forEach(signal => {
    const date = new Date(signal.created_at || Date.now());
    let label;

    if (isSameDay(date, today)) {
      label = "AUJOURD'HUI";
    } else if (isSameDay(date, yesterday)) {
      label = "HIER";
    } else {
      label = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).toUpperCase();
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(signal);
  });

  return groups;
}

// ─── EMPTY STATE ───────────────────────────────────────────────────────────────

function EmptyState({ mode }) {
  const isBinary = mode === "BINARY";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "60px 24px",
      textAlign: "center",
    }}>
      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: isBinary ? "rgba(245,200,66,0.08)" : "rgba(0,255,136,0.08)",
        border: `1px solid ${isBinary ? "rgba(245,200,66,0.2)" : "rgba(0,255,136,0.2)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
        fontSize: 24,
      }}>
        {isBinary ? "⏱" : "📡"}
      </div>

      {/* Pulse line */}
      <div style={{
        width: 120, height: 2, marginBottom: 20,
        background: `linear-gradient(90deg, transparent, ${isBinary ? T.red : T.green}, transparent)`,
        borderRadius: 1,
        opacity: 0.6,
      }} />

      <p style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 9, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: T.textMuted,
        marginBottom: 6,
      }}>
        {isBinary ? "Aucune option active" : "Aucun signal actif"}
      </p>
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 11, color: T.textSecondary,
        lineHeight: 1.5,
      }}>
        {isBinary
          ? "Les signaux d'options binaires apparaîtront ici"
          : "Les signaux Forex · Crypto · Indices apparaîtront ici"}
      </p>
    </div>
  );
}

// ─── SECTION HEADER ────────────────────────────────────────────────────────────

function SectionHeader({ count, mode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12, padding: "0 2px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 3, height: 14, background: T.green,
          borderRadius: 2, boxShadow: `0 0 6px ${T.green}`,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
          color: T.textSecondary,
          fontFamily: "JetBrains Mono, monospace",
          textTransform: "uppercase",
        }}>
          {mode === "BINARY" ? "OPTIONS BINAIRES" : "SIGNAUX EN TEMPS RÉEL"}
        </span>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
        color: "#ffffff",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {count} ACTIF{count !== 1 ? "S" : ""}
      </span>
    </div>
  );
}

// ─── SIGNAL FEED ───────────────────────────────────────────────────────────────

/**
 * Displays signals filtered by the current trading mode.
 *
 * @param {{
 *   signals: any[],
 *   showHeader?: boolean,
 * }} props
 */
export default function SignalFeed({ signals = [], showHeader = true }) {
  const { tradingMode } = useTradingMode();

  // 1. Strict filtering by trading mode
  const filteredSignals = signals.filter((s) => {
    const sigMode = (s.trading_mode || s.mode || "MARKETS").toUpperCase();
    return sigMode === tradingMode;
  });

  // 2. Chronological sorting (most recent first)
  const sortedSignals = [...filteredSignals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 3. Grouping by date
  const groupedSignals = groupSignalsByDate(sortedSignals);

  // 4. Active count for TODAY only
  const todaySignals = groupedSignals["AUJOURD'HUI"] || [];
  const activeCount = todaySignals.filter(
    (s) => !["tp", "sl", "cancelled"].includes((s.status || "").toLowerCase())
  ).length;

  return (
    <div>
      {showHeader && (
        <SectionHeader count={activeCount} mode={tradingMode} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {filteredSignals.length === 0 ? (
          <EmptyState mode={tradingMode} />
        ) : (
          Object.entries(groupedSignals).map(([dateLabel, group]) => (
            <div key={dateLabel}>
              <DateSeparator label={dateLabel} count={group.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {group.map((signal, idx) => {
                  const normalized = {
                    ...signal,
                    pair: signal.pair || signal.asset || "ASSET",
                    direction: (signal.direction || "BUY").toUpperCase(),
                    tp: Array.isArray(signal.tp)
                      ? signal.tp
                      : signal.tp
                        ? String(signal.tp).split(",").map((x) => x.trim())
                        : ["—"],
                    rr: Number(signal.rr) || 0,
                    payout: Number(signal.payout ?? signal.payout_pct) || 0,
                    isNew: idx === 0 && dateLabel === "AUJOURD'HUI",
                    isLive: !["tp", "sl", "cancelled"].includes(
                      (signal.status || "active").toLowerCase()
                    ),
                    progressInit: 85,
                    time: (() => {
                      const d = new Date(signal.created_at || Date.now());
                      return isNaN(d.getTime()) ? "NOW" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    })(),
                    isVip: signal.is_vip ?? signal.isVip ?? false,
                    isOtc: signal.is_otc ?? signal.isOtc ?? false,
                  };

                  return tradingMode === "MARKETS" ? (
                    <MarketSignalCard key={signal.id ?? idx} signal={normalized} />
                  ) : (
                    <BinarySignalCard key={signal.id ?? idx} signal={normalized} />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
