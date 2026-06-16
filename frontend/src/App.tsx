import React, { useEffect, useState, useRef } from 'react';
import InvoiceDetailView from './views/InvoiceDetailView';
import UniversalDetailView from './views/UniversalDetailView'; 
import InvoicePlaceholderView from './views/InvoicePlaceholderView';

export default function App() {
  const [invoiceCode, setInvoiceCode] = useState<string | null>(null);
  const [transactionsList, setTransactionsList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 🔒 Use refs to safely keep track of active sync states without triggering rendering loops
  const isFetchingRef = useRef(false);
  const lastTrackedCodeRef = useRef<string | null>(null);
  const lastTrackedDateRef = useRef<string | null>(null);

  // 📡 CORE DATA ROUTING ENGINE
  async function fetchLiveLedgerData(forcedCode: string | null, forcedDate: string | null) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // 🔄 Trigger clean state transitions
    setLoading(true);
    setApiError(null);

    if (!forcedCode) {
      setApiError("Secure parameter session token tracking missing.");
      setTransactionsList([]);
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const targetOrigin = window.location.origin;
      let response;

      if (/^\d{6}$/.test(forcedCode)) {
        console.log(`📡 [Frontend Core Sync]: Processing Trace #${forcedCode} (Date: ${forcedDate})`);
        response = await fetch(`${targetOrigin}/transactions/details/instapay/trace?date=${forcedDate}&traceNumber=${encodeURIComponent(forcedCode)}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
      } else {
        console.log(`📡 [Frontend Core Sync]: Processing Reference Hash: ${forcedCode}`);
        response = await fetch(`${targetOrigin}/transactions/details/${encodeURIComponent(forcedCode)}`, {
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
      setTransactionsList([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }

  // 🚀 UNIFIED HARDWARE EVENT SYNC LIFECYCLE
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      try {
        if (tg.ready) tg.ready();
        if (tg.expand) tg.expand();
        if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
          if (tg.setHeaderColor) tg.setHeaderColor('bg_color');
        }
      } catch (err) {
        console.warn("Telegram WebApp system bindings safely bypassed:", err);
      }
    }

    // Function to analyze URL query updates natively
    const synchronizeCurrentUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      let urlQueryDate = params.get('date'); 
      
      if (!urlQueryDate) {
        urlQueryDate = new Date().toISOString().split('T')[0];
      }

      // ✨ PREVENT INFINITE LOOP BLINKING: Only trigger fetch if parameters actually changed
      if (code !== lastTrackedCodeRef.current || urlQueryDate !== lastTrackedDateRef.current) {
        console.log(`🔄 [Parameter Shift Verified]: Updating from ${lastTrackedCodeRef.current} -> ${code}`);
        
        lastTrackedCodeRef.current = code;
        lastTrackedDateRef.current = urlQueryDate;
        
        setInvoiceCode(code);
        fetchLiveLedgerData(code, urlQueryDate);
      }
    };

    // ⚡ Wire up Telegram Native Viewport event listeners
    if (tg) {
      try {
        tg.onEvent('viewportChanged', () => {
          console.log("⚡ [Telegram UI Viewport Changed]");
          synchronizeCurrentUrlParams();
        });
      } catch (e) {}
    }

    // ⏱️ Safe Polling Loop Interceptor with explicit change guards
    const queryBackupSyncLoop = setInterval(() => {
      synchronizeCurrentUrlParams();
    }, 400);

    // Initial direct invocation run on component mount execution
    synchronizeCurrentUrlParams();

    // 🧹 Clean up hooks to drop interval duplicates on re-renders
    return () => {
      clearInterval(queryBackupSyncLoop);
      if (tg) {
        try {
          tg.offEvent('viewportChanged');
        } catch (e) {}
      }
    };
  }, []); // 💡 Keep array empty! It manages internal variables via safe pointers natively.

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