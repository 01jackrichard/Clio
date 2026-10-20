'use client';

import React from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  UserPlus,
  Download,
  Flag,
  Trash2,
  Lock,
  Clock,
  Activity,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface ActivityEvent {
  id: string;
  type: 'upload' | 'signup' | 'download' | 'report' | 'delete';
  title: string;
  subtitle?: string;
  meta?: string;
  timestamp: string;
  link?: string;
  visibility?: 'public' | 'private' | string;
  badge?: string;
  badgeVariant?: 'oxblood' | 'success' | 'warning' | 'neutral';
}

interface PlatformActivityFeedProps {
  events: ActivityEvent[];
}

export function PlatformActivityFeed({ events }: PlatformActivityFeedProps) {
  if (events.length === 0) {
    return (
      <Card variant="paper" className="p-8 text-center border-dashed border-ink/20 space-y-2">
        <Activity className="w-6 h-6 text-ash mx-auto" />
        <p className="font-display text-sm font-medium text-ink">No recorded activity yet</p>
        <p className="font-sans text-xs text-ash">
          Platform activities like deposits, downloads, and user registrations will stream here.
        </p>
      </Card>
    );
  }

  const getEventIcon = (type: ActivityEvent['type'], visibility?: string) => {
    switch (type) {
      case 'upload':
        return visibility === 'private' ? (
          <span className="w-7 h-7 rounded-xs bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="w-7 h-7 rounded-xs bg-emerald-950/10 border border-emerald-900/20 text-emerald-800 flex items-center justify-center shrink-0">
            <UploadCloud className="w-3.5 h-3.5" />
          </span>
        );
      case 'signup':
        return (
          <span className="w-7 h-7 rounded-xs bg-bone border border-ink/15 text-ink flex items-center justify-center shrink-0">
            <UserPlus className="w-3.5 h-3.5" />
          </span>
        );
      case 'download':
        return (
          <span className="w-7 h-7 rounded-xs bg-paper border border-ink/15 text-ash flex items-center justify-center shrink-0">
            <Download className="w-3.5 h-3.5" />
          </span>
        );
      case 'report':
        return (
          <span className="w-7 h-7 rounded-xs bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center shrink-0">
            <Flag className="w-3.5 h-3.5" />
          </span>
        );
      case 'delete':
        return (
          <span className="w-7 h-7 rounded-xs bg-rose-950/10 border border-rose-900/20 text-rose-800 flex items-center justify-center shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        );
    }
  };

  return (
    <div className="border border-ink/15 bg-card divide-y divide-ink/10">
      {events.map((event) => {
        return (
          <div
            key={event.id}
            className="p-3.5 sm:p-4 flex items-start gap-3 hover:bg-bone/30 transition-colors"
          >
            {getEventIcon(event.type, event.visibility)}

            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  {event.link ? (
                    <Link
                      href={event.link}
                      className="font-sans font-medium text-xs sm:text-sm text-ink hover:text-oxblood transition-colors truncate"
                    >
                      {event.title}
                    </Link>
                  ) : (
                    <span className="font-sans font-medium text-xs sm:text-sm text-ink truncate">
                      {event.title}
                    </span>
                  )}

                  {event.visibility === 'private' && (
                    <Badge variant="oxblood" size="sm" dot>
                      Private
                    </Badge>
                  )}
                  {event.visibility === 'public' && (
                    <Badge variant="neutral" size="sm">
                      Public
                    </Badge>
                  )}
                </div>

                <span className="meta-mono text-[10px] sm:text-[11px] text-ash shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-ash/70" />
                  <span>{formatDate(event.timestamp)}</span>
                </span>
              </div>

              {event.subtitle && (
                <p className="font-sans text-xs text-ash truncate">
                  {event.subtitle}
                </p>
              )}

              {event.meta && (
                <div className="meta-mono text-[10px] text-ash/80 truncate">
                  {event.meta}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
