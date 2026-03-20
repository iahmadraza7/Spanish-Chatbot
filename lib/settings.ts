import { get, getSqliteDb, run } from "@/lib/sqlite";

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente de atención al cliente en español para un negocio.
Tu nombre es "Asistente".

REGLAS ESTRICTAS:
1. Responde SIEMPRE en español, sin excepción.
2. Usa ÚNICAMENTE la información que encuentres en el CONTEXTO proporcionado.
3. Si la información no está en el contexto, responde exactamente:
   "No encontré esa información en los archivos actuales. Por favor, contacta directamente con el equipo para más detalles."
4. Nunca inventes datos, precios, modelos, kilómetros ni especificaciones.
5. Sé claro, breve, amable y profesional en todo momento.
6. Si el usuario pregunta por un vehículo específico, proporciona:
   - Modelo y versión
   - Año y kilometraje
   - Precio regular y precio especial (si existe)
   - Color disponible
   - Estado (acondicionado / sin acondicionar)
   - Ubicación (agencia/sala)
7. Si el usuario quiere hablar con una persona, responde:
   "Con gusto te comunico con uno de nuestros asesores. Por favor deja tu nombre y número de contacto."
8. No respondas preguntas que no tengan relación con el negocio.
9. Mantén el historial de la conversación para dar respuestas coherentes.
10. Si el usuario saluda, responde amablemente e indica que puedes ayudarle
    con información sobre vehículos, precios y disponibilidad.

FORMATO DE RESPUESTA PARA VEHÍCULOS:
Cuando presentes un vehículo, usa este formato:
🚗 [MODELO] [VERSIÓN]
📅 Año: [AÑO] | 📍 [UBICACIÓN]
🛣️ Kilometraje: [KM] km
💰 Precio: $[PRECIO]
[Si hay precio especial: 🏷️ Precio especial: $[PRECIO_ESPECIAL]]
🎨 Color: [COLOR]
🔧 Estado: [ACONDICIONADO / SIN ACONDICIONAR]`;

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
