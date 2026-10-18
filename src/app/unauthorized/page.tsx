import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, buttonVariants } from '@/components/ui';

export default function UnauthorizedPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24 bg-paper">
      <Card className="w-full max-w-lg bg-card border-ink/15 shadow-none text-center">
        <CardContent className="p-8 sm:p-12 space-y-6">
          {/* Eyebrow & Symbol */}
          <div className="space-y-3">
            <div className="w-12 h-12 bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="meta-mono text-oxblood">Classification 403</span>
              <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
              <span className="meta-mono text-ash">Access Restricted</span>
            </div>
          </div>

          {/* Heading & Notice */}
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl text-ink font-medium tracking-tight">
              Restricted Archive Folio
            </h1>
            <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-md mx-auto">
              You do not possess the required administrative credentials or institutional permissions
              to consult this division of Clio.
            </p>
          </div>

          {/* Academic integrity note */}
          <div className="p-3 bg-paper border border-ink/10 text-left">
            <p className="text-[11px] text-ash font-mono leading-relaxed">
              If your academic role or course department requires access to moderation folios, please
              request access elevation through your faculty department coordinator.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/documents"
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'w-full sm:w-auto gap-2',
              })}
            >
              <span>Explore Library Catalog</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard"
              className={buttonVariants({
                variant: 'outline',
                size: 'md',
                className: 'w-full sm:w-auto gap-2',
              })}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Student Dashboard</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
