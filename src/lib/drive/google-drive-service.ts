/**
 * Official Google Drive REST API v3 Integration Service
 *
 * Implements direct backend file uploads to the administrator's designated
 * Google Drive account using the narrowest suitable OAuth 2.0 scope:
 *   `https://www.googleapis.com/auth/drive.file`
 *
 * Security Invariants:
 *  - Refresh tokens and client secrets are strictly server-side and never exposed to the client.
 *  - Scope is strictly limited to files created/opened by Clio (cannot access personal files).
 *  - Permissions are applied per-file if explicitly configured; never to the entire Drive.
 */

export const GOOGLE_DRIVE_NARROW_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
  enablePublicSharing: boolean;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
}

// In-memory access token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Reads Google Drive OAuth configuration from environment variables.
 */
export function getGoogleDriveConfig(): GoogleDriveConfig {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    enablePublicSharing: process.env.GOOGLE_DRIVE_ENABLE_PUBLIC_SHARING === 'true',
  };
}

/**
 * Validates whether the required Google Drive credentials are configured.
 */
export function isGoogleDriveConfigured(): boolean {
  const cfg = getGoogleDriveConfig();
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.refreshToken && cfg.folderId);
}

/**
 * Builds the official Google OAuth 2.0 authorization URL for the administrator.
 * Requests offline access (to receive a refresh token) with the narrowest scope.
 */
export function getDriveOAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getGoogleDriveConfig();
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_DRIVE_NARROW_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges a one-time authorization code for an OAuth refresh token.
 */
export async function exchangeAuthCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}> {
  const { clientId, clientSecret } = getGoogleDriveConfig();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.');
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code for tokens');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Obtains a fresh access token using the stored refresh token.
 * Caches valid tokens in memory until near expiry.
 */
export async function getValidAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && tokenExpiresAt > now + 60000) {
    return cachedAccessToken;
  }

  const { clientId, clientSecret, refreshToken } = getGoogleDriveConfig();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google Drive is not fully configured. Please ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are set in .env.local.'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        'Failed to refresh Google Drive access token using stored refresh token.'
    );
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (Number(data.expires_in) || 3600) * 1000;

  return cachedAccessToken!;
}

export const CLIO_LIBRARY_FOLDER_NAME = 'Clio Academic Library';

export interface FolderResult {
  id: string;
  name: string;
  isNew: boolean;
  webViewLink?: string;
}

/**
 * Finds or creates the dedicated 'Clio Academic Library' folder in Google Drive.
 *
 * Security & Scope Contract:
 *  - Uses the narrow `https://www.googleapis.com/auth/drive.file` scope.
 *  - Under `drive.file`, Google automatically restricts search results to files and folders
 *    created or opened by this application.
 *  - Queries for an existing non-trashed folder named 'Clio Academic Library' created by Clio.
 *  - If found, reuses it immediately to prevent duplicate folder creation on repeat authorizations.
 *  - If not found, creates the folder via the Google Drive v3 REST API, ensuring Clio has full
 *    access to upload into it under the `drive.file` scope.
 *  - Never logs or exposes credentials.
 */
export async function getOrCreateClioLibraryFolder(
  explicitAccessToken?: string
): Promise<FolderResult> {
  const accessToken = explicitAccessToken || (await getValidAccessToken());

  // 1. Search for existing folder created by this app under drive.file scope
  const query = `name = '${CLIO_LIBRARY_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,trashed,webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errData = await searchRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message ||
        `Failed to search Google Drive for existing library folder: ${searchRes.statusText}`
    );
  }

  const searchData = await searchRes.json();
  const existingFiles = (searchData.files as Array<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  }>) || [];

  if (existingFiles.length > 0) {
    // Found existing folder created by Clio! Reuse it without creating duplicates.
    const existing = existingFiles[0];
    return {
      id: existing.id,
      name: existing.name,
      isNew: false,
      webViewLink: existing.webViewLink,
    };
  }

  // 2. Folder does not exist yet for this app -> create it via the API
  const createUrl =
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: CLIO_LIBRARY_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Central academic document repository created automatically by Clio.',
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message ||
        `Failed to create '${CLIO_LIBRARY_FOLDER_NAME}' folder in Google Drive: ${createRes.statusText}`
    );
  }

  const createdData = await createRes.json();
  return {
    id: createdData.id,
    name: createdData.name,
    isNew: true,
    webViewLink: createdData.webViewLink,
  };
}

/**
 * Uploads a file directly into the designated Google Drive library folder
 * using official Google Drive v3 multipart upload.
 */
export async function uploadFileToDrive({
  filename,
  mimeType,
  buffer,
  folderId,
}: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
}): Promise<DriveUploadResult> {
  const cfg = getGoogleDriveConfig();
  const accessToken = await getValidAccessToken();

  let targetFolder = folderId || cfg.folderId;
  if (!targetFolder) {
    const autoFolder = await getOrCreateClioLibraryFolder(accessToken);
    targetFolder = autoFolder.id;
  }

  // Construct multipart/related boundary payload
  const boundary = `-------314159265358979323846_${Date.now()}`;
  const metadata = {
    name: filename,
    parents: [targetFolder],
    mimeType,
  };

  const metadataHeader = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaHeader = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;

  const metadataBuffer = Buffer.from(metadataHeader, 'utf-8');
  const mediaHeaderBuffer = Buffer.from(mediaHeader, 'utf-8');
  const footerBuffer = Buffer.from(footer, 'utf-8');

  const multipartBody = Buffer.concat([
    metadataBuffer,
    mediaHeaderBuffer,
    buffer,
    footerBuffer,
  ]);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': multipartBody.length.toString(),
    },
    body: multipartBody,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message ||
        data.error_description ||
        `Google Drive API upload failed with status ${res.status}`
    );
  }

  return {
    fileId: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size ? Number(data.size) : buffer.length,
    webViewLink: data.webViewLink,
  };
}

/**
 * Sets public link-viewer permissions ONLY for a single specific file in Google Drive.
 * (Does not alter folder or root Drive permissions).
 */
export async function setDriveFilePublicReader(fileId: string): Promise<boolean> {
  if (!fileId) return false;

  const accessToken = await getValidAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.warn(
      `[GoogleDriveService] Failed to set public reader permission on file ${fileId}:`,
      errorData
    );
    return false;
  }

  return true;
}

/**
 * Diagnostics helper to verify Google Drive connectivity and access to the target folder.
 */
export async function verifyDriveConnection(): Promise<{
  configured: boolean;
  canRefresh: boolean;
  folderFound: boolean;
  folderName?: string;
  folderId?: string;
  isCreatedByApp?: boolean;
  error?: string;
}> {
  const cfg = getGoogleDriveConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) {
    return {
      configured: false,
      canRefresh: false,
      folderFound: false,
      error: 'Google Drive credentials are not fully set in environment variables.',
    };
  }

  try {
    const accessToken = await getValidAccessToken();

    // 1. If folderId is explicitly configured, check its existence and accessibility
    if (cfg.folderId) {
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(cfg.folderId)}?fields=id,name,mimeType,trashed`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (folderRes.ok) {
        const folderData = await folderRes.json();
        return {
          configured: true,
          canRefresh: true,
          folderFound: true,
          folderName: folderData.name,
          folderId: folderData.id,
        };
      }
    }

    // 2. If folderId is not configured or not accessible, search for existing 'Clio Academic Library' folder created by this app
    const query = `name = '${CLIO_LIBRARY_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,mimeType,trashed)&spaces=drive`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const files = searchData.files || [];
      if (files.length > 0) {
        return {
          configured: Boolean(cfg.folderId),
          canRefresh: true,
          folderFound: true,
          folderName: files[0].name,
          folderId: files[0].id,
          isCreatedByApp: true,
          error: !cfg.folderId
            ? `Found '${CLIO_LIBRARY_FOLDER_NAME}' folder in Google Drive (${files[0].id}), but GOOGLE_DRIVE_FOLDER_ID is not yet saved in .env.local.`
            : undefined,
        };
      }
    }

    return {
      configured: Boolean(cfg.folderId),
      canRefresh: true,
      folderFound: false,
      error: cfg.folderId
        ? `Configured folder ID (${cfg.folderId}) could not be accessed under narrow 'drive.file' scope.`
        : `Dedicated folder '${CLIO_LIBRARY_FOLDER_NAME}' has not been initialized yet. Visit /api/admin/google-drive/auth to initialize.`,
    };
  } catch (err: unknown) {
    return {
      configured: Boolean(cfg.folderId),
      canRefresh: false,
      folderFound: false,
      error: err instanceof Error ? err.message : 'Unknown Google Drive error',
    };
  }
}
