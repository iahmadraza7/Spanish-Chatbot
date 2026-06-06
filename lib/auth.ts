import crypto from "crypto";
import { getEnv } from "@/lib/env";

export function getAdminCredentials() {
  return {
    email: (getEnv("ADMIN_EMAIL") ?? "").trim().replace(/^['"]|['"]$/g, ''),
    password: (getEnv("ADMIN_PASSWORD") ?? "").trim().replace(/^['"]|['"]$/g, '')
  };
}

export function verifyAdmin(email: string, password: string) {
  const creds = getAdminCredentials();
  // Fail closed: si no hay credenciales configuradas en el entorno, se
  // rechaza el acceso (no hay usuario/contraseña por defecto en producción).
  if (!creds.email || !creds.password) return false;
  const emailOk = timingSafeEqual(email.trim().toLowerCase(), creds.email.toLowerCase());
  const passOk = timingSafeEqual(password, creds.password);
  return emailOk && passOk;
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

