/**
 * Carga inicial del inventario (una sola vez).
 *
 * Uso:
 *   npm run seed
 *   docker compose exec app npm run seed
 *
 * Lógica:
 *  1. Si la tabla `files` ya tiene registros, no hace nada (idempotente).
 *  2. Resuelve el PDF a cargar:
 *       - uploads/inventario.pdf si existe.
 *       - de lo contrario, busca uploads/*.pdf:
 *           · exactamente 1  -> lo usa
 *           · 2 o más        -> error (no elige en silencio)
 *           · 0              -> error
 *  3. Crea el registro de archivo con nombre "Inventario Banzai - <archivo>"
 *     y deja el estatus en "ready" tras indexar.
 */
import fs from "fs";
import path from "path";
import { newId } from "@/lib/id";
import { UPLOADS_DIR, ensureAppDirs } from "@/lib/paths";
import { parseFileBuffer } from "@/lib/file-parsers/parse";
import { indexParsedText } from "@/lib/rag/index";
import { getSqliteDb, persist, run, get } from "@/lib/sqlite";

function resolveInventoryPdf(): { filePath: string; fileName: string } {
  const preferred = path.join(UPLOADS_DIR, "inventario.pdf");
  if (fs.existsSync(preferred)) {
    return { filePath: preferred, fileName: "inventario.pdf" };
  }

  const pdfs = fs.existsSync(UPLOADS_DIR)
    ? fs.readdirSync(UPLOADS_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"))
    : [];

  if (pdfs.length === 0) {
    throw new Error("No PDF found in uploads/");
  }
  if (pdfs.length > 1) {
    throw new Error(
      "Multiple PDFs found, please specify which one by renaming to inventario.pdf"
    );
  }
  return { filePath: path.join(UPLOADS_DIR, pdfs[0]), fileName: pdfs[0] };
}

async function main() {
  ensureAppDirs();
  const db = await getSqliteDb();

  const count = await get<{ n: number }>(
    db,
    `SELECT COUNT(*) as n FROM files`
  );
  if ((count?.n ?? 0) > 0) {
    console.log(
      "Ya hay archivos cargados en la base de datos. Omitiendo la carga inicial."
    );
    return;
  }

  const { filePath, fileName } = resolveInventoryPdf();
  console.log(`Cargando inventario desde: ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(fileName).toLowerCase() || ".pdf";
  const id = newId("file");
  const storedName = `${id}${ext}`;
  const storedPath = path.join(UPLOADS_DIR, storedName);
  // Etiqueta amigable para el panel de administración, conservando el
  // nombre original del archivo de origen.
  const originalName = `Inventario Banzai - ${fileName}`;

  await run(
    db,
    `INSERT INTO files (id, original_name, stored_name, mime_type, ext, size_bytes, uploaded_at, status, error_message, preview_text, parsed_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', NULL, NULL, NULL)`,
    [
      id,
      originalName,
      storedName,
      "application/pdf",
      ext,
      buffer.byteLength,
      new Date().toISOString()
    ]
  );
  await persist(db);

  fs.copyFileSync(filePath, storedPath);

  const parsed = await parseFileBuffer(fileName, "application/pdf", buffer);
  const indexed = await indexParsedText(id, originalName, parsed.text);

  console.log(
    `Inventario cargado correctamente: "${originalName}" (${indexed.chunkCount} fragmentos).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error en la carga inicial:", e?.message ?? e);
    process.exit(1);
  });
