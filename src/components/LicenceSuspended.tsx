import React from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  mentorName: string
}

export default function LicenceSuspended({ mentorName }: Props) {
  const { t } = useTranslation()
  return (
    <div style={{
      background: '#050507',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Space Mono, monospace',
      textAlign: 'center',
      padding: '32px'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');`}</style>
      
      <div style={{
        fontSize: '14px',
        color: 'rgba(255,255,255,0.1)',
        letterSpacing: '0.25em',
        fontWeight: 700,
        marginBottom: '40px',
      }}>
        EPHATA TECH
      </div>

      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: '8px',
        letterSpacing: '0.05em'
      }}>
        {t('errors.license_suspended')}
      </div>
      
      <div style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.2)',
        lineHeight: 1.6,
      }}>
        {t('errors.contact_admin')}
      </div>
    </div>
  )
}
