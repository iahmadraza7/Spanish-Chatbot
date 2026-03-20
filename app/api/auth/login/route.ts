import { verifyAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");

  // Next.js requires absolute URLs for redirects in some production paths.
  // We build the origin from request headers to avoid redirecting to container localhost.
  const safeNext = nextPath.startsWith("/") ? nextPath : "/admin";

  // Use Next's parsed URL origin (based on the incoming Host header).
  // This prevents redirects to container localhost/IPs.
  const origin = req.nextUrl.origin;

  const failUrl = new URL("/login?error=1", origin);
  const okUrl = new URL(safeNext, origin);

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

