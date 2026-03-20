import path from "path";
import fs from "fs";

export const PROJECT_ROOT = process.cwd();
export const DB_DIR = path.join(PROJECT_ROOT, "db");
export const DB_PATH = path.join(DB_DIR, "app.db");
export const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads");
export const PARSED_DIR = path.join(PROJECT_ROOT, "parsed");

export function ensureAppDirs() {
  for (const dir of [DB_DIR, UPLOADS_DIR, PARSED_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

