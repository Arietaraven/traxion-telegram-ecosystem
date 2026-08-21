import express from 'express';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path'; 
import CryptoJS from 'crypto-js';
import { google } from 'googleapis';
import base32Decode from 'base32-decode';
import { createWorker } from 'tesseract.js';
import { Telegraf, Markup } from 'telegraf';
import { db } from '../src/config/database'; // Ensure your database file handles the new sqlite export wrapper
import { redis } from '../src/config/redis';
import { HARDCODED_FAQS } from './constants/faqData';
import { getMainMenu } from './telegram/menu';
import { initAdvisoryCron } from './workers/advisorySync';
import { checkRateLimit } from './middlewares/rateLimiter';

// 🚀 FIXED PATH DIRECTIVE: Looks inside the backend folder container dynamically
const backendFolder = path.resolve(__dirname, '..'); 
dotenv.config({ path: path.join(backendFolder, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// 🚀 UNIFIED VARIABLE SYNCHRONIZATION: Maps dynamically from .env with a fallback layout
const CURRENT_ACTIVE_NGROK = process.env.NGROK_URL || 'https://possible-buckwheat-abrasion.ngrok-free.dev';

console.log('📌 [Config Sync]: Active Tunnel Domain:', CURRENT_ACTIVE_NGROK);

// Production Traxion Gateway Core Variables Configuration
const TRAXION_BASE_URL = 'https://api.traxionpay.com';
const REDIS_TOKEN_KEY = 'traxion:session:access_token';
const REDIS_SECRET_KEY = 'traxion:session:secret_key';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// =========================================================================
// 🚀 UNIFIED FRONTEND INTERFACE MATRIX (PRODUCTION DIST ENGINE)
// =========================================================================


// Start the background cron sync service immediately on application boot
initAdvisoryCron();
console.log('⚙️ Background task processing runners active.');


// =========================================================================
// 🔒 CRYPTOGRAPHIC UTILITY BUFFER FUNCTIONS (POSTMAN EQUIVALENCE MATRIX)
// =========================================================================

const wordBufferStringify = (wordArray: any): Uint8Array => {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return u8;
};

const wordBufferParse = (u8arr: Uint8Array): any => {
  const len = u8arr.length;
  const words: number[] = [];
  for (let i = 0; i < len; i++) {
    words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, len);
};

/**
 * Generates the live 6-digit rolling TOTP code matching Postman's cryptographic engine exactly
 */
function generateRollingTOTP(secretKey: string, customTimestamp: number): string {
  const timeSec = Math.floor(customTimestamp / 1000);
  const intervalHex = Math.floor(timeSec / 30).toString(16).padStart(16, "0");
  
  // Base32 Decodes the key using standard RFC4648 structure parameters
  const decodedRaw = base32Decode(secretKey, 'RFC4648');
  const decodedBytes = new Uint8Array(decodedRaw);
  
  const parsedInterval = CryptoJS.enc.Hex.parse(intervalHex);
  const parsedSecret = wordBufferParse(decodedBytes);
  
  const hmacDigestBytes = CryptoJS.HmacSHA1(parsedInterval, parsedSecret);
  const digest = wordBufferStringify(hmacDigestBytes);
  
  const offset = digest[19] & 0xf;
  const binaryValue =
    ((digest[offset] & 0x7f) << 24) +
    (digest[offset + 1] << 16) +
    (digest[offset + 2] << 8) +
    (digest[offset + 3]);
    
  return (binaryValue % 1000000).toString().padStart(6, "0");
}

// =========================================================================

/**
 * 🔒 Internal Core Helper: Resolves non-expired token states via Redis or launches background login
 */
async function getValidSessionToken(): Promise<{ accessToken: string; secretKey: string }> {
  try {
    // Check local memory cache parameters first
    const cachedToken = await redis.get(REDIS_TOKEN_KEY);
    const cachedSecret = await redis.get(REDIS_SECRET_KEY);
    
    if (cachedToken && cachedSecret) {
      return { accessToken: cachedToken, secretKey: cachedSecret };
    }

    console.log('🔑 [Auth Engine]: Session missing or expired. Initializing token handshake...');

    const masterSecret = "HCFQQARAAHRGMYDK";
    const clientTimestamp = Date.now();
    const rollingOtp = generateRollingTOTP(masterSecret, clientTimestamp);

    const rawPlainBody = JSON.stringify({
      username: "opstestaccount01@traxionpay.com",
      userPassword: "Tb9GREZe*MGdT&eu",
      passwordType: 1
    });

    const encryptedBodyString = CryptoJS.AES.encrypt(rawPlainBody, rollingOtp).toString();

    const authResponse = await axios.post(
      `${TRAXION_BASE_URL}/auth/login`, 
      { data: encryptedBodyString },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Client-Timestamp': String(clientTimestamp),
          'User-Agent': 'PostmanRuntime/7.43.0',
          'Connection': 'keep-alive'
        }
      }
    );

    const rootEncryptedPayload = authResponse.data;
    const serverResponseTimestamp = authResponse.headers['x-server-timestamp'];
    
    if (!rootEncryptedPayload || !rootEncryptedPayload.data) {
      throw new Error("Gateway tracking payload structure returned completely unparseable or empty.");
    }

    const responseOtp = generateRollingTOTP(masterSecret, Number(serverResponseTimestamp));
    const bytesDecrypted = CryptoJS.AES.decrypt(rootEncryptedPayload.data, responseOtp);
    const parsedPlaintextString = bytesDecrypted.toString(CryptoJS.enc.Utf8);
    
    if (!parsedPlaintextString) {
      throw new Error("Unable to successfully decrypt the gateway payload response structure envelope.");
    }

    const cleanJsonResponse = JSON.parse(parsedPlaintextString);

    if (cleanJsonResponse && cleanJsonResponse.code == '220022' && cleanJsonResponse.data?.accessToken) {
      const freshToken = cleanJsonResponse.data.accessToken;
      const freshSecret = cleanJsonResponse.data.secretKey || "BCEKLKEDLCJKQPAN"; 

      // Cache both fields together cleanly in Redis memory
      await redis.setex(REDIS_TOKEN_KEY, 2700, freshToken);
      await redis.setex(REDIS_SECRET_KEY, 2700, freshSecret);
      
      console.log('✅ [Auth Engine]: Token context and Secret Matrix synchronized and cached in Redis memory.');
      return { accessToken: freshToken, secretKey: freshSecret };
    }

    throw new Error(cleanJsonResponse?.message || `Gateway returned error code: ${cleanJsonResponse?.code}`);
  } catch (error: any) {
    if (error.response?.data?.data) {
      try {
        const masterSecret = "HCFQQARAAHRGMYDK";
        const serverErrTimestamp = error.response.headers['x-server-timestamp'];
        const errOtp = generateRollingTOTP(masterSecret, Number(serverErrTimestamp));
        const decBytes = CryptoJS.AES.decrypt(error.response.data.data, errOtp);
        const plainErr = JSON.parse(decBytes.toString(CryptoJS.enc.Utf8));
        console.error('❌ [Auth Engine Gateway Decrypted Error Context]:', plainErr);
        throw new Error(`Gateway Error: ${plainErr.message || plainErr.code}`);
      } catch (inner) {}
    }

    const errorDetails = error.response?.data || error.message;
    console.error('❌ [Auth Engine Detailed Failure Dump]:', errorDetails);
    throw new Error(`Authentication Engine Failure: ${error.message}`);
  }
}

/**
 * 🛰️ Postman API Route B: Direct Instapay Trace Scanner Module (Adaptive Production Core)
 */
app.get('/transactions/details/instapay/trace', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { date, traceNumber } = req.query;

  if (!traceNumber) {
    return res.status(404).json({ message: "Trace number parameter tracking index is required." });
  }

  try {
    // 🏢 PHASE 1: Scan local SQLite file database warehouse cache first
    const localDatabaseCheck = await db.query(
      'SELECT * FROM cached_transactions WHERE trace_number = $1 ORDER BY date_time_created DESC',
      [String(traceNumber)]
    );

    if (localDatabaseCheck.rows.length > 0) {
      console.log(`💾 [Database Cache Hit]: Serving ${localDatabaseCheck.rows.length} transaction(s) from local cache.`);
      
      const mappedCollection = localDatabaseCheck.rows.map((cachedRecord: any) => ({
        id: String(cachedRecord.id),
        transactionReferenceNumber: cachedRecord.transaction_reference,
        integratorReferenceNumber: cachedRecord.integrator_reference,
        aggregatorReferenceNumber: cachedRecord.aggregator_reference,
        transactionAmount: String(cachedRecord.amount),
        transactionFee: Number(cachedRecord.fee),
        status: cachedRecord.status,
        remarks: cachedRecord.remarks,
        dateTimeCreated: cachedRecord.date_time_created,
        dateTimeStatusUpdated: cachedRecord.date_time_updated
      }));

      return res.json({
        code: 200000,
        message: "Transaction details fetched successfully.",
        data: mappedCollection
      });
    }

    // 🛡️ Guard against known invalid reference attacks
    const redisNegativeCacheKey = `negative:txn:${traceNumber}`;
    const isKnownInvalid = await redis.get(redisNegativeCacheKey);
    
    if (isKnownInvalid === 'NOT_FOUND') {
      console.log(`🛡️ [Redis Guard Hit]: Blocking expensive lookup for known invalid trace: ${traceNumber}`);
      
      return res.json({
        code: 200000,
        message: "Transaction details fetched successfully.",
        data: [{
          transactionReferenceNumber: String(traceNumber),
          integratorReferenceNumber: '---',
          aggregatorReferenceNumber: '---',
          transactionAmount: 0,
          transactionFee: 0,
          status: -1,
          remarks: "Reference target entry not identified inside ledger streams. (Cached Rejection)",
          description: "Failed Lookup Entry",
          dateTimeCreated: new Date().toISOString(),
          dateTimeStatusUpdated: new Date().toISOString()
        }]
      });
    }

    // 📅 PHASE 2: Date Format Normalization Matrix
    const rawDateStr = String(date || '').replace(/-/g, ''); 
    let dateFormatsToTry: string[] = [];
    let fallbackAnchorDate = new Date(); 

    if (rawDateStr.length === 8) {
      const yyyy = rawDateStr.substring(0, 4);
      const mm = rawDateStr.substring(4, 6);
      const dd = rawDateStr.substring(6, 8);

      const parsedYear = parseInt(yyyy, 10);
      const parsedMonth = parseInt(mm, 10) - 1;
      const parsedDay = parseInt(dd, 10);
      if (!isNaN(parsedYear) && !isNaN(parsedMonth) && !isNaN(parsedDay)) {
        fallbackAnchorDate = new Date(Date.UTC(parsedYear, parsedMonth, parsedDay, 12, 0, 0));
      }

      dateFormatsToTry = [
        `${yyyy}-${mm}-${dd}`, 
        rawDateStr,            
        `${dd}-${mm}-${yyyy}`  
      ];
    } else {
      dateFormatsToTry = [String(date || '')];
      if (date) {
        const structuralParsedDate = new Date(String(date));
        if (!isNaN(structuralParsedDate.getTime())) {
          fallbackAnchorDate = structuralParsedDate;
        }
      }
    }

    let extractedTransactionsList: any[] = [];
    
    // 🔑 FETCH LIVE ACTIVE SESSION DATA MATRIX
    const sessionContext: any = await getValidSessionToken();

    const bearerToken = (typeof sessionContext === 'object' ? sessionContext.accessToken : sessionContext) || "";
    const systemSecretSeed = (typeof sessionContext === 'object' && sessionContext.secretKey) ? sessionContext.secretKey : "BCEKLKEDLCJKQPAN";

    console.log('🔄 [Route Sync]: Active session variables bounded successfully.');

    // Loop through formats against the live production gateway engine
    for (const targetedDateFormat of dateFormatsToTry) {
      try {
        console.log(`📡 [API Request]: Querying Production API for Trace #${traceNumber} using Date: ${targetedDateFormat}`);
        
        const finalRequestUrl = `${TRAXION_BASE_URL}/transactions/details/instapay/trace?date=${targetedDateFormat}&traceNumber=${String(traceNumber)}`;
        
        const productionResponse = await axios.get(finalRequestUrl, {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          validateStatus: () => true 
        });

        let payloadData = productionResponse.data;
        const serverResponseTimestamp = productionResponse.headers['x-server-timestamp'] || productionResponse.headers['X-Server-Timestamp'];

        // 🔓 PHASE 3: Realtime Time-Based OTP Handshake Decryption Matrix
        if (payloadData && typeof payloadData.data === 'string' && payloadData.data.startsWith('U2FsdGVkX1')) {
          
          let plainTextJsonString = "";
          const secretSeedsToTry = [systemSecretSeed, "EWSXREMVLJHWXJXU"]; 
          const candidateTimes: number[] = [];

          if (serverResponseTimestamp) {
            candidateTimes.push(Number(serverResponseTimestamp));
          }

          const historicalLookbackDays = [0, 1, 2, 3, 7, 14, 21, 30];
          
          for (const dayOffset of historicalLookbackDays) {
            const historicalTargetDate = new Date(fallbackAnchorDate.getTime());
            historicalTargetDate.setUTCDate(historicalTargetDate.getUTCDate() - dayOffset);

            const matrixYear = historicalTargetDate.getUTCFullYear();
            const matrixMonth = historicalTargetDate.getUTCMonth();
            const matrixDay = historicalTargetDate.getUTCDate();

            for (let hourWindow = 0; hourWindow < 24; hourWindow += 2) {
              candidateTimes.push(new Date(Date.UTC(matrixYear, matrixMonth, matrixDay, hourWindow, 0, 0)).getTime());
            }
          }

          candidateTimes.push(Date.now());

          const expandedTimeMatrix: number[] = [];
          for (const marker of candidateTimes) {
            expandedTimeMatrix.push(marker, marker - 1000, marker + 1000);
          }

          const distinctDecryptionTimeMatrix = [...new Set(expandedTimeMatrix)];

          console.log(`🔄 [Crypto Sync]: Evaluating ${distinctDecryptionTimeMatrix.length} candidate windows using auto-fetched keys...`);

          outerMatrixLoop: 
          for (const currentSecret of secretSeedsToTry) {
            for (const calculatedTimestamp of distinctDecryptionTimeMatrix) {
              try {
                const calculatedDecryptionOtp = generateRollingTOTP(currentSecret, calculatedTimestamp);
                const bytesDecrypted = CryptoJS.AES.decrypt(payloadData.data, calculatedDecryptionOtp);
                const testString = bytesDecrypted.toString(CryptoJS.enc.Utf8);
                
                if (testString && testString.trim().length > 0) {
                  const trimmedTest = testString.trim();
                  if ((trimmedTest.startsWith('{') && trimmedTest.endsWith('}')) || 
                      (trimmedTest.startsWith('[') && trimmedTest.endsWith(']'))) {
                    
                    plainTextJsonString = testString;
                    console.log(`🔓 [Crypto Engine Sync Success]: Unlocked using seed [${currentSecret}] at timestamp: ${calculatedTimestamp}`);
                    break outerMatrixLoop; 
                  }
                }
              } catch (innerCryptoError) {}
            }
          }

          if (plainTextJsonString) {
            payloadData.data = JSON.parse(plainTextJsonString);
          } else {
            console.error("❌ [Crypto Engine Matrix Exhausted]: Decryption failed across all variations.");
            continue; 
          }
        }

        let innerDataBlock = payloadData?.data;
        let localExtractedList: any[] = [];

        if (innerDataBlock) {
          if (Array.isArray(innerDataBlock)) {
            localExtractedList = innerDataBlock;
          } 
          else if (innerDataBlock.list && Array.isArray(innerDataBlock.list)) {
            localExtractedList = innerDataBlock.list;
          } 
          else if (innerDataBlock.data && Array.isArray(innerDataBlock.data)) {
            localExtractedList = innerDataBlock.data;
          }
          else if (typeof innerDataBlock === 'object') {
            localExtractedList = [innerDataBlock];
          }
        }

        if (localExtractedList.length > 0 && localExtractedList[0] && !localExtractedList[0].error) {
          extractedTransactionsList = localExtractedList;
          console.log(`✅ [Adaptive Processing Match]: Successfully parsed ${extractedTransactionsList.length} records.`);
          break;
        }

      } catch (loopError: any) {
        console.warn(`⚠️ [Format Check Notice]: Date format ${targetedDateFormat} dropped out: ${loopError.message}`);
      }
    }

    // MULTI-RECORD DATABASE CACHE PERSISTENCE
    if (extractedTransactionsList.length > 0) {
      console.log(`📝 [Database Writer Engine]: Caching ${extractedTransactionsList.length} production records into local storage.`);
      
      for (const targetItem of extractedTransactionsList) {
        if (targetItem) {
          try {
            let computedStatus = 0;
            let invoiceStatusText = 'Pending';

            if (targetItem.status !== undefined && targetItem.status !== null) {
              const statusStr = String(targetItem.status).toUpperCase();
              if (targetItem.status === 1 || statusStr === 'SUCCESSFUL' || statusStr === 'PAID' || statusStr === 'SUCCESS') {
                computedStatus = 1;
                invoiceStatusText = 'Successful';
              } else if (targetItem.status === -1 || statusStr === 'FAILED' || statusStr === 'DECLINED') {
                computedStatus = -1;
                invoiceStatusText = 'Failed';
              }
            }

            const uniqueTxRef = targetItem.transactionReferenceNumber || targetItem.referenceId || `FALLBACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const rawAmountInput = targetItem.transactionAmount ?? targetItem.amount ?? 0;
            const finalAmountDecimal = (typeof rawAmountInput === 'string' ? parseInt(rawAmountInput, 10) : Number(rawAmountInput)) / 100;

            await db.query(
              `INSERT OR IGNORE INTO cached_transactions (
                trace_number, transaction_reference, integrator_reference, aggregator_reference, 
                amount, fee, status, remarks, date_time_created, date_time_updated
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                String(traceNumber),
                uniqueTxRef,
                targetItem.integratorReferenceNumber || null,
                targetItem.aggregatorReferenceNumber || null,
                targetItem.transactionAmount || targetItem.amount || 0,
                targetItem.transactionFee || targetItem.fee || 0,
                computedStatus,
                targetItem.remarks || null,
                targetItem.dateTimeCreated ? new Date(targetItem.dateTimeCreated).toISOString() : null,
                targetItem.dateTimeStatusUpdated ? new Date(targetItem.dateTimeStatusUpdated).toISOString() : null
              ]
            );

            await db.query(
              `INSERT OR IGNORE INTO invoices (
                invoice_code, amount, merchant_name, status, reference_number, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                String(traceNumber),
                finalAmountDecimal,
                targetItem.description || 'InstaPay Cashout',
                invoiceStatusText,
                uniqueTxRef,
                targetItem.dateTimeCreated ? new Date(targetItem.dateTimeCreated).toISOString() : new Date().toISOString()
              ]
            );

          } catch (dbError: any) {
            console.error("⚠️ [Database Cache Insertion Exception]:", dbError.message);
          }
        }
      }
      
      return res.json({
        code: 200000,
        message: "Transaction details fetched successfully.",
        data: extractedTransactionsList
      });

    } else {
      console.warn(`⚠️ [Backend Security Sync]: API returned no matching collection for trace: ${traceNumber}`);
      await redis.setex(redisNegativeCacheKey, 300, 'NOT_FOUND');

      return res.json({
        code: 200000,
        message: "Transaction details fetched successfully.",
        data: [{
          transactionReferenceNumber: String(traceNumber),
          integratorReferenceNumber: '---',
          aggregatorReferenceNumber: '---',
          transactionAmount: 0,
          transactionFee: 0,
          status: -1,
          remarks: "Reference target entry not identified inside ledger streams.",
          description: "Failed Lookup Entry",
          dateTimeCreated: new Date().toISOString(),
          dateTimeStatusUpdated: new Date().toISOString()
        }]
      });
    }

  } catch (err: any) {
    console.error('❌ [Live Instapay Trace Endpoint Failure]:', err.message);
    return res.status(500).json({ code: 500000, message: `Internal server error: ${err.message}`, data: [] });
  }
});

// =========================================================================
// 🛰️ Postman API Route A: Universal Wildcard Reference Search Router
// =========================================================================
app.get('/transactions/details/:referenceId', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { referenceId } = req.params;
  
  const referenceList = String(referenceId)
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  if (referenceList.length === 0) {
    return res.status(400).json({ code: 400000, message: "No valid reference keys targeted.", data: [] });
  }

  const verifiedReferenceQueue: string[] = [];
  const batchResultsCollection: any[] = [];

  for (const ref of referenceList) {
    const redisNegativeCacheKey = `negative:txn:${ref}`;
    const isKnownInvalid = await redis.get(redisNegativeCacheKey);
    
    if (isKnownInvalid === 'NOT_FOUND') {
      console.log(`🛡️ [Redis Guard Hit]: Dropping known invalid item from active search queue: ${ref}`);
      batchResultsCollection.push({
        transactionReferenceNumber: ref,
        integratorReferenceNumber: '---',
        aggregatorReferenceNumber: '---',
        transactionAmount: 0,
        transactionFee: 0,
        status: -1,
        remarks: "Reference target entry not identified inside ledger streams. (Cached Rejection)",
        description: "Failed Lookup Entry",
        dateTimeCreated: new Date().toISOString(),
        dateTimeStatusUpdated: new Date().toISOString()
      });
    } else {
      verifiedReferenceQueue.push(ref);
    }
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const sessionContext: any = await getValidSessionToken(); 
    const bearerToken = (typeof sessionContext === 'object' ? sessionContext.accessToken : sessionContext) || "";
    const dynamicSecretSeed = (typeof sessionContext === 'object' && sessionContext.secretKey) ? sessionContext.secretKey : "BCEKLKEDLCJKQPAN";

    for (const cleanReferenceId of verifiedReferenceQueue) {
      const redisNegativeCacheKey = `negative:txn:${cleanReferenceId}`;
      let retryCount = 0;
      const maxRetries = 3;
      let successfullyProcessedItem = false;

      while (retryCount < maxRetries && !successfullyProcessedItem) {
        try {
          await delay(250);

          const productionResponse = await axios.get(`${TRAXION_BASE_URL}/transactions/details/${encodeURIComponent(cleanReferenceId)}`, {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            validateStatus: (status) => (status >= 200 && status < 300) || status === 429
          });

          if (productionResponse.status === 429) {
            retryCount++;
            const backoffTime = retryCount * 500; 
            console.warn(`⚠️ [Batch Rate Limit]: HTTP 429 on reference ${cleanReferenceId}. Cooling down for ${backoffTime}ms...`);
            await delay(backoffTime);
            continue; 
          }

          let payloadData = productionResponse.data;
          const serverResponseTimestamp = productionResponse.headers['x-server-timestamp'] || productionResponse.headers['X-Server-Timestamp'];

          if (payloadData && typeof payloadData.data === 'string') {
            let cleanCiphertext = payloadData.data.trim();

            if (cleanCiphertext.startsWith('"') && cleanCiphertext.endsWith('"')) {
              cleanCiphertext = cleanCiphertext.substring(1, cleanCiphertext.length - 1);
            }

            if (cleanCiphertext.includes('U2FsdGVkX1')) {
              let plainTextJsonString = "";
              const candidateTimes: number[] = [];
              
              if (serverResponseTimestamp) {
                candidateTimes.push(Number(serverResponseTimestamp));
              }
              
              if (cleanReferenceId.length >= 8) {
                const year = parseInt(cleanReferenceId.substring(0, 4), 10);
                const month = parseInt(cleanReferenceId.substring(4, 6), 10) - 1;
                const day = parseInt(cleanReferenceId.substring(6, 8), 10);
                
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                  candidateTimes.push(new Date(Date.UTC(year, month, day, 12, 0, 0)).getTime());
                  candidateTimes.push(new Date(Date.UTC(year, month, day - 1, 12, 0, 0)).getTime());
                  candidateTimes.push(new Date(Date.UTC(year, month, day - 1, 16, 0, 0)).getTime());
                }
              }
              
              candidateTimes.push(Date.now());

              const comprehensiveTimeMatrix: number[] = [];
              for (const baseTime of candidateTimes) {
                comprehensiveTimeMatrix.push(baseTime, baseTime - 1000, baseTime + 1000);
              }

              for (const targetTimestamp of comprehensiveTimeMatrix) {
                try {
                  const calculatedDecryptionOtp = generateRollingTOTP(dynamicSecretSeed, targetTimestamp);
                  const bytesDecrypted = CryptoJS.AES.decrypt(cleanCiphertext, calculatedDecryptionOtp);
                  const testString = bytesDecrypted.toString(CryptoJS.enc.Utf8);
                  
                  if (testString && testString.trim().length > 0) {
                    plainTextJsonString = testString;
                    console.log(`🔓 [Crypto Engine Sync]: Decryption success via epoch offset: ${targetTimestamp}`);
                    break;
                  }
                } catch (innerCryptoErr) {}
              }
              
              if (plainTextJsonString) {
                payloadData.data = JSON.parse(plainTextJsonString);
              } else {
                throw new Error("Dynamic key window desynchronization. Decrypted bytes rejected.");
              }
            }
          }

          let innerDataBlock = payloadData?.data;
          let rawItemsArray: any[] = [];

          if (innerDataBlock) {
            if (Array.isArray(innerDataBlock)) {
              rawItemsArray = innerDataBlock;
            } else if (innerDataBlock.list && Array.isArray(innerDataBlock.list)) {
              rawItemsArray = innerDataBlock.list;
            } else if (innerDataBlock.data) {
              rawItemsArray = Array.isArray(innerDataBlock.data) ? innerDataBlock.data : [innerDataBlock.data];
            } else if (typeof innerDataBlock === 'object') {
              rawItemsArray = [innerDataBlock];
            }
          }

          if (rawItemsArray.length > 0) {
            for (const extractedItem of rawItemsArray) {
              const incomingAmount = extractedItem.transactionAmount ?? extractedItem.amount ?? 0;
              const incomingFee = extractedItem.transactionFee ?? extractedItem.fee ?? 0;

              const finalAmountPeso = parseFloat(String(incomingAmount));
              const finalFeePeso = parseFloat(String(incomingFee));

              let normalStatus = 0;
              const checkStr = String(extractedItem.status ?? '').toUpperCase();
              
              if (checkStr === '1' || checkStr === 'SUCCESSFUL' || checkStr === 'SUCCESS' || checkStr === 'PAID') {
                normalStatus = 1;
              } else if (checkStr === '-1' || checkStr === 'FAILED' || checkStr === 'DECLINED') {
                normalStatus = -1;
              }

              const cleanTxRef = extractedItem.transactionReferenceNumber || extractedItem.referenceId || cleanReferenceId;

              try {
                await db.query(
                  `INSERT OR IGNORE INTO cached_transactions (
                    trace_number, transaction_reference, integrator_reference, aggregator_reference, 
                    amount, fee, status, remarks, date_time_created, date_time_updated
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                  [
                    cleanReferenceId,
                    cleanTxRef,
                    extractedItem.integratorReferenceNumber || '---',
                    extractedItem.aggregatorReferenceSegment || extractedItem.aggregatorReferenceNumber || '---',
                    incomingAmount,
                    incomingFee,
                    normalStatus,
                    extractedItem.remarks || extractedItem.description || null,
                    extractedItem.dateTimeCreated || extractedItem.created_at || new Date().toISOString(),
                    extractedItem.dateTimeStatusUpdated || extractedItem.updated_at || new Date().toISOString()
                  ]
                );
              } catch (cacheErr: any) {
                console.error("⚠️ [Universal Cache Write Error]:", cacheErr.message);
              }

              batchResultsCollection.push({
                transactionReferenceNumber: cleanTxRef,
                integratorReferenceNumber: extractedItem.integratorReferenceNumber || '---',
                aggregatorReferenceNumber: extractedItem.aggregatorReferenceSegment || extractedItem.aggregatorReferenceNumber || '---',
                transactionAmount: isNaN(finalAmountPeso) ? 0 : finalAmountPeso,
                transactionFee: isNaN(finalFeePeso) ? 0 : finalFeePeso,
                status: normalStatus,
                remarks: extractedItem.remarks || extractedItem.description || null,
                description: extractedItem.description || extractedItem.remarks || 'Universal Ledger Registry Query',
                dateTimeCreated: extractedItem.dateTimeCreated || extractedItem.created_at || new Date().toISOString(),
                dateTimeStatusUpdated: extractedItem.dateTimeStatusUpdated || extractedItem.updated_at || new Date().toISOString()
              });
            }
          } else {
            await redis.setex(redisNegativeCacheKey, 300, 'NOT_FOUND');

            batchResultsCollection.push({
              transactionReferenceNumber: cleanReferenceId,
              integratorReferenceNumber: '---',
              aggregatorReferenceNumber: '---',
              transactionAmount: 0,
              transactionFee: 0,
              status: -1,
              remarks: "Reference target entry not identified inside ledger streams.",
              description: "Failed Lookup Entry",
              dateTimeCreated: new Date().toISOString(),
              dateTimeStatusUpdated: new Date().toISOString()
            });
          }

          successfullyProcessedItem = true; 

        } catch (singleLoopErr: any) {
          console.warn(`⚠️ Batch row skip exception handled for index: ${cleanReferenceId} -> ${singleLoopErr.message}`);
          await redis.setex(redisNegativeCacheKey, 300, 'NOT_FOUND');

          batchResultsCollection.push({
            transactionReferenceNumber: cleanReferenceId,
            integratorReferenceNumber: '---',
            aggregatorReferenceNumber: '---',
            transactionAmount: 0,
            transactionFee: 0,
            status: -1,
            remarks: singleLoopErr.message || "Failed execution pipeline runtime error.",
            description: "Exception Record",
            dateTimeCreated: new Date().toISOString(),
            dateTimeStatusUpdated: new Date().toISOString()
          });
          successfullyProcessedItem = true; 
        }
      } 
    }

    return res.json({
      code: 200000,
      message: `Successfully completed ledger scanning parameters execution matrix tracking loops.`,
      data: batchResultsCollection
    });

  } catch (err: any) {
    console.error('❌ [Live Reference Identifier Endpoint Failure]:', err.message);
    const codeStatus = err.response?.status || 500;
    return res.status(codeStatus).json({ 
      code: 404000, 
      message: "Failed locating reference sequences collection in system infrastructure logs.",
      data: []
    });
  }
});

// =========================================================================
// 🛰️ Postman API Route C: Single FAQ Record Detail Fetcher (⚡ HARDCODED ENGINE)
// =========================================================================
app.get('/api/faqs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const cleanIdString = String(id).replace(/[\r\n]/g, '').trim();
    const cleanId = parseInt(cleanIdString, 10);

    if (isNaN(cleanId)) {
      return res.status(400).json({ 
        code: 400000, 
        message: `Malformed parameters: Incoming ID value "${id.replace(/[\r\n]/g, '\\r')}" could not be parsed as a valid integer.` 
      });
    }

    const matchedFaq = HARDCODED_FAQS.find(faq => faq.id === cleanId);
    
    if (!matchedFaq) {
      return res.status(404).json({ code: 404000, message: "FAQ record not found." });
    }

    return res.json({
      code: 200000,
      message: "FAQ retrieved successfully from static data cache structure.",
      data: {
        category: matchedFaq.category,
        keyword: matchedFaq.keyword,
        question: matchedFaq.question,
        answer: matchedFaq.answer
      }
    });
  } catch (err: any) {
    console.error('❌ [FAQ API Failure]:', err.message);
    return res.status(500).json({ code: 500000, message: `Internal server error: ${err.message}` });
  }
});

// Base API healthcheck endpoint
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    const redisPing = await redis.ping();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date(),
      services: { localSqlite: 'connected', redis: redisPing === 'PONG' ? 'connected' : 'disconnected' }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Initialize the Telegram Bot Engine
if (!BOT_TOKEN) {
  console.error('❌ [Telegraf]: Core initialization failed. TELEGRAM_BOT_TOKEN is missing in .env');
} else {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply(
      `👋 Welcome to Traxion Ecosystem Hub, ${ctx.from.first_name || 'Merchant'}!\n\nUse the menu buttons below to navigate systems, lookup details, or explore integrations.`,
      getMainMenu()
    );
  });

  // =========================================================================
  // 📢 LIGHTWEIGHT BOT ADVISORY HANDLER (DB-Only Query Engine)
  // =========================================================================
  bot.action('menu_advisories', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const temporaryStatusMessage = await ctx.reply('🔄 _Syncing Traxion timeline data via database matrix cache..._', { parse_mode: 'Markdown' });

      const cachedAdvisories = await db.query('SELECT * FROM advisories ORDER BY created_at DESC LIMIT 15');

      if (cachedAdvisories.rows.length === 0) {
        try { await ctx.telegram.deleteMessage(ctx.chat!.id, temporaryStatusMessage.message_id); } catch (e) {}
        return ctx.reply('📢 **System Status**: All core services operational. No active advisories logged.');
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const todayAnchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const mediaGroupItems: any[] = [];
      let summaryReportText = `📢 **Traxion Pay Advisory Summary Matrix**\n_Live automated timeline phase analysis active._\n\n`;
      
      const processedTextsLog = new Set<string>();
      let upcomingCount = 0;
      let ongoingCount = 0;
      let doneCount = 0;

      for (const row of cachedAdvisories.rows) {
        const fullDetectedText = row.extracted_text;
        const lowerText = fullDetectedText.toLowerCase();

        const isStandardMaintenanceAdvisory = lowerText.includes('maintenance') || lowerText.includes('scheduled');
        if (!isStandardMaintenanceAdvisory) continue;

        const normalizedContentKey = lowerText.replace(/[^a-z0-9]/g, '').substring(0, 150);
        if (processedTextsLog.has(normalizedContentKey)) continue;
        processedTextsLog.add(normalizedContentKey);

        const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*,\s*)\d{4}|\d{4}-\d{2}-\d{2}/gi;
        const rawMatches = fullDetectedText.match(dateRegex);

        let processedDates: string[] = [];
        if (rawMatches && rawMatches.length > 0) {
          processedDates = rawMatches.map((d: string) => d.replace(/\s*,\s*/, ', '));
        }

        let advisoryTargetDate = todayAnchor; 
        if (processedDates.length > 0) {
          const parsedDate = new Date(processedDates[processedDates.length - 1]);
          advisoryTargetDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
        } else if (row.created_at) {
          const fallbackDate = new Date(row.created_at);
          advisoryTargetDate = new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate());
        }

        let statusEmoji = '🔴'; 
        let statusText = 'Ongoing';

        if (advisoryTargetDate.getTime() > todayAnchor.getTime()) {
          statusEmoji = '📅'; statusText = 'Upcoming';
        } else if (advisoryTargetDate.getTime() < todayAnchor.getTime()) {
          statusEmoji = '🟢'; statusText = 'Done';
        }

        const isInsideTimelineWindow = (advisoryTargetDate >= sevenDaysAgo && advisoryTargetDate <= sevenDaysAhead);

        if (isInsideTimelineWindow) {
          const dateStringLabel = processedDates.length > 0 ? processedDates[processedDates.length - 1] : advisoryTargetDate.toDateString();
          
          let printableSummarySnippet = "";
          const startIndex = lowerText.indexOf("please be advised");
          const endIndex = lowerText.indexOf("at this time.");

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            printableSummarySnippet = fullDetectedText.substring(startIndex, endIndex + "at this time.".length).trim();
          } else {
            const rawLines = fullDetectedText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            const textLines = rawLines.filter((l: string) => !l.toLowerCase().includes("dear valued") && !l.toLowerCase().includes("advisory"));
            printableSummarySnippet = textLines.slice(0, 4).join('\n');
          }

          if (statusText === 'Upcoming') upcomingCount++;
          if (statusText === 'Ongoing') ongoingCount++;
          if (statusText === 'Done') doneCount++;

          summaryReportText += `${statusEmoji} **${statusText.toUpperCase()}** • ${dateStringLabel}\n🔧 _System Target_: ${printableSummarySnippet}\n\n`;

          if (mediaGroupItems.length < 10) {
            const auth = new google.auth.GoogleAuth({
              keyFile: path.resolve(process.cwd(), 'google-credentials.json'),
              scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
            const drive = google.drive({ version: 'v3', auth });
            
            const imgFetch = await drive.files.get({ fileId: row.file_id, alt: 'media' }, { responseType: 'arraybuffer' });
            mediaGroupItems.push({
              type: 'photo',
              media: { source: Buffer.from(imgFetch.data as ArrayBuffer) }
            });
          }
        }
      }

      try { await ctx.telegram.deleteMessage(ctx.chat!.id, temporaryStatusMessage.message_id); } catch (e) {}

      if (mediaGroupItems.length > 0) {
        summaryReportText += `📊 **Summary Metrics Log**:\n📅 Upcoming: \`${upcomingCount}\` | 🔴 Ongoing: \`${ongoingCount}\` | 🟢 Done: \`${doneCount}\``;

        mediaGroupItems[0].caption = summaryReportText;
        mediaGroupItems[0].parse_mode = 'Markdown';

        await ctx.replyWithMediaGroup(mediaGroupItems);
      } else {
        await ctx.reply('📢 **System Status**: All core services operational. No active system maintenance windows identified inside the 14-day window.');
      }
    } catch (err: any) {
      console.error('❌ [Live Database Fetch Advisory Failure]:', err.message);
      ctx.reply('❌ Unable to process the advisory stream.');
    }
  });

  bot.action('menu_faqs', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      // Render standard Telegram callback buttons instead of WebApp buttons
      const keyboardButtons = HARDCODED_FAQS.map((row) => {
        const label = `💡 [${row.category.toUpperCase()}] - ${row.keyword.toUpperCase()}`;
        return [Markup.button.callback(label, `faq_detail_${row.id}`)];
      });

      ctx.reply(
        '💡 **Traxion Developer Knowledge Base**\n\n' +
        'Select a technical manual below to render implementation specs directly in chat, or search using: `@traxion_hub_bot [keyword]`',
        Markup.inlineKeyboard(keyboardButtons)
      );

    } catch (err: any) {
      console.error('❌ [FAQ Menu Generator Error]:', err.message);
      ctx.reply('❌ Unable to process documentation ledger stream.');
    }
  });

  // Intercepts FAQ button clicks and prints the manual directly in the chat thread
  bot.action(/^faq_detail_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const faqId = parseInt(ctx.match[1], 10);
      const matchedFaq = HARDCODED_FAQS.find(faq => faq.id === faqId);

      if (!matchedFaq) {
        return ctx.reply('❌ **FAQ Record Not Found**', { parse_mode: 'Markdown' });
      }

      const formattedFaqMessage = 
        `💡 **TRAXION IMPLEMENTATION MANUAL**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📁 **CATEGORY**: \`${matchedFaq.category.toUpperCase()}\`\n` +
        `🏷️ **TAG**: \`#${matchedFaq.keyword.toLowerCase()}\`\n\n` +
        `❓ **${matchedFaq.question}**\n\n` +
        `📖 **Implementation Code / Spec**:\n` +
        `\`\`\`text\n` +
        `${matchedFaq.answer}\n` +
        `\`\`\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 _@traxion_hub_bot_`;

      await ctx.reply(formattedFaqMessage, { parse_mode: 'Markdown' });

    } catch (err: any) {
      console.error('❌ [FAQ Detail Reply Error]:', err.message);
      ctx.reply('❌ Unable to fetch FAQ details at this time.');
    }
  });

  bot.action('menu_lookup_invoice', async (ctx) => {
    await ctx.answerCbQuery();
    
    ctx.reply(
      `🧾 **QRPH Invoice Status Check**\n\n` +
      `Please enter your transaction trace options below using the following explicit space-separated layout syntax:\n\n` +
      `📝 **Format**: \`[Code] [YYYY-MM-DD]\`\n\n` +
      `💡 **Example Execution Input**:\n\`506269 2026-06-15\``,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('menu_universal_search', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('🔍 **Universal Reference Router**\nEnter any Traxion reference sequence string (Transactions, Payouts) to analyze routing path history metadata:');
  });

  // =========================================================================
  // 💬 GLOBAL TEXT INTERCEPTOR: DIRECT CHAT RESPONSE RENDERER (NO MINI APP POPUP)
  // =========================================================================
  bot.on('text', async (ctx) => {
    const rawText = ctx.message.text.trim();
    const telegramUserId = ctx.from.id;

    // Rate-limiting check
    const isCleared = await checkRateLimit(ctx, telegramUserId);
    if (!isCleared) return;

    let calculatedDate = new Date().toISOString().split('T')[0];
    let traceCode = rawText;

    const multiParamMatch = rawText.match(/^(\d{4,6})\s+(\d{4}-\d{2}-\d{2}|\d{8})$/);
    if (multiParamMatch) {
      traceCode = multiParamMatch[1];
      let matchedDate = multiParamMatch[2];
      if (matchedDate.length === 8 && !matchedDate.includes('-')) {
        calculatedDate = `${matchedDate.substring(0, 4)}-${matchedDate.substring(4, 6)}-${matchedDate.substring(6, 8)}`;
      } else {
        calculatedDate = matchedDate;
      }
    }

    const is6DigitTrace = /^\d{4,6}$/.test(traceCode);
    const extractedCodes = rawText.split(/[\n\s,]+/).map(code => code.trim()).filter(code => code.length > 0);
    const hasValidUniversalLookups = extractedCodes.some(code => 
      (/^[A-Z0-9]{12,}$/i.test(code) && /[A-Z]/i.test(code)) || 
      /^\d{15,50}$/.test(code) || 
      /^TXN-/i.test(code) ||
      /^QRP/i.test(code)
    );

    if (!is6DigitTrace && !hasValidUniversalLookups) {
      return ctx.reply(
        'ℹ️ **Unrecognized Format**\n\nPlease enter an official reference string or a precise trace search using:\n`[6-digit trace code] [YYYY-MM-DD]`',
        { parse_mode: 'Markdown' }
      );
    }

    // Send instant feedback
    const loadingMsg = await ctx.reply('🔄 _Querying live Traxion ledger streams..._', { parse_mode: 'Markdown' });

    try {
      let results: any[] = [];

      if (is6DigitTrace) {
        // Query Trace API directly
        const response = await axios.get(`http://127.0.0.1:${PORT}/transactions/details/instapay/trace`, {
          params: { date: calculatedDate, traceNumber: traceCode }
        });
        results = response.data?.data || [];
      } else {
        // Query Universal Search API directly
        const targetRef = extractedCodes.join(',');
        const response = await axios.get(`http://127.0.0.1:${PORT}/transactions/details/${encodeURIComponent(targetRef)}`);
        results = response.data?.data || [];
      }

      // Delete loading message
      try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (e) {}

      if (!results || results.length === 0) {
        return ctx.reply('❌ **No Records Found**: Query sequence returned no active ledger matches.', { parse_mode: 'Markdown' });
      }

      // Format and reply directly inside Telegram chat
      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        
        let statusEmoji = '🟡';
        let statusText = 'PENDING';
        if (item.status === 1 || String(item.status).toUpperCase() === 'SUCCESS' || String(item.status).toUpperCase() === 'SUCCESSFUL') {
          statusEmoji = '🟢';
          statusText = 'SUCCESSFUL';
        } else if (item.status === -1 || String(item.status).toUpperCase() === 'FAILED') {
          statusEmoji = '🔴';
          statusText = 'FAILED';
        }

        const amountPeso = typeof item.transactionAmount === 'number' 
          ? item.transactionAmount 
          : parseFloat(String(item.transactionAmount || 0));

        const feePeso = typeof item.transactionFee === 'number'
          ? item.transactionFee
          : parseFloat(String(item.transactionFee || 0));

        const formattedText = 
          `🧾 **TRAXION TRANSACTION RECORD** ${results.length > 1 ? `(#${i + 1}/${results.length})` : ''}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 **AMOUNT**: \`PHP ${amountPeso.toFixed(2)}\`\n` +
          `${statusEmoji} **STATUS**: \`${statusText}\`\n\n` +
          `🎯 **TARGET QUERY KEY**:\n\`${item.transactionReferenceNumber || 'N/A'}\`\n\n` +
          `🔗 **TRANSACTION REF**: \`${item.transactionReferenceNumber || 'N/A'}\`\n` +
          `⚙️ **INTEGRATOR REF**: \`${item.integratorReferenceNumber || '---'}\`\n` +
          `🏢 **AGGREGATOR REF**: \`${item.aggregatorReferenceNumber || '---'}\`\n\n` +
          `💸 **FEE**: \`PHP ${feePeso.toFixed(2)}\`\n` +
          `📝 **REMARKS**: _${item.remarks || item.description || 'No remarks provided.'}_\n` +
          `📅 **TIMESTAMP**: \`${item.dateTimeCreated ? new Date(item.dateTimeCreated).toLocaleString() : 'N/A'}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 _@traxion_hub_bot_`;

        await ctx.reply(formattedText, { parse_mode: 'Markdown' });
      }

    } catch (err: any) {
      console.error('❌ [Direct Response Error]:', err.message);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (e) {}
      ctx.reply('❌ **Query Error**: Unable to fetch transaction details at this moment.', { parse_mode: 'Markdown' });
    }
  });

  // ⚡ INSTANT STATIC INLINE SEARCH FILTERING
  bot.on('inline_query', async (ctx) => {
    const searchString = ctx.inlineQuery.query.trim().toLowerCase();
    try {
      let filteredResults = HARDCODED_FAQS;
      if (searchString.length > 0) {
        filteredResults = HARDCODED_FAQS.filter(faq => 
          faq.keyword.toLowerCase().includes(searchString) || 
          faq.category.toLowerCase().includes(searchString)
        );
      }

      const results = filteredResults.slice(0, 10).map((faq) => ({
        type: 'article',
        id: `faq_${faq.id}`,
        title: `💡 [${faq.category}] - ${faq.keyword.toUpperCase()}`,
        description: faq.question,
        input_message_content: {
          message_text: `💡 **Traxion Developer Knowledge Base**\n\n• **Category**: ${faq.category}\n• **Question**: ${faq.question}\n\n📖 **Official Implementation**:\n\`\`\`text\n${faq.answer}\n\`\`\``,
          parse_mode: 'Markdown'
        }
      }));
      await ctx.answerInlineQuery(results as any, { cache_time: 5 });
    } catch (err: any) {
      console.error('❌ [Inline Query]: Core registry search failed:', err.message);
      await ctx.answerInlineQuery([]);
    }
  });

  app.use(bot.webhookCallback('/telegram-webhook'));
  
  bot.telegram.setWebhook(`${CURRENT_ACTIVE_NGROK}/telegram-webhook`)
    .then(() => console.log(`🚀 [Telegraf]: Webhook registered onto secure bridge: ${CURRENT_ACTIVE_NGROK}`))
    .catch((err) => console.error('❌ [Telegraf]: Webhook hook sync failed:', err.message));
}

// Fire up the HTTP engine interface
app.listen(PORT, () => {
  console.log(`⚡ [Express]: Engine listening on interface port: ${PORT}`);
});