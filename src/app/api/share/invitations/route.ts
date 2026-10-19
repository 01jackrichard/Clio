import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOwnerResourceInvitations,
  SharedResourceType,
  buildShareUrl,
} from '@/lib/services/sharing-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view share invitations.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType') as SharedResourceType | null;
    const resourceId = searchParams.get('resourceId');

    if (!resourceType || !resourceId || !['document', 'collection'].includes(resourceType)) {
      return NextResponse.json(
        { error: 'Bad Request. Valid resourceType and resourceId are required.' },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get('origin') ||
      (request.headers.get('host') ? `http://${request.headers.get('host')}` : undefined);

    const invitations = await getOwnerResourceInvitations(
      user.id,
      resourceType,
      resourceId
    );

    const formatted = invitations.map((inv) => ({
      id: inv.id,
      resourceType: inv.resource_type,
      resourceId: inv.resource_id,
      isRevoked: inv.is_revoked,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
      url: !inv.is_revoked ? buildShareUrl(inv.token_hash.slice(0, 32), origin) : null,
    }));

    return NextResponse.json({
      success: true,
      invitations: formatted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query invitations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
