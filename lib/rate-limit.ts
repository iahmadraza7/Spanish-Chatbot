/**
 * Simple in-memory sliding-window rate limiter.
 * Limits by IP address with configurable window and max requests.
 */

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20;  // 20 requests per minute per IP

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60_000);

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

/**
 * Core sliding-window check with configurable window/limit.
 * The identifier should be namespaced by caller (e.g. "upload:<ip>") so that
 * different endpoints keep separate buckets.
 */
export function checkRateLimitCustom(
  identifier: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= max) {
    const oldest = entry.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: windowMs - (now - oldest)
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: max - entry.timestamps.length,
    resetMs: windowMs
  };
}

export function checkRateLimit(identifier: string): RateLimitResult {
  return checkRateLimitCustom(identifier, MAX_REQUESTS, WINDOW_MS);
}

// Subida de archivos: 10 por minuto por IP.
export function checkUploadRateLimit(ip: string): RateLimitResult {
  return checkRateLimitCustom(`upload:${ip}`, 10, 60_000);
}
