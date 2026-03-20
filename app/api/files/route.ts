import { all, getSqliteDb } from "@/lib/sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getSqliteDb();
  const rows = await all(
    db,
    `SELECT id, original_name, mime_type, ext, size_bytes, uploaded_at, status, error_message
     FROM files ORDER BY uploaded_at DESC`
  );
  return NextResponse.json({ files: rows });
}

