import { google } from 'googleapis';
import { db } from '../config/database';
import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';

export async function processAdvisorySyncPipeline() {
  console.log('🔄 [Cron Worker]: Starting automated background scan of Google Drive...');
  
  try {
    // 1. Authenticate with Google Drive
    const credentialsPath = path.resolve(process.cwd(), 'google-credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Grab and sanitize target folder from environment
    const rawFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
    const folderId = rawFolderId.trim().replace(/[\r\n'"]/g, '');
    
    if (!folderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID variable configuration index is missing or empty inside .env context.");
    }

    console.log(`📡 [Cron Worker]: Querying Folder Target ID: [${folderId}]`);

    // ✨ FIXED: Swapped 'startsWith' to 'contains' for mimeType to comply with Google's API rules
    const apiQueryString = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;

    const driveResponse = await drive.files.list({
      q: apiQueryString,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    const discoveredFiles = driveResponse.data.files || [];
    console.log(`📂 [Cron Worker]: Found ${discoveredFiles.length} file configurations to verify.`);

    if (discoveredFiles.length === 0) {
      console.log('ℹ️ [Cron Worker]: No fresh advisory items detected to process inside this loop interval.');
      return;
    }

    // Initialize the OCR engine
    const tesseractWorker = await createWorker('eng');

    for (const targetFile of discoveredFiles) {
      if (!targetFile.id) continue;

      // Check if this explicit alert is already cached inside our SQLite engine
      const lookupCacheCheck = await db.query(
        'SELECT id FROM advisories WHERE file_id = $1 LIMIT 1',
        [targetFile.id]
      );

      // If already logged, safely skip processing to conserve compute cycles
      if (lookupCacheCheck.rows.length > 0) {
        continue;
      }

      console.log(`🔍 [OCR Pipeline]: Processing fresh advisory file: ${targetFile.name}`);

      // Fetch the binary raw image bytes stream array out of Google Drive
      const mediaBuffer = await drive.files.get(
        { fileId: targetFile.id, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(mediaBuffer.data as ArrayBuffer);

      // Run Tesseract extraction mapping loop execution rules
      const { data: { text } } = await tesseractWorker.recognize(buffer);
      const cleanExtractedText = text || '';

      // SQLite uses "INSERT OR REPLACE INTO" syntax
      await db.query(
        `INSERT OR REPLACE INTO advisories (
          file_id, file_name, extracted_text
        ) VALUES ($1, $2, $3)`,
        [targetFile.id, targetFile.name || 'Unnamed Asset', cleanExtractedText]
      );

      console.log(`✅ [Cron Storage Matrix]: Successfully synchronized record: ${targetFile.id}`);
    }

    await tesseractWorker.terminate();
    console.log('✅ [Cron Worker]: Background sync interval sequence complete.');

  } catch (err: any) {
    console.error('❌ [Cron Engine Sync Error Exceptions Handled]:', err.message);
  }
}

export function initAdvisoryCron() {
  processAdvisorySyncPipeline();
  setInterval(processAdvisorySyncPipeline, 10 * 60 * 1000); // Trigger every 10 minutes safely
}