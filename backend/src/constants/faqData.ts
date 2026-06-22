// backend/src/constants/faqData.ts

export const HARDCODED_FAQS = [
  {
    id: 1,
    category: 'Authentication',
    keyword: 'login',
    question: 'What parameters does the /auth/login POST route require?',
    answer: `// 🚀 POST /auth/login
// Establishes your session and returns authorization tokens.

Payload Structure:
{
  "username": "string (Email/Mobile)",
  "userPassword": "string (Password/Pincode/API Key)",
  "passwordType": 1, // 1=Password, 2=Pincode, 3=API Key
  "applicationId": 7
}

Note:
Initial encryption utilizes TOTP secret "HCFQQARAAHRGMYDK". Post-login requests MUST shift to using the account's individual secretKey.`
  },
  {
    id: 2,
    category: 'Authentication',
    keyword: 'refresh-token',
    question: 'How do I refresh the access token before it expires?',
    answer: `// 🚀 GET /auth/refresh-token
// Generates a fresh accessToken using a valid refresh_token.

Implementation Rules:
1. Tokens are valid for 60 minutes.
2. Set up background intervals to refresh every 40 minutes.
3. Cache and reuse your tokens. High-frequency login attempts per individual transaction will trigger protective account lockout security restrictions.`
  },
  {
    id: 3,
    category: 'Account Details',
    keyword: 'whoami',
    question: 'How do I fetch the active profile context data via /auth/whoami?',
    answer: `// 🚀 GET /auth/whoami
// Extracts identifiers linking User, Profile, Wallet, and Merchant entities.

Crucial Field Map Response:
{
  "code": 2000,
  "data": {
    "id": 1,
    "userName": "mail@traxiontech.net",
    "walletCode": "TP-20240831-115909-355652", // Use inside txn payloads
    "accountNumber": "1011907995876228",
    "secretKey": "YOUR_ACCOUNT_SECRET_KEY"
  }
}`
  },
  {
    id: 4,
    category: 'Account Balance',
    keyword: 'balances',
    question: 'How do I check the real-time balance of a wallet?',
    answer: `// 🚀 GET /wallets/balances
// Provides structural financial states in centavos.

Response Example:
{
  "code": 2020,
  "data": {
    "currentBalance": 98811700,  // PHP 988,117.00
    "availableBalance": 98487500, // PHP 984,875.00
    "currency": "PHP"
  }
}`
  },
  {
    id: 5,
    category: 'Transaction Fees',
    keyword: 'fees',
    question: 'How do I calculate service fees prior to executing operations?',
    answer: `// 🚀 GET /transactions/fees
// Query Parameters: ?amount=10000&institutionId=36815&transactionCode=GXI103020

Calculation Return:
{
  "code": 20000,
  "data": {
    "amount": 10000,    // Principal value (centavos)
    "feeAmount": 250,   // Charged fee (centavos)
    "totalAmount": 10250 // Principal + Fee sum
  }
}`
  },
  {
    id: 6,
    category: 'Bank Transfer',
    keyword: 'fund-transfer',
    question: 'How do I transfer funds from a TPay wallet to an external bank account?',
    answer: `// 🚀 POST /transactions
// Required Fixed Header Map Code: "transactionCode": "ITP401230"

Request Payload Core:
{
  "transactionCode": "ITP401230",
  "details": [{
    "recipient": {
      "account": "Recipient Account Number",
      "name": "Full Name"
    },
    "institutionId": "BIUUPHM1XXX",
    "amount": { "currency": "PHP", "value": 200 }
  }],
  "auth": {
    "otpCode": "123456",
    "otpType": 9 // 9=Generated OTP, 99=MPIN
  }
}`
  },
  {
    id: 7,
    category: 'Internal Transfer',
    keyword: 'tpay-to-tpay',
    question: 'What parameters are needed for cross-wallet internal transfers?',
    answer: `// 🚀 POST /transactions
// Required Fixed Header Map Code: "transactionCode": "TRX402020"

Payload Layout:
{
  "transactionCode": "TRX402020",
  "details": [{
    "recipient": {
      "account": "WalletCode / AccountNumber / MobileNumber"
    },
    "amount": { "currency": "PHP", "value": 100000 }
  }],
  "auth": { "otpCode": "123456", "otpType": 99 }
}`
  },
  {
    id: 8,
    category: 'QRPH Generation',
    keyword: 'generate-qr',
    question: 'How do I generate dynamic QRPH codes with embedded expiration parameters?',
    answer: `// 🚀 GET /transactions/generate-qr/p2m
// Query Parameters: ?type=1&mode=1&amount=10000

Extended Expiry Parameter Support (v1.2.1):
* ttlMinutes: Defines operational life length in minutes before automatic drop-off (Default: 15 mins).

Response Payload Fields:
* data.rawString: If type=2, contains a complete base64 string renderable natively inside an <img> tag.`
  },
  {
    id: 9,
    category: 'QR Inquiry',
    keyword: 'inquire-qr',
    question: 'How do I parse and validate a scanned raw QRPH text block string?',
    answer: `// 🚀 POST /transactions/inquire-qr
// Decodes values and matches verification data patterns prior to payment processing.

Payload Schema:
{
  "qr": "00020101021228860011ph.ppmi.p2m0111TRXPPHM2XX...",
  "mode": 1
}

Important Validation Checks:
* data.isOnUs: true if generated within Traxion system loops.
* data.isExpired: true if data timestamp drops out of execution bounds.`
  },
  {
    id: 10,
    category: 'Instapay Trace',
    keyword: 'instapay-trace',
    question: 'How do I scan historical records via Instapay Trace numbers?',
    answer: `// 🚀 GET /transactions/details/instapay/trace
// Query Parameters: ?traceNumber=123456&date=2026-05-14

Response Extraction Fields:
* data[].transactionAmount: Total value returned strictly in centavos.
* data[].status: Numeric indicator (1 = Success, 0 = Pending).
* data[].remarks: Full audit trail statement containing upstream trace details.`
  },
  {
    id: 11,
    category: 'Amount Handling',
    keyword: 'currency',
    question: 'How does the API handle currency amounts (Centavos vs. Pesos)?',
    answer: `// ₱ Financial Amount Format Guidelines
// All transaction financial amounts are handled strictly in centavos.

1. Sending Requests:
   Always multiply amounts by 100 if the raw input is in pesos.
   Example: ₱10.00 -> 10.00 * 100 = 1000

2. Displaying Responses:
   Always divide returned values by 100 to display standard pesos to users.
   Example: 4962150 centavos -> 4962150 / 100 = ₱49,621.50`
  },
  {
    id: 12,
    category: 'Response Codes',
    keyword: 'status-codes',
    question: 'What is the difference between the HTTP status code and the API response code?',
    answer: `// 🌐 Network Status vs. Internal API Schema
// These two code sets are separate and operate independently.

1. HTTP Status Code:
   The network handshake layer returned in response headers (e.g., 200, 404, 500).

2. API Response Code:
   The internal "code" property wrapped directly inside the JSON response body.

Relationship: Not necessarily related. Treat the JSON body code as the true status.`
  },
  {
    id: 13,
    category: 'Security Matrix',
    keyword: 'encryption',
    question: 'What are the step-by-step procedures to encrypt a request payload?',
    answer: `// 🔒 Payload AES Encryption Protocol Rules
Step 1: Get the current UTC integer timestamp and assign it to the "X-Client-Timestamp" custom header.
Step 2: Generate a 6-digit TOTP (30-second window step) using that exact timestamp and your account's Secret Key.
Step 3: AES-Encrypt your request payload body using the 6-digit TOTP as your passphrase.
Step 4: Wrap the final encrypted string in a JSON object under the "data" parameter.

// 🛠️ JAVASCRIPT / CRYPTOJS API KEY ENCRYPTION IMPLEMENTATION
export function encryptAPIKey(plainText, key) {
  const iv = crypto.CryptoJS.lib.WordArray.random(128 / 8);
  const keyWordArray = crypto.CryptoJS.enc.Utf8.parse(key);
  const encrypted = crypto.CryptoJS.AES.encrypt(plainText, keyWordArray, { iv: iv });
  const ivCipherText = iv.concat(encrypted.ciphertext);
  return crypto.CryptoJS.enc.Base64.stringify(ivCipherText);
}

let apiKey = 'ABCDEFGHIJKLMNOP'
let secretKey = 'HIJKLMNOPQRSTUV'

// Encrypted key string generation mapping - pass to X-Application-Key
let encryptedApiKey = encryptAPIKey(apiKey, secretKey);`
  },
  {
    id: 14,
    category: 'Security Matrix',
    keyword: 'decryption',
    question: 'What are the step-by-step procedures to decrypt an API response payload?',
    answer: `// 🔓 Payload AES Decryption Protocol Rules
Step 1: Extract the integer timestamp value directly from the response header called "X-Server-Timestamp".
Step 2: Generate the decryption 6-digit TOTP using that server timestamp and your account's Secret Key.
Step 3: Clear the data envelope and AES-Decrypt the ciphertext using the generated TOTP string as your secret passphrase.`
  },
  {
    id: 15,
    category: 'Rate Limiting',
    keyword: 'rate-limit',
    question: 'What are the API rate limits and how do I unlock higher thresholds?',
    answer: `// ⏳ Traxion Throttling Protection Metrics
1. Default Rate Limit: 3 API calls per second.
2. Verified Application Limit: 50 API calls per second.

How to access higher limits:
* Encrypt your raw API Key using AES encryption with your logged-in Secret Key.
* Send this value in every subsequent request header marked as:
  X-Application-Key: <your_encrypted_api_key>`
  },
  {
    id: 16,
    category: 'Session Caching',
    keyword: 'token-management',
    question: 'What are the strict rules regarding token caching and session management?',
    answer: `// 🔑 Token Expiry Lifecycle Management
1. Access and Secret tokens are strictly valid for a maximum of 60 minutes.
2. Logic MUST be set up to cycle a fresh token every 40 minutes via the /auth/refresh-token endpoint.
3. Caching is mandatory. Do not trigger logins on a per-transaction basis.

⚠️ Production Notice:
Failure to cache tokens properly will trigger rate triggers, causing automatic merchant account lockout protection.`
  }
];