import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Admin authentication.
 *
 * - The password comes only from the ADMIN_PASSWORD environment variable.
 *   Nothing is hard-coded; if it is unset the admin is switched off.
 * - A successful login sets an httpOnly, SameSite=Strict cookie holding an
 *   expiry time signed with HMAC-SHA256 using ADMIN_SESSION_SECRET.
 * - Every admin page and every server action calls requireAdmin() itself.
 */
const COOKIE = 'hhcd_admin';
const SESSION_HOURS = 8;

export interface AdminConfig {
  password: string;
  secret: string;
}

export function adminConfig(): AdminConfig | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret || secret.length < 32) return null;
  return { password, secret };
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // Compare against a same-length buffer so timing doesn't reveal length.
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function checkPassword(attempt: string, config: AdminConfig): boolean {
  // Hash both sides so the comparison is constant-time regardless of length.
  const h = (s: string) => createHmac('sha256', config.secret).update(s).digest('base64url');
  return safeEqual(h(attempt), h(config.password));
}

export function createSessionToken(config: AdminConfig, now = Date.now()): string {
  const expires = String(now + SESSION_HOURS * 3600_000);
  return `${expires}.${sign(expires, config.secret)}`;
}

export function verifySessionToken(token: string | undefined, config: AdminConfig, now = Date.now()): boolean {
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires, config.secret))) return false;
  return Number(expires) > now;
}

export async function startSession(config: AdminConfig) {
  const store = await cookies();
  store.set(COOKIE, createSessionToken(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete({ name: COOKIE, path: '/admin' });
}

export async function isAdmin(): Promise<boolean> {
  const config = adminConfig();
  if (!config) return false;
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE)?.value, config);
}

/** Throw unless the request carries a valid admin session. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('Not signed in to the admin.');
}
