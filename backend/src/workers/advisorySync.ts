import { google } from 'googleapis';
import path from 'path';
import fs from 'fs'; // ◄── 💡 Added native file system to safely check file existence
import { db } from '../config/database';
import { createWorker } from 'tesseract.js';

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export const initAdvisoryCron = () => {
  // ⚙️ TypeScript CommonJS ESM-bypass: Lazy load module cleanly inside the execution scope
  const cron = require('node-cron');

  // This schedules the task to run automatically every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('🔄 [Cron Worker]: Starting automated background scan of Google Drive...');
    try {
      // 🚀 BULLETPROOF MULTI-PATH ENGINE MATRIX
      // Strategy 1: Check standard Execution Directory root path
      let credentialsPath = path.resolve(process.cwd(), 'google-credentials.json');

      // Strategy 2: If running from the top-level workspace root folder, append 'backend'
      if (!fs.existsSync(credentialsPath) && process.cwd().toLowerCase().endsWith('traxion-telegram-ecosystem')) {
        credentialsPath = path.resolve(process.cwd(), 'backend', 'google-credentials.json');
      }

      // Strategy 3: Dynamic fallback based on source code file depth relative mapping
      if (!fs.existsSync(credentialsPath)) {
        credentialsPath = path.resolve(__dirname, '../../google-credentials.json');
      }

      // Strategy 4: Compiled distribution engine depth path verification fallback (dist/)
      if (!fs.existsSync(credentialsPath)) {
        credentialsPath = path.resolve(__dirname, '../../../google-credentials.json');
      }

      console.log(`🔍 [Cron Auth]: Resolving service account keys path via: "${credentialsPath}"`);

      // Verify final file existence map parameters to prevent unhandled Google API crash states
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`The file could not be discovered inside standard workspace target scopes. Absolute checked vector: ${credentialsPath}`);
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath, // ◄── Pass the dynamically verified path variable here safely!
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      const drive = google.drive({ version: 'v3', auth });

      const driveResponse = await drive.files.list({
        q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 15
      });

      const driveFiles = driveResponse.data.files || [];
      console.log(`📂 [Cron Worker]: Found ${driveFiles.length} file configurations to verify.`);

      // Process files concurrently in the background without affecting users
      await Promise.all(
        driveFiles.map(async (file) => {
          if (!file.id) return;

          try {
            // Check if this file ID is already processed and cached in PostgreSQL
            const existingCache = await db.query(
              'SELECT 1 FROM advisories WHERE file_id = $1',
              [file.id]
            );

            // MySQL modification check layout (If you decide to swap it out)
            // For Postgres, leave the `.rows` lookup wrapper intact
            if (existingCache.rows && existingCache.rows.length > 0) {
              return; // Cache Hit: Skip processing entirely
            }

            // Cache Miss: Download and parse once quietly in the background
            console.log(`⚙️ [Cron OCR Sync]: Parsing new file asset: "${file.name || 'Unnamed'}"`);
            const driveFileResponse = await drive.files.get(
              { fileId: file.id, alt: 'media' },
              { responseType: 'arraybuffer' }
            );
            const imageBuffer = Buffer.from(driveFileResponse.data as ArrayBuffer);

            const worker = await createWorker('eng');
            const ocrResult = await worker.recognize(imageBuffer);
            await worker.terminate();

            const fullDetectedText = ocrResult.data.text;

            if (fullDetectedText && fullDetectedText.trim().length > 10) {
              // Commit straight to your table layout
              await db.query(
                'INSERT INTO advisories (file_id, file_name, extracted_text) VALUES ($1, $2, $3) ON CONFLICT (file_id) DO NOTHING',
                [file.id, file.name || 'Unnamed', fullDetectedText]
              );
              console.log(`✅ [Cron OCR Sync]: Successfully cached text for file ID: ${file.id}`);
            }
          } catch (fileErr: any) {
            console.error(`❌ [Cron Worker File Failure] ID ${file.id}:`, fileErr.message);
          }
        })
      );

      console.log('✅ [Cron Worker]: Background sync interval sequence complete.');
    } catch (err: any) {
      console.error('❌ [Cron Worker Global Failure]:', err.message);
    }
  });
};