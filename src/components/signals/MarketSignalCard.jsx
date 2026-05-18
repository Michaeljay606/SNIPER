import { useEffect, useRef } from "react";

// ─── DESIGN TOKENS (calqués sur SignalCards reference) ─────────────────────────
const T = {
  bg: "#0a0a0a",
  bgCard: "#111111",
  bgCardElevated: "#161616",
  border: "#1e1e1e",
  green: "#00ff88",
  greenDim: "#00cc6a",
  greenGlow: "rgba(0,255,136,0.15)",
  greenGlowStrong: "rgba(0,255,136,0.25)",
  red: "#ff3b5c",
  redDim: "#cc2040",
  redGlow: "rgba(255,59,92,0.15)",
  yellow: "#f5c842",
  blue: "#4da6ff",
  textPrimary: "#ffffff",
  textSecondary: "#6b7280",
  textMuted: "#3d4045",
  vipGold: "#d4a843",
};

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function LiveDot({ color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
      color, fontFamily: "JetBrains Mono, monospace",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: "msc-pulse-dot 1.5s ease-in-out infinite",
        display: "inline-block",
      }} />
      LIVE
    </span>
  );
}

function DirectionBadge({ direction }) {
  const isBuy = direction === "BUY";
  const color = isBuy ? T.green : T.red;
  const arrow = isBuy ? "▲" : "▼";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 4,
      background: `${color}20`,
      border: `1px solid ${color}50`,
      color, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.1em",
      fontFamily: "JetBrains Mono, monospace",
    }}>
      <span style={{ fontSize: 9 }}>{arrow}</span> {direction}
    </span>
  );
}

function VIPBadge() {
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 4,
      background: `${T.vipGold}18`,
      border: `1px solid ${T.vipGold}60`,
      color: T.vipGold,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.12em",
      fontFamily: "JetBrains Mono, monospace",
    }}>VIP</span>
  );
}

function NouveauBadge() {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "4px 0 4px 0",
      background: T.green,
      color: "#000",
      fontSize: 10, fontWeight: 800,
      letterSpacing: "0.1em",
      fontFamily: "JetBrains Mono, monospace",
      animation: "msc-nouveau-pulse 2s ease-in-out infinite",
      position: "absolute", top: 0, left: 0,
    }}>NOUVEAU</span>
  );
}

// ─── MARKET SIGNAL CARD ────────────────────────────────────────────────────────

/**
 * @param {{ signal: {
 *   id: string, pair: string, direction: 'BUY'|'SELL', entry: string,
 *   sl: string, tp: string[], rr: number, isVip: boolean, isNew: boolean,
 *   time: string, status: 'LIVE'|'CLOSED'|'PENDING'
 * }}} props
 */
export default function MarketSignalCard({ signal }) {
  const isBuy = signal.direction === "BUY";
  const accentColor = isBuy ? T.green : T.red;
  const accentGlow  = isBuy ? T.greenGlow : T.redGlow;
  const isNew = signal.isNew ?? false;
  const isActive = signal.status === 'LIVE' || signal.status === 'active' || signal.status === 'PENDING';
  const activationTime = signal.watch_activated_at ? new Date(signal.watch_activated_at).getTime() : (signal.created_at || signal.time ? new Date(signal.created_at || signal.time).getTime() : Date.now());
  const isJustActivated = (Date.now() - activationTime) < 300000;
  
  let topBadge = null;
  if (isActive && signal.signal_type === 'WATCH') {
    topBadge = { label: '👀 ZONE DE SURVEILLANCE', bg: signal.isVip ? '#FFD60A' : '#0098EA', color: signal.isVip ? '#050507' : '#fff' };
  } else if (isActive && isJustActivated) {
    topBadge = { label: '⚡ GO NOW !', bg: signal.isVip ? '#FFD60A' : 'var(--amber)', color: '#000' };
  } else if (isActive) {
    topBadge = { label: '📈 EN COURS', bg: signal.isVip ? '#FFD60A' : 'rgba(255,255,255,0.08)', color: signal.isVip ? '#050507' : 'rgba(255,255,255,0.7)' };
  } else if (isNew) {
    topBadge = { label: 'NOUVEAU', bg: signal.isVip ? '#FFD60A' : 'rgba(0,255,136,0.1)', color: signal.isVip ? '#050507' : T.green };
  }

  // Normalize tp to array
  const tpList = Array.isArray(signal.tp)
    ? signal.tp
    : signal.tp
      ? String(signal.tp).split(",").map((x) => x.trim())
      : ["—"];

  const rr = (() => {
    if (!signal.entry || !signal.sl || !signal.tp) return Number(signal.rr) || 2.0;

    const entryVal = parseFloat(String(signal.entry).replace(/[^0-9.]/g, ''));
    const slVal = parseFloat(String(signal.sl).replace(/[^0-9.]/g, ''));
    
    // Get the first TP level
    const firstTpStr = String(tpList[0]);
    const tpVal = parseFloat(firstTpStr.replace(/[^0-9.]/g, ''));

    if (isNaN(entryVal) || isNaN(slVal) || isNaN(tpVal)) return Number(signal.rr) || 2.0;

    const risk = Math.abs(entryVal - slVal);
    const reward = Math.abs(tpVal - entryVal);

    if (risk === 0) return Number(signal.rr) || 2.0;

    const ratio = reward / risk;
    return parseFloat(ratio.toFixed(1));
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes msc-pulse-dot {
          0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}
        }
        @keyframes msc-card-in {
          from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}
        }
        @keyframes msc-nouveau-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,.4)}50%{box-shadow:0 0 0 6px rgba(0,255,136,0)}
        }
      `}</style>

      <div style={{
        position: "relative",
        background: T.bgCard,
        border: signal.isVip ? "1px solid rgba(255,214,10,0.5)" : `1px solid ${T.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 10,
        padding: topBadge ? "28px 16px 16px" : "16px",
        animation: "msc-card-in 0.3s ease-out",
        boxShadow: signal.isVip ? "0 0 20px rgba(255,214,10,0.15)" : (isNew ? `0 0 20px ${accentGlow}` : "none"),
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {topBadge && (
          <div style={{
            position: "absolute", top: 0, left: 0,
            background: topBadge.bg, padding: "3px 12px", borderRadius: "0 0 8px 0",
            fontSize: 8, fontFamily: "JetBrains Mono, monospace", fontWeight: 800, color: topBadge.color,
            letterSpacing: "0.05em", zIndex: 5
          }}>
            {topBadge.label}
          </div>
        )}

        {/* ─── Row 1 : Pair + Badges + LIVE ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, letterSpacing: "0.06em",
            fontFamily: "JetBrains Mono, monospace",
            color: T.textPrimary,
          }}>{signal.pair}</span>
          <DirectionBadge direction={signal.direction} />
          {signal.isVip && <VIPBadge />}
          <div style={{ marginLeft: "auto" }}>
            <LiveDot color={accentColor} />
          </div>
        </div>

        {/* ─── Row 2 : Entry price (dominant) ─── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: (signal.entry_low && signal.entry_high) ? 26 : 42, fontWeight: 800, lineHeight: 1,
            fontFamily: "JetBrains Mono, monospace",
            color: T.textPrimary,
            letterSpacing: "-0.02em",
            textShadow: `0 0 30px ${accentColor}30`,
          }}>{signal.entry || (signal.entry_low && signal.entry_high 
            ? `${signal.entry_low} - ${signal.entry_high}` 
            : (signal.entry_low || signal.entry_high || "À DÉFINIR"))}</div>
          <div style={{
            fontSize: 10, fontWeight: 500, letterSpacing: "0.12em",
            color: T.textSecondary, marginTop: 4,
          }}>PRIX D'ENTRÉE</div>
        </div>

        {/* ─── Row 3 : SL / TP / R:R ─── */}
        <div style={{
          background: T.bgCardElevated,
          borderRadius: 6, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          {/* SL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
              color: T.textMuted,
            }}>SL</div>
            <div style={{
              fontSize: 15, fontWeight: 700,
              fontFamily: "JetBrains Mono, monospace",
              color: T.red,
            }}>{signal.sl || "—"}</div>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: 1, height: 20, background: T.border, alignSelf: "center" }} />

          {/* TPs Container */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", flex: 1 }}>
            {tpList.map((t, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
                  color: T.textMuted,
                }}>
                  {i === 0 ? "TP" : `TP${i + 1}`}
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                  color: i === 0 ? T.green : T.greenDim,
                }}>{t}</div>
              </div>
            ))}
          </div>

          {/* R:R Column */}
          <div style={{ width: 1, height: 20, background: T.border, alignSelf: "center" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 4 }}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
              color: T.textMuted,
            }}>R:R</div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              fontFamily: "JetBrains Mono, monospace",
              color: rr > 0 ? T.green : T.textSecondary,
            }}>{rr > 0 ? `${rr}:1` : "—"}</div>
          </div>
        </div>

        {/* ─── Timestamp ─── */}
        <div style={{
          marginTop: 8, textAlign: "right",
          fontSize: 10, color: T.textMuted,
          fontFamily: "JetBrains Mono, monospace",
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
        }}>
          <span style={{ fontSize: 9 }}>◷</span>
          {signal.time || "NOW"}
        </div>
      </div>
    </>
  );
}
