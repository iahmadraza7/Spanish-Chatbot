import { verifyAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");

  // Important: redirect using relative paths, not absolute URLs.
  // Next.js' internal `req.url` may use `localhost` on the server/container,
  // which breaks redirects for external users (browser goes to the user's localhost).
  const safeNext = nextPath.startsWith("/") ? nextPath : "/admin";

  if (!verifyAdmin(email, password)) {
    return NextResponse.redirect("/login?error=1", { status: 303 });
  }

  const res = NextResponse.redirect(safeNext, { status: 303 });
  res.cookies.set("mvp_admin_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
  return res;
}

