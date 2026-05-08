import React from 'react';

interface TenantNotFoundProps {
  tenantId: string;
}

const TenantNotFound: React.FC<TenantNotFoundProps> = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#050507',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '20px' }}>🔍</div>
      <div style={{
        fontSize: '16px',
        fontWeight: 700,
        color: '#F0F0F0',
        marginBottom: '8px',
        fontFamily: 'Space Mono, monospace',
      }}>
        Terminal introuvable
      </div>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.3)',
        lineHeight: 1.7,
        maxWidth: '240px',
      }}>
        Ce lien n'est pas encore actif.
        Contactez votre mentor pour
        obtenir le bon lien d'accès.
      </div>
    </div>
  );
};

export default TenantNotFound;
