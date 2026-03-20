import fs from "fs/promises";
import path from "path";
import { chunkText } from "@/lib/rag/chunk";
import { newId } from "@/lib/id";
import { PARSED_DIR } from "@/lib/paths";
import { getSqliteDb, persist, run } from "@/lib/sqlite";

export async function indexParsedText(
  fileId: string,
  originalName: string,
  text: string
) {
  const db = await getSqliteDb();
  const preview = text.slice(0, 1200);
  const parsedPath = path.join(PARSED_DIR, `${fileId}.txt`);
  await fs.writeFile(parsedPath, text, "utf8");

  const chunks = chunkText(text);
  await db.exec("BEGIN");
  try {
    await run(db, `DELETE FROM chunks WHERE file_id = ?`, [fileId]);
    await run(
      db,
      `UPDATE files SET status = 'ready', error_message = NULL, preview_text = ?, parsed_path = ? WHERE id = ?`,
      [preview, parsedPath, fileId]
    );
    for (const c of chunks) {
      await run(db, `INSERT INTO chunks (id, file_id, idx, content) VALUES (?, ?, ?, ?)`, [
        newId("chk"),
        fileId,
        c.idx,
        c.content
      ]);
    }
    await db.exec("COMMIT");
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
  await persist(db);

  return { chunkCount: chunks.length, preview };
}

