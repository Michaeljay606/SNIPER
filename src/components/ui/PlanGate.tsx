import React from 'react';
import { Lock, ArrowUpRight, Zap, AlertTriangle } from 'lucide-react';

// ── PlanGate ─────────────────────────────────────────────────────────────────
// Shows a locked-feature card with upgrade CTA.
interface PlanGateProps {
  feature: string;
  description?: string;
  requiredPlan?: string;
}

export const PlanGate = ({ feature, description, requiredPlan = 'Basic' }: PlanGateProps) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
    gap: 16, background: 'rgba(255,214,10,0.03)',
    border: '1px dashed rgba(255,214,10,0.2)', borderRadius: 16, margin: '12px 0',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Lock size={22} color="#FFD60A" />
    </div>
    <div>
      <p style={{
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800,
        color: 'var(--text)', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 6,
      }}>
        {feature}
      </p>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
        {description ?? `Cette fonctionnalité nécessite le plan ${requiredPlan} ou supérieur.`}
      </p>
    </div>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 20,
      background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.3)',
    }}>
      <Zap size={12} color="#FFD60A" />
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
        color: '#FFD60A', textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        Plan {requiredPlan} requis
      </span>
    </div>
    <a
      href={window.location.origin}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 10, textDecoration: 'none',
        background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.2)',
      }}
    >
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
        color: '#FFD60A', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Mettre à niveau
      </span>
      <ArrowUpRight size={12} color="#FFD60A" />
    </a>
  </div>
);

// ── PausedGate ────────────────────────────────────────────────────────────────
// Full-panel block shown when plan === 'pause'.
interface PausedGateProps {
  message?: string;
}

export const PausedGate = ({ message }: PausedGateProps) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '72px 24px', textAlign: 'center',
    gap: 20, minHeight: '50vh',
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 14,
      background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <AlertTriangle size={26} color="#FF3B30" />
    </div>
    <div>
      <p style={{
        fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 800,
        color: 'var(--text)', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 10,
      }}>
        Plan PAUSE — $19/mois
      </p>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 300, margin: '0 auto' }}>
        {message ?? 'Admin en lecture seule. Vos membres gardent l\'accès au contenu existant. Aucun nouveau signal, membre ou modification possible. Réactivation instantanée.'}
      </p>
    </div>
    <a
      href={window.location.origin}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
        background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.3)',
      }}
    >
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
        color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        Contacter le support
      </span>
      <ArrowUpRight size={13} color="#FF3B30" />
    </a>
  </div>
);

// ── QuotaBanner ───────────────────────────────────────────────────────────────
// Progress bar showing how much of a quota is consumed.
interface QuotaBannerProps {
  used: number;
  max: number;
  label: string;
  upgradeHint?: string;
}

export const QuotaBanner = ({ used, max, label, upgradeHint }: QuotaBannerProps) => {
  if (max === Infinity) return null;
  const pct = Math.min(100, Math.round((used / max) * 100));
  const isAtLimit  = used >= max;
  const isNearLimit = pct >= 80;
  const color = isAtLimit ? '#FF3B30' : isNearLimit ? '#FFD60A' : '#00FF41';

  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, marginBottom: 12,
      background: `${color}08`, border: `1px solid ${color}22`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
          color, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
          {used} / {max}
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 2, transition: 'width 0.3s',
        }} />
      </div>
      {isAtLimit && upgradeHint && (
        <span style={{ fontSize: 10, color: '#FF3B30', fontWeight: 600 }}>
          {upgradeHint}
        </span>
      )}
    </div>
  );
};
