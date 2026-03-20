import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { streamAnswerSpanish } from "@/lib/ai/provider";
import { saveMessage, getRecentHistory, detectEscalation, ESCALATION_RESPONSE } from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta verification handshake
export async function GET(req: NextRequest) {
  const verifyToken = getEnv("WHATSAPP_VERIFY_TOKEN", "");
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false }, { status: 403 });
}

// Handle incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message?.type === "text") {
      const fromPhone = message.from;
      const question = message.text.body;
      const sessionId = `wa_${fromPhone}`; // unique session per phone number

      // 1. Save user msg
      await saveMessage({ sessionId, role: "user", content: question });

      let finalAnswer = "";

      // 2. Check escalation
      if (detectEscalation(question)) {
        finalAnswer = ESCALATION_RESPONSE;
        await saveMessage({ sessionId, role: "assistant", content: finalAnswer, escalated: true });
        // Send escalation notification to admin? (Future)
      } else {
        // 3. RAG pipeline
        const retrieved = await retrieveRelevantChunks(question, 6);
        const context = retrieved
          .map((c, i) => `FUENTE ${i + 1}: ${c.fileName}\n${c.content}\n`)
          .join("\n---\n");

        const history = await getRecentHistory(sessionId, 6);

        // We can't stream to WhatsApp directly because it expects a single webhook reply,
        // so we consume the stream entirely before sending.
        let provider = "fallback";
        const sources = Array.from(new Set(retrieved.map((r) => r.fileName))).slice(0, 5);

        for await (const part of streamAnswerSpanish({ question, context, history })) {
          provider = part.provider;
          if (part.chunk) finalAnswer += part.chunk;
        }

        if (sources.length > 0) {
          finalAnswer += `\n\n(Generado usando: ${sources.join(", ")})`;
        }

        await saveMessage({ sessionId, role: "assistant", content: finalAnswer, sources, provider });
      }

      // 4. Send reply via Meta Graph API
      await sendWhatsAppMessage(fromPhone, finalAnswer);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function sendWhatsAppMessage(to: string, body: string) {
  const token = getEnv("WHATSAPP_ACCESS_TOKEN");
  const phoneId = getEnv("WHATSAPP_PHONE_NUMBER_ID");

  if (!token || !phoneId) {
    console.warn("WhatsApp credentials not configured, skipping send.");
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("Failed to send WhatsApp message:", data);
  }
}
