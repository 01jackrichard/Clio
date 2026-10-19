import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeShareInvitation } from '@/lib/services/sharing-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to revoke share invitations.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { invitationId } = body as { invitationId?: string };

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Bad Request. Valid invitationId is required.' },
        { status: 400 }
      );
    }

    const result = await revokeShareInvitation(invitationId, user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to revoke share invitation';
    const status = msg.startsWith('FORBIDDEN') ? 403 : msg.startsWith('INVITATION_NOT_FOUND') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
