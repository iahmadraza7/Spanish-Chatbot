import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Respect the reverse proxy so the redirect uses the public host, not the
  // container's internal address (mirrors the login route).
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
  const proxyOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const origin = proxyOrigin || req.headers.get("origin") || req.nextUrl.origin;

  const res = NextResponse.redirect(new URL(origin + "/login"), { status: 303 });
  res.cookies.set("mvp_admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return res;
}

