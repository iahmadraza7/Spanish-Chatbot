import { NextRequest } from "next/server";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { streamAnswerSpanish } from "@/lib/ai/provider";
import { saveMessage, getRecentHistory, detectEscalation, ESCALATION_RESPONSE } from "@/lib/conversations";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("CHAT_API: START");
  // --- Rate limiting ---
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Demasiadas solicitudes. Por favor espera un momento antes de enviar otra pregunta."
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rl.resetMs / 1000))
        }
      }
    );
  }

  console.log("CHAT_API: RATE LIMIT OK");

  // --- Parse body ---
  const body = await req.json().catch(() => ({}));
  const question = String(body?.question ?? "").trim();
  const sessionId = String(body?.sessionId ?? "").trim() || generateSessionId();
  const streaming = body?.stream !== false; // default to streaming

  console.log("CHAT_API: PARSED BODY", { question, sessionId });

  if (!question) {
    console.log("CHAT_API: NO QUESTION");
    return new Response(
      JSON.stringify({ ok: false, error: "Escribe una pregunta." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("CHAT_API: SAVING USER MESSAGE");
  // --- Save user message ---
  await saveMessage({ sessionId, role: "user", content: question });
  console.log("CHAT_API: MESSAGE SAVED");

  // --- Check for escalation / human handoff ---
  if (detectEscalation(question)) {
    await saveMessage({
      sessionId,
      role: "assistant",
      content: ESCALATION_RESPONSE,
      escalated: true
    });
    if (streaming) {
      return createStreamResponse(async function* () {
        yield { type: "token", content: ESCALATION_RESPONSE };
        yield { type: "done", provider: "system", sources: [], escalated: true };
      });
    }
    return new Response(
      JSON.stringify({ ok: true, answer: ESCALATION_RESPONSE, sources: [], provider: "system", escalated: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- RAG: retrieve relevant chunks ---
  const retrieved = await retrieveRelevantChunks(question, 6);
  const context = retrieved
    .map((c, i) => `FUENTE ${i + 1}: ${c.fileName}\n${c.content}\n`)
    .join("\n---\n");

  const sources = Array.from(new Set(retrieved.map((r) => r.fileName))).slice(0, 5);

  // --- Get conversation history ---
  const history = await getRecentHistory(sessionId, 6);

  // --- Streaming response ---
  if (streaming) {
    return createStreamResponse(async function* () {
      let fullAnswer = "";
      let provider: string = "fallback";

      for await (const part of streamAnswerSpanish({ question, context, history })) {
        provider = part.provider;
        if (part.chunk) {
          fullAnswer += part.chunk;
          yield { type: "token", content: part.chunk };
        }
        if (part.done) {
          // Append source attribution
          if (sources.length > 0) {
            const sourceNote = `\n\nEsta respuesta fue generada usando: ${sources.join(", ")}`;
            fullAnswer += sourceNote;
            yield { type: "token", content: sourceNote };
          }

          // Save assistant message
          await saveMessage({
            sessionId,
            role: "assistant",
            content: fullAnswer,
            sources,
            provider
          });

          yield { type: "done", provider, sources, escalated: false };
        }
      }
    });
  }

  // --- Non-streaming fallback ---
  const { generateAnswerSpanish } = await import("@/lib/ai/provider");
  const ai = await generateAnswerSpanish({ question, context, history });
  const usedSources = sources.length > 0;
  const answer =
    ai.answer.trim() +
    (usedSources ? `\n\nEsta respuesta fue generada usando: ${sources.join(", ")}` : "");

  await saveMessage({
    sessionId,
    role: "assistant",
    content: answer,
    sources,
    provider: ai.provider
  });

  return new Response(
    JSON.stringify({ ok: true, answer, sources, provider: ai.provider }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// --- Helpers ---

function createStreamResponse(
  generator: () => AsyncGenerator<Record<string, unknown>>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator()) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (err: any) {
        const errorEvent = JSON.stringify({ type: "error", message: String(err?.message ?? err) });
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

function generateSessionId(): string {
  return "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
