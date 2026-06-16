import React from 'react';

interface InvoicePlaceholderViewProps {
  invoiceCode: string | null;
}

export default function InvoicePlaceholderView({ invoiceCode }: InvoicePlaceholderViewProps) {
  return (
    <div style={styles.card}>
      {/* Branded Traxion Header */}
      <h2 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '22px', textAlign: 'center' }}>
        TRAXION ECOSYSTEM
      </h2>
      <p style={{ color: '#8aa1b5', fontSize: '14px', margin: '0 0 24px 0', textAlign: 'center' }}>
        Official Secure Invoice Engine
      </p>

      <div style={styles.dashedSection}>
        <p style={styles.row}>
          <span style={{ color: '#8aa1b5' }}>Lookup Code:</span> 
          <strong style={{ float: 'right', color: '#10b981' }}>{invoiceCode || '------'}</strong>
        </p>
        <p style={styles.row}>
          <span style={{ color: '#8aa1b5' }}>Channel:</span> 
          <span style={{ float: 'right' }}>QRPH Transaction</span>
        </p>
        <p style={styles.row}>
          <span style={{ color: '#8aa1b5' }}>Gateway State:</span> 
          <span style={{ float: 'right', color: '#fbbf24' }}>Pending Synchronization</span>
        </p>
      </div>

      <p style={{ fontSize: '12px', color: '#8aa1b5', margin: '24px 0 0 0', textAlign: 'center' }}>
        🔒 Encrypted Verification Session
      </p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #242f3d)',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    border: '1px solid var(--tg-theme-hint-color, #3b82f6)',
  },
  dashedSection: {
    borderTop: '1px dashed #4b5563',
    borderBottom: '1px dashed #4b5563',
    padding: '16px 0',
    margin: '16px 0',
    textAlign: 'left',
  },
  row: {
    margin: '6px 0',
    fontSize: '15px',
    display: 'flex',
    justifyContent: 'space-between',
  }
};