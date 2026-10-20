import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ShieldAlert,
  ArrowLeft,
  FileQuestion,
  Lock,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  hashShareToken,
  redeemShareInvitation,
  ShareInvitationRecord,
} from '@/lib/services/sharing-service';
import { Container, Card, Badge, buttonVariants } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function ShareRedemptionPage({ params }: SharePageProps) {
  const { token } = await params;

  if (!token || !token.trim()) {
    return <InvalidInvitationView reason="Missing invitation token in share link." />;
  }

  const tokenHash = hashShareToken(token);
  const adminClient = getAdminClient();

  // 1. Validate that the invitation exists and is not revoked before prompting login
  let invitation: ShareInvitationRecord | null = null;
  try {
    const { data } = await adminClient
      .from('share_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    invitation = data as ShareInvitationRecord | null;
  } catch {
    // Check in-memory store if DB is unmigrated
    const store = (globalThis as unknown as { __clio_sharing_store?: { invitationsByHash: Map<string, ShareInvitationRecord> } }).__clio_sharing_store;
    invitation = store?.invitationsByHash.get(tokenHash) || null;
  }

  if (!invitation) {
    return (
      <InvalidInvitationView
        reason="This share invitation is invalid, malformed, or has been removed from Clio."
      />
    );
  }

  if (invitation.is_revoked) {
    return (
      <InvalidInvitationView
        reason="This share link was revoked by the document author. Prior access grants originating from this link are no longer active."
        isRevoked
      />
    );
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return (
      <InvalidInvitationView
        reason="This academic share link has expired and can no longer be redeemed."
      />
    );
  }

  // 2. Check recipient authentication
  const user = await getCurrentUser();

  if (!user) {
    // Unauthenticated visitor: redirect to login while safely preserving the invitation return destination
    const returnPath = `/share/${token}`;
    redirect(`/auth/login?redirectTo=${encodeURIComponent(returnPath)}`);
  }

  // 3. Authenticated scholar: redeem the invitation server-side
  try {
    const redemption = await redeemShareInvitation(token, user.id);

    if (redemption.resourceType === 'document') {
      redirect(`/documents/${redemption.resourceId}?shared=true`);
    } else {
      redirect(`/collections/${redemption.resourceId}?shared=true`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to redeem share invitation';
    return <InvalidInvitationView reason={msg} />;
  }
}

function InvalidInvitationView({
  reason,
  isRevoked = false,
}: {
  reason: string;
  isRevoked?: boolean;
}) {
  return (
    <div className="bg-paper min-h-screen py-16 sm:py-24 flex items-center justify-center">
      <Container className="max-w-md">
        <Card className="bg-card border-ink/20 shadow-none text-center p-8 sm:p-10 space-y-6">
          <div className="w-14 h-14 bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center mx-auto">
            {isRevoked ? (
              <ShieldAlert className="w-7 h-7" aria-hidden="true" />
            ) : (
              <FileQuestion className="w-7 h-7" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-2">
            <Badge variant="oxblood" size="sm" dot>
              {isRevoked ? 'Invitation Revoked' : 'Access Unavailable'}
            </Badge>

            <h1 className="font-display text-2xl text-ink font-medium tracking-tight">
              {isRevoked ? 'Share Link Revoked' : 'Invalid Share Invitation'}
            </h1>

            <p className="font-sans text-xs sm:text-sm text-ash leading-relaxed">
              {reason}
            </p>
          </div>

          <div className="p-3.5 bg-paper border border-ink/10 text-left text-xs text-ash space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-ink">
              <Lock className="w-3.5 h-3.5 text-oxblood" />
              <span>Academic Integrity Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Clio share invitations grant scoped access to authorized peers. If you believe you should have access, please contact the author to request a fresh invitation link.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/documents"
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'w-full gap-2',
              })}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Library Catalogue</span>
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}
