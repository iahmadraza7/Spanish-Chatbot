import { NextResponse } from "next/server";
import { getSystemPrompt, saveSystemPrompt } from "@/lib/settings";
import { get, getSqliteDb } from "@/lib/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const prompt = await getSystemPrompt();
  const db = await getSqliteDb();
  const row = await get<{ updated_at: string }>(
    db,
    `SELECT updated_at FROM settings WHERE key = 'system_prompt'`
  );

  return NextResponse.json({
    ok: true,
    prompt,
    updatedAt: row?.updated_at ?? null
  });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = String(body?.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "El prompt no puede estar vacío." },
      { status: 400 }
    );
  }

  await saveSystemPrompt(prompt);
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}
