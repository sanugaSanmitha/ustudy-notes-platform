import { NextRequest, NextResponse } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory rate limit for admin mutations (Part 5 §5.4). */
export function checkAdminRateLimit(userId: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }

  if (bucket.count >= limit) {
    return { ok: false as const, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true as const };
}

export function requireAdminCsrf(request: NextRequest) {
  const header = request.headers.get('X-Requested-With');
  if (header !== 'admin-portal') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Missing or invalid request header.' } },
      { status: 403 }
    );
  }
  return null;
}

export function applyRateLimitResponse(userId: string) {
  const result = checkAdminRateLimit(userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' } },
      { status: 429 }
    );
  }
  return null;
}
