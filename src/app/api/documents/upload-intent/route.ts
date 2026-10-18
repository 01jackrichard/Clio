import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Binary file upload via R2 has been retired. Clio now uses the Google Drive PDF repository methodology. Please submit academic resources via /api/documents/submit or use the upload page.',
    },
    { status: 410 }
  );
}
