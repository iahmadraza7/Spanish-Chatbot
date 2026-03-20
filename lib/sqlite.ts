import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";
import { DB_PATH, ensureAppDirs } from "@/lib/paths";

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getSqliteDb() {
  if (db) return db;
  ensureAppDirs();
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  await migrate(db);
  return db;
}

async function migrate(d: Database) {
  await d.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      ext TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      preview_text TEXT,
      parsed_path TEXT
    );
    CREATE INDEX IF NOT EXISTS files_uploaded_at_idx ON files(uploaded_at);

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      content TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS chunks_file_id_idx ON chunks(file_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT,
      provider TEXT,
      escalated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS conv_session_idx ON conversations(session_id);
    CREATE INDEX IF NOT EXISTS conv_created_idx ON conversations(created_at);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export async function all<T = any>(d: Database, sql: string, params: any[] = []) {
  return (await d.all<T[]>(sql, params)) as any;
}

export async function get<T = any>(d: Database, sql: string, params: any[] = []) {
  return (await d.get<T>(sql, params)) ?? null;
}

export async function run(d: Database, sql: string, params: any[] = []) {
  await d.run(sql, params);
}

export async function persist(_d: Database) {
  // sqlite3 writes to disk automatically; no-op (kept for compatibility).
}

