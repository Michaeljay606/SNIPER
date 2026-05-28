import { useState, useEffect } from "react";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
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
  redGlow: "rgba(255,59,92,0.15)",
  yellow: "#f5c842",
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
        animation: "bsc-pulse-dot 1.5s ease-in-out infinite",
        display: "inline-block",
      }} />
      LIVE
    </span>
  );
}

function NouveauBadge() {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "4px 0 4px 0",
      background: T.green, color: "#000",
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      fontFamily: "JetBrains Mono, monospace",
      animation: "bsc-nouveau-pulse 2s ease-in-out infinite",
      position: "absolute", top: 0, left: 0,
    }}>NOUVEAU</span>
  );
}

// ─── BINARY SIGNAL CARD ────────────────────────────────────────────────────────

/**
 * @param {{ signal: {
 *   id: string, pair: string, direction: 'CALL'|'PUT', expiration: string,
 *   payout: number, entry: string, isOtc: boolean, isNew: boolean, isLive: boolean,
 *   progressInit: number, time: string, status: 'LIVE'|'CLOSED'|'PENDING'
 * }}} props
 */
export default function BinarySignalCard({ signal }) {
  const [binaryTerminology, setBinaryTerminology] = useState(() => {
    return localStorage.getItem("binary_terminology") || "callput";
  });

  useEffect(() => {
    const handleStorage = () => {
      setBinaryTerminology(localStorage.getItem("binary_terminology") || "callput");
    };
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const isCall = signal.direction === "CALL";
  const dirArrow = isCall ? "▲" : "▼";
  const dirText = binaryTerminology === "callput"
    ? (isCall ? "CALL" : "PUT")
    : (isCall ? "UP" : "DOWN");

  const accentColor  = isCall ? T.green : T.red;
  const accentGlow   = isCall ? T.greenGlowStrong : T.redGlow;
  const isNew = signal.isNew ?? false;

  // Normalize payout — DB stores it as payout_pct
  const payout = Number(signal.payout ?? signal.payout_pct) || 0;

  const [progress, setProgress] = useState(signal.progressInit ?? 85);

  // Animate progress bar downward if live
  useEffect(() => {
    if (!signal.isLive) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.max(0, p - 0.5));
    }, 300);
    return () => clearInterval(interval);
  }, [signal.isLive]);

  const progressColor =
    progress > 50 ? T.green : progress > 25 ? T.yellow : T.red;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes bsc-pulse-dot {
          0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}
        }
        @keyframes bsc-card-in {
          from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}
        }
        @keyframes bsc-nouveau-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,.4)}50%{box-shadow:0 0 0 6px rgba(0,255,136,0)}
        }
      `}</style>

      <div style={{
        position: "relative",
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 10,
        padding: isNew ? "28px 16px 16px" : "16px",
        animation: "bsc-card-in 0.3s ease-out",
        boxShadow: isNew ? `0 0 24px ${accentGlow}` : "none",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {isNew && <NouveauBadge />}

        {/* ─── Row 1 : Direction (dominant) + Pair + LIVE ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>

          {/* Direction block — most important element visually */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: `${accentColor}12`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 5, padding: "4px 10px",
          }}>
            <span style={{
              fontSize: 18, fontWeight: 900,
              fontFamily: "JetBrains Mono, monospace",
              color: accentColor, letterSpacing: "0.04em",
              textShadow: `0 0 8px ${accentColor}`,
            }}>{dirArrow}</span>
            <span style={{
              fontSize: 14, fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: accentColor, letterSpacing: "0.06em",
            }}>{dirText}</span>
          </div>

          {/* Pair + OTC */}
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: "0.06em",
              fontFamily: "JetBrains Mono, monospace",
              color: T.textPrimary,
            }}>{signal.pair}</div>
            {signal.isOtc && (
              <div style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
                color: T.textMuted,
              }}>OTC</div>
            )}
          </div>

          <div style={{ marginLeft: "auto" }}>
            <LiveDot color={accentColor} />
          </div>
        </div>

        {/* ─── Row 2 : 3-column metrics ─── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
          background: T.bgCardElevated,
          borderRadius: 6, padding: "12px 0", marginBottom: 12,
        }}>
          {/* Expiration */}
          <div style={{ textAlign: "center", padding: "0 12px" }}>
            <div style={{
              fontSize: 24, fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: T.yellow, lineHeight: 1,
            }}>{signal.expiration || "M5"}</div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
              color: T.textMuted, marginTop: 4,
            }}>EXPIRATION</div>
          </div>

          <div style={{ background: T.border }} />

          {/* Payout */}
          <div style={{ textAlign: "center", padding: "0 12px" }}>
            <div style={{
              fontSize: 24, fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: T.green, lineHeight: 1,
            }}>{payout}%</div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
              color: T.textMuted, marginTop: 4,
            }}>PAYOUT</div>
          </div>

          <div style={{ background: T.border }} />

          {/* Entry */}
          <div style={{ textAlign: "center", padding: "0 12px" }}>
            <div style={{
              fontSize: 24, fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: T.textPrimary, lineHeight: 1,
            }}>{signal.entry || "MKT"}</div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
              color: T.textMuted, marginTop: 4,
            }}>ENTRÉE</div>
          </div>
        </div>

        {/* ─── Progress bar (time remaining) ─── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{
            height: 4, background: T.border,
            borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${progressColor}88, ${progressColor})`,
              borderRadius: 2,
              transition: "width 0.3s ease, background 0.5s ease",
              boxShadow: `0 0 8px ${progressColor}`,
            }} />
          </div>
        </div>

        {/* ─── Analysis Note ─── */}
        {signal.analysis_note && (
          <div style={{ marginTop: 10, marginBottom: 12 }}>
            <p style={{
              fontFamily: "var(--sans), sans-serif", fontSize: 11,
              color: "rgba(255,255,255,0.7)", fontStyle: "italic",
              margin: 0, padding: "8px 12px",
              background: "rgba(255,255,255,0.02)", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.05)",
              lineHeight: 1.4,
            }}>
              💬 "{signal.analysis_note}"
            </p>
          </div>
        )}

        {/* ─── Footer : gain potentiel + timestamp ─── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            fontFamily: "JetBrains Mono, monospace",
            color: T.green,
          }}>
            Gain potentiel : <span style={{ fontWeight: 800 }}>+{payout}%</span>
          </div>
          <div style={{
            fontSize: 10, color: T.textMuted,
            fontFamily: "JetBrains Mono, monospace",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 9 }}>◷</span>
            {signal.time || "NOW"}
          </div>
        </div>
      </div>
    </>
  );
}
