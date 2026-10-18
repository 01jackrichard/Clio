-- Clio Migration: 20261018040001_add_collections_visibility_and_subjects.sql
-- Description: Adds collections table, public/private visibility with password hash,
--              and Anna University subject code & regulation tracking to documents.

-- 1. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  regulation TEXT DEFAULT '2021',
  academic_year TEXT,
  semester TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  password_hash TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ALTER DOCUMENTS TABLE
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS subject_code TEXT,
  ADD COLUMN IF NOT EXISTS regulation TEXT DEFAULT '2021',
  ADD COLUMN IF NOT EXISTS is_verified_subject BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON public.documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_subject_code ON public.documents(subject_code);
CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON public.documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_owner_id ON public.collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_collections_visibility ON public.collections(visibility);

-- 4. ROW LEVEL SECURITY FOR COLLECTIONS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Public collections viewable by authenticated users; private viewable by owner or admin
CREATE POLICY "Public collections are viewable by authenticated users"
  ON public.collections FOR SELECT
  TO authenticated
  USING (
    visibility = 'public' OR
    owner_id = auth.uid() OR
    public.is_admin(auth.uid())
  );

-- Authenticated users can create collections
CREATE POLICY "Authenticated users can create collections"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own collections
CREATE POLICY "Owners can update their own collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners and admins can delete collections
CREATE POLICY "Owners and admins can delete collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));
