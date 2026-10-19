-- Clio Migration: 20261019000003_add_document_sharing.sql
-- Description: Adds secure share invitations and persistent access grants
--              for individual documents and academic collections.
-- Idempotent and safe to run in Supabase SQL Editor.

-- 1. SHARE INVITATIONS TABLE
-- Stores cryptographically hashed random bearer tokens with ownership and revocation state
CREATE TABLE IF NOT EXISTS public.share_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'collection')),
  resource_id UUID NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. SHARE ACCESS GRANTS TABLE
-- Persistent access grants created when an authenticated recipient redeems an invitation
CREATE TABLE IF NOT EXISTS public.share_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.share_invitations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'collection')),
  resource_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_share_access_grant UNIQUE (resource_type, resource_id, user_id)
);

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_share_invitations_token_hash ON public.share_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_share_invitations_owner_res ON public.share_invitations(owner_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_share_access_grants_user_res ON public.share_access_grants(user_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_share_access_grants_invitation ON public.share_access_grants(invitation_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_access_grants ENABLE ROW LEVEL SECURITY;

-- Owners can view and manage their own share invitations
DROP POLICY IF EXISTS "Owners can view their own share invitations" ON public.share_invitations;
CREATE POLICY "Owners can view their own share invitations"
  ON public.share_invitations FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert their own share invitations" ON public.share_invitations;
CREATE POLICY "Owners can insert their own share invitations"
  ON public.share_invitations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their own share invitations" ON public.share_invitations;
CREATE POLICY "Owners can update their own share invitations"
  ON public.share_invitations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Recipients can view their own access grants
DROP POLICY IF EXISTS "Recipients can view their own access grants" ON public.share_access_grants;
CREATE POLICY "Recipients can view their own access grants"
  ON public.share_access_grants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Resource owners can view access grants originating from their invitations
DROP POLICY IF EXISTS "Owners can view grants for their invitations" ON public.share_access_grants;
CREATE POLICY "Owners can view grants for their invitations"
  ON public.share_access_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.share_invitations i
      WHERE i.id = share_access_grants.invitation_id
      AND i.owner_id = auth.uid()
    )
  );
