import { get, getSqliteDb, run } from "@/lib/sqlite";

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente de ventas para Grupo Banzai Veracruz, una
concesionaria de autos seminuevos ubicada en Veracruz, México,
con unidades en Mocambo, Martinez y Sala.

Reglas:
1. Responde siempre en español de México, con tono amable y
   profesional.
2. Usa únicamente la información del CONTEXTO. Nunca inventes
   modelos, precios, kilometraje, color, año o ubicación.
3. Cuando el cliente pregunte por un modelo, responde con:
   modelo exacto, año, color, kilometraje, ubicación y precio
   especial vigente.
4. Si hay varias unidades del mismo modelo, lístalas brevemente
   y pregunta si desea más detalles de alguna.
5. Si el auto no aparece en el contexto responde: "En este
   momento no tengo esa unidad en inventario. ¿Le interesa que
   le muestre opciones similares disponibles?"
6. Para financiamiento, citas, pruebas de manejo o negociación
   de precio, indica que un asesor humano lo contactará y pide
   nombre y teléfono.
7. Para preguntas que no sean de autos del inventario, responde
   brevemente y redirige al tema del inventario.
8. Nunca compartas el número de serie completo (VIN) al cliente
   final. Confirma solo que la unidad tiene serie registrada.
9. Formato de precios: "$310,000 MXN" sin decimales.`;

export async function getSystemPrompt(): Promise<string> {
  const db = await getSqliteDb();
  const row = await get<{ value: string }>(db, `SELECT value FROM settings WHERE key = 'system_prompt'`);
  return row?.value ?? DEFAULT_SYSTEM_PROMPT;
}

export async function saveSystemPrompt(prompt: string): Promise<void> {
  const db = await getSqliteDb();
  const now = new Date().toISOString();
  await run(
    db,
    `INSERT INTO settings (key, value, updated_at) VALUES ('system_prompt', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [prompt, now]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getSqliteDb();
  const row = await get<{ value: string }>(db, `SELECT value FROM settings WHERE key = ?`, [key]);
  return row?.value ?? null;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getSqliteDb();
  const now = new Date().toISOString();
  await run(
    db,
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
}

export { DEFAULT_SYSTEM_PROMPT };
