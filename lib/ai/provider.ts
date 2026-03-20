import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/lib/env";
import { getSystemPrompt } from "@/lib/settings";

export type AIResult = {
  answer: string;
  provider: "openai" | "gemini" | "fallback";
};

type HistoryMessage = { role: "user" | "assistant"; content: string };

export async function generateAnswerSpanish(params: {
  question: string;
  context: string;
  history?: HistoryMessage[];
}): Promise<AIResult> {
  const openaiKey = getEnv("OPENAI_API_KEY");
  const geminiKey = getEnv("GEMINI_API_KEY");
  const systemPrompt = await getSystemPrompt();

  const historyBlock = formatHistory(params.history);
  const userContent =
    `CONTEXTO:\n${params.context}\n\n` +
    (historyBlock ? `HISTORIAL DE CONVERSACIÓN:\n${historyBlock}\n\n` : "") +
    `PREGUNTA DEL USUARIO:\n${params.question}\n\n` +
    `INSTRUCCIONES:\n- Responde en español.\n- Si falta información, di: "No encontré esa información en los archivos actuales."`;

  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const modelName = getEnv("GEMINI_MODEL", "gemini-flash-latest")!;
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = systemPrompt + "\n\n" + userContent;
      const resp = await model.generateContent(prompt);
      const answer = resp.response.text().trim();
      return {
        answer: answer || fallbackAnswer(params.question, params.context),
        provider: "gemini"
      };
    } catch (e) {
      console.error("Gemini Error:", e);
      // Fall through to OpenAI
    }
  }

  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const model = getEnv("OPENAI_MODEL", "gpt-4o-mini")!;
      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.2
      });
      const answer = resp.choices?.[0]?.message?.content?.trim() || "";
      return {
        answer: answer || fallbackAnswer(params.question, params.context),
        provider: "openai"
      };
    } catch (e) {
      console.error("OpenAI Error:", e);
      // Fall through to fallback
    }
  }

  return { answer: fallbackAnswer(params.question, params.context), provider: "fallback" };
}

/**
 * Streaming version: yields text chunks as they arrive from the AI provider.
 */
export async function* streamAnswerSpanish(params: {
  question: string;
  context: string;
  history?: HistoryMessage[];
}): AsyncGenerator<{ chunk: string; provider: "openai" | "gemini" | "fallback"; done: boolean }> {
  const openaiKey = getEnv("OPENAI_API_KEY");
  const geminiKey = getEnv("GEMINI_API_KEY");
  const systemPrompt = await getSystemPrompt();

  const historyBlock = formatHistory(params.history);
  const userContent =
    `CONTEXTO:\n${params.context}\n\n` +
    (historyBlock ? `HISTORIAL DE CONVERSACIÓN:\n${historyBlock}\n\n` : "") +
    `PREGUNTA DEL USUARIO:\n${params.question}\n\n` +
    `INSTRUCCIONES:\n- Responde en español.\n- Si falta información, di: "No encontré esa información en los archivos actuales."`;

  // Try Gemini streaming
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const modelName = getEnv("GEMINI_MODEL", "gemini-flash-latest")!;
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = systemPrompt + "\n\n" + userContent;
      const result = await model.generateContentStream(prompt);

      for await (const part of result.stream) {
        const chunk = part.text();
        if (chunk) {
          yield { chunk, provider: "gemini", done: false };
        }
      }
      yield { chunk: "", provider: "gemini", done: true };
      return;
    } catch (e) {
      console.error("Gemini Streaming Error:", e);
      // Fall through to OpenAI
    }
  }

  // Try OpenAI streaming
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const model = getEnv("OPENAI_MODEL", "gpt-4o-mini")!;
      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.2,
        stream: true
      });

      for await (const part of stream) {
        const chunk = part.choices?.[0]?.delta?.content ?? "";
        if (chunk) {
          yield { chunk, provider: "openai", done: false };
        }
      }
      yield { chunk: "", provider: "openai", done: true };
      return;
    } catch (e) {
      console.error("OpenAI Streaming Error:", e);
      // Fall through to fallback
    }
  }

  // Fallback (no streaming — single chunk)
  const answer = fallbackAnswer(params.question, params.context);
  yield { chunk: answer, provider: "fallback", done: true };
}

function formatHistory(history?: HistoryMessage[]): string {
  if (!history || history.length === 0) return "";
  return history
    .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
    .join("\n");
}

function fallbackAnswer(question: string, context: string) {
  const ctx = context.trim();
  if (!ctx) return "No encontré esa información en los archivos actuales.";

  const lines = ctx.split("\n").map((l) => l.trim()).filter(Boolean);
  const q = question.toLowerCase();
  const best = lines
    .map((l) => ({ l, s: scoreLine(q, l.toLowerCase()) }))
    .sort((a, b) => b.s - a.s)[0];

  if (!best || best.s <= 0) return "No encontré esa información en los archivos actuales.";
  return (
    "Según los archivos actuales, encontré lo siguiente:\n\n" +
    best.l +
    "\n\nSi necesitas un dato específico (modelo/año/precio/kilometraje), dime cuál."
  );
}

function scoreLine(q: string, l: string) {
  const terms = q
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  let s = 0;
  for (const t of terms) if (l.includes(t)) s += 1;
  return s;
}
