import { verifyAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");

  if (!verifyAdmin(email, password)) {
    return NextResponse.redirect(new URL("/login?error=1", req.url), {
      status: 303
    });
  }

  const res = NextResponse.redirect(new URL(nextPath, req.url), { status: 303 });
  res.cookies.set("mvp_admin_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
  return res;
}

