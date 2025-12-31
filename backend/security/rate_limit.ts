import { APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { maxRequests: 100, windowMs: 60000 },
  auth: { maxRequests: 5, windowMs: 60000 },
  payment: { maxRequests: 10, windowMs: 60000 },
  upload: { maxRequests: 20, windowMs: 60000 },
  api: { maxRequests: 1000, windowMs: 60000 },
};

export async function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS = 'default'
): Promise<void> {
  const config = RATE_LIMITS[limitType];
  const now = Date.now();
  const key = `${limitType}:${identifier}`;

  let record = rateLimitCache.get(key);

  if (!record || now > record.resetAt) {
    record = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitCache.set(key, record);
    return;
  }

  if (record.count >= config.maxRequests) {
    const resetIn = Math.ceil((record.resetAt - now) / 1000);
    throw APIError.resourceExhausted(
      `Rate limit exceeded. Try again in ${resetIn} seconds.`
    );
  }

  record.count++;
}

export function getRateLimitIdentifier(): string {
  const auth = getAuthData();
  return auth ? auth.userID : 'anonymous';
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitCache.entries()) {
    if (now > record.resetAt) {
      rateLimitCache.delete(key);
    }
  }
}, 60000);
