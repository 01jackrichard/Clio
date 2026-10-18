/**
 * Clio Google Drive URL Parsing and Validation Utilities
 *
 * Provides safe, strict parsing of Google Drive URLs and file IDs.
 * Ensures only canonical, validated Google Drive file IDs can construct iframe URLs,
 * preventing arbitrary URL injection or external domain iframe embedding.
 */

// Canonical Google Drive file ID regex: 25 to 55 alphanumeric chars, dashes, underscores
const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{25,55}$/;

// Allowed Google Drive domains for link parsing
const ALLOWED_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
]);

export interface DriveValidationResult {
  isValid: boolean;
  fileId?: string;
  embedUrl?: string;
  viewUrl?: string;
  error?: string;
}

/**
 * Validates whether a string matches the canonical Google Drive file ID format.
 */
export function isValidDriveFileId(fileId: string): boolean {
  if (!fileId || typeof fileId !== 'string') return false;
  return DRIVE_ID_REGEX.test(fileId.trim());
}

/**
 * Extracts and sanitizes the canonical Google Drive file ID from a URL or raw ID string.
 *
 * Supported patterns:
 *  - https://drive.google.com/file/d/{FILE_ID}/view...
 *  - https://drive.google.com/file/d/{FILE_ID}/preview...
 *  - https://drive.google.com/file/d/{FILE_ID}/edit...
 *  - https://drive.google.com/open?id={FILE_ID}
 *  - https://drive.google.com/uc?id={FILE_ID}
 *  - https://docs.google.com/file/d/{FILE_ID}/...
 *  - Raw valid file ID string: {FILE_ID}
 *
 * Rejects:
 *  - Non-Google domains (e.g. evil.com)
 *  - javascript:, data:, vbscript: protocols
 *  - Malformed or truncated IDs
 */
export function extractDriveFileId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // 1. Check if the input is already a direct raw file ID
  if (DRIVE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // 2. Reject hazardous protocols immediately
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  // 3. Parse as a valid URL
  let parsedUrl: URL;
  try {
    // Require standard HTTP/HTTPS schemes
    parsedUrl = new URL(trimmed);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null;
    }
  } catch {
    return null;
  }

  // 4. Verify hostname is an allowed Google Drive host
  const host = parsedUrl.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return null;
  }

  // 5. Pattern A: /file/d/{FILE_ID}/...
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
  const fileDIndex = pathSegments.findIndex((seg, idx) => seg === 'd' && pathSegments[idx - 1] === 'file');
  if (fileDIndex !== -1 && pathSegments[fileDIndex + 1]) {
    const candidate = pathSegments[fileDIndex + 1];
    if (DRIVE_ID_REGEX.test(candidate)) {
      return candidate;
    }
  }

  // Pattern A2: /d/{FILE_ID}/... (shortened)
  if (pathSegments[0] === 'd' && pathSegments[1] && DRIVE_ID_REGEX.test(pathSegments[1])) {
    return pathSegments[1];
  }

  // 6. Pattern B: ?id={FILE_ID} query parameter (e.g. /open?id=... or /uc?id=...)
  const queryId = parsedUrl.searchParams.get('id');
  if (queryId && DRIVE_ID_REGEX.test(queryId.trim())) {
    return queryId.trim();
  }

  return null;
}

/**
 * Builds the canonical embedded preview URL for Google Drive.
 * Strict: constructs the URL strictly from the validated file ID, ensuring no
 * user-supplied hostname or payload enters the iframe src.
 */
export function getDriveEmbedUrl(fileIdOrUrl: string): string | null {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

/**
 * Builds the canonical web view URL for Google Drive.
 */
export function getDriveViewUrl(fileIdOrUrl: string): string | null {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

/**
 * Builds the canonical download URL for Google Drive.
 */
export function getDriveDownloadUrl(fileIdOrUrl: string): string | null {
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

/**
 * Alias for extractDriveFileId for compatibility.
 */
export const extractGoogleDriveFileId = extractDriveFileId;



/**
 * Comprehensive validator returning parsed identifiers and helpful error messages.
 */
export function validateDriveInput(input: string): DriveValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: 'Please provide a Google Drive share link or file ID.',
    };
  }

  const fileId = extractDriveFileId(input);
  if (!fileId) {
    return {
      isValid: false,
      error:
        'Invalid Google Drive link. Please provide a standard share link (e.g. https://drive.google.com/file/d/.../view) or a valid 25-50 character file ID.',
    };
  }

  return {
    isValid: true,
    fileId,
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
  };
}
