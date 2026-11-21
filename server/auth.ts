import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { readAdminCredential, saveAdminCredential } from './store.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const revokedTokenIds = new Set<string>();
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

export interface AuthTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  adminUsername?: string;
  tokenId?: string;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

function signPayload(encodedPayload: string): string {
  return base64UrlEncode(
    crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest()
  );
}

export function issueAdminToken(username: string): { token: string; expiresAt: string } {
  const now = Date.now();
  const payload: AuthTokenPayload = {
    sub: username,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encoded);
  return {
    token: `${encoded}.${signature}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function verifyAdminToken(token: string): AuthTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSig = signPayload(encoded);
  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AuthTokenPayload;
    if (!payload?.sub || !payload?.jti || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;
    if (revokedTokenIds.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function revokeAdminToken(jti: string): void {
  if (jti) {
    revokedTokenIds.add(jti);
  }
}

function readConfiguredEnvSecret(raw: string | undefined): string {
  const val = raw?.trim() ?? '';
  if (!val || /^MY_/i.test(val)) return '';
  return val;
}

export function getAuthMode(): {
  mode: 'setup' | 'login';
  envConfigured: boolean;
  envUsernameRequired: boolean;
} {
  const envPasscode = readConfiguredEnvSecret(process.env.ADMIN_PASSCODE);
  const envUsername = readConfiguredEnvSecret(
    process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL
  );
  if (envPasscode) {
    return {
      mode: 'login',
      envConfigured: true,
      envUsernameRequired: Boolean(envUsername),
    };
  }
  const stored = readAdminCredential();
  if (stored?.passwordHash && stored?.salt && stored?.username) {
    return { mode: 'login', envConfigured: false, envUsernameRequired: true };
  }
  return { mode: 'setup', envConfigured: false, envUsernameRequired: false };
}

function hashPasswordScrypt(password: string, salt: string): Buffer {
  return crypto.scryptSync(password, salt, 64);
}

function safeEqualStrings(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a).digest();
  const bHash = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

export function isRateLimited(ipKey: string): boolean {
  const record = failedAttempts.get(ipKey);
  if (!record) return false;
  if (Date.now() > record.resetAt) {
    failedAttempts.delete(ipKey);
    return false;
  }
  return record.count >= 15;
}

export function recordFailedAttempt(ipKey: string): void {
  const now = Date.now();
  const existing = failedAttempts.get(ipKey);
  if (!existing || now > existing.resetAt) {
    failedAttempts.set(ipKey, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return;
  }
  existing.count += 1;
}

export function clearFailedAttempts(ipKey: string): void {
  failedAttempts.delete(ipKey);
}

export function setupInitialAdmin(username: string, password: string): { username: string } {
  const { mode } = getAuthMode();
  if (mode !== 'setup') {
    throw new Error('Admin account is already configured.');
  }
  const normalizedUsername = username.trim().toLowerCase();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPasswordScrypt(password, salt).toString('hex');

  saveAdminCredential({
    username: normalizedUsername,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  });

  return { username: normalizedUsername };
}

export function verifyAdminLogin(
  username: string,
  password: string
): { username: string } | null {
  const normalizedUsername = username.trim().toLowerCase();
  const envPasscode = readConfiguredEnvSecret(process.env.ADMIN_PASSCODE);
  const envUsername = readConfiguredEnvSecret(
    process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL
  ).toLowerCase();

  if (envPasscode) {
    if (envUsername && !safeEqualStrings(normalizedUsername, envUsername)) {
      return null;
    }
    if (!safeEqualStrings(password, envPasscode)) {
      return null;
    }
    return { username: username.trim() };
  }

  const stored = readAdminCredential();
  if (!stored) return null;

  if (!safeEqualStrings(normalizedUsername, stored.username.toLowerCase())) {
    return null;
  }

  const derived = hashPasswordScrypt(password, stored.salt);
  const expected = Buffer.from(stored.passwordHash, 'hex');
  if (derived.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(derived, expected)) return null;

  return { username: stored.username };
}

export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.adminUsername = payload.sub;
  req.tokenId = payload.jti;
  next();
}
