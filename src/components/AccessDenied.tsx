import React from 'react'
import { useTranslation } from 'react-i18next'

export default function AccessDenied() {
  const { t } = useTranslation()
  return (
    <div
      style={{
        background: '#050507',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '32px' }}>🛡</span>
      <p
        style={{
          fontSize: '12px',
          fontFamily: 'Space Mono, monospace',
          color: 'rgba(255,255,255,0.3)',
          margin: 0,
        }}
      >
        {t('errors.access_denied')}
      </p>
    </div>
  )
}
