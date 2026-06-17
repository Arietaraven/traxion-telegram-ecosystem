import React, { useEffect } from 'react';

interface UniversalDetailViewProps {
  transactions: any[];
  invoiceCode: string | null;
}

export default function UniversalDetailView({ transactions, invoiceCode }: UniversalDetailViewProps) {
  
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

  // If transactions are empty or not array, show fallback structural layout safely
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return (
      <div style={styles.dashboardContainer}>
        <div style={{ ...styles.card, textAlign: 'center', borderColor: '#ef4444' }}>
          <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>⚠️ System Alert</span>
          <p style={{ color: '#8aa1b5', fontSize: '13px', margin: 0 }}>No tracking records available inside display parameters matrix.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      {transactions.map((transaction, index) => {
        // Core structural tracking properties
        const txRef = transaction.transactionReferenceNumber || '---';
        const integRef = transaction.integratorReferenceNumber || '---';
        const aggRef = transaction.aggregatorReferenceNumber || '---';
        
        // ✨ FIXED: Prioritize the item's specific reference number instead of the giant global comma-string.
        // If the item has an aggregatorReferenceNumber or specific reference payload, we show that single clean key.
        const activeQueryKey = transaction.transactionReferenceNumber || transaction.aggregatorReferenceNumber || invoiceCode || '---';
        
        // Removed fee calculation additions completely - showing pure base amount
        const baseAmountRaw = transaction.transactionAmount ?? transaction.amount ?? 0;
        const numericAmount = (typeof baseAmountRaw === 'string' ? parseFloat(baseAmountRaw) : baseAmountRaw) / 100;

        // Clean numeric match validation sequence rules 
        let statusStr = "PENDING";
        let isSuccessful = false;
        let isFailed = false;

        if (transaction.status === 1 || String(transaction.status) === '1') {
          statusStr = "SUCCESSFUL";
          isSuccessful = true;
        } else if (transaction.status === -1 || String(transaction.status) === '-1') {
          statusStr = "NOT FOUND";
          isFailed = true;
        }

        const dateCreated = transaction.dateTimeCreated || transaction.created_at || new Date().toISOString();

        // 🚨 alternate error design card box shown for failed/missing record lookups
        if (isFailed) {
          return (
            <div key={txRef + index} style={{ ...styles.card, borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
              {/* Upper Badge Layer */}
              <div style={styles.badgeContainer}>
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}>
                  ❌ RECORD SEGMENT #{index + 1} • MISSING
                </div>
              </div>

              <h1 style={styles.title}>Universal Search Tracker</h1>
              
              <div style={{ margin: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', display: 'block', letterSpacing: '0.3px' }}>
                  TRANSACTION NOT FOUND
                </span>
                <p style={{ color: '#8aa1b5', fontSize: '12px', margin: '6px auto 0 auto', maxWidth: '280px', lineHeight: '1.4' }}>
                  This explicit reference sequence could not be matched with active history logs across ledger repositories.
                </p>
              </div>

              <div style={styles.divider} />

              <div style={styles.metaGrid}>
                {/* Target Query Key container box */}
                <div style={{ ...styles.targetQueryCard, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <span style={{ ...styles.targetQueryLabel, color: '#ef4444' }}>Target Query Key</span>
                  <div style={styles.targetQueryValue}>{activeQueryKey}</div>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Processing State</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>{statusStr}</span>
                </div>
                
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Scan Reference ID</span>
                  <span style={{ ...styles.timeValue, fontFamily: 'monospace', color: '#60a5fa' }}>{txRef}</span>
                </div>
              </div>

              <div style={styles.divider} />
              <p style={styles.footerNote}>🔒 Secure Sandbox Dynamic Session Complete</p>
            </div>
          );
        }

        // Standard card interface shown for successful/pending record lookups
        return (
          <div key={txRef + index} style={styles.card}>
            {/* Upper Badge Layer */}
            <div style={styles.badgeContainer}>
              <div style={{
                ...styles.statusBadge,
                backgroundColor: isSuccessful ? 'rgba(16, 185, 129, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                color: isSuccessful ? '#10b981' : '#fbbf24',
                border: isSuccessful ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(251, 191, 36, 0.25)'
              }}>
                🪐 RECORD SEGMENT #{index + 1}
              </div>
            </div>

            {/* Clean Pure Base Amount Layout Block */}
            <div style={styles.amountDisplay}>
              <span style={styles.currency}>PHP</span>
              <span style={styles.value}>{numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style={styles.divider} />
            
            <div style={styles.metaGrid}>
              
              {/* Target Query Key container box */}
              <div style={styles.targetQueryCard}>
                <span style={styles.targetQueryLabel}>Target Query Key</span>
                <div style={styles.targetQueryValue}>{aggRef}</div>
              </div>

              {/* Reference Parameters */}
              <div style={styles.nestedBox}>
                <span style={styles.nestedLabel}>Transaction Reference Number</span>
                <div style={styles.nestedValue}>{txRef}</div>
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

              {/* Core Attributes Footer Array */}
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Processing State</span>
                <span style={{ 
                  color: isSuccessful ? '#10b981' : '#fbbf24',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.3px'
                }}>
                  {statusStr}
                </span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Captured Timestamp</span>
                <span style={styles.timeValue}>{formatDate(dateCreated)}</span>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    alignItems: 'center',
    padding: '8px 0 30px 0'
  },
  card: {
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #242f3d)',
    borderRadius: '20px',
    padding: '24px 20px',
    width: '92%',
    maxWidth: '420px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease-in-out'
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    padding: '6px 16px',
    borderRadius: '30px',
    textTransform: 'uppercase'
  },
  title: {
    fontSize: '21px',
    fontWeight: 800,
    margin: '0 0 4px 0',
    textAlign: 'center',
    color: 'var(--tg-theme-text-color, #ffffff)',
    letterSpacing: '0.2px'
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
    backgroundColor: 'rgba(251, 191, 36, 0.07)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(251, 191, 36, 0.2)',
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
    color: '#ffffff',
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
  footerNote: {
    fontSize: '11px',
    color: '#55697d',
    marginTop: '12px',
    textAlign: 'center',
    marginBottom: '0',
    letterSpacing: '0.2px'
  }
};