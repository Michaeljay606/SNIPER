import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { PlanBadge } from './PlanBadge';
import { ClientConfig } from '../hooks/useClientConfig';

interface MentorFirstLoginProps {
  config: ClientConfig;
  onComplete: () => void;
}

export default function MentorFirstLogin({ config, onComplete }: MentorFirstLoginProps) {
  const [screen, setScreen] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Screen 2 Fields
  const [speciality, setSpeciality] = useState('');
  const [socialTelegram, setSocialTelegram] = useState('');
  const [brokerUrl, setBrokerUrl] = useState('');

  const handleEssentialConfig = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          speciality: speciality,
          social_telegram: socialTelegram,
          broker_1_url: brokerUrl
        })
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      setScreen(3);
    } catch (err) {
      console.error('Error updating essential config:', err);
      // Fallback: still go to screen 3 so user isn't stuck
      setScreen(3);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ onboarding_completed: true })
        .eq('tenant_id', TENANT_ID);

      if (error) throw error;
      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      onComplete(); // Force reload even if error
    } finally {
      setLoading(false);
    }
  };

  const validateTelegram = (url: string) => {
    if (!url) return true;
    return url.includes('t.me') || url.includes('telegram.me');
  };

  const isFormValid = speciality.length > 0 || socialTelegram.length > 0 || brokerUrl.length > 0;

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
      {/* Progress dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '40px',
      }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: screen === i ? '#00FF41' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

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
            {/* Animated logo reveal */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                width: '72px', height: '72px',
                borderRadius: '20px',
                background: 'rgba(0,255,65,0.06)',
                border: '1px solid rgba(0,255,65,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 0 40px rgba(0,255,65,0.15)',
              }}
            >
              <motion.span 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ fontSize: '32px' }}
              >
                ⚡
              </motion.span>
            </motion.div>

            <div style={{
              fontSize: '11px',
              letterSpacing: '0.2em',
              color: 'rgba(0,255,65,0.6)',
              fontFamily: 'Space Mono, monospace',
              textAlign: 'center',
              marginBottom: '12px',
            }}>
              EPHATA TECH
            </div>

            <div style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#F0F0F0',
              textAlign: 'center',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}>
              Bienvenue,<br/>
              {config.mentorName} 👋
            </div>

            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              textAlign: 'center',
              lineHeight: 1.7,
              maxWidth: '260px',
              marginBottom: '48px',
            }}>
              Votre terminal de trading est activé.
              Configurons-le ensemble en 2 minutes.
            </div>

            {/* Plan badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0,255,65,0.06)',
              border: '1px solid rgba(0,255,65,0.15)',
              borderRadius: '99px',
              padding: '8px 20px',
              marginBottom: '48px',
            }}>
              <PlanBadge plan={config.plan} />
              <span style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'Space Mono, monospace',
              }}>
                INFRASTRUCTURE ACTIVE
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={() => setScreen(2)}
              style={{
                width: '100%',
                maxWidth: '320px',
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
              }}
            >
              CONFIGURER MON TERMINAL →
            </button>
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
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Configuration essentielle</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Ces informations seront visibles par vos membres.
              </p>
            </div>

            <div style={{ spaceY: '20px', width: '100%', maxWidth: '360px', margin: '0 auto' }}>
              {/* Field 1: Spécialité */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: 'Space Mono, monospace',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}>Spécialité</label>
                <input 
                  value={speciality}
                  onChange={(e) => setSpeciality(e.target.value)}
                  placeholder="Ex: Expert Price Action & Forex"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#F0F0F0',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Field 2: Lien Telegram */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: 'Space Mono, monospace',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}>Lien Telegram (canal ou groupe)</label>
                <input 
                  value={socialTelegram}
                  onChange={(e) => setSocialTelegram(e.target.value)}
                  placeholder="https://t.me/votre_canal"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: !validateTelegram(socialTelegram) ? '1px solid rgba(255,0,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#F0F0F0',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
                {!validateTelegram(socialTelegram) && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,0,0,0.5)', marginTop: '4px', display: 'block' }}>
                    Le lien doit commencer par t.me ou telegram.me
                  </span>
                )}
              </div>

              {/* Field 3: Lien broker principal */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: 'Space Mono, monospace',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}>Lien broker principal</label>
                <input 
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  placeholder="Votre lien affilié Exness, XM..."
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#F0F0F0',
                    fontSize: '14px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                disabled={!isFormValid || loading}
                onClick={handleEssentialConfig}
                style={{
                  width: '100%',
                  height: '54px',
                  borderRadius: '14px',
                  background: isFormValid ? '#00FF41' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: isFormValid ? '#050507' : 'rgba(255,255,255,0.2)',
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  fontFamily: 'Space Mono, monospace',
                  boxShadow: isFormValid ? '0 0 24px rgba(0,255,65,0.25)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? 'ENREGISTREMENT...' : 'CONTINUER →'}
              </button>

              <div 
                onClick={() => setScreen(3)}
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '16px',
                  letterSpacing: '0.05em',
                  textDecoration: 'underline'
                }}
              >
                Configurer plus tard →
              </div>
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
            {/* Success circle */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.3 }}
              style={{
                width: '80px', height: '80px',
                borderRadius: '50%',
                background: 'rgba(0,255,65,0.08)',
                border: '2px solid #00FF41',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 0 32px rgba(0,255,65,0.2)',
                fontSize: '32px',
                color: '#00FF41'
              }}
            >
              ✓
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                fontSize: '24px',
                fontWeight: 800,
                textAlign: 'center',
                color: '#F0F0F0',
                lineHeight: 1.2,
                marginBottom: '8px',
              }}
            >
              Votre terminal est prêt.
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
                lineHeight: 1.7,
                maxWidth: '250px',
                marginBottom: '32px',
              }}
            >
              Partagez ce lien à vos membres pour qu'ils rejoignent votre communauté.
            </motion.div>

            {/* Shareable link */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(0,255,65,0.15)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '24px',
                width: '100%',
                maxWidth: '320px',
              }}
            >
              <div style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'Space Mono, monospace',
                marginBottom: '6px',
              }}>
                VOTRE LIEN UNIQUE
              </div>
              <div style={{
                fontSize: '12px',
                color: '#00FF41',
                fontFamily: 'Space Mono, monospace',
                wordBreak: 'break-all',
              }}>
                t.me/EphataTechBot/app?startapp={TENANT_ID}
              </div>
            </motion.div>

            {/* Copy button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://t.me/EphataTechBot/app?startapp=${TENANT_ID}`
                )
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              style={{
                width: '100%',
                maxWidth: '320px',
                height: '50px',
                borderRadius: '12px',
                background: copied ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${copied ? 'rgba(0,255,65,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: copied ? '#00FF41' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Space Mono, monospace',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ LIEN COPIÉ !' : 'COPIER MON LIEN'}
            </motion.button>

            {/* Enter terminal button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              onClick={handleCompleteOnboarding}
              style={{
                width: '100%',
                maxWidth: '320px',
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
              }}
            >
              ACCÉDER À MON TERMINAL →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 20px rgba(0,255,65,0.1); }
          50% { box-shadow: 0 0 40px rgba(0,255,65,0.2); }
          100% { box-shadow: 0 0 20px rgba(0,255,65,0.1); }
        }
      `}</style>
    </div>
  );
}
