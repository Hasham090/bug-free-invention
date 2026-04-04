import Database from 'better-sqlite3';
import path from 'path';

export function ensureTables() {
  const dbPath = path.join(process.cwd(), 'clauseguard.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_type TEXT,
      uploaded_at INTEGER DEFAULT (unixepoch()),
      contract_text TEXT,
      analysis_result TEXT,
      overall_risk_score INTEGER,
      contract_type TEXT,
      status TEXT DEFAULT 'pending'
    );
  `);
  sqlite.close();
}
