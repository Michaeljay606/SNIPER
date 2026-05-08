export const PLAN_COLORS = {
  free: {
    color:   '#6B7280',
    glow:    'none',
    border:  'rgba(107,114,128,0.25)',
    bg:      'rgba(107,114,128,0.05)',
    badge:   { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
  },
  basic: {
    color:   '#3B82F6',
    glow:    '0 0 20px rgba(59,130,246,0.15)',
    border:  'rgba(59,130,246,0.3)',
    bg:      'rgba(59,130,246,0.06)',
    badge:   { bg: 'rgba(59,130,246,0.2)', text: '#60A5FA' },
  },
  premium: {
    color:   '#F59E0B',
    glow:    '0 0 30px rgba(245,158,11,0.2)',
    border:  'rgba(245,158,11,0.4)',
    bg:      'rgba(245,158,11,0.06)',
    badge:   { bg: 'rgba(245,158,11,0.18)', text: '#FCD34D' },
  },
  empire: {
    color:   '#E2E8F0',
    glow:    '0 0 40px rgba(226,232,240,0.08)',
    border:  'rgba(226,232,240,0.18)',
    bg:      'rgba(226,232,240,0.03)',
    badge:   {
      bg:   'linear-gradient(135deg, rgba(148,163,184,0.2), rgba(226,232,240,0.1))',
      text: '#CBD5E1'
    },
  },
  pause: {
    color:   '#8B5CF6',
    glow:    'none',
    border:  'rgba(139,92,246,0.3)',
    bg:      'rgba(139,92,246,0.04)',
    badge:   { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
  },
} as const;

export const PLAN_BADGE_CONFIG = {
  free:    { label: 'FREE',    bg: '#1F2937', text: '#6B7280', dot: '#6B7280' },
  basic:   { label: 'BASIC',   bg: '#1E3A5F', text: '#60A5FA', dot: '#3B82F6' },
  premium: { label: 'PREMIUM', bg: '#3D2B00', text: '#FCD34D', dot: '#F59E0B' },
  empire:  { label: 'EMPIRE',  bg: '#1E2433', text: '#CBD5E1', dot: '#E2E8F0' },
  pause:   { label: 'PAUSE',   bg: '#2E1B5C', text: '#A78BFA', dot: '#8B5CF6' },
} as const;
