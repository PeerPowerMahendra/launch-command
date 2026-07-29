import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _limiter: Ratelimit | null = null;

function limiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_limiter) {
    _limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests / minute / identifier
      prefix: "lc:ratelimit",
    });
  }
  return _limiter;
}

/** Returns true if allowed. No-op (allow) when Upstash is not configured. */
export async function checkRateLimit(identifier: string): Promise<boolean> {
  const rl = limiter();
  if (!rl) return true;
  const { success } = await rl.limit(identifier);
  return success;
}
