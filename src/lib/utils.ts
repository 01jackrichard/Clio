import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MATERIAL_TYPES } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number | null, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}


export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getMaterialTypeBadge(typeValue: string) {
  const match = MATERIAL_TYPES.find(m => m.value === typeValue);
  return match || { value: typeValue, label: typeValue, badgeColor: 'slate' };
}

/**
 * Resolves the genuine user display name from authenticated profile records,
 * OAuth metadata (Google, etc.), or email prefixes, while strictly filtering
 * out generic placeholders (e.g. "User", "Student", "Scholar", "Anonymous").
 */
export function resolveDisplayName(
  profileName?: string | null,
  userMetadata?: Record<string, unknown> | null,
  email?: string | null
): string | null {
  const candidates: (string | undefined | null)[] = [
    profileName,
    typeof userMetadata?.display_name === 'string' ? userMetadata.display_name : null,
    typeof userMetadata?.name === 'string' ? userMetadata.name : null,
    typeof userMetadata?.full_name === 'string' ? userMetadata.full_name : null,
    typeof userMetadata?.first_name === 'string' ? userMetadata.first_name : null,
    typeof userMetadata?.given_name === 'string' ? userMetadata.given_name : null,
    typeof userMetadata?.preferred_username === 'string' ? userMetadata.preferred_username : null,
    email ? email.split('@')[0] : null,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    let trimmed = candidate.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    // Exclude generic placeholders
    if (
      lower === 'user' ||
      lower === 'users' ||
      lower === 'student' ||
      lower === 'scholar' ||
      lower === 'anonymous' ||
      lower === 'admin' ||
      lower === 'test' ||
      lower === 'null' ||
      lower === 'undefined'
    ) {
      continue;
    }

    // If candidate came from an email or username with dots/underscores (e.g. "jack.r" or "jack_robinson")
    // and does NOT contain spaces, extract the primary name portion
    if (!trimmed.includes(' ') && (trimmed.includes('.') || trimmed.includes('_'))) {
      const firstPart = trimmed.split(/[._]/)[0];
      if (firstPart && firstPart.length > 1) {
        trimmed = firstPart;
      }
    }

    // Capitalize first letter if all lowercase (e.g. "jack" -> "Jack")
    if (trimmed === trimmed.toLowerCase()) {
      trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    return trimmed;
  }

  return null;
}

/**
 * Formats the minimal editorial welcome greeting.
 * If a valid name is present: "Welcome, {name}."
 * If no name or placeholder: "Welcome."
 */
export function formatWelcomeGreeting(name?: string | null): string {
  const clean = name?.trim();
  if (!clean) return 'Welcome.';

  const lower = clean.toLowerCase();
  if (
    lower === 'user' ||
    lower === 'users' ||
    lower === 'student' ||
    lower === 'scholar' ||
    lower === 'anonymous'
  ) {
    return 'Welcome.';
  }

  const cleanName = clean.replace(/\.+$/, '');
  return `Welcome, ${cleanName}.`;
}

/**
 * Escapes unsafe HTML characters to prevent Reflected and Stored Cross-Site Scripting (XSS).
 */
export function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes redirect destinations to prevent Open Redirect vulnerabilities.
 * Ensures the destination is strictly an internal, relative path starting with '/'
 * and prevents bypasses such as protocol-relative slashes ('//'), backslashes ('/\'),
 * control characters, or embedded scheme payloads.
 */
export function sanitizeRedirectUrl(target?: string | null, fallback = '/dashboard'): string {
  if (!target || typeof target !== 'string') return fallback;

  const trimmed = target.trim();
  if (!trimmed) return fallback;

  // Prevent protocol-relative URLs (e.g. //evil.com), backslash tricks (e.g. /\evil.com, \evil.com),
  // and control characters / newlines / null bytes
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\') ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return fallback;
  }

  // Must begin with a single forward slash
  if (!trimmed.startsWith('/')) {
    return fallback;
  }

  // Check against encoded protocol tricks, e.g. %2f%2fevil.com or javascript:
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith('//') ||
      decoded.startsWith('/\\') ||
      decoded.startsWith('\\') ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded.replace(/^\/+/, '')) ||
      /[\x00-\x1F\x7F]/.test(decoded)
    ) {
      return fallback;
    }
  } catch {
    // Malformed URI encoding
    return fallback;
  }

  return trimmed;
}

/**
 * Sanitizes input terms for PostgREST filter expressions (.or, .ilike).
 * PostgREST uses commas, colons, parentheses, and quotes as query syntax delimiters.
 * Strips these control characters to avoid filter structure manipulation.
 */
export function sanitizePostgrestFilter(term?: string | null): string {
  if (!term || typeof term !== 'string') return '';
  // Strip PostgREST syntax characters: commas, parentheses, colons, quotes, backslashes, percent signs
  return term
    .replace(/[,():"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


