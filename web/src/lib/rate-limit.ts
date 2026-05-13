// In-memory sliding-window rate limiter. Single-instance only — fine for a
// prototype share link, not for production traffic. If multiple Vercel
// serverless instances spin up, each has its own bucket — a determined user
// could spread requests across instances. Acceptable trade-off for v0.

const WINDOW_MS = 30_000;
const MAX_REQUESTS_PER_WINDOW = 6;

const buckets = new Map<string, number[]>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const recent = (buckets.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = recent[0];
    const retryAfterMs = oldest + WINDOW_MS - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recent.push(now);
  buckets.set(ip, recent);
  return { allowed: true };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const real = headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
