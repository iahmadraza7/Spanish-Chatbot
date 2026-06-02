import { all, getSqliteDb, persist, run } from "@/lib/sqlite";
import { newId } from "@/lib/id";

export type Handoff = {
  id: string;
  session_id: string | null;
  name: string;
  phone: string;
  created_at: string;
};

/**
 * Guarda un lead (solicitud de contacto humano) en la tabla handoffs.
 */
export async function saveHandoff(params: {
  sessionId?: string;
  name: string;
  phone: string;
}) {
  const db = await getSqliteDb();
  const id = newId("lead");
  await run(
    db,
    `INSERT INTO handoffs (id, session_id, name, phone, created_at) VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      params.sessionId || null,
      params.name.trim(),
      params.phone.trim(),
      new Date().toISOString()
    ]
  );
  await persist(db);
  return id;
}

/**
 * Lista todos los leads, los más recientes primero.
 */
export async function listHandoffs(): Promise<Handoff[]> {
  const db = await getSqliteDb();
  return all<Handoff>(
    db,
    `SELECT id, session_id, name, phone, created_at FROM handoffs ORDER BY created_at DESC`
  );
}
