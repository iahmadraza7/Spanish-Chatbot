import crypto from "crypto";
import { getEnv } from "@/lib/env";

export const ADMIN_EMAIL_DEFAULT = "admin@demo.com";
export const ADMIN_PASSWORD_DEFAULT = "admin1234";

export function getAdminCredentials() {
  return {
    email: getEnv("ADMIN_EMAIL", ADMIN_EMAIL_DEFAULT)!,
    password: getEnv("ADMIN_PASSWORD", ADMIN_PASSWORD_DEFAULT)!
  };
}

export function verifyAdmin(email: string, password: string) {
  const creds = getAdminCredentials();
  const emailOk = timingSafeEqual(email.trim().toLowerCase(), creds.email);
  const passOk = timingSafeEqual(password, creds.password);
  return emailOk && passOk;
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

