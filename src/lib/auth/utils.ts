
import { jwtVerify, SignJWT } from 'jose';
import { createHash, randomBytes } from 'crypto';

function getJwtSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('CRON_SECRET must be set in production');
  }

  return new TextEncoder().encode(secret || 'dev-secret-key');
}

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, getJwtSecret());
    return verified.payload;
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  // TEMP: allow personal email for local Resend testing. Remove before deploy.
  if (email === 'rasanugasanmitha6010@gmail.com') {
    return true;
  }

  return /^[^\s@]+@(connect\.)?ust\.hk$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateAnonymousId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
