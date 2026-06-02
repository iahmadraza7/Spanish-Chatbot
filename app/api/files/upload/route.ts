import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { newId } from "@/lib/id";
import { UPLOADS_DIR, ensureAppDirs } from "@/lib/paths";
import { parseFileBuffer } from "@/lib/file-parsers/parse";
import { indexParsedText } from "@/lib/rag/index";
import { getSqliteDb, persist, run } from "@/lib/sqlite";
import { checkUploadRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_EXT = new Set([
  ".pdf",
  ".csv",
  ".xlsx",
  ".xls",
  ".txt",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg"
]);

export async function POST(req: Request) {
  ensureAppDirs();

  // --- Rate limiting: 10 subidas por minuto por IP ---
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkUploadRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Demasiadas subidas. Espere un momento antes de cargar otro archivo."
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) }
      }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No se recibió ningún archivo." },
      { status: 400 }
    );
  }

  const originalName = file.name;
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Formato no soportado. Use PDF, CSV, XLSX, TXT, DOCX, PNG o JPG."
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = buffer.byteLength;
  const id = newId("file");
  const storedName = `${id}${ext}`;
  const storedPath = path.join(UPLOADS_DIR, storedName);

  const db = await getSqliteDb();
  await run(
    db,
    `INSERT INTO files (id, original_name, stored_name, mime_type, ext, size_bytes, uploaded_at, status, error_message, preview_text, parsed_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', NULL, NULL, NULL)`,
    [
      id,
      originalName,
      storedName,
      file.type || "application/octet-stream",
      ext,
      size,
      new Date().toISOString()
    ]
  );
  await persist(db);

  await fs.writeFile(storedPath, buffer);

  try {
    const parsed = await parseFileBuffer(originalName, file.type, buffer);
    const indexed = await indexParsedText(id, originalName, parsed.text);
    return NextResponse.json({
      ok: true,
      fileId: id,
      chunkCount: indexed.chunkCount
    });
  } catch (e: any) {
    await run(
      db,
      `UPDATE files SET status = 'error', error_message = ? WHERE id = ?`,
      [String(e?.message ?? e), id]
    );
    await persist(db);
    return NextResponse.json(
      { ok: false, error: "Error al procesar el archivo.", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

