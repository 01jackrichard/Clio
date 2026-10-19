'use client';

import React, { useState, useCallback } from 'react';
import { Share2, Loader2, ShieldAlert, Check, AlertCircle } from 'lucide-react';
import { ShareSheet } from '@/components/ui/share-sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SharedResourceType } from '@/lib/services/sharing-service';

export interface ShareResourceButtonProps {
  resourceType: SharedResourceType;
  resourceId: string;
  resourceTitle: string;
  variant?: 'icon' | 'button' | 'compact';
  isOwner?: boolean;
  className?: string;
  label?: string;
}

export function ShareResourceButton({
  resourceType,
  resourceId,
  resourceTitle,
  variant = 'button',
  isOwner = true,
  className,
  label = 'Share',
}: ShareResourceButtonProps) {
  const [invitationUrl, setInvitationUrl] = useState<string>('');
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  // Generates or fetches active invitation link on demand
  const handleRequestUrl = useCallback(async (): Promise<string> => {
    if (invitationUrl && !revoked) {
      return invitationUrl;
    }

    setLoading(true);
    setError(null);
    setRevoked(false);

    try {
      const res = await fetch('/api/share/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType, resourceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate share invitation');
      }

      setInvitationUrl(data.invitationUrl);
      setInvitationId(data.invitationId);
      return data.invitationUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating invitation';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId, invitationUrl, revoked]);

  const handleRevoke = async () => {
    if (!invitationId) return;
    if (
      !confirm(
        'Are you sure you want to revoke this share link? Anyone who previously redeemed this link will immediately lose access, and no new recipients will be able to redeem it.'
      )
    ) {
      return;
    }

    setRevoking(true);
    try {
      const res = await fetch('/api/share/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      setRevoked(true);
      setInvitationUrl('');
      setInvitationId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to revoke share link');
    } finally {
      setRevoking(false);
    }
  };

  const triggerContent = (
    <>
      {variant === 'icon' ? (
        <Button
          variant="outline"
          size="icon"
          aria-label={`Share ${resourceTitle}`}
          title={`Share ${resourceTitle}`}
          disabled={loading}
          className={cn('transition-colors hover:text-oxblood hover:border-oxblood/40', className)}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-ash" />
          ) : (
            <Share2 className="w-4 h-4 text-ink" />
          )}
        </Button>
      ) : variant === 'compact' ? (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs meta-mono font-medium border border-ink/20 bg-card hover:bg-bone hover:border-oxblood/40 hover:text-oxblood transition-colors cursor-pointer',
            className
          )}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-ash" />
          ) : (
            <Share2 className="w-3.5 h-3.5 text-oxblood" />
          )}
          <span>{label}</span>
        </span>
      ) : (
        <Button
          variant="secondary"
          size="md"
          disabled={loading}
          leftIcon={
            loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-ash" />
            ) : (
              <Share2 className="w-4 h-4 text-oxblood" />
            )
          }
          className={cn('gap-2 font-medium', className)}
        >
          <span>{label}</span>
        </Button>
      )}
    </>
  );

  return (
    <div className="inline-block">
      <ShareSheet
        title={`Share: ${resourceTitle}`}
        url={invitationUrl || undefined}
        onRequestUrl={handleRequestUrl}
        trigger={triggerContent}
      >
        {/* Owner Management Controls & Academic Disclosure */}
        <div className="space-y-3 text-left">
          <div className="p-3 bg-bone/40 border border-ink/10 space-y-1.5">
            <div className="flex items-center gap-1.5 meta-mono text-[11px] text-ink font-semibold">
              <Check className="w-3.5 h-3.5 text-oxblood" />
              <span>Link-Accessible Academic Share</span>
            </div>
            <p className="text-[11px] text-ash leading-relaxed font-sans">
              Any verified scholar with this invitation link can sign in to Clio and redeem immediate, persistent access to this {resourceType === 'document' ? 'folio' : 'course pack'}.
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isOwner && invitationId && !revoked && (
            <div className="pt-2 flex items-center justify-between border-t border-ink/10">
              <span className="meta-mono text-[10px] text-ash">
                Owner controls:
              </span>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="inline-flex items-center gap-1.5 text-xs text-oxblood hover:underline cursor-pointer disabled:opacity-50"
              >
                {revoking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span>Revoke Link Access</span>
              </button>
            </div>
          )}

          {revoked && (
            <div className="p-2.5 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs meta-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Share invitation successfully revoked.</span>
            </div>
          )}
        </div>
      </ShareSheet>
    </div>
  );
}
