import React from 'react';

const EphataWelcome: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#050507',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      fontFamily: 'Space Mono, monospace',
    }}>
      {/* Logo */}
      <div style={{
        fontSize: '11px',
        letterSpacing: '0.25em',
        color: '#00FF41',
        marginBottom: '8px',
      }}>
        EPHATA TECH
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: '22px',
        fontWeight: 800,
        color: '#F0F0F0',
        textAlign: 'center',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        fontFamily: 'DM Sans, sans-serif',
        marginBottom: '12px',
        maxWidth: '280px',
      }}>
        L'infrastructure des mentors d'élite
      </div>

      {/* Sub */}
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        lineHeight: 1.7,
        maxWidth: '260px',
        marginBottom: '40px',
      }}>
        Signaux live · Academy · Calculateur de lots.
        Tout ce dont un mentor a besoin, en un terminal.
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '32px',
        marginBottom: '48px',
      }}>
        {[
          { value: '500+', label: 'TRADERS' },
          { value: '20+',  label: 'MENTORS' },
          { value: '99%',  label: 'UPTIME'  },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#00FF41',
              fontFamily: 'Space Mono, monospace',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.15em',
              marginTop: '3px',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => {
          (window as any).Telegram?.WebApp?.openTelegramLink(
            'https://t.me/EphataTechBot?start=demo'
          );
        }}
        style={{
          width: '100%',
          maxWidth: '320px',
          height: '54px',
          borderRadius: '14px',
          background: '#00FF41',
          border: 'none',
          color: '#050507',
          fontSize: '13px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          fontFamily: 'Space Mono, monospace',
          boxShadow: '0 0 24px rgba(0,255,65,0.2)',
          marginBottom: '16px',
        }}
      >
        CRÉER MON TERMINAL →
      </button>

      <div style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.15)',
        letterSpacing: '0.1em',
      }}>
        POWERED BY EPHATA TECH
      </div>
    </div>
  );
};

export default EphataWelcome;
