import React from 'react';
import { useTranslation } from 'react-i18next';
import { PLAN_COLORS } from '../constants/plans';
import { PlanBadge } from './PlanBadge';

type PlanType = 'free' | 'basic' | 'premium' | 'empire' | 'pause';

interface PlanCardProps {
  key?: React.Key;
  plan: PlanType;
  selected: boolean;
  onSelect: () => void;
  showCTA?: boolean;
  onCTA?: () => void;
}

export function PlanCard({ plan: planKey, selected, onSelect, showCTA = true, onCTA }: PlanCardProps) {
  const plan = planKey; // alias so existing JSX references compile
  const { t } = useTranslation();

  const PLAN_DATA = {
    free: {
      label:    'FREE',
      tagline:  t('plans.free.tagline'),
      price:    0,
      priceLabel: t('plans.free.price_label'),
      cta:      t('plans.free.cta'),
      priceWeight: 300,
      features: [
        { text: t('plans.free.feat_1'),    locked: false },
        { text: t('plans.free.feat_2'),   locked: false },
        { text: t('plans.free.feat_3'),        locked: false },
        { text: t('plans.free.feat_4'), locked: false },
        { text: t('plans.feat_branding'), locked: true, nextPlan: 'PREMIUM' },
        { text: t('plans.feat_elite'),  locked: true, nextPlan: 'PREMIUM' },
      ],
    },
    basic: {
      label:    'BASIC',
      tagline:  t('plans.basic.tagline'),
      price:    49,
      priceLabel: '49$',
      cta:      t('plans.basic.cta'),
      priceWeight: 300,
      features: [
        { text: t('plans.feat_unlimited_signals'), locked: false },
        { text: t('plans.feat_full_profile'),            locked: false },
        { text: t('plans.feat_academy_10'),       locked: false },
        { text: t('plans.feat_50_members'),                locked: false },
        { text: t('plans.feat_3_brokers'),        locked: false },
        { text: t('plans.feat_branding'), locked: true, nextPlan: 'PREMIUM' },
        { text: t('plans.feat_elite'),      locked: true, nextPlan: 'PREMIUM' },
        { text: t('plans.feat_analytics'),       locked: true, nextPlan: 'PREMIUM' },
        { text: t('plans.feat_no_badge'),       locked: true, nextPlan: 'PREMIUM' },
      ],
    },
    premium: {
      label:    'PREMIUM',
      tagline:  t('plans.premium.tagline'),
      price:    99,
      priceLabel: '99$',
      cta:      t('plans.premium.cta'),
      priceWeight: 300,
      recommended: true,
      features: [
        { text: t('plans.feat_all_basic'),             locked: false },
        { text: t('plans.feat_unlimited_academy'),         locked: false },
        { text: t('plans.feat_200_members'),               locked: false },
        { text: t('plans.feat_no_badge'),       locked: false },
        { text: t('plans.feat_theme'),     locked: false },
        { text: t('plans.feat_elite'),      locked: false },
        { text: t('plans.feat_analytics'),  locked: false },
        { text: t('plans.feat_5_brokers'),        locked: false },
        { text: t('plans.feat_watcher'),        locked: true, nextPlan: 'EMPIRE' },
        { text: t('plans.feat_white_label'),         locked: true, nextPlan: 'EMPIRE' },
      ],
    },
    empire: {
      label:    'EMPIRE',
      tagline:  t('plans.empire.tagline'),
      price:    199,
      priceLabel: '199$',
      cta:      t('plans.empire.cta'),
      priceWeight: 200,
      features: [
        { text: t('plans.feat_all_premium'),           locked: false },
        { text: t('plans.feat_unlimited_members'),         locked: false },
        { text: t('plans.feat_watcher'),        locked: false, suffix: t('plans.coming_soon') },
        { text: t('plans.feat_white_label'),         locked: false },
        { text: t('plans.feat_analytics_csv'),  locked: false },
        { text: t('plans.feat_priority_support'),   locked: false },
      ],
    },
    pause: {
      label:    'PAUSE',
      tagline:  t('plans.pause.tagline'),
      price:    0,
      priceLabel: 'PAUSE',
      cta:      t('plans.pause.cta'),
      priceWeight: 300,
      features: [
        { text: t('plans.pause.feat_1'),      locked: false },
        { text: t('plans.pause.feat_2'),      locked: false },
        { text: t('plans.pause.feat_3'),          locked: false },
      ],
    },
  };

  const data = (PLAN_DATA as any)[planKey] || PLAN_DATA.free;
  const colors = (PLAN_COLORS as any)[planKey] || PLAN_COLORS.free;

  return (
    <div
      onClick={onSelect}
      style={{
        background:    colors.bg,
        border:        `1px solid ${selected
          ? colors.color
          : colors.border}`,
        borderRadius:  '16px',
        boxShadow:     selected ? colors.glow : 'none',
        padding:       '20px',
        cursor:        'pointer',
        transition:    'all 0.25s ease',
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        // PAUSE: dashed border style when not selected
        ...(plan === 'pause' && {
          borderStyle: 'dashed',
          opacity: 0.85,
        }),
        // EMPIRE: subtle top light reflex
        ...(plan === 'empire' && {
          boxShadow: selected
            ? '0 0 40px rgba(226,232,240,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
            : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }),
      }}
    >

      {/* RECOMMENDED badge — PREMIUM only */}
      {data.recommended && (
        <div style={{
          position:      'absolute',
          top:           '-14px',
          left:          '50%',
          transform:     'translateX(-50%)',
          background:    'linear-gradient(135deg, #F59E0B, #D97706)',
          color:         '#0a0a0f',
          fontSize:      '9px',
          fontWeight:    800,
          letterSpacing: '0.15em',
          padding:       '5px 16px',
          borderRadius:  '99px',
          boxShadow:     '0 4px 12px rgba(245,158,11,0.4)',
          whiteSpace:    'nowrap',
          fontFamily:    'Space Mono, monospace',
          zIndex:        10,
        }}>
          {t('plans.recommended')}
        </div>
      )}

      {/* HEADER ROW */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        marginBottom:   '16px',
        marginTop:      data.recommended ? '8px' : '0',
      }}>
        <div>
          {/* Plan badge */}
          <PlanBadge plan={plan} />
          {/* Tagline */}
          <div style={{
            fontSize:    '11px',
            fontStyle:   'italic',
            color:       'rgba(255,255,255,0.35)',
            marginTop:   '8px',
            lineHeight:  1.4,
          }}>
            {data.tagline}
          </div>
        </div>

        {/* Price */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize:    '36px',
            fontWeight:  data.priceWeight,
            fontFamily:  'Space Mono, monospace',
            color:       selected ? colors.color : 'rgba(255,255,255,0.6)',
            lineHeight:  1,
            letterSpacing: '-0.02em',
          }}>
            {plan === 'free' ? '0$' : data.priceLabel}
          </div>
          <div style={{
            fontSize:    '9px',
            color:       'rgba(255,255,255,0.2)',
            letterSpacing: '0.1em',
            fontFamily:  'Space Mono, monospace',
            marginTop:   '3px',
          }}>
            {plan === 'free' ? t('plans.free_label') : t('plans.per_month')}
          </div>
        </div>
      </div>

      {/* SEPARATOR */}
      <div style={{
        height:       '1px',
        background:   `rgba(${
          plan === 'free'    ? '107,114,128' :
          plan === 'basic'   ? '59,130,246' :
          plan === 'premium' ? '245,158,11' :
          plan === 'empire'  ? '226,232,240' :
          '139,92,246'
        }, 0.15)`,
        margin:       '0 0 14px',
      }} />

      {/* FEATURE LIST */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           '7px',
        marginBottom:  '16px',
      }}>
        {data.features.map((feature: any, i: number) => (
          <div key={i} style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
            fontSize:   '11px',
            color:      feature.locked
              ? 'rgba(255,255,255,0.2)'
              : 'rgba(255,255,255,0.6)',
          }}>
            <span style={{
              flexShrink: 0,
              fontSize:   '11px',
              color:      feature.locked ? '#F59E0B' : colors.color,
            }}>
              {feature.locked ? '🔒' : '✓'}
            </span>
            <span>{feature.text}</span>
            {feature.suffix && (
              <span style={{
                fontSize:      '8px',
                color:         colors.color,
                letterSpacing: '0.08em',
                fontFamily:    'Space Mono, monospace',
                marginLeft:    '4px',
                padding:       '2px 6px',
                background:    `rgba(${colors.color === '#00FF41' ? '0,255,65' : colors.color === '#E2E8F0' ? '226,232,240' : '255,255,255'}, 0.1)`,
                borderRadius:  '10px',
                flexShrink:    0,
              }}>
                {feature.suffix}
              </span>
            )}
            {feature.locked && feature.nextPlan && (
              <span style={{
                fontSize:      '8px',
                color:         'rgba(255,255,255,0.15)',
                letterSpacing: '0.08em',
                fontFamily:    'Space Mono, monospace',
                marginLeft:    'auto',
                flexShrink:    0,
              }}>
                {feature.nextPlan}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* CTA BUTTON */}
      {showCTA && onCTA && (
        <button
          onClick={(e) => { e.stopPropagation(); onCTA(); }}
          style={{
            width:         '100%',
            height:        '48px',
            borderRadius:  '12px',
            background:    selected ? colors.color : 'rgba(255,255,255,0.05)',
            border:        'none',
            color:         selected ? '#0a0a0f' : colors.color,
            fontSize:      '12px',
            fontWeight:    800,
            letterSpacing: '0.05em',
            cursor:        'pointer',
            fontFamily:    'Space Mono, monospace',
            transition:    'all 0.2s ease',
            marginTop:     'auto',
          }}
        >
          {data.cta}
        </button>
      )}
    </div>
  );
}
