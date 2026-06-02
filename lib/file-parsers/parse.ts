import path from "path";
import { ParsedDoc } from "@/lib/file-parsers/types";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import Tesseract from "tesseract.js";

export async function parseFileBuffer(
  originalName: string,
  mimeType: string,
  buffer: Buffer
): Promise<ParsedDoc> {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf" || mimeType === "application/pdf") {
    const data = await pdf(buffer);
    return { text: normalizeText(data.text) };
  }

  if (
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/jpeg"
  ) {
    try {
      // Primera ejecución descarga los modelos spa+eng (~25 MB).
      const { data } = await Tesseract.recognize(buffer, "spa+eng");
      return { text: normalizeText(data.text || "") };
    } catch (err) {
      throw new Error(
        "No se pudo extraer el texto de la imagen. Verifique que la imagen sea legible e intente nuevamente."
      );
    }
  }

  if (ext === ".txt") {
    return { text: normalizeText(buffer.toString("utf8")) };
  }

  if (ext === ".docx") {
    const res = await mammoth.extractRawText({ buffer });
    return { text: normalizeText(res.value) };
  }

  if (ext === ".csv") {
    const csv = buffer.toString("utf8");
    const wb = XLSX.read(csv, { type: "string" });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1 }) : [];
    const text = rowsToInventoryLikeText(rows as any[]);
    return { text: normalizeText(text) };
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1 }) : [];
    const text = rowsToInventoryLikeText(rows as any[]);
    return { text: normalizeText(text) };
  }

  throw new Error(
    `Formato no soportado: ${ext || mimeType || "desconocido"}`
  );
}

function rowsToInventoryLikeText(rows: any[]) {
  // rows is array of arrays; we render as normalized lines for better retrieval.
  const lines: string[] = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    const cells = r
      .map((c) => String(c ?? "").trim())
      .filter((c) => c.length > 0);
    if (cells.length === 0) continue;
    lines.push(cells.join(" | "));
  }
  return lines.join("\n");
}

function normalizeText(s: string) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

