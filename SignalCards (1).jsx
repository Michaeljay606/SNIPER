import { useState, useEffect } from "react";

// ─── DESIGN TOKENS (calqués sur l'existant EPHATA) ───────────────────────────
const tokens = {
  bg: "#0a0a0a",
  bgCard: "#111111",
  bgCardElevated: "#161616",
  border: "#1e1e1e",
  borderActive: "#00ff88",
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

// ─── STYLES GLOBAUX ───────────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${tokens.bg};
    font-family: 'Space Grotesk', sans-serif;
    color: ${tokens.textPrimary};
    min-height: 100vh;
    padding: 16px;
  }

  .mono { font-family: 'JetBrains Mono', monospace; }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes bar-fill {
    from { width: 0%; }
    to { width: var(--fill); }
  }
  @keyframes card-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes nouveau-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.4); }
    50% { box-shadow: 0 0 0 6px rgba(0,255,136,0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;

// ─── COMPOSANTS UTILITAIRES ───────────────────────────────────────────────────

function LiveDot({ color = tokens.green }) {
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
        animation: "pulse-dot 1.5s ease-in-out infinite",
        display: "inline-block",
      }} />
      LIVE
    </span>
  );
}

function DirectionBadge({ direction }) {
  const isBuy = direction === "BUY" || direction === "CALL";
  const isCall = direction === "CALL";
  const isPut = direction === "PUT";
  const color = isBuy ? tokens.green : tokens.red;
  const glow = isBuy ? tokens.greenGlow : tokens.redGlow;
  const arrow = isBuy ? "▲" : "▼";
  const label = direction;

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
      <span style={{ fontSize: 9 }}>{arrow}</span> {label}
    </span>
  );
}

function VIPBadge() {
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 4,
      background: `${tokens.vipGold}18`,
      border: `1px solid ${tokens.vipGold}60`,
      color: tokens.vipGold,
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
      background: tokens.green,
      color: "#000",
      fontSize: 10, fontWeight: 800,
      letterSpacing: "0.1em",
      fontFamily: "JetBrains Mono, monospace",
      animation: "nouveau-pulse 2s ease-in-out infinite",
      position: "absolute", top: 0, left: 0,
    }}>NOUVEAU</span>
  );
}

// ─── MARKET SIGNAL CARD (Forex / Crypto / Indices) ───────────────────────────
function MarketSignalCard({ signal, isNew = false }) {
  const isBuy = signal.direction === "BUY";
  const accentColor = isBuy ? tokens.green : tokens.red;
  const accentGlow = isBuy ? tokens.greenGlow : tokens.redGlow;

  return (
    <div style={{
      position: "relative",
      background: tokens.bgCard,
      border: `1px solid ${tokens.border}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 10,
      padding: isNew ? "28px 16px 16px" : "16px",
      animation: "card-in 0.3s ease-out",
      boxShadow: isNew ? `0 0 20px ${accentGlow}` : "none",
      overflow: "hidden",
    }}>
      {isNew && <NouveauBadge />}

      {/* Ligne 1 : Paire + Badges + LIVE */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          fontSize: 15, fontWeight: 700, letterSpacing: "0.06em",
          fontFamily: "JetBrains Mono, monospace",
          color: tokens.textPrimary,
        }}>{signal.pair}</span>
        <DirectionBadge direction={signal.direction} />
        {signal.isVip && <VIPBadge />}
        <div style={{ marginLeft: "auto" }}>
          <LiveDot color={accentColor} />
        </div>
      </div>

      {/* Ligne 2 : Prix d'entrée (dominant) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 42, fontWeight: 800, lineHeight: 1,
          fontFamily: "JetBrains Mono, monospace",
          color: tokens.textPrimary,
          letterSpacing: "-0.02em",
          textShadow: `0 0 30px ${accentColor}30`,
        }}>{signal.entry}</div>
        <div style={{
          fontSize: 10, fontWeight: 500, letterSpacing: "0.12em",
          color: tokens.textSecondary, marginTop: 4,
        }}>PRIX D'ENTRÉE</div>
      </div>

      {/* Ligne 3 : SL / TP avec barre visuelle */}
      <div style={{
        background: tokens.bgCardElevated,
        borderRadius: 6, padding: "10px 12px",
        display: "flex", alignItems: "flex-start", gap: 0,
      }}>
        {/* SL */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
            color: tokens.textMuted, marginBottom: 4,
          }}>STOP LOSS</div>
          <div style={{
            fontSize: 16, fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
            color: tokens.red,
          }}>{signal.sl || "—"}</div>
        </div>

        {/* Séparateur + R:R */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "0 16px",
          borderLeft: `1px solid ${tokens.border}`,
          borderRight: `1px solid ${tokens.border}`,
          marginRight: 0,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
            color: tokens.textMuted, marginBottom: 4,
          }}>R:R</div>
          <div style={{
            fontSize: 14, fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
            color: signal.rr > 0 ? tokens.green : tokens.textSecondary,
          }}>{signal.rr > 0 ? `${signal.rr}:1` : "—"}</div>
        </div>

        {/* TP(s) */}
        <div style={{ flex: 1, paddingLeft: 16 }}>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
            color: tokens.textMuted, marginBottom: 4,
          }}>TAKE PROFIT</div>
          {signal.tp.map((t, i) => (
            <div key={i} style={{
              fontSize: i === 0 ? 16 : 13, fontWeight: i === 0 ? 700 : 500,
              fontFamily: "JetBrains Mono, monospace",
              color: i === 0 ? tokens.green : tokens.greenDim,
              opacity: i === 0 ? 1 : 0.7,
            }}>TP{i + 1} {t}</div>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <div style={{
        marginTop: 8, textAlign: "right",
        fontSize: 10, color: tokens.textMuted,
        fontFamily: "JetBrains Mono, monospace",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
      }}>
        <span style={{ fontSize: 9 }}>◷</span>
        {signal.time}
      </div>
    </div>
  );
}

// ─── BINARY SIGNAL CARD ───────────────────────────────────────────────────────
function BinarySignalCard({ signal, isNew = false }) {
  const isCall = signal.direction === "CALL";
  const accentColor = isCall ? tokens.green : tokens.red;
  const accentGlow = isCall ? tokens.greenGlowStrong : tokens.redGlow;
  const [progress, setProgress] = useState(signal.progressInit || 85);

  useEffect(() => {
    if (!signal.isLive) return;
    const interval = setInterval(() => {
      setProgress(p => Math.max(0, p - 0.5));
    }, 300);
    return () => clearInterval(interval);
  }, [signal.isLive]);

  const progressColor = progress > 50 ? tokens.green : progress > 25 ? tokens.yellow : tokens.red;

  return (
    <div style={{
      position: "relative",
      background: tokens.bgCard,
      border: `1px solid ${tokens.border}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 10,
      padding: isNew ? "28px 16px 16px" : "16px",
      animation: "card-in 0.3s ease-out",
      boxShadow: isNew ? `0 0 24px ${accentGlow}` : "none",
      overflow: "hidden",
    }}>
      {isNew && <NouveauBadge />}

      {/* Ligne 1 : Direction dominante + Paire + LIVE */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {/* Direction — élément dominant */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}50`,
          borderRadius: 6, padding: "6px 14px",
        }}>
          <span style={{
            fontSize: 22, fontWeight: 900,
            fontFamily: "JetBrains Mono, monospace",
            color: accentColor,
            letterSpacing: "0.04em",
            textShadow: `0 0 12px ${accentColor}`,
          }}>{isCall ? "▲" : "▼"}</span>
          <span style={{
            fontSize: 18, fontWeight: 800,
            fontFamily: "JetBrains Mono, monospace",
            color: accentColor,
            letterSpacing: "0.08em",
          }}>{signal.direction}</span>
        </div>

        {/* Paire */}
        <div>
          <div style={{
            fontSize: 14, fontWeight: 700, letterSpacing: "0.06em",
            fontFamily: "JetBrains Mono, monospace",
            color: tokens.textPrimary,
          }}>{signal.pair}</div>
          {signal.isOtc && (
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
              color: tokens.textMuted,
            }}>OTC</div>
          )}
        </div>

        <div style={{ marginLeft: "auto" }}>
          <LiveDot color={accentColor} />
        </div>
      </div>

      {/* Ligne 2 : 3 métriques clés */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
        gap: 0, background: tokens.bgCardElevated,
        borderRadius: 6, padding: "12px 0", marginBottom: 12,
      }}>
        {/* Expiration */}
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          <div style={{
            fontSize: 24, fontWeight: 800,
            fontFamily: "JetBrains Mono, monospace",
            color: tokens.yellow,
            lineHeight: 1,
          }}>{signal.expiration}</div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
            color: tokens.textMuted, marginTop: 4,
          }}>EXPIRATION</div>
        </div>

        {/* Divider */}
        <div style={{ background: tokens.border }} />

        {/* Payout */}
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          <div style={{
            fontSize: 24, fontWeight: 800,
            fontFamily: "JetBrains Mono, monospace",
            color: tokens.green, lineHeight: 1,
          }}>{signal.payout}%</div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
            color: tokens.textMuted, marginTop: 4,
          }}>PAYOUT</div>
        </div>

        {/* Divider */}
        <div style={{ background: tokens.border }} />

        {/* Entrée */}
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          <div style={{
            fontSize: 24, fontWeight: 800,
            fontFamily: "JetBrains Mono, monospace",
            color: tokens.textPrimary, lineHeight: 1,
          }}>{signal.entry}</div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
            color: tokens.textMuted, marginTop: 4,
          }}>ENTRÉE</div>
        </div>
      </div>

      {/* Barre de progression temps */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          height: 4, background: tokens.border,
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

      {/* Gain potentiel + timestamp */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          fontFamily: "JetBrains Mono, monospace",
          color: tokens.green,
        }}>
          Gain potentiel : <span style={{ fontWeight: 800 }}>+{signal.payout}%</span>
        </div>
        <div style={{
          fontSize: 10, color: tokens.textMuted,
          fontFamily: "JetBrains Mono, monospace",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 9 }}>◷</span>
          {signal.time}
        </div>
      </div>
    </div>
  );
}

// ─── TRADING MODE SWITCH ──────────────────────────────────────────────────────
function TradingModeSwitch({ mode, onChange }) {
  return (
    <div style={{
      display: "inline-flex",
      background: tokens.bgCardElevated,
      border: `1px solid ${tokens.border}`,
      borderRadius: 8, padding: 3, gap: 2,
    }}>
      {["MARCHÉS", "BINAIRES"].map((m) => {
        const active = (m === "MARCHÉS" ? "MARKETS" : "BINARY") === mode;
        return (
          <button
            key={m}
            onClick={() => onChange(m === "MARCHÉS" ? "MARKETS" : "BINARY")}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "none",
              background: active ? tokens.green : "transparent",
              color: active ? "#000" : tokens.textSecondary,
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em",
              fontFamily: "JetBrains Mono, monospace",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: active ? `0 0 12px ${tokens.greenGlow}` : "none",
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("MARKETS");

  const marketSignals = [
    {
      pair: "XAUUSD", direction: "BUY", entry: "2344",
      sl: "2322", tp: ["2454", "2565"], rr: 2,
      isVip: true, time: "NOW",
    },
    {
      pair: "XAUUSD", direction: "BUY", entry: "2345",
      sl: "0", tp: ["Soyez prêt"], rr: 0,
      isVip: false, time: "NOW",
    },
    {
      pair: "EURUSD", direction: "SELL", entry: "1.0842",
      sl: "1.0870", tp: ["1.0810", "1.0780"], rr: 3,
      isVip: true, time: "14:22",
    },
  ];

  const binarySignals = [
    {
      pair: "EURUSD", direction: "PUT", expiration: "M5",
      payout: 85, entry: "MKT", isOtc: true,
      isLive: true, progressInit: 72, time: "NOW",
    },
    {
      pair: "GBPUSD", direction: "CALL", expiration: "M1",
      payout: 92, entry: "MKT", isOtc: false,
      isLive: true, progressInit: 45, time: "22:41",
    },
  ];

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 20,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.14em",
              color: tokens.textSecondary, marginBottom: 2,
              fontFamily: "JetBrains Mono, monospace",
            }}>EPHATA TERMINAL</div>
            <div style={{
              fontSize: 20, fontWeight: 800, letterSpacing: "0.04em",
            }}>TEST NAME</div>
          </div>
          <TradingModeSwitch mode={mode} onChange={setMode} />
        </div>

        {/* Section header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 12,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 3, height: 14, background: tokens.green,
              borderRadius: 2, boxShadow: `0 0 6px ${tokens.green}`,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
              color: tokens.textSecondary,
              fontFamily: "JetBrains Mono, monospace",
            }}>SIGNAUX EN TEMPS RÉEL</span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            color: tokens.textPrimary,
            fontFamily: "JetBrains Mono, monospace",
          }}>
            {mode === "MARKETS" ? marketSignals.length : binarySignals.length} ACTIF{(mode === "MARKETS" ? marketSignals.length : binarySignals.length) > 1 ? "S" : ""}
          </span>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "MARKETS"
            ? marketSignals.map((s, i) => (
              <MarketSignalCard key={i} signal={s} isNew={i === 0} />
            ))
            : binarySignals.map((s, i) => (
              <BinarySignalCard key={i} signal={s} isNew={i === 0} />
            ))
          }
        </div>

        {/* Note architecturale */}
        <div style={{
          marginTop: 24, padding: "12px 14px",
          background: `${tokens.blue}10`,
          border: `1px solid ${tokens.blue}30`,
          borderRadius: 8,
          fontSize: 11, color: tokens.blue,
          fontFamily: "JetBrains Mono, monospace",
          lineHeight: 1.6,
        }}>
          ℹ️ Le switch MARCHÉS/BINAIRES est ici en démo UI.<br />
          En prod → géré via <strong>tenant_config.trading_mode</strong> dans Supabase, Admin-only.
        </div>
      </div>
    </>
  );
}
