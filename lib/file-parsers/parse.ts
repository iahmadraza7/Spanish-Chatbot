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
    const structured = postProcessInventoryPdf(data.text);
    const combined = structured
      ? `${structured}\n\n${data.text}`
      : data.text;
    return { text: normalizeText(combined) };
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

/**
 * Post-procesador para el PDF de inventario de la concesionaria.
 *
 * pdf-parse desarma la tabla ancha del inventario en fragmentos pegados
 * (p. ej. "X-TRAIL PLATINUM 2 ROW" se rompe en varias líneas y las celdas
 * quedan unidas sin espacios). Esta función detecta las filas de inventario,
 * las reensambla y emite una línea normalizada por vehículo. Si el PDF no
 * tiene el formato de inventario (no se detectan números de fila), devuelve
 * null y el parser usa el texto crudo tal cual (parser de propósito general).
 */
const COLOR_ANCHORS = [
  "BLANCO",
  "NEGRO",
  "PLATA",
  "BEIGE",
  "ROJO",
  "ROJA",
  "GRIS",
  "AMARILLO",
  "AZUL",
  "VERDE",
  "NARANJA",
  "FIERY",
  "SLATE",
  "SUMMINT",
  "SUMMIT",
  "WHITE",
  "DORADO",
  "VINO"
];

// El orden importa: SALA aparece pegada (sin límites de palabra) y solo
// debe ganar cuando no hay Mocambo ni Martinez en la fila.
const UBICACIONES: { re: RegExp; label: string }[] = [
  { re: /MART[IÍ]NEZ/i, label: "Martinez" },
  { re: /MOCAMBO/i, label: "Mocambo" },
  { re: /MOCA,?BO/i, label: "Mocambo" },
  { re: /SALA/i, label: "Sala" }
];

function postProcessInventoryPdf(raw: string): string | null {
  const lines = raw.split(/\r?\n/);
  const rowIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\d{1,2}\s*$/.test(lines[i])) rowIdxs.push(i);
  }
  // Si no parece inventario (pocos números de fila), no procesamos.
  if (rowIdxs.length < 3) return null;

  const out: string[] = [];
  for (let r = 0; r < rowIdxs.length; r++) {
    const start = rowIdxs[r];
    const end = r + 1 < rowIdxs.length ? rowIdxs[r + 1] : lines.length;
    const unidad = lines[start].trim();

    // Unir el bloque (sin la línea del número de fila) y colapsar espacios.
    let block = lines
      .slice(start + 1, end)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    // Cortar pie de página si quedó dentro del último bloque.
    block = block.split(/UNIDADES EN |INVENTARIO GRUPO BANZAI/i)[0].trim();

    // Año (MOD) seguido inmediatamente del kilometraje (formato 00,000).
    const yearKm = block.match(/20(2[0-9])(\d{1,3}(?:,\d{3})+)/);
    if (!yearKm) continue;
    const year = "20" + yearKm[1];
    const km = yearKm[2];
    const yearIndex = block.indexOf(yearKm[0]);

    // Todo lo previo al año es VEHICULO + COLOR (pegados).
    const leading = block.slice(0, yearIndex).trim();
    let vehiculo = leading;
    let color = "";
    let colorPos = -1;
    for (const c of COLOR_ANCHORS) {
      const p = leading.indexOf(c);
      if (p >= 0 && (colorPos === -1 || p < colorPos)) colorPos = p;
    }
    if (colorPos >= 0) {
      vehiculo = leading.slice(0, colorPos).replace(/\s+/g, " ").trim();
      color = leading.slice(colorPos).replace(/\s+/g, " ").trim();
    }

    let ubicacion = "";
    for (const u of UBICACIONES) {
      if (u.re.test(block)) {
        ubicacion = u.label;
        break;
      }
    }

    const acond = /SIN ACONDICIONAR/i.test(block)
      ? "Sin acondicionar"
      : /ACONDICIONADO/i.test(block)
        ? "Acondicionado"
        : "";
    const cambioBaja = /\bBAJA\b/i.test(block)
      ? "Baja"
      : /CAMBIO DE\s+PROPIETARIO/i.test(block)
        ? "Cambio de propietario"
        : "";
    const estatus = [acond, cambioBaja].filter(Boolean).join(" / ");

    // Todos los precios; el último es el "Precio especial".
    const prices = Array.from(block.matchAll(/\$\s*([\d,]+)\.\d{2}/g)).map(
      (m) => m[1]
    );
    const precioEspecial = prices.length ? prices[prices.length - 1] : "";

    // No se emite el número de serie (VIN) por política de privacidad.
    const parts = [`Unidad ${unidad}: ${vehiculo}`, `Año ${year}`];
    if (color) parts.push(`Color ${color}`);
    parts.push(`${km} km`);
    if (ubicacion) parts.push(`Ubicación ${ubicacion}`);
    if (estatus) parts.push(`Estatus ${estatus}`);
    if (precioEspecial) parts.push(`Precio especial $${precioEspecial} MXN`);
    out.push(parts.join(" | "));
  }

  if (out.length === 0) return null;
  return "INVENTARIO (datos estructurados):\n" + out.join("\n");
}

function normalizeText(s: string) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

