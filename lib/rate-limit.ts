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

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: WINDOW_MS - (now - oldest)
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.timestamps.length,
    resetMs: WINDOW_MS
  };
}
