import { NextResponse } from "next/server";
import { listHandoffs } from "@/lib/handoffs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const leads = await listHandoffs();
  return NextResponse.json({ ok: true, leads });
}
