
import { jwtVerify, SignJWT } from 'jose';

const secret = new TextEncoder().encode(
  process.env.CRON_SECRET || 'dev-secret-key'
);

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload;
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@(connect\.)?ust\.hk$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function generateAnonymousId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
