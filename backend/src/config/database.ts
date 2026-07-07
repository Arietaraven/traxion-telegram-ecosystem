import sqlite3 from 'sqlite3';
import path from 'path';

// This dynamically points to a database file right inside your root backend folder
const databaseFilePath = path.join(__dirname, '../../database.sqlite');

// Open or create the database file locally (No administrative rights required!)
const sqliteInstance = new sqlite3.Database(databaseFilePath, (err) => {
  if (err) {
    console.error('❌ [SQLite]: Local file-engine initialization failed:', err.message);
  } else {
    console.log('⚡ [SQLite]: Connection verified. Local file-database is responsive.');
  }
});

// Polyfill compatibility matrix wrapper to mimic 'pg' pool behavior
export const db = {
  query: (sql: string, params: any[] = []): Promise<{ rows: any[] }> => {
    return new Promise((resolve, reject) => {
      // Safely replace PostgreSQL parameter notation ($1, $2) with SQLite positional (?) markers
      const normalizedSql = sql.replace(/\$\d+/g, '?');

      if (normalizedSql.trim().toUpperCase().startsWith('SELECT')) {
        sqliteInstance.all(normalizedSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      } else {
        sqliteInstance.run(normalizedSql, params, function (err) {
          if (err) reject(err);
          else resolve({ rows: [] });
        });
      }
    });
  }
};

// Auto-bootstrap schemas safely on launch if they don't exist yet
sqliteInstance.serialize(() => {
  // 1. Core Transaction Caching Table
  sqliteInstance.run(`
    CREATE TABLE IF NOT EXISTS cached_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_number TEXT NOT NULL,
      transaction_reference TEXT NOT NULL,
      integrator_reference TEXT,
      aggregator_reference TEXT,
      amount TEXT DEFAULT '0',
      fee REAL DEFAULT 0,
      status INTEGER DEFAULT 0,
      remarks TEXT,
      date_time_created TEXT,
      date_time_updated TEXT,
      UNIQUE(trace_number, transaction_reference)
    )
  `);

  // 2. OCR Advisory Storage Table
  sqliteInstance.run(`
    CREATE TABLE IF NOT EXISTS advisories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL UNIQUE,
      file_name TEXT,
      extracted_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. 🧾 NEW INVOICES SCHEMA INTEGRATION (Migrated legacy schema)
  sqliteInstance.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_code TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      merchant_name TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      reference_number TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});