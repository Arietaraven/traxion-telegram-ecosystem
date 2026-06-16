import React, { useEffect, useState, useRef } from 'react';
import InvoiceDetailView from './views/InvoiceDetailView';
import UniversalDetailView from './views/UniversalDetailView'; // 🚀 ADDED: Imported new view file
import InvoicePlaceholderView from './views/InvoicePlaceholderView';

export default function App() {
  const [invoiceCode, setInvoiceCode] = useState<string | null>(null);
  const [transactionsList, setTransactionsList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Track rendering locks to prevent loop collision fields
  const isFetchingRef = useRef(false);

  // 📡 CORE DATA ROUTING ENGINE
  async function fetchLiveLedgerData() {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // 🔄 FORCE RESET REVENUE STATES IMMEDIATELY
    setLoading(true);
    setTransactionsList([]);
    setApiError(null);

    // Read variables dynamically straight from the browser frame context window
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    let urlQueryDate = params.get('date'); 
    
    if (!urlQueryDate) {
      urlQueryDate = new Date().toISOString().split('T')[0];
    }
    
    setInvoiceCode(code);

    if (!code) {
      setApiError("Secure parameter session token tracking missing.");
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const targetOrigin = window.location.origin;
      let response;

      if (/^\d{6}$/.test(code)) {
        console.log(`📡 [Frontend Core Sync]: Processing Trace #${code} (Date: ${urlQueryDate})`);
        response = await fetch(`${targetOrigin}/transactions/details/instapay/trace?date=${urlQueryDate}&traceNumber=${encodeURIComponent(code)}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
      } else {
        console.log(`📡 [Frontend Core Sync]: Processing Reference Hash: ${code}`);
        response = await fetch(`${targetOrigin}/transactions/details/${encodeURIComponent(code)}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
      }

      if (!response.ok) {
        throw new Error(`Gateway returned status error code: ${response.status}`);
      }

      const rootPayload = await response.json();
      const workingData = rootPayload.data;

      if (!workingData) {
        throw new Error("No active matching transaction records found in live repository ledger.");
      }

      let finalizedList: any[] = [];
      if (Array.isArray(workingData)) {
        finalizedList = workingData;
      } else if (workingData.data && Array.isArray(workingData.data)) {
        finalizedList = workingData.data;
      } else {
        finalizedList = [workingData];
      }

      if (finalizedList.length > 0) {
        setTransactionsList(finalizedList);
      } else {
        throw new Error("No active matching transaction records found in live repository ledger.");
      }

    } catch (err: any) {
      console.error('❌ [API Sync Failure]:', err.message);
      setApiError(err.message || "Ledger transaction data synchronization pending execution.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }

  // 🚀 HARDWARE SYNC HANDLER LIFE CYCLE LOCK
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      try {
        if (tg.ready) tg.ready();
        if (tg.expand) tg.expand();
        if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
          if (tg.setHeaderColor) tg.setHeaderColor('bg_color');
        }

        // ✨ THE ULTIMATE TELEGRAM LIFECYCLE SYNC:
        // By watching Telegram's viewport and main event loop changes directly,
        // we force a clean URL synchronization when the window is brought to the front.
        tg.onEvent('viewportChanged', () => {
          console.log("⚡ [Telegram UI Viewport Changed Trigger Caught]");
          // Forces location parameter evaluations fresh out of the context parameters
          const cleanCodeCheck = new URLSearchParams(window.location.search).get('code');
          if (cleanCodeCheck) {
            fetchLiveLedgerData();
          }
        });

      } catch (err) {
        console.warn("Telegram WebApp system bindings safely bypassed:", err);
      }
    }

    // Fallback Polling Loop Layer: Safely forces location re-evaluations
    const queryBackupSyncLoop = setInterval(() => {
      const liveParams = new URLSearchParams(window.location.search);
      const currentCodeParam = liveParams.get('code');
      
      // If code doesn't match active state tracker profile values, update them immediately
      if (currentCodeParam && currentCodeParam !== invoiceCode && !loading) {
        fetchLiveLedgerData();
      }
    }, 500);

    // Initial Fetch execution routine invocation on component initialization mount
    fetchLiveLedgerData();

    return () => {
      clearInterval(queryBackupSyncLoop);
      if (tg) {
        try {
          tg.offEvent('viewportChanged');
        } catch (e) {}
      }
    };
  }, [invoiceCode]);

  // Evaluates once if the current lookup parameter is a classic 6-digit trace code
  const isStandardInvoiceTrace = invoiceCode ? /^\d{6}$/.test(invoiceCode) : true;

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: 'var(--tg-theme-bg-color, #17212b)',
      color: 'var(--tg-theme-text-color, #f5f5f5)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '16px',
      boxSizing: 'border-box',
      gap: '20px'
    }}>
      {loading ? (
        <div style={{ color: '#8aa1b5', fontSize: '14px', marginTop: '40vh' }}>🚀 Synchronizing Live Ledger State Matrix...</div>
      ) : transactionsList.length > 0 ? (
        transactionsList.map((txRecord, idx) => (
          /* 🚀 ADDED: Renders standard trace component layout or new separate layout view dynamically */
          isStandardInvoiceTrace ? (
            <InvoiceDetailView 
              key={txRecord.transactionReferenceNumber || txRecord.referenceId || idx} 
              transaction={txRecord} 
              invoiceCode={invoiceCode} 
            />
          ) : (
            <UniversalDetailView 
              key={txRecord.transactionReferenceNumber || txRecord.referenceId || idx} 
              transaction={txRecord} 
              invoiceCode={invoiceCode} 
            />
          )
        ))
      ) : (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', marginTop: '20vh' }}>
          <InvoicePlaceholderView invoiceCode={invoiceCode} />
          {apiError && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px', opacity: 0.8 }}>
              ⚠️ {apiError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}