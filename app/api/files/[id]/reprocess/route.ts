import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/paths";
import { parseFileBuffer } from "@/lib/file-parsers/parse";
import { indexParsedText } from "@/lib/rag/index";
import { get, getSqliteDb, persist, run } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const db = await getSqliteDb();
  const file = (await get<{
    id: string;
    original_name: string;
    stored_name: string;
    mime_type: string;
    status: string;
  }>(
    db,
    `SELECT id, original_name, stored_name, mime_type, status FROM files WHERE id = ?`,
    [params.id]
  )) as
    | {
        id: string;
        original_name: string;
        stored_name: string;
        mime_type: string;
        status: string;
      }
    | undefined;

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "Archivo no encontrado." },
      { status: 404 }
    );
  }

  await run(db, `UPDATE files SET status = 'processing', error_message = NULL WHERE id = ?`, [
    file.id
  ]);
  await persist(db);

  try {
    const buf = await fs.readFile(path.join(UPLOADS_DIR, file.stored_name));
    const parsed = await parseFileBuffer(file.original_name, file.mime_type, buf);
    const indexed = await indexParsedText(file.id, file.original_name, parsed.text);
    return NextResponse.json({ ok: true, chunkCount: indexed.chunkCount });
  } catch (e: any) {
    await run(db, `UPDATE files SET status = 'error', error_message = ? WHERE id = ?`, [
      String(e?.message ?? e),
      file.id
    ]);
    await persist(db);
    return NextResponse.json(
      { ok: false, error: "Error al reprocesar.", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

