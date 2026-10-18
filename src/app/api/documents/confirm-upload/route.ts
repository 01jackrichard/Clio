import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Upload confirmation for Cloudflare R2 has been retired. Documents are registered directly through Google Drive sharing links via /api/documents/submit.',
    },
    { status: 410 }
  );
}
