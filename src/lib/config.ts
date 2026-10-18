/**
 * Clio Application Configuration
 * Centralized, validated environment configuration with sensible defaults.
 */

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Clio',
    tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'Knowledge, preserved.',
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      'A shared academic resource library where college students discover, upload, organize, preview, and download notes, previous-year question papers, lab manuals, and other academic PDFs.',
    collegeName: process.env.NEXT_PUBLIC_COLLEGE_NAME || 'Academic Institution',
    collegeShortName: process.env.NEXT_PUBLIC_COLLEGE_SHORT_NAME || 'College',
    collegeDomain: process.env.NEXT_PUBLIC_COLLEGE_DOMAIN || 'yourcollege.edu',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  auth: {
    // Admission policy: 'open' | 'domain_restricted' | 'invite_only'
    registrationMode: (process.env.NEXT_PUBLIC_REGISTRATION_MODE || 'open') as 'open' | 'domain_restricted' | 'invite_only',
    // Comma-separated list of allowed domains, e.g. "yourcollege.edu,student.yourcollege.edu"
    allowedDomains: (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || '')
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean),
  },
  storage: {
    provider: 'google_drive' as const,
    maxFileSizeMb: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50', 10),
    maxFileSizeBytes: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    requiresZeroCostCredentials: true,
  },
  googleDrive: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    enablePublicSharing: process.env.GOOGLE_DRIVE_ENABLE_PUBLIC_SHARING === 'true',
    get isConfigured(): boolean {
      return Boolean(this.clientId && this.clientSecret && this.refreshToken && this.folderId);
    },
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '',
    secretKey:
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '',
    // Backward-compatibility accessors
    get anonKey(): string {
      return this.publishableKey;
    },
    get serviceRoleKey(): string {
      return this.secretKey;
    },
  },
  features: {
    maxPendingSubmissionsPerUser: 10,
    maxUploadsPerHour: 20,
    rateLimitWindowMinutes: 60,
  }
};

/**
 * Check configuration completeness and return diagnostics.
 * Google Drive requires zero cloud billing and zero API credentials.
 */
export function checkConfigStatus() {
  const missingPublic = [];
  const missingServer = [];

  if (!config.supabase.url) missingPublic.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!config.supabase.publishableKey) missingPublic.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (!config.supabase.secretKey) missingServer.push('SUPABASE_SECRET_KEY');

  const isConfigured = missingPublic.length === 0 && missingServer.length === 0;

  return {
    isConfigured,
    missingPublic,
    missingServer,
    supabaseConfigured: Boolean(config.supabase.url && config.supabase.publishableKey),
    storageConfigured: true, // Google Drive zero-cost embedded methodology requires 0 credentials
    r2Configured: true, // Kept for backwards compatibility with any remaining banner props
  };
}

