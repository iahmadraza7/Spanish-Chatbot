import fs from "fs/promises";
import path from "path";
import type { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import initSqlJsDefault from "sql.js";
import { DB_PATH, ensureAppDirs } from "@/lib/paths";

let db: SqlJsDatabase | null = null;
let SQL: SqlJsStatic | null = null;

async function init() {
  if (SQL) return SQL;

  SQL = await initSqlJsDefault({
    locateFile: (file) =>
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  return SQL;
}

export async function getSqliteDb() {
  if (db) return db;
  ensureAppDirs();
  await init();

  let fileBytes: Uint8Array | null = null;
  try {
    const buf = await fs.readFile(DB_PATH);
    fileBytes = new Uint8Array(buf);
  } catch {
    fileBytes = null;
  }

  db = fileBytes ? new (SQL as SqlJsStatic).Database(fileBytes) : new (SQL as SqlJsStatic).Database();
  migrate(db);
  return db;
}

function migrate(d: SqlJsDatabase) {
  d.exec(`
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

    CREATE TABLE IF NOT EXISTS handoffs (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS handoffs_created_idx ON handoffs(created_at);
  `);
}

export async function all<T = any>(
  d: SqlJsDatabase,
  sql: string,
  params: any[] = []
) {
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

export async function get<T = any>(
  d: SqlJsDatabase,
  sql: string,
  params: any[] = []
) {
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? (stmt.getAsObject() as T) : null;
  stmt.free();
  return row;
}

export async function run(d: SqlJsDatabase, sql: string, params: any[] = []) {
  const stmt = d.prepare(sql);
  stmt.run(params);
  stmt.free();
}

export async function persist(d: SqlJsDatabase) {
  try {
    const bytes: Uint8Array = d.export();
    await fs.writeFile(DB_PATH, Buffer.from(bytes));
  } catch {
    // Best-effort persistence for MVP; if something fails in the runtime
    // environment, we still want the API to keep working.
  }
}

