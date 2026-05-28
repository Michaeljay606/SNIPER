import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
export type RequiredPlan = 'free' | 'basic' | 'premium' | 'empire';

export interface LockedFeatureProps {
  requiredPlan: RequiredPlan;
  currentPlan: string;
  featureName: string;
  description?: string;
  children?: ReactNode;
  mode?: 'blur' | 'overlay' | 'replace';
  onUpgrade: () => void;
}

const ORDER: Record<string, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  empire: 3,
  pause: -1,
};

const PLAN_GLOW: Record<RequiredPlan, string> = {
  free: 'rgba(0,255,65,0.25)',
  basic: 'rgba(59,130,246,0.35)',
  premium: 'rgba(139,92,246,0.35)',
  empire: 'rgba(255,214,10,0.4)',
};

export function planBadgeBg(plan: string): string {
  if (plan === 'basic') return 'rgba(59,130,246,0.12)';
  if (plan === 'premium') return 'rgba(139,92,246,0.12)';
  if (plan === 'empire') return 'rgba(255,214,10,0.12)';
  return 'rgba(255,255,255,0.06)';
}

export function planBadgeBorder(plan: string): string {
  if (plan === 'basic') return '1px solid rgba(59,130,246,0.35)';
  if (plan === 'premium') return '1px solid rgba(139,92,246,0.35)';
  if (plan === 'empire') return '1px solid rgba(255,214,10,0.35)';
  return '1px solid rgba(255,255,255,0.12)';
}

export function planBadgeColor(plan: string): string {
  if (plan === 'basic') return '#60A5FA';
  if (plan === 'premium') return '#A78BFA';
  if (plan === 'empire') return '#FFD60A';
  return 'rgba(255,255,255,0.55)';
}

function LockShell({
  requiredPlan,
  featureName,
  description,
  onUpgrade,
}: Pick<LockedFeatureProps, 'requiredPlan' | 'featureName' | 'description' | 'onUpgrade'>) {
  const { t } = useTranslation();
  const planColor = planBadgeColor(requiredPlan);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Compact premium lock icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${planColor}10 0%, ${planColor}02 100%)`,
          border: `1.5px solid ${planColor}`,
          boxShadow: `0 0 16px ${planColor}44, inset 0 0 12px ${planColor}12`,
          position: 'relative',
          animation: 'lockPulse 3s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes lockPulse {
            0%, 100% { box-shadow: 0 0 16px ${planColor}44, inset 0 0 12px ${planColor}12; }
            50% { box-shadow: 0 0 20px ${planColor}66, inset 0 0 16px ${planColor}1a; }
          }
        `}</style>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={planColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 6px ${planColor}77)`,
          }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      {/* Feature Name - Compact */}
      <div
        style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 10,
          fontWeight: 800,
          color: planColor,
          letterSpacing: '0.15em',
          textAlign: 'center',
          textTransform: 'uppercase',
          textShadow: `0 0 10px ${planColor}2a`,
          lineHeight: 1.1,
        }}
      >
        {featureName}
      </div>

      {/* Description - Compact */}
      {description && (
        <div
          style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 260,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
          }}
        >
          {description}
        </div>
      )}

      {/* Compact Button */}
      <button
        type="button"
        onClick={onUpgrade}
        style={{
          marginTop: 6,
          padding: '8px 20px',
          borderRadius: 99,
          background: `linear-gradient(135deg, ${planColor}18 0%, ${planColor}06 100%)`,
          border: `1.5px solid ${planColor}`,
          color: planColor,
          fontFamily: 'Space Mono, monospace',
          fontSize: 8,
          fontWeight: 800,
          cursor: 'pointer',
          letterSpacing: '0.09em',
          boxShadow: `0 4px 12px ${planColor}1a, inset 0 1px 0 ${planColor}2a`,
          textTransform: 'uppercase',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `linear-gradient(135deg, ${planColor}28 0%, ${planColor}10 100%)`;
          e.currentTarget.style.boxShadow = `0 6px 18px ${planColor}32, inset 0 1px 0 ${planColor}44`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = `linear-gradient(135deg, ${planColor}18 0%, ${planColor}06 100%)`;
          e.currentTarget.style.boxShadow = `0 4px 12px ${planColor}1a, inset 0 1px 0 ${planColor}2a`;
          e.currentTarget.style.transform = 'none';
        }}
      >
        {t('locked_feature.unlock_cta')}
      </button>
    </div>
  );
}

export default function LockedFeature({
  requiredPlan,
  currentPlan,
  featureName,
  description,
  children,
  mode = 'overlay',
  onUpgrade,
}: LockedFeatureProps) {
  const isLocked = (ORDER[currentPlan] ?? 0) < (ORDER[requiredPlan] ?? 0);

  if (!isLocked) {
    return <>{children}</>;
  }

  let renderMode = mode;
  if (!children && renderMode === 'overlay') {
    renderMode = 'replace';
  }

  const planColor = planBadgeColor(requiredPlan);

  if (renderMode === 'replace') {
    return (
      <div
        style={{
          background: `linear-gradient(135deg, ${planColor}06 0%, rgba(8, 11, 20, 0.95) 60%, rgba(15, 20, 35, 0.92) 100%)`,
          border: `1px solid ${planColor}28`,
          borderRadius: 14,
          padding: '22px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: `0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 ${planColor}12, 0 0 20px ${planColor}0a`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background shimmer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${planColor}06 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <LockShell
            requiredPlan={requiredPlan}
            featureName={featureName}
            description={description}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>
    );
  }

  // blur or overlay mode
  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden' }}>
      <div
        style={{
          filter: renderMode === 'blur' ? 'blur(6px)' : 'none',
          opacity: renderMode === 'blur' ? 0.2 : 0.38,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 18,
          zIndex: 10,
          background: `linear-gradient(135deg, ${planColor}06 0%, rgba(8, 11, 20, 0.86) 50%, rgba(15, 20, 35, 0.82) 100%)`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${planColor}28`,
          borderRadius: 14,
          boxSizing: 'border-box',
          boxShadow: `inset 0 0 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${planColor}12`,
        }}
      >
        {/* Subtle gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${planColor}04 0%, transparent 70%)`,
            pointerEvents: 'none',
            borderRadius: 14,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <LockShell
            requiredPlan={requiredPlan}
            featureName={featureName}
            description={description}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>
    </div>
  );
}

/** Small inline lock chip for option grids */
export function LockedOptionChip({
  label,
  requiredPlan,
  onUpgrade,
}: {
  label: string;
  requiredPlan: RequiredPlan;
  onUpgrade: () => void;
  key?: any;
}) {
  const { t } = useTranslation();
  const planColor = planBadgeColor(requiredPlan);
  const planBg = planBadgeBg(requiredPlan);

  return (
    <button
      type="button"
      onClick={onUpgrade}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        padding: '12px 8px',
        borderRadius: 12,
        border: `1px solid ${planColor}35`,
        background: `linear-gradient(135deg, ${planBg} 0%, rgba(8,11,20,0.5) 100%)`,
        cursor: 'pointer',
        opacity: 0.85,
        width: '100%',
        minHeight: 86,
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: `inset 0 1px 0 ${planColor}1a, 0 2px 8px rgba(0,0,0,0.15)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
        e.currentTarget.style.boxShadow = `inset 0 1px 0 ${planColor}25, 0 4px 14px ${planColor}1a`;
        e.currentTarget.style.borderColor = planColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.85';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = `inset 0 1px 0 ${planColor}1a, 0 2px 8px rgba(0,0,0,0.15)`;
        e.currentTarget.style.borderColor = `${planColor}35`;
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={planColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ 
          opacity: 0.8,
          filter: `drop-shadow(0 0 3px ${planColor}33)`,
        }}
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span
        style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 7,
          fontWeight: 800,
          color: planColor,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textShadow: `0 0 3px ${planColor}2a`,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.04em' }}>
        {t('locked_feature.required', { plan: requiredPlan.toUpperCase() })}
      </span>
    </button>
  );
}
