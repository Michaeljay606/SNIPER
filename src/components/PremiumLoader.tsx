import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SniperLogo from '../assets/SniperLogo';

export interface PremiumLoaderProps {
  onComplete: () => void;
  tenantName?: string;
  ready?: boolean;
}

// ─── Graphique Animé Adapté au Format Mobile ───
function AnimatedChartMobile() {
  const path = "M 0 250 L 50 200 L 100 220 L 150 150 L 200 170 L 250 100 L 300 130 L 350 60 L 400 90 L 450 40 L 500 70 L 550 20 L 600 50 L 650 10 L 700 30 L 800 10";
  
  return (
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%', opacity: 0.2, zIndex: 1 }} viewBox="0 0 800 300" preserveAspectRatio="none">
      <defs>
        <linearGradient id="glowMobile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF41" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00FF41" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Chandeliers Japonais stylisés (version mobile) */}
      <g stroke="#00FF41" strokeWidth="2" opacity="0.4">
        <line x1="100" y1="230" x2="100" y2="180" />
        <rect x="95" y="190" width="10" height="30" fill="#00FF41" />
        
        <line x1="150" y1="180" x2="150" y2="130" />
        <rect x="145" y="140" width="10" height="35" fill="#00FF41" />

        <line x1="200" y1="190" x2="200" y2="140" />
        <rect x="195" y="150" width="10" height="30" fill="#00FF41" />

        <line x1="250" y1="130" x2="250" y2="80" />
        <rect x="245" y="90" width="10" height="30" fill="none" />

        <line x1="300" y1="160" x2="300" y2="100" />
        <rect x="295" y="110" width="10" height="40" fill="#00FF41" />
      </g>
      
      {/* Courbe animée */}
      <motion.path
        d={path}
        fill="none"
        stroke="#00FF41"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3.5, ease: "easeInOut" }}
      />
      {/* Remplissage sous la courbe */}
      <motion.path
        d={`${path} L 800 300 L 0 300 Z`}
        fill="url(#glowMobile)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3.5, ease: "easeInOut" }}
      />
    </svg>
  );
}

export function PremiumLoader({ onComplete, tenantName, ready = true }: PremiumLoaderProps) {
  const [phase, setPhase] = useState<'booting' | 'fadeout'>('booting');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const hasCompleted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 4000); // Chargement plus rapide et fluide (4s) pour mobile

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (minTimeElapsed && ready) {
      setPhase('fadeout');
      const fadeTimer = setTimeout(() => {
        if (!hasCompleted.current) {
          hasCompleted.current = true;
          onComplete();
        }
      }, 500);
      return () => clearTimeout(fadeTimer);
    }
  }, [minTimeElapsed, ready, onComplete]);

  const isFadingOut = phase === 'fadeout';

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#050709', // Fond global très sombre pour le reste de l'écran PC
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <div 
        className="w-full max-w-[430px] h-full relative flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: '#080B14', // Couleur exacte de fond de l'app
          color: '#F0F0F0',
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 0 50px rgba(0,0,0,0.5)' // Démarque légèrement l'écran mobile du fond sur PC
        }}
      >
        {/* Le graphique dynamique en arrière-plan */}
        <AnimatedChartMobile />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* ── LOGO ── */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ marginBottom: 12 }}
        >
          <SniperLogo size={110} animated={true} />
        </motion.div>

        {/* ── SNIPER (sous le logo) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.4em',
            color: '#F0F0F0',
            marginBottom: 32,
            marginLeft: '0.4em' // Pour équilibrer le letter-spacing
          }}
        >
          SNIPER
        </motion.div>

        {/* ── [TENANT] TERMINAL ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {tenantName && <span style={{ textTransform: 'uppercase' }}>{tenantName}</span>}
          <span style={{ color: '#00FF41' }}>TERMINAL</span>
        </motion.div>

        {/* ── POWERED BY SNIPER ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 6
          }}
        >
          POWERED BY SNIPER
        </motion.div>

        {/* ── BARRE DE CHARGEMENT CLEAN ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          style={{
            marginTop: 40,
            width: 220,
            height: 3,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 4,
            overflow: 'hidden'
          }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.8, ease: "easeInOut", delay: 0.9 }}
            style={{ height: '100%', background: '#00FF41', boxShadow: '0 0 10px rgba(0,255,65,0.4)' }}
          />
        </motion.div>
        
        {/* ── STATUT ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          style={{
            marginTop: 16,
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            color: '#00FF41',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: 0.8
          }}
        >
          Vérification accès...
        </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
