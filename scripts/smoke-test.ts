/**
 * Pruebas de humo del chatbot Banzai.
 *
 * Requiere el servidor de desarrollo corriendo:  npm run dev
 * Uso:  npm run smoke
 *
 * Pasos:
 *  1. Inicia sesión en /api/auth/login con las credenciales de admin (.env).
 *  2. Confirma que el inventario fue cargado (/api/health, files >= 1).
 *  3. Envía 10 preguntas a /api/chat (modo no-streaming) e imprime la
 *     respuesta + fuentes citadas + latencia.
 *  4. Imprime un resumen final.
 */
import fs from "fs";
import path from "path";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";

// --- Carga sencilla de .env (tsx no la hace automáticamente) ---
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@demo.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

type QuerySpec = {
  q: string;
  expect: "inventory" | "handoff" | "no-stock";
};

const QUERIES: QuerySpec[] = [
  { q: "¿Qué autos tienen disponibles?", expect: "inventory" },
  { q: "¿Qué precio tiene el X-Trail Platinum 2 Row?", expect: "inventory" },
  { q: "¿Tienen Sentra en color blanco?", expect: "inventory" },
  { q: "¿Cuál es el auto más económico que tienen?", expect: "inventory" },
  { q: "¿Tienen autos del 2024 con menos de 30,000 km?", expect: "inventory" },
  { q: "¿Dónde está ubicada la Honda HR-V?", expect: "inventory" },
  { q: "¿Tienen algún Nissan Kicks?", expect: "inventory" },
  { q: "¿Cuánto cuesta el Infiniti QX50?", expect: "inventory" },
  { q: "Quiero hablar con un asesor", expect: "handoff" },
  { q: "¿Tienen Tesla Model 3?", expect: "no-stock" }
];

async function login(): Promise<string> {
  const form = new URLSearchParams();
  form.set("email", ADMIN_EMAIL);
  form.set("password", ADMIN_PASSWORD);
  form.set("next", "/admin");

  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    redirect: "manual"
  });

  const cookies = (r.headers as any).getSetCookie?.() ?? [];
  const session = cookies.find((c: string) => c.startsWith("mvp_admin_session="));
  if (!session) {
    throw new Error(
      `Login falló (status ${r.status}). Verifique ADMIN_EMAIL/ADMIN_PASSWORD.`
    );
  }
  // Devolver solo el par cookie "name=value".
  return session.split(";")[0];
}

async function checkHealth(cookie: string) {
  const r = await fetch(`${BASE}/api/health`, { headers: { cookie } });
  const j = await r.json();
  if (!j.ok || (j.files ?? 0) < 1) {
    throw new Error(
      `Inventario no cargado (files=${j.files}). Ejecute "npm run seed" primero.`
    );
  }
  return j;
}

type ChatResult = {
  answer: string;
  sources: string[];
  provider: string;
  escalated: boolean;
  ms: number;
};

async function ask(question: string): Promise<ChatResult> {
  const sessionId = "smoke_" + Math.random().toString(36).slice(2);
  const start = Date.now();
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, sessionId, stream: false })
  });
  const j = await r.json().catch(() => ({}));
  const ms = Date.now() - start;
  return {
    answer: String(j.answer ?? j.error ?? ""),
    sources: Array.isArray(j.sources) ? j.sources : [],
    provider: String(j.provider ?? "?"),
    escalated: Boolean(j.escalated),
    ms
  };
}

// Detecta la respuesta de "sin existencias" por su frase plantilla, sin
// confundirla con una respuesta válida que además ofrece opciones similares.
function looksLikeNoStock(answer: string): boolean {
  const a = answer.toLowerCase();
  return (
    a.includes("no tengo esa unidad") ||
    a.includes("no contamos con") ||
    a.includes("no disponemos") ||
    a.includes("no encontré esa información")
  );
}

async function main() {
  console.log(`\n=== PRUEBAS DE HUMO — ${BASE} ===\n`);

  const cookie = await login();
  console.log("✓ Login admin correcto");

  const health = await checkHealth(cookie);
  console.log(`✓ Inventario cargado: ${health.files} archivo(s), ${health.chunks} fragmentos\n`);

  let withSources = 0;
  let fallbacks = 0;
  let correct = 0;
  const latencies: number[] = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const { q, expect } = QUERIES[i];
    const res = await ask(q);
    latencies.push(res.ms);
    if (res.sources.length > 0) withSources++;
    if (res.provider === "fallback") fallbacks++;

    let ok = false;
    if (expect === "handoff") ok = res.escalated;
    else if (expect === "no-stock") ok = looksLikeNoStock(res.answer);
    else ok = res.answer.trim().length > 0 && !looksLikeNoStock(res.answer);
    if (ok) correct++;

    console.log(`[${i + 1}/10] ${q}`);
    console.log(`   → (${res.provider}, ${res.ms}ms, esperado: ${expect}, ${ok ? "OK" : "REVISAR"})`);
    console.log(`   ${res.answer.replace(/\n+/g, " ").slice(0, 280)}`);
    console.log(`   Fuentes: ${res.sources.length ? res.sources.join(", ") : "(ninguna)"}\n`);
  }

  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log("=== RESUMEN ===");
  console.log(`Respuestas correctas (según expectativa): ${correct}/${QUERIES.length}`);
  console.log(`Respuestas que citaron el inventario:     ${withSources}/${QUERIES.length}`);
  console.log(`Respuestas en modo fallback (sin IA):     ${fallbacks}/${QUERIES.length}`);
  console.log(`Latencia promedio:                        ${avg} ms`);
  console.log("");
}

main().catch((e) => {
  console.error("\nError en las pruebas de humo:", e?.message ?? e);
  console.error("¿Está corriendo el servidor?  npm run dev");
  process.exit(1);
});
