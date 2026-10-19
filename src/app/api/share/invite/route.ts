import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createOrGetShareInvitation,
  SharedResourceType,
} from '@/lib/services/sharing-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create share invitations.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { resourceType, resourceId } = body as {
      resourceType?: SharedResourceType;
      resourceId?: string;
    };

    if (!resourceType || !resourceId || !['document', 'collection'].includes(resourceType)) {
      return NextResponse.json(
        { error: 'Bad Request. Valid resourceType (document | collection) and resourceId are required.' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || undefined;

    const result = await createOrGetShareInvitation(
      user.id,
      resourceType,
      resourceId,
      origin
    );

    return NextResponse.json({
      success: true,
      invitationUrl: result.url,
      token: result.token,
      title: result.title,
      invitationId: result.invitation.id,
      isRevoked: result.invitation.is_revoked,
      createdAt: result.invitation.created_at,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create share invitation';
    const status = msg.startsWith('UNAUTHORIZED_SHARE') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
