import { verifyAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");

  const safeNext = nextPath.startsWith("/") ? nextPath : "/admin";

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
  const proxyOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const origin = proxyOrigin || req.headers.get("origin") || req.nextUrl.origin;

  const failUrl = new URL(origin + "/login?error=1");
  const okUrl = new URL(origin + safeNext);

  if (!verifyAdmin(email, password)) {
    return NextResponse.redirect(failUrl, { status: 303 });
  }

  const res = NextResponse.redirect(okUrl, { status: 303 });
  res.cookies.set("mvp_admin_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
  return res;
}

