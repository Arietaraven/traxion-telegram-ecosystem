import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the PostgreSQL connection pool
export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:admin123@localhost:5432/traxion_bot_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test Database Connectivity
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ [PostgreSQL]: Database initialization failed:', err.message);
  } else {
    console.log('⚡ [PostgreSQL]: Connection verified. Database engine is responsive.');
  }
});