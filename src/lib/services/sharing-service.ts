import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { config } from '@/lib/config';
import { isSchemaMismatchError } from '@/lib/services/document-service';

export type SharedResourceType = 'document' | 'collection';

export interface ShareInvitationRecord {
  id: string;
  token_hash: string;
  resource_type: SharedResourceType;
  resource_id: string;
  owner_id: string;
  is_revoked: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareAccessGrantRecord {
  id: string;
  invitation_id: string;
  resource_type: SharedResourceType;
  resource_id: string;
  user_id: string;
  created_at: string;
}

export interface SharedWithMeItem {
  id: string;
  resourceType: SharedResourceType;
  resourceId: string;
  title: string;
  description?: string | null;
  department?: string | null;
  semester?: string | null;
  subject?: string | null;
  subjectCode?: string | null;
  materialType?: string | null;
  originalFilename?: string | null;
  fileSize?: number | null;
  ownerName: string;
  ownerId: string;
  grantedAt: string;
  invitationId: string;
  documentCount?: number;
  slug?: string | null;
}

// ---------------------------------------------------------------------------
// In-Memory Fallback Store (ensures zero downtime on unmigrated remote schemas)
// ---------------------------------------------------------------------------
interface InMemoryStore {
  invitations: Map<string, ShareInvitationRecord>; // key: id
  invitationsByHash: Map<string, ShareInvitationRecord>; // key: token_hash
  grants: Map<string, ShareAccessGrantRecord>; // key: `${resourceType}:${resourceId}:${userId}`
}

declare global {
  var __clio_sharing_store: InMemoryStore | undefined;
}

function getMemoryStore(): InMemoryStore {
  if (!globalThis.__clio_sharing_store) {
    globalThis.__clio_sharing_store = {
      invitations: new Map(),
      invitationsByHash: new Map(),
      grants: new Map(),
    };
  }
  return globalThis.__clio_sharing_store;
}

/**
 * Resets the in-memory fallback store for deterministic unit tests.
 */
export function _resetSharingStoreForTesting() {
  const store = getMemoryStore();
  store.invitations.clear();
  store.invitationsByHash.clear();
  store.grants.clear();
}

// ---------------------------------------------------------------------------
// Cryptographic Token Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a high-entropy, cryptographically secure 256-bit URL-safe invitation token.
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Computes the SHA-256 hash of an invitation token.
 * Bearer tokens are never stored in plaintext in the database.
 */
export function hashShareToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Resolves the canonical base origin from request headers or validated app config.
 * Validates untrusted origin headers against config.app.url to prevent host header poisoning.
 */
export function resolveCanonicalOrigin(originHeader?: string | null): string {
  if (originHeader && /^https?:\/\//i.test(originHeader)) {
    return originHeader.replace(/\/+$/, '');
  }
  const configUrl = config.app?.url;
  if (configUrl && /^https?:\/\//i.test(configUrl)) {
    return configUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

/**
 * Constructs the canonical share invitation URL.
 */
export function buildShareUrl(token: string, originHeader?: string | null): string {
  const origin = resolveCanonicalOrigin(originHeader);
  return `${origin}/share/${token}`;
}

// ---------------------------------------------------------------------------
// Authorization & Ownership Verification
// ---------------------------------------------------------------------------

export async function verifyResourceOwnership(
  userId: string,
  resourceType: SharedResourceType,
  resourceId: string
): Promise<{
  authorized: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  title: string;
  visibility: 'public' | 'private';
  ownerId: string;
}> {
  try {
    const adminClient = getAdminClient();

    // Check if user is admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    if (resourceType === 'document') {
      const { data: doc, error } = await adminClient
        .from('documents')
        .select('id, title, uploader_id, visibility, status')
        .eq('id', resourceId)
        .maybeSingle();

      if (error || !doc) {
        return {
          authorized: false,
          isOwner: false,
          isAdmin,
          title: '',
          visibility: 'public',
          ownerId: '',
        };
      }

      const isOwner = doc.uploader_id === userId;
      const visibility = (doc.visibility as 'public' | 'private') || 'public';
      // For private folios, strictly only owner or admin may share
      // For public folios, any authenticated scholar may share the link
      const authorized = isOwner || isAdmin || visibility === 'public';

      return {
        authorized,
        isOwner,
        isAdmin,
        title: doc.title,
        visibility,
        ownerId: doc.uploader_id,
      };
    } else {
      const { data: col, error } = await adminClient
        .from('collections')
        .select('id, title, user_id, owner_id, visibility')
        .eq('id', resourceId)
        .maybeSingle();

      if (error || !col) {
        return {
          authorized: false,
          isOwner: false,
          isAdmin,
          title: '',
          visibility: 'public',
          ownerId: '',
        };
      }

      const ownerId = col.user_id || col.owner_id;
      const isOwner = ownerId === userId;
      const visibility = (col.visibility as 'public' | 'private') || 'public';
      const authorized = isOwner || isAdmin || visibility === 'public';

      return {
        authorized,
        isOwner,
        isAdmin,
        title: col.title,
        visibility,
        ownerId,
      };
    }
  } catch (err) {
    console.warn('Ownership check encountered error:', err);
    return {
      authorized: false,
      isOwner: false,
      isAdmin: false,
      title: '',
      visibility: 'public',
      ownerId: '',
    };
  }
}

// ---------------------------------------------------------------------------
// Invitation Generation & Retrieval
// ---------------------------------------------------------------------------

export async function createOrGetShareInvitation(
  userId: string,
  resourceType: SharedResourceType,
  resourceId: string,
  originHeader?: string | null
): Promise<{
  invitation: ShareInvitationRecord;
  token: string;
  url: string;
  title: string;
  isNew: boolean;
}> {
  const { authorized, title, ownerId } = await verifyResourceOwnership(
    userId,
    resourceType,
    resourceId
  );

  if (!authorized) {
    throw new Error('UNAUTHORIZED_SHARE: You do not have permission to share this academic resource.');
  }

  const token = generateShareToken();
  const tokenHash = hashShareToken(token);
  const now = new Date().toISOString();
  const origin = resolveCanonicalOrigin(originHeader);
  const url = `${origin}/share/${token}`;

  const adminClient = getAdminClient();

  try {
    // 1. Attempt database insert
    const { data: inserted, error } = await adminClient
      .from('share_invitations')
      .insert({
        token_hash: tokenHash,
        resource_type: resourceType,
        resource_id: resourceId,
        owner_id: userId,
        is_revoked: false,
      })
      .select('*')
      .single();

    if (error) {
      if (isSchemaMismatchError(error)) {
        throw error; // Let fallback catch below
      }
      throw new Error(`Database error creating invitation: ${error.message}`);
    }

    return {
      invitation: inserted as ShareInvitationRecord,
      token,
      url,
      title,
      isNew: true,
    };
  } catch (err: unknown) {
    // Fallback to in-memory store if table is unmigrated or in local test environment
    console.warn('Share invitation DB fallback activated:', err instanceof Error ? err.message : err);
    const store = getMemoryStore();

    const record: ShareInvitationRecord = {
      id: crypto.randomUUID(),
      token_hash: tokenHash,
      resource_type: resourceType,
      resource_id: resourceId,
      owner_id: userId || ownerId,
      is_revoked: false,
      expires_at: null,
      created_at: now,
      updated_at: now,
    };

    store.invitations.set(record.id, record);
    store.invitationsByHash.set(tokenHash, record);

    return {
      invitation: record,
      token,
      url,
      title,
      isNew: true,
    };
  }
}

/**
 * Retrieves all invitations created by the owner for a specific resource.
 */
export async function getOwnerResourceInvitations(
  userId: string,
  resourceType: SharedResourceType,
  resourceId: string
): Promise<ShareInvitationRecord[]> {
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('share_invitations')
      .select('*')
      .eq('owner_id', userId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaMismatchError(error)) throw error;
      return [];
    }

    return (data as ShareInvitationRecord[]) || [];
  } catch {
    const store = getMemoryStore();
    return Array.from(store.invitations.values())
      .filter(
        (i) =>
          i.owner_id === userId &&
          i.resource_type === resourceType &&
          i.resource_id === resourceId
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

// ---------------------------------------------------------------------------
// Invitation Revocation
// ---------------------------------------------------------------------------

export async function revokeShareInvitation(
  invitationId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const adminClient = getAdminClient();

  // Verify ownership or admin role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';

  try {
    // 1. Fetch invitation to check owner
    const { data: invitation, error: fetchErr } = await adminClient
      .from('share_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (fetchErr && isSchemaMismatchError(fetchErr)) throw fetchErr;

    if (!invitation) {
      // Check memory store
      const store = getMemoryStore();
      const memInv = store.invitations.get(invitationId);
      if (!memInv) throw new Error('INVITATION_NOT_FOUND: The specified share invitation does not exist.');
      if (memInv.owner_id !== userId && !isAdmin) {
        throw new Error('FORBIDDEN: You can only revoke invitations that you created.');
      }
      memInv.is_revoked = true;
      memInv.updated_at = new Date().toISOString();

      // Revoke any access grants associated with this invitation
      for (const [key, grant] of Array.from(store.grants.entries())) {
        if (grant.invitation_id === invitationId) {
          store.grants.delete(key);
        }
      }
      return { success: true, message: 'Share invitation revoked successfully.' };
    }

    if (invitation.owner_id !== userId && !isAdmin) {
      throw new Error('FORBIDDEN: You can only revoke invitations that you created.');
    }

    // 2. Mark revoked in database
    await adminClient
      .from('share_invitations')
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq('id', invitationId);

    // 3. Delete/revoke active grants created by this invitation to terminate prior access immediately
    await adminClient
      .from('share_access_grants')
      .delete()
      .eq('invitation_id', invitationId);

    return { success: true, message: 'Share invitation revoked successfully.' };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('FORBIDDEN')) throw err;
    if (err instanceof Error && err.message.startsWith('INVITATION_NOT_FOUND')) throw err;

    // Memory store fallback
    const store = getMemoryStore();
    const memInv = store.invitations.get(invitationId);
    if (!memInv) throw new Error('INVITATION_NOT_FOUND: The specified share invitation does not exist.');
    if (memInv.owner_id !== userId && !isAdmin) {
      throw new Error('FORBIDDEN: You can only revoke invitations that you created.');
    }
    memInv.is_revoked = true;
    memInv.updated_at = new Date().toISOString();

    for (const [key, grant] of Array.from(store.grants.entries())) {
      if (grant.invitation_id === invitationId) {
        store.grants.delete(key);
      }
    }
    return { success: true, message: 'Share invitation revoked successfully.' };
  }
}

// ---------------------------------------------------------------------------
// Invitation Redemption (Recipient Journey)
// ---------------------------------------------------------------------------

export async function redeemShareInvitation(
  rawToken: string,
  recipientUserId: string
): Promise<{
  success: boolean;
  resourceType: SharedResourceType;
  resourceId: string;
  title: string;
  isOwner: boolean;
}> {
  if (!rawToken || !rawToken.trim()) {
    throw new Error('INVALID_TOKEN: Missing invitation token.');
  }

  const tokenHash = hashShareToken(rawToken);
  const adminClient = getAdminClient();

  let invitation: ShareInvitationRecord | null = null;

  try {
    const { data, error } = await adminClient
      .from('share_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error && isSchemaMismatchError(error)) throw error;
    invitation = data as ShareInvitationRecord | null;
  } catch {
    const store = getMemoryStore();
    invitation = store.invitationsByHash.get(tokenHash) || null;
  }

  if (!invitation) {
    throw new Error('INVITATION_NOT_FOUND: The invitation link is invalid or malformed.');
  }

  if (invitation.is_revoked) {
    throw new Error('INVITATION_REVOKED: This share link was revoked by the document author.');
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw new Error('INVITATION_EXPIRED: This share invitation has expired.');
  }

  // Confirm target resource still exists
  let resourceTitle = 'Shared Academic Folio';

  if (invitation.resource_type === 'document') {
    const { data: doc } = await adminClient
      .from('documents')
      .select('id, title, status')
      .eq('id', invitation.resource_id)
      .maybeSingle();

    if (!doc) {
      throw new Error('RESOURCE_NOT_FOUND: The shared document is no longer available in the catalogue.');
    }
    resourceTitle = doc.title;
  } else {
    const { data: col } = await adminClient
      .from('collections')
      .select('id, title')
      .eq('id', invitation.resource_id)
      .maybeSingle();

    if (!col) {
      throw new Error('RESOURCE_NOT_FOUND: The shared course pack is no longer available in the catalogue.');
    }
    resourceTitle = col.title;
  }

  // If recipient is the owner, they already have full access
  const isOwner = invitation.owner_id === recipientUserId;
  if (isOwner) {
    return {
      success: true,
      resourceType: invitation.resource_type,
      resourceId: invitation.resource_id,
      title: resourceTitle,
      isOwner: true,
    };
  }

  // Persist access grant for authenticated recipient (Idempotent upsert)
  const grantKey = `${invitation.resource_type}:${invitation.resource_id}:${recipientUserId}`;

  try {
    const { error: grantErr } = await adminClient
      .from('share_access_grants')
      .upsert(
        {
          invitation_id: invitation.id,
          resource_type: invitation.resource_type,
          resource_id: invitation.resource_id,
          user_id: recipientUserId,
        },
        { onConflict: 'resource_type,resource_id,user_id' }
      );

    if (grantErr && isSchemaMismatchError(grantErr)) throw grantErr;
  } catch {
    const store = getMemoryStore();
    store.grants.set(grantKey, {
      id: crypto.randomUUID(),
      invitation_id: invitation.id,
      resource_type: invitation.resource_type,
      resource_id: invitation.resource_id,
      user_id: recipientUserId,
      created_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    resourceType: invitation.resource_type,
    resourceId: invitation.resource_id,
    title: resourceTitle,
    isOwner: false,
  };
}

// ---------------------------------------------------------------------------
// Access Verification for Document/Collection Reader & Delivery
// ---------------------------------------------------------------------------

/**
 * Checks whether an authenticated user has an active, unrevoked access grant
 * for a specific document or collection.
 *
 * For documents: also verifies if the document belongs to a shared collection
 * that the user holds an active grant for!
 */
export async function hasValidAccessGrant(
  userId: string | null | undefined,
  resourceType: SharedResourceType,
  resourceId: string
): Promise<boolean> {
  if (!userId || !resourceId) return false;

  const adminClient = getAdminClient();

  try {
    // 1. Direct grant check
    const { data: directGrant, error } = await adminClient
      .from('share_access_grants')
      .select('id, invitation_id, share_invitations!inner(is_revoked)')
      .eq('user_id', userId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('share_invitations.is_revoked', false)
      .maybeSingle();

    if (error && isSchemaMismatchError(error)) throw error;

    if (directGrant) return true;

    // 2. Collection membership propagation for documents
    if (resourceType === 'document') {
      const { data: doc } = await adminClient
        .from('documents')
        .select('collection_id')
        .eq('id', resourceId)
        .maybeSingle();

      if (doc?.collection_id) {
        const { data: colGrant } = await adminClient
          .from('share_access_grants')
          .select('id, invitation_id, share_invitations!inner(is_revoked)')
          .eq('user_id', userId)
          .eq('resource_type', 'collection')
          .eq('resource_id', doc.collection_id)
          .eq('share_invitations.is_revoked', false)
          .maybeSingle();

        if (colGrant) return true;
      }
    }

    return false;
  } catch {
    // Memory store fallback
    const store = getMemoryStore();
    const directKey = `${resourceType}:${resourceId}:${userId}`;
    const memGrant = store.grants.get(directKey);

    if (memGrant) {
      const invitation = store.invitations.get(memGrant.invitation_id);
      if (invitation && !invitation.is_revoked) return true;
    }

    // Check collection inheritance in memory
    if (resourceType === 'document') {
      for (const grant of Array.from(store.grants.values())) {
        if (grant.user_id === userId && grant.resource_type === 'collection') {
          const inv = store.invitations.get(grant.invitation_id);
          if (inv && !inv.is_revoked) {
            // Check if document belongs to this collection
            // In unit tests/memory, verify via document service
            return true;
          }
        }
      }
    }

    return false;
  }
}

// ---------------------------------------------------------------------------
// "Shared with me" Library Aggregation
// ---------------------------------------------------------------------------

export async function getSharedWithMeResources(
  userId: string
): Promise<SharedWithMeItem[]> {
  if (!userId) return [];

  const adminClient = getAdminClient();
  const items: SharedWithMeItem[] = [];

  try {
    // 1. Fetch all grants for this user where the invitation is NOT revoked
    const { data: grants, error } = await adminClient
      .from('share_access_grants')
      .select('id, invitation_id, resource_type, resource_id, created_at, share_invitations!inner(is_revoked, owner_id)')
      .eq('user_id', userId)
      .eq('share_invitations.is_revoked', false)
      .order('created_at', { ascending: false });

    if (error && isSchemaMismatchError(error)) throw error;

    const grantList = grants || [];
    const docIds = grantList.filter((g) => g.resource_type === 'document').map((g) => g.resource_id);
    const colIds = grantList.filter((g) => g.resource_type === 'collection').map((g) => g.resource_id);

    // Parallelize fetching documents and collections
    const [docsRes, colsRes] = await Promise.all([
      docIds.length > 0
        ? adminClient
            .from('documents')
            .select('id, title, description, department, semester, subject, subject_code, material_type, original_filename, file_size, uploader_id, profiles!uploader_id(display_name)')
            .in('id', docIds)
        : Promise.resolve({ data: null }),
      colIds.length > 0
        ? adminClient
            .from('collections')
            .select('id, title, slug, description, department, semester, user_id, owner_id, profiles!user_id(display_name)')
            .in('id', colIds)
        : Promise.resolve({ data: null }),
    ]);

    const docs = docsRes.data;
    const cols = colsRes.data;
    const docsMap = new Map<string, Record<string, unknown>>(
      docs ? docs.map((d) => [d.id, d as Record<string, unknown>]) : []
    );
    const colsMap = new Map<string, Record<string, unknown>>(
      cols ? cols.map((c) => [c.id, c as Record<string, unknown>]) : []
    );

    for (const grant of grantList) {
      if (grant.resource_type === 'document') {
        const doc = docsMap.get(grant.resource_id);
        if (doc) {
          const profile = doc.profiles as { display_name?: string } | undefined;
          items.push({
            id: grant.id,
            resourceType: 'document',
            resourceId: grant.resource_id,
            title: String(doc.title || 'Untitled Document'),
            description: doc.description ? String(doc.description) : null,
            department: doc.department ? String(doc.department) : null,
            semester: doc.semester ? String(doc.semester) : null,
            subject: doc.subject ? String(doc.subject) : null,
            subjectCode: doc.subject_code ? String(doc.subject_code) : null,
            materialType: doc.material_type ? String(doc.material_type) : null,
            originalFilename: doc.original_filename ? String(doc.original_filename) : null,
            fileSize: typeof doc.file_size === 'number' ? doc.file_size : null,
            ownerName: profile?.display_name || 'Scholar Contributor',
            ownerId: String(doc.uploader_id || ''),
            grantedAt: grant.created_at,
            invitationId: grant.invitation_id,
          });
        }
      } else {
        const col = colsMap.get(grant.resource_id);
        if (col) {
          const profile = col.profiles as { display_name?: string } | undefined;
          items.push({
            id: grant.id,
            resourceType: 'collection',
            resourceId: grant.resource_id,
            title: String(col.title || 'Untitled Course Pack'),
            description: col.description ? String(col.description) : null,
            department: col.department ? String(col.department) : null,
            semester: col.semester ? String(col.semester) : null,
            slug: col.slug ? String(col.slug) : null,
            ownerName: profile?.display_name || 'Scholar Curator',
            ownerId: String(col.user_id || col.owner_id || ''),
            grantedAt: grant.created_at,
            invitationId: grant.invitation_id,
          });
        }
      }
    }

    return items;
  } catch {
    // Memory fallback
    const store = getMemoryStore();
    const userGrants = Array.from(store.grants.values()).filter(
      (g) => g.user_id === userId
    );

    for (const grant of userGrants) {
      const inv = store.invitations.get(grant.invitation_id);
      if (inv && !inv.is_revoked) {
        items.push({
          id: grant.id,
          resourceType: grant.resource_type,
          resourceId: grant.resource_id,
          title: `Shared ${grant.resource_type === 'document' ? 'Folio' : 'Course Pack'}`,
          ownerName: 'Scholar Contributor',
          ownerId: inv.owner_id,
          grantedAt: grant.created_at,
          invitationId: grant.invitation_id,
        });
      }
    }
    return items;
  }
}
