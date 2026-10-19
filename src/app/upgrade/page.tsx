import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Container, PageHeader } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadialGlowButton } from '@/components/ui/radial-glow-button';
import { config } from '@/lib/config';

export const metadata = {
  title: 'Clio Plus — Coming Soon',
  description:
    'Information regarding expanded private storage quotas and forthcoming institutional Clio Plus tiers.',
};

export default function UpgradePage() {
  return (
    <div className="bg-paper min-h-screen py-10 sm:py-16">
      <Container className="max-w-4xl space-y-10">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-xs meta-mono text-ash hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Scholar Profile</span>
          </Link>
        </div>

        {/* Editorial Page Header */}
        <PageHeader
          eyebrow="Academic Entitlements"
          title="Clio Plus — Coming Soon"
          description={`Every enrolled student at ${config.app.collegeName} currently receives 50 GB of private storage. Higher capacity tiers are currently under development.`}
        />

        {/* Comparison Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {/* Active Standard Tier */}
          <Card
            variant="paper"
            className="p-6 sm:p-8 flex flex-col justify-between space-y-6 border-ink/30 relative"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="neutral" size="sm">
                  Current Allocation
                </Badge>
                <span className="meta-mono text-xs text-oxblood font-semibold">
                  ACTIVE PLAN
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl text-ink font-medium">
                  Standard Academic Tier
                </h3>
                <p className="meta-mono text-xs text-ash mt-1">
                  Provided to all enrolled scholars
                </p>
              </div>

              <div className="py-2 border-y border-ink/10">
                <span className="font-display text-3xl sm:text-4xl text-ink font-normal">
                  50 GB
                </span>
                <span className="text-xs meta-mono text-ash ml-2">
                  Private Storage
                </span>
              </div>

              <ul className="space-y-3 pt-2 text-xs sm:text-sm text-ink/85 font-sans">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>50 GB total private-storage quota per account</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>Unlimited public academic catalogue contributions</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>Verified institutional Google Drive preservation</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>In-browser PDF reader, semester & course code discovery</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-ink/10">
              <span className="inline-flex w-full items-center justify-center py-2.5 px-4 bg-bone text-ink text-xs meta-mono border border-ink/20">
                Active on your Scholar Account
              </span>
            </div>
          </Card>

          {/* Forthcoming Clio Plus Tier */}
          <Card
            variant="default"
            className="p-6 sm:p-8 flex flex-col justify-between space-y-6 border-oxblood/40 bg-card shadow-xs relative"
          >
            {/* Ribbon */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="oxblood" size="sm">
                  Coming Soon
                </Badge>
                <span className="meta-mono text-xs text-ash">
                  IN DEVELOPMENT
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl text-ink font-medium flex items-center gap-2">
                  <span>Clio Plus</span>
                  <Sparkles className="w-4 h-4 text-oxblood" />
                </h3>
                <p className="meta-mono text-xs text-ash mt-1">
                  Expanded research & group capacity
                </p>
              </div>

              <div className="py-2 border-y border-ink/10">
                <span className="font-display text-3xl sm:text-4xl text-oxblood font-normal">
                  100 GB+
                </span>
                <span className="text-xs meta-mono text-ash ml-2">
                  Expanded Archive Tiers
                </span>
              </div>

              <ul className="space-y-3 pt-2 text-xs sm:text-sm text-ink/85 font-sans">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>Higher private storage limits (100 GB to 250 GB)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>Institutional research team & departmental group folios</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>Priority fast-track peer moderation for uploaded notes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                  <span>Advanced semester-digest generation & export packs</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-ink/10 space-y-3">
              <div className="flex items-center justify-center">
                <RadialGlowButton
                  className="w-full justify-center text-center cursor-default opacity-90"
                  type="button"
                >
                  Clio Plus Coming Soon ↗
                </RadialGlowButton>
              </div>
              <p className="text-[11px] text-center meta-mono text-ash">
                No credit cards or billing required during current pilot.
              </p>
            </div>
          </Card>
        </div>

        {/* Informational Guidance Notice */}
        <div className="p-6 bg-card border border-ink/15 space-y-3 text-left">
          <div className="flex items-center gap-2.5 text-ink font-semibold text-sm">
            <Lock className="w-4 h-4 text-oxblood" />
            <span>How Private Storage Quotas Function in Clio</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-ash leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-semibold text-ink">Strict 50 GB Quota</h4>
              <p>
                Each student account has a dedicated 50 GB allocation calculated
                from the exact size of stored private documents.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-ink">Public Files Are Free</h4>
              <p>
                Public academic materials contributed to the institutional
                archive do not count toward your personal private quota.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-ink">Storage Reclamation</h4>
              <p>
                Reclassifying private folios to public or deleting unneeded files
                instantly restores your available quota.
              </p>
            </div>
          </div>
        </div>

        {/* Action Link Footer */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-ink/15">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper hover:bg-oxblood text-xs font-medium tracking-tight transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Profile & Storage Meter</span>
          </Link>

          <Link
            href="/documents"
            className="inline-flex items-center gap-2 text-xs meta-mono text-ink hover:text-oxblood transition-colors"
          >
            <span>Browse Public Academic Catalogue</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    </div>
  );
}
