import React from 'react';
import { useTranslation } from 'react-i18next';
import { PLAN_BADGE_CONFIG } from '../constants/plans';

export function PlanBadge({ plan }: { plan: 'free' | 'basic' | 'premium' | 'empire' | 'pause' | string }) {
  const { t } = useTranslation();
  const cfg = (PLAN_BADGE_CONFIG as any)[plan] ?? PLAN_BADGE_CONFIG.free;
  
  // Dynamically get the localized label from keys like plans.free_label
  const label = t(`plans.${plan}_label`, { defaultValue: cfg.label });

  return (
    <span style={{
      background:    cfg.bg,
      color:         cfg.text,
      fontSize:      '10px',
      fontWeight:    700,
      letterSpacing: '0.12em',
      padding:       '3px 10px',
      borderRadius:  '99px',
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '5px',
      fontFamily:    'Space Mono, monospace',
    }}>
      <span style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: cfg.dot,
        flexShrink: 0,
      }} />
      {label}
    </span>
  );
}
