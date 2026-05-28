import React from 'react';

interface FakeStatCardProps {
  label: string;
  value: string;
}

export default function FakeStatCard({ label, value }: FakeStatCardProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,255,65,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '16px 14px',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 8,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.35)',
          marginBottom: 10,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 26,
          fontWeight: 700,
          color: '#00FF41',
          textShadow: '0 0 20px rgba(0,255,65,0.25)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
