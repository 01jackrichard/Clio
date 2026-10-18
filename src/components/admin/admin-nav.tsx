'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Clock,
  Flag,
  Users,
  FilePlus2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminNavProps {
  pendingCount?: number;
  reportsCount?: number;
  className?: string;
}

export function AdminNav({
  pendingCount,
  reportsCount,
  className,
}: AdminNavProps) {
  const pathname = usePathname();

  const links = [
    {
      href: '/admin',
      label: 'Governance Console',
      icon: Shield,
      exact: true,
    },
    {
      href: '/admin/moderation',
      label: 'Moderation Queue',
      icon: Clock,
      badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
    },
    {
      href: '/admin/reports',
      label: 'Abuse Reports',
      icon: Flag,
      badge: reportsCount && reportsCount > 0 ? reportsCount : undefined,
    },
    {
      href: '/admin/users',
      label: 'User Directory',
      icon: Users,
    },
    {
      href: '/admin/register-document',
      label: 'Register Canonical Folio',
      icon: FilePlus2,
    },
  ];

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 sm:gap-2 border-b border-ink/15 pb-3 overflow-x-auto select-none no-scrollbar',
        className
      )}
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all border rounded-sm whitespace-nowrap cursor-pointer',
              active
                ? 'bg-ink text-paper border-ink shadow-xs'
                : 'bg-transparent text-ash border-transparent hover:text-ink hover:bg-bone/40'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{link.label}</span>
            {link.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-xs font-mono font-medium',
                  active ? 'bg-paper/20 text-paper' : 'bg-oxblood/10 text-oxblood'
                )}
              >
                {link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
