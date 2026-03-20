import { NextResponse } from "next/server";
import { get, getSqliteDb } from "@/lib/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getSqliteDb();
  const files =
    (await get<{ n: number }>(db, `SELECT COUNT(*) as n FROM files`)) ?? { n: 0 };
  const chunks =
    (await get<{ n: number }>(db, `SELECT COUNT(*) as n FROM chunks`)) ?? { n: 0 };
  return NextResponse.json({
    ok: true,
    files: files.n,
    chunks: chunks.n,
    ts: new Date().toISOString()
  });
}

