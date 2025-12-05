import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

const DEFAULT_ADMIN_EMAIL = 'jeylabbb@gmail.com';
const DEFAULT_SESSION_SECRET = 'admin-session-secret-key';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(/;\s*/);
  for (const part of parts) {
    const [key, ...rest] = part.split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return null;
}

export function getAdminEmails(): string[] {
  const configured =
    process.env.ADMIN_EMAILS ??
    process.env.ADMIN_EMAIL ??
    DEFAULT_ADMIN_EMAIL;

  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || DEFAULT_SESSION_SECRET;
}

export function getAdminSessionMaxAge() {
  const configured = process.env.ADMIN_SESSION_MAX_AGE_MS;
  const parsed = configured ? Number(configured) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AGE_MS;
}

export function createAdminSessionToken(email: string): string {
  const timestamp = Date.now().toString();
  const secret = getAdminSessionSecret();
  const payload = `${email}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function verifyAdminSessionToken(token?: string | null) {
  if (!token || typeof token !== 'string' || token.length < 10) {
    return { valid: false as const, email: null as string | null };
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, timestamp, signature] = decoded.split(':');

    if (!email || !timestamp || !signature) {
      return { valid: false as const, email: null as string | null };
    }

    const timestampNum = Number(timestamp);
    if (!Number.isFinite(timestampNum)) {
      return { valid: false as const, email: null as string | null };
    }

    const now = Date.now();
    if (now - timestampNum > getAdminSessionMaxAge()) {
      return { valid: false as const, email: null as string | null };
    }

    const expectedSignature = crypto
      .createHmac('sha256', getAdminSessionSecret())
      .update(`${email}:${timestamp}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false as const, email: null as string | null };
    }

    return { valid: true as const, email: email.toLowerCase() };
  } catch (error) {
    console.warn('[ADMIN] Failed to verify session token:', error);
    return { valid: false as const, email: null as string | null };
  }
}

export async function ensureAdminAccess(request?: Request) {
  const adminEmails = getAdminEmails();

  // First try Supabase session
  try {
    const pleiaUser = await getPleiaServerUser();
    const email = pleiaUser?.email?.toLowerCase();
    if (email && adminEmails.includes(email)) {
      return { ok: true as const, email, via: 'supabase' as const };
    }
  } catch (error) {
    console.warn('[ADMIN] Failed to resolve Supabase session for admin guard:', error);
  }

  // Fall back to admin-session cookie
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('admin-session')?.value;

    if (!token && request) {
      const header = request.headers.get('cookie');
      token = getCookieFromHeader(header, 'admin-session');
    }

    const verification = verifyAdminSessionToken(token);
    if (verification.valid && verification.email && adminEmails.includes(verification.email)) {
      return { ok: true as const, email: verification.email, via: 'cookie' as const };
    }
  } catch (error) {
    console.warn('[ADMIN] Failed to resolve admin-session cookie:', error);
  }

  return { ok: false as const, reason: 'unauthorized' as const };
}

