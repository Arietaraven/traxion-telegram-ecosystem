import React, { useEffect, useState, useRef } from 'react';
import InvoiceDetailView from './views/InvoiceDetailView';
import UniversalDetailView from './views/UniversalDetailView'; 
import InvoicePlaceholderView from './views/InvoicePlaceholderView';
import { FaqDetailView } from './views/FaqDetailView';
import { AdvisoryDetailView } from './views/AdvisoryDetailView'; // 🟢 INJECTED ADVISORY ENGINE IMPORT

export default function App() {
  const [invoiceCode, setInvoiceCode] = useState<string | null>(null);
  const [transactionsList, setTransactionsList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [faqId, setFaqId] = useState<string | null>(null);
  const [faqData, setFaqData] = useState<any | null>(null);

  // 🎯 NEW ADVISORY INTEGRATION STATE NODES
  const [advisoryId, setAdvisoryId] = useState<string | null>(null);
  const [advisoryData, setAdvisoryData] = useState<any | null>(null);

  const isFetchingRef = useRef(false);
  const lastTrackedCodeRef = useRef<string | null>(null);
  const lastTrackedDateRef = useRef<string | null>(null);
  const lastTrackedFaqIdRef = useRef<string | null>(null); 
  const lastTrackedAdvisoryIdRef = useRef<string | null>(null); // 🔒 Added Advisory ref tracking locking

  // 📡 ADVISORY LIVE DATA FETCHING ENGINE (Parses our live image metadata payloads)
  async function fetchSingleAdvisory(id: string) {
    setLoading(true);
    setApiError(null);
    try {
      const targetOrigin = window.location.origin;
      // Hits the backend route checking the Google Cloud Vision output state loops
      const response = await fetch(`${targetOrigin}/api/advisories/${id}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!response.ok) throw new Error("Requested advisory flyer file is missing or expired.");
      
      const payload = await response.json();
      setAdvisoryData(payload.data); 
    } catch (err: any) {
      setApiError(err.message || "Failed synchronization with live advisory storage arrays.");
    } finally {
      setLoading(false);
    }
  }

  // 📡 FAQ DATA FETCHING ENGINE
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
      const targetsToQuery = forcedCode.includes(',') ? forcedCode.split(',') : [forcedCode];
      const resolvedList: any[] = [];

      for (const singleTargetCode of targetsToQuery) {
        const cleanCode = singleTargetCode.trim();
        if (!cleanCode) continue;

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

          if (itemsBlock.length === 0) {
            resolvedList.push({ transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 });
            continue;
          }

          const processedItems = itemsBlock.map((item: any) => {
            if (!item) return { transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 };
            const txRefString = String(item.transactionReferenceNumber || '');
            const rawAmt = Number(item.transactionAmount || item.amount || 0);
            
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

          resolvedList.push(...processedItems);

        } catch (itemErr) {
          resolvedList.push({ transactionReferenceNumber: cleanCode, status: 'NOT FOUND', statusCode: 404 });
        }
      }

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

  // 🚀 UNIFIED INTERFACE PARSE LIFECYCLE
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
      const currentFaqId = params.get('faqId'); 
      const currentAdvisoryId = params.get('advisoryId'); // 🎯 READ ADVISORY URL HOOKS
      let urlQueryDate = params.get('date'); 
      
      if (!urlQueryDate) {
        urlQueryDate = new Date().toISOString().split('T')[0];
      }

      // Priority Multiplexer Routing Logic Matrix
      if (currentAdvisoryId) {
        if (currentAdvisoryId !== lastTrackedAdvisoryIdRef.current) {
          lastTrackedAdvisoryIdRef.current = currentAdvisoryId;
          lastTrackedFaqIdRef.current = null;
          lastTrackedCodeRef.current = null;

          setAdvisoryId(currentAdvisoryId);
          setFaqId(null);
          setInvoiceCode(null);
          fetchSingleAdvisory(currentAdvisoryId);
        }
      } else if (currentFaqId) {
        if (currentFaqId !== lastTrackedFaqIdRef.current) {
          lastTrackedFaqIdRef.current = currentFaqId;
          lastTrackedAdvisoryIdRef.current = null;
          lastTrackedCodeRef.current = null;

          setFaqId(currentFaqId);
          setAdvisoryId(null);
          setInvoiceCode(null);
          fetchSingleFaq(currentFaqId);
        }
      } else if (code !== lastTrackedCodeRef.current || urlQueryDate !== lastTrackedDateRef.current) {
        lastTrackedCodeRef.current = code;
        lastTrackedDateRef.current = urlQueryDate;
        lastTrackedFaqIdRef.current = null;
        lastTrackedAdvisoryIdRef.current = null;
        
        setFaqId(null);
        setAdvisoryId(null);
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

  const isStandardInvoiceTrace = invoiceCode ? /^\d{6}$/.test(invoiceCode) : true;
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
      ) : advisoryId && advisoryData ? (
        /* 🪐 1. RENDER ADVISORY SCREEN ROUTE */
        <AdvisoryDetailView 
          title={advisoryData.title}
          status={advisoryData.status}
          imageUrl={advisoryData.imageUrl}
          dateDescription={advisoryData.dateDescription}
        />
      ) : faqId && faqData ? (
        /* 🪐 2. RENDER FAQ SCREEN ROUTE */
        <FaqDetailView 
          category={faqData.category}
          keyword={faqData.keyword}
          question={faqData.question}
          answer={faqData.answer}
        />
      ) : transactionsList.length > 0 ? (
        /* 🪐 3. RENDER TRANSACTION LEDGER SCREEN ROUTE */
        isExplicitNotFound ? (
          <InvoiceDetailView transaction={transactionsList[0]} invoiceCode={invoiceCode} />
        ) : isStandardInvoiceTrace ? (
          transactionsList.map((txRecord, idx) => (
            <InvoiceDetailView 
              key={txRecord.transactionReferenceNumber || txRecord.referenceId || idx} 
              transaction={txRecord} 
              invoiceCode={invoiceCode} 
            />
          ))
        ) : (
          <UniversalDetailView transactions={transactionsList} invoiceCode={invoiceCode} />
        )
      ) : (
        /* 🪐 4. FALLBACK ENTRY PLACEHOLDER VIEW */
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