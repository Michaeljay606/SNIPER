import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { ClientConfig } from '../hooks/useClientConfig';

interface MemberJoinFlowProps {
  config: ClientConfig;
  telegramUser: any;
  onComplete: () => void;
}

export default function MemberJoinFlow({ config, telegramUser, onComplete }: MemberJoinFlowProps) {
  const [screen, setScreen] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ members: 0, signals: 0, winrate: 0 });
  
  // Registration Fields
  const [firstName, setFirstName] = useState(telegramUser?.first_name || '');
  const [username, setUsername] = useState(telegramUser?.username ? '@' + telegramUser.username : '');

  useEffect(() => {
    async function fetchStats() {
      try {
        // 1. Members count
        const { count: memberCount } = await supabase
          .from('affiliates')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', TENANT_ID);

        // 2. Signals count
        const { count: signalCount } = await supabase
          .from('signals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', TENANT_ID);

        // 3. Winrate from public_mentor_stats view
        const { data: statsData } = await supabase
          .from('public_mentor_stats')
          .select('winrate')
          .eq('tenant_id', TENANT_ID)
          .single();

        setStats({
          members: memberCount || 0,
          signals: signalCount || 0,
          winrate: statsData?.winrate || 85 // Default fallback
        });
      } catch (err) {
        console.error('Error fetching join flow stats:', err);
      }
    }
    fetchStats();
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .insert([{
          tenant_id: TENANT_ID,
          telegram_id: String(telegramUser?.id),
          name: firstName,
          telegram_username: username,
          status: 'pending',
          is_vip: false,
          role: 'user',
          email: `${telegramUser?.id}@telegram.user`, // Fallback email
        }]);

      if (error) throw error;
      setScreen(3);
    } catch (err) {
      console.error('Error registering member:', err);
      setScreen(3); // Go to screen 3 anyway to show pending status
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#050507',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      color: '#F0F0F0',
      fontFamily: 'DM Sans, sans-serif',
      overflowY: 'auto',
    }}>
      <AnimatePresence mode="wait">
        {screen === 1 && (
          <motion.div
            key="screen1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Mentor avatar */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                width: '80px', height: '80px',
                borderRadius: '50%',
                border: '2px solid rgba(0,255,65,0.4)',
                boxShadow: '0 0 20px rgba(0,255,65,0.15)',
                marginBottom: '20px',
                overflow: 'hidden',
                background: 'rgba(0,255,65,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {config.logoUrl ? (
                <img src={config.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  fontSize: '28px', fontWeight: 700,
                  color: '#00FF41',
                  fontFamily: 'Space Mono, monospace',
                }}>
                  {config.mentorName.charAt(0)}
                </div>
              )}
            </motion.div>

            <div style={{
              fontSize: '20px',
              fontWeight: 800,
              textAlign: 'center',
              color: '#F0F0F0',
              marginBottom: '6px',
            }}>
              {config.mentorName}
            </div>

            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              textAlign: 'center',
              marginBottom: '32px',
              letterSpacing: '0.05em',
            }}>
              {config.speciality || 'Expert Trading Intelligence'}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={pillStyle}>
                {stats.members}+ membres
              </div>
              <div style={pillStyle}>
                {stats.signals}+ signaux
              </div>
              <div style={pillStyle}>
                {stats.winrate}% winrate
              </div>
            </div>

            <div style={{ marginTop: '48px', width: '100%', maxWidth: '320px' }}>
              <button onClick={() => setScreen(2)} style={ctaStyle}>
                REJOINDRE LA COMMUNAUTÉ →
              </button>
              <div style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.15)',
                textAlign: 'center',
                marginTop: '16px',
                letterSpacing: '0.08em',
                fontFamily: 'Space Mono, monospace',
              }}>
                PROPULSÉ PAR EPHATA TECH
              </div>
            </div>
          </motion.div>
        )}

        {screen === 2 && (
          <motion.div
            key="screen2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Créer votre accès</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Quelques informations pour personnaliser votre expérience.
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Prénom</label>
                <input 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={labelStyle}>Nom d'utilisateur Telegram</label>
                <input 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  readOnly={!!telegramUser?.username}
                  placeholder="@votre_username"
                  style={{
                    ...inputStyle,
                    opacity: telegramUser?.username ? 0.6 : 1,
                  }}
                />
              </div>

              <button
                disabled={!firstName || loading}
                onClick={handleRegister}
                style={{
                  ...ctaStyle,
                  background: (firstName) ? '#00FF41' : 'rgba(255,255,255,0.05)',
                  color: (firstName) ? '#050507' : 'rgba(255,255,255,0.2)',
                  cursor: (firstName) ? 'pointer' : 'not-allowed',
                  boxShadow: (firstName) ? '0 0 24px rgba(0,255,65,0.25)' : 'none',
                }}
              >
                {loading ? 'INSCRIPTION...' : 'ACCÉDER AU TERMINAL →'}
              </button>
            </div>
          </motion.div>
        )}

        {screen === 3 && (
          <motion.div
            key="screen3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                background: 'rgba(0,255,65,0.08)',
                border: '2px solid #00FF41',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                color: '#00FF41',
                fontSize: '28px',
              }}
            >
              ✓
            </motion.div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>Demande envoyée !</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7, marginBottom: '40px', maxWidth: '280px' }}>
              Votre accès est en cours de validation. Vous serez notifié dès l'approbation.
            </p>

            <div style={{
              width: '100%',
              maxWidth: '320px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderLeft: '4px solid #00FF41',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '40px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>En attendant, vous avez accès à :</div>
              <div style={{ spaceY: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ marginBottom: '6px' }}>✓ Calculateur de lots</div>
                <div style={{ marginBottom: '6px' }}>✓ Profil de {config.mentorName}</div>
                <div>✓ {stats.signals > 0 ? 'Aperçu des signaux publics' : 'Signaux publics dès publication'}</div>
              </div>
            </div>

            <button onClick={onComplete} style={ctaStyle}>
              EXPLORER LE TERMINAL →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const pillStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '20px',
  padding: '6px 14px',
  fontSize: '11px',
  fontFamily: 'Space Mono, monospace',
  color: 'rgba(255,255,255,0.7)',
};

const ctaStyle = {
  width: '100%',
  height: '54px',
  borderRadius: '14px',
  background: '#00FF41',
  border: 'none',
  color: '#050507',
  fontSize: '14px',
  fontWeight: 800,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  fontFamily: 'Space Mono, monospace',
  boxShadow: '0 0 24px rgba(0,255,65,0.25)',
  transition: 'all 0.3s ease',
};

const labelStyle = {
  display: 'block',
  fontSize: '9px',
  letterSpacing: '0.15em',
  color: 'rgba(255,255,255,0.25)',
  fontFamily: 'Space Mono, monospace',
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
};

const inputStyle = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '14px',
  color: '#F0F0F0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
};
