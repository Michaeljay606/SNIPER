import React from 'react';

interface NeonToggleProps {
  isOn: boolean;
  onToggle: () => void;
  color?: string;
  disabled?: boolean;
}

const NeonToggle = ({ isOn, onToggle, color = '#00FF41', disabled = false }: NeonToggleProps) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      style={{
        width: 38,
        height: 20,
        borderRadius: 20,
        background: isOn ? `${color}15` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isOn ? `${color}30` : 'rgba(255,255,255,0.1)'}`,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: isOn ? color : 'rgba(255,255,255,0.3)',
          position: 'absolute',
          top: 2,
          left: isOn ? 20 : 2,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOn ? `0 0 8px ${color}80` : 'none',
        }}
      />
    </button>
  );
};

export default NeonToggle;
