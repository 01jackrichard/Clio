'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface PasswordUnlockCardProps {
  resourceId: string;
  resourceTitle: string;
  resourceType?: 'document' | 'collection';
  onUnlocked?: () => void;
}

export function PasswordUnlockCard({
  resourceId,
  resourceTitle,
  resourceType = 'document',
  onUnlocked,
}: PasswordUnlockCardProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint =
        resourceType === 'collection'
          ? `/api/collections/${resourceId}/unlock`
          : `/api/documents/${resourceId}/unlock`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect access password');
      }

      if (onUnlocked) {
        onUnlocked();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unlock resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-ink/20 shadow-none text-center max-w-lg mx-auto">
      <CardContent className="p-8 sm:p-10 space-y-6">
        <div className="w-14 h-14 bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <span className="meta-mono text-oxblood text-xs font-semibold uppercase tracking-wider">
            Protected Academic Record
          </span>
          <h2 className="font-display text-2xl text-ink font-medium tracking-tight">
            Password Protected {resourceType === 'collection' ? 'Course Pack' : 'Folio'}
          </h2>
          <p className="text-xs sm:text-sm text-ash leading-relaxed">
            <strong className="text-ink font-medium">{resourceTitle}</strong> is secured with an access key.
            Enter the password shared by the instructor or study group contributor to inspect the folio.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2.5 text-left leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <Input
            id="resource-unlock-password"
            type="password"
            placeholder="Enter access password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            className="text-center font-mono tracking-widest text-sm"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading || !password.trim()}
            className="w-full gap-2 font-medium"
            rightIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          >
            {loading ? 'Verifying Key...' : 'Unlock & View Document'}
          </Button>
        </form>

        <p className="meta-mono text-[11px] text-ash">
          Rate-limited verification with constant-time cryptographic protection.
        </p>
      </CardContent>
    </Card>
  );
}
