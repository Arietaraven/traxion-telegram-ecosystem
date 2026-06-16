import React, { useEffect } from 'react';

interface UniversalDetailViewProps {
  transaction: any;
  invoiceCode: string | null;
}

export default function UniversalDetailView({ transaction, invoiceCode }: UniversalDetailViewProps) {
  
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
      try {
        if (tg.setHeaderColor) tg.setHeaderColor('bg_color');
      } catch (e) {
        console.warn("Universal theme sync bypassed safely:", e);
      }
    }
  }, []);

  // 🛰️ Safe Fallback Matrix: Drills into different possible API return parameters natively
  const txRef = transaction.transactionReferenceNumber || transaction.referenceId || transaction.traceNumber || invoiceCode || '---';
  const integRef = transaction.integratorReferenceNumber || '---';
  const aggRef = transaction.aggregatorReferenceNumber || '---';
  const description = transaction.description || transaction.remarks || 'Universal Ledger Registry Query';
  
  // ₱ CENTAVO TO PESO CONVERSION PIPELINE (MIRRORED FROM INVOICE DETAIL PIPELINE)
  // 1. Convert Base Amount: "50000" centavos -> 500.00 Pesos
  const baseAmountRaw = transaction.transactionAmount ?? transaction.amount ?? 0;
  const numericAmount = (typeof baseAmountRaw === 'string' ? parseFloat(baseAmountRaw) : baseAmountRaw) / 100;

  // 2. Convert Gateway Channel Fee: 375 centavos -> 3.75 Pesos
  const rawFeeInput = transaction.transactionFee ?? transaction.fee ?? 0;
  const baseFee = (typeof rawFeeInput === 'string' ? parseFloat(rawFeeInput) : rawFeeInput) / 100;

  // 3. Compute Total Display Accurately
  const totalDisplay = numericAmount + baseFee;

  // Flexible status normalizing block
  const statusStr = String(transaction.status || 'PENDING').toUpperCase();
  const isSuccessful = statusStr === '1' || statusStr === 'SUCCESSFUL' || statusStr === 'PAID' || statusStr === 'SUCCESS';

  const formatDate = (isoString?: string) => {
    if (!isoString) return '---';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dateCreated = transaction.dateTimeCreated || transaction.created_at || new Date().toISOString();

  return (
    <div style={styles.card}>
      {/* Universal Registry Hex Pill */}
      <div style={styles.badgeContainer}>
        <div style={{
          ...styles.statusBadge,
          backgroundColor: isSuccessful ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isSuccessful ? '#3b82f6' : '#ef4444',
          border: isSuccessful ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          🛰️ CORE SYSTEM LEDGER RECORD
        </div>
      </div>

      <h1 style={styles.title}>Universal Search Tracker</h1>
      <p style={styles.subtitle}>{description}</p>
      
      {/* Price Block */}
      <div style={styles.amountDisplay}>
        <span style={styles.currency}>PHP</span>
        <span style={styles.value}>{totalDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div style={styles.divider} />
      
      {/* Technical Data Fields */}
      <div style={styles.metaGrid}>
        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Target Query Key</span>
          <span style={{ ...styles.metaValue, color: '#fbbf24', fontWeight: 'bold' }}>{invoiceCode}</span>
        </div>

        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Transaction Reference Number</span>
          <div style={styles.nestedValue}>{txRef}</div>
        </div>
        
        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Integrator Reference String</span>
          <div style={styles.nestedValue}>{integRef}</div>
        </div>

        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Aggregator Reference Segment</span>
          <div style={styles.nestedValue}>{aggRef}</div>
        </div>

        <div style={styles.dividerInside} />

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Base Settlement Value</span>
          <span style={styles.metaValue}>PHP {numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Gateway Channel Fee</span>
          <span style={styles.metaValue}>PHP {baseFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Processing State</span>
          <strong style={{ color: isSuccessful ? '#10b981' : '#fbbf24' }}>{statusStr}</strong>
        </div>

        <div style={styles.dividerInside} />

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Captured Timestamp</span>
          <span style={styles.timeValue}>{formatDate(dateCreated)}</span>
        </div>
      </div>

      <div style={styles.divider} />
      <p style={styles.footerNote}>🔒 Decrypted Dynamic Session Trace Complete</p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #242f3d)',
    borderRadius: '16px',
    padding: '24px 20px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '5px 14px',
    borderRadius: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 800,
    margin: '0 0 4px 0',
    textAlign: 'center',
    color: 'var(--tg-theme-text-color, #ffffff)',
    letterSpacing: '0.3px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#8aa1b5',
    margin: '0 0 16px 0',
    textAlign: 'center',
    lineHeight: '1.4'
  },
  amountDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    margin: '12px 0',
  },
  currency: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#8aa1b5',
    marginRight: '6px',
  },
  value: {
    fontSize: '34px',
    fontWeight: 800,
    color: 'var(--tg-theme-text-color, #ffffff)',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '18px 0',
  },
  dividerInside: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    margin: '8px 0',
  },
  metaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  metaLabel: {
    color: '#8aa1b5',
  },
  metaValue: {
    color: 'var(--tg-theme-text-color, #f5f5f5)',
    fontWeight: 500,
  },
  timeValue: {
    color: 'var(--tg-theme-text-color, #f5f5f5)',
    fontSize: '12px',
  },
  nestedBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    border: '1px solid rgba(255, 255, 255, 0.03)'
  },
  nestedLabel: {
    fontSize: '9px',
    color: '#62788c',
    display: 'block',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  nestedValue: {
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    color: '#60a5fa',
    lineHeight: '1.4',
  },
  footerNote: {
    fontSize: '11px',
    color: '#62788c',
    marginTop: '16px',
    textAlign: 'center',
    marginBottom: '0',
  }
};