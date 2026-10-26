/**
 * Client-side sliding-window rate limit (localStorage).
 * Complements rules validation — not a substitute for Cloud Functions quotas.
 */

const STORAGE_PREFIX = "rr_rl:";

function readBucket(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeBucket(key, stamps) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(stamps.slice(-100)));
  } catch {
    /* private mode / quota */
  }
}

/**
 * @param {string} action - e.g. "apply", "website_chat", "register"
 * @param {{ max?: number, windowMs?: number, identity?: string }} opts
 * @throws {Error} when over limit
 */
export function assertClientRateLimit(action, opts = {}) {
  const max = opts.max ?? 5;
  const windowMs = opts.windowMs ?? 15 * 60 * 1000;
  const identity = String(opts.identity || "anon")
    .trim()
    .toLowerCase()
    .slice(0, 120);
  const key = `${action}:${identity || "anon"}`;
  const now = Date.now();
  const recent = readBucket(key).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    const retryMin = Math.ceil((windowMs - (now - recent[0])) / 60000);
    throw new Error(
      `Too many attempts. Please wait about ${Math.max(1, retryMin)} minute(s) and try again.`
    );
  }

  recent.push(now);
  writeBucket(key, recent);
}

/** Default budgets for public / high-abuse surfaces */
export const RATE_LIMITS = {
  apply: { max: 8, windowMs: 60 * 60 * 1000 },
  website_chat: { max: 12, windowMs: 15 * 60 * 1000 },
  register: { max: 5, windowMs: 60 * 60 * 1000 },
};
