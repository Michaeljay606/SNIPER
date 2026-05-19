import React from 'react';

interface SniperLogoProps {
  size?: number;
  color?: string;
  opacity?: number;
  animated?: boolean;
}

export default function SniperLogo({
  size = 200,
  color = '#00FF41',
  opacity = 1,
  animated = false,
}: SniperLogoProps): React.ReactElement {
  
  const STYLES = `
    @keyframes spin-slow { 100% { transform: rotate(360deg); } }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 4px #00FF41); } 50% { opacity: 1; filter: drop-shadow(0 0 12px #00FF41); } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  `;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{ opacity }}>
      {animated && <style>{STYLES}</style>}

      <g style={{ animation: animated ? 'pulse-glow 3s infinite' : 'none', transformOrigin: '100px 100px' }}>
        
        {/* ─── Cercle Extérieur Fin ─── */}
        <circle cx="100" cy="100" r="85" stroke={color} strokeWidth="1" opacity="0.8" />
        
        {/* ─── Cercle Intermédiaire Épais ─── */}
        <circle cx="100" cy="100" r="65" stroke={color} strokeWidth="2.5" />
        
        {/* ─── Cœur de Cible ─── */}
        <circle cx="100" cy="100" r="12" stroke={color} strokeWidth="2" />
        <circle cx="100" cy="100" r="4" fill={color} style={{ animation: animated ? 'blink 1s infinite' : 'none' }} />
        
        {/* ─── Lignes de mire (Crosshairs) principales ─── */}
        <line x1="100" y1="15" x2="100" y2="88" stroke={color} strokeWidth="2" />
        <line x1="100" y1="112" x2="100" y2="185" stroke={color} strokeWidth="2" />
        <line x1="15" y1="100" x2="88" y2="100" stroke={color} strokeWidth="2" />
        <line x1="112" y1="100" x2="185" y2="100" stroke={color} strokeWidth="2" />
        
        {/* ─── Coins / Crochets de Ciblage sur le cercle intermédiaire ─── */}
        {/* Haut Gauche */}
        <path d="M 54 69 L 54 54 L 69 54" stroke={color} strokeWidth="3" fill="none" />
        {/* Haut Droite */}
        <path d="M 146 69 L 146 54 L 131 54" stroke={color} strokeWidth="3" fill="none" />
        {/* Bas Gauche */}
        <path d="M 54 131 L 54 146 L 69 146" stroke={color} strokeWidth="3" fill="none" />
        {/* Bas Droite */}
        <path d="M 146 131 L 146 146 L 131 146" stroke={color} strokeWidth="3" fill="none" />

        {/* ─── Repères tactiques (Ticks) sur les axes principaux ─── */}
        <line x1="100" y1="35" x2="100" y2="45" stroke={color} strokeWidth="2" />
        <line x1="100" y1="155" x2="100" y2="165" stroke={color} strokeWidth="2" />
        <line x1="35" y1="100" x2="45" y2="100" stroke={color} strokeWidth="2" />
        <line x1="155" y1="100" x2="165" y2="100" stroke={color} strokeWidth="2" />

        {/* ─── Repères tactiques à 45° sur le cercle intermédiaire ─── */}
        <g stroke={color} strokeWidth="1.5">
          <line x1="75" y1="75" x2="80" y2="80" />
          <line x1="125" y1="75" x2="120" y2="80" />
          <line x1="75" y1="125" x2="80" y2="120" />
          <line x1="125" y1="125" x2="120" y2="120" />
        </g>
      </g>
      
      {/* ─── Animation dynamique : Anneau pointillé rotatif interne ─── */}
      <circle cx="100" cy="100" r="75" stroke={color} strokeWidth="1" strokeDasharray="4 12" opacity="0.4"
        style={{ animation: animated ? 'spin-slow 15s linear infinite' : 'none', transformOrigin: '100px 100px' }} />
    </svg>
  );
}
