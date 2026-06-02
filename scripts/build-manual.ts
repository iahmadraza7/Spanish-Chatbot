/**
 * Renderiza docs/DEPLOYMENT_GUIDE_ES.md a un PDF pulido en la raíz del
 * proyecto: MANUAL_INSTALACION_BANZAI_ES.pdf
 *
 * Uso: npm run manual
 */
import fs from "fs";
import path from "path";
import { marked } from "marked";
import puppeteer from "puppeteer";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "docs", "DEPLOYMENT_GUIDE_ES.md");
const OUT = path.join(ROOT, "MANUAL_INSTALACION_BANZAI_ES.pdf");

const STYLE = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 12px;
    margin: 0;
  }
  h1 { font-size: 24px; color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 17px; color: #1d4ed8; margin-top: 28px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  h3 { font-size: 14px; color: #334155; margin-top: 18px; }
  p, li { font-size: 12px; }
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 11px; color: #be123c;
  }
  pre {
    background: #0f172a; color: #e2e8f0; padding: 12px 14px; border-radius: 8px;
    overflow-x: auto; font-size: 10.5px; line-height: 1.45;
  }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote {
    border-left: 4px solid #f59e0b; background: #fffbeb; margin: 12px 0;
    padding: 8px 14px; color: #92400e; border-radius: 0 6px 6px 0;
  }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 11px; }
  th { background: #f1f5f9; }
  a { color: #2563eb; text-decoration: none; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
`;

async function main() {
  const md = fs.readFileSync(SRC, "utf8");
  const bodyHtml = await marked.parse(md);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <style>${STYLE}</style></head><body>${bodyHtml}</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: OUT,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" }
    });
  } finally {
    await browser.close();
  }

  console.log(`PDF generado: ${OUT}`);
}

main().catch((e) => {
  console.error("Error al generar el PDF:", e?.message ?? e);
  process.exit(1);
});
