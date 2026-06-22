import React, { useEffect, useState, useRef } from 'react';
import InvoiceDetailView from './views/InvoiceDetailView';
import UniversalDetailView from './views/UniversalDetailView'; 
import InvoicePlaceholderView from './views/InvoicePlaceholderView';
import { FaqDetailView } from './views/FaqDetailView'; // 💡 Clean import injection for FAQ

export default function App() {
  const [invoiceCode, setInvoiceCode] = useState<string | null>(null);
  const [transactionsList, setTransactionsList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 🎯 New independent state nodes for FAQ integration strings
  const [faqId, setFaqId] = useState<string | null>(null);
  const [faqData, setFaqData] = useState<any | null>(null);

  // 🔒 Refs to safely handle multi-call lockouts without re-triggering component rendering loops
  const isFetchingRef = useRef(false);
  const lastTrackedCodeRef = useRef<string | null>(null);
  const lastTrackedDateRef = useRef<string | null>(null);
  const lastTrackedFaqIdRef = useRef<string | null>(null); // 🔒 Added FAQ block ref tracking

  // 📡 FAQ DATA FETCHING ENGINE (Safe independent retrieval sequence)
  async function fetchSingleFaq(id: string) {
    setLoading(true);
    setApiError(null);
    try {
      const targetOrigin = window.location.origin;
      const response = await fetch(`${targetOrigin}/api/faqs/${id}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!response.ok) throw new Error("Requested FAQ documentation card is missing.");
      
      const payload = await response.json();
      setFaqData(payload.data);
    } catch (err: any) {
      setApiError(err.message || "Failed synchronization with technical assets library.");
    } finally {
      setLoading(false);
    }
  }

  // 📡 BATCH THROTTLED DATA ROUTING ENGINE
  async function fetchLiveLedgerData(forcedCode: string | null, forcedDate: string | null) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

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

      // Unpack string elements separated by commas back into an individual lookup array
      const targetsToQuery = forcedCode.includes(',') 
        ? forcedCode.split(',') 
        : [forcedCode];

      console.log(`📡 [Frontend Core Sync]: Dispatching sequential lookups for ${targetsToQuery.length} reference targets.`);

      const resolvedList: any[] = [];

      // ⏱️ Anti-Throttle Sequential Looper: Avoids 429 errors from bursting endpoints simultaneously
      for (const singleTargetCode of targetsToQuery) {
        const cleanCode = singleTargetCode.trim();
        if (!cleanCode) continue;

        // Introduce a subtle 150ms delay between fetches to respect Redis/Gateway rate limits
        if (targetsToQuery.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        try {
          let response;
          if (/^\d{6}$/.test(cleanCode)) {
            response = await fetch(`${targetOrigin}/transactions/details/instapay/trace?date=${forcedDate}&traceNumber=${encodeURIComponent(cleanCode)}`, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
          } else {
            response = await fetch(`${targetOrigin}/transactions/details/${encodeURIComponent(cleanCode)}`, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
          }

          if (!response.ok) {
            resolvedList.push({ transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 });
            continue;
          }

          const rootPayload = await response.json();
          const workingData = rootPayload.data;

          if (!workingData) {
            resolvedList.push({ transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 });
            continue;
          }

          // 📥 ✨ UNPACK ENTIRE DATA LIST: Extract and normalize collections without losing index entries
          let itemsBlock: any[] = [];
          if (Array.isArray(workingData)) {
            itemsBlock = workingData;
          } else if (workingData.data && Array.isArray(workingData.data)) {
            itemsBlock = workingData.data;
          } else if (workingData.list && Array.isArray(workingData.list)) {
            itemsBlock = workingData.list;
          } else {
            itemsBlock = [workingData];
          }

          // If the unpacked collection is empty, treat it as a structural lookup drop
          if (itemsBlock.length === 0) {
            resolvedList.push({ transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 });
            continue;
          }

          // Run evaluation filters over each element inside this clean extracted sub-array block
          const processedItems = itemsBlock.map((item: any) => {
            if (!item) return { transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 };

            const txRefString = String(item.transactionReferenceNumber || '');
            const rawAmt = Number(item.transactionAmount || item.amount || 0);
            
            // Mask dummy backend database placeholder objects cleanly
            if (txRefString.startsWith('FALLBACK-') && rawAmt === 0) {
              return {
                ...item,
                transactionReferenceNumber: cleanCode, 
                status: 'NOT FOUND', 
                statusCode: 404
              };
            }
            return item;
          });

          // 🚀 FIX: Flatten and append the ENTIRE processed array subset into our layout queue stack!
          resolvedList.push(...processedItems);

        } catch (itemErr) {
          resolvedList.push({ transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 });
        }
      }

      // Filter out any unintended null references from our clean map array list
      const cleanFinalizedList = resolvedList.filter(item => item !== null);
      setTransactionsList(cleanFinalizedList);

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

    const synchronizeCurrentUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const currentFaqId = params.get('faqId'); // 🎯 Read FAQ parameters safely
      let urlQueryDate = params.get('date'); 
      
      if (!urlQueryDate) {
        urlQueryDate = new Date().toISOString().split('T')[0];
      }

      // Check parameter matching paths cleanly without shifting reference triggers out of timing bounds
      if (currentFaqId) {
        if (currentFaqId !== lastTrackedFaqIdRef.current) {
          lastTrackedFaqIdRef.current = currentFaqId;
          setFaqId(currentFaqId);
          setInvoiceCode(null);
          fetchSingleFaq(currentFaqId);
        }
      } else if (code !== lastTrackedCodeRef.current || urlQueryDate !== lastTrackedDateRef.current) {
        lastTrackedCodeRef.current = code;
        lastTrackedDateRef.current = urlQueryDate;
        lastTrackedFaqIdRef.current = null;
        
        setFaqId(null);
        setInvoiceCode(code);
        fetchLiveLedgerData(code, urlQueryDate);
      }
    };

    if (tg) {
      try {
        tg.onEvent('viewportChanged', () => {
          synchronizeCurrentUrlParams();
        });
      } catch (e) {}
    }

    const queryBackupSyncLoop = setInterval(() => {
      synchronizeCurrentUrlParams();
    }, 400);

    synchronizeCurrentUrlParams();

    return () => {
      clearInterval(queryBackupSyncLoop);
      if (tg) {
        try {
          tg.offEvent('viewportChanged');
        } catch (e) {}
      }
    };
  }, []);

  // Standard short lookups route to single Invoice Views
  const isStandardInvoiceTrace = invoiceCode ? /^\d{6}$/.test(invoiceCode) : true;

  // Intercept if the specific target element represents a missing data frame placeholder item
  const isExplicitNotFound = transactionsList[0]?.status === 'NOT FOUND' || transactionsList[0]?.statusCode === 404;

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
      ) : faqId && faqData ? (
        /* 🪐 RENDER THE TARGET FAQ MANUAL COMPONENT POPUP MODAL SCREEN */
        <FaqDetailView 
          category={faqData.category}
          keyword={faqData.keyword}
          question={faqData.question}
          answer={faqData.answer}
        />
      ) : transactionsList.length > 0 ? (
        isExplicitNotFound ? (
          // Render a clean Transaction Not Found Card Frame
          <InvoiceDetailView 
            transaction={transactionsList[0]} 
            invoiceCode={invoiceCode} 
          />
        ) : isStandardInvoiceTrace ? (
          // 🪐 Renders multiple invoice cards smoothly if multiple matches are bound to this 6-digit trace code!
          transactionsList.map((txRecord, idx) => (
            <InvoiceDetailView 
              key={txRecord.transactionReferenceNumber || txRecord.referenceId || idx} 
              transaction={txRecord} 
              invoiceCode={invoiceCode} 
            />
          ))
        ) : (
          /* Route down to our bulk universal scrolling list interface */
          <UniversalDetailView 
            transactions={transactionsList} 
            invoiceCode={invoiceCode} 
          />
        )
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