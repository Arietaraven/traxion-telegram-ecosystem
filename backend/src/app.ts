import express from 'express';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path'; 
import CryptoJS from 'crypto-js';
import base32Decode from 'base32-decode';
import { Telegraf, Markup } from 'telegraf';
import { db } from '../src/config/database';
import { redis } from '../src/config/redis';
import { getMainMenu } from './telegram/menu';
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

app.use(cors());
app.use(express.json());

// =========================================================================
// 🚀 UNIFIED FRONTEND INTERFACE MATRIX (PRODUCTION DIST ENGINE - RUNNING CLEAN)
// =========================================================================

// Resolve the absolute path to your newly compiled frontend/dist folder
const frontendDistPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

// 1. Tell Express to automatically host all nested compiled script/style bundles
app.use('/app', express.static(frontendDistPath));
app.use(express.static(frontendDistPath));

// 2. Main Document Route: Serves the compiled index.html file with production links natively
app.get(['/app', '/app/'], (req, res) => {
  const productionIndexPath = path.join(frontendDistPath, 'index.html');
  
  if (fs.existsSync(productionIndexPath)) {
    res.sendFile(productionIndexPath);
  } else {
    console.error('❌ [Critical Asset Error]: dist/index.html is missing. Run npx vite build in frontend directory!');
    res.status(500).send('🔄 Syncing server layouts... Please close and retry in a few seconds.');
  }
});

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
async function getValidSessionToken(): Promise<string> {
  try {
    // Keep this alive to ensure a clean slot verification on every iteration while debugging
     await redis.del(REDIS_TOKEN_KEY);

    const cachedToken = await redis.get(REDIS_TOKEN_KEY);
    if (cachedToken) return cachedToken;

    console.log('🔑 [Auth Engine]: Session missing or expired. Initializing token handshake...');

    const masterSecret = "HCFQQARAAHRGMYDK";
    const clientTimestamp = Date.now();
    const rollingOtp = generateRollingTOTP(masterSecret, clientTimestamp);

    // 1. Structural Object Composition matching verification schemas
    const rawPlainBody = JSON.stringify({
      username: "opstestaccount01@traxionpay.com",
      userPassword: "Tb9GREZe*MGdT&eu",
      passwordType: 1
    });

    // 2. Wrap payload inside an AES crypt block using rolling OTP token code
    const encryptedBodyString = CryptoJS.AES.encrypt(rawPlainBody, rollingOtp).toString();

    const authResponse = await axios.post(
      `${TRAXION_BASE_URL}/auth/login`, 
      { data: encryptedBodyString },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Client-Timestamp': String(clientTimestamp), // ✨ FIXED: Explicitly cast to string to prevent Axios/Node exceptions
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

    // 3. Compute response key using server timestamp response headers
    const responseOtp = generateRollingTOTP(masterSecret, Number(serverResponseTimestamp));
    
    // 4. Decrypt target parameter context blocks matching corporate schemas
    const bytesDecrypted = CryptoJS.AES.decrypt(rootEncryptedPayload.data, responseOtp);
    const parsedPlaintextString = bytesDecrypted.toString(CryptoJS.enc.Utf8);
    
    if (!parsedPlaintextString) {
      throw new Error("Unable to successfully decrypt the gateway payload response structure envelope.");
    }

    const cleanJsonResponse = JSON.parse(parsedPlaintextString);

    // ✨ THE TEMPORARY DIAGNOSTIC PRINT: Logs the exact plaintext response from Traxion!
    console.log('📌 [Auth Engine Gateway Plaintext Response]:', cleanJsonResponse);

    if (cleanJsonResponse && cleanJsonResponse.code == '220022' && cleanJsonResponse.data?.accessToken) {
      const freshToken = cleanJsonResponse.data.accessToken;
      await redis.setex(REDIS_TOKEN_KEY, 2700, freshToken);
      console.log('✅ [Auth Engine]: Token context synchronized and cached in Redis memory.');
      return freshToken;
    }

    // ✨ Updated error handling to throw the actual error message sent by the gateway application
    throw new Error(cleanJsonResponse?.message || `Gateway returned error code: ${cleanJsonResponse?.code}`);
  } catch (error: any) {
    // Advanced fallback logic: If the server sent an encrypted error body back, decrypt it so we can read it!
    if (error.response?.data?.data) {
      try {
        const masterSecret = "HCFQQARAAHRGMYDK";
        const serverErrTimestamp = error.response.headers['x-server-timestamp'];
        const errOtp = generateRollingTOTP(masterSecret, Number(serverErrTimestamp));
        const decBytes = CryptoJS.AES.decrypt(error.response.data.data, errOtp);
        const plainErr = JSON.parse(decBytes.toString(CryptoJS.enc.Utf8));
        console.error('❌ [Auth Engine Gateway Decrypted Error Context]:', plainErr);
        throw new Error(`Gateway Error: ${plainErr.message || plainErr.code}`);
      } catch (inner) {
        // Fallback if inner decryption fails
      }
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
    return res.status(400).json({ message: "Trace number parameter tracking index is required." });
  }

  try {
    // 🏢 PHASE 1: Scan local database warehouse cache first
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

    // 📅 PHASE 2: Date Format Normalization Matrix
    const rawDateStr = String(date || '').replace(/-/g, ''); 
    let dateFormatsToTry: string[] = [];

    if (rawDateStr.length === 8) {
      const yyyy = rawDateStr.substring(0, 4);
      const mm = rawDateStr.substring(4, 6);
      const dd = rawDateStr.substring(6, 8);

      dateFormatsToTry = [
        `${yyyy}-${mm}-${dd}`, // 1. YYYY-MM-DD
        rawDateStr,            // 2. YYYYMMDD
        `${dd}-${mm}-${yyyy}`  // 3. DD-MM-YYYY
      ];
    } else {
      dateFormatsToTry = [String(date || '')];
    }

    let extractedTransactionsList: any[] = [];
    const bearerToken = await getValidSessionToken();

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

        // 🔓 PHASE 3: Realtime Time-Based OTP Handshake Decryption
        if (payloadData && typeof payloadData.data === 'string' && payloadData.data.startsWith('U2FsdGVkX1')) {
          try {
            const masterSecretSeed = "BJDERUXAXPJFVFIB"; 
            const targetTimestamp = serverResponseTimestamp ? Number(serverResponseTimestamp) : Date.now();
            const calculatedDecryptionOtp = generateRollingTOTP(masterSecretSeed, targetTimestamp);

            const bytesDecrypted = CryptoJS.AES.decrypt(payloadData.data, calculatedDecryptionOtp);
            const plainTextJsonString = bytesDecrypted.toString(CryptoJS.enc.Utf8);
            
            if (plainTextJsonString) {
              payloadData.data = JSON.parse(plainTextJsonString);
              console.log(`🔓 [Crypto Engine]: Decrypted envelope successfully for response code ${productionResponse.status}`);
            }
          } catch (cryptoError: any) {
            console.error("❌ [Crypto Guard Exception Handled]:", cryptoError.message);
            continue; 
          }
        }

        // =========================================================================
        // 📥 ✨ THE ADAPTIVE EXTRACTION ENGINE MATRIX (UNWRAPS NESTED LISTS & OBJECTS)
        // =========================================================================
        let innerDataBlock = payloadData?.data;

        if (innerDataBlock) {
          // Check Variation A: Direct Root Array
          if (Array.isArray(innerDataBlock)) {
            extractedTransactionsList = innerDataBlock;
          } 
          // Check Variation B: Nested inside an internal list schema property (.data.list)
          else if (innerDataBlock.list && Array.isArray(innerDataBlock.list)) {
            extractedTransactionsList = innerDataBlock.list;
          } 
          // Check Variation C: Nested inside an internal nested data block property (.data.data)
          else if (innerDataBlock.data && Array.isArray(innerDataBlock.data)) {
            extractedTransactionsList = innerDataBlock.data;
          }
          // Check Variation D: Arrived as a clean direct payload object primitive
          else if (typeof innerDataBlock === 'object') {
            extractedTransactionsList = [innerDataBlock];
          }
        }

        // If a valid array loop match with real metrics elements is found, break immediately!
        if (extractedTransactionsList.length > 0) {
          console.log(`✅ [Adaptive Processing Match]: Successfully parsed ${extractedTransactionsList.length} records.`);
          break;
        }

      } catch (loopError: any) {
        console.warn(`⚠️ [Format Check Notice]: Date format ${targetedDateFormat} dropped out layout link: ${loopError.message}`);
      }
    }

    // 📝 PHASE 4: SAFE MULTI-RECORD DATABASE CACHE PERSISTENCE
    if (extractedTransactionsList.length > 0) {
      console.log(`📝 [Database Writer Engine]: Caching ${extractedTransactionsList.length} production records into local PostgreSQL.`);
      
      for (const targetItem of extractedTransactionsList) {
        if (targetItem) {
          try {
            let computedStatus = 0;
            if (targetItem.status !== undefined && targetItem.status !== null) {
              const statusStr = String(targetItem.status).toUpperCase();
              if (targetItem.status === 1 || statusStr === 'SUCCESSFUL' || statusStr === 'PAID' || statusStr === 'SUCCESS') {
                computedStatus = 1;
              }
            }

            const uniqueTxRef = targetItem.transactionReferenceNumber || targetItem.referenceId || `FALLBACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            await db.query(
              `INSERT INTO cached_transactions (
                trace_number, transaction_reference, integrator_reference, aggregator_reference, 
                amount, fee, status, remarks, date_time_created, date_time_updated
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (trace_number, transaction_reference) DO NOTHING`,
              [
                String(traceNumber),
                uniqueTxRef,
                targetItem.integratorReferenceNumber || null,
                targetItem.aggregatorReferenceNumber || null,
                targetItem.transactionAmount || targetItem.amount || 0,
                targetItem.transactionFee || targetItem.fee || 0,
                computedStatus,
                targetItem.remarks || null,
                targetItem.dateTimeCreated ? new Date(targetItem.dateTimeCreated) : null,
                targetItem.dateTimeStatusUpdated ? new Date(targetItem.dateTimeStatusUpdated) : null
              ]
            );
          } catch (dbError: any) {
            console.error("⚠️ [Database Cache Insertion Bypassed Row Exception]:", dbError.message);
          }
        }
      }
      
      // Send a uniform response payload structure that exactly matches what the frontend unwrapper requires
      return res.json({
        code: 200000,
        message: "Transaction details fetched successfully.",
        data: extractedTransactionsList
      });

    } else {
      console.warn(`⚠️ [Backend Security Sync]: Production API returned no matching collection structures for trace: ${traceNumber}`);
      return res.status(404).json({
        code: 404000,
        message: "No active transaction records found matching this explicit lookup parameters matrix across production servers.",
        data: []
      });
    }

  } catch (err: any) {
    console.error('❌ [Live Instapay Trace Endpoint Failure]:', err.message);
    return res.status(500).json({ code: 500000, message: `Internal server error: ${err.message}`, data: [] });
  }
});

/**
 * 🛰️ Postman API Route A: Universal Wildcard Reference Search Router with Auto-Save Cache
 */
// =========================================================================
// 🛰️ Postman API Route A: Universal Wildcard Reference Search Router
// =========================================================================
app.get('/transactions/details/:referenceId', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const { referenceId } = req.params;
  const cleanReferenceId = String(referenceId).trim();

  try {
    // 🔑 1. FETCH LIVE ACTIVE SESSION DATA
    const sessionContext: any = await getValidSessionToken(); 
    
    let bearerToken = "";
    let dynamicSecretSeed = "ZIPVWMWSTCGZTAFI"; 

    if (sessionContext && typeof sessionContext === 'object') {
      bearerToken = sessionContext.accessToken || '';
      if (sessionContext.secretKey) {
        dynamicSecretSeed = sessionContext.secretKey;
      }
    } else if (typeof sessionContext === 'string') {
      bearerToken = sessionContext;
    }

    const productionResponse = await axios.get(`${TRAXION_BASE_URL}/transactions/details/${encodeURIComponent(cleanReferenceId)}`, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    let payloadData = productionResponse.data;
    const serverResponseTimestamp = productionResponse.headers['x-server-timestamp'] || productionResponse.headers['X-Server-Timestamp'];

    // 🔓 Automated Decryption Routine with Dynamic Key Matrices
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
          } catch (innerCryptoErr) {
            // Check next timestamp offset
          }
        }
        
        if (plainTextJsonString) {
          payloadData.data = JSON.parse(plainTextJsonString);
        } else {
          throw new Error("Dynamic key window desynchronization. Decrypted bytes rejected.");
        }
      }
    }

    // =========================================================================
    // 📥 🔄 MULTI-ITEM ADAPTIVE EXTRACTION MATRIX (RETAIN DUPLICATES)
    // =========================================================================
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

    // =========================================================================
    // ₱ ✨ DATA UNIFICATION & MAPPING LAYER (MAPPED FOR ALL DETECTED DUPLICATES)
    // =========================================================================
    if (rawItemsArray.length > 0) {
      const unifiedRecords = rawItemsArray.map((extractedItem: any) => {
        const incomingAmount = extractedItem.transactionAmount ?? extractedItem.amount ?? 0;
        const incomingFee = extractedItem.transactionFee ?? extractedItem.fee ?? 0;

        // Formats raw strings/numbers safely to Peso decimals without centavo inflation
        const finalAmountPeso = parseFloat(String(incomingAmount));
        const finalFeePeso = parseFloat(String(incomingFee));

        return {
          transactionReferenceNumber: extractedItem.transactionReferenceNumber || extractedItem.referenceId || cleanReferenceId,
          integratorReferenceNumber: extractedItem.integratorReferenceNumber || '---',
          aggregatorReferenceNumber: extractedItem.aggregatorReferenceSegment || extractedItem.aggregatorReferenceNumber || '---',
          transactionAmount: isNaN(finalAmountPeso) ? 0 : finalAmountPeso,
          transactionFee: isNaN(finalFeePeso) ? 0 : finalFeePeso,
          status: extractedItem.status ?? 'SUCCESSFUL',
          remarks: extractedItem.remarks || extractedItem.description || null,
          description: extractedItem.description || extractedItem.remarks || 'Universal Ledger Registry Query',
          dateTimeCreated: extractedItem.dateTimeCreated || extractedItem.created_at || new Date().toISOString(),
          dateTimeStatusUpdated: extractedItem.dateTimeStatusUpdated || extractedItem.updated_at || new Date().toISOString()
        };
      });

      // 💡 Return an array inside data so your frontend can loop/render duplicate cards
      return res.json({
        code: 200000,
        message: `Successfully processed ${unifiedRecords.length} matching ledger profile(s).`,
        data: unifiedRecords
      });
    } else {
      return res.status(404).json({
        code: 404000,
        message: "No active transaction records found matching this reference sequence.",
        data: []
      });
    }

  } catch (err: any) {
    console.error('❌ [Live Reference Identifier Endpoint Failure]:', err.message);
    const codeStatus = err.response?.status || 500;
    return res.status(codeStatus).json({ 
      code: 404000, 
      message: "Failed locating reference sequence in backend logs.",
      data: []
    });
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
      services: { postgres: 'connected', redis: redisPing === 'PONG' ? 'connected' : 'disconnected' }
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

  bot.action('menu_advisories', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const result = await db.query(
        `SELECT title, description, status FROM advisories WHERE event_date >= NOW() - INTERVAL '7 days' AND event_date <= NOW() + INTERVAL '7 days' ORDER BY event_date ASC`
      );
      if (result.rows.length === 0) {
        return ctx.reply('📢 **System Status**: No active or scheduled system advisories detected within this 14-day window.');
      }
      let responseMessage = '📢 **Traxion System Advisories (14-Day Window)**\n\n';
      result.rows.forEach((row: any) => {
        const statusEmoji = row.status === 'Active' ? '🔴' : row.status === 'Done' ? '🟢' : '🟡';
        responseMessage += `${statusEmoji} **${row.title}** (${row.status})\n${row.description}\n\n`;
      });
      ctx.reply(responseMessage);
    } catch (err: any) {
      console.error('Advisory Fetch Error:', err.message);
      ctx.reply('❌ Unable to pull advisory updates at the moment.');
    }
  });

  bot.action('menu_faqs', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('💡 **Traxion Developer Knowledge Base**\n\nOur structured developer support database is connected! To search document files or pull code blocks instantly via global chats, trigger: `@traxion_hub_bot [keyword]`');
  });

// 4. Feature: 6-Digit QRPH Invoice Lookup (Feature 4)
    bot.action('menu_lookup_invoice', async (ctx) => {
      await ctx.answerCbQuery();
      
      // 🚀 UPDATED INSTRUCTION SET: Standardizes execution rules for your dual-routing schema parameters natively
      ctx.reply(
        `🧾 **QRPH Invoice Status Check**\n\n` +
        `Please enter your transaction trace options below using the following explicit space-separated layout syntax:\n\n` +
        `📝 **Format**: \`[6-Digit Code] [YYYY-MM-DD]\`\n\n` +
        `💡 **Example Execution Input**:\n\`506269 2026-06-15\``,
        { parse_mode: 'Markdown' }
      );
    });

  bot.action('menu_universal_search', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('🔍 **Universal Reference Router**\nEnter any Traxion reference sequence string (Transactions, Payouts) to analyze routing path history metadata:');
  });

// 6. Global Text Interceptor (Dual Router: Handles Invoice Codes, Dates & Universal System References)
bot.on('text', async (ctx) => {
  const rawText = ctx.message.text.trim();
  const telegramUserId = ctx.from.id;

  const activeDomain = process.env.NGROK_URL || 'https://possible-buckwheat-abrasion.ngrok-free.dev';
  
  // 📅 DYNAMIC FALLBACK DATE: Automatically falls back to current calendar day (YYYY-MM-DD)
  let calculatedDate = new Date().toISOString().split('T')[0];
  let traceCode = rawText;

  // 🔍 PRECISE PATTERN MATCHING ENGINE: Extracts a 6-digit code followed by a space and a date stamp
  // Supports space syntax variables: "506269 2026-06-15" or "506269 20260615"
  const multiParamMatch = rawText.match(/^(\d{6})\s+(\d{4}-\d{2}-\d{2}|\d{8})$/);
  
  if (multiParamMatch) {
    traceCode = multiParamMatch[1];
    let matchedDate = multiParamMatch[2];
    
    // Normalize compact layout arrays (e.g., "20260615" -> "2026-06-15") to maintain Postman equivalence matrices
    if (matchedDate.length === 8 && !matchedDate.includes('-')) {
      calculatedDate = `${matchedDate.substring(0, 4)}-${matchedDate.substring(4, 6)}-${matchedDate.substring(6, 8)}`;
    } else {
      calculatedDate = matchedDate;
    }
    console.log(`🎯 [Bot Precise Sync Engine]: Target Trace Isolated: ${traceCode} | Query Date Matrix: ${calculatedDate}`);
  }

  // ✨ THE CACHE-BUSTER MATRIX SUFFIX: 
  // Appending Date.now() and the dynamic date parameter feeds the correct variables to Route B
  const completeSecureUrl = `${activeDomain.replace(/\/$/, '')}/app/?code=${traceCode}&date=${calculatedDate}&v=${Date.now()}`;

  // CONDITION A: Handle standard 6-digit codes or precise space-appended multi-parameter inputs
  if (/^\d{6}$/.test(traceCode)) {
    const isCleared = await checkRateLimit(ctx, telegramUserId);
    if (!isCleared) return;

    const tmaMarkup = Markup.inlineKeyboard([
      [Markup.button.webApp('📱 View Branded Invoice', completeSecureUrl)]
    ]);

    ctx.reply(
      `🧾 **InstaPay Precise Trace Record Initiated**\n\n` +
      `• **Target Trace**: \`${traceCode}\`\n` +
      `• **Target Query Date**: \`${calculatedDate}\`\n\n` +
      `Click the button below to fetch live, production transaction metrics via secure network tunnels:`, 
      tmaMarkup
    );
  }
  // 🚀 CONDITION B UPDATED: Expanded matching constraints to completely track universal alphanumeric strings, long numbers, TXN-, and QRP- IDs
  else if (
    (/^[A-Z0-9]{12,}$/i.test(rawText) && /[A-Z]/i.test(rawText)) || 
    /^\d{15,50}$/.test(rawText) || 
    /^TXN-/i.test(rawText) ||
    /^QRP/i.test(rawText)
  ) {
    const isCleared = await checkRateLimit(ctx, telegramUserId);
    if (!isCleared) return;

    // Encodes parameters cleanly so multi-tier string hashes traverse safely over the pipeline web bridge
    const universalSecureUrl = `${activeDomain.replace(/\/$/, '')}/app/?code=${encodeURIComponent(rawText)}&date=${calculatedDate}&v=${Date.now()}`;

    const tmaMarkup = Markup.inlineKeyboard([
      [Markup.button.webApp('🔍 Open Universal Search', universalSecureUrl)]
    ]);

    ctx.reply(
      `🛰️ **Universal Identifier Traced**\n\n` +
      `• **Reference Sequence**: \`${rawText}\`\n` +
      `• **Routing Scope**: Global Ledger Registry Dynamic Search\n\n` +
      `Click the button below to parse transaction history profiles dynamically:`, 
      tmaMarkup
    );
  } 
  else {
    ctx.reply('ℹ️ Input format unrecognized. Pass an official reference ID key or execute a precise transaction search using:\n\`[6-digit code] [YYYY-MM-DD]\`');
  }
});

  bot.on('inline_query', async (ctx) => {
    const searchString = ctx.inlineQuery.query.trim().toLowerCase();
    try {
      let queryText = 'SELECT * FROM faqs ORDER BY id ASC LIMIT 10';
      let queryParams: any[] = [];
      if (searchString.length > 0) {
        queryText = 'SELECT * FROM faqs WHERE LOWER(keyword) LIKE $1 OR LOWER(category) LIKE $1 LIMIT 10';
        queryParams = [`%${searchString}%`];
      }
      const result = await db.query(queryText, queryParams);
      const results = result.rows.map((faq: any) => ({
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