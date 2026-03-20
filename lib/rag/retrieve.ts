import { all, getSqliteDb } from "@/lib/sqlite";

export type RetrievedChunk = {
  fileId: string;
  fileName: string;
  chunkId: string;
  content: string;
  score: number;
};

export async function retrieveRelevantChunks(question: string, limit = 6) {
  const db = await getSqliteDb();
  const files = await all<{ id: string; original_name: string; status: string }>(
    db,
    `SELECT id, original_name, status FROM files WHERE status = 'ready' ORDER BY uploaded_at DESC`
  );

  const qTokens = tokenize(question);
  if (qTokens.length === 0 || files.length === 0) return [];

  const out: RetrievedChunk[] = [];
  for (const f of files) {
    const chunks = await all<{ id: string; content: string }>(
      db,
      `SELECT id, content FROM chunks WHERE file_id = ?`,
      [f.id]
    );
    for (const c of chunks) {
      const score = overlapScore(qTokens, c.content);
      if (score <= 0) continue;
      out.push({
        fileId: f.id,
        fileName: f.original_name,
        chunkId: c.id,
        content: c.content,
        score
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

function tokenize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function overlapScore(qTokens: string[], docContent: string) {
  const docLower = docContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let score = 0;
  for (const t of qTokens) {
    if (docLower.includes(t)) {
      score += 1;
    }
  }
  return score;
}

const STOPWORDS = new Set([
  "que",
  "cual",
  "cuales",
  "como",
  "donde",
  "cuando",
  "para",
  "con",
  "sin",
  "por",
  "del",
  "las",
  "los",
  "una",
  "uno",
  "unos",
  "unas",
  "este",
  "esta",
  "estos",
  "estas",
  "hay",
  "tiene",
  "tienen"
]);

