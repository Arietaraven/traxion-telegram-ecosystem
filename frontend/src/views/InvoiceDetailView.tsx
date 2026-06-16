import React, { useEffect } from 'react';

// Explicit type interface matching your real corporate API payload structure exactly
interface TransactionPayload {
  transactionReferenceNumber?: string;
  integratorReferenceNumber?: string;
  aggregatorReferenceNumber?: string;
  transactionAmount?: string | number;
  transactionFee?: number;
  messageToRecipient?: string;
  status: number | string; 
  remarks?: string;
  description?: string;
  dateTimeCreated?: string;
  dateTimeStatusUpdated?: string;
  
  // Alternative fallback variant keys matching raw trace responses
  traceNumber?: string;
  referenceId?: string;
  amount?: string | number;
  created_at?: string;
}

interface InvoiceDetailViewProps {
  transaction: TransactionPayload;
  invoiceCode: string | null;
}

export default function InvoiceDetailView({ transaction, invoiceCode }: InvoiceDetailViewProps) {
  
  // 🚀 FIXED: Isolated layout hook tracks window parameters without triggering version 6.0 exceptions
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
      try {
        if (tg.setHeaderColor) tg.setHeaderColor('bg_color');
      } catch (e) {
        console.warn("Subview theme sync bypassed cleanly:", e);
      }
    }
  }, []);

// Safe Fallback Extractors: Safely grabs properties wherever they exist in the object tree
  const refNum = transaction.transactionReferenceNumber || transaction.referenceId || transaction.traceNumber || '---';
  const integRef = transaction.integratorReferenceNumber || '---';
  const aggRef = transaction.aggregatorReferenceNumber || '---';
  
  // ₱ CENTAVO TO PESO CONVERSION PIPELINE
  // 1. Convert Base Amount: "50000" centavos -> 500.00 Pesos
  const rawAmountInput = transaction.transactionAmount ?? transaction.amount ?? 0;
  const rawAmount = (typeof rawAmountInput === 'string' ? parseFloat(rawAmountInput) : rawAmountInput) / 100;

  // 2. Convert Gateway Fee: 375 centavos -> 3.75 Pesos
  const rawFeeInput = transaction.transactionFee || 0;
  const feeAmount = (typeof rawFeeInput === 'string' ? parseFloat(rawFeeInput) : rawFeeInput) / 100;

  // 3. Compute Total Display Accurately: 500.00 + 3.75 = 503.75 Pesos
  const totalDisplay = rawAmount + feeAmount;

  // Flexible status parsing handles both numeric codes and raw system transaction string states
  const isSuccessful = 
    transaction.status === 1 || 
    String(transaction.status).toUpperCase() === 'SUCCESSFUL' || 
    String(transaction.status).toUpperCase() === 'PAID' ||
    String(transaction.status).toUpperCase() === 'SUCCESS';

  const dateCreated = transaction.dateTimeCreated || transaction.created_at || new Date().toISOString();
  const dateUpdated = transaction.dateTimeStatusUpdated || dateCreated;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '---';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div style={styles.card}>
      {/* Dynamic Status Pill */}
      <div style={styles.badgeContainer}>
        <div style={{
          ...styles.statusBadge,
          backgroundColor: isSuccessful ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isSuccessful ? '#10b981' : '#ef4444',
        }}>
          ● {isSuccessful ? 'SUCCESSFUL' : 'FAILED'}
        </div>
      </div>

      {/* Dynamic Transaction Category Header */}
      <h1 style={styles.merchantTitle}>
        {transaction.remarks ? 'InstaPay Credit Transfer' : (transaction.description || 'Payment Processing')}
      </h1>
      <p style={styles.subtitle}>System Channel Gateway</p>
      
      {/* Price View Display */}
      <div style={styles.amountDisplay}>
        <span style={styles.currency}>PHP</span>
        <span style={styles.value}>{totalDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div style={styles.divider} />
      
      {/* Reference Metadata Registry Blocks */}
      <div style={styles.metaGrid}>
        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Transaction Ref</span>
          <span style={{ ...styles.metaValue, fontFamily: 'monospace', fontWeight: 'bold' }}>
            {refNum}
          </span>
        </div>
        
        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Integrator Ref</span>
          <span style={{ ...styles.metaValue, fontFamily: 'monospace' }}>
            {integRef}
          </span>
        </div>

        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Aggregator ID Segment</span>
          <div style={styles.nestedValue}>{aggRef}</div>
        </div>

        <div style={styles.dividerInside} />

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Base Amount</span>
          <span style={styles.metaValue}>PHP {rawAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Gateway Fee</span>
          <span style={styles.metaValue}>PHP {feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {/* Remittance secures parameters text logging */}
        {transaction.remarks && (
          <div style={styles.nestedBoxRemark}>
            <span style={styles.nestedLabel}>Remittance Parameters</span>
            <div style={styles.remarkText}>{transaction.remarks}</div>
          </div>
        )}

        <div style={styles.dividerInside} />

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Created On</span>
          <span style={styles.timeValue}>{formatDate(dateCreated)}</span>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Settled At</span>
          <span style={styles.timeValue}>{formatDate(dateUpdated)}</span>
        </div>
      </div>

      <div style={styles.divider} />
      <p style={styles.footerNote}>🔒 Securely tracked via Traxion Core Ledger Matrix</p>
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
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  merchantTitle: {
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 2px 0',
    textAlign: 'center',
    color: 'var(--tg-theme-text-color, #ffffff)',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8aa1b5',
    margin: '0 0 16px 0',
    textAlign: 'center',
  },
  amountDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    margin: '16px 0',
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
    margin: '6px 0',
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
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginTop: '2px',
  },
  nestedBoxRemark: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: '8px',
    padding: '10px 12px',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    marginTop: '4px',
  },
  nestedLabel: {
    fontSize: '10px',
    color: '#62788c',
    display: 'block',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  nestedValue: {
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    color: '#3b82f6',
    lineHeight: '1.4',
  },
  remarkText: {
    fontSize: '12px',
    color: '#cbd5e1',
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