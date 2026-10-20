'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  Globe,
  ArrowRight,
  Search,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PRIVATE_STORAGE_QUOTA_BYTES } from '@/lib/services/storage-quota-service';

export interface ScholarStorageProfile {
  id: string;
  email: string;
  display_name: string;
  department?: string | null;
  role: 'student' | 'admin' | string;
  status: 'active' | 'suspended' | string;
  publicCount: number;
  privateCount: number;
  privateBytes: number;
  created_at: string;
}

interface ScholarsStorageSummaryProps {
  scholars: ScholarStorageProfile[];
}

export function ScholarsStorageSummary({ scholars }: ScholarsStorageSummaryProps) {
  const [search, setSearch] = useState('');

  const filtered = scholars.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Boolean(
      s.display_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
          <input
            type="text"
            placeholder="Search scholars by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-card border border-ink/20 text-xs text-ink placeholder:text-ash/60 focus:outline-none focus:border-ink"
          />
        </div>

        <Link
          href="/admin/users"
          className="meta-mono text-xs font-semibold text-oxblood hover:underline flex items-center gap-1.5 self-end sm:self-auto"
        >
          <span>Open Full User Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="border border-ink/15 overflow-x-auto bg-card">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-ink/15 bg-paper/80 meta-mono text-[10px] text-ash uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Scholar</th>
              <th className="py-3 px-3 font-semibold">Department</th>
              <th className="py-3 px-3 font-semibold">Role & Status</th>
              <th className="py-3 px-3 font-semibold">Public Deposits</th>
              <th className="py-3 px-3 font-semibold">Private Vault Folios</th>
              <th className="py-3 px-4 font-semibold text-right">Private Storage Consumed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filtered.slice(0, 15).map((scholar) => {
              const quotaPercent = Math.min(
                100,
                Math.round((scholar.privateBytes / PRIVATE_STORAGE_QUOTA_BYTES) * 100)
              );

              return (
                <tr key={scholar.id} className="hover:bg-bone/30 transition-colors">
                  {/* Scholar Info */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <div className="font-sans font-medium text-ink text-xs truncate max-w-[180px]">
                        {scholar.display_name}
                      </div>
                      <div className="meta-mono text-[10px] text-ash truncate max-w-[180px]">
                        {scholar.email}
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-3 px-3 meta-mono text-[11px] text-ash truncate max-w-[150px]">
                    {scholar.department || 'General Academic'}
                  </td>

                  {/* Role & Status */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={scholar.role === 'admin' ? 'oxblood' : 'neutral'}
                        size="sm"
                      >
                        {scholar.role === 'admin' ? 'Administrator' : 'Student'}
                      </Badge>
                      {scholar.status === 'suspended' && (
                        <Badge variant="warning" size="sm">
                          Suspended
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Public Count */}
                  <td className="py-3 px-3 meta-mono text-[11px] text-ash">
                    <span className="inline-flex items-center gap-1 text-ink font-medium">
                      <Globe className="w-3 h-3 text-emerald-700" />
                      <span>{scholar.publicCount}</span>
                    </span>
                  </td>

                  {/* Private Count */}
                  <td className="py-3 px-3 meta-mono text-[11px] text-ash">
                    <span className="inline-flex items-center gap-1 text-oxblood font-medium">
                      <Lock className="w-3 h-3 text-oxblood" />
                      <span>{scholar.privateCount}</span>
                    </span>
                  </td>

                  {/* Private Storage Consumed */}
                  <td className="py-3 px-4 text-right">
                    <div className="space-y-1 inline-block text-right">
                      <div className="meta-mono text-[11px] font-medium text-ink">
                        {formatBytes(scholar.privateBytes)} <span className="text-ash/70 font-normal">/ 50 GB</span>
                      </div>
                      <div className="w-28 h-1.5 bg-bone border border-ink/10 overflow-hidden ml-auto">
                        <div
                          className={`h-full ${
                            quotaPercent > 80 ? 'bg-oxblood' : 'bg-ink'
                          }`}
                          style={{ width: `${Math.max(quotaPercent > 0 ? 3 : 0, quotaPercent)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
