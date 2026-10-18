import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeAuthCodeForTokens,
  getOrCreateClioLibraryFolder,
  FolderResult,
} from '@/lib/drive/google-drive-service';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/auth/login?redirectTo=/admin', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;background:#0E1624;color:#FFF;"><h2>Google Drive Authorization Cancelled</h2><p style="color:#F87171;">${errorParam}</p><p><a href="/admin" style="color:#60A5FA;">Return to Admin Console</a></p></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }

    if (!code) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;background:#0E1624;color:#FFF;"><h2>Missing Authorization Code</h2><p><a href="/admin" style="color:#60A5FA;">Return to Admin Console</a></p></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }

    const redirectUri = `${config.app.url}/api/admin/google-drive/callback`;
    const tokenResult = await exchangeAuthCodeForTokens(code, redirectUri);
    const refreshToken = tokenResult.refreshToken;

    // Safely find or create the dedicated 'Clio Academic Library' folder via the API
    // using the narrow 'drive.file' scope. Repeat authorization reuses existing folder.
    let folderResult: FolderResult | null = null;
    let folderError: string | null = null;

    try {
      folderResult = await getOrCreateClioLibraryFolder(tokenResult.accessToken);
    } catch (fErr: unknown) {
      folderError =
        fErr instanceof Error
          ? fErr.message
          : 'Could not automatically initialize library folder in Google Drive.';
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Clio — Google Drive Setup & Destination Ready</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0E1624; color: #FFFFFF; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
    .card { background: #17243A; border: 1px solid #2A374E; border-radius: 16px; max-width: 680px; width: 100%; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    h1 { font-size: 20px; margin-top: 0; color: #4ADE80; display: flex; align-items: center; gap: 8px; }
    p { font-size: 13px; color: #A2B1CC; line-height: 1.6; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .status-badge.new { background: rgba(74, 222, 128, 0.15); color: #4ADE80; border: 1px solid rgba(74, 222, 128, 0.3); }
    .status-badge.reused { background: rgba(96, 165, 250, 0.15); color: #60A5FA; border: 1px solid rgba(96, 165, 250, 0.3); }
    .status-badge.error { background: rgba(248, 113, 113, 0.15); color: #F87171; border: 1px solid rgba(248, 113, 113, 0.3); }
    .code-block { background: #0A101C; border: 1px solid #2A374E; border-radius: 8px; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.6; color: #FCD34D; user-select: all; margin: 16px 0; overflow-x: auto; }
    .security-notice { background: rgba(30, 41, 59, 0.8); border-left: 3px solid #38BDF8; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #CBD5E1; margin: 16px 0; line-height: 1.5; }
    .btn { display: inline-block; background: #4263EB; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin-top: 16px; }
    .btn:hover { background: #364FC7; }
    code { font-family: monospace; background: #202E47; padding: 2px 6px; border-radius: 4px; color: #D0DCFF; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✓ Google Drive Connection Authorized</h1>
    <p>Narrow Drive permissions (<code>https://www.googleapis.com/auth/drive.file</code>) granted. Clio can only manage files and folders created with this app; your personal Drive files remain inaccessible to Clio.</p>

    <!-- FOLDER STATUS -->
    ${
      folderResult
        ? `<div class="status-badge ${folderResult.isNew ? 'new' : 'reused'}">
             ${
               folderResult.isNew
                 ? `✦ Created Dedicated Folder: ${folderResult.name}`
                 : `✓ Verified Existing Folder: ${folderResult.name} (Reused, No Duplicates)`
             }
           </div>
           <p style="margin-top:0;">
             Because Clio created this dedicated folder through the API under the <code>drive.file</code> scope,
             Clio has full permission to deposit uploaded student documents inside it.
           </p>`
        : `<div class="status-badge error">⚠ Folder initialization error: ${folderError}</div>`
    }

    <!-- CONFIGURATION TO COPY -->
    <p><strong>Action Required:</strong> Copy the following into your local <code>.env.local</code> configuration:</p>

    <div class="code-block"># Google Drive Destination Folder (created via Drive API)
GOOGLE_DRIVE_FOLDER_ID="${folderResult ? folderResult.id : 'your-folder-id'}"
${
  refreshToken
    ? `
# Server-side Offline Refresh Token
GOOGLE_REFRESH_TOKEN="${refreshToken}"`
    : `
# (Keep your existing GOOGLE_REFRESH_TOKEN; Google did not re-issue one because this account was previously authorized)`
}</div>

    <div class="security-notice">
      <strong>Security & Privacy Guarantee:</strong><br />
      Refresh tokens and client secrets are strictly server-side. They are never committed to version control, never logged to terminal or disk files, and never accessible to student users.
    </div>

    <a href="/admin" class="btn">Return to Admin Dashboard →</a>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 200,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown authorization error';
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;background:#0E1624;color:#FFF;"><h2>OAuth Token Exchange Failed</h2><p style="color:#F87171;">${errorMsg}</p><p><a href="/admin" style="color:#60A5FA;">Return to Admin Console</a></p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}
