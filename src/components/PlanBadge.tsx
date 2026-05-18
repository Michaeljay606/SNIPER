import React from 'react';

type PlanType = 'free' | 'basic' | 'premium' | 'empire' | 'pause';

interface PlanBadgeProps {
  plan?: PlanType;
  isVip?: boolean;
  className?: string;
}

const PLAN_COLORS: Record<PlanType, string> = {
  free: 'rgba(255,255,255,0.4)',
  basic: '#00FF41',
  premium: '#8B5CF6',
  empire: '#F59E0B',
  pause: '#EF4444',
};

const PlanBadge = ({ plan = 'free', isVip, className = "" }: PlanBadgeProps) => {
  const displayPlan = isVip ? 'VIP' : plan.toUpperCase();
  const color = isVip ? '#00FF41' : PLAN_COLORS[plan] || PLAN_COLORS.free;

  return (
    <div 
      className={`px-2 py-0.5 rounded-md text-[8px] font-black tracking-[0.12em] border transition-all ${className}`}
      style={{
        background: `${color}10`,
        borderColor: `${color}30`,
        color: color,
        boxShadow: plan === 'empire' || isVip ? `0 0 10px ${color}20` : 'none',
        display: 'inline-block',
        fontFamily: 'var(--mono)',
      }}
    >
      {displayPlan}
    </div>
  );
};

export default PlanBadge;
