export type Chunk = {
  idx: number;
  content: string;
};

export function chunkText(text: string, maxChars = 900): Chunk[] {
  const blocks = splitBlocks(text);
  const chunks: Chunk[] = [];
  let current = "";
  let idx = 0;

  const push = (c: string) => {
    const content = c.trim();
    if (!content) return;
    chunks.push({ idx: idx++, content });
  };

  for (const b of blocks) {
    if ((current + "\n\n" + b).length <= maxChars) {
      current = current ? `${current}\n\n${b}` : b;
      continue;
    }
    if (current) push(current);
    if (b.length <= maxChars) {
      current = b;
    } else {
      // hard wrap long block
      for (let i = 0; i < b.length; i += maxChars) {
        push(b.slice(i, i + maxChars));
      }
      current = "";
    }
  }
  if (current) push(current);
  return chunks;
}

function splitBlocks(text: string) {
  // Prefer splitting by blank lines; fallback to line grouping.
  const raw = text.split(/\n\s*\n/g).map((s) => s.trim());
  const blocks = raw.filter(Boolean);
  if (blocks.length > 0) return blocks;
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

