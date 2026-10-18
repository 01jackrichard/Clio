import { describe, it, expect } from 'vitest';
import { config } from '@/lib/config';

interface UserContext {
  id: string;
  role: 'student' | 'admin';
  status: 'active' | 'suspended';
}

interface DocumentContext {
  id: string;
  uploader_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
}

function canAccessDocument(user: UserContext, doc: DocumentContext): boolean {
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  if (doc.status === 'approved') return true;
  if (doc.uploader_id === user.id) return true;
  return false;
}

function canDeleteDocument(user: UserContext, doc: DocumentContext): boolean {
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  // Students can only delete their own documents if STILL pending
  if (doc.uploader_id === user.id && doc.status === 'pending') return true;
  return false;
}

function isUploadQuotaExceeded(pendingCount: number, recentHourlyUploads: number) {
  if (pendingCount >= config.features.maxPendingSubmissionsPerUser) {
    return { exceeded: true, reason: 'Too many pending submissions' };
  }
  if (recentHourlyUploads >= config.features.maxUploadsPerHour) {
    return { exceeded: true, reason: 'Hourly rate limit exceeded' };
  }
  return { exceeded: false };
}

describe('Role and Permission Authorization Decisions', () => {
  const studentAlice: UserContext = { id: 'user-alice', role: 'student', status: 'active' };
  const studentBob: UserContext = { id: 'user-bob', role: 'student', status: 'active' };
  const adminCharlie: UserContext = { id: 'user-charlie', role: 'admin', status: 'active' };
  const suspendedDave: UserContext = { id: 'user-dave', role: 'student', status: 'suspended' };

  const approvedDoc: DocumentContext = {
    id: 'doc-1',
    uploader_id: 'user-alice',
    status: 'approved',
  };

  const pendingDoc: DocumentContext = {
    id: 'doc-2',
    uploader_id: 'user-alice',
    status: 'pending',
  };

  const rejectedDoc: DocumentContext = {
    id: 'doc-3',
    uploader_id: 'user-alice',
    status: 'rejected',
  };

  it('allows any active student to access approved documents', () => {
    expect(canAccessDocument(studentBob, approvedDoc)).toBe(true);
    expect(canAccessDocument(studentAlice, approvedDoc)).toBe(true);
  });

  it('denies access to pending/rejected documents from other students', () => {
    expect(canAccessDocument(studentBob, pendingDoc)).toBe(false);
    expect(canAccessDocument(studentBob, rejectedDoc)).toBe(false);
  });

  it('allows the uploader to access their own pending or rejected documents', () => {
    expect(canAccessDocument(studentAlice, pendingDoc)).toBe(true);
    expect(canAccessDocument(studentAlice, rejectedDoc)).toBe(true);
  });

  it('allows administrators to access any document in any state', () => {
    expect(canAccessDocument(adminCharlie, approvedDoc)).toBe(true);
    expect(canAccessDocument(adminCharlie, pendingDoc)).toBe(true);
    expect(canAccessDocument(adminCharlie, rejectedDoc)).toBe(true);
  });

  it('denies access to suspended users regardless of role or status', () => {
    expect(canAccessDocument(suspendedDave, approvedDoc)).toBe(false);
  });

  it('allows an uploader to delete only pending documents', () => {
    expect(canDeleteDocument(studentAlice, pendingDoc)).toBe(true);
    expect(canDeleteDocument(studentAlice, approvedDoc)).toBe(false); // cannot delete approved
    expect(canDeleteDocument(studentBob, pendingDoc)).toBe(false); // cannot delete other user's doc
  });

  it('allows admins to delete any document', () => {
    expect(canDeleteDocument(adminCharlie, approvedDoc)).toBe(true);
    expect(canDeleteDocument(adminCharlie, pendingDoc)).toBe(true);
  });
});

describe('Upload Quota and Rate Limit Calculations', () => {
  it('allows upload when within reasonable limits', () => {
    const quota = isUploadQuotaExceeded(2, 5);
    expect(quota.exceeded).toBe(false);
  });

  it('blocks upload when pending submissions reach cap (10)', () => {
    const quota = isUploadQuotaExceeded(10, 2);
    expect(quota.exceeded).toBe(true);
    expect(quota.reason).toContain('pending');
  });

  it('blocks upload when hourly rate limit is exceeded (20 uploads/hr)', () => {
    const quota = isUploadQuotaExceeded(3, 20);
    expect(quota.exceeded).toBe(true);
    expect(quota.reason).toContain('Hourly rate limit');
  });
});
