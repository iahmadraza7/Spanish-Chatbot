import { NextResponse } from "next/server";
import { saveHandoff } from "@/lib/handoffs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const sessionId = String(body?.sessionId ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Por favor indique su nombre." },
      { status: 400 }
    );
  }

  // Validación básica de teléfono: al menos 7 dígitos.
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return NextResponse.json(
      { ok: false, error: "Por favor indique un número de teléfono válido." },
      { status: 400 }
    );
  }

  await saveHandoff({ sessionId: sessionId || undefined, name, phone });

  return NextResponse.json({
    ok: true,
    message: "¡Gracias! Un asesor lo contactará pronto."
  });
}
