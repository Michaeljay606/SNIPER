import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useTradingMode } from "../../context/TradingModeContext";

const T = {
  bg: "#0a0a0a", bgCard: "#111111", bgCardElevated: "#161616",
  border: "#1e1e1e", green: "#00ff88", red: "#ff3b5c",
  yellow: "#f5c842", textPrimary: "#ffffff",
  textSecondary: "#6b7280", textMuted: "#3d4045",
};

const BINARY_EXPIRATIONS = ["5s", "10s", "30s", "M1", "M2", "M5", "M15", "M30"];

const inputStyle = {
  width: "100%", background: T.bgCardElevated,
  border: `1px solid ${T.border}`, borderRadius: 8,
  padding: "10px 12px", fontSize: 13, fontWeight: 600,
  color: T.textPrimary, outline: "none",
  fontFamily: "JetBrains Mono, monospace", boxSizing: "border-box",
};

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function ToggleGroup({ options, value, onChange, accent }) {
  const color = accent || T.green;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(({ key, label }) => {
        const active = value === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${active ? color : T.border}`, background: active ? `${color}18` : "transparent", color: active ? color : T.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace", cursor: "pointer", transition: "all 0.15s" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleBtn({ active, onClick, activeColor, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: active ? `${activeColor}18` : T.bgCardElevated, border: `1px solid ${active ? activeColor + "60" : T.border}`, color: active ? activeColor : T.textMuted, borderRadius: 20, padding: "5px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
      {children}
    </button>
  );
}

function MarketsForm({ onSubmit, loading }) {
  const [f, setF] = useState({ pair: "", direction: "BUY", entry: "", sl: "", tp: [""], status: "LIVE", isVip: false });
  const s = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const entryN = parseFloat(f.entry) || 0, slN = parseFloat(f.sl) || 0, tp1N = parseFloat(f.tp[0]) || 0;
  const rr = entryN && slN && tp1N ? Math.round((Math.abs(tp1N - entryN) / Math.abs(entryN - slN)) * 10) / 10 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!f.pair) return alert("Paire manquante");
    if (!f.sl) return alert("Stop Loss obligatoire en mode MARCHÉS");
    if (!f.tp[0]) return alert("Au moins un Take Profit requis");
    onSubmit({ trading_mode: "MARKETS", mode: "forex", pair: f.pair.toUpperCase(), direction: f.direction, entry: f.entry || "MKT", sl: f.sl, tp: f.tp.filter(Boolean).join(", "), rr: rr.toString(), status: f.status.toLowerCase(), is_vip: f.isVip });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><FieldLabel>Type</FieldLabel><ToggleGroup options={[{ key: "LIVE", label: "LIVE" }, { key: "PENDING", label: "EN ATTENTE" }]} value={f.status} onChange={v => s("status", v)} /></div>
      <div><FieldLabel>Direction</FieldLabel><ToggleGroup options={[{ key: "BUY", label: "▲ BUY" }, { key: "SELL", label: "▼ SELL" }]} value={f.direction} onChange={v => s("direction", v)} accent={f.direction === "BUY" ? T.green : T.red} /></div>
      <div><FieldLabel>Paire</FieldLabel><input style={inputStyle} placeholder="ex: XAUUSD, EURUSD" value={f.pair} onChange={e => s("pair", e.target.value)} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><FieldLabel>Entrée</FieldLabel><input style={inputStyle} placeholder="MKT" value={f.entry} onChange={e => s("entry", e.target.value)} /></div>
        <div><FieldLabel>Stop Loss</FieldLabel><input style={{ ...inputStyle, color: T.red }} placeholder="—" value={f.sl} onChange={e => s("sl", e.target.value)} /></div>
      </div>
      <div>
        <FieldLabel>Take Profit(s)</FieldLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {f.tp.map((val, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input style={{ ...inputStyle, color: T.green, flex: 1 }} placeholder={`TP${i + 1}`} value={val} onChange={e => { const n = [...f.tp]; n[i] = e.target.value; s("tp", n); }} />
              {i > 0 && <button type="button" onClick={() => s("tp", f.tp.filter((_, idx) => idx !== i))} style={{ background: "rgba(255,59,92,0.1)", border: `1px solid ${T.red}40`, color: T.red, borderRadius: 6, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>×</button>}
            </div>
          ))}
          <button type="button" onClick={() => s("tp", [...f.tp, ""])} style={{ background: "rgba(0,255,136,0.06)", border: `1px dashed ${T.green}40`, color: T.green, borderRadius: 8, padding: "8px 0", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>+ Ajouter TP</button>
        </div>
      </div>
      <div><FieldLabel>R:R (calculé)</FieldLabel><div style={{ ...inputStyle, color: rr > 0 ? T.green : T.textMuted, background: T.bg, userSelect: "none" }}>{rr > 0 ? `${rr}:1` : "—"}</div></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <FieldLabel>Signal VIP</FieldLabel>
        <ToggleBtn active={f.isVip} onClick={() => s("isVip", !f.isVip)} activeColor="#d4a843">{f.isVip ? "VIP ✓" : "VIP"}</ToggleBtn>
      </div>
      <button type="submit" disabled={loading} style={{ marginTop: 4, padding: "14px 0", background: loading ? T.bgCardElevated : T.green, color: loading ? T.textMuted : "#000", border: "none", borderRadius: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 20px rgba(0,255,136,0.25)", transition: "all 0.2s" }}>
        {loading ? "DIFFUSION..." : "DIFFUSER SIGNAL →"}
      </button>
    </form>
  );
}

function BinaryForm({ onSubmit, loading }) {
  const [f, setF] = useState({ pair: "", direction: "CALL", expiration: "M5", payout: "85", entry: "MKT", isOtc: false, status: "LIVE", isVip: false });
  const s = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!f.pair) return alert("Actif manquant");
    onSubmit({ trading_mode: "BINARY", mode: "binary", pair: f.pair.toUpperCase(), asset: f.pair.toUpperCase(), direction: f.direction, expiration: f.expiration, payout_pct: Number(f.payout) || 85, entry: f.entry || "MKT", is_otc: f.isOtc, status: f.status.toLowerCase(), is_vip: f.isVip });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><FieldLabel>Type</FieldLabel><ToggleGroup options={[{ key: "LIVE", label: "LIVE" }, { key: "PENDING", label: "EN ATTENTE" }]} value={f.status} onChange={v => s("status", v)} /></div>
      <div><FieldLabel>Direction</FieldLabel><ToggleGroup options={[{ key: "CALL", label: "▲ CALL" }, { key: "PUT", label: "▼ PUT" }]} value={f.direction} onChange={v => s("direction", v)} accent={f.direction === "CALL" ? T.green : T.red} /></div>
      <div><FieldLabel>Actif / Paire</FieldLabel><input style={inputStyle} placeholder="ex: EURUSD OTC, BTCUSD" value={f.pair} onChange={e => s("pair", e.target.value)} /></div>
      <div>
        <FieldLabel>Expiration</FieldLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {BINARY_EXPIRATIONS.map(exp => {
            const active = f.expiration === exp;
            return <button key={exp} type="button" onClick={() => s("expiration", exp)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? T.yellow + "70" : T.border}`, background: active ? "rgba(245,200,66,0.1)" : "transparent", color: active ? T.yellow : T.textMuted, fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{exp}</button>;
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><FieldLabel>Payout %</FieldLabel><input style={{ ...inputStyle, color: T.green }} placeholder="85" type="number" min="1" max="200" value={f.payout} onChange={e => s("payout", e.target.value)} /></div>
        <div><FieldLabel>Entrée</FieldLabel><input style={inputStyle} placeholder="MKT" value={f.entry} onChange={e => s("entry", e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <FieldLabel>OTC</FieldLabel>
        <ToggleBtn active={f.isOtc} onClick={() => s("isOtc", !f.isOtc)} activeColor="#4da6ff">{f.isOtc ? "OTC ✓" : "OTC"}</ToggleBtn>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <FieldLabel>Signal VIP</FieldLabel>
        <ToggleBtn active={f.isVip} onClick={() => s("isVip", !f.isVip)} activeColor="#d4a843">{f.isVip ? "VIP ✓" : "VIP"}</ToggleBtn>
      </div>
      <button type="submit" disabled={loading} style={{ marginTop: 4, padding: "14px 0", background: loading ? T.bgCardElevated : T.yellow, color: loading ? T.textMuted : "#000", border: "none", borderRadius: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 20px rgba(245,200,66,0.2)", transition: "all 0.2s" }}>
        {loading ? "DIFFUSION..." : "DIFFUSER OPTION →"}
      </button>
    </form>
  );
}

/**
 * Admin-only form. Adapts its fields dynamically based on TradingModeContext.
 * @param {{ tenantId: string, onSuccess?: () => void, onShowToast?: Function }} props
 */
export default function CreateSignalForm({ tenantId, onSuccess, onShowToast }) {
  const { tradingMode } = useTradingMode();
  const [loading, setLoading] = useState(false);

  const toast = (msg, type = "success") => {
    if (onShowToast) onShowToast(msg, type);
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("signals").insert({ ...payload, tenant_id: tenantId });
      if (error) throw error;
      toast("Signal publié avec succès !", "success");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast(err.message || "Erreur lors de la publication", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace", marginBottom: 16 }}>
        NOUVEAU SIGNAL —{" "}
        <span style={{ color: tradingMode === "MARKETS" ? T.green : T.yellow }}>
          {tradingMode === "MARKETS" ? "MARCHÉS" : "BINAIRES"}
        </span>
      </div>
      {tradingMode === "MARKETS"
        ? <MarketsForm key="markets" onSubmit={handleSubmit} loading={loading} />
        : <BinaryForm  key="binary"  onSubmit={handleSubmit} loading={loading} />
      }
    </div>
  );
}
