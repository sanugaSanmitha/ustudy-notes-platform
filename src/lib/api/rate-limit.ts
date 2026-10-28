import { NextResponse } from 'next/server';
import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type LimitResult = { success: boolean };

const limiterCache = new Map<string, Ratelimit | null>();

function getLimiter(requests: number, window: Duration) {
  const cacheKey = `${requests}:${window}`;
  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey) ?? null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    limiterCache.set(cacheKey, null);
    return null;
  }

  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window),
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Rate-limit a key. If Upstash is not configured or Redis fails, allow the request
 * so auth flows do not 500 in production when Redis env vars are missing.
 */
export async function enforceRateLimit(
  key: string,
  requests: number,
  window: Duration
): Promise<LimitResult> {
  const limiter = getLimiter(requests, window);
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'Rate limit skipped: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.'
      );
    }
    return { success: true };
  }

  try {
    const result = await limiter.limit(key);
    return { success: result.success };
  } catch (error) {
    console.error('Rate limit error (failing open):', error);
    return { success: true };
  }
}

export function rateLimitResponse(message = 'Too many requests. Try again later.') {
  return NextResponse.json(
    { error: { code: 'RATE_LIMIT', message } },
    { status: 429 }
  );
}
