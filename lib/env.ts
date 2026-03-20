export function getEnv(name: string, fallback?: string) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v;
}

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

