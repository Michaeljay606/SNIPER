import { useTradingMode } from "../../context/TradingModeContext";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  bgCardElevated: "#161616",
  border: "#1e1e1e",
  green: "#00ff88",
  greenGlow: "rgba(0,255,136,0.15)",
  textSecondary: "#6b7280",
};

/**
 * TradingModeSwitch — visible ONLY to Mentor (role = 'admin' | 'mentor').
 * The parent component is responsible for rendering this conditionally.
 *
 * @param {{ className?: string, style?: React.CSSProperties }} props
 */
export default function TradingModeSwitch({ className, style }) {
  const { tradingMode, setTradingMode, isLoading } = useTradingMode();

  const options = [
    { key: "MARKETS", label: "MARCHÉS" },
    { key: "BINARY",  label: "BINAIRES" },
  ];

  return (
    <>
      <style>{`
        @keyframes tms-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .tms-btn {
          transition: all 0.2s ease;
        }
        .tms-btn:hover:not(:disabled) {
          opacity: 0.85;
        }
      `}</style>

      <div
        className={className}
        style={{
          display: "inline-flex",
          background: T.bgCardElevated,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: 3,
          gap: 2,
          position: "relative",
          ...style,
        }}
      >
        {options.map(({ key, label }) => {
          const active = tradingMode === key;
          return (
            <button
              key={key}
              className="tms-btn"
              disabled={isLoading}
              onClick={() => setTradingMode(key)}
              style={{
                padding: "7px 16px",
                borderRadius: 6,
                border: "none",
                background: active ? T.green : "transparent",
                color: active ? "#000" : T.textSecondary,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                fontFamily: "JetBrains Mono, monospace",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading && !active ? 0.5 : 1,
                boxShadow: active ? `0 0 12px ${T.greenGlow}` : "none",
                transform: active ? "scale(1)" : "scale(0.97)",
              }}
            >
              {label}
            </button>
          );
        })}

        {/* Loading overlay spinner */}
        {isLoading && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10,10,10,0.4)",
            borderRadius: 8,
            backdropFilter: "blur(2px)",
          }}>
            <span style={{
              width: 12, height: 12,
              border: `2px solid ${T.green}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "tms-spin 0.7s linear infinite",
            }} />
          </div>
        )}
      </div>
    </>
  );
}
