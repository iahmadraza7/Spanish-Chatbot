import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import pkg from "@/package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Momento de arranque del proceso (aprox. tiempo de build/despliegue).
const BUILT_AT = new Date().toISOString();

export async function GET() {
  const model = getEnv("OPENAI_MODEL", "gpt-5-nano")!;
  const provider = getEnv("GEMINI_API_KEY")
    ? "gemini"
    : getEnv("OPENAI_API_KEY")
      ? "openai"
      : "fallback";

  return NextResponse.json({
    version: pkg.version,
    builtAt: BUILT_AT,
    model,
    provider
  });
}
