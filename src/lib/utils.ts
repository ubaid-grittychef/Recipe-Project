import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(date: string | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Stores per-key hit counts with a sliding window.
// Works on both Vercel (per-function cold starts reset counts, which is fine
// since the generation guard in generator.ts prevents concurrent runs) and
// on persistent Node.js servers.

const _rateLimitStore = new Map<string, { count: number; windowStart: number }>();

/**
 * Returns true if the action is allowed, false if the rate limit is exceeded.
 * @param key      Unique key (e.g. `gen:projectId`)
 * @param maxHits  Max allowed hits per window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, maxHits: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = _rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    _rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxHits) return false;
  entry.count++;
  return true;
}

// ── Retry helper ──────────────────────────────────────────────────────────────
// BUG 7 FIX: shared retry helper with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
  timeoutMs = 30000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((r) =>
        setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1))
      );
    }
  }
  throw new Error("unreachable");
}

