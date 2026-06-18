import React, { useEffect } from 'react';

// Explicit type interface matching your real corporate API payload structure exactly
interface TransactionPayload {
  transactionReferenceNumber?: string;
  integratorReferenceNumber?: string;
  aggregatorReferenceNumber?: string;
  transactionAmount?: string | number;
  transactionFee?: number;
  messageToRecipient?: string;
  status?: number | string; 
  remarks?: string;
  description?: string;
  dateTimeCreated?: string;
  dateTimeStatusUpdated?: string;
  
  // Alternative fallback variant keys matching raw trace responses
  traceNumber?: string;
  referenceId?: string;
  amount?: string | number;
  created_at?: string;
  
  // Error diagnostic payload captures
  error?: string;
  statusCode?: number | string;
  message?: string;
}

interface InvoiceDetailViewProps {
  transaction: TransactionPayload | null | undefined;
  invoiceCode: string | null;
}

export default function InvoiceDetailView({ transaction, invoiceCode }: InvoiceDetailViewProps) {
  
  // 🚀 Isolated layout hook tracks window parameters without triggering version exceptions
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
  const refNum = transaction?.transactionReferenceNumber || transaction?.referenceId || transaction?.traceNumber || invoiceCode || '---';
  const integRef = transaction?.integratorReferenceNumber || '---';
  const aggRef = transaction?.aggregatorReferenceNumber || '---';
  
  // Isolated target query identifier sequence
  const activeQueryKey = invoiceCode || refNum;

  // 🎯 STRICT NOT FOUND CONDITIONAL CHECK
  // True when the transaction payload object is entirely missing, empty, or returns a 404 response
  const isNotFound = 
    !transaction || 
    Object.keys(transaction).length === 0 ||
    transaction.statusCode === 404 ||
    String(transaction.status).toUpperCase() === 'NOT FOUND';

  // 📊 STATUS ENUM SEGMENTATION PIPELINE (Only parsed if the record actually exists)
  const currentStatus = transaction?.status !== undefined ? String(transaction.status) : '';
  
  const isSuccessful = !isNotFound && (currentStatus === '1' || currentStatus.toUpperCase() === 'SUCCESSFUL' || currentStatus.toUpperCase() === 'SUCCESS' || currentStatus.toUpperCase() === 'PAID');
  const isPending = !isNotFound && (currentStatus === '0' || currentStatus.toUpperCase() === 'PENDING');
  const isFailed = !isNotFound && (currentStatus === '-1' || currentStatus.toUpperCase() === 'FAILED');

  // ₱ CENTAVO TO PESO CONVERSION PIPELINE
  const rawAmountInput = transaction?.transactionAmount ?? transaction?.amount ?? 0;
  const rawAmount = (typeof rawAmountInput === 'string' ? parseFloat(rawAmountInput) : Number(rawAmountInput)) / 100;

  const rawFeeInput = transaction?.transactionFee || 0;
  const feeAmount = (typeof rawFeeInput === 'string' ? parseFloat(rawFeeInput) : Number(rawFeeInput)) / 100;

  const totalDisplay = rawAmount;

  const dateCreated = transaction?.dateTimeCreated || transaction?.created_at || new Date().toISOString();
  const dateUpdated = transaction?.dateTimeStatusUpdated || dateCreated;

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

  // 🚨 DISPLAY MODE A: UNIVERSAL SEARCH TRACKER (NOT FOUND VIEW)
  if (isNotFound) {
    return (
      <div style={{ ...styles.card, borderColor: 'rgba(239, 68, 68, 0.35)', backgroundColor: 'rgba(24, 30, 41, 0.95)' }}>
        {/* Upper Status Badge Layer */}
        <div style={styles.badgeContainer}>
          <div style={{
            ...styles.statusBadge,
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            ❌ RECORD SEGMENT • MISSING
          </div>
        </div>

        <h1 style={styles.universalTitle}>Invoice Search Tracker</h1>
        
        {/* Center Visual Search Indicator Matrix */}
        <div style={{ margin: '32px 0 24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '54px', marginBottom: '14px', filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.3))' }}>🔍</div>
          <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '17px', display: 'block', letterSpacing: '0.5px' }}>
            TRANSACTION NOT FOUND
          </span>
          <p style={{ color: '#8aa1b5', fontSize: '13px', margin: '8px auto 0 auto', maxWidth: '300px', lineHeight: '1.5' }}>
            This explicit reference sequence could not be matched with active history logs across ledger repositories.
          </p>
        </div>

        <div style={styles.divider} />

        <div style={styles.metaGrid}>
          {/* Target Query Key high-visibility warning wrapper */}
          <div style={{ ...styles.targetQueryCard, backgroundColor: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
            <span style={{ ...styles.targetQueryLabel, color: '#ef4444' }}>Target Query Key</span>
            <div style={{ ...styles.targetQueryValue, color: '#ffffff' }}>{activeQueryKey}</div>
          </div>

          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Processing State</span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px' }}>NOT FOUND</span>
          </div>
          
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Scan Reference ID</span>
            <span style={{ ...styles.timeValue, fontFamily: 'monospace', color: '#8aa1b5' }}>{refNum}</span>
          </div>
        </div>

        <div style={styles.divider} />
        <p style={styles.footerNote}>🔒 Secure Sandbox Dynamic Session Complete</p>
      </div>
    );
  }

  // 📋 DISPLAY MODE B: STANDARD TRANSACTION INVOICE CARD (FOUND VIEW)
  return (
    <div style={styles.card}>
      {/* Dynamic Status Pill matching 1, 0, -1 rules precisely */}
      <div style={styles.badgeContainer}>
        <div style={{
          ...styles.statusBadge,
          backgroundColor: isSuccessful ? 'rgba(16, 185, 129, 0.12)' : isPending ? 'rgba(251, 191, 36, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          color: isSuccessful ? '#10b981' : isPending ? '#fbbf24' : '#ef4444',
          border: isSuccessful 
            ? '1px solid rgba(16, 185, 129, 0.25)' 
            : isPending 
            ? '1px solid rgba(251, 191, 36, 0.25)' 
            : '1px solid rgba(239, 68, 68, 0.25)'
        }}>
          ● {isSuccessful ? 'SUCCESSFUL' : isPending ? 'PENDING' : 'FAILED'}
        </div>
      </div>

      {/* Dynamic Transaction Category Header */}
      <h1 style={styles.merchantTitle}>
        {transaction?.remarks ? 'InstaPay Credit Transfer' : (transaction?.description || 'Payment Processing')}
      </h1>
      
      {/* Price View Display */}
      <div style={styles.amountDisplay}>
        <span style={styles.currency}>PHP</span>
        <span style={styles.value}>{totalDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div style={styles.divider} />
      
      {/* Reference Metadata Registry Blocks */}
      <div style={styles.metaGrid}>
        
        {/* Unified Target Query reference point */}
        <div style={styles.targetQueryCard}>
          <span style={styles.targetQueryLabel}>Target Query Key</span>
          <div style={styles.targetQueryValue}>{activeQueryKey}</div>
        </div>

        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Transaction Reference Number</span>
          <div style={styles.nestedValue}>{refNum}</div>
        </div>
        
        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Integrator Reference Number</span>
          <div style={styles.nestedValue}>{integRef}</div>
        </div>

        <div style={styles.nestedBox}>
          <span style={styles.nestedLabel}>Aggregator Reference Number</span>
          <div style={styles.nestedValue}>{aggRef}</div>
        </div>

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
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #181e29)',
    borderRadius: '20px',
    padding: '24px 20px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxSizing: 'border-box',
    margin: '0 auto'
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.6px',
    padding: '6px 16px',
    borderRadius: '30px',
    textTransform: 'uppercase'
  },
  universalTitle: {
    fontSize: '22px',
    fontWeight: 800,
    margin: '0 0 4px 0',
    textAlign: 'center',
    color: 'var(--tg-theme-text-color, #ffffff)',
    letterSpacing: '0.2px'
  },
  merchantTitle: {
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 4px 0',
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
    fontSize: '16px',
    fontWeight: 700,
    color: '#8aa1b5',
    marginRight: '6px',
  },
  value: {
    fontSize: '36px',
    fontWeight: 900,
    color: 'var(--tg-theme-text-color, #ffffff)',
    letterSpacing: '-0.5px'
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '20px 0',
  },
  dividerInside: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    margin: '10px 0',
  },
  metaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  targetQueryCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(251, 191, 36, 0.15)',
    marginBottom: '4px'
  },
  targetQueryLabel: {
    fontSize: '10px',
    color: '#fbbf24',
    display: 'block',
    marginBottom: '4px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  targetQueryValue: {
    fontSize: '13px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    color: '#fbbf24',
    lineHeight: '1.4',
    fontWeight: 600
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    padding: '2px 2px'
  },
  metaLabel: {
    color: '#8aa1b5',
    fontWeight: 500
  },
  metaValue: {
    color: 'var(--tg-theme-text-color, #f5f5f5)',
    fontWeight: 500,
  },
  timeValue: {
    color: 'var(--tg-theme-text-color, #f5f5f5)',
    fontSize: '12px',
    fontWeight: 500
  },
  nestedBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(255, 255, 255, 0.04)'
  },
  nestedBoxRemark: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    marginTop: '4px',
  },
  nestedLabel: {
    fontSize: '9px',
    color: '#62788c',
    display: 'block',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600
  },
  nestedValue: {
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    color: '#60a5fa',
    lineHeight: '1.45',
  },
  remarkText: {
    fontSize: '12px',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  footerNote: {
    fontSize: '11px',
    color: '#55697d',
    marginTop: '16px',
    textAlign: 'center',
    marginBottom: '0',
    letterSpacing: '0.2px'
  }
};