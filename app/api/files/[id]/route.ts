import { get, getSqliteDb, persist, run } from "@/lib/sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const db = await getSqliteDb();
  const file = await get(
    db,
    `SELECT id, original_name, ext, uploaded_at, status, error_message, preview_text FROM files WHERE id = ?`,
    [params.id]
  );
  if (!file) {
    return NextResponse.json(
      { ok: false, error: "Archivo no encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, file });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const db = await getSqliteDb();
  const file = await get<{ stored_name: string }>(
    db,
    `SELECT stored_name FROM files WHERE id = ?`,
    [params.id]
  );
  if (!file) {
    return NextResponse.json(
      { ok: false, error: "Archivo no encontrado." },
      { status: 404 }
    );
  }
  await run(db, `DELETE FROM chunks WHERE file_id = ?`, [params.id]);
  await run(db, `DELETE FROM files WHERE id = ?`, [params.id]);
  await persist(db);
  // Best-effort disk cleanup; ignore errors
  try {
    const { UPLOADS_DIR } = await import("@/lib/paths");
    const path = (await import("path")).default;
    const fs = await import("fs/promises");
    await fs.unlink(path.join(UPLOADS_DIR, file.stored_name));
  } catch {}
  return NextResponse.json({ ok: true });
}

