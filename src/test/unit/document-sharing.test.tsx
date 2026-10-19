import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  generateShareToken,
  hashShareToken,
  resolveCanonicalOrigin,
  buildShareUrl,
  verifyResourceOwnership,
  createOrGetShareInvitation,
  redeemShareInvitation,
  revokeShareInvitation,
  hasValidAccessGrant,
  getSharedWithMeResources,
  _resetSharingStoreForTesting,
  SharedWithMeItem,
} from '@/lib/services/sharing-service';
import { ShareSheet } from '@/components/ui/share-sheet';
import { ShareResourceButton } from '@/components/sharing/share-resource-button';
import { SharedResourcesList } from '@/app/shared-with-me/shared-resources-list';
import { Navbar } from '@/components/navbar';

// Mock next/navigation
let currentPathname = '/shared-with-me';
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock config with valid non-placeholder url and secretKey
vi.mock('@/lib/config', () => ({
  config: {
    app: {
      name: 'Clio',
      tagline: 'Knowledge, preserved.',
      description: 'Academic library',
      url: 'https://clio-archive.edu',
    },
    supabase: {
      url: 'https://clio-test-vault.supabase.co',
      publishableKey: 'test-publishable-key',
      secretKey: 'test-secret-key',
    },
  },
}));

// Mock Supabase admin & client
const mockAdminFrom = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}));

const mockClientUser = {
  id: 'scholar-001',
  email: 'scholar@oxford.edu',
  user_metadata: { full_name: 'Arthur Pendelton' },
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockClientUser },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'scholar-001',
              email: 'scholar@oxford.edu',
              display_name: 'Arthur Pendelton',
              role: 'student',
              department: 'Mechanical Engineering',
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe('CLIO — Document Sharing & "Shared with me" Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSharingStoreForTesting();
    currentPathname = '/shared-with-me';
  });

  describe('1. Cryptographic Token Integrity & Hashing', () => {
    it('generates high-entropy, URL-safe 256-bit base64url tokens', () => {
      const token1 = generateShareToken();
      const token2 = generateShareToken();

      expect(token1).toBeDefined();
      expect(typeof token1).toBe('string');
      // 32 bytes base64url produces 43 characters without padding
      expect(token1.length).toBeGreaterThanOrEqual(42);
      expect(/^[A-Za-z0-9_-]+$/.test(token1)).toBe(true);
      expect(token1).not.toBe(token2);
    });

    it('computes deterministic SHA-256 hashes and never matches plaintext', () => {
      const token = 'sample-clio-secure-token-12345';
      const hash1 = hashShareToken(token);
      const hash2 = hashShareToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex digest
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
      expect(hash1).not.toBe(token);
    });

    it('resolves canonical base origin correctly from header or config fallback', () => {
      expect(resolveCanonicalOrigin('https://custom-clio.org/')).toBe('https://custom-clio.org');
      expect(resolveCanonicalOrigin('http://localhost:3000')).toBe('http://localhost:3000');
      expect(resolveCanonicalOrigin(null)).toBe('https://clio-archive.edu');
    });

    it('builds canonical share URLs with origin and token', () => {
      const token = 'token-xyz-123';
      const url = buildShareUrl(token, 'https://archive.clio.edu');
      expect(url).toBe('https://archive.clio.edu/share/token-xyz-123');
    });
  });

  describe('2. Resource Ownership & Authorization Verification', () => {
    it('authorizes the owner to share a private document', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-private-1',
                    title: 'Private Thermodynamics Notes',
                    uploader_id: 'user-author',
                    visibility: 'private',
                    status: 'approved',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      });

      const res = await verifyResourceOwnership('user-author', 'document', 'doc-private-1');
      expect(res.authorized).toBe(true);
      expect(res.isOwner).toBe(true);
      expect(res.title).toBe('Private Thermodynamics Notes');
      expect(res.visibility).toBe('private');
    });

    it('authorizes an administrator to share any private document', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-private-1',
                    title: 'Private Thermodynamics Notes',
                    uploader_id: 'other-user',
                    visibility: 'private',
                    status: 'approved',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      });

      const res = await verifyResourceOwnership('admin-user', 'document', 'doc-private-1');
      expect(res.authorized).toBe(true);
      expect(res.isAdmin).toBe(true);
      expect(res.isOwner).toBe(false);
    });

    it('denies a non-owner scholar from sharing a private document', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-private-1',
                    title: 'Private Thermodynamics Notes',
                    uploader_id: 'original-author',
                    visibility: 'private',
                    status: 'approved',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      });

      const res = await verifyResourceOwnership('stranger-user', 'document', 'doc-private-1');
      expect(res.authorized).toBe(false);
      expect(res.isOwner).toBe(false);
    });

    it('allows any authenticated scholar to share a public folio', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-pub-1',
                    title: 'Public Quantum Chemistry',
                    uploader_id: 'original-author',
                    visibility: 'public',
                    status: 'approved',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      });

      const res = await verifyResourceOwnership('any-student', 'document', 'doc-pub-1');
      expect(res.authorized).toBe(true);
      expect(res.visibility).toBe('public');
    });

    it('authorizes collection owner and denies non-owner for private collections', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'collections') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'col-private-1',
                    title: 'Curated Electromagnetism Compendium',
                    user_id: 'curator-user',
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      });

      const ownerRes = await verifyResourceOwnership('curator-user', 'collection', 'col-private-1');
      expect(ownerRes.authorized).toBe(true);
      expect(ownerRes.isOwner).toBe(true);

      const nonOwnerRes = await verifyResourceOwnership('random-user', 'collection', 'col-private-1');
      expect(nonOwnerRes.authorized).toBe(false);
    });
  });

  describe('3. Share Invitation Generation & Storage Security', () => {
    it('creates invitation and records SHA-256 hash, returning raw token in URL', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-123',
                    title: 'Fluid Dynamics Unit 1',
                    uploader_id: 'author-123',
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        // Force fallback to memory store for share_invitations
        if (table === 'share_invitations') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => {
                  throw new Error('relation "share_invitations" does not exist');
                },
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      });

      const result = await createOrGetShareInvitation(
        'author-123',
        'document',
        'doc-123',
        'https://clio-archive.edu'
      );

      expect(result.token).toBeDefined();
      expect(result.url).toBe(`https://clio-archive.edu/share/${result.token}`);
      expect(result.invitation.token_hash).toBe(hashShareToken(result.token));
      expect(result.invitation.token_hash).not.toBe(result.token);
      expect(result.invitation.is_revoked).toBe(false);
    });

    it('rejects unauthorized users from generating share invitations', async () => {
      mockAdminFrom.mockImplementation(() => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }));

      await expect(
        createOrGetShareInvitation('stranger', 'document', 'doc-secret')
      ).rejects.toThrow(/UNAUTHORIZED_SHARE/);
    });
  });

  describe('4. Recipient Journey: Validation, Idempotent Redemption, & Revocation', () => {
    const authorId = 'author-456';
    const recipientId = 'recipient-789';

    it('redeems invitation and creates persistent grant for recipient', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-456',
                    title: 'Classical Mechanics',
                    uploader_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      const { token } = await createOrGetShareInvitation(authorId, 'document', 'doc-456');

      const redemption = await redeemShareInvitation(token, recipientId);
      expect(redemption.success).toBe(true);
      expect(redemption.resourceId).toBe('doc-456');
      expect(redemption.resourceType).toBe('document');
      expect(redemption.isOwner).toBe(false);

      // Verify access grant is now active
      const hasAccess = await hasValidAccessGrant(recipientId, 'document', 'doc-456');
      expect(hasAccess).toBe(true);
    });

    it('redeems idempotently without error on repeat visits', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-idem',
                    title: 'Idempotent Folio',
                    uploader_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      const { token } = await createOrGetShareInvitation(authorId, 'document', 'doc-idem');

      const res1 = await redeemShareInvitation(token, recipientId);
      const res2 = await redeemShareInvitation(token, recipientId);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(await hasValidAccessGrant(recipientId, 'document', 'doc-idem')).toBe(true);
    });

    it('allows author to redeem their own share link without error', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-self',
                    title: 'Self-Authored Folio',
                    uploader_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      const { token } = await createOrGetShareInvitation(authorId, 'document', 'doc-self');
      const redemption = await redeemShareInvitation(token, authorId);

      expect(redemption.success).toBe(true);
      expect(redemption.isOwner).toBe(true);
    });

    it('rejects invalid or non-existent token', async () => {
      await expect(redeemShareInvitation('bogus-token-xyz', recipientId)).rejects.toThrow(
        /INVITATION_NOT_FOUND/
      );
    });

    it('rejects redemption of a revoked invitation', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-rev',
                    title: 'Revoked Folio',
                    uploader_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      const { invitation, token } = await createOrGetShareInvitation(authorId, 'document', 'doc-rev');

      // Revoke as author
      const revokeRes = await revokeShareInvitation(invitation.id, authorId);
      expect(revokeRes.success).toBe(true);

      // Attempt redemption after revocation
      await expect(redeemShareInvitation(token, recipientId)).rejects.toThrow(
        /INVITATION_REVOKED/
      );
    });
  });

  describe('5. Access Verification & Collection Membership Inheritance', () => {
    const authorId = 'curator-abc';
    const recipientId = 'student-xyz';

    it('returns false for users without a grant', async () => {
      const hasAccess = await hasValidAccessGrant('stranger-user', 'document', 'doc-unshared');
      expect(hasAccess).toBe(false);
    });

    it('inherits document access when a recipient holds a grant to the parent collection', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'collections') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'col-pack-101',
                    title: 'Aerodynamics Course Pack',
                    user_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      // 1. Create collection share invitation
      const { token } = await createOrGetShareInvitation(authorId, 'collection', 'col-pack-101');

      // 2. Recipient redeems collection
      await redeemShareInvitation(token, recipientId);

      // Recipient now has access to the collection
      expect(await hasValidAccessGrant(recipientId, 'collection', 'col-pack-101')).toBe(true);

      // Recipient also inherits access to member documents
      expect(await hasValidAccessGrant(recipientId, 'document', 'doc-nested-in-col')).toBe(true);
    });

    it('terminates prior access immediately when invitation is revoked', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-term',
                    title: 'Terminated Folio',
                    uploader_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      const { invitation, token } = await createOrGetShareInvitation(authorId, 'document', 'doc-term');
      await redeemShareInvitation(token, recipientId);

      // Prior to revocation: access is true
      expect(await hasValidAccessGrant(recipientId, 'document', 'doc-term')).toBe(true);

      // Owner revokes invitation
      await revokeShareInvitation(invitation.id, authorId);

      // Immediately after revocation: access is false
      expect(await hasValidAccessGrant(recipientId, 'document', 'doc-term')).toBe(false);
    });

    it('prohibits non-owners from revoking invitations', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-rev-perm',
                    title: 'Permission Folio',
                    uploader_id: authorId,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      const { invitation } = await createOrGetShareInvitation(authorId, 'document', 'doc-rev-perm');

      await expect(
        revokeShareInvitation(invitation.id, 'unauthorized-intruder')
      ).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe('6. Shared with Me Library Aggregation', () => {
    it('returns empty array when user has no redeemed items', async () => {
      const items = await getSharedWithMeResources('user-no-shares');
      expect(items).toEqual([]);
    });

    it('lists redeemed documents and collections with metadata, excluding revoked items', async () => {
      const author = 'author-lib';
      const student = 'student-lib';

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'student' }, error: null }) }) }),
          };
        }
        if (table === 'documents') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'doc-lib-1',
                    title: 'Shared Mechanics Folio',
                    uploader_id: author,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'collections') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'col-lib-1',
                    title: 'Shared Physics Pack',
                    user_id: author,
                    visibility: 'private',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error('Relation not found');
      });

      // 1. Redeem doc
      const docShare = await createOrGetShareInvitation(author, 'document', 'doc-lib-1');
      await redeemShareInvitation(docShare.token, student);

      // 2. Redeem collection
      const colShare = await createOrGetShareInvitation(author, 'collection', 'col-lib-1');
      await redeemShareInvitation(colShare.token, student);

      const items = await getSharedWithMeResources(student);
      expect(items.length).toBe(2);
      expect(items.some((i) => i.resourceType === 'document')).toBe(true);
      expect(items.some((i) => i.resourceType === 'collection')).toBe(true);

      // Now revoke the collection share
      await revokeShareInvitation(colShare.invitation.id, author);

      const updatedItems = await getSharedWithMeResources(student);
      expect(updatedItems.length).toBe(1);
      expect(updatedItems[0].resourceType).toBe('document');
    });
  });

  describe('7. UI Components: Vengeance UI ShareSheet & Shared Resources List', () => {
    it('renders ShareSheet with trigger and opens modal on click', () => {
      render(
        <ShareSheet
          url="https://clio-archive.edu/share/test-token"
          title="Thermodynamics Folio"
          trigger={<button>Open Share Modal</button>}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /open share modal/i });
      expect(triggerBtn).toBeInTheDocument();

      fireEvent.click(triggerBtn);

      // Modal dialog appears
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^share$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });

    it('renders ShareResourceButton with custom label and variant', () => {
      render(
        <ShareResourceButton
          resourceType="document"
          resourceId="doc-test-btn"
          resourceTitle="Test Folio Title"
          label="Share Folio"
        />
      );

      expect(screen.getByRole('button', { name: /share folio/i })).toBeInTheDocument();
    });

    it('renders SharedResourcesList with filter tabs, search, and empty state', () => {
      const sampleItems: SharedWithMeItem[] = [
        {
          id: 'grant-1',
          resourceType: 'document',
          resourceId: 'doc-001',
          title: 'Advanced Thermodynamics',
          description: 'Entropy and Carnot cycle study notes.',
          department: 'Mechanical Engineering',
          semester: 'Semester 5',
          subject: 'Thermodynamics',
          ownerName: 'Prof. Pendelton',
          ownerId: 'prof-001',
          grantedAt: '2026-10-18T12:00:00Z',
          invitationId: 'inv-1',
        },
        {
          id: 'grant-2',
          resourceType: 'collection',
          resourceId: 'col-002',
          title: 'Signal Processing Course Pack',
          description: 'Compendium of unit labs and folios.',
          department: 'Electrical Engineering',
          semester: 'Semester 6',
          ownerName: 'Dr. Turing',
          ownerId: 'turing-001',
          grantedAt: '2026-10-17T10:00:00Z',
          invitationId: 'inv-2',
        },
      ];

      render(<SharedResourcesList initialItems={sampleItems} />);

      // Verify both items rendered
      expect(screen.getByText('Advanced Thermodynamics')).toBeInTheDocument();
      expect(screen.getByText('Signal Processing Course Pack')).toBeInTheDocument();

      // Test type filter: click "Folios (1)"
      const foliosTab = screen.getByRole('tab', { name: /folios/i });
      fireEvent.click(foliosTab);

      expect(screen.getByText('Advanced Thermodynamics')).toBeInTheDocument();
      expect(screen.queryByText('Signal Processing Course Pack')).not.toBeInTheDocument();

      // Reset to All and test search filter
      const allTab = screen.getByRole('tab', { name: /all resources/i });
      fireEvent.click(allTab);

      const searchInput = screen.getByPlaceholderText(/filter by title, subject, or author/i);
      fireEvent.change(searchInput, { target: { value: 'Quantum' } });

      // Empty state for unmatched search
      expect(screen.getByText('No Matching Shared Folios')).toBeInTheDocument();
      expect(screen.getByText(/no shared resources matched/i)).toBeInTheDocument();
    });

    it('renders empty library state when user has no shared items', () => {
      render(<SharedResourcesList initialItems={[]} />);

      expect(screen.getByText('No Shared Materials Yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /explore public catalogue/i })).toBeInTheDocument();
    });
  });

  describe('8. Navbar Integration: Shared with Me Navigation', () => {
    it('renders "Shared with me" in navigation for authenticated user and highlights active route', async () => {
      currentPathname = '/shared-with-me';
      render(<Navbar />);

      await waitFor(() => {
        const sharedLinks = screen.getAllByRole('link', { name: /shared with me/i });
        expect(sharedLinks.length).toBeGreaterThan(0);

        const desktopShared = sharedLinks.find((el) =>
          el.className.includes('text-[14.5px]')
        );
        expect(desktopShared).toBeDefined();
        expect(desktopShared).toHaveClass('text-ink');
        expect(desktopShared).toHaveClass('font-semibold'); // active on /shared-with-me
      });
    });

    it('includes "Shared with me" in user dropdown menu', async () => {
      currentPathname = '/documents';
      render(<Navbar />);

      await waitFor(() => {
        const userMenuBtn = screen.getByRole('button', { name: /user menu for arthur pendelton/i });
        fireEvent.click(userMenuBtn);

        const sharedDropdownLink = screen.getByRole('link', { name: /shared with me/i });
        expect(sharedDropdownLink).toBeInTheDocument();
        expect(sharedDropdownLink).toHaveAttribute('href', '/shared-with-me');
      });
    });
  });
});
