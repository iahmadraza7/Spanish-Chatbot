import { newId } from "@/lib/id";
import { all, getSqliteDb, run } from "@/lib/sqlite";

export type ConversationMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: string | null;
  provider: string | null;
  escalated: number;
  created_at: string;
};

export async function saveMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  provider?: string;
  escalated?: boolean;
}) {
  const db = await getSqliteDb();
  const id = newId("msg");
  await run(
    db,
    `INSERT INTO conversations (id, session_id, role, content, sources, provider, escalated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.sessionId,
      params.role,
      params.content,
      params.sources ? JSON.stringify(params.sources) : null,
      params.provider ?? null,
      params.escalated ? 1 : 0,
      new Date().toISOString()
    ]
  );
  return id;
}

export async function getRecentHistory(sessionId: string, limit = 6) {
  const db = await getSqliteDb();
  const rows = await all<ConversationMessage>(
    db,
    `SELECT role, content FROM conversations
     WHERE session_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [sessionId, limit]
  );
  // Reverse so oldest first
  return (rows as ConversationMessage[]).reverse();
}

const ESCALATION_KEYWORDS = [
  "hablar con agente",
  "hablar con una persona",
  "hablar con alguien",
  "hablar con asesor",
  "quiero un asesor",
  "necesito un asesor",
  "agente humano",
  "persona real",
  "asesor",
  "agente",
  "representante",
  "hablar con un humano",
  "comunicar con una persona",
  "contactar a alguien",
  "derivar",
];

export function detectEscalation(message: string): boolean {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ESCALATION_KEYWORDS.some((kw) => {
    const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return lower.includes(normalizedKw);
  });
}

export const ESCALATION_RESPONSE =
  "Con gusto te comunico con uno de nuestros asesores. Por favor deja tu nombre y número de contacto y en breve te contactamos. 🙌";
