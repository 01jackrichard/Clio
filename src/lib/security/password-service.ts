/**
 * Clio Security Service: Private Document & Collection Password Protection
 * 
 * Provides:
 *  - High-entropy cryptographic salted password hashing (PBKDF2-SHA512 with 100,000 iterations)
 *  - Constant-time verification preventing timing side-channel attacks
 *  - Signed unlock tokens (HMAC-SHA256) for secure temporary access grants
 *  - In-memory rate limiting against brute-force attacks
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64; // 512 bits
const DIGEST = 'sha512';
const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback HMAC signing secret (derived from app secret or generated)
function getSigningSecret(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'clio_fallback_signing_secret_academic_archive_2026'
  );
}

/**
 * Generates a salted PBKDF2 password hash.
 * Output format: pbkdf2$100000$<salt_hex>$<hash_hex>
 */
export function hashAccessPassword(password: string): string {
  if (!password || password.length < 6) {
    throw new Error('Access password must be at least 6 characters long.');
  }

  const salt = crypto.randomBytes(32).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );

  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Constant-time verification of a password against a stored PBKDF2 hash.
 */
export function verifyAccessPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash) return false;

  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalKeyHex = parts[3];

  if (!iterations || !salt || !originalKeyHex) {
    return false;
  }

  try {
    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      originalKeyHex.length / 2,
      DIGEST
    );

    const originalBuffer = Buffer.from(originalKeyHex, 'hex');
    if (originalBuffer.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(originalBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generates a signed, tamper-proof unlock grant token for a resource (document or collection).
 * Format: <resourceId>.<expiresAt>.<hmacSignature>
 */
export function generateUnlockToken(resourceId: string): string {
  const expiresAt = Date.now() + TOKEN_VALIDITY_MS;
  const payload = `${resourceId}.${expiresAt}`;
  const hmac = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');

  return `${payload}.${hmac}`;
}

/**
 * Verifies that an unlock token is valid, matches the target resourceId, and is not expired.
 */
export function verifyUnlockToken(token: string | null | undefined, resourceId: string): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [tokenResourceId, expiresAtStr, signature] = parts;

  if (tokenResourceId !== resourceId) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const payload = `${tokenResourceId}.${expiresAtStr}`;
  const expectedHmac = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedHmac);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

// =========================================================================
// Brute-force rate limiter for password unlock attempts
// =========================================================================
interface AttemptRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkUnlockRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 0,
      resetAt: now + WINDOW_MS,
    });
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      resetInSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  const resetInSeconds = Math.max(0, Math.ceil((record.resetAt - now) / 1000));

  if (record.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetInSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - record.count,
    resetInSeconds,
  };
}

export function recordFailedUnlockAttempt(identifier: string) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

export function resetUnlockAttempts(identifier: string) {
  rateLimitMap.delete(identifier);
}
