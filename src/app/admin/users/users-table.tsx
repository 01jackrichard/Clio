'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Shield,
  User,
  CheckCircle2,
  Ban,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Profile } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UsersTableProps {
  initialProfiles: Profile[];
  currentAdminId: string;
}

type RoleFilter = 'all' | 'student' | 'admin' | 'suspended';

export function UsersTable({ initialProfiles, currentAdminId }: UsersTableProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Status modal state
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Role modal state
  const [roleTarget, setRoleTarget] = useState<Profile | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Notification toast / banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Keyboard accessibility: dismiss modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingId) {
        if (statusTarget) setStatusTarget(null);
        if (roleTarget) setRoleTarget(null);
      }
    };
    if (statusTarget || roleTarget) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [statusTarget, roleTarget, loadingId]);

  // Counters
  const studentsCount = profiles.filter((p) => p.role === 'student' && p.status !== 'suspended').length;
  const adminsCount = profiles.filter((p) => p.role === 'admin' && p.status !== 'suspended').length;
  const suspendedCount = profiles.filter((p) => p.status === 'suspended').length;

  // Filtered list
  const filtered = profiles.filter((p) => {
    // Role / Status filter
    if (roleFilter === 'student' && (p.role !== 'student' || p.status === 'suspended')) return false;
    if (roleFilter === 'admin' && (p.role !== 'admin' || p.status === 'suspended')) return false;
    if (roleFilter === 'suspended' && p.status !== 'suspended') return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchEmail = p.email?.toLowerCase().includes(q);
      const matchName = p.display_name?.toLowerCase().includes(q);
      const matchDept = p.department?.toLowerCase().includes(q);
      return Boolean(matchEmail || matchName || matchDept);
    }
    return true;
  });

  // Action: Toggle Status (active <-> suspended)
  const confirmToggleStatus = async () => {
    if (!statusTarget) return;

    if (statusTarget.id === currentAdminId) {
      setStatusError('You cannot suspend your own administrator account.');
      return;
    }

    const nextStatus = statusTarget.status === 'active' ? 'suspended' : 'active';
    setLoadingId(statusTarget.id);
    setStatusError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', statusTarget.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === statusTarget.id ? { ...p, status: nextStatus } : p))
      );
      setBanner({
        type: 'success',
        message: `Account status for ${statusTarget.email} updated to ${nextStatus}.`,
      });
      setStatusTarget(null);
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : 'Error updating account status');
    } finally {
      setLoadingId(null);
    }
  };

  // Action: Toggle Role (student <-> admin)
  const confirmToggleRole = async () => {
    if (!roleTarget) return;

    if (roleTarget.id === currentAdminId) {
      setRoleError('You cannot modify your own administrative role.');
      return;
    }

    const nextRole = roleTarget.role === 'admin' ? 'student' : 'admin';
    setLoadingId(roleTarget.id);
    setRoleError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq('id', roleTarget.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === roleTarget.id ? { ...p, role: nextRole } : p))
      );
      setBanner({
        type: 'success',
        message: `Role for ${roleTarget.email} changed to ${nextRole}.`,
      });
      setRoleTarget(null);
    } catch (err: unknown) {
      setRoleError(err instanceof Error ? err.message : 'Error modifying account role');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-md border flex items-start justify-between gap-3 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-body">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-ash hover:text-ink cursor-pointer p-0.5"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ink/10">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'all', label: 'All Accounts', count: profiles.length },
              { key: 'student', label: 'Students', count: studentsCount },
              { key: 'admin', label: 'Administrators', count: adminsCount },
              { key: 'suspended', label: 'Suspended', count: suspendedCount },
            ] as const
          ).map((tab) => {
            const active = roleFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRoleFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer border ${
                  active
                    ? 'bg-ink text-paper border-ink font-semibold'
                    : 'bg-card text-ash border-ink/10 hover:border-ink/30 hover:text-ink'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-xs ${
                    active ? 'bg-paper/20 text-paper' : 'bg-bone text-ash'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or dept..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            className="h-9"
          />
        </div>
      </div>

      {/* Directory Table */}
      <Card className="overflow-hidden bg-card border-ink/10 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body text-ash">
            <thead>
              <tr className="border-b border-ink/10 bg-bone/30 text-ash meta-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Scholar / Name</th>
                <th className="py-3 px-4 font-semibold">Email Address</th>
                <th className="py-3 px-4 font-semibold">Department & Year</th>
                <th className="py-3 px-4 font-semibold">Governance Role</th>
                <th className="py-3 px-4 font-semibold">Standing</th>
                <th className="py-3 px-4 font-semibold">Joined Date</th>
                <th className="py-3 px-4 font-semibold text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.length > 0 ? (
                filtered.map((user) => {
                  const isLoading = loadingId === user.id;
                  const isSelf = user.id === currentAdminId;

                  return (
                    <tr key={user.id} className="hover:bg-bone/20 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-medium text-ink">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-semibold text-ink">
                            {user.display_name || 'Anonymous Scholar'}
                          </span>
                          {isSelf && (
                            <Badge variant="neutral" className="text-[10px] py-0 px-1 font-mono">
                              You
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 meta-mono text-xs text-ink/80">
                        {user.email}
                      </td>

                      {/* Department & Year */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-ink font-body">{user.department || '—'}</div>
                        <div className="meta-mono text-[11px] text-ash">{user.academic_year || '—'}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <Badge variant="oxblood" className="gap-1 font-mono text-[10px] uppercase">
                            <Shield className="w-3 h-3 text-oxblood" />
                            <span>Administrator</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="gap-1 font-mono text-[10px] uppercase">
                            <User className="w-3 h-3" />
                            <span>Student Scholar</span>
                          </Badge>
                        )}
                      </td>

                      {/* Standing */}
                      <td className="py-3.5 px-4">
                        {user.status === 'active' ? (
                          <Badge variant="success" className="gap-1 font-mono text-[10px] uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Active</span>
                          </Badge>
                        ) : (
                          <Badge variant="oxblood" className="gap-1 font-mono text-[10px] uppercase">
                            <Ban className="w-3 h-3 text-rose-700" />
                            <span>Suspended</span>
                          </Badge>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 meta-mono text-xs text-ash">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isSelf ? (
                          <span className="meta-mono text-[11px] text-ash italic">
                            Current Session
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => {
                                setRoleTarget(user);
                                setRoleError(null);
                              }}
                              className="text-xs font-mono uppercase"
                            >
                              {user.role === 'admin' ? 'Demote' : 'Promote'}
                            </Button>

                            <Button
                              variant={user.status === 'active' ? 'outline' : 'secondary'}
                              size="sm"
                              disabled={isLoading}
                              onClick={() => {
                                setStatusTarget(user);
                                setStatusError(null);
                              }}
                              className={`text-xs font-mono uppercase ${
                                user.status === 'active' ? 'text-oxblood hover:border-oxblood/40' : ''
                              }`}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ash space-y-2">
                    <p className="font-display text-base text-ink">No scholars found</p>
                    <p className="meta-mono text-xs text-ash">
                      {search ? `No accounts match "${search}"` : 'No accounts in this category'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CONFIRM STATUS DIALOG */}
      {statusTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-modal-title"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <Card className="max-w-md w-full p-6 sm:p-8 bg-paper border-ink/20 space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="label-eyebrow text-oxblood">Access Control</span>
              <h2 id="status-modal-title" className="font-display text-xl sm:text-2xl text-ink font-medium">
                {statusTarget.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
              </h2>
              <p className="text-xs text-ash font-body">
                {statusTarget.status === 'active'
                  ? 'Suspended scholars are prevented from uploading documents, creating reports, or modifying their account.'
                  : 'Reactivating this scholar will restore full submission and interaction privileges.'}
              </p>
            </div>

            <div className="p-3 bg-bone/40 rounded border border-ink/10 text-xs space-y-1">
              <div className="meta-mono text-[10px] uppercase text-ash">Scholar Account</div>
              <div className="font-display font-medium text-ink">{statusTarget.display_name}</div>
              <div className="meta-mono text-xs text-ash">{statusTarget.email}</div>
            </div>

            {statusError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingId === statusTarget.id}
                onClick={() => setStatusTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={statusTarget.status === 'active' ? 'destructive' : 'primary'}
                size="sm"
                loading={loadingId === statusTarget.id}
                onClick={confirmToggleStatus}
              >
                {statusTarget.status === 'active' ? 'Confirm Suspension' : 'Confirm Activation'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRM ROLE DIALOG */}
      {roleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <Card className="max-w-md w-full p-6 sm:p-8 bg-paper border-ink/20 space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="label-eyebrow text-oxblood">Privilege Delegation</span>
              <h2 id="role-modal-title" className="font-display text-xl sm:text-2xl text-ink font-medium">
                {roleTarget.role === 'admin' ? 'Demote to Student' : 'Promote to Administrator'}
              </h2>
              <p className="text-xs text-ash font-body">
                {roleTarget.role === 'admin'
                  ? 'Demoting this administrator will revoke their moderation and governance console access immediately.'
                  : 'Administrators have complete authority to approve, reject, take down documents, and review abuse reports.'}
              </p>
            </div>

            <div className="p-3 bg-bone/40 rounded border border-ink/10 text-xs space-y-1">
              <div className="meta-mono text-[10px] uppercase text-ash">Target Scholar</div>
              <div className="font-display font-medium text-ink">{roleTarget.display_name}</div>
              <div className="meta-mono text-xs text-ash">{roleTarget.email}</div>
            </div>

            {roleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{roleError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingId === roleTarget.id}
                onClick={() => setRoleTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={roleTarget.role === 'admin' ? 'secondary' : 'primary'}
                size="sm"
                loading={loadingId === roleTarget.id}
                onClick={confirmToggleRole}
              >
                {roleTarget.role === 'admin' ? 'Confirm Demotion' : 'Confirm Promotion'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
